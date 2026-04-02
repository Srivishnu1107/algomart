import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

/**
 * GET: List coupons available to Pro members (public or forMember), by storeType.
 * Pro-only; returns electronics and fashion coupons separately, not expired.
 */
export async function GET() {
    try {
        const { userId } = getAuth();
        if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { isPro: true },
        });
        if (!user?.isPro) return NextResponse.json({ error: "Pro membership required" }, { status: 403 });

        const now = new Date();
        const coupons = await prisma.coupon.findMany({
            where: {
                expiresAt: { gt: now },
                OR: [{ isPublic: true }, { forMember: true }],
            },
            orderBy: { expiresAt: "asc" },
        });

        const electronics = coupons.filter((c) => c.storeType === "electronics");
        const fashion = coupons.filter((c) => c.storeType === "fashion");

        return NextResponse.json({
            electronics: electronics.map((c) => ({
                code: c.code,
                description: c.description,
                discount: c.discount,
                expiresAt: c.expiresAt.toISOString(),
            })),
            fashion: fashion.map((c) => ({
                code: c.code,
                description: c.description,
                discount: c.discount,
                expiresAt: c.expiresAt.toISOString(),
            })),
        });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
}
