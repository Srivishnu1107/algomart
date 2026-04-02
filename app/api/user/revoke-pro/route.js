import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

/**
 * Cancel Pro subscription immediately on Stripe (so it shows as ended on billing.stripe / Customer Portal)
 * and revert user to free. User loses Pro access right away.
 */
export async function POST(request) {
    try {
        const { userId } = await getAuth(request);
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { stripeSubscriptionId: true },
        });

        if (user?.stripeSubscriptionId) {
            try {
                // End subscription on Stripe immediately so it appears canceled on billing.stripe / Customer Portal
                await stripe.subscriptions.cancel(user.stripeSubscriptionId);
            } catch (e) {
                // Already canceled or missing: fine. Other errors: log but still revert user in DB
                if (e.code !== "resource_missing" && e.code !== "resource_already_canceled" && e.statusCode !== 404) {
                    console.error("Stripe subscription cancel failed:", e.message);
                }
            }
        }

        await prisma.user.update({
            where: { id: userId },
            data: {
                isPro: false,
                proExpiresAt: null,
                stripeSubscriptionId: null,
            },
        });

        return NextResponse.json({
            revoked: true,
            message: "Subscription canceled. You have been reverted to the free plan.",
        });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
}
