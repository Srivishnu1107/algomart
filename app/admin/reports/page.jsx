'use client'

import Loading from "@/components/Loading"
import { useAuth } from "@clerk/nextjs"
import axios from "axios"
import Image from "next/image"
import Link from "next/link"
import { useEffect, useState, useMemo } from "react"
import toast from "react-hot-toast"
import { Flag, BarChart3, Users, X, RefreshCw, ChevronDown } from "lucide-react"

const REASON_LABELS = {
    inappropriate: "Inappropriate content",
    fake: "Fake or counterfeit",
    wrong_info: "Wrong or misleading information",
    copyright: "Copyright or trademark",
    spam: "Spam",
    other: "Other",
}

const SORT_OPTIONS = [
    { value: "reports_desc", label: "Most reports first" },
    { value: "reports_asc", label: "Fewest reports first" },
    { value: "price_asc", label: "Price: low to high" },
    { value: "price_desc", label: "Price: high to low" },
    { value: "name_asc", label: "Name: A–Z" },
    { value: "name_desc", label: "Name: Z–A" },
    { value: "latest", label: "Latest uploaded first" },
    { value: "oldest", label: "Oldest uploaded first" },
]

export default function AdminReports() {
    const { getToken } = useAuth()
    const [reports, setReports] = useState([])
    const [aiGroups, setAiGroups] = useState([])
    const [analyzedAt, setAnalyzedAt] = useState(null)
    const [loading, setLoading] = useState(true)
    const [aiLoading, setAiLoading] = useState(true)
    const [reAnalyzing, setReAnalyzing] = useState(false)
    const [activeSection, setActiveSection] = useState("ai")
    const [reasonModal, setReasonModal] = useState(null)
    const [aiStoreTypeFilter, setAiStoreTypeFilter] = useState("all") // all | electronics | fashion
    const [aiSort, setAiSort] = useState("reports_desc")
    const [electronicsCategoryFilter, setElectronicsCategoryFilter] = useState("")
    const [fashionCategoryFilter, setFashionCategoryFilter] = useState("")

    const fetchReports = async () => {
        try {
            const token = await getToken()
            const { data } = await axios.get("/api/admin/reports", {
                headers: { Authorization: `Bearer ${token}` },
            })
            setReports(data.reports || [])
        } catch (error) {
            toast.error(error?.response?.data?.error || error.message)
        } finally {
            setLoading(false)
        }
    }

    const fetchAiOverview = async () => {
        setAiLoading(true)
        try {
            const token = await getToken()
            const { data } = await axios.get(
                `/api/admin/reports/ai-overview?storeType=${aiStoreTypeFilter}`,
                { headers: { Authorization: `Bearer ${token}` } }
            )
            setAiGroups(data.groups || [])
            setAnalyzedAt(data.analyzedAt || null)
        } catch (error) {
            toast.error(error?.response?.data?.error || error.message)
        } finally {
            setAiLoading(false)
        }
    }

    const reAnalyze = async () => {
        setReAnalyzing(true)
        try {
            const token = await getToken()
            const { data } = await axios.post("/api/admin/reports/ai-overview", {}, {
                headers: { Authorization: `Bearer ${token}` },
            })
            setAiGroups(data.groups || [])
            setAnalyzedAt(data.analyzedAt || null)
            toast.success(data.message || "Overview updated.")
        } catch (error) {
            toast.error(error?.response?.data?.error || error.message)
        } finally {
            setReAnalyzing(false)
        }
    }

    useEffect(() => {
        fetchReports()
    }, [])

    useEffect(() => {
        if (reports.length === 0) {
            setAiLoading(false)
            return
        }
        fetchAiOverview()
    }, [reports.length])

    useEffect(() => {
        if (activeSection === "ai" && reports.length > 0) {
            fetchAiOverview()
        }
    }, [aiStoreTypeFilter])

    const productUrl = (productId, storeType) =>
        storeType === "fashion" ? `/fashion/product/${productId}` : `/product/${productId}`

    const electronicsReports = reports.filter((r) => r.storeType === "electronics")
    const fashionReports = reports.filter((r) => r.storeType === "fashion")

    const electronicsCategories = useMemo(() => {
        const set = new Set(electronicsReports.map((r) => r.productCategory).filter(Boolean))
        return Array.from(set).sort()
    }, [electronicsReports])
    const fashionCategories = useMemo(() => {
        const set = new Set(fashionReports.map((r) => r.productCategory).filter(Boolean))
        return Array.from(set).sort()
    }, [fashionReports])

    const filteredElectronics = useMemo(() => {
        if (!electronicsCategoryFilter) return electronicsReports
        return electronicsReports.filter((r) => r.productCategory === electronicsCategoryFilter)
    }, [electronicsReports, electronicsCategoryFilter])
    const filteredFashion = useMemo(() => {
        if (!fashionCategoryFilter) return fashionReports
        return fashionReports.filter((r) => r.productCategory === fashionCategoryFilter)
    }, [fashionReports, fashionCategoryFilter])

    const sortedAiGroups = useMemo(() => {
        const list = [...aiGroups]
        switch (aiSort) {
            case "reports_desc":
                return list.sort((a, b) => (b.totalCount ?? 0) - (a.totalCount ?? 0))
            case "reports_asc":
                return list.sort((a, b) => (a.totalCount ?? 0) - (b.totalCount ?? 0))
            case "price_asc":
                return list.sort((a, b) => (a.price ?? 0) - (b.price ?? 0))
            case "price_desc":
                return list.sort((a, b) => (b.price ?? 0) - (a.price ?? 0))
            case "name_asc":
                return list.sort((a, b) => (a.representativeName ?? "").localeCompare(b.representativeName ?? ""))
            case "name_desc":
                return list.sort((a, b) => (b.representativeName ?? "").localeCompare(a.representativeName ?? ""))
            case "latest":
                return list.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
            case "oldest":
                return list.sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0))
            default:
                return list
        }
    }, [aiGroups, aiSort])

    if (loading) return <Loading />

    return (
        <div className="min-h-screen bg-[#0a0a0b]">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
                <h1 className="text-2xl sm:text-3xl font-bold text-zinc-100 mb-1">Product <span className="text-emerald-400">Reports</span></h1>
                <p className="text-sm text-zinc-500 mb-8">AI overview and user-submitted reports.</p>

                <div className="flex gap-2 mb-8 border-b border-zinc-700/60 pb-2">
                    <button
                        type="button"
                        onClick={() => setActiveSection("ai")}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition ${activeSection === "ai" ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40" : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60"}`}
                    >
                        <BarChart3 size={18} />
                        AI Reports Overview
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveSection("user")}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition ${activeSection === "user" ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40" : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60"}`}
                    >
                        <Users size={18} />
                        User Reports
                    </button>
                </div>

                {activeSection === "ai" && (
                    <section className="mb-12">
                        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                            <h2 className="text-lg font-semibold text-zinc-200 flex items-center gap-2">
                                <BarChart3 size={20} className="text-emerald-400" />
                                AI Reports Overview
                            </h2>
                            <div className="flex flex-wrap items-center gap-3">
                                <select
                                    value={aiStoreTypeFilter}
                                    onChange={(e) => setAiStoreTypeFilter(e.target.value)}
                                    className="rounded-lg border border-zinc-600 bg-zinc-800/80 text-zinc-200 text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                                >
                                    <option value="all">All (Electronics + Fashion)</option>
                                    <option value="electronics">Electronics</option>
                                    <option value="fashion">Fashion</option>
                                </select>
                                <select
                                    value={aiSort}
                                    onChange={(e) => setAiSort(e.target.value)}
                                    className="rounded-lg border border-zinc-600 bg-zinc-800/80 text-zinc-200 text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                                >
                                    {SORT_OPTIONS.map((opt) => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                </select>
                                <button
                                    type="button"
                                    onClick={reAnalyze}
                                    disabled={reAnalyzing || reports.length === 0}
                                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 hover:bg-emerald-500/30 text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <RefreshCw size={16} className={reAnalyzing ? "animate-spin" : ""} />
                                    Re-analyze
                                </button>
                            </div>
                        </div>
                        {analyzedAt && (
                            <p className="text-xs text-zinc-500 mb-3">Last analyzed: {new Date(analyzedAt).toLocaleString()}</p>
                        )}
                        {aiLoading ? (
                            <div className="rounded-xl border border-zinc-700/60 bg-zinc-900/60 p-12 text-center text-zinc-500">
                                Loading overview…
                            </div>
                        ) : sortedAiGroups.length > 0 ? (
                            <div className="rounded-xl border border-zinc-700/60 bg-zinc-900/60 overflow-hidden">
                                <table className="w-full text-sm">
                                    <thead className="bg-zinc-800/80 text-zinc-400 text-left">
                                        <tr>
                                            <th className="py-3 px-4 font-medium">Product</th>
                                            <th className="py-3 px-4 font-medium text-center">Reports</th>
                                            <th className="py-3 px-4 font-medium">Reason</th>
                                            <th className="py-3 px-4 font-medium">Price</th>
                                            <th className="py-3 px-4 font-medium max-w-[200px]">By store</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-zinc-300 divide-y divide-zinc-700/60">
                                        {sortedAiGroups.map((g, i) => {
                                            const url = g.representativeProductId
                                                ? productUrl(g.representativeProductId, g.representativeStoreType || "electronics")
                                                : null
                                            const currency = process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || "₹"
                                            return (
                                                <tr key={i} className="hover:bg-zinc-800/40">
                                                    <td className="py-3 px-4 font-medium text-zinc-100">
                                                        {url ? (
                                                            <Link href={url} className="text-emerald-400 hover:text-emerald-300 hover:underline">
                                                                {g.representativeName ?? "—"}
                                                            </Link>
                                                        ) : (
                                                            g.representativeName ?? "—"
                                                        )}
                                                    </td>
                                                    <td className="py-3 px-4 text-center">
                                                        <span className="inline-flex items-center justify-center min-w-[2.5rem] py-1 px-2 rounded-lg bg-amber-500/20 text-amber-400 font-semibold">
                                                            {g.totalCount ?? 0}
                                                        </span>
                                                    </td>
                                                    <td className="py-3 px-4 text-zinc-300">{g.shortReason ?? "—"}</td>
                                                    <td className="py-3 px-4 text-zinc-400">
                                                        {g.price != null ? `${currency}${Number(g.price).toLocaleString()}` : "—"}
                                                    </td>
                                                    <td className="py-3 px-4 text-zinc-500 text-xs max-w-[200px] truncate">
                                                        {Array.isArray(g.storeBreakdown) && g.storeBreakdown.length > 0
                                                            ? g.storeBreakdown.map((s) => `${s.storeName}: ${s.count}`).join(" · ")
                                                            : "—"}
                                                    </td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="rounded-xl border border-zinc-700/60 bg-zinc-900/60 p-12 text-center text-zinc-500">
                                No reports to analyze. User reports will appear here once available.
                            </div>
                        )}
                    </section>
                )}

                {activeSection === "user" && (
                    <section>
                        <h2 className="text-lg font-semibold text-zinc-200 mb-4 flex items-center gap-2">
                            <Users size={20} className="text-emerald-400" />
                            User Reports
                        </h2>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            {/* Electronics - side by side */}
                            <div>
                                <div className="flex items-center justify-between gap-3 mb-3">
                                    <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                                        <ChevronDown size={16} />
                                        Electronics
                                    </h3>
                                    <select
                                        value={electronicsCategoryFilter}
                                        onChange={(e) => setElectronicsCategoryFilter(e.target.value)}
                                        className="rounded-lg border border-zinc-600 bg-zinc-800/80 text-zinc-200 text-xs px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                                    >
                                        <option value="">All categories</option>
                                        {electronicsCategories.map((c) => (
                                            <option key={c} value={c}>{c}</option>
                                        ))}
                                    </select>
                                </div>
                                {filteredElectronics.length > 0 ? (
                                    <div className="rounded-xl border border-zinc-700/60 bg-zinc-900/60 overflow-hidden">
                                        <div className="divide-y divide-zinc-700/60 max-h-[480px] overflow-y-auto">
                                            {filteredElectronics.map((r) => (
                                                <div key={r.id} className="flex items-center gap-4 p-4 hover:bg-zinc-800/40 transition">
                                                    <Link href={productUrl(r.productId, r.storeType)} className="flex items-center gap-4 min-w-0 flex-1">
                                                        <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-zinc-800 overflow-hidden flex items-center justify-center">
                                                            {r.productImages?.[0] ? (
                                                                <Image src={r.productImages[0]} alt="" width={48} height={48} className="w-full h-full object-contain" />
                                                            ) : (
                                                                <span className="text-zinc-500 text-xs">No image</span>
                                                            )}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="font-medium text-zinc-100 truncate">{r.productName || "—"}</p>
                                                            <p className="text-xs text-zinc-500">{r.storeName}</p>
                                                        </div>
                                                    </Link>
                                                    <button
                                                        type="button"
                                                        onClick={() => setReasonModal({ reasonType: r.reasonType, customReason: r.customReason })}
                                                        className="flex-shrink-0 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-zinc-100 text-sm font-medium border border-zinc-600 transition"
                                                    >
                                                        Reason
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-zinc-500 text-sm py-4">No electronics reports.</p>
                                )}
                            </div>

                            {/* Fashion */}
                            <div>
                                <div className="flex items-center justify-between gap-3 mb-3">
                                    <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                                        <ChevronDown size={16} />
                                        Fashion
                                    </h3>
                                    <select
                                        value={fashionCategoryFilter}
                                        onChange={(e) => setFashionCategoryFilter(e.target.value)}
                                        className="rounded-lg border border-zinc-600 bg-zinc-800/80 text-zinc-200 text-xs px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                                    >
                                        <option value="">All categories</option>
                                        {fashionCategories.map((c) => (
                                            <option key={c} value={c}>{c}</option>
                                        ))}
                                    </select>
                                </div>
                                {filteredFashion.length > 0 ? (
                                    <div className="rounded-xl border border-zinc-700/60 bg-zinc-900/60 overflow-hidden">
                                        <div className="divide-y divide-zinc-700/60 max-h-[480px] overflow-y-auto">
                                            {filteredFashion.map((r) => (
                                                <div key={r.id} className="flex items-center gap-4 p-4 hover:bg-zinc-800/40 transition">
                                                    <Link href={productUrl(r.productId, r.storeType)} className="flex items-center gap-4 min-w-0 flex-1">
                                                        <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-zinc-800 overflow-hidden flex items-center justify-center">
                                                            {r.productImages?.[0] ? (
                                                                <Image src={r.productImages[0]} alt="" width={48} height={48} className="w-full h-full object-contain" />
                                                            ) : (
                                                                <span className="text-zinc-500 text-xs">No image</span>
                                                            )}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="font-medium text-zinc-100 truncate">{r.productName || "—"}</p>
                                                            <p className="text-xs text-zinc-500">{r.storeName}</p>
                                                        </div>
                                                    </Link>
                                                    <button
                                                        type="button"
                                                        onClick={() => setReasonModal({ reasonType: r.reasonType, customReason: r.customReason })}
                                                        className="flex-shrink-0 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-zinc-100 text-sm font-medium border border-zinc-600 transition"
                                                    >
                                                        Reason
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-zinc-500 text-sm py-4">No fashion reports.</p>
                                )}
                            </div>
                        </div>

                        {reports.length === 0 && (
                            <div className="rounded-xl border border-zinc-700/60 bg-zinc-900/70 p-12 text-center mt-6">
                                <Flag className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
                                <p className="text-zinc-500">No user reports yet</p>
                                <p className="text-zinc-600 text-sm mt-1">Reports will appear here when users submit them.</p>
                            </div>
                        )}
                    </section>
                )}
            </div>

            {reasonModal && (
                <>
                    <div className="fixed inset-0 bg-black/60 z-40" aria-hidden onClick={() => setReasonModal(null)} />
                    <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md rounded-xl border border-zinc-700 bg-zinc-900 shadow-xl z-50 p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-zinc-100">Report reason</h3>
                            <button type="button" onClick={() => setReasonModal(null)} className="p-2 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition" aria-label="Close">
                                <X size={20} />
                            </button>
                        </div>
                        <p className="font-medium text-zinc-200">{REASON_LABELS[reasonModal.reasonType] || reasonModal.reasonType}</p>
                        {reasonModal.customReason && <p className="mt-3 text-sm text-zinc-400 whitespace-pre-wrap">{reasonModal.customReason}</p>}
                    </div>
                </>
            )}
        </div>
    )
}
