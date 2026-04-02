'use client'

import { useEffect, useMemo, useRef, useState } from "react";
import OrderCard from "@/components/OrderCard";
import { useAuth, useUser } from "@clerk/nextjs";
import axios from "axios";
import toast from "react-hot-toast";
import { useRouter, useSearchParams } from "next/navigation";
import Loading from "@/components/Loading";
import { ChevronDown, Package, ShoppingBag, SlidersHorizontal, ArrowUpDown } from "lucide-react";

const STATUS_OPTIONS = [
    { value: 'ALL', label: 'All Orders' },
    { value: 'ORDER_PLACED', label: 'Order Placed' },
    { value: 'PROCESSING', label: 'Processing' },
    { value: 'SHIPPED', label: 'Shipped' },
    { value: 'DELIVERED', label: 'Delivered' },
    { value: 'RETURNED', label: 'Returned' },
    { value: 'CANCELLATION_REQUESTED', label: 'Cancel requested' },
    { value: 'RETURN_REQUESTED', label: 'Return requested' },
    { value: 'CANCELLED', label: 'Cancelled' },
];

const SORT_OPTIONS = [
    { value: 'newest', label: 'Newest first' },
    { value: 'oldest', label: 'Oldest first' },
    { value: 'price_high', label: 'Price ↓' },
    { value: 'price_low', label: 'Price ↑' },
];

