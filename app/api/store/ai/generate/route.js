import { openai } from "@/configs/openai";
import authSeller from "@/middlewares/authSeller";
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const CATEGORIES = ["Mobiles", "Televisions", "Laptops", "Headphones", "Earbuds", "Watches", "Speakers", "Accessories", "Tablets"];
const FASHION_CATEGORIES = ["Men", "Women", "Footwear", "Accessories", "Streetwear", "Luxury"];

function stripMarkdownAndEmojis(text) {
    if (!text || typeof text !== "string") return "";
    return text
        .replace(/\*\*|__|\*|_|`|#|\[|\]|\(|\)/g, " ")
        .replace(/\s+/g, " ")
        .replace(/[\u{1F300}-\u{1F9FF}]/gu, "")
        .trim();
}

function cleanBullets(text) {
    if (!text || typeof text !== "string") return "";
    return text
        .split(/\n/)
        .map((line) => line.replace(/^[\s\-*•·]\s*/, "").trim())
        .filter(Boolean)
        .slice(0, 4)
        .map((line) => (line.startsWith("•") ? line : "• " + line))
        .join("\n");
}

export async function POST(request) {
    try {
        const { userId } = getAuth(request);
        const { searchParams } = new URL(request.url)
        const rawStoreType = searchParams.get('type')
        const storeType = ["electronics", "fashion"].includes(rawStoreType) ? rawStoreType : "electronics"
        const storeId = await authSeller(userId, storeType);
        if (!storeId) {
            return NextResponse.json({ error: "not authorized" }, { status: 401 });
        }
        const categories = storeType === "fashion" ? FASHION_CATEGORIES : CATEGORIES;

        const body = await request.json();
        const images = Array.isArray(body?.images) ? body.images : [];

        if (images.length === 0) {
            return NextResponse.json(
                { error: "Please upload at least one product image first" },
                { status: 400 }
            );
        }

        const userContent = [];

        for (const img of images) {
            const base64 = img.base64;
            const mimeType = img.mimeType || "image/jpeg";
            if (!base64 || typeof base64 !== "string") continue;
            const url = `data:${mimeType};base64,${base64}`;
            userContent.push({ type: "image_url", image_url: { url } });
        }

        if (userContent.length === 0) {
            return NextResponse.json(
                { error: "Could not read product images. Please try again." },
                { status: 400 }
            );
        }

        userContent.push({
            type: "text",
            text: `Based ONLY on the product images above, generate product details. Output valid JSON with keys: name, description, features, category. Category must be exactly one of: ${categories.join(", ")}.`,
        });

        const response = await openai.chat.completions.create({
            model: process.env.OPENAI_MODEL || "gpt-4o-mini",
            messages: [
                {
                    role: "system",
                content: `You are generating product details ONLY based on the provided product images. Do not assume features that are not visually inferable. If uncertain, stay generic but accurate.

Generate STRICTLY:
- Product name: 1 clean line, no emojis, no markdown.
- Short description: 2–3 sentences only. No prices, no offers, no marketing fluff.
- Features: max 4 short bullet points (plain text, newline-separated). Only what you can see or infer from the image.
- Category: exactly one of: ${categories.join(", ")}.

Rules: NO prices, NO offers, NO emojis, NO markdown symbols, NO hallucinated specs. Output ONLY valid JSON with keys: name, description, features, category. No code block, no explanation.`,
                },
                {
                    role: "user",
                    content: userContent,
                },
            ],
        });

        const raw = response.choices[0]?.message?.content;
        if (!raw || typeof raw !== "string") {
            return NextResponse.json(
                { error: "AI did not return a valid response" },
                { status: 400 }
            );
        }

        const cleaned = raw.replace(/```json|```/g, "").trim();
        let parsed;
        try {
            parsed = JSON.parse(cleaned);
        } catch {
            return NextResponse.json(
                { error: "AI did not return valid JSON" },
                { status: 400 }
            );
        }

        const category = categories.includes(parsed.category) ? parsed.category : categories[0];
        const name = stripMarkdownAndEmojis(parsed.name || "Product").slice(0, 120);
        const descriptionOnly = stripMarkdownAndEmojis(parsed.description || "").slice(0, 400);
        const featuresText = cleanBullets(parsed.features || "");
        const description = featuresText ? `${descriptionOnly}\n\n${featuresText}`.trim() : descriptionOnly;

        if (!name && !description && !category) {
            return NextResponse.json(
                { error: "AI could not generate details from the images" },
                { status: 400 }
            );
        }

        return NextResponse.json({
            name: name || "Product",
            description: description || "",
            category,
        });
    } catch (error) {
        const is429 = error?.status === 429 || String(error?.message || "").includes("429");
        if (is429) {
            console.warn("[AI generate] Rate limit (429). Try again later.");
        } else {
            console.error(error);
        }
        const message = is429
            ? "AI rate limit reached. Please try again in a moment."
            : error?.code || error?.message || "AI generation failed";
        return NextResponse.json(
            { error: message },
            { status: is429 ? 429 : 400 }
        );
    }
}
