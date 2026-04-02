import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function GET(request) {
    try {
        const { userId } = await getAuth(request);
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                isPro: true,
                proMemberSince: true,
                proExpiresAt: true,
                stripeCustomerId: true,
                stripeSubscriptionId: true,
            },
        });

        if (!user) {
            return NextResponse.json({ isPro: false, payments: [] });
        }

        const now = new Date();
        const isProValid = user.isPro && (!user.proExpiresAt || user.proExpiresAt > now);

        const payments = await prisma.proPayment.findMany({
            where: { userId },
            orderBy: { paidAt: "desc" },
            select: {
                id: true,
                amount: true,
                currency: true,
                paidAt: true,
                stripeSessionId: true,
            },
        });

        const paymentList = payments.map((p) => ({
            id: p.id,
            amount: p.amount / 100,
            currency: (p.currency || "inr").toUpperCase(),
            paidAt: p.paidAt.toISOString(),
        }));

        let card = null;
        let subscription = null;
        let billingDetails = null;

        // Billing details as entered on Stripe (email, cardholder name, country)
        const setBillingFromCustomer = (customer) => {
            if (!customer || customer.deleted) return;
            billingDetails = {
                email: customer.email || null,
                name: customer.name || null,
                country: customer.address?.country || null,
            };
        };
        const setBillingFromSessionDetails = (details) => {
            if (!details) return;
            billingDetails = {
                email: details.email || billingDetails?.email || null,
                name: details.name || billingDetails?.name || null,
                country: details.address?.country || billingDetails?.country || null,
            };
        };

        if (user.stripeSubscriptionId) {
            try {
                const sub = await stripe.subscriptions.retrieve(user.stripeSubscriptionId, {
                    expand: ["default_payment_method"],
                });
                subscription = {
                    status: sub.status,
                    cancelAtPeriodEnd: sub.cancel_at_period_end,
                    currentPeriodEnd: sub.current_period_end
                        ? new Date(sub.current_period_end * 1000).toISOString()
                        : null,
                };
                const pm = sub.default_payment_method;
                if (pm && typeof pm === "object" && pm.card) {
                    card = {
                        brand: pm.card.brand,
                        last4: pm.card.last4,
                        expMonth: pm.card.exp_month,
                        expYear: pm.card.exp_year,
                    };
                }
            } catch (e) {
                console.warn("Stripe subscription fetch failed:", e.message);
            }
        }
        if (user.stripeCustomerId) {
            try {
                const customer = await stripe.customers.retrieve(user.stripeCustomerId);
                setBillingFromCustomer(customer);
                if (!card && customer && !customer.deleted && customer.invoice_settings?.default_payment_method) {
                    const pmId = customer.invoice_settings.default_payment_method;
                    const pm = await stripe.paymentMethods.retrieve(pmId);
                    if (pm.card) {
                        card = {
                            brand: pm.card.brand,
                            last4: pm.card.last4,
                            expMonth: pm.card.exp_month,
                            expYear: pm.card.exp_year,
                        };
                    }
                }
            } catch (e) {
                console.warn("Stripe customer/payment method fetch failed:", e.message);
            }
        }
        // One-time or first payment: get card and/or billing details from latest Pro Checkout session
        if (paymentList.length > 0) {
            try {
                const latestPayment = payments[0];
                const session = await stripe.checkout.sessions.retrieve(latestPayment.stripeSessionId, {
                    expand: ["payment_intent.payment_method"],
                });
                if (session.customer_details) setBillingFromSessionDetails(session.customer_details);
                if (!card) {
                    const pi = session.payment_intent;
                    const pm = pi && typeof pi === "object" ? pi.payment_method : null;
                    if (pm && typeof pm === "object" && pm.card) {
                        card = {
                            brand: pm.card.brand,
                            last4: pm.card.last4,
                            expMonth: pm.card.exp_month,
                            expYear: pm.card.exp_year,
                        };
                    }
                }
            } catch (e) {
                console.warn("Stripe checkout session fetch failed:", e.message);
            }
        }

        const canUpdateBilling = !!user.stripeCustomerId;
        const canManagePaymentMethods = !!user.stripeCustomerId;

        return NextResponse.json({
            isPro: isProValid,
            proMemberSince: user.proMemberSince?.toISOString() ?? null,
            proExpiresAt: user.proExpiresAt?.toISOString() ?? null,
            payments: paymentList,
            card,
            subscription,
            billingDetails,
            canUpdateBilling,
            canManagePaymentMethods,
        });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
}
