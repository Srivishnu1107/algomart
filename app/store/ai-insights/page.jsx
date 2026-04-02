'use client'
import Loading from "@/components/Loading"
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
    PackageIcon,
} from "lucide-react"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import toast from "react-hot-toast"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts"

const AI_INSIGHTS_TABS = [
    { id: "overview", label: "Overall Business Overview", icon: LayoutDashboardIcon },
    { id: "demand", label: "Demand & Stock", icon: TrendingUpIcon },
    { id: "sales", label: "Sales Insight", icon: BarChart3Icon },
    { id: "return", label: "Return Predictor", icon: AlertTriangleIcon },
    { id: "competitor", label: "Competitor Intel", icon: SwordsIcon },
]

const EMOJI_STRIP = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu

function stripEmoji(text) {
    if (!text || typeof text !== "string") return ""
    return text.replace(EMOJI_STRIP, "").replace(/\*\*([^*]+)\*\*/g, "$1").trim()
}

function extractBullets(text, maxItems = 5) {
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

function OverviewTabContent({ overviewInsight, issueInsight }) {
    const json = parseOverviewJson(overviewInsight)
    if (json) {
        const good = Array.isArray(json.good) ? json.good.slice(0, 3) : []
        const bad = Array.isArray(json.bad) ? json.bad.slice(0, 3) : []
        const next = Array.isArray(json.next_actions) ? json.next_actions.slice(0, 3) : []
        return (
            <div className="space-y-6">
                {json.overall_status && (
                    <div>
                        <h3 className="text-sm font-semibold text-zinc-200 mb-2">Overall performance</h3>
                        <p className="text-zinc-300 text-sm leading-relaxed whitespace-pre-line">{json.overall_status}</p>
                    </div>
                )}
                {good.length > 0 && (
                    <div>
                        <h3 className="text-sm font-semibold text-zinc-200 mb-2">What went well</h3>
                        <div className="rounded-lg border border-zinc-700/60 overflow-hidden">
                            <table className="w-full text-sm">
                                <thead className="bg-zinc-800/80 text-zinc-400 text-left">
                                    <tr><th className="p-3">Point</th></tr>
                                </thead>
                                <tbody className="text-zinc-300">
                                    {good.map((item, j) => (
                                        <tr key={j} className="border-t border-zinc-700/50">
                                            <td className="p-3">{item}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
                {bad.length > 0 && (
                    <div>
                        <h3 className="text-sm font-semibold text-zinc-200 mb-2">What went wrong</h3>
                        <ul className="space-y-2">
                            {bad.map((item, i) => (
                                <li key={i} className="flex items-start gap-2 text-sm text-zinc-400">
                                    <span className="text-red-400/80 shrink-0">•</span>
                                    <span>{item}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
                {next.length > 0 && (
                    <div>
                        <h3 className="text-sm font-semibold text-zinc-200 mb-2">Suggestions to improve</h3>
                        <ul className="space-y-2">
                            {next.map((item, i) => (
                                <li key={i} className="flex items-start gap-2 text-sm text-zinc-400">
                                    <span className="text-teal-400 font-medium shrink-0">•</span>
                                    <span>{item}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
        )
    }

    if (!overviewInsight && !issueInsight) return null

    const highlightsContent = getSection(overviewInsight, "Highlights") || getSection(overviewInsight, "Overview") || overviewInsight
    const keyActionsContent = getSection(overviewInsight, "Key actions") || getSection(overviewInsight, "Actionable")
    const focusContent = getSection(issueInsight, "Focus on") || getSection(issueInsight, "Priority") || issueInsight
    const highlights = extractBullets(highlightsContent, 5)
    const keyActions = extractBullets(keyActionsContent, 5)
    const focus = extractBullets(focusContent, 5)
    const hasAny = highlights.length > 0 || keyActions.length > 0 || focus.length > 0

    return (
        <div className="space-y-6">
            {highlights.length > 0 && (
                <div>
                    <h3 className="text-sm font-semibold text-zinc-200 mb-2">Highlights</h3>
                    <div className="rounded-lg border border-zinc-700/60 overflow-hidden">
                        <table className="w-full text-sm">
                            <thead className="bg-zinc-800/80 text-zinc-400 text-left">
                                <tr><th className="p-3">Point</th></tr>
                            </thead>
                            <tbody className="text-zinc-300">
                                {highlights.map((item, j) => (
                                    <tr key={j} className="border-t border-zinc-700/50">
                                        <td className="p-3">{item}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
            {keyActions.length > 0 && (
                <div>
                    <h3 className="text-sm font-semibold text-zinc-200 mb-2">Key actions</h3>
                    <ul className="space-y-2">
                        {keyActions.map((item, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-zinc-400">
                                <span className="text-teal-400 font-medium shrink-0">•</span>
                                <span>{item}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
            {focus.length > 0 && (
                <div>
                    <h3 className="text-sm font-semibold text-zinc-200 mb-2">Focus on</h3>
                    <ul className="space-y-2">
                        {focus.map((item, i) => (
                            <li key={i} className="flex items-center gap-2 text-sm">
                                <span className="text-zinc-300">{item}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
            {!hasAny && (
                <p className="text-zinc-500 text-sm">No overview data. Try Re-run analysis.</p>
            )}
        </div>
    )
}

function DemandTabContent({ snapshot }) {
    if (!snapshot) return null
    const { summary, demandTrends = [], restockSuggestions = [], overstockRisks = [] } = snapshot
    return (
        <div className="space-y-6">
            {summary && <p className="text-zinc-300 text-sm leading-relaxed">{summary}</p>}
            {demandTrends?.length > 0 && (
                <div>
                    <h3 className="text-sm font-semibold text-zinc-200 mb-2">Demand trends</h3>
                    <div className="rounded-lg border border-zinc-700/60 overflow-hidden">
                        <table className="w-full text-sm">
                            <thead className="bg-zinc-800/80 text-zinc-400 text-left">
                                <tr><th className="p-3">Product</th><th className="p-3">Trend</th><th className="p-3">Expected / month</th><th className="p-3">Confidence</th></tr>
                            </thead>
                            <tbody className="text-zinc-300">
                                {demandTrends.map((r, i) => (
                                    <tr key={i} className="border-t border-zinc-700/50">
                                        <td className="p-3">{r.productName ?? r.productId}</td>
                                        <td className="p-3 capitalize">{r.trend}</td>
                                        <td className="p-3">{r.expectedDemandPerMonth ?? "—"}</td>
                                        <td className="p-3 capitalize">{r.confidence ?? "—"}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
            {restockSuggestions?.length > 0 && (
                <div>
                    <h3 className="text-sm font-semibold text-zinc-200 mb-2">Restock suggestions</h3>
                    <ul className="space-y-2">
                        {restockSuggestions.map((s, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-zinc-400">
                                <span className="text-teal-400 font-medium shrink-0">{s.productName ?? s.productId}:</span>
                                <span>Qty {s.suggestedQuantity ?? "—"} — {s.reason ?? ""}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
            {overstockRisks?.length > 0 && (
                <div>
                    <h3 className="text-sm font-semibold text-zinc-200 mb-2">Overstock risks</h3>
                    <ul className="space-y-2">
                        {overstockRisks.map((r, i) => (
                            <li key={i} className="flex items-center gap-2 text-sm">
                                <span className="text-zinc-300">{r.productName ?? r.productId}</span>
                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${r.riskLevel === "high" ? "bg-red-500/20 text-red-400" : r.riskLevel === "medium" ? "bg-amber-500/20 text-amber-400" : "bg-zinc-500/20 text-zinc-400"}`}>{r.riskLevel}</span>
                                <span className="text-zinc-500">{r.reason}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
            {!summary && !demandTrends?.length && !restockSuggestions?.length && !overstockRisks?.length && <p className="text-zinc-500 text-sm">No demand data. Try Re-run analysis.</p>}
        </div>
    )
}

function SalesTabContent({ snapshot }) {
    if (!snapshot) return null
    const { summary, top_reasons = [], actionable_suggestions = [] } = snapshot
    const chartData = top_reasons.map((r) => ({ name: (r.reason || "").slice(0, 25) + (r.reason?.length > 25 ? "…" : ""), impact: r.impact === "positive" ? 1 : r.impact === "negative" ? -1 : 0, fullReason: r.reason }))
    return (
        <div className="space-y-6">
            {summary && <p className="text-zinc-300 text-sm leading-relaxed">{summary}</p>}
            {chartData.length > 0 && (
                <div>
                    <h3 className="text-sm font-semibold text-zinc-200 mb-2">Top reasons (impact)</h3>
                    <div className="h-52 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 8 }}>
                                <XAxis type="number" domain={[-1, 1]} tickFormatter={(v) => v === 1 ? "Positive" : v === -1 ? "Negative" : "Neutral"} />
                                <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} />
                                <Tooltip content={({ payload }) => payload?.[0] && <div className="bg-zinc-800 border border-zinc-600 rounded px-2 py-1 text-xs text-zinc-200">{payload[0].payload?.fullReason}</div>} />
                                <Bar dataKey="impact" radius={4}>
                                    {chartData.map((_, i) => <Cell key={i} fill={chartData[i].impact === 1 ? "#2dd4bf" : chartData[i].impact === -1 ? "#f87171" : "#71717a"} />)}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}
            {actionable_suggestions?.length > 0 && (
                <div>
                    <h3 className="text-sm font-semibold text-zinc-200 mb-2">Actionable suggestions</h3>
                    <ul className="space-y-2">
                        {actionable_suggestions.map((s, i) => (
                            <li key={i} className="flex items-center gap-2 text-sm">
                                <span className={`shrink-0 px-2 py-0.5 rounded text-xs ${s.priority === "high" ? "bg-teal-500/20 text-teal-400" : s.priority === "medium" ? "bg-amber-500/20 text-amber-400" : "bg-zinc-500/20 text-zinc-400"}`}>{s.priority}</span>
                                <span className="text-zinc-300">{s.suggestion}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
            {!summary && !top_reasons?.length && !actionable_suggestions?.length && <p className="text-zinc-500 text-sm">No sales insight. Try Re-run analysis.</p>}
        </div>
    )
}

function ReturnTabContent({ snapshot }) {
    if (!snapshot) return null
    const { summary, products = [] } = snapshot
    return (
        <div className="space-y-6">
            {summary && <p className="text-zinc-300 text-sm leading-relaxed">{summary}</p>}
            {products.length > 0 && (
                <div>
                    <h3 className="text-sm font-semibold text-zinc-200 mb-2">Risk by product</h3>
                    <div className="rounded-lg border border-zinc-700/60 overflow-hidden">
                        <table className="w-full text-sm">
                            <thead className="bg-zinc-800/80 text-zinc-400 text-left">
                                <tr><th className="p-3">Product</th><th className="p-3">Risk</th><th className="p-3">Likely causes</th></tr>
                            </thead>
                            <tbody className="text-zinc-300">
                                {products.map((p, i) => (
                                    <tr key={i} className="border-t border-zinc-700/50">
                                        <td className="p-3">{p.productName ?? p.productId}</td>
                                        <td className="p-3">
                                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${p.risk === "high" ? "bg-red-500/20 text-red-400" : p.risk === "medium" ? "bg-amber-500/20 text-amber-400" : "bg-zinc-500/20 text-zinc-400"}`}>{p.risk}</span>
                                        </td>
                                        <td className="p-3 text-zinc-400">{(p.likelyCauses || []).join(", ") || "—"}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
            {!summary && !products?.length && <p className="text-zinc-500 text-sm">No return prediction. Try Re-run analysis.</p>}
        </div>
    )
}

function CompetitorTabContent({ snapshot }) {
    if (!snapshot) return null
    const { summary, series = [], comparisons = [], productComparison = [] } = snapshot
    const firstSeries = series?.[0]
    const hasChart = firstSeries?.data?.length > 0
    return (
        <div className="space-y-6">
            {summary && <p className="text-zinc-300 text-sm leading-relaxed">{summary}</p>}
            {hasChart && (
                <div>
                    <h3 className="text-sm font-semibold text-zinc-200 mb-2">{firstSeries.name || "Series"}</h3>
                    <div className="h-52 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={firstSeries.data} margin={{ left: 8, right: 8 }}>
                                <XAxis dataKey="x" tick={{ fontSize: 11 }} />
                                <YAxis tick={{ fontSize: 11 }} />
                                <Tooltip contentStyle={{ backgroundColor: "#27272a", border: "1px solid #52525b", borderRadius: 6 }} />
                                <Bar dataKey="y" fill="#14b8a6" radius={4} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}
            {comparisons?.length > 0 && (
                <div>
                    <h3 className="text-sm font-semibold text-zinc-200 mb-2">Comparisons</h3>
                    <div className="rounded-lg border border-zinc-700/60 overflow-hidden">
                        <table className="w-full text-sm">
                            <thead className="bg-zinc-800/80 text-zinc-400 text-left">
                                <tr><th className="p-3">Metric / Label</th><th className="p-3">Vendor</th><th className="p-3">Competitor</th></tr>
                            </thead>
                            <tbody className="text-zinc-300">
                                {comparisons.map((c, i) => (
                                    <tr key={i} className="border-t border-zinc-700/50">
                                        <td className="p-3">{c.metric ?? c.label}</td>
                                        <td className="p-3">{String(c.vendorValue ?? "")}</td>
                                        <td className="p-3">{String(c.competitorValue ?? "")}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
            {productComparison?.length > 0 && (
                <div>
                    <h3 className="text-sm font-semibold text-zinc-200 mb-2">Product comparison</h3>
                    <div className="rounded-lg border border-zinc-700/60 overflow-x-auto">
                        <table className="w-full text-sm min-w-[500px]">
                            <thead className="bg-zinc-800/80 text-zinc-400 text-left">
                                <tr><th className="p-3">Product</th><th className="p-3">Category</th><th className="p-3">Vendor price</th><th className="p-3">Competitor price</th><th className="p-3">Vendor rating</th><th className="p-3">Competitor rating</th></tr>
                            </thead>
                            <tbody className="text-zinc-300">
                                {productComparison.map((p, i) => (
                                    <tr key={i} className="border-t border-zinc-700/50">
                                        <td className="p-3">{p.productName}</td>
                                        <td className="p-3">{p.category ?? "—"}</td>
                                        <td className="p-3">{p.vendorPrice ?? "—"}</td>
                                        <td className="p-3">{p.competitorPrice ?? "—"}</td>
                                        <td className="p-3">{p.vendorRating ?? "—"}</td>
                                        <td className="p-3">{p.competitorRating ?? "—"}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
            {!summary && !hasChart && !comparisons?.length && !productComparison?.length && <p className="text-zinc-500 text-sm">No competitor data. Try Re-run analysis.</p>}
        </div>
    )
}

export default function AIInsights() {
    const { getToken } = useAuth()
    const pathname = usePathname()
    const isFashion = pathname?.startsWith('/fashion')
    const storeTypeParam = isFashion ? '?type=fashion' : '?type=electronics'
    const accentText = isFashion ? 'text-[#8B6914]' : 'text-teal-400'
    const accentBorder = isFashion ? 'border-[#8B6914]' : 'border-teal-400'
    const accentBgSoft = isFashion ? 'bg-[#8B6914]/20' : 'bg-teal-500/20'
    const accentTextSoft = isFashion ? 'text-[#8B6914]' : 'text-teal-400'
    const [loading, setLoading] = useState(true)
    const [aiInsightTab, setAiInsightTab] = useState('overview')
    const [aiInsightsLoading, setAiInsightsLoading] = useState(false)
    const [overviewInsights, setOverviewInsights] = useState(null)
    const [aiSnapshots, setAiSnapshots] = useState({ demand: null, sales: null, return: null, competitor: null })
    const [aiMeta, setAiMeta] = useState({ demand: null, sales: null, return: null, competitor: null })

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
                    setAiMeta((prev) => ({ ...prev, [tabId]: { analyzedAt: data.analyzedAt, runType: data.runType } }))
                } catch (e) {
                    setAiSnapshots((prev) => ({ ...prev, [tabId]: null }))
                    setAiMeta((prev) => ({ ...prev, [tabId]: null }))
                    if (!loadError) loadError = e?.response?.data?.error || e?.message
                }
            }
            if (loadError) toast.error(loadError)
        } catch (e) {
            toast.error(e?.response?.data?.error || e?.message || "Failed to load AI insights")
        }
        setLoading(false)
    }

    const handleAIInsightRefresh = async () => {
        setAiInsightsLoading(true)
        try {
            const token = await getToken()
            const urlParam = storeTypeParam || "?type=electronics"
            if (aiInsightTab === "overview") {
                const { data } = await axios.post(`/api/store/insights${urlParam}`, {}, { headers: { Authorization: `Bearer ${token}` } })
                setOverviewInsights(data.insights || null)
            } else {
                const { data } = await axios.post(aiInsightsApiPaths[aiInsightTab] + urlParam, {}, { headers: { Authorization: `Bearer ${token}` } })
                setAiSnapshots((prev) => ({ ...prev, [aiInsightTab]: data.snapshot }))
                setAiMeta((prev) => ({ ...prev, [aiInsightTab]: { analyzedAt: data.analyzedAt, runType: data.runType } }))
            }
            toast.success("Analysis updated")
        } catch (e) {
            toast.error(e?.response?.data?.error || e?.message || "Refresh failed")
        }
        setAiInsightsLoading(false)
    }

    useEffect(() => {
        fetchAIInsights()
    }, [])

    if (loading) return <Loading />

    const currentSnapshot = aiSnapshots[aiInsightTab]
    const hasOverviewData = overviewInsights?.overviewInsight || overviewInsights?.issueInsight
    const hasAiData = aiInsightTab === "overview" ? hasOverviewData : currentSnapshot != null

    return (
        <div className="min-h-full pb-12">
            <h1 className="text-2xl sm:text-3xl font-bold text-zinc-100 mb-1">
                AI Business <span className={accentText}>Insights</span>
            </h1>
            <p className="text-sm text-zinc-500 mb-8">AI-powered analysis of your store performance</p>

            {/* AI Business Insights */}
            <section>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                    <h2 className="text-lg font-semibold text-zinc-200 flex items-center gap-2">
                        <SparklesIcon size={20} className={accentText} />
                        Insights Dashboard
                    </h2>
                    <button
                        onClick={handleAIInsightRefresh}
                        disabled={aiInsightsLoading}
                        className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-600/80 transition disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                        <RefreshCwIcon size={16} className={aiInsightsLoading ? "animate-spin" : ""} />
                        Re-run analysis
                    </button>
                </div>

                <div className="rounded-xl border border-zinc-700/60 bg-zinc-900/60 overflow-hidden">
                    <div className="flex flex-wrap gap-1 border-b border-zinc-700/60 p-2">
                        {AI_INSIGHTS_TABS.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setAiInsightTab(tab.id)}
                                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition rounded-lg ${aiInsightTab === tab.id ? `${accentText} bg-zinc-800 border ${accentBorder}` : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50"}`}
                            >
                                <tab.icon size={16} />
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    <div className="p-6 min-h-[280px]">
                        {aiInsightsLoading ? (
                            <div className="flex flex-col items-center justify-center py-16 text-zinc-500">
                                <RefreshCwIcon size={32} className="animate-spin mb-3" />
                                <p className="text-sm">Analyzing your store data...</p>
                            </div>
                        ) : hasAiData ? (
                            <>
                                {aiInsightTab === "overview" && <OverviewTabContent overviewInsight={overviewInsights?.overviewInsight} issueInsight={overviewInsights?.issueInsight} />}
                                {aiInsightTab === "demand" && <DemandTabContent snapshot={aiSnapshots.demand} />}
                                {aiInsightTab === "sales" && <SalesTabContent snapshot={aiSnapshots.sales} />}
                                {aiInsightTab === "return" && <ReturnTabContent snapshot={aiSnapshots.return} />}
                                {aiInsightTab === "competitor" && <CompetitorTabContent snapshot={aiSnapshots.competitor} />}
                            </>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-16 text-zinc-500 text-center">
                                <PackageIcon size={40} className="mb-3 opacity-60" />
                                <p className="text-sm mb-2">No snapshot for this tab yet</p>
                                <p className="text-xs mb-4 max-w-sm">Click Re-run analysis to run AI for this insight (uses latest store data).</p>
                                <button
                                    onClick={handleAIInsightRefresh}
                                    disabled={aiInsightsLoading}
                                    className={`px-4 py-2.5 text-sm font-medium rounded-lg ${accentBgSoft} ${accentTextSoft} border transition hover:bg-zinc-800/70 ${isFashion ? "border-[#8B6914]/40" : "border-teal-500/40"}`}
                                >
                                    Run analysis
                                </button>
                            </div>
                        )}
                    </div>

                    {(aiInsightTab === "overview" ? overviewInsights?.lastAnalyzedAt : aiMeta[aiInsightTab]?.analyzedAt) && (
                        <div className="px-6 pb-4 text-xs text-zinc-500">
                            Last analyzed: {new Date(aiInsightTab === "overview" ? overviewInsights.lastAnalyzedAt : aiMeta[aiInsightTab].analyzedAt).toLocaleString()}
                            {aiInsightTab !== "overview" && aiMeta[aiInsightTab]?.runType && ` (${aiMeta[aiInsightTab].runType})`}
                        </div>
                    )}
                </div>
            </section>
        </div>
    )
}
