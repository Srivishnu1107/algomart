/**
 * Web search via Serper (Google Search API).
 * Uses SERPER_API_KEY and SERPER_API_KEY_BACKUP in round-robin for even load.
 * @see https://serper.dev
 */

const SERPER_URL = "https://google.serper.dev/search";

function getSerperKeys() {
    const keys = [
        process.env.SERPER_API_KEY?.trim(),
        process.env.SERPER_API_KEY_BACKUP?.trim(),
    ].filter(Boolean);
    return keys;
}

let serperRoundRobinIndex = 0;

function getNextSerperKey() {
    const keys = getSerperKeys();
    if (keys.length === 0) return null;
    const key = keys[serperRoundRobinIndex % keys.length];
    serperRoundRobinIndex += 1;
    return key;
}

export async function searchWeb(query, options = {}) {
    const apiKey = getNextSerperKey();
    if (!apiKey) return null;

    const limit = options.limit ?? 8;
    const safeQuery = String(query || "").trim().slice(0, 200);
    if (!safeQuery) return null;

    const keys = getSerperKeys();
    const tryWithKey = (key) =>
        fetch(SERPER_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-API-KEY": key,
            },
            body: JSON.stringify({
                q: safeQuery,
                num: limit,
            }),
        });

    try {
        let res = await tryWithKey(apiKey);
        if (!res.ok && keys.length > 1) {
            for (const k of keys) {
                if (k === apiKey) continue;
                res = await tryWithKey(k);
                if (res.ok) break;
            }
        }
        if (!res.ok) return null;
        const data = await res.json();
        const organic = Array.isArray(data.organic) ? data.organic : [];
        return {
            query: safeQuery,
            organic: organic.slice(0, limit).map((o) => ({
                title: o.title || "",
                link: o.link || "",
                snippet: o.snippet || "",
            })),
        };
    } catch {
        return null;
    }
}
