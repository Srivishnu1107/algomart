import prisma from "@/lib/prisma";
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

/**
 * GET ?storeType=electronics|fashion
 * Returns coupons available at checkout: public for everyone; for Pro users also forMember coupons.
 */
export async function GET(request) {
    try {
        const { userId } = getAuth(request);
        const { searchParams } = request.nextUrl;
        const storeType = searchParams.get("storeType") || "electronics";
        if (!["electronics", "fashion"].includes(storeType)) {
            return NextResponse.json({ error: "Invalid storeType" }, { status: 400 });
        }

        let isPro = false;
        if (userId) {
            const user = await prisma.user.findUnique({
                where: { id: userId },
                select: { isPro: true },
            });
            isPro = !!user?.isPro;
        }

        const now = new Date();
        const coupons = await prisma.coupon.findMany({
            where: {
                storeType,
                expiresAt: { gt: now },
                OR: [{ isPublic: true }, ...(isPro ? [{ forMember: true }] : [])],
            },
            orderBy: { expiresAt: "asc" },
            select: { code: true, description: true, discount: true, expiresAt: true, forMember: true },
        });

        const list = coupons.map((c) => ({
            code: c.code,
            description: c.description,
            discount: c.discount,
            expiresAt: c.expiresAt.toISOString(),
            forMember: c.forMember,
        }));

        return NextResponse.json({ coupons: list });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
}
