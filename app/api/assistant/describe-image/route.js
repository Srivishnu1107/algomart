import { askAiChatCompletionsCreate } from "@/lib/askAiClient";
import prisma from "@/lib/prisma";
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export async function POST(request) {
    try {
        const { userId } = getAuth(request);
        if (!userId) {
            return NextResponse.json({ error: "Sign in to use Ask AI" }, { status: 401 });
        }
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { isPro: true },
        });
        if (!user?.isPro) {
            return NextResponse.json({ error: "Ask AI is available for Pro members only" }, { status: 403 });
        }

        const body = await request.json();
        const { image, storeType } = body;

        if (!image) {
            return NextResponse.json({ error: "Image is required" }, { status: 400 });
        }

        const isFashion = storeType === 'fashion';

        const fashionInstructions = `You are identifying a FASHION/APPAREL item. Return ONE search phrase that a shopping site would use to find this exact item.
- ALWAYS include: color or style + item type (e.g. "Red Hoodie", "Blue High-Waist Jeans", "White Leather Sneakers", "Black Denim Jacket").
- If you can identify brand or design (e.g. Nike, Adidas, vintage), include it: "Nike Air Max Sneakers", "Blue Striped T-Shirt".
- Do NOT return only one word (e.g. not just "Nike" or "Hoodie"). Minimum 2–3 words.`;

        const electronicsInstructions = `You are identifying an ELECTRONICS item. Return ONE search phrase that a shopping site would use to find this EXACT product—not other products from the same brand.
- ALWAYS include BOTH brand AND model/series or product type. Examples: "Samsung S24 Ultra", "Samsung Galaxy S24 Ultra phone", "Apple iPhone 15 Pro", "Sony WH-1000XM5 Headphones", "Samsung 55 inch TV", "MacBook Pro laptop".
- For phones: include model/series (e.g. S24 Ultra, iPhone 15, Galaxy Z Fold).
- For TVs: include size and type (e.g. "Samsung 55 inch TV", "LG OLED TV").
- CRITICAL: Do NOT return only the brand (e.g. do NOT return just "Samsung" or "Apple"). Returning only the brand would show wrong products (e.g. Samsung TV when the user uploaded a Samsung phone). Your reply must be specific enough to distinguish this product from other products by the same brand.`;

        const prompt = isFashion ? fashionInstructions : electronicsInstructions;
        const closing = `\n\nReply with ONLY the search phrase, no quotes, no explanation. 2–6 words.`;

        console.log("Asking AI for product name (storeType:", storeType, ")...");

        const response = await askAiChatCompletionsCreate({
            messages: [
                {
                    role: "user",
                    content: [
                        { type: "text", text: prompt + closing },
                        {
                            type: "image_url",
                            image_url: {
                                "url": image,
                            },
                        },
                    ],
                },
            ],
            max_tokens: 80,
        });

        let query = (response.choices[0]?.message?.content?.trim() || "")
            .replace(/^['"]|['"]$/g, "")
            .replace(/\n.*/s, "")
            .trim();
        console.log("AI Raw Output:", response.choices[0]?.message?.content);
        console.log("Cleaned Query:", query);

        // Reject single-word brand-only answers so we don't search "samsung" and get TVs + phones
        const singleWordBrands = new Set(["samsung", "apple", "sony", "lg", "nike", "adidas", "xiaomi", "oneplus", "google", "dell", "hp", "lenovo", "asus", "oppo", "vivo", "realme", "nokia", "motorola", "puma", "zara", "hm", "gucci", "prada"]);
        const words = query.toLowerCase().split(/\s+/).filter(Boolean);
        if (words.length === 1 && singleWordBrands.has(words[0])) {
            console.warn("AI returned brand-only query. Using fallback with product type.");
            query = isFashion ? `${words[0]} clothing` : `${words[0]} device`;
        }

        if (!query) {
            console.warn("AI returned empty string. Using fallback.");
            query = isFashion ? "Fashion item" : "Electronics product";
        }

        return NextResponse.json({ query });

    } catch (error) {
        console.error("DEBUG: Full Error Object:", error);

        let errorMessage = error.message || "Unknown error occurred";
        if (errorMessage.includes("401")) errorMessage = "Invalid API Key - Please check .env";
        if (errorMessage.includes("429")) errorMessage = "Rate Limit Exceeded - Try again later";
        if (errorMessage.includes("503")) errorMessage = "AI Service Unavailable";

        return NextResponse.json(
            { error: `Analysis Failed: ${errorMessage}` },
            { status: 500 }
        );
    }
}
