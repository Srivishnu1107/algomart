import prisma from "@/lib/prisma";
import authAdmin from "@/middlewares/authAdmin";
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { generateJSONForInsights } from "@/lib/aiClient";

const SYSTEM = "You are a data analyst. Output ONLY valid JSON. No markdown, no code fences, no other text.";

async function runAnalysisAndSave() {
    const reports = await prisma.report.findMany({
        orderBy: { createdAt: "desc" },
        include: {
            product: {
                select: {
                    id: true,
                    name: true,
                    category: true,
                    price: true,
                    createdAt: true,
                    store: {
                        select: { name: true, storeType: true },
                    },
                },
            },
        },
    });

    if (reports.length === 0) {
        await prisma.reportsAiOverview.deleteMany({});
        return { groups: [] };
    }

    const reportSummary = reports.map((r) => ({
        productId: r.product.id,
        productName: r.product.name,
        category: r.product.category,
        storeName: r.product.store?.name ?? "—",
        storeType: r.product.store?.storeType ?? "electronics",
        reasonType: r.reasonType,
        customReason: (r.customReason || "").slice(0, 200),
    }));

    const prompt = `You are given a list of product reports from an e-commerce platform. Each report refers to one product from one store.

Task:
1. Group reports by PRODUCT (same product name + same category = same product). The same product can be sold by different stores; count all reports for that product across all stores as one.
2. For each group, provide:
   - representativeName: the best short product name (one line, e.g. "Samsung S24 Ultra")
   - totalCount: total number of reports in this group
   - shortReason: ONE word or very short phrase (e.g. "Fake", "Wrong info", "Spam") that best represents why users reported this product.
   - storeBreakdown: array of { storeName, count } for how many reports came from each store

Data (array of reports):
${JSON.stringify(reportSummary)}

Return a single JSON object with one key:
- groups: array of { representativeName, totalCount, shortReason, storeBreakdown: [{ storeName, count }] }

Sort groups by totalCount descending. No other keys. No text outside the JSON.`;

    let parsed;
    try {
        parsed = await generateJSONForInsights(prompt, SYSTEM);
    } catch (e) {
        throw e;
    }

    let groups = Array.isArray(parsed.groups) ? parsed.groups : [];

    // Match each group to a representative product and add productId, storeType, price, createdAt
    const nameToReports = new Map();
    reports.forEach((r) => {
        const key = `${r.product.name}|${r.product.category || ""}`;
        if (!nameToReports.has(key)) nameToReports.set(key, []);
        nameToReports.get(key).push(r);
    });

    const normalized = (s) => (s || "").toString().toLowerCase().trim();
    groups = groups.map((g) => {
        const repName = normalized(g.representativeName);
        let representativeProductId = null;
        let representativeStoreType = "electronics";
        let price = null;
        let createdAt = null;

        for (const [key, arr] of nameToReports.entries()) {
            const [name] = key.split("|");
            if (normalized(name) === repName || name.toLowerCase().includes(repName) || repName.includes(name.toLowerCase())) {
                const first = arr[0];
                representativeProductId = first.product.id;
                representativeStoreType = first.product.store?.storeType ?? "electronics";
                price = first.product.price;
                createdAt = first.product.createdAt;
                break;
            }
        }
        if (!representativeProductId && groups.length > 0 && reports.length > 0) {
            const firstReport = reports.find((r) => normalized(r.product.name) === repName) || reports[0];
            representativeProductId = firstReport.product.id;
            representativeStoreType = firstReport.product.store?.storeType ?? "electronics";
            price = firstReport.product.price;
            createdAt = firstReport.product.createdAt;
        }
        return {
            ...g,
            representativeProductId,
            representativeStoreType,
            price: price != null ? Number(price) : null,
            createdAt: createdAt ? new Date(createdAt).toISOString() : null,
        };
    });

    const payload = { groups };
    await prisma.reportsAiOverview.deleteMany({});
    const created = await prisma.reportsAiOverview.create({
        data: { payload },
    });

    return { groups, analyzedAt: created.analyzedAt };
}

/**
 * GET - Return stored AI overview (filter by storeType query: all | electronics | fashion).
 */
export async function GET(request) {
    try {
        const { userId } = getAuth(request);
        const isAdmin = await authAdmin(userId);
        if (!isAdmin) {
            return NextResponse.json({ error: "Not authorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const storeTypeFilter = searchParams.get("storeType") || "all";

        const row = await prisma.reportsAiOverview.findFirst({
            orderBy: { analyzedAt: "desc" },
        });

        let groups = row?.payload?.groups ?? [];
        let analyzedAt = row?.analyzedAt;
        if (groups.length === 0) {
            try {
                const result = await runAnalysisAndSave();
                groups = result.groups || [];
                analyzedAt = result.analyzedAt;
            } catch (e) {
                console.error("AI reports overview error:", e);
                return NextResponse.json(
                    { error: "AI analysis failed: " + (e.message || "unknown") },
                    { status: 500 }
                );
            }
        }

        if (storeTypeFilter !== "all" && (storeTypeFilter === "electronics" || storeTypeFilter === "fashion")) {
            groups = groups.filter((g) => (g.representativeStoreType || "electronics") === storeTypeFilter);
        }

        return NextResponse.json({
            groups,
            analyzedAt: analyzedAt ? new Date(analyzedAt).toISOString() : new Date().toISOString(),
        });
    } catch (error) {
        console.error("Admin reports AI overview GET error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to load AI overview" },
            { status: 500 }
        );
    }
}

/**
 * POST - Re-run AI analysis and save to DB.
 */
export async function POST(request) {
    try {
        const { userId } = getAuth(request);
        const isAdmin = await authAdmin(userId);
        if (!isAdmin) {
            return NextResponse.json({ error: "Not authorized" }, { status: 401 });
        }

        const result = await runAnalysisAndSave();

        return NextResponse.json({
            groups: result.groups,
            analyzedAt: result.analyzedAt ?? new Date().toISOString(),
            message: "Overview re-analyzed and saved.",
        });
    } catch (error) {
        console.error("Admin reports AI overview POST error:", error);
        return NextResponse.json(
            { error: error.message || "Re-analyze failed" },
            { status: 500 }
        );
    }
}
