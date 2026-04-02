'use client'

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useUser, useAuth } from '@clerk/nextjs';
import { Crown, Loader2, Sparkles, CheckCircle2, Zap, Star, Shield, Calendar, ArrowLeftRight, Settings } from 'lucide-react';
import axios from 'axios';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

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
        return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
        return iso;
    }
};

const POLL_INTERVAL = 1500;
const MAX_POLLS = 12;

export default function ProPageClient() {
    const { user, isLoaded } = useUser();
    const { getToken } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const sessionId = searchParams.get('session_id');

    const [status, setStatus] = useState('verifying');
    const [isRetrying, setIsRetrying] = useState(false);
    const [proMemberSince, setProMemberSince] = useState(null);
    const [proExpiresAt, setProExpiresAt] = useState(null);
    const [portalLoading, setPortalLoading] = useState(false);
    const [removingPro, setRemovingPro] = useState(false);
    const [, setTick] = useState(0);

    const retryVerify = async () => {
        if (!sessionId) return;
        setIsRetrying(true);
        try {
            const token = await getToken();
            await axios.post('/api/user/verify-pro-session', { sessionId }, { headers: { Authorization: `Bearer ${token}` } });
            const res = await axios.get('/api/user/pro-status', { headers: { Authorization: `Bearer ${token}` } });
            if (res.data?.isPro) {
                setStatus('pro');
                setProMemberSince(res.data.proMemberSince || null);
                setProExpiresAt(res.data.proExpiresAt || null);
                if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('pro-status-updated'));
            }
        } catch (e) {
            // ignore
        } finally {
            setIsRetrying(false);
        }
    };

    useEffect(() => {
        if (!isLoaded || !user) return;
        let cancelled = false;
        let attempts = 0;
        const check = async () => {
            try {
                const token = await getToken();
                const res = await axios.get('/api/user/pro-status', { headers: { Authorization: `Bearer ${token}` } });
                if (cancelled) return;
                if (res.data?.isPro) {
                    setStatus('pro');
                    setProMemberSince(res.data?.proMemberSince || null);
                    setProExpiresAt(res.data?.proExpiresAt || null);
                    if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('pro-status-updated'));
                    return true;
                }
            } catch (e) {
                if (cancelled) return;
            }
            attempts++;
            if (attempts >= MAX_POLLS) {
                setStatus('timeout');
                return true;
            }
            return false;
        };
        const run = async () => {
            if (sessionId) {
                try {
                    const token = await getToken();
                    await axios.post('/api/user/verify-pro-session', { sessionId }, { headers: { Authorization: `Bearer ${token}` } });
                } catch (e) {}
                if (cancelled) return;
                if (await check()) return;
            } else {
                for (let i = 0; i < 4; i++) {
                    if (await check()) return;
                    if (cancelled) return;
                    await new Promise((r) => setTimeout(r, 300));
                }
                setStatus('timeout');
                return;
            }
            while (!(await check()) && !cancelled) {
                await new Promise((r) => setTimeout(r, POLL_INTERVAL));
            }
        };
        run();
        return () => { cancelled = true; };
    }, [isLoaded, user, sessionId, getToken]);

    const showSuccess = status === 'pro';
    const showTimeout = status === 'timeout' && sessionId;

    useEffect(() => {
        if (!isLoaded) return;
        if (!user) {
            router.replace('/pricing');
            return;
        }
        if (status === 'timeout' && !sessionId) {
            router.replace('/pricing');
        }
    }, [isLoaded, user, status, sessionId, router]);

    useEffect(() => {
        if (status !== 'pro' || !user) return;
        const load = async () => {
            try {
                const token = await getToken();
                const statusRes = await axios.get('/api/user/pro-status', { headers: { Authorization: `Bearer ${token}` } });
                setProMemberSince(statusRes.data?.proMemberSince || null);
                setProExpiresAt(statusRes.data?.proExpiresAt || null);
            } catch (e) {}
        };
        load();
    }, [status, user, getToken]);

    const handleManageBilling = async () => {
        setPortalLoading(true);
        try {
            const token = await getToken();
            const res = await axios.post('/api/user/stripe-portal', {}, { headers: { Authorization: `Bearer ${token}` } });
            if (res.data?.url && typeof window !== 'undefined') window.location.href = res.data.url;
            else router.push('/manage-subscriptions');
        } catch (e) {
            router.push('/manage-subscriptions');
        } finally {
            setPortalLoading(false);
        }
    };

    const handleRemoveProPlan = async () => {
        if (typeof window !== 'undefined' && !window.confirm('Remove your Pro plan? You will lose Pro access immediately and will not be charged again.')) return;
        setRemovingPro(true);
        try {
            const token = await getToken();
            await axios.post('/api/user/revoke-pro', {}, { headers: { Authorization: `Bearer ${token}` } });
            if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('pro-status-updated'));
            router.push('/pricing');
        } catch (e) {
            setRemovingPro(false);
        }
    };

    useEffect(() => {
        if (status !== 'pro' || !proExpiresAt) return;
        const interval = setInterval(() => setTick((t) => t + 1), 60 * 1000);
        return () => clearInterval(interval);
    }, [status, proExpiresAt]);

    return (
        <div className="min-h-screen flex flex-col bg-[#060814] selection:bg-cyan-500/30">
            <Navbar />
            <main className="flex-grow pt-28 pb-20 relative overflow-hidden flex flex-col items-center">
                <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[80%] h-[80%] max-w-4xl opacity-40 blur-[150px] pointer-events-none mix-blend-screen bg-gradient-to-r from-amber-500/20 via-yellow-500/10 to-cyan-500/20 z-0" />
                <div className={`w-full mx-auto px-4 z-10 ${showSuccess ? 'max-w-5xl' : 'max-w-2xl flex flex-col items-center justify-center min-h-[50vh]'}`}>
                    {status === 'verifying' && (
                        <div className="flex flex-col items-center justify-center space-y-4">
                            <Loader2 className="animate-spin text-amber-500 w-12 h-12" />
                            <p className="text-zinc-400 font-medium">Activating your Pro membership…</p>
                            <p className="text-zinc-500 text-sm">This usually takes a few seconds.</p>
                        </div>
                    )}
                    {showTimeout && (
                        <div className="text-center p-10 rounded-3xl bg-white/5 border border-amber-500/30 space-y-4">
                            <p className="text-zinc-300">Payment received. Your Pro status may take a moment to appear.</p>
                            <div className="flex flex-col sm:flex-row gap-3 justify-center">
                                <button onClick={retryVerify} disabled={isRetrying} className="px-6 py-3 rounded-xl font-semibold bg-amber-500/30 border border-amber-500/50 text-amber-200 hover:bg-amber-500/40 disabled:opacity-50 flex items-center justify-center gap-2">
                                    {isRetrying ? <Loader2 size={18} className="animate-spin" /> : null}
                                    {isRetrying ? 'Verifying…' : 'Verify my Pro status'}
                                </button>
                                <button onClick={() => router.push('/pricing')} className="px-6 py-3 rounded-xl font-semibold bg-white/10 border border-white/20 text-white hover:bg-white/15">
                                    Go to Pricing page
                                </button>
                            </div>
                        </div>
                    )}
                    {showSuccess && (
                        <div className="w-full max-w-5xl space-y-8">
                            {sessionId && (
                                <div className="text-center p-4 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-sm font-medium flex items-center justify-center gap-2">
                                    <CheckCircle2 size={18} /> Payment successful — welcome to goCart Pro!
                                </div>
                            )}
                            <div className="rounded-3xl border-2 border-amber-500/40 bg-gradient-to-b from-amber-950/40 via-[#1a150b] to-[#0a0804] shadow-[0_0_60px_-12px_rgba(234,179,8,0.2)] overflow-hidden">
                                <div className="p-8 md:p-10">
                                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                                        <div className="flex items-center gap-4">
                                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500/30 to-yellow-600/20 flex items-center justify-center border border-amber-500/30 shadow-[0_0_20px_-4px_rgba(234,179,8,0.25)]">
                                                <Crown size={36} className="text-amber-400" />
                                            </div>
                                            <div>
                                                <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500">Membership</h2>
                                                <p className="text-amber-200/90 text-sm font-medium mt-0.5">
                                                    Pro · {proExpiresAt ? (() => { const end = new Date(proExpiresAt).getTime(); const days = Math.max(0, Math.ceil((end - Date.now()) / (24 * 60 * 60 * 1000))); return days === 0 ? 'Expires today' : `${days} day${days !== 1 ? 's' : ''} left`; })() : '1 month'}
                                                </p>
                                                {proMemberSince && <p className="text-zinc-500 text-xs mt-1 flex items-center gap-1"><Calendar size={12} /> Member since {formatDate(proMemberSince)}</p>}
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap gap-3">
                                            <button onClick={handleManageBilling} disabled={portalLoading} className="px-5 py-2.5 rounded-xl font-semibold bg-white/10 border border-white/10 text-white hover:bg-white/15 transition-all flex items-center gap-2 disabled:opacity-50">
                                                {portalLoading ? <Loader2 size={16} className="animate-spin" /> : <Settings size={16} />}
                                                Manage
                                            </button>
                                            <button onClick={() => router.push('/shop')} className="px-5 py-2.5 rounded-xl font-semibold bg-amber-500/20 border border-amber-500/40 text-amber-300 hover:bg-amber-500/30 transition-all">
                                                Browse Products
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 md:p-8">
                                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><Star size={20} className="text-amber-400" /> Your Pro benefits</h3>
                                <ul className="grid sm:grid-cols-2 gap-3">
                                    {PRO_FEATURES.map(({ text, icon: Icon }, i) => (
                                        <li key={i} className="flex items-center gap-3 text-zinc-300"><Icon size={18} className="text-amber-400 flex-shrink-0" /><span>{text}</span></li>
                                    ))}
                                </ul>
                            </div>
                            <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
                                <h3 className="text-base font-semibold text-white mb-2">Remove pro plan</h3>
                                <p className="text-zinc-400 text-sm mb-4">End your Pro membership immediately. You will lose Pro access right away and will not be charged again.</p>
                                <button onClick={handleRemoveProPlan} disabled={removingPro} className="px-4 py-2.5 rounded-xl font-medium bg-red-500/20 border border-red-500/50 text-red-400 hover:bg-red-500/30 disabled:opacity-50 transition flex items-center gap-2">
                                    {removingPro ? <Loader2 size={18} className="animate-spin" /> : null}
                                    {removingPro ? 'Removing…' : 'Remove pro plan'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </main>
            <Footer />
        </div>
    );
}
