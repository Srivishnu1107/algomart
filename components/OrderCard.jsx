'use client'
import Image from "next/image";
import Link from "next/link";
import { useSelector } from "react-redux";
import { useRouter } from "next/navigation";
import Rating from "./Rating";
import { useState, useRef, useEffect } from "react";
import RatingModal from "./RatingModal";
import {
    ChevronDown, ChevronUp, MapPin, Package, Truck, CheckCircle2,
    XCircle, Clock, MoreVertical, Flag, MessageSquare, HelpCircle,
    AlertTriangle, Copy, Info, FileWarning, MessageCircle, ExternalLink, RotateCcw
} from "lucide-react";
import toast from "react-hot-toast";

/* ─── Status Config ─── */
const STATUS_CONFIG = {
    ORDER_PLACED: { label: 'Placed', bg: 'bg-[rgba(245,158,11,0.08)]', text: 'text-[#F59E0B]' },
    PROCESSING: { label: 'Processing', bg: 'bg-[rgba(245,158,11,0.08)]', text: 'text-[#F59E0B]' },
    SHIPPED: { label: 'Shipped', bg: 'bg-[rgba(59,130,246,0.08)]', text: 'text-[#3B82F6]' },
    DELIVERED: { label: 'Delivered', bg: 'bg-[rgba(34,197,94,0.08)]', text: 'text-[#22C55E]' },
    CANCELLATION_REQUESTED: { label: 'Cancel requested', bg: 'bg-[rgba(245,158,11,0.08)]', text: 'text-[#F59E0B]' },
    RETURN_REQUESTED: { label: 'Return requested', bg: 'bg-[rgba(59,130,246,0.08)]', text: 'text-[#3B82F6]' },
    RETURNED: { label: 'Returned', bg: 'bg-[rgba(34,197,94,0.08)]', text: 'text-[#22C55E]' },
    CANCELLED: { label: 'Cancelled', bg: 'bg-[rgba(239,68,68,0.08)]', text: 'text-[#EF4444]' },
};

const TIMELINE_STEPS = [
    { key: 'ORDER_PLACED', label: 'Placed', icon: Package, step: 0 },
    { key: 'PROCESSING', label: 'Processing', icon: Clock, step: 1 },
    { key: 'SHIPPED', label: 'Shipped', icon: Truck, step: 2 },
    { key: 'DELIVERED', label: 'Delivered', icon: CheckCircle2, step: 3 },
];

const REPORT_REASONS = [
    { id: "inappropriate", label: "Inappropriate content", icon: AlertTriangle },
    { id: "fake", label: "Fake or counterfeit", icon: Copy },
    { id: "wrong_info", label: "Wrong or misleading info", icon: Info },
    { id: "copyright", label: "Copyright or trademark", icon: FileWarning },
    { id: "spam", label: "Spam", icon: MessageCircle },
    { id: "other", label: "Other", icon: MessageSquare },
];

