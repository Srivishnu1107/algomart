require('dotenv').config();
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
async function fetchWithFallback(userPrompt, systemPrompt) {
    const keys = [
        process.env.GEMINI_API_KEY,
        process.env.GEMINI_API_KEY_2,
        process.env.GEMINI_API_KEY_3,
    ].filter(Boolean);
    if (keys.length === 0) throw new Error('no keys');
    const body = {
        contents: [{ role: 'user', parts: [{ text: (systemPrompt ? systemPrompt + '\n\n' : '') + userPrompt }] }],
        generationConfig: { temperature: 0.2, maxOutputTokens: 8192, responseMimeType: 'application/json' },
    };
    for (const key of keys) {
        try {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${key}`;
            const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
            if (!res.ok) throw new Error(await res.text());
            const data = await res.json();
            const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
            console.log('RAW JSON:', content);
            return JSON.parse(content.replace(/^.*?json?\s*|\s*.*$/g, '').trim() || content.trim());
        } catch (err) {
            console.log('Error in loop:', err.message);
        }
    }
}
fetchWithFallback('Return { "test": 123 } as JSON.', 'You are a test JSON API.').then(console.log).catch(console.error);
