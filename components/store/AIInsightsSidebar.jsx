'use client'
import { useEffect, useState } from "react"
import { useAuth } from "@clerk/nextjs"
import axios from "axios"
import {
    SparklesIcon,
    RefreshCwIcon,
    LayoutDashboardIcon,
    TrendingUpIcon,
    BarChart3Icon,
    AlertTriangleIcon,
    SwordsIcon,
    ChevronDownIcon,
    ChevronUpIcon,
} from "lucide-react"
import toast from "react-hot-toast"
import { usePathname } from "next/navigation"

const AI_INSIGHTS_TABS = [
    { id: "overview", label: "Overview", icon: LayoutDashboardIcon },
    { id: "demand", label: "Demand", icon: TrendingUpIcon },
    { id: "sales", label: "Sales", icon: BarChart3Icon },
    { id: "return", label: "Returns", icon: AlertTriangleIcon },
    { id: "competitor", label: "Competitor", icon: SwordsIcon },
]

const EMOJI_STRIP = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu

function stripEmoji(text) {
    if (!text || typeof text !== "string") return ""
    return text.replace(EMOJI_STRIP, "").replace(/\*\*([^*]+)\*\*/g, "$1").trim()
}

function extractBullets(text, maxItems = 3) {
    if (!text) return []
    const cleaned = stripEmoji(text)
    const lines = cleaned.split(/\n/).map((l) => l.replace(/^\s*[-*•]\s*|\d+\.\s*/, "").trim()).filter(Boolean)
    const bullets = lines.filter((l) => l.length > 2)
    return bullets.slice(0, maxItems)
}

function getSection(text, sectionTitle) {
    if (!text) return null
    const regex = new RegExp(`\\*\\*${sectionTitle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\*\\*\\s*\\n([\\s\\S]*?)(?=\\n\\s*\\*\\*|$)`, "i")
    const match = text.match(regex)
    return match ? match[1].trim() : null
}

function parseOverviewJson(overviewInsight) {
    if (!overviewInsight || typeof overviewInsight !== "string") return null
    try {
        const cleaned = overviewInsight.replace(/^```json?\s*|\s*```$/g, "").trim()
        const p = JSON.parse(cleaned)
        if (p && typeof p.overall_status === "string") return p
    } catch (_) {}
    return null
}

function CompactOverview({ overviewInsight, issueInsight }) {
    const json = parseOverviewJson(overviewInsight)
    if (json) {
        const status = json.overall_status?.slice(0, 150) + (json.overall_status?.length > 150 ? "..." : "")
        return (
            <div className="space-y-2 text-xs">
                {status && <p className="text-zinc-300 leading-relaxed">{status}</p>}
            </div>
        )
    }

    const highlightsContent = getSection(overviewInsight, "Highlights") || getSection(overviewInsight, "Overview") || overviewInsight
    const highlights = extractBullets(highlightsContent, 2)
    
    if (highlights.length === 0) return <p className="text-xs text-zinc-500">No insights available</p>
    
    return (
        <div className="space-y-1.5 text-xs">
            {highlights.map((item, i) => (
                <div key={i} className="flex items-start gap-1.5 text-zinc-300">
                    <span className="text-teal-400 shrink-0 mt-0.5">•</span>
                    <span className="leading-relaxed">{item}</span>
                </div>
            ))}
        </div>
    )
}

