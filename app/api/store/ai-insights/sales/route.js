import prisma from "@/lib/prisma";
import { generateJSONForInsights } from "@/lib/aiClient";
import { buildSalesInsightPrompt, SYSTEM_JSON } from "@/lib/aiInsightsPrompts";
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

        const row = await prisma.vendorSalesInsight.findUnique({
            where: { storeId },
        });
        if (!row) return NextResponse.json({ snapshot: null, message: "No sales insight yet. POST to run analysis." }, { status: 200 });
        return NextResponse.json({ snapshot: row.payload, analyzedAt: row.analyzedAt, runType: row.runType });
    } catch (e) {
        console.error("Sales GET error:", e);
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
        const existing = await prisma.vendorSalesInsight.findUnique({ where: { storeId } });
        const isFirstRun = !existing;

        const prompt = buildSalesInsightPrompt(context);
        let payload;
        try {
            payload = await generateJSONForInsights(prompt, SYSTEM_JSON);
        } catch (e) {
            console.error("Sales insight AI error:", e);
            return NextResponse.json({ error: "AI analysis failed: " + (e.message || "unknown") }, { status: 500 });
        }

        const normalized = {
            summary: typeof payload.summary === "string" ? payload.summary : "",
            top_reasons: Array.isArray(payload.top_reasons) ? payload.top_reasons : [],
            actionable_suggestions: Array.isArray(payload.actionable_suggestions) ? payload.actionable_suggestions : [],
        };

        const record = await prisma.vendorSalesInsight.upsert({
            where: { storeId },
            create: { storeId, storeType, payload: normalized, runType: runType(isFirstRun) },
            update: { storeType, payload: normalized, runType: runType(isFirstRun), analyzedAt: new Date() },
        });

        return NextResponse.json({ snapshot: record.payload, analyzedAt: record.analyzedAt, runType: record.runType });
    } catch (e) {
        console.error("Sales POST error:", e);
        return NextResponse.json({ error: (e.message || "Server error") + dbErrorHint(e) }, { status: 500 });
    }
}
