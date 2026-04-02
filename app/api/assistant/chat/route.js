import { askAiChatCompletionsCreate } from "@/lib/askAiClient";
import { DEFAULT_SYSTEM_PROMPT, FASHION_SYSTEM_PROMPT } from "@/lib/assistantDefaults";
import prisma from "@/lib/prisma";
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { searchWeb } from "@/lib/webSearch";

const ELECTRONICS_CATEGORIES = "Mobiles, Televisions, Laptops, Headphones, Earbuds, Watches, Speakers, Accessories, Tablets";
const FASHION_CATEGORIES = "Men, Women, Footwear, Accessories, Streetwear, Luxury";
const CONFIG_KEY_SYSTEM_PROMPT = "system_prompt";

const STOP_WORDS = new Set(["a", "an", "the", "is", "are", "for", "under", "above", "me", "my", "i", "we", "you", "can", "get", "want", "need", "best", "good", "better", "please", "give", "show", "find", "recommend", "suggest", "rupees", "rs", "inr", "₹"]);

function extractSearchTerms(message) {
    if (!message || typeof message !== "string") return [];
    const tokens = message
        .toLowerCase()
        .replace(/[^\w\s\d]/g, " ")
        .split(/\s+/)
        .filter((w) => w.length >= 2 && !STOP_WORDS.has(w));
    const uniq = [...new Set(tokens)];
    return uniq.slice(0, 6);
}

/** Extracts budget (max price) from message. E.g. "under 50k", "below 150000", "within 30k", "under ₹50000". Returns number or null. */
function extractBudgetFromMessage(message) {
    if (message == null || typeof message !== "string") return null;
    const t = String(message).trim();
    if (!t) return null;
    const underMatch = t.match(/\b(?:under|below|within|upto|up to|max|under\s*₹?|below\s*₹?)\s*₹?\s*(\d+(?:,\d{3})*(?:\.\d+)?)\s*(k|lakh|lac|l)?/i);
    if (underMatch) {
        const numStr = underMatch[1];
        if (numStr == null) return null;
        let num = parseFloat(String(numStr).replace(/,/g, ""));
        const suffix = (underMatch[2] || "").toLowerCase();
        if (suffix === "k") num *= 1000;
        else if (suffix === "lakh" || suffix === "lac" || suffix === "l") num *= 100000;
        return num > 0 ? num : null;
    }
    const andMatch = t.match(/\b₹?\s*(\d+(?:,\d{3})*(?:\.\d+)?)\s*(k|lakh|lac|l)?\s*(?:and\s*)?(?:under|below|within|max)/i);
    if (andMatch) {
        const numStr = andMatch[1];
        if (numStr == null) return null;
        let num = parseFloat(String(numStr).replace(/,/g, ""));
        const suffix = (andMatch[2] || "").toLowerCase();
        if (suffix === "k") num *= 1000;
        else if (suffix === "lakh" || suffix === "lac" || suffix === "l") num *= 100000;
        return num > 0 ? num : null;
    }
    return null;
}

/** Maps user query to a single electronics category. Returns { primary, in } for DB filter so we only return that category (no laptops when user asked for phones). */
function getCategoryFromUserQuery(message) {
    if (!message || typeof message !== "string") return null;
    const t = message.trim().toLowerCase();
    const addCase = (arr) => [...arr, ...arr.map((s) => s.toLowerCase())];
    if (/\b(android|iphone|apple|samsung|phone|phones|mobile|mobiles|smartphone|smartphones)\b/.test(t)) return { primary: "Mobiles", in: addCase(["Mobiles", "Mobile", "Phones"]) };
    if (/\blaptop(s)?\b/.test(t)) return { primary: "Laptops", in: addCase(["Laptops", "Laptop"]) };
    if (/\b(tv|tvs|television(s)?)\b/.test(t)) return { primary: "Televisions", in: addCase(["Televisions", "TV", "Television"]) };
    if (/\b(headphone(s)?|earphone(s)?)\b/.test(t)) return { primary: "Headphones", in: addCase(["Headphones", "Headphone"]) };
    if (/\bearbud(s)?\b/.test(t)) return { primary: "Earbuds", in: addCase(["Earbuds", "Earbud"]) };
    if (/\bwatch(es)?\b/.test(t)) return { primary: "Watches", in: addCase(["Watches", "Watch"]) };
    if (/\bspeaker(s)?\b/.test(t)) return { primary: "Speakers", in: addCase(["Speakers", "Speaker"]) };
    if (/\btablet(s)?\b/.test(t)) return { primary: "Tablets", in: addCase(["Tablets", "Tablet"]) };
    if (/\baccessor(y|ies)\b/.test(t)) return { primary: "Accessories", in: addCase(["Accessories", "Accessory"]) };
    return null;
}