function CompactDemand({ snapshot }) {
    if (!snapshot) return <p className="text-xs text-zinc-500">No data</p>
    const { summary, restockSuggestions = [] } = snapshot
    const summaryText = summary?.slice(0, 120) + (summary?.length > 120 ? "..." : "")
    
    return (
        <div className="space-y-2 text-xs">
            {summaryText && <p className="text-zinc-300 leading-relaxed">{summaryText}</p>}
            {restockSuggestions?.length > 0 && (
                <div className="mt-2 pt-2 border-t border-zinc-700/50">
                    <p className="text-zinc-400 text-[10px] font-medium mb-1">Top Restock:</p>
                    {restockSuggestions.slice(0, 2).map((s, i) => (
                        <div key={i} className="text-zinc-300 text-[10px]">
                            {s.productName || s.productId}: Qty {s.suggestedQuantity || "—"}
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

function CompactSales({ snapshot }) {
    if (!snapshot) return <p className="text-xs text-zinc-500">No data</p>
    const { summary, actionable_suggestions = [] } = snapshot
    const summaryText = summary?.slice(0, 120) + (summary?.length > 120 ? "..." : "")
    
    return (
        <div className="space-y-2 text-xs">
            {summaryText && <p className="text-zinc-300 leading-relaxed">{summaryText}</p>}
            {actionable_suggestions?.length > 0 && (
                <div className="mt-2 pt-2 border-t border-zinc-700/50">
                    {actionable_suggestions.slice(0, 2).map((s, i) => (
                        <div key={i} className="flex items-start gap-1.5 text-zinc-300 text-[10px] mb-1">
                            <span className="text-teal-400 shrink-0 mt-0.5">•</span>
                            <span>{s.suggestion}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

function CompactReturn({ snapshot }) {
    if (!snapshot) return <p className="text-xs text-zinc-500">No data</p>
    const { summary, products = [] } = snapshot
    const summaryText = summary?.slice(0, 120) + (summary?.length > 120 ? "..." : "")
    
    return (
        <div className="space-y-2 text-xs">
            {summaryText && <p className="text-zinc-300 leading-relaxed">{summaryText}</p>}
            {products?.length > 0 && (
                <div className="mt-2 pt-2 border-t border-zinc-700/50">
                    {products.slice(0, 2).map((p, i) => (
                        <div key={i} className="flex items-center gap-2 text-[10px] mb-1">
                            <span className="text-zinc-300">{p.productName || p.productId}</span>
                            <span className={`px-1.5 py-0.5 rounded text-[9px] ${
                                p.risk === "high" ? "bg-red-500/20 text-red-400" : 
                                p.risk === "medium" ? "bg-amber-500/20 text-amber-400" : 
                                "bg-zinc-500/20 text-zinc-400"
                            }`}>{p.risk}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

function CompactCompetitor({ snapshot }) {
    if (!snapshot) return <p className="text-xs text-zinc-500">No data</p>
    const { summary, comparisons = [] } = snapshot
    const summaryText = summary?.slice(0, 120) + (summary?.length > 120 ? "..." : "")
    
    return (
        <div className="space-y-2 text-xs">
            {summaryText && <p className="text-zinc-300 leading-relaxed">{summaryText}</p>}
            {comparisons?.length > 0 && (
                <div className="mt-2 pt-2 border-t border-zinc-700/50">
                    {comparisons.slice(0, 2).map((c, i) => (
                        <div key={i} className="text-[10px] text-zinc-300">
                            <span className="text-zinc-400">{c.metric || c.label}:</span> You: {c.vendorValue || "—"} vs Comp: {c.competitorValue || "—"}
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

export default function AIInsightsSidebar({ sidebarExpanded, isFashion }) {
    const { getToken } = useAuth()
    const pathname = usePathname()
    const storeTypeParam = isFashion ? '?type=fashion' : '?type=electronics'
    const accentText = isFashion ? 'text-pink-400' : 'text-teal-400'
    const accentBg = isFashion ? 'bg-pink-400' : 'bg-teal-400'
    const accentBorder = isFashion ? 'border-pink-500/50' : 'border-teal-500/50'
    const accentBgSoft = isFashion ? 'bg-pink-500/20' : 'bg-teal-500/20'
    const accentTextSoft = isFashion ? 'text-pink-400' : 'text-teal-400'

    const [isExpanded, setIsExpanded] = useState(false)
    const [aiInsightTab, setAiInsightTab] = useState('overview')
    const [aiInsightsLoading, setAiInsightsLoading] = useState(false)
    const [overviewInsights, setOverviewInsights] = useState(null)
    const [aiSnapshots, setAiSnapshots] = useState({ demand: null, sales: null, return: null, competitor: null })
    const [initialLoad, setInitialLoad] = useState(true)

    const aiInsightsApiPaths = {
        demand: "/api/store/ai-insights/demand",
        sales: "/api/store/ai-insights/sales",
        return: "/api/store/ai-insights/return-predictor",
        competitor: "/api/store/ai-insights/competitor",
    }

    const fetchAIInsights = async () => {
        let loadError = null
        try {
            const token = await getToken()
            try {
                const { data } = await axios.get(`/api/store/insights${storeTypeParam}`, { headers: { Authorization: `Bearer ${token}` } })
                setOverviewInsights(data.insights || null)
            } catch (e) {
                setOverviewInsights(null)
                if (!loadError) loadError = e?.response?.data?.error || e?.message
            }
            for (const tabId of ["demand", "sales", "return", "competitor"]) {
                try {
                    const { data } = await axios.get(aiInsightsApiPaths[tabId] + storeTypeParam, { headers: { Authorization: `Bearer ${token}` } })
                    setAiSnapshots((prev) => ({ ...prev, [tabId]: data.snapshot }))
                } catch (e) {
                    setAiSnapshots((prev) => ({ ...prev, [tabId]: null }))
                    if (!loadError) loadError = e?.response?.data?.error || e?.message
                }
            }
            if (loadError && !initialLoad) toast.error(loadError)
        } catch (e) {
            if (!initialLoad) toast.error(e?.response?.data?.error || e?.message || "Failed to load AI insights")
        } finally {
            setInitialLoad(false)
        }
    }

    const handleAIInsightRefresh = async () => {
        setAiInsightsLoading(true)
        try {
            const token = await getToken()
            if (aiInsightTab === "overview") {
                const { data } = await axios.post(`/api/store/insights${storeTypeParam}`, {}, { headers: { Authorization: `Bearer ${token}` } })
                setOverviewInsights(data.insights || null)
            } else {
                const { data } = await axios.post(aiInsightsApiPaths[aiInsightTab] + storeTypeParam, {}, { headers: { Authorization: `Bearer ${token}` } })
                setAiSnapshots((prev) => ({ ...prev, [aiInsightTab]: data.snapshot }))
            }
            toast.success("Analysis updated")
        } catch (e) {
            toast.error(e?.response?.data?.error || e?.message || "Refresh failed")
        }
        setAiInsightsLoading(false)
    }

    useEffect(() => {
        if (isExpanded) {
            fetchAIInsights()
        }
    }, [isExpanded, storeTypeParam])

    const currentSnapshot = aiSnapshots[aiInsightTab]
    const hasOverviewData = overviewInsights?.overviewInsight || overviewInsights?.issueInsight
    const hasAiData = aiInsightTab === "overview" ? hasOverviewData : currentSnapshot != null

    return (
        <div className="mt-auto">
            <div className="h-px bg-zinc-800/50 mx-2 mb-2" />
            
            {/* AI Insights Header */}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className={`w-full flex items-center gap-3 p-3 rounded-2xl border transition-all duration-300 group ${
                    isExpanded 
                        ? `bg-zinc-800/80 ${accentBorder} shadow-lg`
                        : 'bg-zinc-900/40 border-zinc-800/60 hover:bg-zinc-800 hover:border-zinc-700'
                }`}
            >
                <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 ${
                    isExpanded
                        ? `${accentBg} text-zinc-900 shadow-md`
                        : 'bg-zinc-800 text-zinc-400 group-hover:text-zinc-200 group-hover:bg-zinc-700'
                }`}>
                    <SparklesIcon size={18} />
                </div>
                {sidebarExpanded && (
                    <>
                        <span className={`text-sm font-semibold flex-1 text-left transition-all duration-500 ${
                            isExpanded ? accentText : 'text-zinc-400 group-hover:text-zinc-200'
                        }`}>
                            AI Insights
                        </span>
                        {isExpanded ? <ChevronUpIcon size={16} className={accentText} /> : <ChevronDownIcon size={16} className="text-zinc-500" />}
                    </>
                )}
            </button>

            {/* Expanded AI Insights Panel */}
            {isExpanded && sidebarExpanded && (
                <div className="mt-2 rounded-xl border border-zinc-700/60 bg-zinc-900/80 overflow-hidden">
                    {/* Tabs */}
                    <div className="flex flex-wrap gap-1 border-b border-zinc-700/60 p-1.5">
                        {AI_INSIGHTS_TABS.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setAiInsightTab(tab.id)}
                                className={`flex items-center gap-1 px-2 py-1 text-[10px] font-medium transition rounded ${
                                    aiInsightTab === tab.id 
                                        ? `${accentTextSoft} ${accentBgSoft} border ${accentBorder}` 
                                        : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50"
                                }`}
                            >
                                <tab.icon size={12} />
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Content */}
                    <div className="p-3 max-h-[300px] overflow-y-auto">
                        {aiInsightsLoading ? (
                            <div className="flex flex-col items-center justify-center py-8 text-zinc-500">
                                <RefreshCwIcon size={20} className="animate-spin mb-2" />
                                <p className="text-[10px]">Analyzing...</p>
                            </div>
                        ) : hasAiData ? (
                            <>
                                {aiInsightTab === "overview" && <CompactOverview overviewInsight={overviewInsights?.overviewInsight} issueInsight={overviewInsights?.issueInsight} />}
                                {aiInsightTab === "demand" && <CompactDemand snapshot={aiSnapshots.demand} />}
                                {aiInsightTab === "sales" && <CompactSales snapshot={aiSnapshots.sales} />}
                                {aiInsightTab === "return" && <CompactReturn snapshot={aiSnapshots.return} />}
                                {aiInsightTab === "competitor" && <CompactCompetitor snapshot={aiSnapshots.competitor} />}
                            </>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-6 text-zinc-500 text-center">
                                <p className="text-[10px] mb-2">No data yet</p>
                                <button
                                    onClick={handleAIInsightRefresh}
                                    disabled={aiInsightsLoading}
                                    className={`px-2 py-1 text-[10px] font-medium rounded ${accentBgSoft} ${accentTextSoft} border transition hover:bg-zinc-800/70 ${accentBorder}`}
                                >
                                    Run analysis
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Refresh Button */}
                    <div className="px-3 pb-2 border-t border-zinc-700/60 pt-2">
                        <button
                            onClick={handleAIInsightRefresh}
                            disabled={aiInsightsLoading}
                            className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 text-[10px] font-medium rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-600/80 transition disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                            <RefreshCwIcon size={12} className={aiInsightsLoading ? "animate-spin" : ""} />
                            Refresh
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
