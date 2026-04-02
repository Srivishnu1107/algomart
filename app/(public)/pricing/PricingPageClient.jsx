'use client'

import React, { useState, useEffect } from 'react';
import { useUser, useAuth } from '@clerk/nextjs';
import { useRouter, useSearchParams } from 'next/navigation';
import {
    CheckCircle2,
    Crown,
    Zap,
    Shield,
    Sparkles,
    Star,
    Loader2,
    CreditCard,
    Calendar,
    Receipt,
    Lock,
    ChevronDown,
    ChevronUp,
    ArrowLeftRight,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import axios from 'axios';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

const FREE_FEATURES = [
    'Access to global product catalog',
    'Basic Search & Filtering',
    'Standard Support',
    'Standard Shopping Cart',
];

const PRO_FEATURES = [
    { text: 'Everything in Essential', icon: CheckCircle2 },
    { text: 'Golden PRO Badge on Profile', icon: Crown },
    { text: 'Advanced AI Shopping Assistant', icon: Sparkles },
    { text: 'Cross-vendor cart suggestions', icon: ArrowLeftRight },
    { text: 'Priority Customer Support', icon: Shield },
    { text: 'Early Access to Big Sales', icon: Zap },
    { text: 'Exclusive Pro-only Discounts', icon: Star },
];

const formatDate = (iso) => {
    try {
        return new Date(iso).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
        });
    } catch {
        return iso;
    }
};