/* ─── Status Badge ─── */
const StatusBadge = ({ status }) => {
    const c = STATUS_CONFIG[status] || STATUS_CONFIG.ORDER_PLACED;
    return (
        <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[12px] font-medium tracking-wide ${c.bg} ${c.text}`}>
            {c.label}
        </span>
    );
};

/* ─── Timeline ─── */
const OrderTimeline = ({ status, isFashion = false }) => {
    const currentStep = STATUS_CONFIG[status] ? TIMELINE_STEPS.findIndex(s => s.key === status) : 0;
    if (status === 'CANCELLED') {
        return (
            <div className="flex items-center gap-2 mt-3">
                <XCircle size={14} className="text-[#EF4444]" />
                <span className="text-[13px] text-[#EF4444] font-medium">Order was cancelled</span>
            </div>
        );
    }
    if (status === 'RETURNED') {
        return (
            <div className="flex items-center gap-2 mt-3">
                <CheckCircle2 size={14} className="text-[#22C55E]" />
                <span className="text-[13px] text-[#22C55E] font-medium">Return approved</span>
            </div>
        );
    }
    return (
        <div className="flex items-center mt-4">
            {TIMELINE_STEPS.map((step, i) => {
                const Icon = step.icon;
                const done = i <= currentStep;
                return (
                    <div key={step.key} className="flex items-center">
                        <div className="flex flex-col items-center gap-1.5">
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center ${done
                                ? isFashion ? 'bg-[#8B6914]/10' : 'bg-[rgba(255,255,255,0.06)]'
                                : isFashion ? 'bg-[#d4c4a8]/20' : 'bg-[rgba(255,255,255,0.02)]'
                                }`}>
                                <Icon size={13} className={done
                                    ? isFashion ? 'text-[#8B6914]' : 'text-[#E6EAF0]'
                                    : isFashion ? 'text-[#8B7355]/40' : 'text-[#8B949E]/40'
                                } />
                            </div>
                            <span className={`text-[10px] font-medium ${done
                                ? isFashion ? 'text-[#2d1810]' : 'text-[#E6EAF0]'
                                : isFashion ? 'text-[#8B7355]/40' : 'text-[#8B949E]/40'
                                }`}>
                                {step.label}
                            </span>
                        </div>
                        {i < TIMELINE_STEPS.length - 1 && (
                            <div className={`w-8 sm:w-12 h-px mx-1 mb-5 ${i < currentStep
                                ? isFashion ? 'bg-[#8B6914]/20' : 'bg-[rgba(255,255,255,0.12)]'
                                : isFashion ? 'bg-[#d4c4a8]/30' : 'bg-[rgba(255,255,255,0.04)]'
                                }`} />
                        )}
                    </div>
                );
            })}
        </div>
    );
};

