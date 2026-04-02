import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

/**
 * Update billing details (email, name, country) on Stripe Customer.
 * Used for "Edit" on manage-subscriptions. Requires existing Stripe customer.
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
                { error: "No billing account found. Add a payment method first." },
                { status: 400 }
            );
        }

        const body = await request.json();
        const { email, name, country } = body || {};

        const updateParams = {};
        if (typeof email === "string" && email.trim()) updateParams.email = email.trim();
        if (typeof name === "string" && name.trim()) updateParams.name = name.trim();
        if (typeof country === "string" && country.trim()) {
            const existing = await stripe.customers.retrieve(user.stripeCustomerId);
            const addr = (existing && !existing.deleted && existing.address) ? { ...existing.address } : {};
            addr.country = country.trim().toUpperCase().slice(0, 2);
            updateParams.address = addr;
        }

        if (Object.keys(updateParams).length === 0) {
            return NextResponse.json({ error: "Provide at least one of: email, name, country" }, { status: 400 });
        }

        await stripe.customers.update(user.stripeCustomerId, updateParams);

        return NextResponse.json({ updated: true, message: "Billing details updated." });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
}
