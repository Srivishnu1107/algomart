'use client'

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useAuth } from '@clerk/nextjs';
import {
    CreditCard,
    Calendar,
    Receipt,
    Loader2,
    Shield,
    AlertCircle,
    Crown,
    ArrowLeft,
    User,
    Pencil,
    Check,
    X,
    ExternalLink,
} from 'lucide-react';
import axios from 'axios';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import Link from 'next/link';

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

const cardBrandLabel = (brand) => {
    if (!brand) return 'Card';
    const b = String(brand).toLowerCase();
    if (b === 'visa') return 'Visa';
    if (b === 'mastercard') return 'Mastercard';
    if (b === 'amex') return 'Amex';
    return brand.charAt(0).toUpperCase() + brand.slice(1);
};

export default function ManageSubscriptionsClient() {
    const { user, isLoaded } = useUser();
    const { getToken } = useAuth();
    const router = useRouter();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [canceling, setCanceling] = useState(false);
    const [message, setMessage] = useState(null);
    const [loadError, setLoadError] = useState(null);
    const [, setTick] = useState(0);
    const [editingDetails, setEditingDetails] = useState(false);
    const [savingDetails, setSavingDetails] = useState(false);
    const [portalLoading, setPortalLoading] = useState(false);
    const [editForm, setEditForm] = useState({ email: '', name: '', country: '' });

    // Redirect when not signed in — only in useEffect to avoid prerender issues
    useEffect(() => {
        if (!isLoaded) return;
        if (!user) {
            router.replace('/sign-in?redirect_url=/manage-subscriptions');
        }
    }, [isLoaded, user, router]);

    useEffect(() => {
        if (!isLoaded || !user) return;
        const load = async () => {
            setLoadError(null);
            try {
                const token = await getToken();
                const res = await axios.get('/api/user/subscription-details', {
                    headers: { Authorization: `Bearer ${token}` },
                });
                setData(res.data);
            } catch (e) {
                const status = e.response?.status;
                const errMsg = e.response?.data?.error || e.message;
                if (status === 401) {
                    router.replace('/sign-in?redirect_url=/manage-subscriptions');
                    return;
                }
                setData({ isPro: false, payments: [] });
                setLoadError(errMsg || 'Failed to load billing details. Please refresh the page.');
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [isLoaded, user, getToken, router]);

    useEffect(() => {
        if (!data?.isPro || !data?.proExpiresAt) return;
        const interval = setInterval(() => setTick((t) => t + 1), 60 * 1000);
        return () => clearInterval(interval);
    }, [data?.isPro, data?.proExpiresAt]);

    const handleStopAutoRenewal = async () => {
        if (typeof window !== 'undefined' && !window.confirm('Stop auto renewal? You will keep Pro access until the end of your current billing period and will not be charged again.')) return;
        setCanceling(true);
        setMessage(null);
        try {
            const token = await getToken();
            const res = await axios.post('/api/user/cancel-subscription', {}, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setMessage(res.data.message || (res.data.canceled ? 'Auto renewal stopped. You will keep Pro until the end of your billing period.' : res.data.message));
            if (res.data.canceled) {
                const detail = await axios.get('/api/user/subscription-details', {
                    headers: { Authorization: `Bearer ${token}` },
                });
                setData(detail.data);
                if (typeof window !== 'undefined') window.location.reload();
            }
        } catch (e) {
            setMessage(e.response?.data?.error || 'Something went wrong.');
        } finally {
            setCanceling(false);
        }
    };

    const startEditingDetails = () => {
        setEditForm({
            email: data?.billingDetails?.email || user?.primaryEmailAddress?.emailAddress || '',
            name: data?.billingDetails?.name || user?.fullName || [user?.firstName, user?.lastName].filter(Boolean).join(' ') || '',
            country: data?.billingDetails?.country || '',
        });
        setEditingDetails(true);
    };

    const handleSaveBillingDetails = async () => {
        setSavingDetails(true);
        setMessage(null);
        try {
            const token = await getToken();
            await axios.post('/api/user/update-billing-details', editForm, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setMessage('Billing details updated.');
            setEditingDetails(false);
            const res = await axios.get('/api/user/subscription-details', {
                headers: { Authorization: `Bearer ${token}` },
            });
            setData(res.data);
        } catch (e) {
            setMessage(e.response?.data?.error || 'Failed to update.');
        } finally {
            setSavingDetails(false);
        }
    };

    const handleManagePaymentMethods = async () => {
        setPortalLoading(true);
        setMessage(null);
        try {
            const token = await getToken();
            const res = await axios.post('/api/user/stripe-portal', {}, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.data?.url && typeof window !== 'undefined') window.location.href = res.data.url;
            else setMessage(res.data?.error || 'Could not open portal.');
        } catch (e) {
            setMessage(e.response?.data?.error || 'Could not open portal.');
        } finally {
            setPortalLoading(false);
        }
    };

    // During prerender or before auth is ready: show loading only (no router.replace in render)
    if (!isLoaded || !user) {
        return (
            <div className="min-h-screen flex flex-col bg-[#060814]">
                <Navbar />
                <main className="flex-grow flex items-center justify-center pt-28 pb-20">
                    <Loader2 className="animate-spin text-amber-500 w-10 h-10" />
                </main>
                <Footer />
            </div>
        );
    }

    if (loading) {
        return (
            <div className="min-h-screen flex flex-col bg-[#060814]">
                <Navbar />
                <main className="flex-grow flex items-center justify-center pt-28 pb-20">
                    <Loader2 className="animate-spin text-amber-500 w-10 h-10" />
                </main>
                <Footer />
            </div>
        );
    }

    const proExpiresAt = data?.proExpiresAt ? new Date(data.proExpiresAt) : null;
    const daysLeft = proExpiresAt
        ? Math.max(0, Math.ceil((proExpiresAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000)))
        : null;
    const hasRecurring = !!data?.subscription && !data.subscription.cancelAtPeriodEnd;

    return (
        <div className="min-h-screen flex flex-col bg-[#060814] selection:bg-cyan-500/30">
            <Navbar />
            <main className="flex-grow pt-28 pb-20 px-4">
                <div className="max-w-2xl mx-auto">
                    <Link
                        href="/pro"
                        className="inline-flex items-center gap-2 text-zinc-400 hover:text-white text-sm font-medium mb-8 transition"
                    >
                        <ArrowLeft size={18} /> Back to membership
                    </Link>

                    <h1 className="text-2xl font-bold text-white mb-2">Billing & subscription</h1>
                    <p className="text-zinc-400 text-sm mb-8">Manage your Pro plan and payment details.</p>

                    {/* Your details (as entered on Stripe at purchase) */}
                    <section className="rounded-2xl border border-white/10 bg-white/5 p-6 mb-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-base font-semibold text-white flex items-center gap-2">
                                <User size={18} className="text-amber-400" />
                                Your details
                            </h2>
                            {data?.canUpdateBilling && !editingDetails && (
                                <button
                                    type="button"
                                    onClick={startEditingDetails}
                                    className="text-sm font-medium text-amber-400 hover:text-amber-300 flex items-center gap-1.5 transition"
                                >
                                    <Pencil size={14} /> Edit
                                </button>
                            )}
                        </div>
                        <p className="text-zinc-500 text-xs mb-3">Contact and billing information from your purchase.</p>
                        {editingDetails ? (
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-zinc-500 text-xs font-medium mb-1">Email</label>
                                    <input
                                        type="email"
                                        value={editForm.email}
                                        onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
                                        className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2.5 text-white text-sm placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                                        placeholder="email@example.com"
                                    />
                                </div>
                                <div>
                                    <label className="block text-zinc-500 text-xs font-medium mb-1">Cardholder name</label>
                                    <input
                                        type="text"
                                        value={editForm.name}
                                        onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                                        className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2.5 text-white text-sm placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                                        placeholder="Full name on card"
                                    />
                                </div>
                                <div>
                                    <label className="block text-zinc-500 text-xs font-medium mb-1">Country or region (e.g. IN, US)</label>
                                    <input
                                        type="text"
                                        value={editForm.country}
                                        onChange={(e) => setEditForm((f) => ({ ...f, country: e.target.value.toUpperCase().slice(0, 2) }))}
                                        className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2.5 text-white text-sm placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                                        placeholder="IN"
                                    />
                                </div>
                                <div className="flex gap-2 pt-1">
                                    <button
                                        type="button"
                                        onClick={handleSaveBillingDetails}
                                        disabled={savingDetails}
                                        className="px-4 py-2 rounded-xl font-medium bg-amber-500/20 border border-amber-500/40 text-amber-400 hover:bg-amber-500/30 disabled:opacity-50 flex items-center gap-2"
                                    >
                                        {savingDetails ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                                        Save
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setEditingDetails(false)}
                                        className="px-4 py-2 rounded-xl font-medium border border-white/20 text-zinc-400 hover:bg-white/5 flex items-center gap-2"
                                    >
                                        <X size={16} /> Cancel
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <dl className="grid gap-3 text-sm">
                                <div className="flex justify-between items-center">
                                    <dt className="text-zinc-500">Email</dt>
                                    <dd className="text-white font-medium">
                                        {data?.billingDetails?.email || user?.primaryEmailAddress?.emailAddress || '—'}
                                    </dd>
                                </div>
                                <div className="flex justify-between items-center">
                                    <dt className="text-zinc-500">Cardholder name</dt>
                                    <dd className="text-white font-medium">
                                        {data?.billingDetails?.name || user?.fullName || [user?.firstName, user?.lastName].filter(Boolean).join(' ') || '—'}
                                    </dd>
                                </div>
                                <div className="flex justify-between items-center">
                                    <dt className="text-zinc-500">Country or region</dt>
                                    <dd className="text-white font-medium">
                                        {data?.billingDetails?.country ? (() => {
                                            try {
                                                const regionNames = new Intl.DisplayNames(['en'], { type: 'region' });
                                                return regionNames.of(data.billingDetails.country.toUpperCase()) || data.billingDetails.country;
                                            } catch {
                                                return data.billingDetails.country;
                                            }
                                        })() : '—'}
                                    </dd>
                                </div>
                            </dl>
                        )}
                    </section>

                    {loadError && (
                        <div className="mb-6 p-4 rounded-xl flex items-start gap-3 bg-red-500/10 border border-red-500/30 text-red-200">
                            <AlertCircle size={20} className="flex-shrink-0 mt-0.5" />
                            <p className="text-sm">{loadError}</p>
                        </div>
                    )}

                    {message && (
                        <div className={`mb-6 p-4 rounded-xl flex items-start gap-3 ${message.includes('one-time') ? 'bg-amber-500/10 border border-amber-500/30 text-amber-200' : 'bg-green-500/10 border border-green-500/30 text-green-300'}`}>
                            <AlertCircle size={20} className="flex-shrink-0 mt-0.5" />
                            <p className="text-sm">{message}</p>
                        </div>
                    )}

                    {/* Plan summary */}
                    <section className="rounded-2xl border border-white/10 bg-white/5 p-6 mb-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
                                <Crown size={24} className="text-amber-400" />
                            </div>
                            <div>
                                <h2 className="text-lg font-semibold text-white">Pro plan</h2>
                                <p className="text-zinc-500 text-sm">
                                    {data?.isPro
                                        ? daysLeft !== null
                                            ? `${daysLeft} day${daysLeft !== 1 ? 's' : ''} left in current period`
                                            : 'Active'
                                        : 'Inactive'}
                                </p>
                            </div>
                        </div>
                        <dl className="grid gap-3 text-sm">
                            {data?.proExpiresAt && (
                                <>
                                    <div className="flex justify-between">
                                        <dt className="text-zinc-500">Period ends</dt>
                                        <dd className="text-white font-medium">{formatDate(data.proExpiresAt)}</dd>
                                    </div>
                                    {daysLeft !== null && (
                                        <div className="flex justify-between">
                                            <dt className="text-zinc-500">Days remaining</dt>
                                            <dd className="text-amber-400 font-medium">{daysLeft}</dd>
                                        </div>
                                    )}
                                </>
                            )}
                            {data?.proMemberSince && (
                                <div className="flex justify-between">
                                    <dt className="text-zinc-500 flex items-center gap-1.5">
                                        <Calendar size={14} /> Member since
                                    </dt>
                                    <dd className="text-white font-medium">{formatDate(data.proMemberSince)}</dd>
                                </div>
                            )}
                            {hasRecurring && (
                                <p className="text-zinc-500 text-xs pt-2 border-t border-white/5 mt-2">
                                    Stripe will charge your default payment method before the period ends. If the card is invalid or the charge fails after retries, your subscription will end and you will revert to the free plan.
                                </p>
                            )}
                        </dl>
                    </section>

                    {/* Payment method */}
                    <section className="rounded-2xl border border-white/10 bg-white/5 p-6 mb-6">
                        <h2 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
                            <CreditCard size={18} className="text-amber-400" />
                            Payment method
                        </h2>
                        {data?.card ? (
                            <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-7 rounded bg-zinc-700 flex items-center justify-center text-xs font-medium text-zinc-300">
                                        {cardBrandLabel(data.card.brand)}
                                    </div>
                                    <span className="text-white font-mono">•••• •••• •••• {data.card.last4}</span>
                                </div>
                                <span className="text-zinc-500 text-sm">
                                    Expires {String(data.card.expMonth).padStart(2, '0')}/{data.card.expYear}
                                </span>
                            </div>
                        ) : (
                            <p className="text-zinc-500 text-sm">No payment method on file. You purchased with a one-time payment.</p>
                        )}
                        {data?.canManagePaymentMethods && (
                            <button
                                type="button"
                                onClick={handleManagePaymentMethods}
                                disabled={portalLoading}
                                className="mt-4 px-4 py-2.5 rounded-xl font-medium border border-amber-500/40 text-amber-400 hover:bg-amber-500/10 disabled:opacity-50 transition flex items-center gap-2"
                            >
                                {portalLoading ? <Loader2 size={18} className="animate-spin" /> : <ExternalLink size={18} />}
                                {portalLoading ? 'Opening…' : 'Add, remove or set default card for renewal'}
                            </button>
                        )}
                        <p className="flex items-center gap-2 text-zinc-500 text-xs mt-3">
                            <Shield size={12} /> Payment data is handled securely by Stripe. Your card is verified by Stripe at each renewal; if the charge fails, Pro access will end.
                        </p>
                    </section>

                    {/* Payment history */}
                    <section className="rounded-2xl border border-white/10 bg-white/5 p-6 mb-6">
                        <h2 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
                            <Receipt size={18} className="text-amber-400" />
                            Payment history
                        </h2>
                        {data?.payments?.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="text-zinc-500 border-b border-white/10">
                                            <th className="text-left py-3 font-medium">Date</th>
                                            <th className="text-left py-3 font-medium">Description</th>
                                            <th className="text-right py-3 font-medium">Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {data.payments.map((p) => (
                                            <tr key={p.id} className="border-b border-white/5">
                                                <td className="py-3 text-zinc-300">{formatDate(p.paidAt)}</td>
                                                <td className="py-3 text-zinc-300">Pro membership</td>
                                                <td className="py-3 text-right text-white font-medium">₹{p.amount} {p.currency}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <p className="text-zinc-500 text-sm">No payments yet.</p>
                        )}
                    </section>

                    {/* Stop auto renewal */}
                    {hasRecurring && (
                        <section className="rounded-2xl border border-white/10 bg-white/5 p-6 mb-6">
                            <h2 className="text-base font-semibold text-white mb-2">Stop auto renewal</h2>
                            <p className="text-zinc-400 text-sm mb-4">
                                Stop automatic renewal. You will keep Pro access until the end of your current billing period and will not be charged again.
                            </p>
                            <button
                                onClick={handleStopAutoRenewal}
                                disabled={canceling}
                                className="px-4 py-2.5 rounded-xl font-medium border border-amber-500/40 text-amber-400 hover:bg-amber-500/10 disabled:opacity-50 transition flex items-center gap-2"
                            >
                                {canceling ? <Loader2 size={18} className="animate-spin" /> : null}
                                {canceling ? 'Updating…' : 'Stop auto renewal'}
                            </button>
                        </section>
                    )}

                </div>
            </main>
            <Footer />
        </div>
    );
}
