import prisma from "@/lib/prisma";
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import authAdmin from "@/middlewares/authAdmin";

/** POST: create or get conversation. One per vendor, shared by all admins. Admin: body { vendorId }. Vendor: body {} */
export async function POST(request) {
    try {
        const userId = getAuth(request).userId;
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const isAdmin = await authAdmin(userId);
        let vendorId;

        if (isAdmin) {
            const body = await request.json().catch(() => ({}));
            vendorId = typeof body.vendorId === "string" ? body.vendorId.trim() : null;
            if (!vendorId) {
                return NextResponse.json(
                    { error: "vendorId is required for admin" },
                    { status: 400 }
                );
            }
            const store = await prisma.store.findFirst({
                where: { userId: vendorId },
            });
            if (!store) {
                return NextResponse.json(
                    { error: "Vendor not found or not a store owner" },
                    { status: 400 }
                );
            }
        } else {
            vendorId = userId;
        }

        const existing = await prisma.conversation.findUnique({
            where: { vendorId },
            include: { _count: { select: { messages: true } } },
        });
        if (existing) {
            return NextResponse.json(existing);
        }

        const conversation = await prisma.conversation.create({
            data: { vendorId },
            include: { _count: { select: { messages: true } } },
        });
        return NextResponse.json(conversation);
    } catch (error) {
        console.error(error);
        return NextResponse.json(
            { error: error.message || "Server error" },
            { status: 500 }
        );
    }
}
