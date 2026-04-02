import prisma from "@/lib/prisma";
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

/** DELETE: Permanently delete a message. Caller must be the sender. Query: type=admin_vendor|vendor_vendor */
export async function DELETE(request, { params }) {
    try {
        const userId = getAuth(request).userId;
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { conversationId, messageId } = await params;
        const { searchParams } = new URL(request.url);
        const type = searchParams.get("type") || "admin_vendor";

        if (type === "vendor_vendor") {
            const msg = await prisma.vendorMessage.findFirst({
                where: { id: messageId, conversationId },
                include: { conversation: true },
            });
            if (!msg) {
                return NextResponse.json({ error: "Message not found" }, { status: 404 });
            }
            if (msg.senderId !== userId) {
                return NextResponse.json({ error: "Forbidden" }, { status: 403 });
            }
            const wasLatest =
                msg.conversation.lastMessageAt &&
                new Date(msg.createdAt).getTime() === new Date(msg.conversation.lastMessageAt).getTime();

            await prisma.vendorMessage.delete({
                where: { id: messageId },
            });

            if (wasLatest) {
                const latest = await prisma.vendorMessage.findFirst({
                    where: { conversationId },
                    orderBy: { createdAt: "desc" },
                });
                await prisma.vendorConversation.update({
                    where: { id: conversationId },
                    data: { lastMessageAt: latest?.createdAt ?? null },
                });
            }

            return NextResponse.json({ deleted: true });
        }

        if (type === "admin_admin") {
            const msg = await prisma.adminMessage.findFirst({
                where: { id: messageId, conversationId },
                include: { conversation: true },
            });
            if (!msg) {
                return NextResponse.json({ error: "Message not found" }, { status: 404 });
            }
            if (msg.senderId !== userId) {
                return NextResponse.json({ error: "Forbidden" }, { status: 403 });
            }
            const wasLatest =
                msg.conversation.lastMessageAt &&
                new Date(msg.createdAt).getTime() === new Date(msg.conversation.lastMessageAt).getTime();

            await prisma.adminMessage.delete({
                where: { id: messageId },
            });

            if (wasLatest) {
                const latest = await prisma.adminMessage.findFirst({
                    where: { conversationId },
                    orderBy: { createdAt: "desc" },
                });
                await prisma.adminConversation.update({
                    where: { id: conversationId },
                    data: { lastMessageAt: latest?.createdAt ?? null },
                });
            }

            return NextResponse.json({ deleted: true });
        }

        const msg = await prisma.message.findFirst({
            where: { id: messageId, conversationId },
            include: { conversation: true },
        });
        if (!msg) {
            return NextResponse.json({ error: "Message not found" }, { status: 404 });
        }
        if (msg.senderId !== userId) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
        const wasLatest =
            msg.conversation.lastMessageAt &&
            new Date(msg.createdAt).getTime() === new Date(msg.conversation.lastMessageAt).getTime();

        await prisma.message.delete({
            where: { id: messageId },
        });

        if (wasLatest) {
            const latest = await prisma.message.findFirst({
                where: { conversationId },
                orderBy: { createdAt: "desc" },
            });
            await prisma.conversation.update({
                where: { id: conversationId },
                data: { lastMessageAt: latest?.createdAt ?? null },
            });
        }

        return NextResponse.json({ deleted: true });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: error.message || "Server error" }, { status: 500 });
    }
}
