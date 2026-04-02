import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getAuth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function POST(request) {
    try {
        const { userId } = getAuth(request);
        if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (user?.isPro) {
            return NextResponse.json({ error: "Already a Pro member." }, { status: 400 })
        }

        const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            // Show card form first: hide Link so only debit/credit card is shown
            wallet_options: { link: { display: 'never' } },
            line_items: [
                {
                    price_data: {
                        currency: 'inr',
                        product_data: {
                            name: 'Pro Membership (1 month)',
                            description: '1 month of Pro on goCart: AI assistant, cross-vendor cart suggestions, exclusive deals, and more. Renews monthly.',
                        },
                        unit_amount: 200 * 100, // 200 INR in paise
                        recurring: {
                            interval: 'month',
                        },
                    },
                    quantity: 1,
                },
            ],
            mode: 'subscription',
            success_url: `${origin}/pro?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${origin}/pricing?canceled=true`,
            metadata: {
                appId: 'gocart',
                type: 'pro_membership',
                userId: userId,
            },
            subscription_data: {
                metadata: {
                    appId: 'gocart',
                    type: 'pro_membership',
                    userId: userId,
                },
            },
        });

        return NextResponse.json({ url: session.url });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
}
