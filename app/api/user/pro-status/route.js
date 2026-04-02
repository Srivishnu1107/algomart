import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request) {
    try {
        const { userId } = getAuth(request)
        if (!userId) {
            return NextResponse.json({ isPro: false })
        }

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { isPro: true, proMemberSince: true, proExpiresAt: true }
        });

        if (!user) {
            return NextResponse.json({ isPro: false })
        }

        const now = new Date();
        const isProValid = user.isPro && (!user.proExpiresAt || user.proExpiresAt > now);

        return NextResponse.json({
            isPro: isProValid,
            proMemberSince: user.proMemberSince?.toISOString() ?? null,
            proExpiresAt: user.proExpiresAt?.toISOString() ?? null
        })
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: error.code || error.message }, { status: 400 })
    }
}