const PricingPageClient = () => {
    const { user, isLoaded } = useUser();
    const { getToken } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();

    const [isPro, setIsPro] = useState(false);
    const [proMemberSince, setProMemberSince] = useState(null);
    const [payments, setPayments] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isProcessingCheckout, setIsProcessingCheckout] = useState(false);
    const [showPaymentHistory, setShowPaymentHistory] = useState(false);

    const loadData = async () => {
        if (!user) {
            setIsLoading(false);
            return;
        }
        try {
            const token = await getToken();
            const [statusRes, paymentsRes] = await Promise.all([
                axios.get('/api/user/pro-status', { headers: { Authorization: `Bearer ${token}` } }),
                axios.get('/api/user/pro-payments', { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: { payments: [] } })),
            ]);
            setIsPro(!!statusRes.data.isPro);
            setProMemberSince(statusRes.data.proMemberSince || null);
            setPayments(paymentsRes.data?.payments || []);
        } catch (error) {
            console.error('Failed to fetch status', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (isLoaded) loadData();
    }, [user, isLoaded, getToken]);

    const handleCheckout = async () => {
        if (!user) {
            router.push('/sign-in?redirect_url=/pricing');
            return;
        }
        setIsProcessingCheckout(true);
        try {
            const token = await getToken();
            const response = await axios.post('/api/stripe/checkout-pro', {}, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (response.data.url && typeof window !== 'undefined') {
                window.location.href = response.data.url;
            } else {
                toast.error('Failed to initialize checkout');
                setIsProcessingCheckout(false);
            }
        } catch (error) {
            console.error('Checkout error:', error);
            toast.error('An error occurred during checkout');
            setIsProcessingCheckout(false);
        }
    };

    const canceled = searchParams.get('canceled') === 'true';

    return (
        <div className="min-h-screen flex flex-col bg-[#060814] selection:bg-cyan-500/30">
            <Navbar />

            <main className="flex-grow pt-28 pb-20 relative overflow-hidden">
                <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[80%] h-[80%] max-w-4xl opacity-40 blur-[150px] pointer-events-none mix-blend-screen bg-gradient-to-r from-yellow-500/20 via-amber-500/10 to-cyan-500/20 z-0" />

                <div className="max-w-5xl w-full mx-auto px-4 z-10 relative">
                    {/* Header */}
                    <div className="text-center mb-12 space-y-4">
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-400 text-sm font-semibold tracking-wide uppercase">
                            <Sparkles size={16} /> Plans & Membership
                        </div>
                        {!isLoading && (
                            <p className="text-zinc-500 text-sm font-medium">
                                Your current plan: <span className={isPro ? 'text-amber-400 font-semibold' : 'text-zinc-400'}>{isPro ? 'Pro' : 'Essential (Free)'}</span>
                            </p>
                        )}
                        <h1 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight">
                            goCart <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500">Pro</span> & Free
                        </h1>
                        <p className="text-zinc-400 text-lg max-w-xl mx-auto">
                            Choose the plan that fits you. Pro renews monthly — cancel anytime.
                        </p>
                    </div>

                    {canceled && (
                        <div className="mb-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-center text-sm">
                            Checkout was cancelled. You can upgrade anytime from below.
                        </div>
                    )}

                    {isLoading ? (
                        <div className="flex justify-center items-center min-h-[320px]">
                            <Loader2 className="animate-spin text-amber-500 w-12 h-12" />
                        </div>
                    ) : (
                        /* ——— Plans (Free vs Pro) ——— same layout for everyone; current plan points to Pro when isPro ——— */
                        <div className="grid md:grid-cols-2 gap-6 lg:gap-8 max-w-4xl mx-auto items-stretch">
                            {/* Free */}
                            <div className="relative p-6 md:p-8 rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl flex flex-col">
                                <h3 className="text-xl font-bold text-white mb-1">Essential</h3>
                                <div className="flex items-baseline gap-1 mb-4">
                                    <span className="text-4xl font-extrabold text-white">₹0</span>
                                    <span className="text-zinc-500">/ forever</span>
                                </div>
                                <p className="text-sm text-zinc-400 mb-6">Everything you need to start shopping.</p>
                                <ul className="space-y-3 mb-8 flex-grow">
                                    {FREE_FEATURES.map((f, i) => (
                                        <li key={i} className="flex items-center gap-3 text-zinc-300 text-sm">
                                            <CheckCircle2 size={18} className="text-cyan-400 flex-shrink-0" />
                                            {f}
                                        </li>
                                    ))}
                                </ul>
                                <div className="py-4 rounded-xl border border-white/10 bg-white/5 text-center text-sm font-medium text-zinc-500">
                                    {!isPro && 'Current plan'}
                                </div>
                            </div>

                            {/* Pro */}
                            <div className="relative p-6 md:p-8 rounded-3xl border-2 border-amber-500/40 bg-gradient-to-b from-amber-950/30 to-[#0a0804] backdrop-blur-xl flex flex-col shadow-[0_0_40px_-10px_rgba(234,179,8,0.15)] md:-translate-y-2">
                                <div className="absolute top-0 right-6 -translate-y-1/2 px-3 py-1.5 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 text-black text-xs font-bold flex items-center gap-1.5">
                                    <Crown size={12} /> 1 MONTH
                                </div>
                                <h3 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-amber-500 mb-1">
                                    Pro Member
                                </h3>
                                <div className="flex items-baseline gap-1 mb-4">
                                    <span className="text-4xl font-extrabold text-white">₹200</span>
                                    <span className="text-zinc-400">/month</span>
                                </div>
                                <p className="text-sm text-amber-200/80 mb-6">Pro benefits, renews monthly. Cancel anytime.</p>
                                <ul className="space-y-3 mb-8 flex-grow">
                                    {PRO_FEATURES.map(({ text, icon: Icon }, i) => (
                                        <li key={i} className="flex items-center gap-3 text-zinc-100 text-sm">
                                            <Icon size={18} className="text-amber-400 flex-shrink-0" />
                                            {text}
                                        </li>
                                    ))}
                                </ul>
                                {isPro ? (
                                    <>
                                        <div className="py-4 rounded-xl border border-amber-500/30 bg-amber-500/10 text-center text-amber-300 text-sm font-semibold">
                                            Current plan
                                        </div>
                                        <button
                                            onClick={() => router.push('/pro')}
                                            className="mt-3 w-full py-3 rounded-xl font-semibold bg-white/10 border border-white/20 text-white hover:bg-white/15 transition-all"
                                        >
                                            View membership
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <button
                                            onClick={handleCheckout}
                                            disabled={isProcessingCheckout}
                                            className={`w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${
                                                isProcessingCheckout
                                                    ? 'bg-amber-700/80 text-amber-200 cursor-not-allowed'
                                                    : 'bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 text-black hover:from-amber-300 hover:to-amber-500 shadow-[0_0_20px_-4px_rgba(234,179,8,0.3)]'
                                            }`}
                                        >
                                            {isProcessingCheckout ? (
                                                <><Loader2 size={18} className="animate-spin" /> Processing…</>
                                            ) : (
                                                <>Upgrade to Pro <Zap size={18} /></>
                                            )}
                                        </button>
                                        <p className="mt-3 flex items-center justify-center gap-1.5 text-zinc-500 text-xs">
                                            <Lock size={12} /> Secure payment via Stripe
                                        </p>
                                    </>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </main>

            <Footer />
        </div>
    );
};

export default PricingPageClient;
