'use client'
import { MessageCircle, Send, Sparkles, X, User } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useSelector } from "react-redux";
import Link from "next/link";
import { useAskAi } from "@/contexts/AskAiContext";
import { generateFashionContextPrompt } from "@/components/fashion/UserProfiles";

async function fetchFashionProfiles() {
    try {
        const res = await fetch("/api/fashion-profiles");
        const data = await res.json();
        if (!res.ok) return [];
        return Array.isArray(data?.profiles) ? data.profiles : [];
    } catch {
        return [];
    }
}

const QUICK_PROMPTS = [
    "Show me today's top deals",
    "Help me pick a gift under ₹50",
    "Find trending items right now",
    "What are the best sellers this week?",
];

const AVAILABILITY_HINTS = ["available", "availability", "in stock", "stock", "do you have", "have", "sell", "buy", "find", "show", "link", "price", "recommend", "looking for", "need", "want"];
const STOPWORDS = new Set(["hi", "hey", "hello", "thanks", "thank", "you", "there", "please", "ok", "okay", "yo", "bro", "sir", "maam"]);

// Keyword → category for discovery (category-level requests)
const ELECTRONICS_CATEGORY_KEYWORDS = {
    mobiles: "Mobiles", mobile: "Mobiles", phones: "Mobiles", smartphone: "Mobiles",
    televisions: "Televisions", tv: "Televisions", tvs: "Televisions",
    laptops: "Laptops", laptop: "Laptops", notebook: "Laptops",
    headphones: "Headphones", headphone: "Headphones", earphones: "Headphones",
    earbuds: "Earbuds", earbud: "Earbuds", "wireless earbuds": "Earbuds",
    watches: "Watches", watch: "Watches", smartwatch: "Watches",
    speakers: "Speakers", speaker: "Speakers",
    accessories: "Accessories", accessory: "Accessories",
    tablets: "Tablets", tablet: "Tablets", appliances: "Tablets", appliance: "Tablets",
};
const FASHION_CATEGORY_KEYWORDS = {
    men: "Men", women: "Women", footwear: "Footwear", shoes: "Footwear",
    accessories: "Accessories", streetwear: "Streetwear", luxury: "Luxury",
};

/** General chat: greetings, thanks, help, bye — no profile needed. */
const GENERAL_CHAT_PATTERNS = /^(hi|hello|hey|hiya|thanks|thank you|thank u|ty|ok|okay|bye|good morning|good evening|good night|what can you do|how are you|help|sup|yo|hola)$/i;
const GENERAL_CHAT_WORDS = new Set(["hi", "hello", "hey", "thanks", "thank", "ok", "okay", "bye", "help", "please", "yes", "no", "cool", "nice", "great", "good"]);

/** True when the user is looking for products/suggestions (fashion: then we may ask for profile). */
function isProductOrSuggestionRequest(text) {
    const t = text.trim().toLowerCase();
    if (!t || t.length < 2) return false;
    if (t.length <= 25 && GENERAL_CHAT_PATTERNS.test(t.replace(/[^\w\s]/g, "").trim())) return false;
    const words = t.replace(/[^\w\s]/g, " ").split(/\s+/).filter(Boolean);
    if (words.length <= 2 && words.every((w) => GENERAL_CHAT_WORDS.has(w))) return false;
    const suggestionKeywords = ["suggest", "recommend", "find", "looking for", "want", "need", "show", "gift", "buy", "get me", "something for", "outfit", "size", "dress", "shirt", "shoes", "pick", "choose", "deal", "trending", "best", "top"];
    return suggestionKeywords.some((kw) => t.includes(kw));
}

const INITIAL_MESSAGE = { role: "assistant", content: "Hi! How can I help you today?" };

