import prisma from "@/lib/prisma";
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import authAdmin from "@/middlewares/authAdmin";
import { clerkClient } from "@clerk/nextjs/server";

export async function GET(request, { params }) {
    try {
        const { userId: authUserId } = getAuth(request);
        if (!authUserId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { userId } = await params;
        if (userId !== authUserId) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const isAdminUser = await authAdmin(userId);

        // Admin–vendor: one conversation per vendor, shared by all admins. Admin sees all; vendor sees only their own.
        const adminVendorWhere = isAdminUser ? {} : { vendorId: userId };
        const conversations = await prisma.conversation.findMany({
            where: adminVendorWhere,
            orderBy: [{ lastMessageAt: "desc" }, { createdAt: "desc" }],
            include: {
                _count: { select: { messages: true } },
            },
        });

        // Only show conversations that have at least one message (chat appears after first message sent)
        const conversationsWithMessages = conversations.filter((c) => (c._count?.messages ?? 0) > 0);

        // Exclude hidden conversations unless there's a new message after hiddenAt (then show again, messages API will filter to only messages after hiddenAt)
        let hiddenMap = new Map(); // key "conversationId:type" -> hiddenAt
        if (typeof prisma.hiddenConversation?.findMany === "function") {
            try {
                const hidden = await prisma.hiddenConversation.findMany({
                    where: { userId },
                    select: { conversationId: true, type: true, hiddenAt: true },
                });
                hidden.forEach((h) => hiddenMap.set(`${h.conversationId}:${h.type}`, h.hiddenAt));
            } catch (_) {
                // table may not exist yet
            }
        }
        const isVisible = (id, type, lastMessageAt) => {
            const key = `${id}:${type}`;
            const hiddenAt = hiddenMap.get(key);
            if (!hiddenAt) return true;
            if (!lastMessageAt) return false;
            return new Date(lastMessageAt) > new Date(hiddenAt);
        };
        const adminVendorFiltered = conversationsWithMessages.filter((c) =>
            isVisible(c.id, "admin_vendor", c.lastMessageAt ?? c.createdAt)
        );

        // Label admin_vendor: for admin, other party is vendor (store name + logo); for vendor, other is "Admin" (no single admin image)
        const vendorIdsFromConvos = [...new Set(adminVendorFiltered.map((c) => c.vendorId))];
        const storesAdminVendor = vendorIdsFromConvos.length
            ? await prisma.store.findMany({
                where: { userId: { in: vendorIdsFromConvos } },
                select: { userId: true, name: true, logo: true },
            })
            : [];
        const storeByUserIdAdmin = Object.fromEntries(storesAdminVendor.map((s) => [s.userId, s]));
        const adminVendorList = adminVendorFiltered.map((c) => {
            const store = storeByUserIdAdmin[c.vendorId];
            if (isAdminUser) {
                return {
                    ...c,
                    type: "admin_vendor",
                    storeName: store?.name ?? null,
                    otherPartyLabel: store?.name ?? "Vendor",
                    otherPartyImageUrl: store?.logo ?? null,
                };
            }
            return {
                ...c,
                type: "admin_vendor",
                storeName: null,
                otherPartyLabel: "Admin",
                otherPartyImageUrl: null,
            };
        });

        // Vendor-vendor: only show if at least one message and not hidden
        const vendorConvosRaw = await prisma.vendorConversation.findMany({
            where: {
                OR: [{ vendor1Id: userId }, { vendor2Id: userId }],
            },
            orderBy: [{ lastMessageAt: "desc" }, { createdAt: "desc" }],
            include: { _count: { select: { messages: true } } },
        });
        const vendorConvosWithMessages = vendorConvosRaw.filter((c) => (c._count?.messages ?? 0) > 0);
        const vendorConvos = vendorConvosWithMessages.filter((c) =>
            isVisible(c.id, "vendor_vendor", c.lastMessageAt ?? c.createdAt)
        );
        const otherVendorIds = vendorConvos.map((c) =>
            c.vendor1Id === userId ? c.vendor2Id : c.vendor1Id
        );
        const storesVendor = otherVendorIds.length
            ? await prisma.store.findMany({
                where: { userId: { in: otherVendorIds } },
                select: { userId: true, name: true, logo: true },
            })
            : [];
        const storeByUserIdVendor = Object.fromEntries(storesVendor.map((s) => [s.userId, s]));
        const vendorConvosWithLabel = vendorConvos.map((c) => {
            const otherId = c.vendor1Id === userId ? c.vendor2Id : c.vendor1Id;
            const store = storeByUserIdVendor[otherId];
            return {
                id: c.id,
                type: "vendor_vendor",
                createdAt: c.createdAt,
                lastMessageAt: c.lastMessageAt,
                _count: c._count,
                storeName: store?.name ?? null,
                otherPartyLabel: store?.name ?? "Vendor",
                otherPartyImageUrl: store?.logo ?? null,
            };
        });

        // Admin–admin: only for admin users, include conversations with at least one message and visible
        let adminAdminList = [];
        if (typeof prisma.adminConversation?.findMany === "function") {
            try {
                const isAdmin = await authAdmin(userId);
                if (isAdmin) {
                    const adminConvosRaw = await prisma.adminConversation.findMany({
                        where: { OR: [{ admin1Id: userId }, { admin2Id: userId }] },
                        orderBy: [{ lastMessageAt: "desc" }, { createdAt: "desc" }],
                        include: { _count: { select: { messages: true } } },
                    });
                    const adminConvosWithMessages = adminConvosRaw.filter((c) => (c._count?.messages ?? 0) > 0);
                    const adminConvos = adminConvosWithMessages.filter((c) =>
                        isVisible(c.id, "admin_admin", c.lastMessageAt ?? c.createdAt)
                    );
                    const otherAdminIds = [...new Set(adminConvos.map((c) => (c.admin1Id === userId ? c.admin2Id : c.admin1Id)))];
                    const adminClerkImages = {};
                    if (otherAdminIds.length > 0) {
                        try {
                            const clerk = await clerkClient();
                            for (const id of otherAdminIds) {
                                try {
                                    const u = await clerk.users.getUser(id);
                                    if (u?.imageUrl) adminClerkImages[id] = u.imageUrl;
                                } catch (_) {}
                            }
                        } catch (_) {}
                    }
                    adminAdminList = adminConvos.map((c) => {
                        const otherId = c.admin1Id === userId ? c.admin2Id : c.admin1Id;
                        return {
                            id: c.id,
                            type: "admin_admin",
                            createdAt: c.createdAt,
                            lastMessageAt: c.lastMessageAt,
                            _count: c._count,
                            storeName: null,
                            otherPartyLabel: "Admin",
                            otherPartyImageUrl: adminClerkImages[otherId] ?? null,
                        };
                    });
                }
            } catch (_) {}
        }

        const merged = [...adminVendorList, ...vendorConvosWithLabel, ...adminAdminList].sort((a, b) => {
            const aTime = a.lastMessageAt || a.createdAt;
            const bTime = b.lastMessageAt || b.createdAt;
            return new Date(bTime) - new Date(aTime);
        });
        return NextResponse.json(merged);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: error.message || "Server error" }, { status: 500 });
    }
}