async function searchStoreProductsByQuery(prismaClient, userMessage, storeType, currency, options = {}) {
    const { take: takeLimit = 25 } = options;
    const terms = extractSearchTerms(userMessage);
    const categoryFilter = storeType === "electronics" ? getCategoryFromUserQuery(userMessage) : null;

    const storeFilter = storeType === "fashion"
        ? { store: { isActive: true, storeType: "fashion" } }
        : { store: { isActive: true, storeType: { not: "fashion" } } };

    const baseWhere = {
        inStock: true,
        is_draft: false,
        status: "active",
        ...storeFilter,
        ...(categoryFilter?.in?.length && { category: { in: categoryFilter.in } }),
    };

    let products;
    if (terms.length > 0) {
        const orConditions = terms.flatMap((t) => [
            { name: { contains: t, mode: "insensitive" } },
            { description: { contains: t, mode: "insensitive" } },
            { category: { contains: t, mode: "insensitive" } },
            { brand: { contains: t, mode: "insensitive" } },
        ]);
        products = await prismaClient.product.findMany({
            where: { ...baseWhere, OR: orConditions },
            include: { store: { select: { storeType: true } } },
            take: takeLimit,
            orderBy: { createdAt: "desc" },
        });
    } else {
        products = await prismaClient.product.findMany({
            where: baseWhere,
            include: { store: { select: { storeType: true } } },
            take: Math.min(takeLimit, 20),
            orderBy: { createdAt: "desc" },
        });
    }

    const currencySym = currency || "₹";
    return products.map((p) => {
        const price = p.offer_price ?? p.price ?? p.actual_price ?? p.mrp ?? 0;
        const storeTypeVal = p.store?.storeType || storeType;
        const href = storeTypeVal === "fashion" ? `/fashion/product/${p.id}` : `/product/${p.id}`;
        return {
            label: p.name,
            href,
            price: Number(price),
            category: p.category || "",
            description: (p.description || "").slice(0, 150),
        };
    });
}

/** Filter and rank store products under budget: prefer products matching "best under budget" web titles, then sort by price desc (premium under budget). Return 3-4. */
function filterAndRankByBudget(storeProducts, budget, webTitles = []) {
    const underBudget = storeProducts.filter((p) => p.price > 0 && p.price <= budget);
    const titleLower = (s) => (s || "").toLowerCase();
    const scoreProduct = (p) => {
        const name = titleLower(p.label);
        const matchWeb = webTitles.some((t) => {
            const tw = titleLower(t);
            return tw.includes(name) || name.includes(tw) || name.split(/\s+/).some((w) => w.length > 2 && tw.includes(w));
        });
        return { product: p, webMatch: matchWeb, price: p.price };
    };
    const scored = underBudget.map(scoreProduct);
    scored.sort((a, b) => {
        if (a.webMatch && !b.webMatch) return -1;
        if (!a.webMatch && b.webMatch) return 1;
        return b.price - a.price;
    });
    return scored.map((s) => s.product).slice(0, 4);
}

const PRODUCT_REQUEST_PATTERNS = [
    /\b(show|find|get|give|send|share|give me)\s+(me\s+)?(some|any|the)?\s*(products?|links?|options?|choices?)?/i,
    /\b(recommend|suggest|suggest me|recommend me)\b/i,
    /\b(do you have|do we have|any)\s+(laptops?|phones?|headphones?|tv|tvs|watches?|speakers?|mobiles?|products?)/i,
    /\b(which|what)\s+(laptops?|phones?|products?|items?)\b/i,
    /\blinks?\s+(to|for)\b/i,
    /\b(show me|find me)\s+/i,
    /\b(looking for|need|want)\s+(to see|a|some)?\s*(laptop|phone|product|item)/i,
];

function userAskedForProductLinks(lastUserMessage) {
    if (!lastUserMessage || typeof lastUserMessage !== "string") return false;
    const text = lastUserMessage.trim().toLowerCase();
    if (text.length < 3) return false;
    return PRODUCT_REQUEST_PATTERNS.some((re) => re.test(text));
}

