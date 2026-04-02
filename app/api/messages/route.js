import prisma from "@/lib/prisma";
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import authAdmin from "@/middlewares/authAdmin";

const VALID_ROLES = ["admin", "vendor"];

export async function POST(request) {
    try {
        const { userId } = getAuth(request);
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        let body;
        try {
            body = await request.json();
        } catch {
            return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
        }

        const { conversationId, senderId, senderRole, content, type: conversationType, messageType } = body;
        const type = conversationType || "admin_vendor";

        if (type === "admin_admin") {
            if (!conversationId || !senderId || typeof content !== "string") {
                return NextResponse.json(
                    { error: "Missing required fields: conversationId, senderId, content" },
                    { status: 400 }
                );
            }
            const contentTrimmed = content.trim();
            if (!contentTrimmed) {
                return NextResponse.json({ error: "content must be non-empty" }, { status: 400 });
            }
            if (senderId !== userId) {
                return NextResponse.json({ error: "Forbidden" }, { status: 403 });
            }
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
            const message = await prisma.adminMessage.create({
                data: { conversationId, senderId, content: contentTrimmed },
            });
            await prisma.adminConversation.update({
                where: { id: conversationId },
                data: { lastMessageAt: message.createdAt },
            });
            return NextResponse.json(
                { id: message.id, conversationId, senderId, senderRole: "admin", content: message.content, createdAt: message.createdAt },
                { status: 201 }
            );
        }

        if (!conversationId || !senderId || typeof content !== "string") {
            return NextResponse.json(
                { error: "Missing required fields: conversationId, senderId, content" },
                { status: 400 }
            );
        }

        const contentTrimmed = content.trim();
        if (!contentTrimmed) {
            return NextResponse.json({ error: "content must be non-empty" }, { status: 400 });
        }

        if (senderId !== userId) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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
            const message = await prisma.vendorMessage.create({
                data: { conversationId, senderId, content: contentTrimmed },
            });
            await prisma.vendorConversation.update({
                where: { id: conversationId },
                data: { lastMessageAt: message.createdAt },
            });
            return NextResponse.json(
                { id: message.id, conversationId, senderId, senderRole: "vendor", content: message.content, createdAt: message.createdAt },
                { status: 201 }
            );
        }

        if (!senderRole || !VALID_ROLES.includes(senderRole)) {
            return NextResponse.json(
                { error: "senderRole (admin or vendor) is required for admin_vendor" },
                { status: 400 }
            );
        }

        const conversation = await prisma.conversation.findUnique({
            where: { id: conversationId },
        });

        if (!conversation) {
            return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
        }

        const isAdmin = await authAdmin(userId);
        const isParticipant = conversation.vendorId === userId || isAdmin;
        if (!isParticipant) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        if (senderRole === "admin" && !isAdmin) {
            return NextResponse.json(
                { error: "You must be an admin to send as admin" },
                { status: 403 }
            );
        }
        if (senderRole === "vendor" && conversation.vendorId !== userId) {
            return NextResponse.json(
                { error: "You can only send as vendor in your own conversation" },
                { status: 403 }
            );
        }

        const message = await prisma.message.create({
            data: {
                conversationId,
                senderId,
                senderRole,
                content: contentTrimmed,
                messageType: senderRole === "admin" && messageType === "warning" ? "warning" : "normal",
            },
        });
        await prisma.conversation.update({
            where: { id: conversationId },
            data: { lastMessageAt: message.createdAt },
        });

        return NextResponse.json(message, { status: 201 });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: error.message || "Server error" }, { status: 500 });
    }
}
