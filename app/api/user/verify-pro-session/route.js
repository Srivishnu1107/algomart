import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import prisma from "@/lib/prisma";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

/**
 * Verifies a Stripe Checkout session and upgrades the user to Pro if payment succeeded.
 * Used as fallback when webhook hasn't run yet (e.g. local dev, webhook delay).
 */
export async function POST(request) {
    try {
        const { userId } = getAuth(request);
        if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const body = await request.json();
        const sessionId = body?.sessionId || body?.session_id;
        if (!sessionId) {
            return NextResponse.json({ error: "Missing session_id" }, { status: 400 });
        }

        const session = await stripe.checkout.sessions.retrieve(sessionId);
        const metadata = session.metadata || {};
        const { appId, type, userId: metaUserId } = metadata;

        if (appId !== "gocart" || type !== "pro_membership" || metaUserId !== userId) {
            return NextResponse.json({ isPro: false, error: "Invalid session" }, { status: 400 });
        }

        if (session.payment_status !== "paid") {
            return NextResponse.json({ isPro: false, error: "Payment not completed" }, { status: 400 });
        }

        const amount = session.amount_total || 20000;
        const currency = (session.currency || "inr").toLowerCase();
        const now = new Date();
        let proExpiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 1 month fallback
        let stripeSubscriptionId = null;

        if (session.subscription && typeof session.subscription === "string") {
            const sub = await stripe.subscriptions.retrieve(session.subscription);
            const subMeta = sub.metadata || {};
            if (subMeta.appId === "gocart" && subMeta.type === "pro_membership" && subMeta.userId === userId) {
                stripeSubscriptionId = sub.id;
                if (sub.current_period_end) {
                    proExpiresAt = new Date(sub.current_period_end * 1000);
                }
            }
        }

        const existing = await prisma.user.findUnique({
            where: { id: userId },
            select: { proMemberSince: true },
        });
        const proMemberSince = existing?.proMemberSince ?? now;
        const stripeCustomerId = session.customer && typeof session.customer === "string" ? session.customer : null;
        const updateData = { isPro: true, proMemberSince, proExpiresAt };
        if (stripeCustomerId) updateData.stripeCustomerId = stripeCustomerId;
        if (stripeSubscriptionId) updateData.stripeSubscriptionId = stripeSubscriptionId;

        await prisma.$transaction([
            prisma.user.update({
                where: { id: userId },
                data: updateData,
            }),
            prisma.proPayment.upsert({
                where: { stripeSessionId: session.id },
                create: { userId, stripeSessionId: session.id, amount, currency },
                update: {},
            }),
        ]);

        return NextResponse.json({ isPro: true });
    } catch (error) {
        console.error("verify-pro-session:", error);
        return NextResponse.json({ error: error.message, isPro: false }, { status: 400 });
    }
}