/** True if the message looks like a product/category query (e.g. "android", "laptop") so we use server-side filtered results. */
function messageLooksLikeProductQuery(text) {
    if (!text || typeof text !== "string") return false;
    const t = text.trim().toLowerCase();
    const keywords = [
        "android", "iphone", "apple", "samsung", "laptop", "laptops", "phone", "phones", "mobile", "mobiles",
        "tv", "television", "headphone", "headphones", "earbud", "earbuds", "watch", "watches",
        "speaker", "speakers", "tablet", "tablets", "accessories",
    ];
    return keywords.some((kw) => t.includes(kw));
}

async function getSystemPrompt() {
    try {
        const row = await prisma.assistantConfig.findUnique({
            where: { key: CONFIG_KEY_SYSTEM_PROMPT },
        });
        if (row?.value?.trim()) return row.value.trim();
    } catch (_) { }
    return DEFAULT_SYSTEM_PROMPT;
}

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
        const storeType = body?.storeType === "fashion" ? "fashion" : "electronics";
        const inputMessages = Array.isArray(body?.messages) ? body.messages : [];
        const matches = Array.isArray(body?.matches) ? body.matches : null;
        const categoryProducts = Array.isArray(body?.categoryProducts) ? body.categoryProducts : null;
        const currency = body?.currency || "₹";
        const fashionProfileContext = typeof body?.fashionProfileContext === "string" ? body.fashionProfileContext.trim() : null;

        const cleanedMessages = inputMessages
            .filter((msg) => msg && typeof msg.content === "string" && ["user", "assistant"].includes(msg.role))
            .map((msg) => ({ role: msg.role, content: msg.content }));

        if (cleanedMessages.length === 0) {
            return NextResponse.json({ error: "No messages provided" }, { status: 400 });
        }

        const categories = storeType === "fashion" ? FASHION_CATEGORIES : ELECTRONICS_CATEGORIES;
        const formatProduct = (m) => {
            const priceStr = typeof m.price === "number" ? ` ${currency}${m.price}` : "";
            const desc = (m.description || "").slice(0, 200);
            return `- ${m.label}${priceStr} | ${m.category || ""} | ${desc}`;
        };

        const lastUserMsg = cleanedMessages.filter((m) => m.role === "user").pop()?.content;
        const isProductRequest = userAskedForProductLinks(lastUserMsg);
        const isProductQuery = storeType === "electronics" && (isProductRequest || messageLooksLikeProductQuery(lastUserMsg));

        let storeProductLinks = null;
        let contextLine;

        if (storeType === "electronics" && isProductQuery) {
            const budget = extractBudgetFromMessage(lastUserMsg);
            const categoryInfo = getCategoryFromUserQuery(lastUserMsg);
            const webQuery = budget
                ? `best ${categoryInfo?.primary?.toLowerCase() || "products"} under ${budget} India`
                : (lastUserMsg || "").trim() || "best products";

            const safeWebSearch = () =>
                Promise.resolve(searchWeb(webQuery, { limit: budget ? 10 : 6 })).catch(() => null);

            const [webResult, storeProductsRaw] = await Promise.all([
                safeWebSearch(),
                searchStoreProductsByQuery(prisma, lastUserMsg, "electronics", currency, { take: budget ? 50 : 25 }),
            ]);

            const webTitles = (webResult?.organic || []).map((o) => o.title || "").filter(Boolean);

            if (budget && storeProductsRaw.length > 0) {
                const ranked = filterAndRankByBudget(storeProductsRaw, budget, webTitles);
                storeProductLinks = ranked.length > 0 ? ranked : storeProductsRaw.filter((p) => p.price > 0 && p.price <= budget).slice(0, 4);
            } else {
                storeProductLinks = storeProductsRaw.slice(0, 8);
            }

            const storeListText = storeProductLinks.length > 0
                ? storeProductLinks.map(formatProduct).join("\n")
                : "none (no matching products in our store for this query)";

            let webContext = "";
            if (webResult?.organic?.length > 0) {
                const webLines = webResult.organic
                    .map((o) => `- ${o.title}: ${o.snippet}`)
                    .join("\n");
                webContext = `\nFrom web search (use for specs/features and to understand what matches the user's request; do NOT invent links—only use our store list below):\n${webLines}\n`;
            }

            const userQueryLine = lastUserMsg ? `\nUser's exact request: "${lastUserMsg.trim()}"\n` : "";
            const budgetLine = budget
                ? `\nUser mentioned a budget (max ${currency}${Math.round(budget).toLocaleString()}). Suggest the best products from our store list that are under this budget (3-4 if available; if we have fewer matching products, suggest only those—do not pad with other products). Prefer higher-rated/premium options under budget, not just the cheapest.\n`
                : "";
            contextLine = `Store: electronics. Categories: ${ELECTRONICS_CATEGORIES}. Currency: ${currency}.${userQueryLine}${budgetLine}${webContext}

Products available in our store that match the user's request (ONLY suggest from this list; if the list is "none", do NOT recommend any product—say we don't have matching products and suggest they browse the store):
${storeListText}

STRICT RULES—you MUST follow:
1. Match the user's request exactly. Android = ONLY Android phones (Mobiles category). Do NOT suggest iPhone, laptops, or any other category. Laptop = ONLY Laptops. Phone/Mobile = ONLY Mobiles. If they said Android, never mention or suggest iPhone or any non-Android device.
2. Only suggest products that appear in the "Products available in our store" list above. Use exact product names from that list. Do not invent or suggest products we do not have.
3. If the list above is "none" or empty, do NOT recommend any product. Say we don't have that right now and suggest they browse or search the store.
4. When the user set a budget: suggest 3-4 best options under budget from the list (premium/best value, not just cheapest). If the list has fewer than 3-4 products, suggest only what is listed—never suggest products not in the list.
5. Web search context is for understanding specs only; all suggested products must come from our store list above.

When you recommend products from our store list, the app will show links. Reply in your own words—no special format.`;
        } else {
            const hasMatches = Array.isArray(matches) && matches.length > 0;
            const matchedList = hasMatches ? matches.map(formatProduct).join("\n") : "none";
            const categoryList = categoryProducts?.length ? categoryProducts.map(formatProduct).join("\n") : "none";
            contextLine = `Store: ${storeType}. Categories: ${categories}. Currency: ${currency}.

Products matching the user's current query:\n${matchedList}

Products by category (for recommendations):\n${categoryList}

CRITICAL: Recommend only products that match what the user asked for. Each product line above includes its category (e.g. Laptops, Mobiles, Headphones). If the user asked for laptops, recommend ONLY products in the Laptops category—never suggest Headphones, Mobiles, TVs, etc. If the user asked for "Samsung phone" or phones, recommend only Mobiles (phones), not Samsung TVs or other categories. Match category and product type to the user's request.

When you mention or recommend products from the lists above, the app will show links for them. Reply in your own words—no special format required.`;
        }

        const systemPrompt = storeType === "fashion" ? FASHION_SYSTEM_PROMPT : await getSystemPrompt();
        const systemMessages = [
            { role: "system", content: systemPrompt },
            { role: "system", content: contextLine },
        ];
        if (storeType === "electronics" && isProductQuery) {
            systemMessages.push({
                role: "system",
                content: "REMINDER: Recommend ONLY what the user asked for. Android = only Android phones, never iPhone or laptops. Laptop = only Laptops. Phone = only Mobiles. If our store list has no matching product, say so and do not suggest other categories.",
            });
        }
        if (storeType === "fashion" && fashionProfileContext) {
            systemMessages.push({ role: "system", content: fashionProfileContext });
            systemMessages.push({
                role: "system",
                content: "CRITICAL: The user profile above includes Gender and Age. You MUST use Gender to filter and suggest only the correct category (Men or Women). You MUST use Age to suggest age-appropriate styles. Never ignore Gender or Age when recommending products.",
            });
        }
        const response = await askAiChatCompletionsCreate({
            temperature: 0.5,
            messages: [
                ...systemMessages,
                ...cleanedMessages.slice(-12),
            ],
        });

        let reply = (response && response.choices?.[0]?.message?.content) ? String(response.choices[0].message.content).trim() : "";
        if (!reply) {
            reply = "I couldn’t generate a reply right now. Here are some products from our store that might help.";
        } else {
            reply = reply.replace(/\s*INTENT:\s*\w+\s*$/i, "").trim();
        }

        const showProductLinks = storeProductLinks
            ? storeProductLinks.length > 0 && isProductQuery
            : (Array.isArray(matches) && matches.length > 0 && isProductRequest);
        const linksToReturn = storeProductLinks && storeProductLinks.length > 0 ? storeProductLinks : undefined;

        return NextResponse.json({
            reply,
            showProductLinks,
            ...(linksToReturn && { productLinks: linksToReturn }),
        });
    } catch (error) {
        console.error("[POST /api/assistant/chat]", error?.message || error);
        if (error?.stack) console.error(error.stack);
        const status = error?.status ?? (String(error?.message || "").includes("429") ? 429 : 500);
        const message =
            status === 429
                ? "Rate limit reached. Please try again in a moment."
                : error?.message || "AI request failed";
        return NextResponse.json(
            { error: message },
            { status: status === 429 ? 429 : 500 }
        );
    }
}
