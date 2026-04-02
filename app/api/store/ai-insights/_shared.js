import authSeller from "@/middlewares/authSeller";
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getStoreContext } from "@/lib/aiInsightsData";
import prisma from "@/lib/prisma";

const STORE_TYPES = ["electronics", "fashion"];

/** If Prisma client was generated before AI insights models were added, return 503 with fix hint. */
export function checkAIInsightsModels() {
    const has =
        prisma.vendorDemandPrediction?.findUnique != null &&
        prisma.vendorSalesInsight?.findUnique != null &&
        prisma.vendorReturnPredictor?.findUnique != null &&
        prisma.vendorCompetitorInsight?.findUnique != null;
    if (!has) {
        return {
            error: NextResponse.json(
                { error: "Prisma client out of date. Run: npx prisma generate" },
                { status: 503 }
            ),
        };
    }
    return null;
}

/**
 * Resolve storeId from request (query type + Clerk auth). Returns { storeId, storeType } or { error: NextResponse }.
 */
export async function resolveStore(request) {
    try {
        const auth = await Promise.resolve(getAuth(request));
        const userId = auth?.userId ?? null;
        if (!userId) return { error: NextResponse.json({ error: "Not authorized" }, { status: 401 }) };
        const { searchParams } = new URL(request.url);
        const rawStoreType = searchParams.get("type");
        const storeType = rawStoreType && STORE_TYPES.includes(rawStoreType) ? rawStoreType : "electronics";
        const storeId = await authSeller(userId, storeType);
        if (!storeId) return { error: NextResponse.json({ error: "Not authorized" }, { status: 401 }) };
        return { storeId, storeType };
    } catch (e) {
        console.error("resolveStore error:", e);
        return { error: NextResponse.json({ error: e?.message || "Auth failed" }, { status: 500 }) };
    }
}

/**
 * Get aggregated store context for AI. Returns context or { error: NextResponse } if storeId missing.
 */
export async function getContext(storeId) {
    return getStoreContext(storeId);
}

export function runType(isFirstRun) {
    return isFirstRun ? "initial_analysis" : "relook_analysis";
}
