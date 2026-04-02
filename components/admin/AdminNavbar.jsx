'use client'
import { useUser, UserButton } from "@clerk/nextjs"
import Link from "next/link"
import { usePathname, useSearchParams, useRouter } from "next/navigation"
import { useRef, useState, useEffect, useCallback } from "react"
import { TrendingUpIcon, PackageIcon, StoreIcon, UsersIcon, MessageCircle, Bell, X, ArrowRight } from "lucide-react"
import toast from "react-hot-toast"

const intelligenceTabs = [
    { id: 'revenue', label: 'Revenue Intelligence', icon: TrendingUpIcon },
    { id: 'orders', label: 'Order Intelligence', icon: PackageIcon },
    { id: 'vendors', label: 'Vendor Intelligence', icon: StoreIcon },
    { id: 'users', label: 'User Intelligence', icon: UsersIcon },
]

const AdminNavbar = () => {

    const { user } = useUser()
    const pathname = usePathname()
    const searchParams = useSearchParams()
    const isDashboard = pathname === '/admin'
    const activeTab = searchParams.get('tab') || 'revenue'

    const router = useRouter()
    const [noticesOpen, setNoticesOpen] = useState(false)
    const [notices, setNotices] = useState([])
    const [totalCount, setTotalCount] = useState(0)
    const [noticesLoading, setNoticesLoading] = useState(false)
    const [selectedNotice, setSelectedNotice] = useState(null)
    const noticesRef = useRef(null)

    const [sendingNoticeFor, setSendingNoticeFor] = useState(null)
    const [noticeText, setNoticeText] = useState('')
    const [isSendingNotice, setIsSendingNotice] = useState(false)

    const SEVERITY_ORDER = { critical: 0, warning: 1, info: 2 }
    const SEVERITY_STYLES = {
        critical: 'border-l-2 border-rose-500 bg-rose-500/5',
        warning: 'border-l-2 border-amber-500 bg-amber-500/5',
        info: 'border-l-2 border-zinc-600',
    }

    const fetchNotices = useCallback(async (fullLoad = false) => {
        if (fullLoad) setNoticesLoading(true)
        try {
            const res = await fetch('/api/admin/notices')
            if (res.ok) {
                const data = await res.json()
                setNotices((data.notices || []).sort(
                    (a, b) => (SEVERITY_ORDER[a.severity] ?? 2) - (SEVERITY_ORDER[b.severity] ?? 2)
                ))
                setTotalCount(data.totalCount ?? 0)
            } else {
                setNotices([])
                setTotalCount(0)
            }
        } catch {
            setNotices([])
            setTotalCount(0)
        } finally {
            if (fullLoad) setNoticesLoading(false)
        }
    }, [])

    const openNoticeForm = (vendorId, noticeType, item) => {
        let defaultText = ""
        switch (noticeType) {
            case "high_risk_vendors": {
                const reasons = Array.isArray(item.reasons) ? item.reasons : []
                const reasonList = reasons.length > 0 ? reasons.join(", ") : (item.sublabel || "").replace(/^Risk \d+ — /, "")
                defaultText = `OFFICIAL NOTICE: Your store has been flagged for elevated risk (score: ${item.riskScore ?? "—"}). Issues detected: ${reasonList}. Please address these to avoid suspension.`
                break
            }
            case "inactive_vendors":
                defaultText = `OFFICIAL NOTICE: Your store has been flagged as inactive. ${item.sublabel || "No recent activity detected."} Please update your catalog or fulfill any pending requests to keep your seller account active.`
                break
            case "pending_order_actions": {
                const count = item.pendingCount ?? 0
                const oldest = item.oldestWaitStr ?? ""
                const reqType = item.requestType === "cancel" ? "cancellation" : "return"
                defaultText = `OFFICIAL NOTICE: You have ${count} order(s) awaiting your action (oldest: ${oldest}, ${reqType} request). Please approve or reject cancel/return requests immediately.`
                break
            }
            case "suspicious_products":
                defaultText = `OFFICIAL NOTICE: A product listed on your store (${item.productName ?? item.label}) has been flagged for suspicious pricing: ${item.sublabel || "Please review and correct the listing."}`
                break
            default:
                defaultText = "OFFICIAL NOTICE: Please review your recent store activity for compliance."
        }
        setNoticeText(defaultText)
        setSendingNoticeFor(vendorId)
    }

    const handleSendNotice = async (vendorId, text) => {
        if (!text.trim()) return
        setIsSendingNotice(true)
        try {
            const convRes = await fetch('/api/conversations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ vendorId })
            })
            if (!convRes.ok) {
                const err = await convRes.json().catch(() => ({}))
                throw new Error(err.error || "Failed to get conversation")
            }
            const conv = await convRes.json()

            const msgRes = await fetch('/api/messages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    conversationId: conv.id,
                    senderId: user.id,
                    senderRole: 'admin',
                    content: text,
                    messageType: 'warning',
                    type: 'admin_vendor'
                })
            })
            if (!msgRes.ok) {
                const err = await msgRes.json().catch(() => ({}))
                throw new Error("API: " + (err.error || "Failed to send message"))
            }

            toast.success("Warning sent to vendor")
            setSendingNoticeFor(null)
        } catch (err) {
            toast.error(err.message || 'Failed to send')
        } finally {
            setIsSendingNotice(false)
        }
    }

    const handleProductAction = async (productId, action) => {
        try {
            const res = await fetch('/api/admin/product/status', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ productId, action })
            })
            if (!res.ok) {
                const err = await res.json().catch(() => ({}))
                throw new Error(err.error || "Failed to update product")
            }
            toast.success(action === 'keep' ? 'Suspicion cleared' : 'Product disabled')
            fetchNotices(false)
            if (selectedNotice?.type === 'suspicious_products') {
                setSelectedNotice((prev) => {
                    const filteredItems = prev.items.filter(item => item.productId !== productId)
                    return { ...prev, items: filteredItems, count: filteredItems.length }
                })
            }
        } catch (error) {
            console.error(error)
            toast.error(error.message || `Failed to ${action} product`)
        }
    }

    const NOTICE_LINK_LABELS = {
        pending_approval: 'Approve Stores',
        reports_fake: 'Reports',
        inactive_vendors: 'Vendor Intelligence',
        high_risk_vendors: 'Vendor Intelligence',
        pending_order_actions: 'Stores',
        suspicious_products: 'Reports',
        unread_messages: 'Messages',
    }

    const markItemViewed = async (noticeType, itemId) => {
        try {
            await fetch('/api/admin/notices', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ noticeType, itemId })
            })
            // Optimistically update local state
            if (selectedNotice && selectedNotice.type === noticeType) {
                setSelectedNotice((prev) => ({
                    ...prev,
                    items: prev.items.map((it) =>
                        it.itemId === itemId ? { ...it, viewed: true } : it
                    ),
                    count: Math.max(0, prev.count - 1)
                }))
            }
            setNotices((prev) => prev.map((n) =>
                n.type === noticeType
                    ? {
                        ...n,
                        items: n.items?.map((it) => it.itemId === itemId ? { ...it, viewed: true } : it),
                        count: Math.max(0, n.count - 1)
                    }
                    : n
            ))
            setTotalCount((prev) => Math.max(0, prev - 1))
        } catch (error) {
            console.error('Failed to mark item viewed:', error)
        }
    }

    const markAllViewed = async () => {
        const notice = selectedNotice
        if (!notice?.items?.length) return
        const itemIds = notice.items.map((i) => i.itemId).filter((id) => id != null && String(id).trim() !== '')
        if (itemIds.length === 0) return
        try {
            await fetch('/api/admin/notices', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ noticeType: notice.type, itemIds })
            })
            setSelectedNotice((prev) => prev ? { ...prev, items: prev.items.map((i) => ({ ...i, viewed: true })), count: 0 } : null)
            setNotices((prev) => prev.map((n) => n.type === notice.type ? { ...n, items: n.items?.map((i) => ({ ...i, viewed: true })) ?? [], count: 0 } : n))
            setTotalCount((prev) => Math.max(0, prev - notice.count))
        } catch (error) {
            console.error('Failed to mark all viewed:', error)
            toast.error('Failed to mark all as viewed')
        }
    }

    // Real-time: fetch on mount, poll every 15s, refetch when tab becomes visible or user navigates
    useEffect(() => {
        fetchNotices(false)
        const interval = setInterval(() => fetchNotices(false), 15_000)
        return () => clearInterval(interval)
    }, [fetchNotices])

    // Refetch when user returns to this tab (real-time feel)
    useEffect(() => {
        const onVisibilityChange = () => {
            if (document.visibilityState === "visible") fetchNotices(false)
        }
        document.addEventListener("visibilitychange", onVisibilityChange)
        return () => document.removeEventListener("visibilitychange", onVisibilityChange)
    }, [fetchNotices])

    // Refetch when navigating within admin so each page sees current notices
    useEffect(() => {
        fetchNotices(false)
    }, [pathname, fetchNotices])

    // Full load when dropdown opens
    useEffect(() => {
        if (noticesOpen) fetchNotices(true)
    }, [noticesOpen, fetchNotices])

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (noticesRef.current && !noticesRef.current.contains(e.target)) {
                setNoticesOpen(false)
            }
        }
        if (noticesOpen) {
            document.addEventListener('mousedown', handleClickOutside)
            return () => document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [noticesOpen])

    return (
        <div className="flex items-center justify-between px-3 sm:px-4 py-2.5 gap-2 bg-[#0a0a0b]">
            {/* Left: Logo Card — compact */}
            <div className="flex items-center gap-2 flex-shrink-0 bg-zinc-900/50 border border-zinc-800/60 py-1.5 px-3 rounded-xl">
                <Link href="/admin" className="relative text-xl sm:text-2xl font-bold text-zinc-200">
                    <span className="text-amber-400">go</span>cart<span className="text-amber-400 text-2xl sm:text-3xl leading-0">.</span>
                    <p className="absolute text-[9px] font-bold -top-0.5 -right-10 px-1.5 py-0.5 rounded-full flex items-center text-zinc-900 bg-amber-400 shadow-md shadow-amber-500/20">
                        ADMIN
                    </p>
                </Link>
            </div>

            {/* Center: Intelligence Tabs — full labels visible, scroll on narrow */}
            {isDashboard && (
                <div className="flex flex-1 min-w-0 justify-center mx-2">
                    <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1.5 px-2 bg-zinc-900/50 border border-zinc-800/60 rounded-xl max-w-full">
                        {intelligenceTabs.map((tab) => (
                            <Link
                                key={tab.id}
                                href={`/admin?tab=${tab.id}`}
                                className={`flex items-center gap-2 flex-shrink-0 px-4 py-2 text-xs font-semibold whitespace-nowrap rounded-lg transition-all duration-300 ${activeTab === tab.id
                                    ? 'text-zinc-900 bg-amber-400 shadow-md shadow-amber-500/25 scale-[1.02]'
                                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                                    }`}
                            >
                                <tab.icon size={14} className="flex-shrink-0" />
                                <span>{tab.label}</span>
                            </Link>
                        ))}
                    </div>
                </div>
            )}

            {/* Right: Messages, Notices, Home, Profile — compact */}
            <div className="flex items-center gap-2 text-zinc-300 flex-shrink-0 bg-zinc-900/50 border border-zinc-800/60 py-1.5 pl-2 pr-2 rounded-xl">
                <Link href="/admin/messages" className="p-2 rounded-lg text-zinc-400 hover:text-amber-400 hover:bg-zinc-800/80 transition" title="Messages" aria-label="Messages">
                    <MessageCircle size={18} />
                </Link>
                <div className="relative" ref={noticesRef}>
                    <button
                        type="button"
                        onClick={() => setNoticesOpen((v) => !v)}
                        className="relative p-2 rounded-lg text-zinc-400 hover:text-amber-400 hover:bg-zinc-800/80 transition"
                        title="Notices"
                        aria-label="Notices"
                        aria-expanded={noticesOpen}
                    >
                        <Bell size={18} />
                        {totalCount > 0 && (
                            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center text-[10px] font-bold text-zinc-900 bg-amber-400 rounded-full">
                                {totalCount > 99 ? '99+' : totalCount}
                            </span>
                        )}
                    </button>
                    {noticesOpen && (
                        <div className="absolute right-0 top-full mt-1.5 w-80 max-h-[70vh] overflow-y-auto rounded-xl border border-zinc-700/60 bg-zinc-900 shadow-xl z-50">
                            <div className="p-2 border-b border-zinc-700/60">
                                <h3 className="text-sm font-semibold text-zinc-200">Notices</h3>
                            </div>
                            <div className="p-2">
                                {noticesLoading ? (
                                    <p className="text-xs text-zinc-500 py-4 text-center">Loading…</p>
                                ) : notices.filter((n) => n.count > 0).length === 0 ? (
                                    <p className="text-xs text-zinc-500 py-4 text-center">No notices. You&apos;re all caught up.</p>
                                ) : (
                                    <ul className="space-y-1">
                                        {notices.filter((n) => n.count > 0).map((n) => (
                                            <li key={n.id}>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        if (n.count === 0) return
                                                        setSelectedNotice(n)
                                                        setNoticesOpen(false)
                                                    }}
                                                    className={`block w-full px-3 py-2 rounded-lg text-left text-sm text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 transition ${SEVERITY_STYLES[n.severity] || ''}`}
                                                >
                                                    <div className="flex items-center justify-between gap-2">
                                                        <span className={`truncate ${n.count > 0 ? 'font-semibold' : 'font-normal'}`}>{n.title}</span>
                                                        {n.count > 0 && (
                                                            <span className={`text-xs font-bold shrink-0 px-1.5 py-0.5 rounded-full ${n.severity === 'critical' ? 'bg-rose-500/20 text-rose-400' : n.severity === 'warning' ? 'bg-amber-500/20 text-amber-400' : 'bg-zinc-700 text-zinc-400'}`}>{n.count}</span>
                                                        )}
                                                    </div>
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        </div>
                    )}
                </div>
                <div className="h-6 w-px bg-zinc-700 mx-0.5" />
                <Link
                    href="/"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-zinc-900 bg-emerald-400 hover:bg-emerald-300 rounded-lg transition shadow-md shadow-emerald-500/20"
                >
                    Home
                </Link>
                <div className="h-6 w-px bg-zinc-700 mx-0.5" />
                <div className="flex items-center gap-2">
                    <p className="text-xs font-medium hidden sm:block">{user?.firstName}</p>
                    <UserButton />
                </div>
            </div>

            {/* Notice detail panel (slide-over) */}
            {selectedNotice && (
                <>
                    <div
                        className="fixed inset-0 bg-black/50 z-[100]"
                        aria-hidden
                        onClick={() => setSelectedNotice(null)}
                    />
                    <div
                        className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-zinc-900 border-l border-zinc-700/60 shadow-xl z-[101] flex flex-col"
                        role="dialog"
                        aria-labelledby="notice-panel-title"
                    >
                        <div className={`flex items-center justify-between gap-3 p-4 border-b border-zinc-700/60 ${SEVERITY_STYLES[selectedNotice.severity] || ''}`}>
                            <h2 id="notice-panel-title" className="text-base font-semibold text-zinc-100 truncate min-w-0">
                                {selectedNotice.title}
                            </h2>
                            <div className="flex items-center gap-2 shrink-0">
                                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${selectedNotice.severity === 'critical' ? 'bg-rose-500/20 text-rose-400' : selectedNotice.severity === 'warning' ? 'bg-amber-500/20 text-amber-400' : 'bg-zinc-700 text-zinc-400'}`}>
                                    {selectedNotice.count}
                                </span>
                                {selectedNotice.count > 0 && (
                                    <button
                                        type="button"
                                        onClick={markAllViewed}
                                        className="text-xs font-medium text-zinc-400 hover:text-zinc-200 transition"
                                    >
                                        Mark all seen
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={() => setSelectedNotice(null)}
                                    className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition"
                                    aria-label="Close panel"
                                >
                                    <X size={18} />
                                </button>
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4">
                            {selectedNotice.description && (
                                <p className="text-sm text-zinc-500 mb-4">{selectedNotice.description}</p>
                            )}
                            {selectedNotice.items?.length > 0 ? (
                                <ul className="space-y-3">
                                    {selectedNotice.items.map((item, i) => (
                                        <li key={item.productId || item.storeId || item.itemId || i} className="text-sm">
                                            {item.link ? (
                                                <div className={`flex items-start justify-between rounded-lg hover:bg-zinc-800/80 -mx-2 px-2 transition ${item.viewed ? 'opacity-90' : ''}`}>
                                                    <Link
                                                        href={item.link}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="block py-1 flex-1 min-w-0"
                                                        onClick={() => item.itemId && !item.viewed && markItemViewed(selectedNotice.type, item.itemId)}
                                                    >
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <span className={`block ${item.viewed ? 'font-normal text-zinc-500' : 'font-medium text-zinc-200'}`}>{item.label}</span>
                                                            {item.viewed && (
                                                                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-zinc-600/80 text-zinc-400 shrink-0">Seen</span>
                                                            )}
                                                        </div>
                                                        {item.sublabel && (
                                                            <span className="text-zinc-500 text-xs block mt-0.5">{item.sublabel}</span>
                                                        )}
                                                        <span className="text-xs text-amber-400 mt-0.5 inline-block">View product →</span>
                                                    </Link>

                                                    {selectedNotice.type === 'suspicious_products' && item.productId && (
                                                        <div className="flex flex-col gap-1 py-1 shrink-0 ml-2">
                                                            <button
                                                                onClick={(e) => { e.preventDefault(); handleProductAction(item.productId, 'keep'); }}
                                                                className="text-[10px] font-medium bg-zinc-700 hover:bg-zinc-600 text-zinc-200 px-2 py-0.5 rounded transition"
                                                            >
                                                                Keep
                                                            </button>
                                                            <button
                                                                onClick={(e) => { e.preventDefault(); handleProductAction(item.productId, 'disable'); }}
                                                                className="text-[10px] font-medium bg-rose-500/20 hover:bg-rose-500/40 text-rose-400 px-2 py-0.5 rounded transition"
                                                            >
                                                                Disable
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <div
                                                    className={`py-1 -mx-2 px-2 rounded-lg hover:bg-zinc-800/80 transition cursor-pointer ${item.viewed ? 'opacity-90' : ''}`}
                                                    role="button"
                                                    tabIndex={0}
                                                    onClick={() => item.itemId && !item.viewed && markItemViewed(selectedNotice.type, item.itemId)}
                                                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); item.itemId && !item.viewed && markItemViewed(selectedNotice.type, item.itemId); } }}
                                                >
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <span className={`block ${item.viewed ? 'font-normal text-zinc-500' : 'font-medium text-zinc-200'}`}>{item.label}</span>
                                                        {item.viewed && (
                                                            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-zinc-600/80 text-zinc-400 shrink-0">Seen</span>
                                                        )}
                                                    </div>
                                                    {item.sublabel && (
                                                        <span className="text-zinc-500 text-xs block mt-0.5">{item.sublabel}</span>
                                                    )}
                                                </div>
                                            )}
                                            {item.vendorId && (
                                                <div className="mt-2">
                                                    {sendingNoticeFor === item.vendorId ? (
                                                        <div className="bg-zinc-800 rounded-lg p-2 border border-zinc-700">
                                                            <textarea
                                                                className="w-full bg-zinc-900 border border-zinc-700 rounded p-2 text-xs text-zinc-200 outline-none resize-none"
                                                                rows={3}
                                                                value={noticeText}
                                                                onChange={(e) => setNoticeText(e.target.value)}
                                                            />
                                                            <div className="flex items-center gap-2 mt-2 justify-end">
                                                                <button type="button" disabled={isSendingNotice} onClick={() => setSendingNoticeFor(null)} className="text-xs text-zinc-500 hover:text-zinc-300">Cancel</button>
                                                                <button
                                                                    type="button"
                                                                    disabled={isSendingNotice}
                                                                    onClick={() => handleSendNotice(item.vendorId, noticeText)}
                                                                    className="px-3 py-1 bg-amber-500 text-zinc-900 font-medium text-xs rounded hover:bg-amber-400 disabled:opacity-50"
                                                                >
                                                                    {isSendingNotice ? 'Sending...' : 'Send Warning'}
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <button
                                                            type="button"
                                                            onClick={() => openNoticeForm(item.vendorId, selectedNotice.type, item)}
                                                            className="text-[11px] font-semibold text-amber-500 hover:text-amber-400 flex items-center gap-1 mt-1 transition"
                                                        >
                                                            <MessageCircle size={12} /> Send Warning
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-sm text-zinc-500 py-4 text-center">No items to show.</p>
                            )}
                        </div>
                        <div className="p-4 border-t border-zinc-700/60">
                            <button
                                type="button"
                                onClick={() => {
                                    router.push(selectedNotice.link)
                                    setSelectedNotice(null)
                                }}
                                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-zinc-900 bg-amber-400 hover:bg-amber-300 rounded-xl transition"
                            >
                                Go to {NOTICE_LINK_LABELS[selectedNotice.type] ?? 'Dashboard'}
                                <ArrowRight size={16} />
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    )
}

export default AdminNavbar