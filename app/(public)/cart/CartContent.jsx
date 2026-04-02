'use client'

import Counter from "@/components/Counter";
import OrderSummary from "@/components/OrderSummary";
import { deleteItemFromCart, clearCart, swapCartItem, setSuggestions } from "@/lib/features/cart/cartSlice";
import { Trash2Icon, ArrowLeftRight, CheckCircle2, ShoppingCart, CreditCard, ArrowLeft, Check } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import React, { useCallback, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useAuth, useUser } from "@clerk/nextjs";
import axios from "axios";

export default function CartContent() {
    const currency = process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || '₹';
    const { cartItems, crossVendorSuggestions } = useSelector(state => state.cart);
    const products = useSelector(state => state.product.list);
    const addresses = useSelector(state => state.address?.list ?? []);
    const dispatch = useDispatch();
    const searchParams = useSearchParams();
    const { user } = useUser();
    const { getToken } = useAuth();
    const fromFashion = searchParams?.get('from') === 'fashion';
    const isFashion = fromFashion;
    const continuePath = isFashion ? '/fashion' : '/shop';
    const productBasePath = isFashion ? '/fashion/product' : '/product';
    const accent = isFashion ? 'amber' : 'cyan';

    const [step, setStep] = useState('cart');
    const [cartArray, setCartArray] = useState([]);
    const [totalPrice, setTotalPrice] = useState(0);
    const [loadingSuggestions, setLoadingSuggestions] = useState(false);
    const [userLocation, setUserLocation] = useState(null);
    const [isPro, setIsPro] = useState(false);
    const fashionCategories = new Set(['Men', 'Women', 'Footwear', 'Accessories', 'Streetwear', 'Luxury']);
    const getProductType = (product) => {
        if (!product) return 'electronics';
        if (product.productType) return product.productType;
        if (product.store?.storeType) return product.store.storeType;
        if (product.type) return product.type;
        return fashionCategories.has(product.category) ? 'fashion' : 'electronics';
    };

    const createCartArray = () => {
        setTotalPrice(0);
        const arr = [];
        for (const [key, value] of Object.entries(cartItems)) {
            const product = products.find(p => p.id === key);
            if (product) {
                arr.push({ ...product, type: getProductType(product), quantity: value });
                setTotalPrice(prev => prev + product.price * value);
            }
        }
        setCartArray(arr);
    };

    const handleDeleteItemFromCart = (productId) => dispatch(deleteItemFromCart({ productId }));
    const handleClearCart = () => dispatch(clearCart());

    const handleSwap = useCallback((fromProductId, toProductId, quantity) => {
        dispatch(swapCartItem({ fromProductId, toProductId, quantity }));
    }, [dispatch]);

    useEffect(() => {
        const withCoords = addresses.find((a) => a.latitude != null && a.longitude != null);
        if (withCoords) { setUserLocation({ lat: withCoords.latitude, lng: withCoords.longitude }); return; }
        if (typeof navigator !== 'undefined' && navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
                () => { }, { enableHighAccuracy: false, timeout: 5000, maximumAge: 60000 }
            );
        }
    }, [addresses]);

    useEffect(() => { if (products.length > 0) createCartArray(); }, [cartItems, products]);

    // Pro status for cross-vendor (electronics only)
    useEffect(() => {
        if (!user) {
            setIsPro(false);
            return;
        }
        let cancelled = false;
        getToken()
            .then((token) => {
                if (!token || cancelled) return;
                return axios.get('/api/user/pro-status', { headers: { Authorization: `Bearer ${token}` } });
            })
            .then((res) => {
                if (!cancelled && res?.data?.isPro) setIsPro(true);
                else if (!cancelled) setIsPro(false);
            })
            .catch(() => { if (!cancelled) setIsPro(false); });
        return () => { cancelled = true; };
    }, [user, getToken]);

    useEffect(() => {
        if (isFashion || !isPro || cartArray.length === 0) return;

        // Cross-vendor suggestions only on electronics side and for Pro users
        const itemsToFetch = cartArray.filter(item => crossVendorSuggestions[item.id] === undefined);

        if (itemsToFetch.length === 0) return;

        let cancelled = false;
        setLoadingSuggestions(true);
        getToken()
            .then((token) => {
                if (cancelled) return;
                const headers = { 'Content-Type': 'application/json' };
                if (token) headers['Authorization'] = `Bearer ${token}`;
                return fetch('/api/ai/suggestions', {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({
                        cartItems: itemsToFetch.map((item) => ({
                            id: item.id, name: item.name, description: item.description, category: item.category,
                            productType: item.productType ?? (item.type === 'fashion' ? 'fashion' : 'electronics'),
                            price: item.price, storeId: item.storeId, store: item.store, rating: item.rating,
                        })),
                        userLocation: userLocation ?? undefined,
                    }),
                });
            })
            .then((res) => res?.ok ? res.json() : null)
            .then((data) => {
                if (!cancelled && data?.suggestions) {
                    const newSuggestions = itemsToFetch.map(item => {
                        const rec = Array.isArray(data.suggestions) ? data.suggestions.find(s => s.cartItemId === item.id) : null;
                        return rec || { cartItemId: item.id, suggestedProduct: null };
                    });
                    dispatch(setSuggestions(newSuggestions));
                }
            })
            .catch(() => {
                if (!cancelled) console.error("Failed to fetch suggestions");
            })
            .finally(() => { if (!cancelled) setLoadingSuggestions(false); });
        return () => { cancelled = true; };
    }, [isFashion, isPro, getToken, Object.keys(cartItems).sort().join(','), cartArray.length, userLocation?.lat, userLocation?.lng, crossVendorSuggestions, dispatch]);

    const totalItems = cartArray.reduce((s, i) => s + i.quantity, 0);

    if (cartArray.length === 0) {
        return (
            <div className={`min-h-[80vh] mx-6 flex flex-col items-center justify-center gap-4 ${isFashion ? 'bg-[#faf5f0] text-[#8B7355]' : 'bg-[#0a0a0b] text-zinc-400'}`}>
                <div className={`w-20 h-20 rounded-2xl flex items-center justify-center mb-2 ${isFashion ? 'bg-[#f5ede3] border border-[#d4c4a8]/30' : 'bg-zinc-800/60 border border-zinc-700/40'}`}>
                    <ShoppingCart size={32} className={isFashion ? 'text-[#8B7355]' : 'text-zinc-600'} />
                </div>
                <h1 className={`text-2xl sm:text-4xl font-semibold ${isFashion ? 'text-[#2d1810]' : 'text-zinc-200'}`}>Your cart is empty</h1>
                <Link href={continuePath} className={`font-medium ${isFashion ? 'text-[#8B6914] hover:text-[#7a5c12]' : 'text-cyan-400 hover:text-cyan-300'} transition`}>
                    Continue shopping
                </Link>
            </div>
        );
    }

    const accentColor = isFashion ? '#8B6914' : 'rgb(6,182,212)';
    const steps = [
        { key: 'cart', label: 'Cart', icon: ShoppingCart },
        { key: 'payment', label: 'Payment', icon: CreditCard },
    ];
    const currentStepIndex = steps.findIndex(s => s.key === step);

    return (
        <div className={`min-h-screen mx-4 sm:mx-6 ${isFashion ? 'bg-[#faf5f0] text-[#2d1810]' : 'bg-[#0a0a0b] text-zinc-100'}`}>
            <div className="max-w-7xl mx-auto py-8">

                {/* ── Stepper Bar ── */}
                <div className={`rounded-2xl p-5 sm:p-6 mb-8 ${isFashion ? 'bg-white border border-[#d4c4a8]/30' : 'bg-zinc-900/60 border border-zinc-700/40'}`}>
                    <div className="flex items-center justify-center gap-0">
                        {steps.map((s, i) => {
                            const isActive = i === currentStepIndex;
                            const isCompleted = i < currentStepIndex;
                            const Icon = s.icon;
                            return (
                                <React.Fragment key={s.key}>
                                    {/* Connector line (before every step except the first) */}
                                    {i > 0 && (
                                        <div className="relative w-16 sm:w-28 h-[2px] mx-1 sm:mx-2">
                                            <div className={`absolute inset-0 rounded-full ${isFashion ? 'bg-[#d4c4a8]/30' : 'bg-zinc-700/50'}`} />
                                            <div
                                                className="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
                                                style={{
                                                    width: isCompleted || isActive ? '100%' : '0%',
                                                    backgroundColor: accentColor,
                                                    boxShadow: isCompleted || isActive ? `0 0 8px ${accentColor}40` : 'none',
                                                }}
                                            />
                                        </div>
                                    )}
                                    {/* Step circle + label */}
                                    <button
                                        type="button"
                                        onClick={() => { if (isCompleted) setStep(s.key); }}
                                        className={`flex flex-col items-center gap-1.5 ${isCompleted ? 'cursor-pointer' : 'cursor-default'}`}
                                    >
                                        <div
                                            className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center transition-all duration-300 ${isActive
                                                ? (isFashion
                                                    ? 'bg-[#8B6914] text-white shadow-[0_0_20px_-3px_rgba(139,105,20,0.5)] border-2 border-[#8B6914]'
                                                    : 'bg-cyan-500 text-zinc-900 shadow-[0_0_20px_-3px_rgba(6,182,212,0.5)] border-2 border-cyan-400')
                                                : isCompleted
                                                    ? (isFashion
                                                        ? 'bg-[#8B6914]/15 text-[#8B6914] border-2 border-[#8B6914]/40'
                                                        : 'bg-cyan-500/15 text-cyan-400 border-2 border-cyan-500/40')
                                                    : (isFashion
                                                        ? 'bg-[#f5ede3] text-[#8B7355]/50 border-2 border-[#d4c4a8]/30'
                                                        : 'bg-zinc-800/60 text-zinc-600 border-2 border-zinc-700/40')
                                                }`}
                                        >
                                            {isCompleted ? <Check size={18} strokeWidth={3} /> : <Icon size={18} />}
                                        </div>
                                        <span className={`text-xs sm:text-sm font-semibold transition-colors ${isActive
                                            ? (isFashion ? 'text-[#8B6914]' : 'text-cyan-400')
                                            : isCompleted
                                                ? (isFashion ? 'text-[#8B6914]/70' : 'text-cyan-400/70')
                                                : (isFashion ? 'text-[#8B7355]/50' : 'text-zinc-600')
                                            }`}>
                                            {s.label}
                                        </span>
                                    </button>
                                </React.Fragment>
                            );
                        })}
                    </div>
                </div>

                {/* ── STEP 1: Cart ── */}
                {step === 'cart' && (
                    <>
                        {/* Header */}
                        <div className="flex items-center justify-between mb-8">
                            <h1 className={`text-2xl sm:text-3xl font-bold ${isFashion ? 'text-[#2d1810]' : 'text-zinc-100'}`}>
                                Your Cart <span className={`font-normal text-xl ${isFashion ? 'text-[#8B7355]' : 'text-zinc-500'}`}>({totalItems} item{totalItems !== 1 ? 's' : ''})</span>
                            </h1>
                            <button onClick={handleClearCart} className={`flex items-center gap-1.5 text-sm transition ${isFashion ? 'text-[#8B7355] hover:text-red-600' : 'text-zinc-500 hover:text-red-400'}`}>
                                <Trash2Icon size={15} /> Clear all
                            </button>
                        </div>

                        <div className="flex items-start justify-between gap-8 max-lg:flex-col">

                            {/* ── Cart Items ── */}
                            <div className="w-full max-w-4xl space-y-6">
                                {cartArray.map((item, index) => {
                                    const showCrossVendor = !isFashion && isPro;
                                    const suggestion = showCrossVendor ? crossVendorSuggestions[item.id] : undefined;
                                    const p = suggestion?.suggestedProduct;
                                    const isAIVerified = suggestion?.isAIVerified;
                                    const isLoadingThisItem = showCrossVendor && loadingSuggestions && suggestion === undefined;
                                    const avgRating = p?.rating?.length ? (p.rating.reduce((a, r) => a + (r.rating ?? 0), 0) / p.rating.length) : 0;
                                    const isBetterPrice = p && p.price < item.price;
                                    const isBetterRating = p && avgRating > (item.rating || 0);

                                    return (
                                        <div key={item.id} className="flex flex-col gap-2 relative">
                                            <div
                                                className={`rounded-2xl p-5 flex gap-5 items-start transition-all duration-300 relative z-10 ${isFashion
                                                    ? 'border border-[#d4c4a8]/30 bg-white hover:border-[#8B6914]/20 hover:shadow-[0_0_25px_-5px_rgba(139,105,20,0.08)]'
                                                    : 'border border-zinc-700/40 bg-zinc-900/40 hover:border-cyan-500/20 hover:shadow-[0_0_25px_-5px_rgba(6,182,212,0.12)]'
                                                    }`}
                                            >
                                                {/* Image with number badge */}
                                                <Link href={`${productBasePath}/${item.id}`} className="relative flex-shrink-0">
                                                    <div className={`w-24 h-24 sm:w-28 sm:h-28 rounded-xl flex items-center justify-center overflow-hidden ${isFashion ? 'bg-[#f5ede3] border border-[#d4c4a8]/30' : 'bg-zinc-800/60 border border-zinc-700/40'}`}>
                                                        <Image src={item.images[0]} alt={item.name} width={100} height={100} className="h-20 sm:h-24 w-auto object-contain" />
                                                    </div>
                                                    <span className={`absolute -top-2 -left-2 w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold text-white ${isFashion ? 'bg-[#8B6914]' : 'bg-cyan-500'}`}>
                                                        {index + 1}
                                                    </span>
                                                </Link>

                                                {/* Info */}
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-start justify-between gap-3">
                                                        <div className="min-w-0">
                                                            <span className={`inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md mb-1.5 ${item.type === 'fashion' ? 'bg-[#8B6914]/10 text-[#8B6914] border border-[#8B6914]/20' : 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                                                                }`}>
                                                                {item.category || (item.type === 'fashion' ? 'Fashion' : 'Electronics')}
                                                            </span>
                                                            <Link href={`${productBasePath}/${item.id}`}>
                                                                <h3 className={`text-base sm:text-lg font-semibold truncate transition ${isFashion ? 'text-[#2d1810] hover:text-[#8B6914]' : 'text-zinc-100 hover:text-white'}`}>{item.name}</h3>
                                                            </Link>
                                                        </div>
                                                        <button onClick={() => handleDeleteItemFromCart(item.id)} className={`flex-shrink-0 p-2 rounded-lg transition ${isFashion ? 'text-[#8B7355] hover:text-red-600 hover:bg-red-500/10' : 'text-zinc-500 hover:text-red-400 hover:bg-red-500/10'}`} aria-label="Remove">
                                                            <Trash2Icon size={16} />
                                                        </button>
                                                    </div>

                                                    <div className="flex flex-wrap items-center justify-between gap-4 mt-3">
                                                        <Counter productId={item.id} />
                                                        <div className="text-right">
                                                            {item.quantity > 1 && (
                                                                <p className={`text-xs ${isFashion ? 'text-[#8B7355]' : 'text-zinc-500'}`}>{currency}{item.price.toLocaleString()} each</p>
                                                            )}
                                                            <p className={`text-lg sm:text-xl font-bold ${isFashion ? 'text-[#2d1810]' : 'text-white'}`}>{currency}{(item.price * item.quantity).toLocaleString()}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Cross-vendor suggestion (electronics only) */}
                                            {showCrossVendor && isLoadingThisItem ? (
                                                <div className="ml-4 sm:ml-12 md:ml-16 mr-0 sm:mr-4 transition-all duration-300">
                                                    {/* Triangle pointer */}
                                                    <div className={`w-0 h-0 border-l-[8px] border-r-[8px] border-b-[8px] border-l-transparent border-r-transparent ml-8 mb-[-1px] relative z-0 ${isFashion ? 'border-b-[#d4c4a8]/30' : 'border-b-zinc-700/40'}`}>
                                                        <div className={`w-0 h-0 border-l-[7px] border-r-[7px] border-b-[7px] border-l-transparent border-r-transparent absolute -left-[7px] top-[2px] ${isFashion ? 'border-b-[#fafafa]' : 'border-b-[#111113]'}`}></div>
                                                    </div>

                                                    {/* Clean Text Container */}
                                                    <div className={`rounded-xl rounded-tl-none p-5 flex items-center justify-center border ${isFashion ? 'border-[#d4c4a8]/30 bg-[#fafafa]' : 'border-zinc-700/40 bg-[#111113]'}`}>
                                                        <p className={`text-base font-semibold animate-pulse ${isFashion ? 'text-[#8B6914]' : 'text-white'}`}>
                                                            AI is looking for any better option for this...
                                                        </p>
                                                    </div>
                                                </div>
                                            ) : showCrossVendor && p ? (
                                                <div className="ml-4 sm:ml-12 md:ml-16 mr-0 sm:mr-4 animate-in fade-in slide-in-from-top-2 duration-500 transition-all">
                                                    {/* Triangle pointer */}
                                                    <div className={`w-0 h-0 border-l-[8px] border-r-[8px] border-b-[8px] border-l-transparent border-r-transparent ml-8 mb-[-1px] relative z-0 ${isFashion ? 'border-b-[#8B6914]/40' : 'border-b-emerald-500/40'}`}>
                                                        <div className={`w-0 h-0 border-l-[7px] border-r-[7px] border-b-[7px] border-l-transparent border-r-transparent absolute -left-[7px] top-[2px] ${isFashion ? 'border-b-[#fcfbfa]' : 'border-b-[#0c1214]'}`}></div>
                                                    </div>
                                                    <div className={`rounded-xl rounded-tl-none p-4 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between border ${isFashion ? 'border-[#8B6914]/40 bg-[#fcfbfa] shadow-[0_4px_20px_-5px_rgba(139,105,20,0.1)]' : 'border-emerald-500/40 bg-[#0c1214] shadow-[0_4px_20px_-5px_rgba(16,185,129,0.1)]'}`}>

                                                        <div className="flex gap-4 items-center flex-1 min-w-0 w-full">
                                                            <Link href={`${productBasePath}/${p.id}`} className="flex-shrink-0">
                                                                <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-lg flex items-center justify-center overflow-hidden ${isFashion ? 'bg-[#f5ede3] border border-[#d4c4a8]/30' : 'bg-zinc-900 border border-zinc-800'}`}>
                                                                    {p.images?.[0] && <Image src={p.images[0]} alt="" width={64} height={64} className="h-10 sm:h-12 w-auto object-contain transition-transform hover:scale-110 duration-300" />}
                                                                </div>
                                                            </Link>
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex flex-wrap items-center gap-2 mb-1">
                                                                    <span className={`text-[10px] uppercase tracking-wider font-bold text-transparent bg-clip-text ${isFashion ? 'bg-gradient-to-r from-[#d97706] to-[#b45309]' : 'bg-gradient-to-r from-emerald-400 to-cyan-400'}`}>
                                                                        ✨ AI Suggestion
                                                                    </span>
                                                                    {isBetterPrice && (
                                                                        <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${isFashion ? 'bg-emerald-600/10 text-emerald-700' : 'bg-emerald-500/15 text-emerald-400'}`}>
                                                                            Save {((item.price - p.price) * item.quantity).toFixed(0)} {currency}
                                                                        </span>
                                                                    )}
                                                                    {isBetterRating && (
                                                                        <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider flex items-center gap-0.5 ${isFashion ? 'bg-amber-600/10 text-amber-700' : 'bg-amber-500/15 text-amber-400'}`}>
                                                                            Better Rating ★
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <Link href={`${productBasePath}/${p.id}`}>
                                                                    <h4 className={`text-sm sm:text-base font-semibold truncate transition ${isFashion ? 'text-[#2d1810] hover:text-[#8B6914]' : 'text-zinc-100 hover:text-emerald-400'}`}>{p.name}</h4>
                                                                </Link>
                                                                <div className="flex items-center gap-2 sm:gap-3 mt-0.5">
                                                                    <p className={`text-sm font-bold ${isFashion ? 'text-[#8B6914]' : 'text-emerald-400'}`}>{currency}{p.price}</p>
                                                                    <p className={`text-[11px] sm:text-xs ${isFashion ? 'text-[#8B7355]' : 'text-zinc-500'} truncate flex-1 min-w-[50px]`}>• {suggestion.reason || 'Better alternative from another vendor'}</p>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <button type="button" onClick={() => handleSwap(suggestion.cartItemId, p.id, item.quantity)}
                                                            className={`w-full sm:w-auto flex-shrink-0 flex items-center justify-center gap-2 px-4 py-2.5 sm:py-2 rounded-xl border transition-all active:scale-95 ${isFashion ? 'bg-[#8B6914] text-white border-transparent hover:bg-[#7a5c12] shadow-md shadow-[#8B6914]/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20 hover:border-emerald-500/50'
                                                                }`}>
                                                            <ArrowLeftRight size={16} /> <span className="text-sm font-bold">Swap</span>
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : null}
                                        </div>
                                    );
                                })}
                            </div>

                            {/* ── Order Summary Sidebar ── */}
                            <div className="w-full lg:w-[380px] lg:sticky lg:top-28 flex-shrink-0">
                                {/* Product thumbnails */}
                                <div className={`rounded-2xl p-6 ${isFashion ? 'border border-[#d4c4a8]/30 bg-white' : 'border border-zinc-700/40 bg-zinc-900/40'}`}>
                                    <h2 className={`text-lg font-bold mb-4 ${isFashion ? 'text-[#2d1810]' : 'text-zinc-100'}`}>Order Summary</h2>
                                    <div className="flex gap-2 mb-5 flex-wrap">
                                        {cartArray.slice(0, 5).map((item) => (
                                            <div key={item.id} className={`w-10 h-10 rounded-full flex items-center justify-center overflow-hidden ${isFashion ? 'bg-[#f5ede3] border border-[#d4c4a8]/30' : 'bg-zinc-800 border border-zinc-700/60'}`}>
                                                <Image src={item.images[0]} alt="" width={36} height={36} className="w-7 h-7 object-contain" />
                                            </div>
                                        ))}
                                        {cartArray.length > 5 && (
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-medium ${isFashion ? 'bg-[#f5ede3] border border-[#d4c4a8]/30 text-[#8B7355]' : 'bg-zinc-800 border border-zinc-700/60 text-zinc-400'}`}>
                                                +{cartArray.length - 5}
                                            </div>
                                        )}
                                    </div>

                                    <div className="space-y-2.5 text-sm">
                                        <div className={`flex justify-between ${isFashion ? 'text-[#8B7355]' : 'text-zinc-400'}`}>
                                            <span>Subtotal ({totalItems} items)</span>
                                            <span className={`font-medium ${isFashion ? 'text-[#2d1810]' : 'text-zinc-200'}`}>{currency}{totalPrice.toLocaleString()}</span>
                                        </div>
                                        <div className={`flex justify-between ${isFashion ? 'text-[#8B7355]' : 'text-zinc-400'}`}>
                                            <span>Shipping</span>
                                            <span className={`font-medium ${isFashion ? 'text-[#8B6914]' : 'text-emerald-400'}`}>Free</span>
                                        </div>
                                        <div className={`flex justify-between ${isFashion ? 'text-[#8B7355]' : 'text-zinc-400'}`}>
                                            <span>Tax</span>
                                            <span className={`font-medium ${isFashion ? 'text-[#2d1810]' : 'text-zinc-200'}`}>{currency}{(totalPrice * 0.08).toFixed(2)}</span>
                                        </div>
                                    </div>

                                    {totalPrice >= 200 && (
                                        <div className={`mt-4 flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium ${isFashion ? 'bg-[#8B6914]/10 text-[#8B6914] border border-[#8B6914]/20' : 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                                            }`}>
                                            <CheckCircle2 size={14} /> Free shipping on orders over {currency}200!
                                        </div>
                                    )}

                                    <div className={`flex justify-between items-center mt-5 pt-4 border-t ${isFashion ? 'border-[#d4c4a8]/30' : 'border-zinc-700/40'}`}>
                                        <span className={`text-base font-semibold ${isFashion ? 'text-[#2d1810]' : 'text-zinc-300'}`}>Total</span>
                                        <span className={`text-2xl font-bold ${isFashion ? 'text-[#2d1810]' : 'text-white'}`}>{currency}{(totalPrice + totalPrice * 0.08).toFixed(2)}</span>
                                    </div>

                                    {/* Proceed to Payment button */}
                                    <button
                                        onClick={() => setStep('payment')}
                                        className={`w-full mt-6 py-3.5 rounded-xl font-bold active:scale-[0.98] transition-all duration-200 shadow-lg flex items-center justify-center gap-2 cursor-pointer ${isFashion ? 'bg-[#8B6914] hover:bg-[#7a5c12] text-white shadow-[#8B6914]/20' : 'text-zinc-900 bg-cyan-400 hover:bg-cyan-300 shadow-cyan-500/20'}`}
                                    >
                                        Proceed to Payment <CreditCard size={18} />
                                    </button>
                                </div>
                            </div>
                        </div>


                    </>
                )}

                {/* ── STEP 2: Payment ── */}
                {step === 'payment' && (
                    <div className="max-w-xl mx-auto">
                        <button
                            type="button"
                            onClick={() => setStep('cart')}
                            className={`flex items-center gap-2 mb-6 text-sm font-medium transition cursor-pointer ${isFashion ? 'text-[#8B7355] hover:text-[#8B6914]' : 'text-zinc-400 hover:text-cyan-400'}`}
                        >
                            <ArrowLeft size={16} /> Back to Cart
                        </button>

                        <h1 className={`text-2xl sm:text-3xl font-bold mb-6 ${isFashion ? 'text-[#2d1810]' : 'text-zinc-100'}`}>
                            Complete Payment
                        </h1>

                        {/* Mini cart summary */}
                        <div className={`rounded-2xl p-5 mb-6 ${isFashion ? 'border border-[#d4c4a8]/30 bg-white' : 'border border-zinc-700/40 bg-zinc-900/40'}`}>
                            <div className="flex items-center gap-3 mb-3">
                                <div className="flex -space-x-2">
                                    {cartArray.slice(0, 4).map((item) => (
                                        <div key={item.id} className={`w-8 h-8 rounded-full flex items-center justify-center overflow-hidden ring-2 ${isFashion ? 'bg-[#f5ede3] ring-white' : 'bg-zinc-800 ring-zinc-900'}`}>
                                            <Image src={item.images[0]} alt="" width={28} height={28} className="w-6 h-6 object-contain" />
                                        </div>
                                    ))}
                                    {cartArray.length > 4 && (
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold ring-2 ${isFashion ? 'bg-[#f5ede3] ring-white text-[#8B7355]' : 'bg-zinc-800 ring-zinc-900 text-zinc-400'}`}>
                                            +{cartArray.length - 4}
                                        </div>
                                    )}
                                </div>
                                <span className={`text-sm ${isFashion ? 'text-[#8B7355]' : 'text-zinc-400'}`}>{totalItems} item{totalItems !== 1 ? 's' : ''}</span>
                                <span className={`ml-auto text-lg font-bold ${isFashion ? 'text-[#2d1810]' : 'text-white'}`}>{currency}{(totalPrice + totalPrice * 0.08).toFixed(2)}</span>
                            </div>
                        </div>

                        {/* OrderSummary with address, payment, coupon, place order */}
                        <OrderSummary totalPrice={totalPrice} items={cartArray} isFashion={isFashion} />
                    </div>
                )}

            </div>
        </div>
    );
}
