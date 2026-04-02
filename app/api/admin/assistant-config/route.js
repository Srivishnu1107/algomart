import prisma from "@/lib/prisma";
import authAdmin from "@/middlewares/authAdmin";
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { DEFAULT_SYSTEM_PROMPT } from "@/lib/assistantDefaults";

const CONFIG_KEY_SYSTEM_PROMPT = "system_prompt";

export async function GET(request) {
    try {
        const { userId } = getAuth(request);
        const isAdmin = await authAdmin(userId);
        if (!isAdmin) {
            return NextResponse.json({ error: "Not authorized" }, { status: 401 });
        }
        if (new URL(request.url).searchParams.get("default") === "1") {
            return NextResponse.json({ systemPrompt: DEFAULT_SYSTEM_PROMPT });
        }
        const row = await prisma.assistantConfig.findUnique({
            where: { key: CONFIG_KEY_SYSTEM_PROMPT },
        });
        const systemPrompt = row?.value?.trim() ?? DEFAULT_SYSTEM_PROMPT;
        return NextResponse.json({ systemPrompt });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: error?.message || "Failed to load config" }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        const { userId } = getAuth(req);
        const isAdmin = await authAdmin(userId);
        if (!isAdmin) {
            return NextResponse.json({ error: "Not authorized" }, { status: 401 });
        }
        const body = await req.json();
        const systemPrompt = typeof body?.systemPrompt === "string" ? body.systemPrompt : "";
        await prisma.assistantConfig.upsert({
            where: { key: CONFIG_KEY_SYSTEM_PROMPT },
            create: { key: CONFIG_KEY_SYSTEM_PROMPT, value: systemPrompt },
            update: { value: systemPrompt },
        });
        return NextResponse.json({ message: "Saved", systemPrompt: systemPrompt || DEFAULT_SYSTEM_PROMPT });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: error?.message || "Failed to save" }, { status: 500 });
    }
}