/* ─── Product Menu ─── */
const ProductMenu = ({ onReport, orderId, productId, isFashion = false }) => {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);
    const router = useRouter();

    useEffect(() => {
        const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    return (
        <div className="relative" ref={ref}>
            <button
                onClick={(e) => { e.stopPropagation(); setOpen(v => !v); }}
                className={`p-1.5 rounded-md transition-colors ${isFashion
                    ? 'text-[#8B7355] hover:text-[#2d1810] hover:bg-[#f5ede3]'
                    : 'text-[#8B949E] hover:text-[#E6EAF0] hover:bg-[rgba(255,255,255,0.04)]'
                    }`}
                aria-label="Options"
            >
                <MoreVertical size={15} />
            </button>
            {open && (
                <div className={`absolute right-0 top-full mt-1 py-1 w-40 rounded-lg border shadow-lg z-40 ${isFashion
                    ? 'border-[#d4c4a8]/40 bg-white shadow-black/10'
                    : 'border-[rgba(255,255,255,0.06)] bg-[#1C2128] shadow-black/40'
                    }`}>
                    {[
                        { icon: Flag, label: 'Report', action: () => { setOpen(false); onReport(); } },
                        { icon: MessageSquare, label: 'Feedback', action: () => { setOpen(false); toast("Feedback coming soon!", { icon: "💬" }); } },
                        { icon: HelpCircle, label: 'Help', action: () => { setOpen(false); router.push(`/help?orderId=${orderId}&productId=${productId}`); } },
                    ].map(item => (
                        <button key={item.label} onClick={(e) => { e.stopPropagation(); item.action(); }}
                            className={`w-full flex items-center gap-2.5 px-3 py-2 text-left text-[13px] transition-colors ${isFashion
                                ? 'text-[#8B7355] hover:text-[#2d1810] hover:bg-[#f5ede3]'
                                : 'text-[#8B949E] hover:text-[#E6EAF0] hover:bg-[rgba(255,255,255,0.04)]'
                                }`}>
                            <item.icon size={13} />{item.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

/* ─── Inline Report Panel ─── */
const InlineReportPanel = ({ productId, onClose, isFashion = false }) => {
    const [reason, setReason] = useState("");
    const [custom, setCustom] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const panelRef = useRef(null);

    useEffect(() => {
        const handler = (e) => { if (panelRef.current && !panelRef.current.contains(e.target)) onClose(); };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, [onClose]);

    const submitReport = async () => {
        if (!reason) { toast.error("Pick a reason"); return; }
        if (reason === "other" && !custom.trim()) { toast.error("Describe the issue"); return; }
        setSubmitting(true);
        try {
            const res = await fetch("/api/report", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ productId, reasonType: reason, customReason: reason === "other" ? custom.trim() : undefined }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed");
            toast.success("Report submitted");
            onClose();
        } catch (e) { toast.error(e.message); } finally { setSubmitting(false); }
    };

    return (
        <div ref={panelRef} className={`mt-3 rounded-lg border overflow-hidden ${isFashion
            ? 'border-[#d4c4a8]/40 bg-[#f5ede3]'
            : 'border-[rgba(255,255,255,0.06)] bg-[#1C2128]'
            }`}>
            <div className={`flex items-center justify-between px-4 py-3 border-b ${isFashion ? 'border-[#d4c4a8]/30' : 'border-[rgba(255,255,255,0.04)]'}`}>
                <div className="flex items-center gap-2">
                    <Flag size={12} className={isFashion ? 'text-[#8B7355]' : 'text-[#8B949E]'} />
                    <span className={`text-[13px] font-semibold ${isFashion ? 'text-[#2d1810]' : 'text-[#E6EAF0]'}`}>Report this product</span>
                </div>
                <button onClick={onClose} className={`p-1 rounded transition-colors ${isFashion ? 'text-[#8B7355] hover:text-[#2d1810]' : 'text-[#8B949E] hover:text-[#E6EAF0]'}`}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
                </button>
            </div>
            <div className="px-4 py-3 space-y-1.5">
                {REPORT_REASONS.map(({ id, label, icon: Icon }) => (
                    <button key={id} onClick={() => setReason(id)}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-left text-[12px] transition-colors ${reason === id
                            ? isFashion
                                ? "bg-[#8B6914]/10 text-[#8B6914] border border-[#8B6914]/20"
                                : "bg-[rgba(76,111,255,0.08)] text-[#4C6FFF] border border-[rgba(76,111,255,0.2)]"
                            : isFashion
                                ? "text-[#8B7355] hover:text-[#2d1810] hover:bg-white/60 border border-transparent"
                                : "text-[#8B949E] hover:text-[#E6EAF0] hover:bg-[rgba(255,255,255,0.03)] border border-transparent"
                            }`}>
                        <Icon size={13} className="flex-shrink-0 opacity-60" />{label}
                    </button>
                ))}
                {reason === "other" && (
                    <textarea value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="Describe the issue…" rows={2} maxLength={2000}
                        className={`w-full mt-1.5 px-3 py-2 rounded-md border focus:outline-none transition-colors text-[12px] ${isFashion
                            ? 'border-[#d4c4a8]/40 bg-white text-[#2d1810] placeholder-[#8B7355]/50 focus:border-[#8B6914]/30'
                            : 'border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] text-[#E6EAF0] placeholder-[#8B949E]/50 focus:border-[rgba(76,111,255,0.3)]'
                            }`} />
                )}
            </div>
            <div className={`px-4 py-3 border-t flex gap-2 ${isFashion ? 'border-[#d4c4a8]/30' : 'border-[rgba(255,255,255,0.04)]'}`}>
                <button onClick={onClose} className={`flex-1 py-2 rounded-md border text-[12px] font-medium transition-colors ${isFashion
                    ? 'border-[#d4c4a8]/40 text-[#8B7355] hover:text-[#2d1810] hover:bg-white/60'
                    : 'border-[rgba(255,255,255,0.08)] text-[#8B949E] hover:text-[#E6EAF0] hover:bg-[rgba(255,255,255,0.03)]'
                    }`}>
                    Cancel
                </button>
                <button onClick={submitReport} disabled={submitting || !reason || (reason === "other" && !custom.trim())}
                    className={`flex-1 py-2 rounded-md text-white font-medium text-[12px] disabled:opacity-30 disabled:cursor-not-allowed transition-colors ${isFashion
                        ? 'bg-[#8B6914] hover:bg-[#7a5c12]'
                        : 'bg-[#4C6FFF] hover:bg-[#5D7DFF]'
                        }`}>
                    {submitting ? "Submitting…" : "Submit Report"}
                </button>
            </div>
        </div>
    );
};

/* ═══════════════════════════════════════════════════════
   ORDER CARD
   ═══════════════════════════════════════════════════════ */
const OrderCard = ({ order, isFashion = false }) => {
    const router = useRouter();
    const currency = process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || '₹';
    const [ratingModal, setRatingModal] = useState(null);
    const [expanded, setExpanded] = useState(false);
    const [reportingProductId, setReportingProductId] = useState(null);
    const [showAllItems, setShowAllItems] = useState(false);
    const { ratings } = useSelector(state => state.rating);

    const date = new Date(order.createdAt);
    const formattedDate = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const shortId = order.id.slice(-8).toUpperCase();

    const visibleItems = showAllItems ? order.orderItems : order.orderItems.slice(0, 1);

    return (
        <article className={`rounded-2xl border transition-all duration-300 hover:-translate-y-0.5 ${isFashion
            ? 'border-[#d4c4a8]/30 bg-white hover:border-[#c4a882]/40 hover:shadow-[0_0_25px_-5px_rgba(139,105,20,0.12)]'
            : 'border-zinc-700/30 bg-zinc-900/40 hover:border-cyan-500/20 hover:shadow-[0_0_25px_-5px_rgba(6,182,212,0.12)]'}`}>
            <div className="p-5 sm:p-6">

                {/* ── Top Row: ID+Date ↔ Price+Status ── */}
                <div className="flex items-start justify-between gap-4 mb-6">
                    <div>
                        <p className={`text-[12px] font-mono font-medium uppercase tracking-widest ${isFashion ? 'text-[#8B7355]' : 'text-[#8B949E]'}`}>#{shortId}</p>
                        <p className={`text-[13px] mt-0.5 ${isFashion ? 'text-[#8B7355]/60' : 'text-[#8B949E]/60'}`}>{formattedDate}</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <StatusBadge status={order.status} />
                        <p className={`text-[20px] font-bold tabular-nums ${isFashion ? 'text-[#2d1810]' : 'text-[#E6EAF0]'}`}>{currency}{order.total.toFixed(2)}</p>
                    </div>
                </div>

                {/* ── Products ── */}
                <div className="space-y-3">
                    {visibleItems.map((item, idx) => {
                        const existingRating = ratings.find(r => order.id === r.orderId && item.product.id === r.productId);
                        const isReporting = reportingProductId === item.product.id;
                        return (
                            <div key={idx}>
                                <div className="flex items-center gap-4">
                                    {/* Thumbnail */}
                                    <Link href={`/product/${item.product.id}`} className={`block flex-shrink-0 w-14 h-14 rounded-xl border flex items-center justify-center overflow-hidden hover:opacity-80 transition-opacity ${isFashion
                                        ? 'bg-[#f5ede3] border-[#d4c4a8]/30'
                                        : 'bg-zinc-800/40 border-zinc-700/40'}`}>
                                        <Image
                                            src={item.product.images[0]}
                                            alt={item.product.name}
                                            width={48}
                                            height={48}
                                            className="object-contain p-1"
                                        />
                                    </Link>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between gap-2">
                                            <Link href={`/product/${item.product.id}`} className="block truncate">
                                                <p className={`text-[16px] font-semibold truncate leading-snug hover:underline ${isFashion ? 'text-[#2d1810]' : 'text-[#E6EAF0]'}`}>{item.product.name}</p>
                                            </Link>
                                            <ProductMenu orderId={order.id} productId={item.product.id} isFashion={isFashion} onReport={() => setReportingProductId(prev => prev ? null : item.product.id)} />
                                        </div>
                                        <div className="flex items-center gap-3 mt-1">
                                            <span className={`text-[13px] ${isFashion ? 'text-[#8B7355]' : 'text-[#8B949E]'}`}>{currency}{item.price.toFixed(2)} × {item.quantity}</span>
                                        </div>
                                        {/* Rating */}
                                        <div className="mt-1.5">
                                            {existingRating
                                                ? <Rating value={existingRating.rating} />
                                                : order.status === 'DELIVERED' && (
                                                    <button onClick={() => setRatingModal({ orderId: order.id, productId: item.product.id })}
                                                        className={`inline-flex items-center gap-1 text-[12px] font-medium transition-colors ${isFashion
                                                            ? 'text-[#8B6914] hover:text-[#6B5010]'
                                                            : 'text-[#4C6FFF] hover:text-[#5D7DFF]'}`}>
                                                        Rate product <ExternalLink size={10} />
                                                    </button>
                                                )
                                            }
                                        </div>
                                    </div>
                                </div>
                                {/* Report panel */}
                                {isReporting && (
                                    <InlineReportPanel productId={item.product.id} isFashion={isFashion} onClose={() => setReportingProductId(null)} />
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* View more / less */}
                {order.orderItems.length > 1 && (
                    <button onClick={() => setShowAllItems(v => !v)}
                        className={`w-full mt-3 py-2 flex items-center justify-center gap-1.5 text-[12px] font-medium rounded-md transition-colors ${isFashion
                            ? 'text-[#8B7355] hover:text-[#2d1810] hover:bg-[#f5ede3]'
                            : 'text-[#8B949E] hover:text-[#E6EAF0] hover:bg-[rgba(255,255,255,0.02)]'}`}>
                        {showAllItems ? (
                            <><ChevronUp size={14} /> View less</>
                        ) : (
                            <><ChevronDown size={14} /> View more <span className={isFashion ? 'text-[#8B7355]/40' : 'text-[#8B949E]/40'}>(+{order.orderItems.length - 1})</span></>
                        )}
                    </button>
                )}

                {/* ── Cancel / Return ── */}
                {order.vendorStatusMessage && (
                    <div className="mt-4 py-2.5 px-3 rounded-lg bg-[rgba(239,68,68,0.06)] border border-[rgba(239,68,68,0.12)]">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-[#EF4444]/80 mb-1">Message from seller</p>
                        <p className="text-[12px] text-[#E6EAF0]">{order.vendorStatusMessage}</p>
                    </div>
                )}
                {['CANCELLATION_REQUESTED', 'RETURN_REQUESTED'].includes(order.status) && (
                    <div className="mt-4 py-2.5 px-3 rounded-lg bg-[rgba(245,158,11,0.06)] border border-[rgba(245,158,11,0.12)] flex items-center justify-between">
                        <span className="text-[12px] font-medium text-[#F59E0B]">
                            {order.status === 'RETURN_REQUESTED' ? 'Return requested' : 'Cancel requested'} — pending seller
                        </span>
                        <button onClick={() => router.push(`/help?orderId=${order.id}&productId=${order.orderItems?.[0]?.product?.id || ''}`)}
                            className="text-[12px] font-medium text-[#F59E0B] hover:text-[#FBBF24] transition-colors">
                            View
                        </button>
                    </div>
                )}
                {!['CANCELLED', 'RETURNED', 'CANCELLATION_REQUESTED', 'RETURN_REQUESTED'].includes(order.status) && (
                    <div className="mt-4">
                        <button onClick={() => router.push(`/help?orderId=${order.id}&productId=${order.orderItems?.[0]?.product?.id || ''}`)}
                            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-medium transition-colors ${order.status === 'DELIVERED'
                                ? 'bg-[rgba(59,130,246,0.08)] text-[#3B82F6] hover:bg-[rgba(59,130,246,0.12)] border border-[rgba(59,130,246,0.2)]'
                                : 'bg-[rgba(239,68,68,0.06)] text-[#EF4444] hover:bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.2)]'
                                }`}>
                            {order.status === 'DELIVERED' ? <><RotateCcw size={13} /> Request return</> : <><XCircle size={13} /> Cancel order</>}
                        </button>
                    </div>
                )}

                {/* ── Bottom: Location + Details ── */}
                <div className={`flex items-center justify-between mt-6 pt-4 border-t ${isFashion ? 'border-[#d4c4a8]/30' : 'border-[rgba(255,255,255,0.04)]'}`}>
                    <div className="flex items-center gap-1.5">
                        <MapPin size={13} className={isFashion ? 'text-[#8B7355]/50' : 'text-[#8B949E]/50'} />
                        <span className={`text-[13px] ${isFashion ? 'text-[#8B7355]' : 'text-[#8B949E]'}`}>{order.address.city}, {order.address.state}</span>
                    </div>
                    <button onClick={() => setExpanded(v => !v)}
                        className={`flex items-center gap-1 text-[12px] font-medium transition-colors ${isFashion
                            ? 'text-[#8B7355] hover:text-[#2d1810]'
                            : 'text-[#8B949E] hover:text-[#E6EAF0]'}`}>
                        {expanded ? 'Less' : 'Details'}
                        {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                    </button>
                </div>

                {/* ── Expandable Details ── */}
                <div className={`grid transition-all duration-300 ease-out ${expanded ? 'grid-rows-[1fr] opacity-100 mt-5' : 'grid-rows-[0fr] opacity-0'}`}>
                    <div className="overflow-hidden">
                        <div className="space-y-5">
                            {/* Address */}
                            <div>
                                <p className={`text-[11px] font-semibold uppercase tracking-[0.15em] mb-2 ${isFashion ? 'text-[#8B7355]/50' : 'text-[#8B949E]/50'}`}>Delivery Address</p>
                                <div className={`text-[13px] space-y-0.5 leading-relaxed ${isFashion ? 'text-[#8B7355]' : 'text-[#8B949E]'}`}>
                                    <p className={`font-medium ${isFashion ? 'text-[#2d1810]' : 'text-[#E6EAF0]'}`}>{order.address.name}</p>
                                    <p>{order.address.street}</p>
                                    <p>{order.address.city}, {order.address.state} {order.address.zip}</p>
                                    <p>{order.address.country}</p>
                                    <p className={`mt-1 ${isFashion ? 'text-[#8B7355]/50' : 'text-[#8B949E]/50'}`}>{order.address.phone}</p>
                                </div>
                            </div>

                            {/* Timeline */}
                            <div>
                                <p className={`text-[11px] font-semibold uppercase tracking-[0.15em] mb-1 ${isFashion ? 'text-[#8B7355]/50' : 'text-[#8B949E]/50'}`}>Timeline</p>
                                <OrderTimeline status={order.status} isFashion={isFashion} />
                            </div>

                            {/* Payment */}
                            <div className={`flex items-center gap-3 text-[13px] ${isFashion ? 'text-[#8B7355]' : 'text-[#8B949E]'}`}>
                                <span className={`px-2 py-1 rounded-md border text-[12px] ${isFashion
                                    ? 'bg-[#f5ede3] border-[#d4c4a8]/30'
                                    : 'bg-[rgba(255,255,255,0.03)] border-[rgba(255,255,255,0.04)]'}`}>
                                    {order.paymentMethod === 'COD' ? 'Cash on Delivery' : 'Stripe'}
                                </span>
                                {order.isPaid && (
                                    <span className="flex items-center gap-1 text-[#22C55E] text-[12px]">
                                        <CheckCircle2 size={12} /> Paid
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {ratingModal && <RatingModal ratingModal={ratingModal} setRatingModal={setRatingModal} />}
        </article>
    );
};

export default OrderCard;
