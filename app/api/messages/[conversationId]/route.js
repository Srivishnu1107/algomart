import prisma from "@/lib/prisma";
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getSenderProfiles } from "@/lib/senderProfile";
import authAdmin from "@/middlewares/authAdmin";

export async function GET(request, { params }) {
    try {
        const { userId } = getAuth(request);
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { conversationId } = await params;
        const { searchParams } = new URL(request.url);
        const type = searchParams.get("type") || "admin_vendor";

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
            let hiddenAt = null;
            if (typeof prisma.hiddenConversation?.findUnique === "function") {
                try {
                    const hidden = await prisma.hiddenConversation.findUnique({
                        where: { userId_conversationId: { userId, conversationId } },
                        select: { hiddenAt: true },
                    });
                    if (hidden?.hiddenAt) hiddenAt = hidden.hiddenAt;
                } catch (_) {}
            }
            const whereClause = { conversationId };
            if (hiddenAt) whereClause.createdAt = { gt: hiddenAt };
            const messages = await prisma.adminMessage.findMany({
                where: whereClause,
                orderBy: { createdAt: "asc" },
            });
            const withRole = messages.map((m) => ({
                id: m.id,
                conversationId: m.conversationId,
                senderId: m.senderId,
                senderRole: "admin",
                content: m.content,
                createdAt: m.createdAt,
            }));
            const senderIds = [...new Set(withRole.map((m) => m.senderId))];
            const sendersMap = await getSenderProfiles(senderIds, {
                adminUserIds: [conv.admin1Id, conv.admin2Id],
            });
            const senders = Object.fromEntries(
                sendersMap.entries()
            );
            return NextResponse.json({ messages: withRole, senders });
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
            let hiddenAt = null;
            if (typeof prisma.hiddenConversation?.findUnique === "function") {
                try {
                    const hidden = await prisma.hiddenConversation.findUnique({
                        where: { userId_conversationId: { userId, conversationId } },
                        select: { hiddenAt: true },
                    });
                    if (hidden?.hiddenAt) hiddenAt = hidden.hiddenAt;
                } catch (_) {}
            }
            const whereClause = { conversationId };
            if (hiddenAt) whereClause.createdAt = { gt: hiddenAt };
            const messages = await prisma.vendorMessage.findMany({
                where: whereClause,
                orderBy: { createdAt: "asc" },
            });
            const withRole = messages.map((m) => ({
                id: m.id,
                conversationId: m.conversationId,
                senderId: m.senderId,
                senderRole: "vendor",
                content: m.content,
                createdAt: m.createdAt,
            }));
            const vendorIds = [conv.vendor1Id, conv.vendor2Id];
            const stores = await prisma.store.findMany({
                where: { userId: { in: vendorIds } },
                select: { userId: true, name: true, logo: true },
            });
            const storeByUserId = Object.fromEntries(stores.map((s) => [s.userId, s]));
            const vendorLabels = {};
            const vendorImageUrls = {};
            vendorIds.forEach((id) => {
                const store = storeByUserId[id];
                if (store) {
                    vendorLabels[id] = `${store.name} (Vendor)`;
                    vendorImageUrls[id] = store.logo || null;
                }
            });
            const senderIds = [...new Set(withRole.map((m) => m.senderId))];
            const sendersMap = await getSenderProfiles(senderIds, {
                vendorLabels,
                vendorImageUrls,
            });
            const senders = Object.fromEntries(sendersMap.entries());
            return NextResponse.json({ messages: withRole, senders });
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

        let hiddenAt = null;
        if (typeof prisma.hiddenConversation?.findUnique === "function") {
            try {
                const hidden = await prisma.hiddenConversation.findUnique({
                    where: { userId_conversationId: { userId, conversationId } },
                    select: { hiddenAt: true },
                });
                if (hidden?.hiddenAt) hiddenAt = hidden.hiddenAt;
            } catch (_) {}
        }
        const whereClause = { conversationId };
        if (hiddenAt) whereClause.createdAt = { gt: hiddenAt };
        const messages = await prisma.message.findMany({
            where: whereClause,
            orderBy: { createdAt: "asc" },
        });

        const vendorId = conversation.vendorId;
        const stores = await prisma.store.findMany({
            where: { userId: { in: [vendorId] } },
            select: { userId: true, name: true, logo: true },
        });
        const storeByUserId = Object.fromEntries(stores.map((s) => [s.userId, s]));
        const vendorLabels = {};
        const vendorImageUrls = {};
        const store = storeByUserId[vendorId];
        if (store) {
            vendorLabels[vendorId] = `${store.name} (Vendor)`;
            vendorImageUrls[vendorId] = store.logo || null;
        }
        const senderIds = [...new Set(messages.map((m) => m.senderId))];
        const adminUserIds = [...new Set(messages.filter((m) => m.senderRole === "admin").map((m) => m.senderId))];
        const sendersMap = await getSenderProfiles(senderIds, {
            adminUserIds,
            vendorLabels,
            vendorImageUrls,
        });
        const senders = Object.fromEntries(sendersMap.entries());

        return NextResponse.json({ messages, senders });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: error.message || "Server error" }, { status: 500 });
    }
}
