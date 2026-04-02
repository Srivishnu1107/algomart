import prisma from "@/lib/prisma";
import { generateJSONForInsights } from "@/lib/aiClient";
import { buildReturnPredictorPrompt, SYSTEM_JSON } from "@/lib/aiInsightsPrompts";
import { resolveStore, getContext, runType, checkAIInsightsModels } from "../_shared";
import { NextResponse } from "next/server";

function dbErrorHint(e) {
    const msg = e?.message || "";
    if (msg.includes("does not exist") || msg.includes("Unknown arg") || msg.includes("Invalid prisma")) {
        return " Run: npx prisma migrate dev --name add_vendor_ai_insights";
    }
    return "";
}

export async function GET(request) {
    try {
        const modelErr = checkAIInsightsModels();
        if (modelErr) return modelErr.error;
        const resolved = await resolveStore(request);
        if (resolved.error) return resolved.error;
        const { storeId, storeType } = resolved;

        const row = await prisma.vendorReturnPredictor.findUnique({
            where: { storeId },
        });
        if (!row) return NextResponse.json({ snapshot: null, message: "No return prediction yet. POST to run analysis." }, { status: 200 });
        return NextResponse.json({ snapshot: row.payload, analyzedAt: row.analyzedAt, runType: row.runType });
    } catch (e) {
        console.error("Return predictor GET error:", e);
        return NextResponse.json({ error: (e.message || "Server error") + dbErrorHint(e) }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const modelErr = checkAIInsightsModels();
        if (modelErr) return modelErr.error;
        const resolved = await resolveStore(request);
        if (resolved.error) return resolved.error;
        const { storeId, storeType } = resolved;

        const context = await getContext(storeId);
        const existing = await prisma.vendorReturnPredictor.findUnique({ where: { storeId } });
        const isFirstRun = !existing;

        const prompt = buildReturnPredictorPrompt(context);
        let payload;
        try {
            payload = await generateJSONForInsights(prompt, SYSTEM_JSON);
        } catch (e) {
            console.error("Return predictor AI error:", e);
            return NextResponse.json({ error: "AI analysis failed: " + (e.message || "unknown") }, { status: 500 });
        }

        const products = Array.isArray(payload.products) ? payload.products : [];
        const normalized = {
            products: products.map((p) => ({
                productId: p.productId ?? p.product_id,
                productName: p.productName ?? p.product_name ?? "",
                risk: ["low", "medium", "high"].includes(p.risk) ? p.risk : "low",
                likelyCauses: Array.isArray(p.likelyCauses) ? p.likelyCauses : [],
            })),
            summary: typeof payload.summary === "string" ? payload.summary : "",
        };

        const record = await prisma.vendorReturnPredictor.upsert({
            where: { storeId },
            create: { storeId, storeType, payload: normalized, runType: runType(isFirstRun) },
            update: { storeType, payload: normalized, runType: runType(isFirstRun), analyzedAt: new Date() },
        });

        return NextResponse.json({ snapshot: record.payload, analyzedAt: record.analyzedAt, runType: record.runType });
    } catch (e) {
        console.error("Return predictor POST error:", e);
        return NextResponse.json({ error: (e.message || "Server error") + dbErrorHint(e) }, { status: 500 });
    }
}
