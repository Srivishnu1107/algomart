import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

/**
 * Cancel Pro subscription at period end. User keeps access until current period ends.
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

        if (!user?.stripeSubscriptionId) {
            return NextResponse.json({
                canceled: false,
                message: "Your plan is a one-time purchase. No recurring billing to cancel.",
            });
        }

        await stripe.subscriptions.update(user.stripeSubscriptionId, {
            cancel_at_period_end: true,
        });

        return NextResponse.json({
            canceled: true,
            message: "Subscription will not renew. You will keep Pro access until the end of your current billing period.",
        });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
}
