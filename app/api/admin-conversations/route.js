import prisma from "@/lib/prisma";
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import authAdmin from "@/middlewares/authAdmin";

/** POST: Create or get admin–admin conversation. Body: { otherAdminId }. Caller must be admin. */
export async function POST(request) {
    try {
        const userId = getAuth(request).userId;
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const isAdmin = await authAdmin(userId);
        if (!isAdmin) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const body = await request.json().catch(() => ({}));
        const otherAdminId = typeof body.otherAdminId === "string" ? body.otherAdminId.trim() : null;
        if (!otherAdminId) {
            return NextResponse.json({ error: "otherAdminId is required" }, { status: 400 });
        }
        if (otherAdminId === userId) {
            return NextResponse.json({ error: "Cannot start conversation with yourself" }, { status: 400 });
        }

        const [admin1Id, admin2Id] = userId < otherAdminId ? [userId, otherAdminId] : [otherAdminId, userId];

        const existing = await prisma.adminConversation.findUnique({
            where: { admin1Id_admin2Id: { admin1Id, admin2Id } },
            include: { _count: { select: { messages: true } } },
        });
        if (existing) {
            return NextResponse.json(existing);
        }

        const conversation = await prisma.adminConversation.create({
            data: { admin1Id, admin2Id },
            include: { _count: { select: { messages: true } } },
        });
        return NextResponse.json(conversation);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: error.message || "Server error" }, { status: 500 });
    }
}
