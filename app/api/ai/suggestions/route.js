import { getDistanceKm } from "@/lib/distance";
import prisma from "@/lib/prisma";
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash";

/** Max allowed price increase (e.g. 0.20 = 20%) when suggesting a higher-priced same product */
const MAX_PRICE_GAP_RATIO = 0.2;

/**
 * Build candidate list for one cart item: same category, different store, inStock.
 */
function getCandidatesForCartItem(cartItem, allProducts) {
    const category = cartItem.category || "";
    const storeId = cartItem.storeId;
    const productType = cartItem.productType;
    return allProducts.filter((p) => {
        if (p.id === cartItem.id) return false;
        if (p.storeId === storeId) return false;
        if (!p.inStock) return false;
        if (category && p.category !== category) return false;
        if (productType && p.productType && p.productType !== productType) return false;
        return true;
    });
}

async function fetchWithFallback(userPrompt, systemPrompt) {
    // Attempt with primary and any secondary fallback keys found in the env
    const allKeys = [
        process.env.GEMINI_API_KEY,
        process.env.ASK_AI_GEMINI_API_KEY,
        process.env.OPENAI_API_KEY, // The user's OPENAI_API_KEY is actually a Gemini key
        process.env.GEMINI_API_KEY_2,
        process.env.GEMINI_API_KEY_3,
        process.env.GEMINI_API_KEY_4,
        process.env.GEMINI_API_KEY_5
    ].filter(Boolean);

    // Remove duplicates so we don't retry the exact same exhausted key twice
    const keys = [...new Set(allKeys)];

    if (keys.length === 0) {
        throw new Error("No Gemini API keys configured");
    }

    const body = {
        contents: [{ role: "user", parts: [{ text: (systemPrompt ? systemPrompt + "\n\n" : "") + userPrompt }] }],
        generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 8192,
            responseMimeType: "application/json",
        },
    };

    let lastError = null;

    for (const key of keys) {
        try {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${key}`;
            const res = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });

            if (!res.ok) {
                const errText = await res.text();
                throw new Error(`API error ${res.status}: ${errText}`);
            }

            const data = await res.json();
            const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
            if (!content) throw new Error("No content returned");

            const cleaned = content.replace(/^```json?\s*|\s*```$/g, "").trim();
            return JSON.parse(cleaned);
        } catch (err) {
            console.warn(`Failed with an API key, trying next... Error: ${err.message}`);
            lastError = err;
            // Continue to the next key in the array
        }
    }

    throw lastError || new Error("All Gemini API keys failed");
}

/**
 * Use Gemini to strictly match same product by name and model.
 * Returns array of candidate product IDs that are the exact same product.
 */
async function findSameProductIds(cartItem, candidates) {
    if (candidates.length === 0) return [];

    const cartName = cartItem.name || "";
    const cartDesc = (cartItem.description || "").slice(0, 500);
    const candidateList = candidates.map((c) => ({
        id: c.id,
        name: c.name,
        description: (c.description || "").slice(0, 300),
    }));

    const systemPrompt = `You are a strict product matcher. Your job is to decide if a candidate product is the EXACT SAME product as the cart product.
Same product means: same product name and same model (or same brand + model if present in name/description). Do not match different models or variants.
Reply with valid JSON only.`;

    const userPrompt = `Cart product:
- name: ${JSON.stringify(cartName)}
- description: ${JSON.stringify(cartDesc)}

Candidates (list of products from other stores):
${JSON.stringify(candidateList)}

Which candidate IDs are the EXACT SAME product (same name and model)? Return a JSON object with a single key "sameProductIds" containing an array of candidate ids (strings). If none match exactly, return {"sameProductIds": []}.`;

    try {
        const out = await fetchWithFallback(userPrompt, systemPrompt);
        const ids = Array.isArray(out.sameProductIds) ? out.sameProductIds : [];
        return ids.filter((id) => candidates.some((c) => c.id === id));
    } catch (err) {
        console.warn("AI same-product match completely failed after all key attempts:", err.message);
        return [];
    }
}

function avgRating(product) {
    const ratings = product.rating || [];
    if (ratings.length === 0) return 0;
    return ratings.reduce((s, r) => s + (r.rating ?? 0), 0) / ratings.length;
}

/**
 * Rank same-product candidates: prefer lower price, then better rating/count, then nearer distance.
 * Filters out candidates that are more expensive than MAX_PRICE_GAP_RATIO above cart price.
 */
async function rankCandidates(cartItem, candidates, userLocation, geoCache) {
    const cartPrice = Number(cartItem.price) || 0;
    const maxAllowedPrice = cartPrice * (1 + MAX_PRICE_GAP_RATIO);

    const withScores = await Promise.all(
        candidates.map(async (c) => {
            const price = Number(c.price) || 0;
            const avg = avgRating(c);
            const count = (c.rating || []).length;
            let distanceKm = null;
            if (userLocation?.lat != null && userLocation?.lng != null && c.store?.address) {
                distanceKm = await getDistanceKm(userLocation.lat, userLocation.lng, c.store.address, geoCache);
            }
            return {
                product: c,
                price,
                avgRating: avg,
                ratingCount: count,
                distanceKm,
                // Disqualify if too much more expensive
                allowed: price <= maxAllowedPrice,
            };
        })
    );

    const allowed = withScores.filter((x) => x.allowed);
    if (allowed.length === 0) return null;

    // Prefer: lower price, then higher (avgRating * sqrt(count)), then lower distance
    allowed.sort((a, b) => {
        if (a.price !== b.price) return a.price - b.price;
        const scoreA = a.avgRating * Math.sqrt(a.ratingCount + 1);
        const scoreB = b.avgRating * Math.sqrt(b.ratingCount + 1);
        if (scoreB !== scoreA) return scoreB - scoreA;
        const distA = a.distanceKm ?? Infinity;
        const distB = b.distanceKm ?? Infinity;
        return distA - distB;
    });

    return allowed[0].product;
}

function serializeProduct(p) {
    if (!p) return null;
    return {
        id: p.id,
        name: p.name,
        description: p.description,
        category: p.category,
        productType: p.productType,
        mrp: p.mrp,
        price: p.price,
        images: p.images || [],
        inStock: p.inStock,
        storeId: p.storeId,
        store: p.store
            ? {
                id: p.store.id,
                name: p.store.name,
                username: p.store.username,
                address: p.store.address,
            }
            : null,
        rating: (p.rating || []).map((r) => ({ rating: r.rating, review: r.review })),
    };
}

export async function POST(request) {
    try {
        const { userId } = getAuth(request);
        if (!userId) {
            return NextResponse.json({ error: "Sign in to use cross-vendor suggestions" }, { status: 401 });
        }
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { isPro: true },
        });
        if (!user?.isPro) {
            return NextResponse.json({ error: "Cross-vendor suggestions are available for Pro members only" }, { status: 403 });
        }

        const body = await request.json();
        const { cartItems = [], userLocation } = body;

        if (!Array.isArray(cartItems) || cartItems.length === 0) {
            return NextResponse.json({ suggestions: [] });
        }

        const cartIds = cartItems.map((i) => i.id).filter(Boolean);
        let allProducts = await prisma.product.findMany({
            where: { inStock: true, status: "active", is_draft: false },
            include: {
                store: true,
                rating: { select: { rating: true, review: true } },
            },
        });
        allProducts = allProducts.filter((p) => p.store?.isActive && !cartIds.includes(p.id));

        const geoCache = new Map();
        const suggestions = [];

        for (const item of cartItems) {
            const candidates = getCandidatesForCartItem(item, allProducts);
            if (candidates.length === 0) continue;

            const sameProductIds = await findSameProductIds(item, candidates);
            if (sameProductIds.length === 0) continue;

            const sameProductCandidates = candidates.filter((c) => sameProductIds.includes(c.id));
            const best = await rankCandidates(item, sameProductCandidates, userLocation || null, geoCache);
            if (!best) continue;

            const reasonParts = [];
            if (best.price < item.price) reasonParts.push("Lower price");
            else if (best.price > item.price) reasonParts.push("Slightly higher price, better value");
            const avg = avgRating(best);
            const count = (best.rating || []).length;
            if (count > 0) reasonParts.push(`Better rating (${avg.toFixed(1)}★, ${count} reviews)`);
            suggestions.push({
                cartItemId: item.id,
                suggestedProductId: best.id,
                suggestedProduct: serializeProduct(best),
                reason: reasonParts.length ? reasonParts.join(" · ") : "Same product from another vendor",
            });
        }

        return NextResponse.json({ suggestions });
    } catch (error) {
        console.error("AI suggestions error:", error);
        return NextResponse.json({ suggestions: [] });
    }
}
