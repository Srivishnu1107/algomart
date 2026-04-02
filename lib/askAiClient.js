import OpenAI from "openai";

const GROQ_BASE = "https://api.groq.com/openai/v1";

function isRetryableError(error) {
    const status = error?.status;
    const message = String(error?.message || "").toLowerCase();
    if (status === 429) return true;
    if (message.includes("429") || message.includes("rate limit") || message.includes("quota")) return true;
    if (status === 503 || status === 502) return true;
    if (status === 400) return true;
    return false;
}

const groqModel = () => process.env.ASK_AI_GROQ_MODEL?.trim() || "llama-3.3-70b-versatile";

function getGroqClients() {
    const keys = [
        process.env.ASK_AI_GROQ_API_KEY?.trim(),
        process.env.ASK_AI_GROQ_API_KEY_BACKUP?.trim(),
    ].filter(Boolean);
    if (keys.length === 0) return [];
    return keys.map((key) => new OpenAI({ apiKey: key, baseURL: GROQ_BASE }));
}

let groqClients = null;
let groqRoundRobinIndex = 0;

function getNextGroqClient() {
    if (!groqClients?.length) {
        groqClients = getGroqClients();
    }
    if (groqClients.length === 0) return null;
    const client = groqClients[groqRoundRobinIndex % groqClients.length];
    groqRoundRobinIndex += 1;
    return client;
}

function getGeminiClient() {
    const key = process.env.ASK_AI_GEMINI_API_KEY?.trim();
    const baseURL = process.env.ASK_AI_GEMINI_BASE_URL?.trim() || "https://generativelanguage.googleapis.com/v1beta/openai/";
    if (!key) return null;
    return new OpenAI({
        apiKey: key,
        baseURL,
    });
}

/**
 * Ask AI chat completions: uses Groq keys in round-robin (even load), falls back to other Groq key then Gemini on failure.
 * Uses ASK_AI_GROQ_API_KEY, ASK_AI_GROQ_API_KEY_BACKUP (same ASK_AI_GROQ_MODEL), and ASK_AI_GEMINI_*.
 */
export async function askAiChatCompletionsCreate(options) {
    const model = options.model || groqModel();
    const geminiModel = process.env.ASK_AI_GEMINI_MODEL?.trim() || "gemini-2.0-flash";
    const gemini = getGeminiClient();

    const groq = getNextGroqClient();
    if (groq) {
        try {
            return await groq.chat.completions.create({
                ...options,
                model,
            });
        } catch (err) {
            const otherGroqClients = getGroqClients();
            const triedIndex = (groqRoundRobinIndex - 1) % Math.max(1, otherGroqClients.length);
            for (let i = 1; i < otherGroqClients.length; i++) {
                const next = otherGroqClients[(triedIndex + i) % otherGroqClients.length];
                if (next) {
                    try {
                        return await next.chat.completions.create({
                            ...options,
                            model,
                        });
                    } catch (_) {
                        continue;
                    }
                }
            }
            if (gemini && isRetryableError(err)) {
                try {
                    return await gemini.chat.completions.create({
                        ...options,
                        model: options.model || geminiModel,
                    });
                } catch (fallbackErr) {
                    throw fallbackErr;
                }
            }
            throw err;
        }
    }

    if (gemini) {
        return gemini.chat.completions.create({
            ...options,
            model: options.model || geminiModel,
        });
    }

    throw new Error("Ask AI: set ASK_AI_GROQ_API_KEY and/or ASK_AI_GEMINI_API_KEY in .env");
}
