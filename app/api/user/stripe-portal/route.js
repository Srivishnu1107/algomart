import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

/**
 * Create a Stripe Customer Portal session so the user can:
 * - Add or remove payment methods (cards)
 * - Set which card is used for the next auto renewal (default payment method)
 * - Update billing details
 * Stripe validates the card when it is used for renewal.
 */
export async function POST(request) {
    try {
        const { userId } = await getAuth(request);
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { stripeCustomerId: true },
        });

        if (!user?.stripeCustomerId) {
            return NextResponse.json(
                { error: "No billing account found. Subscribe to Pro first to manage payment methods." },
                { status: 400 }
            );
        }

        const origin = request.headers.get("origin") || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
        const returnUrl = `${origin}/manage-subscriptions`;

        const session = await stripe.billingPortal.sessions.create({
            customer: user.stripeCustomerId,
            return_url: returnUrl,
        });

        return NextResponse.json({ url: session.url });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
}
