import prisma from "@/lib/prisma";
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

/** POST: Create or get a vendor-vendor conversation. Body: { otherVendorId } (Clerk user id of other store owner). */
export async function POST(request) {
    try {
        const userId = getAuth(request).userId;
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json().catch(() => ({}));
        const otherVendorId = typeof body.otherVendorId === "string" ? body.otherVendorId.trim() : null;
        if (!otherVendorId || otherVendorId === userId) {
            return NextResponse.json(
                { error: "otherVendorId is required and must be different from current user" },
                { status: 400 }
            );
        }

        const otherStore = await prisma.store.findFirst({
            where: { userId: otherVendorId, status: "approved" },
        });
        if (!otherStore) {
            return NextResponse.json(
                { error: "Other vendor not found or store not approved" },
                { status: 400 }
            );
        }

        const [vendor1Id, vendor2Id] = userId < otherVendorId ? [userId, otherVendorId] : [otherVendorId, userId];

        const existing = await prisma.vendorConversation.findUnique({
            where: { vendor1Id_vendor2Id: { vendor1Id, vendor2Id } },
            include: { _count: { select: { messages: true } } },
        });
        if (existing) {
            return NextResponse.json({ ...existing, type: "vendor_vendor" });
        }

        const conversation = await prisma.vendorConversation.create({
            data: { vendor1Id, vendor2Id },
            include: { _count: { select: { messages: true } } },
        });
        return NextResponse.json({ ...conversation, type: "vendor_vendor" });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: error.message || "Server error" }, { status: 500 });
    }
}
