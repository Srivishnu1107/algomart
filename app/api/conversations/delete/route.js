import prisma from "@/lib/prisma";
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import authAdmin from "@/middlewares/authAdmin";

/** POST: Hide conversation from current user's list only (does not delete for the other participant). Body: { conversationId, type: 'admin_vendor' | 'vendor_vendor' | 'admin_admin' }. Caller must be a participant. When both participants have hidden, conversation is deleted permanently. */
export async function POST(request) {
    try {
        const userId = getAuth(request).userId;
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json().catch(() => ({}));
        const conversationId = typeof body.conversationId === "string" ? body.conversationId.trim() : null;
        const typeParam = body.type;
        const type = typeParam === "vendor_vendor" ? "vendor_vendor" : typeParam === "admin_admin" ? "admin_admin" : "admin_vendor";

        if (!conversationId) {
            return NextResponse.json({ error: "conversationId is required" }, { status: 400 });
        }

        if (typeof prisma.hiddenConversation?.upsert !== "function") {
            return NextResponse.json(
                { error: "Hide feature unavailable. Run: npx prisma generate && npx prisma db push" },
                { status: 503 }
            );
        }

        if (type === "vendor_vendor") {
            const conv = await prisma.vendorConversation.findUnique({
                where: { id: conversationId },
            });
            if (!conv) {
                return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
            }
            const isParticipant = conv.vendor1Id === userId || conv.vendor2Id === userId;
            if (!isParticipant) {
                return NextResponse.json({ error: "Forbidden" }, { status: 403 });
            }
            await prisma.hiddenConversation.upsert({
                where: {
                    userId_conversationId: { userId, conversationId },
                },
                create: { userId, conversationId, type, hiddenAt: new Date() },
                update: { hiddenAt: new Date(), type },
            });
            // If both vendors have hidden this conversation, delete it permanently
            const hiddenForConvo = await prisma.hiddenConversation.findMany({
                where: { conversationId, type: "vendor_vendor" },
                select: { userId: true },
            });
            const participantIds = new Set([conv.vendor1Id, conv.vendor2Id]);
            const hiddenUserIds = new Set(hiddenForConvo.map((h) => h.userId));
            const bothHidden = participantIds.size === hiddenUserIds.size && [...participantIds].every((id) => hiddenUserIds.has(id));
            if (bothHidden) {
                await prisma.hiddenConversation.deleteMany({ where: { conversationId } });
                await prisma.vendorConversation.delete({ where: { id: conversationId } });
            }
            return NextResponse.json({ deleted: true });
        }

        if (type === "admin_admin") {
            const conv = await prisma.adminConversation.findUnique({
                where: { id: conversationId },
            });
            if (!conv) {
                return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
            }
            const isParticipant = conv.admin1Id === userId || conv.admin2Id === userId;
            if (!isParticipant) {
                return NextResponse.json({ error: "Forbidden" }, { status: 403 });
            }
            await prisma.hiddenConversation.upsert({
                where: {
                    userId_conversationId: { userId, conversationId },
                },
                create: { userId, conversationId, type, hiddenAt: new Date() },
                update: { hiddenAt: new Date(), type },
            });
            const hiddenForConvo = await prisma.hiddenConversation.findMany({
                where: { conversationId, type: "admin_admin" },
                select: { userId: true },
            });
            const participantIds = new Set([conv.admin1Id, conv.admin2Id]);
            const hiddenUserIds = new Set(hiddenForConvo.map((h) => h.userId));
            const bothHidden = participantIds.size === hiddenUserIds.size && [...participantIds].every((id) => hiddenUserIds.has(id));
            if (bothHidden) {
                await prisma.hiddenConversation.deleteMany({ where: { conversationId } });
                await prisma.adminConversation.delete({ where: { id: conversationId } });
            }
            return NextResponse.json({ deleted: true });
        }

        const conv = await prisma.conversation.findUnique({
            where: { id: conversationId },
        });
        if (!conv) {
            return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
        }
        const isAdmin = await authAdmin(userId);
        const isParticipant = conv.vendorId === userId || isAdmin;
        if (!isParticipant) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
        await prisma.hiddenConversation.upsert({
            where: {
                userId_conversationId: { userId, conversationId },
            },
            create: { userId, conversationId, type, hiddenAt: new Date() },
            update: { hiddenAt: new Date(), type },
        });
        // Hide only for this user; never delete for the other side (vendor or admins still see it)
        return NextResponse.json({ deleted: true });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: error.message || "Server error" }, { status: 500 });
    }
}