const AiChatWidget = ({ isFashion, hideButton = false }) => {
    const { isOpen, setIsOpen } = useAskAi();
    const mode = isFashion ? "fashion" : "electronics";
    const modeRef = useRef(mode);
    modeRef.current = mode;

    const [messagesByMode, setMessagesByMode] = useState({
        fashion: [INITIAL_MESSAGE],
        electronics: [INITIAL_MESSAGE],
    });
    const [inputByMode, setInputByMode] = useState({ fashion: "", electronics: "" });

    const messages = messagesByMode[mode] ?? [INITIAL_MESSAGE];
    const input = inputByMode[mode] ?? "";

    const setMessages = useCallback((updater, fixedMode) => {
        setMessagesByMode((prev) => {
            const m = fixedMode ?? modeRef.current;
            const current = prev[m] ?? [INITIAL_MESSAGE];
            return { ...prev, [m]: typeof updater === "function" ? updater(current) : updater };
        });
    }, []);
    const setInput = useCallback((valueOrUpdater) => {
        setInputByMode((prev) => {
            const m = modeRef.current;
            const current = prev[m] ?? "";
            return { ...prev, [m]: typeof valueOrUpdater === "function" ? valueOrUpdater(current) : valueOrUpdater };
        });
    }, []);

    const [mounted, setMounted] = useState(false);
    const products = useSelector(state => state.product.list);
    const [isLoading, setIsLoading] = useState(false);
    const messagesRef = useRef(messages);
    const scrollRef = useRef(null);
    const lastCategoryRef = useRef(null);
    const [selectedFashionProfile, setSelectedFashionProfile] = useState(null);
    const [showProfilePicker, setShowProfilePicker] = useState(false);
    const [pendingMessage, setPendingMessage] = useState("");
    const [fashionProfiles, setFashionProfiles] = useState([]);

    useEffect(() => {
        if (!isFashion) {
            setShowProfilePicker(false);
            setPendingMessage("");
        }
    }, [isFashion]);

    useEffect(() => {
        messagesRef.current = messages;
    }, [messages]);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (!scrollRef.current) return;
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }, [messages, isLoading, isOpen]);

    const theme = useMemo(() => {
        return isFashion
            ? {
                header: "from-[#8B6914] via-[#a67c1a] to-[#c9a84c]",
                headerText: "text-white",
                headerSubtext: "text-white/80",
                ring: "focus-within:ring-[#8B6914]/30",
                button: "bg-[#8B6914] hover:bg-[#7a5c12] text-white",
                chip: "border-[#8B6914]/30 text-[#8B6914] bg-white/60 hover:border-[#8B6914]/60 hover:bg-white/80",
                userBubble: "bg-[#8B6914] text-white",
                assistantBubble: "bg-[#f5ede3] text-[#2d1810]",
                bodyBg: "bg-[#faf5f0]",
                inputAreaBg: "bg-[#faf5f0] border-[#d4c4a8]/40",
                inputBg: "bg-white border-[#d4c4a8]/50",
                inputText: "text-[#2d1810] placeholder-[#8B7355]/60",
                linkColor: "text-[#8B6914]",
                loadingText: "text-[#8B7355]",
            }
            : {
                header: "from-teal-400/90 via-teal-400/60 to-teal-400/30",
                headerText: "text-zinc-900",
                headerSubtext: "text-zinc-900/80",
                ring: "focus-within:ring-teal-500/30",
                button: "bg-teal-400 hover:bg-teal-300 text-zinc-900",
                chip: "border-teal-400/30 text-teal-100 hover:border-teal-300/70 bg-zinc-900/40",
                userBubble: "bg-teal-400 text-zinc-900",
                assistantBubble: "bg-zinc-800/80 text-zinc-200",
                bodyBg: "bg-[#0a0a0b]",
                inputAreaBg: "bg-[#0a0a0b] border-zinc-800/60",
                inputBg: "bg-zinc-800/80 border-zinc-700/80",
                inputText: "text-zinc-200 placeholder-zinc-500",
                linkColor: "text-teal-400",
                loadingText: "text-zinc-400",
            };
    }, [isFashion]);

    const normalizeText = (value) => {
        if (!value) return '';
        return value.toString().toLowerCase();
    };

    const tokenizeSearch = (query) => {
        return query
            .toLowerCase()
            .replace(/[^a-z0-9\s]/g, ' ')
            .split(/\s+/)
            .filter((word) => word.length >= 3 && !STOPWORDS.has(word));
    };

    const getSearchText = (product) => {
        const fields = [
            product.name,
            product.description,
            product.category,
            product.brand,
            product.store?.name,
            product.store?.username,
        ];
        return fields.map(normalizeText).join(' ');
    };

    const getScopedProducts = () => {
        const fashionCategories = new Set(['Men', 'Women', 'Footwear', 'Accessories', 'Streetwear', 'Luxury']);
        return products.filter((product) => {
            const resolvedType = product.productType || product.store?.storeType;
            if (resolvedType) {
                return resolvedType === (isFashion ? 'fashion' : 'electronics');
            }
            const isFashionCategory = fashionCategories.has(product.category);
            return isFashion ? isFashionCategory : !isFashionCategory;
        });
    };

    const getProductUrl = (productId) => {
        return isFashion ? `/fashion/product/${productId}` : `/product/${productId}`;
    };

    const toMatchItem = (product) => ({
        label: product.name,
        href: getProductUrl(product.id),
        description: product.description || "",
        price: product.price,
        category: product.category || "",
    });

    /** Returns matching products for any query with full details for specs and comparison. */
    const getProductMatchesForQuery = (query) => {
        const tokens = tokenizeSearch(query);
        if (tokens.length === 0) return [];
        const list = getScopedProducts();
        const scored = list.map((product) => {
            const haystack = getSearchText(product);
            const nameText = normalizeText(product.name);
            const matchCount = tokens.filter((token) => haystack.includes(token)).length;
            const nameMatchCount = tokens.filter((token) => nameText.includes(token)).length;
            return { product, matchCount, nameMatchCount };
        });
        const withMatches = scored.filter((item) => item.matchCount > 0);
        const nameMatches = withMatches.filter((item) => item.nameMatchCount > 0);
        const useMatches = nameMatches.length > 0 ? nameMatches : withMatches;
        return useMatches
            .sort((a, b) => b.matchCount - a.matchCount)
            .slice(0, 6)
            .map((item) => toMatchItem(item.product));
    };

    /** Detect category from message for discovery (e.g. "I need a laptop" -> Laptops). */
    const getCategoryFromMessage = (text) => {
        const lower = text.toLowerCase().replace(/[^a-z0-9\s]/g, " ");
        const words = lower.split(/\s+/).filter((w) => w.length >= 2);
        const keywordMap = isFashion ? FASHION_CATEGORY_KEYWORDS : ELECTRONICS_CATEGORY_KEYWORDS;
        for (const [keyword, category] of Object.entries(keywordMap)) {
            if (lower.includes(keyword)) return category;
        }
        return null;
    };

    /** Products in a given category for discovery recommendations (budget/purpose). */
    const getProductsByCategory = (categoryName) => {
        if (!categoryName) return [];
        const list = getScopedProducts();
        const normalized = categoryName.toLowerCase().trim();
        return list
            .filter((p) => (p.category || "").toLowerCase() === normalized)
            .slice(0, 25)
            .map((p) => toMatchItem(p));
    };

    const sendMessage = async (content, fashionProfile = null) => {
        const text = content.trim();
        if (!text || isLoading) return;

        const requestMode = modeRef.current;
        const outgoing = [
            ...messagesRef.current,
            { role: "user", content: text },
        ];
        setMessages(outgoing, requestMode);
        setInput("");
        setIsLoading(true);

        const categoryFromMessage = getCategoryFromMessage(text);
        if (categoryFromMessage) lastCategoryRef.current = categoryFromMessage;
        const categoryProducts = getProductsByCategory(categoryFromMessage || lastCategoryRef.current || "");

        try {
            const matchPayload = getProductMatchesForQuery(text);
            const currency = process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || "₹";
            const fashionProfileContext = isFashion && fashionProfile ? generateFashionContextPrompt(fashionProfile) : null;

            const response = await fetch("/api/assistant/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    storeType: isFashion ? "fashion" : "electronics",
                    messages: outgoing.slice(-14),
                    matches: matchPayload.length > 0 ? matchPayload : null,
                    categoryProducts: categoryProducts.length > 0 ? categoryProducts : null,
                    currency,
                    ...(fashionProfileContext && { fashionProfileContext }),
                }),
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data?.error || "AI response failed");
            }
            const reply = data?.reply?.toString().trim();
            const showProductLinks = data?.showProductLinks === true;
            const links = showProductLinks
                ? (Array.isArray(data?.productLinks) && data.productLinks.length > 0
                    ? data.productLinks
                    : matchPayload.length > 0 ? matchPayload : categoryProducts.slice(0, 5))
                : undefined;
            setMessages((prev) => [
                ...prev,
                {
                    role: "assistant",
                    content: reply || "Sorry, I could not generate a response.",
                    links,
                    ...(isFashion && fashionProfile && { fashionProfile: { name: fashionProfile.name } }),
                },
            ], requestMode);
        } catch (error) {
            setMessages((prev) => [
                ...prev,
                {
                    role: "assistant",
                    content: "Sorry, I am having trouble right now. Please try again in a moment.",
                },
            ], requestMode);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        const text = input.trim();
        if (!text || isLoading) return;

        if (isFashion && isProductOrSuggestionRequest(text)) {
            if (selectedFashionProfile) {
                sendMessage(text, selectedFashionProfile);
                return;
            }
            const profiles = await fetchFashionProfiles();
            setFashionProfiles(profiles);
            setPendingMessage(text);
            setInput("");
            setShowProfilePicker(true);
            return;
        }
        sendMessage(text, isFashion ? null : undefined);
    };

    const handleProfileSelect = (profile) => {
        setSelectedFashionProfile(profile);
        setShowProfilePicker(false);
        if (pendingMessage) {
            sendMessage(pendingMessage, profile);
            setPendingMessage("");
        }
    };

    const handleProfileSkip = () => {
        setShowProfilePicker(false);
        if (pendingMessage) {
            sendMessage(pendingMessage, null);
            setPendingMessage("");
        }
    };

    useEffect(() => {
        if (showProfilePicker && isFashion) {
            fetchFashionProfiles().then(setFashionProfiles);
        }
    }, [showProfilePicker, isFashion]);

    const chatPanel = isOpen ? (
        <div className="relative w-full h-full flex flex-col overflow-hidden">
            <div className={`px-5 py-4 bg-gradient-to-r ${theme.header} ${theme.headerText} flex-shrink-0 rounded-tl-[28px]`}>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <MessageCircle className="size-5" />
                        <div>
                            <p className="text-sm font-semibold">{isFashion ? "Fashion Expert" : "GoCart AI"}</p>
                            <p className={`text-xs ${theme.headerSubtext}`}>
                                {isFashion ? "Personalized style & size suggestions" : "Ask anything about shopping"}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-1">
                        {isFashion && selectedFashionProfile && (
                            <button
                                type="button"
                                onClick={() => setSelectedFashionProfile(null)}
                                className="text-xs px-2 py-1 rounded-lg bg-white/20 hover:bg-white/30 transition"
                            >
                                Change profile
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={() => setIsOpen(false)}
                            className="w-8 h-8 rounded-full flex items-center justify-center bg-white/20 hover:bg-white/30 transition"
                            aria-label="Close chat"
                        >
                            <X className="size-4" />
                        </button>
                    </div>
                </div>
                <div className="mt-3 flex gap-2 overflow-x-auto no-scrollbar pb-1">
                    {QUICK_PROMPTS.map((prompt) => (
                        <button
                            key={prompt}
                            type="button"
                            onClick={() => {
                                if (isFashion && isProductOrSuggestionRequest(prompt) && !selectedFashionProfile) {
                                    setPendingMessage(prompt);
                                    setShowProfilePicker(true);
                                } else {
                                    sendMessage(prompt, isFashion ? selectedFashionProfile : null);
                                }
                            }}
                            className={`whitespace-nowrap text-xs px-3 py-1.5 rounded-full border ${theme.chip} transition`}
                        >
                            {prompt}
                        </button>
                    ))}
                </div>
            </div>

            {showProfilePicker && (
                <div className="absolute inset-0 z-10 flex flex-col bg-[#faf5f0]/98 rounded-tl-[28px] px-4 py-4">
                    <div className="flex items-center justify-between mb-3">
                        <p className="text-sm font-semibold text-[#2d1810]">Select a profile for personalized suggestions</p>
                        <button
                            type="button"
                            onClick={handleProfileSkip}
                            className="text-xs font-medium text-[#8B6914] hover:underline"
                        >
                            Skip
                        </button>
                    </div>
                    {fashionProfiles.length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center px-4">
                            <p className="text-sm text-[#8B7355]">No profiles yet. Add one in My Adjustments for personalized suggestions.</p>
                            <div className="flex gap-2">
                                <Link
                                    href="/fashion/adjustments"
                                    className="text-sm font-semibold px-4 py-2 rounded-xl bg-[#8B6914] text-white hover:bg-[#7a5c12] transition"
                                    onClick={() => setShowProfilePicker(false)}
                                >
                                    My Adjustments
                                </Link>
                                <button
                                    type="button"
                                    onClick={handleProfileSkip}
                                    className="text-sm font-semibold px-4 py-2 rounded-xl border border-[#d4c4a8] text-[#2d1810] hover:bg-[#f5ede3] transition"
                                >
                                    Skip
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 overflow-y-auto space-y-2">
                            {fashionProfiles.map((profile) => (
                                <button
                                    key={profile.id}
                                    type="button"
                                    onClick={() => handleProfileSelect(profile)}
                                    className="w-full flex items-center gap-3 p-3 rounded-xl border border-[#d4c4a8]/50 bg-white hover:border-[#8B6914]/50 hover:bg-amber-50/50 transition text-left"
                                >
                                    <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
                                        <User size={20} className="text-amber-700" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="font-semibold text-[#2d1810] truncate">{profile.name}</p>
                                        <p className="text-xs text-[#8B7355]">
                                            {profile.height} cm · {profile.weight} kg · {profile.bodyType}
                                            {profile.ageInterval && ` · ${profile.ageInterval}`}
                                            {profile.gender && ` · ${profile.gender}`}
                                        </p>
                                    </div>
                                </button>
                            ))}
                            <button
                                type="button"
                                onClick={handleProfileSkip}
                                className="w-full py-2 text-sm font-medium text-[#8B7355] hover:text-[#8B6914]"
                            >
                                Skip (no profile)
                            </button>
                        </div>
                    )}
                </div>
            )}

            <div ref={scrollRef} className={`flex-1 overflow-y-auto px-5 py-4 space-y-3 ${theme.bodyBg}`}>
                {messages.map((msg, index) => (
                    <div
                        key={`${msg.role}-${index}`}
                        className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}
                    >
                        <div
                            className={`max-w-[78%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                                msg.role === "user" ? theme.userBubble : theme.assistantBubble
                            }`}
                        >
                            {msg.content}
                            {msg.links && msg.links.length > 0 && (
                                <div className="mt-2 space-y-2">
                                    {msg.links.map((link) => (
                                        <a
                                            key={link.href}
                                            href={link.href}
                                            target="_blank"
                                            rel="noreferrer"
                                            className={`block text-xs font-semibold underline underline-offset-4 ${theme.linkColor}`}
                                        >
                                            {link.label}
                                        </a>
                                    ))}
                                </div>
                            )}
                        </div>
                        {msg.role === "assistant" && msg.fashionProfile?.name && (
                            <span className={`mt-1 px-2.5 py-1 rounded-full text-xs font-medium ${isFashion ? "bg-amber-100 text-amber-800" : "bg-teal-500/20 text-teal-300"}`}>
                                For: {msg.fashionProfile.name}
                            </span>
                        )}
                    </div>
                ))}
                {isLoading && (
                    <div className="flex justify-start">
                        <div className={`max-w-[70%] rounded-2xl px-4 py-2 text-sm ${theme.assistantBubble}`}>
                            Thinking...
                        </div>
                    </div>
                )}
            </div>

            {!showProfilePicker && (
                <form
                    onSubmit={handleSubmit}
                    className={`px-2 py-3 border-t flex items-center gap-2 ${theme.inputAreaBg} ${theme.ring}`}
                >
                    <div className={`flex-1 flex items-center rounded-full border pl-5 pr-2 py-2 min-h-[48px] ${theme.inputBg}`}>
                        <input
                            value={input}
                            onChange={(event) => setInput(event.target.value)}
                            placeholder="Type your message..."
                            className={`flex-1 bg-transparent text-sm outline-none min-w-0 ${theme.inputText}`}
                            disabled={isLoading}
                        />
                        <button
                            type="submit"
                            disabled={isLoading || !input.trim()}
                            className={`w-9 h-9 rounded-full flex items-center justify-center transition disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0 ${theme.button}`}
                            aria-label="Send"
                        >
                            <Send className="size-4" />
                        </button>
                    </div>
                </form>
            )}
        </div>
    ) : null;

    return (
        <>
            {!hideButton && (
                <button
                    type="button"
                    onClick={() => setIsOpen((prev) => !prev)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full border ${
                        isFashion ? 'border-[#8B6914]/40 text-[#8B6914] hover:bg-[#8B6914]/10' : 'border-teal-400/40 text-teal-100 hover:bg-teal-400/10'
                    } transition cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#0a0a0b]`}
                    aria-label="Ask AI"
                >
                    <Sparkles size={16} className={isFashion ? "text-[#8B6914]" : "text-teal-400"} />
                    <span className="hidden sm:inline text-sm font-medium">Ask AI</span>
                </button>
            )}

            {mounted && isOpen && typeof document !== "undefined"
                ? createPortal(chatPanel, document.getElementById("ask-ai-drawer") || document.body)
                : null}
        </>
    );
};

export default AiChatWidget;
