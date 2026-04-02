import prisma from "@/lib/prisma";
import authSeller from "@/middlewares/authSeller";
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { openai } from "@/configs/openai";

function getBusinessOverviewModel() {
    const model = prisma.businessOverview;
    if (!model) {
        throw new Error("BusinessOverview model not found. Run: npx prisma generate, then restart the dev server.");
    }
    return model;
}

// GET - Fetch cached insights
export async function GET(request) {
    try {
        const { userId } = getAuth(request);
        const { searchParams } = new URL(request.url)
        const rawStoreType = searchParams.get('type')
        const storeType = ["electronics", "fashion"].includes(rawStoreType) ? rawStoreType : "electronics"
        const storeId = await authSeller(userId, storeType);
        if (!storeId) {
            return NextResponse.json({ error: "Not authorized" }, { status: 401 });
        }

        const businessOverview = getBusinessOverviewModel();
        const insights = await businessOverview.findUnique({
            where: { storeId },
        });

        return NextResponse.json({ insights });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
}

// POST - Re-run AI analysis and update cache
export async function POST(request) {
    try {
        const { userId } = getAuth(request);
        const { searchParams } = new URL(request.url)
        const rawStoreType = searchParams.get('type')
        const storeType = ["electronics", "fashion"].includes(rawStoreType) ? rawStoreType : "electronics"
        const storeId = await authSeller(userId, storeType);
        if (!storeId) {
            return NextResponse.json({ error: "Not authorized" }, { status: 401 });
        }

        const orders = await prisma.order.findMany({
            where: { storeId },
            include: {
                orderItems: { include: { product: true } },
            },
            orderBy: { createdAt: "desc" },
        });

        const products = await prisma.product.findMany({
            where: { storeId },
        });

        const wishlistCounts = await prisma.wishlist.groupBy({
            by: ["productId"],
            where: { product: { storeId } },
            _count: { productId: true },
        });
        const productWishlistCount = {};
        wishlistCounts.forEach((row) => {
            productWishlistCount[row.productId] = row._count.productId;
        });

        const ratings = await prisma.rating.findMany({
            where: { productId: { in: products.map((p) => p.id) } },
            include: { user: true, product: true },
        });

        const totalSales = orders.reduce((acc, o) => acc + o.total, 0);
        const hasData = orders.length > 0 || products.length > 0 || ratings.length > 0;

        const defaultOverviewJson = JSON.stringify({
            overall_status: "No sales or review data yet. Add products and start selling for AI-powered insights.",
            good: ["Ready to grow once you list products"],
            bad: ["Insufficient data to assess performance"],
            next_actions: ["List your first products", "Promote your store", "Encourage reviews after orders"],
        });

        if (!hasData) {
            const businessOverview = getBusinessOverviewModel();
            const insights = await businessOverview.upsert({
                where: { storeId },
                create: { storeId, storeType, overviewInsight: defaultOverviewJson, issueInsight: "" },
                update: { storeType, overviewInsight: defaultOverviewJson, issueInsight: "", lastAnalyzedAt: new Date() },
            });
            return NextResponse.json({ insights });
        }

        const productSales = {};
        orders.forEach((o) => {
            o.orderItems.forEach((oi) => {
                productSales[oi.productId] = (productSales[oi.productId] || 0) + oi.quantity * oi.price;
            });
        });

        const context = {
            totalOrders: orders.length,
            totalRevenue: totalSales,
            totalProducts: products.length,
            totalReviews: ratings.length,
            productPerformance: products.map((p) => ({
                name: p.name,
                category: p.category,
                price: p.price,
                mrp: p.mrp,
                inStock: p.inStock,
                sales: productSales[p.id] || 0,
                wishlistCount: productWishlistCount[p.id] || 0,
            })),
            reviews: ratings.slice(0, 20).map((r) => ({
                rating: r.rating,
                review: r.review,
                product: r.product?.name,
            })),
            orders: orders.slice(0, 15).map((o) => ({
                status: o.status,
                total: o.total,
                createdAt: o.createdAt,
            })),
        };

        const overviewPrompt = `Generate an Overall Business Overview for this e-commerce store.

Include:
1. Overall performance — an expanded paragraph (2–4 sentences) on how the store is performing: summarize sales, revenue, product and review trends, and any strengths or concerns. Use plain business language.
2. What was good and bad — a few short bullets each.
3. Suggestions to improve — a few actionable bullets.

Note: wishlistCount in productPerformance is a secondary signal only; use it to slightly improve accuracy of your summary, not to drive conclusions alone. Primary signals are sales, orders, and reviews.

OUTPUT STRUCTURE (STRICT JSON only, no other text):
{
  "overall_status": "A short paragraph (2–4 sentences) describing overall performance: how the store is doing, key numbers, trends, and main strengths or concerns.",
  "good": ["Max 2–3 short bullets: what went well (revenue, products, reviews, category)."],
  "bad": ["Max 2–3 short bullets: what went wrong or needs attention (sales, ops, reviews, stock)."],
  "next_actions": ["Max 3 short bullets: high-impact suggestions to improve the business."]
}

Store data:
${JSON.stringify(context, null, 2)}

Respond with ONLY valid JSON. No markdown, no code fence, no explanation.`;

        const overviewRes = await openai.chat.completions.create({
            model: process.env.OPENAI_MODEL,
            messages: [
                { role: "system", content: "You output only valid JSON. No other text." },
                { role: "user", content: overviewPrompt },
            ],
            response_format: { type: "json_object" },
        });

        let overviewInsight = overviewRes.choices[0]?.message?.content || "";
        let parsed = null;
        try {
            const cleaned = overviewInsight.replace(/^```json?\s*|\s*```$/g, "").trim();
            parsed = JSON.parse(cleaned);
        } catch (_) {}
        if (parsed && typeof parsed.overall_status === "string") {
            overviewInsight = JSON.stringify({
                overall_status: parsed.overall_status,
                good: Array.isArray(parsed.good) ? parsed.good.slice(0, 3) : [],
                bad: Array.isArray(parsed.bad) ? parsed.bad.slice(0, 3) : [],
                next_actions: Array.isArray(parsed.next_actions) ? parsed.next_actions.slice(0, 3) : [],
            });
        } else {
            overviewInsight = defaultOverviewJson;
        }

        const businessOverview = getBusinessOverviewModel();
        const insights = await businessOverview.upsert({
            where: { storeId },
            create: {
                storeId,
                storeType,
                overviewInsight,
                issueInsight: "",
            },
            update: {
                storeType,
                overviewInsight,
                issueInsight: "",
                lastAnalyzedAt: new Date(),
            },
        });

        return NextResponse.json({ insights });
    } catch (error) {
        console.error("Insights error:", error);
        return NextResponse.json({ error: error.message || "Failed to generate insights" }, { status: 500 });
    }
}
