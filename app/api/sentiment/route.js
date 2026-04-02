import { openai } from "@/configs/openai";
import { NextResponse } from "next/server";

export async function POST(request) {
    try {
        const { reviews } = await request.json();

        if (!reviews || !Array.isArray(reviews) || reviews.length === 0) {
            return NextResponse.json(
                { error: "No reviews provided" },
                { status: 400 }
            );
        }

        // Filter out empty or very short reviews
        const validReviews = reviews.filter(
            (r) => r.review && r.review.trim().length > 2
        );

        if (validReviews.length === 0) {
            return NextResponse.json({
                sentiment: "Neutral",
                summary: "No meaningful reviews available for analysis.",
                score: 50,
                reviewCount: 0,
            });
        }

        // Format reviews for analysis
        const reviewsText = validReviews
            .map((r, i) => `Review ${i + 1} (${r.rating}/5 stars): "${r.review}"`)
            .join("\n");

        const prompt = `You are an AI assistant performing sentiment analysis.

Analyze the following product reviews and return a JSON object with:
1. "sentiment": Overall sentiment (Positive, Neutral, Mixed, or Negative)
2. "summary": A concise summary (2-4 sentences)
3. "score": A sentiment score from 0 to 100
4. "keyPoints": Key points highlighting major customer opinions (array of 2-4 strings)

Rules:
- Base the analysis strictly on the provided reviews
- Ignore spam, duplicates, and meaningless content
- Do not invent reviews or ratings
- Be objective and concise
- Return ONLY valid JSON, no additional text

Reviews:
${reviewsText}`;

        const response = await openai.chat.completions.create({
            model: process.env.OPENAI_MODEL,
            messages: [
                {
                    role: "system",
                    content: "You are a helpful assistant that analyzes product reviews and returns sentiment analysis in JSON format only. Respond ONLY with raw JSON (no code block, no markdown, no explanation).",
                },
                {
                    role: "user",
                    content: prompt,
                },
            ],
        });

        const raw = response.choices[0].message.content;
        // Remove ```json or ``` wrappers if present
        const cleaned = raw.replace(/```json|```/g, "").trim();
        
        let result;
        try {
            result = JSON.parse(cleaned);
        } catch {
            throw new Error("AI did not return valid JSON");
        }

        return NextResponse.json({
            ...result,
            reviewCount: validReviews.length,
        });
    } catch (error) {
        console.error("Sentiment analysis error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to analyze sentiment" },
            { status: 500 }
        );
    }
}
