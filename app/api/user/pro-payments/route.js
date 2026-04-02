import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
    try {
        const { userId } = getAuth();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const payments = await prisma.proPayment.findMany({
            where: { userId },
            orderBy: { paidAt: "desc" },
            select: {
                id: true,
                amount: true,
                currency: true,
                paidAt: true,
            },
        });

        const list = payments.map((p) => ({
            id: p.id,
            amount: p.amount / 100,
            currency: p.currency.toUpperCase(),
            paidAt: p.paidAt.toISOString(),
        }));

        return NextResponse.json({ payments: list });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
}
