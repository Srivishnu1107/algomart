'use client'
import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import axios from "axios";
import Image from "next/image";
import toast from "react-hot-toast";
import Loading from "@/components/Loading";
import {
    ArrowLeft, Package, RotateCcw, XCircle, CheckCircle2, AlertTriangle, Clock
} from "lucide-react";

const CANCEL_REASONS = [
    "Changed my mind",
    "Found a better price elsewhere",
    "Ordered by mistake",
    "Delivery taking too long",
    "Other",
];

const RETURN_REASONS = [
    "Damaged or defective product",
    "Wrong item received",
    "Item doesn't match description",
    "Quality not as expected",
    "Other",
];

export default function HelpClient() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { getToken } = useAuth();

    const orderId = searchParams.get("orderId");
    const productId = searchParams.get("productId");

    const [order, setOrder] = useState(null);
    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [selectedReason, setSelectedReason] = useState("");
    const [customReason, setCustomReason] = useState("");
    const [success, setSuccess] = useState(null);

    const currency = process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || '₹';

    useEffect(() => {
        const fetchOrder = async () => {
            try {
                const token = await getToken();
                const { data } = await axios.get('/api/orders', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const found = data.orders.find(o => o.id === orderId);
                if (found) {
                    setOrder(found);
                    const item = found.orderItems.find(i => i.product.id === productId);
                    if (item) setProduct(item);
                }
            } catch (err) {
                toast.error("Failed to load order");
            } finally {
                setLoading(false);
            }
        };
        if (orderId) fetchOrder();
        else setLoading(false);
    }, [orderId, productId, getToken]);

    const isDelivered = order?.status === 'DELIVERED';
    const isCancelled = order?.status === 'CANCELLED';
    const isReturned = order?.status === 'RETURNED';
    const isRequestPending = order?.status === 'CANCELLATION_REQUESTED' || order?.status === 'RETURN_REQUESTED';
    const action = isDelivered ? 'return' : 'cancel';
    const reasons = isDelivered ? RETURN_REASONS : CANCEL_REASONS;
    const finalReason = selectedReason === "Other" ? customReason.trim() : selectedReason;

    const handleSubmit = async () => {
        if (!finalReason) {
            toast.error("Please select a reason");
            return;
        }
        setSubmitting(true);
        try {
            const token = await getToken();
            const { data } = await axios.post('/api/orders/help', {
                orderId,
                action,
                reason: finalReason,
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setSuccess(data.message);
            toast.success(data.message);
        } catch (err) {
            toast.error(err.response?.data?.error || "Something went wrong");
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <Loading />;

    if (!orderId || !order) {
        return (
            <div className="min-h-screen bg-[#0E1116] flex flex-col items-center justify-center gap-4 px-6">
                <AlertTriangle size={32} className="text-[#F59E0B]" />
                <p className="text-[16px] text-[#E6EAF0] font-medium">Order not found</p>
                <p className="text-[13px] text-[#8B949E]">Please navigate here from your order history.</p>
                <button onClick={() => router.push('/orders')}
                    className="mt-2 px-5 py-2 text-[13px] font-medium text-white bg-[#4C6FFF] hover:bg-[#5D7DFF] rounded-lg transition-colors">
                    Go to Orders
                </button>
            </div>
        );
    }

    if (success) {
        return (
            <div className="min-h-screen bg-[#0E1116] flex flex-col items-center justify-center gap-5 px-6">
                <div className="w-16 h-16 rounded-full bg-[rgba(34,197,94,0.1)] flex items-center justify-center">
                    <CheckCircle2 size={32} className="text-[#22C55E]" />
                </div>
                <div className="text-center">
                    <h2 className="text-[20px] font-bold text-[#E6EAF0] mb-1">{success}</h2>
                    <p className="text-[13px] text-[#8B949E]">
                        {isDelivered
                            ? "We'll process your return request shortly."
                            : "Your cancellation request has been submitted."}
                    </p>
                </div>
                <button onClick={() => router.push('/orders')}
                    className="mt-2 px-6 py-2.5 text-[13px] font-medium text-white bg-[#4C6FFF] hover:bg-[#5D7DFF] rounded-lg transition-colors">
                    Back to Orders
                </button>
            </div>
        );
    }

    const shortId = order.id.slice(-8).toUpperCase();

    return (
        <div className="min-h-screen bg-[#0E1116]">
            <div className="max-w-xl mx-auto px-4 sm:px-6 py-10 sm:py-14">

                {/* Back */}
                <button onClick={() => router.back()}
                    className="flex items-center gap-1.5 text-[13px] text-[#8B949E] hover:text-[#E6EAF0] transition-colors mb-8">
                    <ArrowLeft size={15} /> Back to orders
                </button>

                {/* Title */}
                <div className="mb-8">
                    <h1 className="text-[24px] font-bold text-[#E6EAF0] tracking-tight">
                        {isReturned ? "Return Approved" : isDelivered ? "Return Product" : isCancelled ? "Order Cancelled" : isRequestPending ? "Request Pending" : "Cancel Order"}
                    </h1>
                    <p className="text-[13px] text-[#8B949E] mt-1">
                        Order #{shortId}
                    </p>
                </div>

                {/* Vendor message (rejection reason) */}
                {order.vendorStatusMessage && (
                    <div className="rounded-xl border border-[rgba(239,68,68,0.2)] bg-[rgba(239,68,68,0.06)] p-5 mb-6">
                        <p className="text-[12px] font-semibold uppercase tracking-wider text-[#EF4444]/90 mb-1">Message from seller</p>
                        <p className="text-[14px] text-[#E6EAF0]">{order.vendorStatusMessage}</p>
                    </div>
                )}

                {/* Already cancelled, returned, or pending */}
                {isCancelled || isReturned || isRequestPending ? (
                    <div className="rounded-xl border border-[rgba(255,255,255,0.04)] bg-[#1A2030] p-6">
                        <div className="flex items-center gap-3 mb-3">
                            {isReturned ? (
                                <CheckCircle2 size={20} className="text-[#22C55E]" />
                            ) : isCancelled ? (
                                <XCircle size={20} className="text-[#EF4444]" />
                            ) : (
                                <Clock size={20} className="text-[#F59E0B]" />
                            )}
                            <p className="text-[15px] font-semibold text-[#E6EAF0]">
                                {isReturned ? "Your return was approved" : isCancelled ? "This order is cancelled" : "Cancellation/Return Request Pending"}
                            </p>
                        </div>
                        {order.cancellationReason && !isReturned && (
                            <p className="text-[13px] text-[#8B949E] ml-8">Your reason: {order.cancellationReason}</p>
                        )}
                        {isReturned && order.cancellationReason && (
                            <p className="text-[13px] text-[#8B949E] ml-8">Return reason: {order.cancellationReason}</p>
                        )}
                        <button onClick={() => router.push('/orders')}
                            className="mt-5 px-5 py-2 text-[13px] font-medium text-white bg-[#4C6FFF] hover:bg-[#5D7DFF] rounded-lg transition-colors">
                            Back to Orders
                        </button>
                    </div>
                ) : (
                    <>
                        {/* Product Card */}
                        {product && (
                            <div className="rounded-xl border border-[rgba(255,255,255,0.04)] bg-[#1A2030] p-5 mb-6">
                                <div className="flex items-center gap-4">
                                    <div className="flex-shrink-0 w-16 h-16 rounded-lg bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.04)] flex items-center justify-center overflow-hidden">
                                        <Image
                                            src={product.product.images[0]}
                                            alt={product.product.name}
                                            width={56}
                                            height={56}
                                            className="object-contain p-1"
                                        />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[15px] font-semibold text-[#E6EAF0] truncate">{product.product.name}</p>
                                        <p className="text-[13px] text-[#8B949E] mt-0.5">{currency}{product.price.toFixed(2)} × {product.quantity}</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Action banner */}
                        <div className={`rounded-xl p-4 mb-6 flex items-start gap-3 ${isDelivered
                            ? 'bg-[rgba(59,130,246,0.06)] border border-[rgba(59,130,246,0.12)]'
                            : 'bg-[rgba(245,158,11,0.06)] border border-[rgba(245,158,11,0.12)]'
                            }`}>
                            {isDelivered
                                ? <RotateCcw size={18} className="text-[#3B82F6] mt-0.5 flex-shrink-0" />
                                : <Package size={18} className="text-[#F59E0B] mt-0.5 flex-shrink-0" />
                            }
                            <div>
                                <p className={`text-[13px] font-medium ${isDelivered ? 'text-[#3B82F6]' : 'text-[#F59E0B]'}`}>
                                    {isDelivered
                                        ? "This order has been delivered. You can request a return."
                                        : "This order hasn't been delivered yet. You can cancel it."}
                                </p>
                            </div>
                        </div>

                        {/* Reason selection */}
                        <div className="mb-6">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#8B949E]/50 mb-3">
                                Select a reason
                            </p>
                            <div className="space-y-2">
                                {reasons.map(reason => (
                                    <button key={reason} onClick={() => setSelectedReason(reason)}
                                        className={`w-full text-left flex items-center justify-between px-4 py-3 rounded-lg border text-[13px] transition-colors ${selectedReason === reason
                                            ? 'bg-[rgba(76,111,255,0.06)] border-[rgba(76,111,255,0.2)] text-[#E6EAF0]'
                                            : 'bg-[#1A2030] border-[rgba(255,255,255,0.04)] text-[#8B949E] hover:text-[#E6EAF0] hover:border-[rgba(255,255,255,0.08)]'
                                            }`}>
                                        {reason}
                                        {selectedReason === reason && <CheckCircle2 size={15} className="text-[#4C6FFF]" />}
                                    </button>
                                ))}
                            </div>
                            {selectedReason === "Other" && (
                                <textarea
                                    value={customReason}
                                    onChange={(e) => setCustomReason(e.target.value)}
                                    placeholder="Please describe your reason…"
                                    rows={3}
                                    maxLength={500}
                                    className="w-full mt-3 px-4 py-3 rounded-lg border border-[rgba(255,255,255,0.06)] bg-[#1A2030] text-[#E6EAF0] placeholder-[#8B949E]/40 focus:outline-none focus:border-[rgba(76,111,255,0.3)] transition-colors text-[13px]"
                                />
                            )}
                        </div>

                        {/* Submit */}
                        <div className="flex gap-3">
                            <button onClick={() => router.back()}
                                className="flex-1 py-2.5 rounded-lg border border-[rgba(255,255,255,0.08)] text-[13px] font-medium text-[#8B949E] hover:text-[#E6EAF0] hover:bg-[rgba(255,255,255,0.03)] transition-colors">
                                Cancel
                            </button>
                            <button onClick={handleSubmit}
                                disabled={submitting || !finalReason}
                                className={`flex-1 py-2.5 rounded-lg text-[13px] font-medium text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${isDelivered
                                    ? 'bg-[#3B82F6] hover:bg-[#4B8DF7]'
                                    : 'bg-[#EF4444] hover:bg-[#F05555]'
                                    }`}>
                                {submitting
                                    ? "Processing…"
                                    : isDelivered ? "Submit Return Request" : "Cancel Order"
                                }
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
