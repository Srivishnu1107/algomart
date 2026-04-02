/**
 * Replaceable AI client for Vendor AI Insights.
 * Set AI_INSIGHTS_PROVIDER=gemini|openai and corresponding API key + model in .env.
 * Default: Gemini (e.g. gemini-2.0-flash; use "Gemini 3.0 Flash" model name when available).
 */

const PROVIDER = (process.env.AI_INSIGHTS_PROVIDER || "gemini").toLowerCase();
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash";
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

/**
 * Call Gemini REST API (no extra dependency).
 * @param {string} text - user prompt
 * @param {string} [systemInstruction] - optional system prompt
 * @param {{ json?: boolean }} [opts] - if json: true, request application/json response
 * @returns {Promise<string>} - raw text from model
 */
async function geminiGenerate(text, systemInstruction, opts = {}) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new Error("GEMINI_API_KEY is not set");

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${key}`;
    const parts = [];
    if (systemInstruction) parts.push({ text: systemInstruction });
    parts.push({ text });

    const body = {
        contents: [{ role: "user", parts: [{ text: (systemInstruction ? systemInstruction + "\n\n" : "") + text }] }],
        generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 8192,
            ...(opts.json && { responseMimeType: "application/json" }),
        },
    };

    const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });

    if (!res.ok) {
        const err = await res.text();
        throw new Error(`Gemini API error: ${res.status} ${err}`);
    }

    const data = await res.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (content == null) throw new Error("Gemini returned no content");
    return content.trim();
}

/**
 * Call OpenAI API (existing config).
 * @param {string} userContent
 * @param {string} [systemContent]
 * @param {{ json?: boolean }} [opts]
 * @returns {Promise<string>}
 */
async function openaiGenerate(userContent, systemContent, opts = {}) {
    const { openai } = await import("@/configs/openai");
    const messages = [];
    if (systemContent) messages.push({ role: "system", content: systemContent });
    messages.push({ role: "user", content: userContent });

    const options = {
        model: OPENAI_MODEL,
        messages,
        temperature: 0.2,
        max_tokens: 8192,
    };
    if (opts.json) options.response_format = { type: "json_object" };

    const res = await openai.chat.completions.create(options);
    const content = res.choices?.[0]?.message?.content;
    if (content == null) throw new Error("OpenAI returned no content");
    return content.trim();
}

/**
 * Generate text (or JSON string) from the configured provider.
 * @param {string} userPrompt - main prompt
 * @param {string} [systemPrompt] - system/instruction prompt
 * @param {{ json?: boolean }} [opts] - request JSON output when true
 * @returns {Promise<string>}
 */
export async function generateForInsights(userPrompt, systemPrompt, opts = {}) {
    if (PROVIDER === "openai") {
        return openaiGenerate(userPrompt, systemPrompt, opts);
    }
    return geminiGenerate(userPrompt, systemPrompt, opts);
}

/**
 * Generate and parse JSON. Throws if invalid.
 * @returns {Promise<object>}
 */
export async function generateJSONForInsights(userPrompt, systemPrompt) {
    const raw = await generateForInsights(userPrompt, systemPrompt, { json: true });
    const cleaned = raw.replace(/^```json?\s*|\s*```$/g, "").trim();
    const parsed = JSON.parse(cleaned);
    return parsed;
}
