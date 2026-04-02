import prisma from "@/lib/prisma";
import authAdmin from "@/middlewares/authAdmin";
import { computeVendorRiskScore } from "@/lib/vendorRisk";
import { isSuspiciousPrice } from "@/lib/suspiciousPrice";
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request) {
    try {
        const { userId } = getAuth(request);
        const isAdmin = await authAdmin(userId);
        if (!isAdmin) {
            return NextResponse.json({ error: "Not authorized" }, { status: 401 });
        }

        const now = new Date();
        const sevenDaysAgo = new Date(now);
        sevenDaysAgo.setDate(now.getDate() - 7);
        const thirtyDaysAgo = new Date(now);
        thirtyDaysAgo.setDate(now.getDate() - 30);
        const sixtyDaysAgo = new Date(now);
        sixtyDaysAgo.setDate(now.getDate() - 60);
        const ninetyDaysAgo = new Date(now);
        ninetyDaysAgo.setDate(now.getDate() - 90);
        const fourteenDaysAgo = new Date(now);
        fourteenDaysAgo.setDate(now.getDate() - 14);

        const [
            pendingStores,
            reportsFake,
            approvedStores,
            allStoresForRisk,
            orders30d,
            orders90d,
            reportsWithDelivery,
            pendingOrders,
            suspiciousCheckProducts,
            rawCategoryAverages,
        ] = await Promise.all([
            prisma.store.findMany({
                where: { status: "pending" },
                select: { id: true, name: true, createdAt: true },
                orderBy: { createdAt: "desc" },
            }),
            prisma.report.findMany({
                where: { reasonType: { in: ["fake", "wrong_info"] } },
                select: {
                    id: true,
                    reasonType: true,
                    product: { select: { id: true, name: true, store: { select: { name: true } } } },
                },
                orderBy: { createdAt: "desc" },
            }),
            prisma.store.findMany({
                where: { status: "approved" },
                select: { id: true, userId: true, name: true, username: true, lastActiveAt: true, updatedAt: true },
            }).then((stores) => stores),
            prisma.store.findMany({
                select: {
                    id: true,
                    userId: true,
                    name: true,
                    isActive: true,
                    createdAt: true,
                    Product: {
                        select: {
                            id: true,
                            rating: { select: { rating: true } },
                        },
                    },
                },
            }),
            prisma.order.findMany({
                where: { createdAt: { gte: thirtyDaysAgo } },
                select: {
                    storeId: true,
                    total: true,
                    status: true,
                    isPaid: true,
                },
            }),
            // orders in last 90 days, for refund frequency & return-to-purchase ratio
            prisma.order.findMany({
                where: { createdAt: { gte: ninetyDaysAgo } },
                select: {
                    storeId: true,
                    total: true,
                    status: true,
                    isPaid: true,
                    updatedAt: true,
                },
            }),
            // reports with createdAt + related delivered orders for fast-complaint detection
            prisma.report.findMany({
                select: {
                    createdAt: true,
                    product: {
                        select: {
                            storeId: true,
                            orderItems: {
                                select: {
                                    order: {
                                        select: {
                                            storeId: true,
                                            status: true,
                                            updatedAt: true,
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            }),
            // Orders awaiting vendor action (cancel/return requests)
            prisma.order.findMany({
                where: { status: { in: ["CANCELLATION_REQUESTED", "RETURN_REQUESTED"] } },
                select: {
                    id: true,
                    status: true,
                    total: true,
                    updatedAt: true,
                    cancellationReason: true,
                    store: { select: { id: true, userId: true, name: true } },
                    user: { select: { name: true } },
                },
                orderBy: { updatedAt: "asc" },
            }),
            prisma.product.findMany({
                where: {
                    status: "active",
                    adminClearedSuspicion: false,
                    createdAt: { gte: sevenDaysAgo }
                },
                select: {
                    id: true,
                    name: true,
                    offer_price: true,
                    price: true,
                    actual_price: true,
                    mrp: true,
                    category: true,
                    productType: true,
                    store: { select: { id: true, name: true, userId: true } },
                },
                orderBy: { createdAt: "desc" }
            }),
        ]);

        const notices = [];
        let totalCount = 0;

        if (pendingStores.length > 0) {
            notices.push({
                id: "pending_approval",
                type: "pending_approval",
                severity: "warning",
                title: "Stores pending approval",
                description: `${pendingStores.length} store${pendingStores.length > 1 ? 's' : ''} waiting for your review`,
                count: pendingStores.length,
                link: "/admin/approve",
                items: pendingStores.map((s) => ({
                    itemId: s.id,
                    label: s.name,
                })),
            });
            totalCount += pendingStores.length;
        }

        if (reportsFake.length > 0) {
            notices.push({
                id: "reports_fake",
                type: "reports_fake",
                severity: "warning",
                title: "Product reports",
                description: `${reportsFake.length} product${reportsFake.length > 1 ? 's' : ''} reported as fake or having wrong info`,
                count: reportsFake.length,
                link: "/admin/reports",
                items: reportsFake.map((r) => ({
                    itemId: r.id,
                    label: r.product?.name ?? "Unknown product",
                    sublabel: `${r.reasonType === "fake" ? "Fake" : "Wrong info"} — ${r.product?.store?.name ?? ""}`,
                })),
            });
            totalCount += reportsFake.length;
        }

        const inactiveStores = approvedStores.filter((s) => {
            // Use the most recent activity timestamp available
            const lastActivity = s.lastActiveAt
                ? new Date(s.lastActiveAt)
                : new Date(s.updatedAt); // fallback: store's last DB update (e.g. approval)
            return lastActivity < sixtyDaysAgo;
        });
        if (inactiveStores.length > 0) {
            notices.push({
                id: "inactive_vendors",
                type: "inactive_vendors",
                severity: "info",
                title: "Inactive vendors",
                description: `${inactiveStores.length} approved store${inactiveStores.length > 1 ? "s" : ""} with no activity (last product published) in the last 60 days`,
                count: inactiveStores.length,
                link: "/admin?tab=vendors",
                items: inactiveStores.map((s) => {
                    const lastActive = s.lastActiveAt
                        ? new Date(s.lastActiveAt).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" })
                        : "Never";
                    return {
                        itemId: s.id,
                        label: s.name || "Unnamed store",
                        sublabel: s.username ? `@${s.username} · Last activity: ${lastActive}` : `Last activity: ${lastActive}`,
                        storeId: s.id,
                        vendorId: s.userId,
                        lastActiveAt: s.lastActiveAt,
                    };
                }),
            });
            totalCount += inactiveStores.length;
        }

        // ── Build vendor risk data ──
        const vendorMap = {};
        allStoresForRisk.forEach((s) => {
            let ratingSum = 0,
                ratingCount = 0;
            s.Product.forEach((p) => {
                p.rating.forEach((r) => {
                    ratingSum += r.rating;
                    ratingCount++;
                });
            });
            vendorMap[s.id] = {
                id: s.id,
                userId: s.userId,
                name: s.name,
                avgRating: ratingCount > 0 ? ratingSum / ratingCount : 0,
                createdAt: s.createdAt,
                // 30d financials (value-based)
                revenue30d: 0,
                refundValue30d: 0,
                orderCount30d: 0,
                cancelCount30d: 0,
                // 90d order counts
                totalOrders90d: 0,
                refundCount90d: 0,
                // Revenue series for volatility (last 14d)
                revenueByDay: {},
                // Fast complaint flag
                hasFastComplaint: false,
                fastComplaintMinutes: null,
            };
        });

        // Aggregate 30-day orders (value-based refund rate)
        orders30d.forEach((order) => {
            const v = vendorMap[order.storeId];
            if (!v) return;
            const isRefund = order.status === "CANCELLED" || order.status === "RETURNED";
            if (!isRefund) {
                v.revenue30d += order.total;
                v.orderCount30d++;
            } else {
                v.cancelCount30d++;
                const refundAmt = order.status === "CANCELLED" ? (order.isPaid ? order.total : 0) : order.total;
                v.refundValue30d += refundAmt;
            }
        });

        // Aggregate 90-day orders (refund frequency & return-to-purchase ratio)
        orders90d.forEach((order) => {
            const v = vendorMap[order.storeId];
            if (!v) return;
            v.totalOrders90d++;
            const isRefund = order.status === "CANCELLED" || order.status === "RETURNED";
            if (isRefund) v.refundCount90d++;
            // Revenue by day for volatility (last 14 days only)
            const orderDate = new Date(order.updatedAt || order.createdAt);
            if (orderDate >= fourteenDaysAgo && !isRefund) {
                const dateStr = orderDate.toISOString().split('T')[0];
                v.revenueByDay[dateStr] = (v.revenueByDay[dateStr] || 0) + order.total;
            }
        });

        // Fast-complaint detection: report filed within 2h of a DELIVERED order for same store
        reportsWithDelivery.forEach((report) => {
            const storeId = report.product?.storeId;
            if (!storeId || !vendorMap[storeId]) return;
            const reportTime = new Date(report.createdAt).getTime();
            (report.product?.orderItems || []).forEach((oi) => {
                if (oi.order?.status === "DELIVERED" && oi.order?.storeId === storeId) {
                    const deliveryTime = new Date(oi.order.updatedAt).getTime();
                    const gapMs = reportTime - deliveryTime;
                    if (gapMs >= 0 && gapMs < 2 * 60 * 60 * 1000) { // within 2 hours
                        const gapMin = gapMs / (1000 * 60);
                        const v = vendorMap[storeId];
                        if (!v.hasFastComplaint || gapMin < v.fastComplaintMinutes) {
                            v.hasFastComplaint = true;
                            v.fastComplaintMinutes = gapMin;
                        }
                    }
                }
            });
        });

        // Compute unified risk scores
        const processedVendors = Object.values(vendorMap).map((v) => {
            const refundRatePercent = v.revenue30d > 0 ? (v.refundValue30d / v.revenue30d) * 100 : 0;
            const cancelRatePercent = v.orderCount30d > 0 ? (v.cancelCount30d / v.orderCount30d) * 100 : 0;
            const returnToPurchasePercent = v.totalOrders90d > 0 ? (v.refundCount90d / v.totalOrders90d) * 100 : 0;

            // Volatility: stddev / mean of daily revenue over last 14 days
            const dayValues = Object.values(v.revenueByDay);
            let volatilityIndex = 0;
            if (dayValues.length >= 2) {
                const mean = dayValues.reduce((a, b) => a + b, 0) / dayValues.length;
                if (mean > 0) {
                    const variance = dayValues.reduce((s, x) => s + Math.pow(x - mean, 2), 0) / dayValues.length;
                    volatilityIndex = Math.round((Math.sqrt(variance) / mean) * 100);
                }
            }

            const isNewVendor = v.createdAt && (now - new Date(v.createdAt)) < 14 * 24 * 60 * 60 * 1000;

            const { riskScore, reasons } = computeVendorRiskScore({
                refundRatePercent,
                cancelRatePercent,
                avgRating: v.avgRating,
                volatilityIndex,
                refundCount90d: v.refundCount90d,
                totalOrders90d: v.totalOrders90d,
                returnToPurchasePercent,
                hasFastComplaint: v.hasFastComplaint,
                fastComplaintMinutes: v.fastComplaintMinutes,
                isNewVendor,
                hasAnyRefund: v.refundCount90d > 0,
            });

            return { ...v, riskScore, reasons };
        });

        const highRiskVendors = processedVendors.filter((v) => v.riskScore > 50);
        if (highRiskVendors.length > 0) {
            notices.push({
                id: "high_risk_vendors",
                type: "high_risk_vendors",
                severity: "critical",
                title: "High-risk vendors",
                description: `${highRiskVendors.length} vendor${highRiskVendors.length > 1 ? 's' : ''} with elevated risk scores`,
                count: highRiskVendors.length,
                link: "/admin?tab=vendors",
                items: highRiskVendors.map((v) => ({
                    itemId: v.userId,
                    label: v.name,
                    sublabel: `Risk ${v.riskScore} — ${v.reasons.join(', ')}`,
                    vendorId: v.userId,
                    riskScore: v.riskScore,
                    reasons: v.reasons,
                })),
            });
            totalCount += highRiskVendors.length;
        }

        // Pending order actions (cancellation / return requests awaiting vendor response)
        if (pendingOrders.length > 0) {
            // Group by store
            const storeOrderMap = {};
            let hasUrgent = false;
            for (const order of pendingOrders) {
                const sid = order.store?.id || 'unknown';
                if (!storeOrderMap[sid]) {
                    storeOrderMap[sid] = {
                        storeName: order.store?.name || 'Unknown store',
                        vendorId: order.store?.userId,
                        orders: [],
                    };
                }
                storeOrderMap[sid].orders.push(order);
                // Check if any order has been waiting > 48 hours
                const waitMs = now - new Date(order.updatedAt);
                if (waitMs > 48 * 60 * 60 * 1000) hasUrgent = true;
            }

            const storeCount = Object.keys(storeOrderMap).length;
            const items = Object.entries(storeOrderMap)
                .sort((a, b) => b[1].orders.length - a[1].orders.length)
                .map(([storeId, s]) => {
                    const oldest = s.orders[0]; // already sorted by updatedAt asc
                    const waitMs = now - new Date(oldest.updatedAt);
                    const waitHours = Math.floor(waitMs / (1000 * 60 * 60));
                    const waitStr = waitHours >= 24
                        ? `${Math.floor(waitHours / 24)}d ago`
                        : `${waitHours}h ago`;
                    const requestType = oldest.status === 'CANCELLATION_REQUESTED' ? 'cancel' : 'return';
                    return {
                        itemId: storeId,
                        label: s.storeName,
                        sublabel: `${s.orders.length} pending (oldest: ${waitStr}, ${requestType} request)`,
                        vendorId: s.vendorId,
                        pendingCount: s.orders.length,
                        oldestWaitStr: waitStr,
                        requestType,
                    };
                });

            notices.push({
                id: "pending_order_actions",
                type: "pending_order_actions",
                severity: hasUrgent ? "critical" : "warning",
                title: "Pending order actions",
                description: `${pendingOrders.length} order${pendingOrders.length > 1 ? 's' : ''} awaiting vendor response across ${storeCount} store${storeCount > 1 ? 's' : ''}`,
                count: pendingOrders.length,
                link: "/admin/stores",
                items,
            });
            totalCount += pendingOrders.length;
        }

        // Suspicious products: Simple check using isSuspiciousPrice for products created in the last 7 days
        const suspiciousProducts = [];
        for (const p of suspiciousCheckProducts) {
            if (p.adminClearedSuspicion) continue;

            const offerPrice = p.offer_price ?? p.price;
            const actualPrice = p.actual_price ?? p.mrp;
            const category = p.category;

            if (isSuspiciousPrice(offerPrice, actualPrice, category)) {
                suspiciousProducts.push(p);
            }
        }

        if (suspiciousProducts.length > 0) {
            const items = suspiciousProducts.map((p) => {
                const productType = p.productType ?? "electronics";
                const link = productType === "fashion" ? `/fashion/product/${p.id}` : `/product/${p.id}`;
                const offerPrice = p.offer_price ?? p.price;

                return {
                    productId: p.id,
                    productName: p.name,
                    storeName: p.store?.name ?? "—",
                    storeId: p.storeId,
                    vendorId: p.store?.userId ?? null,
                    offer_price: offerPrice,
                    reasonSummary: `Price: ₹${offerPrice} is unusually low`,
                    link,
                };
            });
            notices.push({
                id: "suspicious_products",
                type: "suspicious_products",
                severity: "critical",
                title: "Suspicious products",
                description: `${suspiciousProducts.length} product${suspiciousProducts.length > 1 ? 's' : ''} flagged due to suspicious pricing`,
                count: suspiciousProducts.length,
                link: "/admin/reports",
                items: items.map((it) => ({
                    itemId: it.productId,
                    label: it.productName,
                    sublabel: `${it.reasonSummary} — ${it.storeName}`,
                    productId: it.productId,
                    storeId: it.storeId,
                    vendorId: it.vendorId,
                    productName: it.productName,
                    storeName: it.storeName,
                    link: it.link,
                })),
            });
            totalCount += suspiciousProducts.length;
        }

        // Per-admin viewed state: reduce count and allow unbold for viewed items
        const viewedRows = await prisma.adminNoticeView.findMany({
            where: { adminUserId: userId },
            select: { noticeType: true, itemId: true },
        });
        const viewedSet = new Set(viewedRows.map((v) => `${v.noticeType}:${v.itemId}`));

        for (const notice of notices) {
            for (const item of notice.items) {
                const key = `${notice.type}:${item.itemId}`;
                item.viewed = viewedSet.has(key);
            }
            const unviewedCount = notice.items.filter((i) => !i.viewed).length;
            notice.count = unviewedCount;
        }
        totalCount = notices.reduce((sum, n) => sum + n.count, 0);

        return NextResponse.json({
            notices,
            totalCount,
        });
    } catch (error) {
        console.error("Admin notices error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to load notices" },
            { status: 500 }
        );
    }
}

/** POST: Mark notice item(s) as viewed for this admin only. Body: { noticeType, itemId? } for one item, or { noticeType, itemIds: string[] } for clear all. */
export async function POST(request) {
    try {
        const { userId } = getAuth(request);
        const isAdmin = await authAdmin(userId);
        if (!isAdmin) {
            return NextResponse.json({ error: "Not authorized" }, { status: 401 });
        }

        const body = await request.json();
        const { noticeType, itemId, itemIds } = body;

        if (!noticeType || typeof noticeType !== "string") {
            return NextResponse.json({ error: "noticeType required" }, { status: 400 });
        }

        const idsToMark = Array.isArray(itemIds) && itemIds.length > 0
            ? itemIds
            : itemId != null && String(itemId).trim() !== ""
                ? [String(itemId).trim()]
                : [];

        if (idsToMark.length === 0) {
            return NextResponse.json({ error: "itemId or itemIds required" }, { status: 400 });
        }

        await prisma.adminNoticeView.createMany({
            data: idsToMark.map((id) => ({
                adminUserId: userId,
                noticeType,
                itemId: id,
            })),
            skipDuplicates: true,
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Admin notices view error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to mark as viewed" },
            { status: 500 }
        );
    }
}