export default function OrdersPageClient() {
    const { getToken } = useAuth();
    const { user, isLoaded } = useUser();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [sortBy, setSortBy] = useState('newest');
    const [showStatusDrop, setShowStatusDrop] = useState(false);
    const [showSortDrop, setShowSortDrop] = useState(false);

    const statusRef = useRef(null);
    const sortRef = useRef(null);
    const router = useRouter();
    const searchParams = useSearchParams();
    const isFashion = searchParams?.get('from') === 'fashion';

    useEffect(() => {
        const fetchOrders = async () => {
            try {
                const token = await getToken();
                const { data } = await axios.get('/api/orders', { headers: { Authorization: `Bearer ${token}` } });
                setOrders(data.orders);
                setLoading(false);
            } catch (error) {
                toast.error(error?.response?.data?.error || error.message);
            }
        };
        if (isLoaded) {
            if (user) { fetchOrders(); }
            else { router.push('/'); }
        }
    }, [isLoaded, user, getToken, router]);

    useEffect(() => {
        const handler = (e) => {
            if (statusRef.current && !statusRef.current.contains(e.target)) setShowStatusDrop(false);
            if (sortRef.current && !sortRef.current.contains(e.target)) setShowSortDrop(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const filtered = useMemo(() => {
        let list = [...orders];
        if (statusFilter !== 'ALL') list = list.filter(o => o.status === statusFilter);
        switch (sortBy) {
            case 'oldest': list.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)); break;
            case 'price_high': list.sort((a, b) => b.total - a.total); break;
            case 'price_low': list.sort((a, b) => a.total - b.total); break;
            default: list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        }
        return list;
    }, [orders, statusFilter, sortBy]);

    if (!isLoaded || loading) return <Loading />;

    const statusLabel = STATUS_OPTIONS.find(o => o.value === statusFilter)?.label;
    const sortLabel = SORT_OPTIONS.find(o => o.value === sortBy)?.label;

    return (
        <div className={`min-h-screen relative ${isFashion ? 'bg-[#faf5f0]' : 'bg-[#0a0a0b]'}`}>
            {/* Ambient glow */}
            <div className={`absolute top-0 left-[20%] w-[350px] h-[350px] rounded-full blur-[120px] pointer-events-none ${isFashion ? 'bg-[#8B6914]/[0.02]' : 'bg-cyan-500/[0.02]'}`} />

            {orders.length > 0 ? (
                <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">

                    <div className="mb-10">
                        <h1 className={`text-[28px] font-bold tracking-tight leading-none ${isFashion ? 'text-[#2d1810]' : 'text-zinc-100'}`}>My Orders</h1>
                        <p className={`text-[13px] mt-1.5 ${isFashion ? 'text-[#8B7355]' : 'text-zinc-500'}`}>
                            {orders.length} order{orders.length !== 1 ? 's' : ''} total
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
                        <p className={`text-[12px] font-medium uppercase tracking-wider ${isFashion ? 'text-[#8B7355]' : 'text-zinc-600'}`}>
                            {filtered.length} result{filtered.length !== 1 ? 's' : ''}
                        </p>

                        <div className="flex items-center gap-2">
                            {/* Status filter */}
                            <div className="relative" ref={statusRef}>
                                <button onClick={() => { setShowStatusDrop(v => !v); setShowSortDrop(false); }}
                                    className={`flex items-center gap-2 px-3 py-2 border rounded-xl text-[13px] transition-all duration-300 ${isFashion 
                                        ? 'bg-white hover:bg-[#f5ede3] border-[#d4c4a8]/40 hover:border-[#c4a882]/40 text-[#8B7355]' 
                                        : 'bg-zinc-900/40 hover:bg-zinc-800/60 border-zinc-700/40 hover:border-cyan-500/20 text-zinc-400'}`}>
                                    <SlidersHorizontal size={13} />
                                    {statusLabel}
                                    <ChevronDown size={12} className={`transition-transform duration-200 ${showStatusDrop ? 'rotate-180' : ''}`} />
                                </button>
                                {showStatusDrop && (
                                    <div className={`absolute right-0 top-full mt-1.5 w-44 border rounded-xl shadow-xl z-30 py-1 backdrop-blur-xl ${isFashion 
                                        ? 'bg-white border-[#d4c4a8]/60 shadow-black/10' 
                                        : 'bg-zinc-900 border-zinc-700/60 shadow-black/40'}`}>
                                        {STATUS_OPTIONS.map(opt => (
                                            <button key={opt.value} onClick={() => { setStatusFilter(opt.value); setShowStatusDrop(false); }}
                                                className={`w-full text-left px-3 py-2 text-[13px] transition-colors ${statusFilter === opt.value
                                                    ? isFashion 
                                                        ? 'text-[#8B6914] bg-[#8B6914]/10' 
                                                        : 'text-cyan-400 bg-cyan-500/10'
                                                    : isFashion
                                                        ? 'text-[#8B7355] hover:text-[#2d1810] hover:bg-[#f5ede3]'
                                                        : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60'
                                                }`}>
                                                {opt.label}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Sort */}
                            <div className="relative" ref={sortRef}>
                                <button onClick={() => { setShowSortDrop(v => !v); setShowStatusDrop(false); }}
                                    className={`flex items-center gap-2 px-3 py-2 border rounded-xl text-[13px] transition-all duration-300 ${isFashion 
                                        ? 'bg-white hover:bg-[#f5ede3] border-[#d4c4a8]/40 hover:border-[#c4a882]/40 text-[#8B7355]' 
                                        : 'bg-zinc-900/40 hover:bg-zinc-800/60 border-zinc-700/40 hover:border-cyan-500/20 text-zinc-400'}`}>
                                    <ArrowUpDown size={13} />
                                    {sortLabel}
                                    <ChevronDown size={12} className={`transition-transform duration-200 ${showSortDrop ? 'rotate-180' : ''}`} />
                                </button>
                                {showSortDrop && (
                                    <div className={`absolute right-0 top-full mt-1.5 w-40 border rounded-xl shadow-xl z-30 py-1 backdrop-blur-xl ${isFashion 
                                        ? 'bg-white border-[#d4c4a8]/60 shadow-black/10' 
                                        : 'bg-zinc-900 border-zinc-700/60 shadow-black/40'}`}>
                                        {SORT_OPTIONS.map(opt => (
                                            <button key={opt.value} onClick={() => { setSortBy(opt.value); setShowSortDrop(false); }}
                                                className={`w-full text-left px-3 py-2 text-[13px] transition-colors ${sortBy === opt.value
                                                    ? isFashion 
                                                        ? 'text-[#8B6914] bg-[#8B6914]/10' 
                                                        : 'text-cyan-400 bg-cyan-500/10'
                                                    : isFashion
                                                        ? 'text-[#8B7355] hover:text-[#2d1810] hover:bg-[#f5ede3]'
                                                        : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60'
                                                }`}>
                                                {opt.label}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {filtered.length > 0 ? (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            {filtered.map(order => <OrderCard order={order} key={order.id} isFashion={isFashion} />)}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-24 text-center">
                            <Package size={24} className={`mb-4 ${isFashion ? 'text-[#8B7355]' : 'text-zinc-600'}`} />
                            <p className={`text-[14px] mb-1 font-medium ${isFashion ? 'text-[#8B7355]' : 'text-zinc-400'}`}>No orders match &quot;{statusLabel}&quot;</p>
                            <button onClick={() => setStatusFilter('ALL')}
                                className={`text-[13px] font-medium transition-colors mt-2 ${isFashion ? 'text-[#8B6914] hover:text-[#6B5010]' : 'text-cyan-400 hover:text-cyan-300'}`}>
                                Show all orders
                            </button>
                        </div>
                    )}
                </div>
            ) : (
                <div className="relative min-h-[85vh] flex flex-col items-center justify-center gap-6 px-6">
                    <div className={`w-20 h-20 rounded-2xl border flex items-center justify-center ${isFashion ? 'bg-[#f5ede3] border-[#d4c4a8]/40' : 'bg-zinc-800/60 border-zinc-700/40'}`}>
                        <ShoppingBag size={32} className={isFashion ? 'text-[#8B7355]' : 'text-zinc-600'} />
                    </div>
                    <div className="text-center">
                        <h1 className={`text-2xl font-bold mb-2 tracking-tight ${isFashion ? 'text-[#2d1810]' : 'text-zinc-100'}`}>No orders yet</h1>
                        <p className={`text-[14px] max-w-xs ${isFashion ? 'text-[#8B7355]' : 'text-zinc-500'}`}>Browse our collections and place your first order</p>
                    </div>
                    <button type="button" onClick={() => router.push(isFashion ? '/fashion' : '/')}
                        className={`px-6 py-2.5 text-[14px] font-medium text-white rounded-xl transition shadow-lg ${isFashion 
                            ? 'bg-[#8B6914] hover:bg-[#6B5010] shadow-[#8B6914]/20' 
                            : 'bg-cyan-500 hover:bg-cyan-400 shadow-cyan-500/20'}`}>
                        Start Shopping
                    </button>
                </div>
            )}
        </div>
    );
}
