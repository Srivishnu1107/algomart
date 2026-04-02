import prisma from "@/lib/prisma";
import authAdmin from "@/middlewares/authAdmin";
import { computeVendorRiskScore } from "@/lib/vendorRisk";
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

const safePercentChange = (current, previous) => {
    if (!Number.isFinite(current) || !Number.isFinite(previous)) return 0;
    if (previous === 0) return current === 0 ? 0 : 100;
    return ((current - previous) / previous) * 100;
};

const toSparkline = (series = []) => {
    const cleaned = series.map((value) => (Number.isFinite(value) && value > 0 ? value : 0));
    if (cleaned.length === 0) return [1, 1, 1, 1, 1, 1, 1];
    const max = Math.max(...cleaned);
    if (max <= 0) return cleaned.map(() => 1);
    return cleaned.map((value) => Math.max(1, Math.round((value / max) * 9) + 1));
};

export async function GET(request) {
    try {
        const { userId } = getAuth(request);
        const isAdmin = await authAdmin(userId);

        if (!isAdmin) {
            return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
        }

        const now = new Date();
        const thirtyDaysAgo = new Date(now);
        thirtyDaysAgo.setDate(now.getDate() - 30);
        const sixtyDaysAgo = new Date(now);
        sixtyDaysAgo.setDate(now.getDate() - 60);
        const sevenDaysAgo = new Date(now);
        sevenDaysAgo.setDate(now.getDate() - 7);
        const fourteenDaysAgo = new Date(now);
        fourteenDaysAgo.setDate(now.getDate() - 14);

        // Fetch Data
        const allOrders = await prisma.order.findMany({
            select: {
                id: true, createdAt: true, total: true, status: true, isPaid: true, userId: true, paymentMethod: true, cancellationReason: true,
                store: { select: { id: true, name: true, storeType: true, userId: true } },
                user: { select: { id: true, name: true } },
                orderItems: { select: { product: { select: { category: true, id: true } }, price: true, quantity: true } }
            },
            orderBy: { createdAt: 'asc' }
        });

        const allStores = await prisma.store.findMany({
            include: { Product: { select: { id: true, inStock: true, price: true, rating: { select: { rating: true, createdAt: true, userId: true } } } } }
        });

        const ninetyDaysAgo = new Date(now);
        ninetyDaysAgo.setDate(now.getDate() - 90);

        // Reports for fast-complaint detection (delivery-to-complaint gap)
        const allReportsForRisk = await prisma.report.findMany({
            select: {
                createdAt: true,
                product: {
                    select: {
                        storeId: true,
                        orderItems: {
                            select: {
                                order: {
                                    select: { storeId: true, status: true, updatedAt: true },
                                },
                            },
                        },
                    },
                },
            },
        });

        const totalRegisteredUsers = await prisma.user.count();

        // --- AGGREGATION MAPS ---
        const userMap = {};
        const dailyMap = {}; // Key: YYYY-MM-DD
        const vendorMap = {};
        const categoryMap = {};
        const categoryMapByMode = { electronics: {}, fashion: {} };
        const paymentMap = {};
        const cancelReasonMap = {};
        const statusMap = {};
        const heatMap = new Array(24).fill(0);
        const weekdayMap = new Array(7).fill(0); // 0=Sun .. 6=Sat
        const ordersByStoreType = { electronics: 0, fashion: 0 };
        const cancelledByStoreType = { electronics: 0, fashion: 0 };
        const ordersByPaymentCount = {};
        const vendorCancelCount = {};
        const vendorOrderCount = {};
        const vendorOrderCountPrev = {};
        const vendorCancelCountPrev = {};
        const vendorRevenueByDay = {}; // storeId -> { dateStr: revenue } for last 30d
        const vendorRefundCountLast7 = {};
        const vendorRefundCountPrior21 = {};
        const vendorCancelCountLast7 = {};
        const vendorCancelCountPrior21 = {};
        const vendorOrdersLast7 = {};
        const vendorOrdersPrior7 = {};
        const vendorRevenueLast7 = {};
        const vendorRevenuePrior7 = {};
        // 90d vendor risk maps
        const vendorTotalOrders90d = {};
        const vendorRefundCount90d = {};

        // Initialize Daily Map (Last 30 days)
        for (let i = 0; i < 30; i++) {
            const d = new Date(now); d.setDate(d.getDate() - i);
            const key = d.toISOString().split('T')[0];
            dailyMap[key] = { revenue: 0, orders: 0, cancelled: 0, refunds: 0, newUsers: 0, activeUsers: new Set() };
        }

        // Initialize Vendor Map
        allStores.forEach(s => {
            let ratingSum = 0, ratingCount = 0;
            s.Product.forEach(p => { p.rating.forEach(r => { ratingSum += r.rating; ratingCount++; }); });
            vendorMap[s.id] = {
                id: s.id, name: s.name, category: s.storeType || 'General', rating: ratingCount > 0 ? ratingSum / ratingCount : 0,
                revenue: 0, orders: 0, refunds: 0, isActive: s.isActive, createdAt: s.createdAt, riskScore: 0
            };
        });

        // Process Orders
        allOrders.forEach(order => {
            const date = new Date(order.createdAt);
            const dateStr = date.toISOString().split('T')[0];

            // User Logic
            if (!userMap[order.userId]) {
                userMap[order.userId] = {
                    id: order.userId, name: order.user?.name || 'Guest', firstOrder: date, lastOrder: date,
                    spent: 0, count: 0, refundAmount: 0, categories: { electronics: 0, fashion: 0 }, paymentMethods: {}
                };
                // If first order in last 30 days -> New User Daily
                if (date >= thirtyDaysAgo && dailyMap[dateStr]) dailyMap[dateStr].newUsers++;
            }
            const u = userMap[order.userId];
            if (date > u.lastOrder) u.lastOrder = date;

            // Vendor Logic
            const v = vendorMap[order.store?.id];

            // Metrics — Gross revenue excludes CANCELLED and RETURNED (returned = refund)
            const isRefund = order.status === 'CANCELLED' || order.status === 'RETURNED';
            if (!isRefund) {
                u.spent += order.total;
                u.count++;
                if (v) { v.revenue += order.total; v.orders++; }

                // Daily (Only last 30 days)
                if (date >= thirtyDaysAgo) {
                    if (dailyMap[dateStr]) {
                        dailyMap[dateStr].revenue += order.total;
                        dailyMap[dateStr].orders++;
                        dailyMap[dateStr].activeUsers.add(order.userId);
                    }
                    // Categories (global + by store mode for Electronics/Fashion tabs)
                    const storeType = (order.store?.storeType || 'electronics').toLowerCase();
                    const modeKey = storeType === 'fashion' ? 'fashion' : 'electronics';
                    order.orderItems.forEach(item => {
                        const cat = item.product?.category || 'Uncategorized';
                        const amount = item.price * item.quantity;
                        categoryMap[cat] = (categoryMap[cat] || 0) + amount;
                        categoryMapByMode[modeKey][cat] = (categoryMapByMode[modeKey][cat] || 0) + amount;
                        const cleanCat = cat.toLowerCase();
                        if (cleanCat === 'electronics') u.categories.electronics += amount;
                        if (cleanCat === 'fashion') u.categories.fashion += amount;
                    });
                    // Payment
                    paymentMap[order.paymentMethod] = (paymentMap[order.paymentMethod] || 0) + order.total;
                    if (!u.paymentMethods) u.paymentMethods = {};
                    u.paymentMethods[order.paymentMethod] = (u.paymentMethods[order.paymentMethod] || 0) + 1;
                    // Heatmap
                    heatMap[date.getHours()]++;
                    const sid = order.store?.id;
                    if (sid) {
                        vendorOrderCount[sid] = (vendorOrderCount[sid] || 0) + 1;
                        if (!vendorRevenueByDay[sid]) vendorRevenueByDay[sid] = {};
                        vendorRevenueByDay[sid][dateStr] = (vendorRevenueByDay[sid][dateStr] || 0) + order.total;
                        if (date >= sevenDaysAgo) {
                            vendorOrdersLast7[sid] = (vendorOrdersLast7[sid] || 0) + 1;
                            vendorRevenueLast7[sid] = (vendorRevenueLast7[sid] || 0) + order.total;
                        } else if (date >= fourteenDaysAgo) {
                            vendorOrdersPrior7[sid] = (vendorOrdersPrior7[sid] || 0) + 1;
                            vendorRevenuePrior7[sid] = (vendorRevenuePrior7[sid] || 0) + order.total;
                        }
                    }
                }
            } else {
                if (v) v.refunds++;
                const refundAmt = order.status === 'CANCELLED' ? (order.isPaid ? order.total : 0) : order.total;
                if (refundAmt > 0) u.refundAmount = (u.refundAmount || 0) + refundAmt;
                if (date >= thirtyDaysAgo) {
                    if (dailyMap[dateStr]) {
                        dailyMap[dateStr].cancelled++;
                        if (refundAmt > 0) dailyMap[dateStr].refunds += refundAmt;
                    }
                    const sid = order.store?.id;
                    if (order.status === 'CANCELLED') {
                        const reason = order.cancellationReason || 'Other';
                        cancelReasonMap[reason] = (cancelReasonMap[reason] || 0) + 1;
                        if (sid) {
                            vendorCancelCount[sid] = (vendorCancelCount[sid] || 0) + 1;
                            if (date >= sevenDaysAgo) vendorCancelCountLast7[sid] = (vendorCancelCountLast7[sid] || 0) + 1;
                            else if (date >= fourteenDaysAgo) vendorCancelCountPrior21[sid] = (vendorCancelCountPrior21[sid] || 0) + 1;
                        }
                    }
                    if (sid) {
                        const isRefund = order.status === 'CANCELLED' && order.isPaid || order.status === 'RETURNED';
                        if (isRefund) {
                            if (date >= sevenDaysAgo) vendorRefundCountLast7[sid] = (vendorRefundCountLast7[sid] || 0) + 1;
                            else if (date >= fourteenDaysAgo) vendorRefundCountPrior21[sid] = (vendorRefundCountPrior21[sid] || 0) + 1;
                        }
                    }
                }
            }

            // Previous period (60-30 days ago) for vendor growth
            if (date >= sixtyDaysAgo && date < thirtyDaysAgo) {
                const sid = order.store?.id;
                if (sid) vendorOrderCountPrev[sid] = (vendorOrderCountPrev[sid] || 0) + 1;
                if (order.status === 'CANCELLED' && sid) vendorCancelCountPrev[sid] = (vendorCancelCountPrev[sid] || 0) + 1;
            }

            // 90d vendor aggregation (refund frequency & return-to-purchase ratio)
            if (date >= ninetyDaysAgo) {
                const sid = order.store?.id;
                if (sid) {
                    vendorTotalOrders90d[sid] = (vendorTotalOrders90d[sid] || 0) + 1;
                    if (isRefund) vendorRefundCount90d[sid] = (vendorRefundCount90d[sid] || 0) + 1;
                }
            }

            if (date >= thirtyDaysAgo) {
                statusMap[order.status] = (statusMap[order.status] || 0) + 1;
                weekdayMap[date.getDay()]++;
                const st = (order.store?.storeType || 'electronics').toString().toLowerCase();
                if (st === 'fashion') ordersByStoreType.fashion++;
                else ordersByStoreType.electronics++;
                if (order.status === 'CANCELLED') {
                    if (st === 'fashion') cancelledByStoreType.fashion++;
                    else cancelledByStoreType.electronics++;
                }
                ordersByPaymentCount[order.paymentMethod] = (ordersByPaymentCount[order.paymentMethod] || 0) + 1;
            }
        });

        // --- DERIVED METRICS ---

        // 1. Trend Data (include date for frontend aggregation by week/month)
        const trendData = Object.entries(dailyMap).sort((a, b) => new Date(a[0]) - new Date(b[0])).map(([date, d]) => ({
            date,
            name: new Date(date).toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' }),
            revenue: d.revenue, orders: d.orders, cancelled: d.cancelled, refunds: d.refunds, net: d.revenue - d.refunds,
            newUsers: d.newUsers, activeUsers: d.activeUsers.size
        }));

        // 2. Revenue KPI
        const revCurrent = trendData.reduce((acc, d) => ({ gross: acc.gross + d.revenue, orders: acc.orders + d.orders }), { gross: 0, orders: 0 });
        const orders30 = allOrders.filter(o => new Date(o.createdAt) >= thirtyDaysAgo);
        const previousOrders = allOrders.filter(o => {
            const createdAt = new Date(o.createdAt);
            return createdAt >= sixtyDaysAgo && createdAt < thirtyDaysAgo;
        });
        const refunds30 = orders30.filter(o => o.status === 'CANCELLED' && o.isPaid).reduce((sum, o) => sum + o.total, 0)
            + orders30.filter(o => o.status === 'RETURNED').reduce((sum, o) => sum + o.total, 0);
        const netRev = revCurrent.gross - refunds30;
        const aov = revCurrent.orders > 0 ? netRev / revCurrent.orders : 0;
        const prevValidOrders = previousOrders.filter(o => o.status !== 'CANCELLED' && o.status !== 'RETURNED');
        const prevGross = prevValidOrders.reduce((sum, o) => sum + o.total, 0);
        const prevRefunds = previousOrders.filter(o => o.status === 'CANCELLED' && o.isPaid).reduce((sum, o) => sum + o.total, 0)
            + previousOrders.filter(o => o.status === 'RETURNED').reduce((sum, o) => sum + o.total, 0);
        const prevNet = prevGross - prevRefunds;
        const prevAov = prevValidOrders.length > 0 ? prevNet / prevValidOrders.length : 0;
        const refundRate = revCurrent.gross > 0 ? (refunds30 / revCurrent.gross) * 100 : 0;
        const prevRefundRate = prevGross > 0 ? (prevRefunds / prevGross) * 100 : 0;
        const grossChange = safePercentChange(revCurrent.gross, prevGross);
        const netChange = safePercentChange(netRev, prevNet);
        const aovChange = safePercentChange(aov, prevAov);
        const refundRateChange = refundRate - prevRefundRate;
        const sparkWindow = trendData.slice(-7);

        // 3. User KPI
        const usersArray = Object.values(userMap);
        const totalUsers = usersArray.length;
        const activeUsers30 = new Set(orders30.map(o => o.userId)).size;
        const newUsers30 = usersArray.filter(u => u.firstOrder >= thirtyDaysAgo).length;
        const repeatUsers = usersArray.filter(u => u.count > 1).length;
        const repeatRate = totalUsers > 0 ? (repeatUsers / totalUsers) * 100 : 0;
        const arpu = totalUsers > 0 ? usersArray.reduce((sum, u) => sum + u.spent, 0) / totalUsers : 0;

        // 4. Vendor Metric Processing
        const processedVendors = Object.values(vendorMap).map(v => {
            const refundRate = v.revenue > 0 ? (v.refunds / v.orders) * 100 : 0; // Approx logic (refunds count / orders count * 100? No, usually based on value. Here using count as proxy)
            // Better: Refund Value / Revenue. But I didn't sum refund value per vendor.
            // Using logic from Step 486: (refundAmount / revenue) * 100.
            // Let's assume refundRate based on count for simplicity or fix it.
            // Fix: Calculate `refundAmount` per vendor properly?
            // Re-calc:
            const vOrders30 = orders30.filter(o => o.store?.id === v.id);
            const vRev30 = vOrders30.filter(o => o.status !== 'CANCELLED' && o.status !== 'RETURNED').reduce((sum, o) => sum + o.total, 0);
            const vRefund30 = vOrders30.filter(o => o.status === 'CANCELLED' && o.isPaid).reduce((sum, o) => sum + o.total, 0)
                + vOrders30.filter(o => o.status === 'RETURNED').reduce((sum, o) => sum + o.total, 0);
            const vRefRate = vRev30 > 0 ? (vRefund30 / vRev30) * 100 : 0;

            // Risk — unified via computeVendorRiskScore
            const cancelRate90 = (vendorTotalOrders90d[v.id] || 0) > 0
                ? ((vendorCancelCount[v.id] || 0) / (vendorTotalOrders90d[v.id] || 1)) * 100 : 0;
            const returnToPurchasePercent = (vendorTotalOrders90d[v.id] || 0) > 0
                ? ((vendorRefundCount90d[v.id] || 0) / (vendorTotalOrders90d[v.id] || 1)) * 100 : 0;

            // Volatility of last 14d revenue
            const dayValues14d = Object.values(vendorRevenueByDay[v.id] || {});
            let volIdx = 0;
            if (dayValues14d.length >= 2) {
                const mean14 = dayValues14d.reduce((a, b) => a + b, 0) / dayValues14d.length;
                if (mean14 > 0) {
                    const var14 = dayValues14d.reduce((s, x) => s + Math.pow(x - mean14, 2), 0) / dayValues14d.length;
                    volIdx = Math.round((Math.sqrt(var14) / mean14) * 100);
                }
            }

            const isNewVendor = v.createdAt && (now - new Date(v.createdAt)) < 14 * 24 * 60 * 60 * 1000;

            // Fast complaint detection is computed below after processedVendors creation
            const { riskScore } = computeVendorRiskScore({
                refundRatePercent: vRefRate,
                cancelRatePercent: cancelRate90,
                avgRating: v.rating,
                volatilityIndex: volIdx,
                refundCount90d: vendorRefundCount90d[v.id] || 0,
                totalOrders90d: vendorTotalOrders90d[v.id] || 0,
                returnToPurchasePercent,
                hasFastComplaint: false, // will update post-processed
                isNewVendor,
                hasAnyRefund: (vendorRefundCount90d[v.id] || 0) > 0,
            });
            return { ...v, revenue: vRev30, refundRate: vRefRate, riskScore };
        });

        // 5. Order KPI (real)
        const totalOrders30 = orders30.length;
        const totalOrdersPrev = previousOrders.length;
        const orderGrowth = safePercentChange(totalOrders30, totalOrdersPrev);
        const successfulOrders30 = orders30.filter(o => o.status !== 'CANCELLED' && o.status !== 'RETURNED').length;
        const successRate = totalOrders30 > 0 ? (successfulOrders30 / totalOrders30) * 100 : 0;
        const cancelCount30 = orders30.filter(o => o.status === 'CANCELLED').length;
        const cancelRate = totalOrders30 > 0 ? (cancelCount30 / totalOrders30) * 100 : 0;

        // 6. Vendor KPI (real)
        const newVendors30 = allStores.filter(s => new Date(s.createdAt) >= thirtyDaysAgo).length;
        const sortedByRev = processedVendors.filter(v => v.revenue > 0).sort((a, b) => b.revenue - a.revenue);
        const totalVendorRev = sortedByRev.reduce((s, v) => s + v.revenue, 0);
        const topRevShare = totalVendorRev > 0 && sortedByRev.length > 0 ? (sortedByRev[0].revenue / totalVendorRev) * 100 : 0;
        const vendorsWithRating = processedVendors.filter(v => v.rating > 0);
        const avgVendorRating = vendorsWithRating.length > 0 ? vendorsWithRating.reduce((s, v) => s + v.rating, 0) / vendorsWithRating.length : 0;
        const vendorRefundRateAvg = totalVendorRev > 0
            ? sortedByRev.reduce((s, v) => s + (v.revenue * v.refundRate / 100), 0) / totalVendorRev
            : 0;

        // 7. User KPI newGrowth (real)
        const newUsersPrev30 = usersArray.filter(u => u.firstOrder >= sixtyDaysAgo && u.firstOrder < thirtyDaysAgo).length;
        const newGrowth = safePercentChange(newUsers30, newUsersPrev30);

        // 8. Vendor category revenue (real)
        const electronicsRev = processedVendors.filter(v => String(v.category).toLowerCase() === 'electronics').reduce((s, v) => s + v.revenue, 0);
        const fashionRev = processedVendors.filter(v => String(v.category).toLowerCase() === 'fashion').reduce((s, v) => s + v.revenue, 0);

        // 9. User Segments
        const highValueUsers = [...usersArray].sort((a, b) => b.spent - a.spent).slice(0, 5).map(u => ({
            id: u.id, name: u.name, revenue: u.spent, orders: u.count, ltv: u.spent * 1.2
        }));

        const catPref = { electronics: 0, fashion: 0 };
        usersArray.forEach(u => {
            if (u.categories.electronics > u.categories.fashion) catPref.electronics++;
            else if (u.categories.fashion > 0) catPref.fashion++;
        });

        // Response Construction
        const dashboardData = {
            // KPIs
            kpi: {
                gross: revCurrent.gross,
                net: netRev,
                refunds: refunds30,
                aov,
                growth: grossChange,
                refundRate,
                grossChange,
                netChange,
                aovChange,
                refundRateChange,
                sparkline: {
                    gross: toSparkline(sparkWindow.map(d => d.revenue)),
                    net: toSparkline(sparkWindow.map(d => d.net)),
                    aov: toSparkline(sparkWindow.map(d => (d.orders > 0 ? d.net / d.orders : 0))),
                    growth: toSparkline(sparkWindow.map(d => d.revenue)),
                    refundRate: toSparkline(sparkWindow.map(d => (d.revenue > 0 ? (d.refunds / d.revenue) * 100 : 0)))
                }
            },
            orderKpi: { total: totalOrders30, growth: orderGrowth, pending: orders30.filter(o => ['ORDER_PLACED', 'PROCESSING'].includes(o.status)).length, successRate, cancelRate, refundRate },
            vendorKpi: { active: processedVendors.filter(v => v.isActive).length, new: newVendors30, topRevShare, rating: Math.round(avgVendorRating * 10) / 10, refundRate: Math.round(vendorRefundRateAvg * 10) / 10, riskCount: processedVendors.filter(v => v.riskScore > 50).length },
            userKpi: { total: totalUsers, active: activeUsers30, new: newUsers30, newGrowth, repeatRate, arpu, ltv: arpu * 3 },

            // Charts
            revenueTrend: trendData,
            orderTrend: trendData,
            userTrend: trendData.map(d => ({ name: d.name, activeUsers: d.activeUsers, newUsers: d.newUsers, fullDate: d.fullDate })),

            waterfall: [
                { name: 'Gross', base: 0, value: revCurrent.gross, type: 'positive' },
                { name: 'Refunds', base: netRev, value: refunds30, type: 'negative' },
                { name: 'Net', base: 0, value: netRev, type: 'net' }
            ],
            categorySplit: Object.entries(categoryMap).map(([name, val]) => ({ name, revenue: val })).sort((a, b) => b.revenue - a.revenue),
            // Top categories per mode (Electronics / Fashion) for tabbed UI
            categoryByMode: (() => {
                const toList = (modeMap) => {
                    const entries = Object.entries(modeMap).filter(([, v]) => v > 0);
                    const total = entries.reduce((s, [, v]) => s + v, 0);
                    return entries
                        .map(([name, revenue]) => ({ name, revenue, contribution: total > 0 ? (revenue / total) * 100 : 0 }))
                        .sort((a, b) => b.revenue - a.revenue);
                };
                return { electronics: toList(categoryMapByMode.electronics), fashion: toList(categoryMapByMode.fashion) };
            })(),
            paymentMix: Object.entries(paymentMap).map(([name, val]) => ({ name, value: val, color: name === 'COD' ? '#f59e0b' : '#3b82f6' })),
            customer: { arpu },
            orderDist: Object.entries(statusMap).map(([name, val]) => ({
                name, value: val,
                color: name === 'DELIVERED' ? '#10b981' : name === 'CANCELLED' ? '#ef4444' : name === 'RETURNED' ? '#f97316' : name === 'ORDER_PLACED' ? '#a1a1aa' : '#3b82f6'
            })),
            cancelReasons: Object.entries(cancelReasonMap).map(([name, val]) => ({ name, value: val })).slice(0, 5),
            heatmap: heatMap.map((count, i) => ({ hour: i, hourLabel: `${i}:00`, count })),

            // --- ORDER INTELLIGENCE ---
            orderStatusDistribution: (() => {
                const created = totalOrders30;
                const paid = orders30.filter(o => o.isPaid).length;
                const confirmed = orders30.filter(o => ['PROCESSING', 'SHIPPED', 'DELIVERED'].includes(o.status)).length;
                const cancelled = statusMap.CANCELLED || 0;
                const refunded = statusMap.RETURNED || 0;
                return { created, paid, confirmed, cancelled, refunded };
            })(),
            categoryOrderMetrics: (() => {
                const prevByType = { electronics: 0, fashion: 0 };
                previousOrders.forEach(o => {
                    const st = (o.store?.storeType || 'electronics').toString().toLowerCase();
                    if (st === 'fashion') prevByType.fashion++;
                    else prevByType.electronics++;
                });
                const growth = (current, prev) => (prev > 0 ? safePercentChange(current, prev) : (current > 0 ? 100 : 0));
                return {
                    ordersElectronics: ordersByStoreType.electronics,
                    ordersFashion: ordersByStoreType.fashion,
                    categoryOrderGrowthElectronics: growth(ordersByStoreType.electronics, prevByType.electronics),
                    categoryOrderGrowthFashion: growth(ordersByStoreType.fashion, prevByType.fashion),
                    categoryOrderGrowthPercent: totalOrdersPrev > 0 ? safePercentChange(totalOrders30, totalOrdersPrev) : 0,
                };
            })(),
            cancellationIntelligence: (() => {
                const cancelRateByCategory = {
                    electronics: ordersByStoreType.electronics > 0 ? (cancelledByStoreType.electronics / ordersByStoreType.electronics) * 100 : 0,
                    fashion: ordersByStoreType.fashion > 0 ? (cancelledByStoreType.fashion / ordersByStoreType.fashion) * 100 : 0,
                };
                const HIGH_CANCEL_THRESHOLD = 15;
                let highCancellationVendorCount = 0;
                Object.keys(vendorOrderCount).forEach(sid => {
                    const orders = vendorOrderCount[sid] || 0;
                    const cancels = vendorCancelCount[sid] || 0;
                    if (orders > 0 && (cancels / orders) * 100 >= HIGH_CANCEL_THRESHOLD) highCancellationVendorCount++;
                });
                return {
                    topReasons: Object.entries(cancelReasonMap).map(([name, val]) => ({ name, value: val })).sort((a, b) => b.value - a.value).slice(0, 5),
                    cancelRateByCategory,
                    highCancellationVendorCount,
                };
            })(),
            orderBehavior: (() => {
                const byWeekday = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((label, i) => ({ day: label, count: weekdayMap[i] }));
                const totals = orders30.map(o => o.total);
                const sorted = [...totals].sort((a, b) => a - b);
                const p90Index = Math.floor(sorted.length * 0.9);
                const highValueThreshold = sorted.length > 0 ? sorted[Math.max(0, p90Index)] : 0;
                const highValueOrderCount = orders30.filter(o => o.total >= highValueThreshold && o.status !== 'CANCELLED' && o.status !== 'RETURNED').length;
                const highValueOrderPercent = totalOrders30 > 0 ? (highValueOrderCount / totalOrders30) * 100 : 0;
                return { byHour: heatMap.map((count, i) => ({ hour: i, hourLabel: `${i}:00`, count })), byWeekday, highValueOrderCount, highValueOrderPercent, highValueThreshold: highValueThreshold || 0 };
            })(),
            paymentOrderMetrics: (() => {
                const paidCount = orders30.filter(o => o.isPaid).length;
                const successRate = totalOrders30 > 0 ? (paidCount / totalOrders30) * 100 : 0;
                const failureRate = 100 - successRate;
                const byMethod = Object.entries(ordersByPaymentCount).map(([name, count]) => ({ name, count, percent: totalOrders30 > 0 ? (count / totalOrders30) * 100 : 0 }));
                return { paymentSuccessRate: successRate, paymentFailureRate: failureRate, ordersByPaymentMethod: byMethod };
            })(),
            orderHealth: (() => {
                const deliveredOrders = orders30.filter(o => o.status === 'DELIVERED');
                const processingTimes = deliveredOrders.map(o => (new Date(o.updatedAt) - new Date(o.createdAt)) / (1000 * 60 * 60));
                const avgProcessingTimeHours = processingTimes.length > 0 ? processingTimes.reduce((a, b) => a + b, 0) / processingTimes.length : 0;
                const userOrderDates = {};
                orders30.forEach(o => {
                    const uid = o.userId;
                    if (!userOrderDates[uid]) userOrderDates[uid] = [];
                    userOrderDates[uid].push(new Date(o.createdAt).getTime());
                });
                Object.keys(userOrderDates).forEach(uid => userOrderDates[uid].sort((a, b) => a - b));
                let repeatIntervals = [];
                Object.values(userOrderDates).forEach(dates => {
                    for (let i = 1; i < dates.length; i++) repeatIntervals.push((dates[i] - dates[i - 1]) / (1000 * 60 * 60 * 24));
                });
                const repeatOrderIntervalDays = repeatIntervals.length > 0 ? repeatIntervals.reduce((a, b) => a + b, 0) / repeatIntervals.length : 0;
                return { avgProcessingTimeHours: Math.round(avgProcessingTimeHours * 10) / 10, repeatOrderIntervalDays: Math.round(repeatOrderIntervalDays * 10) / 10 };
            })(),
            orderRiskSignals: (() => {
                const sortedTotals = [...orders30].map(o => o.total).sort((a, b) => a - b);
                const p90Idx = Math.floor(sortedTotals.length * 0.9);
                const highValThresh = sortedTotals.length > 0 ? sortedTotals[Math.max(0, p90Idx)] : 0;
                const last7Orders = trendData.slice(-7).reduce((s, d) => s + d.orders, 0);
                const prior7Orders = trendData.slice(-14, -7).reduce((s, d) => s + d.orders, 0);
                const demandSpike = prior7Orders > 0 ? ((last7Orders - prior7Orders) / prior7Orders) * 100 : 0;
                const last7Cancelled = trendData.slice(-7).reduce((s, d) => s + d.cancelled, 0);
                const prior7Cancelled = trendData.slice(-14, -7).reduce((s, d) => s + d.cancelled, 0);
                const cancelSpike = prior7Cancelled > 0 ? ((last7Cancelled - prior7Cancelled) / prior7Cancelled) * 100 : (last7Cancelled > 0 ? 100 : 0);
                const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                const highValueOrdersLast7 = orders30.filter(o => new Date(o.createdAt) >= sevenDaysAgo && o.total >= highValThresh && o.status !== 'CANCELLED' && o.status !== 'RETURNED');
                const highValueCluster = highValueOrdersLast7.length >= 3;
                const paymentMethods = Object.keys(ordersByPaymentCount);
                const totalByMethod = Object.values(ordersByPaymentCount).reduce((s, v) => s + v, 0);
                const dominantShare = totalByMethod > 0 ? (Math.max(...Object.values(ordersByPaymentCount)) / totalByMethod) * 100 : 0;
                const unusualPayment = paymentMethods.length >= 2 && dominantShare > 85;
                return {
                    demandSpikeDetected: demandSpike > 25,
                    demandSpikePercent: demandSpike,
                    cancellationSpikeDetected: cancelSpike > 30,
                    cancellationSpikePercent: cancelSpike,
                    highValueClusterDetected: highValueCluster,
                    highValueClusterCount: highValueOrdersLast7.length,
                    unusualPaymentDetected: unusualPayment,
                    dominantPaymentShare: dominantShare,
                };
            })(),

            // Lists
            highValueOrders: [...orders30].sort((a, b) => b.total - a.total).slice(0, 5).map(o => ({ id: o.id, user: o.user?.name, total: o.total, status: o.status, payment: o.paymentMethod })),
            vendorLeaderboard: [...processedVendors].sort((a, b) => b.revenue - a.revenue).slice(0, 10),
            vendorDist: [...processedVendors].sort((a, b) => b.revenue - a.revenue).slice(0, 5).map(v => ({ name: v.name, value: v.revenue })),
            vendorCategorySplit: [{ name: 'Electronics', count: processedVendors.filter(v => String(v.category).toLowerCase() === 'electronics').length, revenue: electronicsRev }, { name: 'Fashion', count: processedVendors.filter(v => String(v.category).toLowerCase() === 'fashion').length, revenue: fashionRev }],

            // User Specific
            highValueUsers,
            userCatSplit: [{ name: 'Electronics', value: catPref.electronics, color: '#3b82f6' }, { name: 'Fashion', value: catPref.fashion, color: '#ec4899' }],
            userFreqDist: [{ name: '1 Order', value: usersArray.filter(u => u.count === 1).length }, { name: '2-5 Orders', value: usersArray.filter(u => u.count > 1 && u.count <= 5).length }, { name: '5+ Orders', value: usersArray.filter(u => u.count > 5).length }],

            // Alerts (Mocked based on data)
            vendorAlerts: processedVendors.filter(v => v.riskScore > 50).map(v => ({ vendor: v.name, type: 'High Risk Score', value: `Score: ${v.riskScore}` })),
            userAlerts: [],

            // --- REVENUE INTELLIGENCE ADDITIONS ---

            // Revenue Concentration: risk level + top 5 stores per mode (Electronics / Fashion)
            revenueConcentration: (() => {
                const sorted = processedVendors.filter(v => v.revenue > 0).sort((a, b) => b.revenue - a.revenue);
                const totalVendorRev = sorted.reduce((s, v) => s + v.revenue, 0);
                const top3 = sorted.slice(0, 3).map(v => ({
                    name: v.name, revenue: v.revenue,
                    share: totalVendorRev > 0 ? ((v.revenue / totalVendorRev) * 100) : 0
                }));
                const top3Share = top3.reduce((s, v) => s + v.share, 0);
                const riskLevel = top3Share > 80 ? 'High' : top3Share > 60 ? 'Moderate' : 'Low';
                const toTop5 = (modeRev, list) => list
                    .filter(v => String(v.category).toLowerCase() === modeRev.key)
                    .sort((a, b) => b.revenue - a.revenue)
                    .slice(0, 5)
                    .map(v => ({ name: v.name, revenue: v.revenue, share: modeRev.total > 0 ? (v.revenue / modeRev.total) * 100 : 0 }));
                const topStoresByMode = {
                    electronics: toTop5({ key: 'electronics', total: electronicsRev }, processedVendors),
                    fashion: toTop5({ key: 'fashion', total: fashionRev }, processedVendors),
                };
                return { top3, totalShare: top3Share, riskLevel, topStoresByMode };
            })(),

            // Payment Breakdown (with % and value); ensure display names for COD/STRIPE
            paymentBreakdown: (() => {
                const totalPay = Object.values(paymentMap).reduce((s, v) => s + v, 0);
                const colors = { COD: '#f59e0b', STRIPE: '#6366f1', UPI: '#8b5cf6', 'Credit Card': '#3b82f6', Card: '#3b82f6', Wallet: '#10b981', Stripe: '#6366f1', Online: '#06b6d4' };
                const displayNames = { COD: 'Cash on Delivery', STRIPE: 'Stripe / Card' };
                return Object.entries(paymentMap).map(([name, value]) => ({
                    name: displayNames[name] || name,
                    value,
                    percent: totalPay > 0 ? ((value / totalPay) * 100) : 0,
                    color: colors[name] || '#71717a'
                })).sort((a, b) => b.value - a.value);
            })(),

            // Category Revenue (extended)
            categoryRevenue: (() => {
                const totalCatRev = Object.values(categoryMap).reduce((s, v) => s + v, 0);
                return Object.entries(categoryMap).map(([name, revenue]) => ({
                    name, revenue,
                    contribution: totalCatRev > 0 ? ((revenue / totalCatRev) * 100) : 0,
                    margin: null,
                    sparkline: toSparkline(trendData.slice(-7).map(d => d.revenue * (revenue / (totalCatRev || 1))))
                })).sort((a, b) => b.revenue - a.revenue);
            })(),

            // Customer Revenue Metrics
            customerRevenue: {
                arpu,
                repeatPurchaseRevPercent: (() => {
                    const repeatRevenue = usersArray.filter(u => u.count > 1).reduce((s, u) => s + u.spent, 0);
                    const totalRevenue = usersArray.reduce((s, u) => s + u.spent, 0);
                    return totalRevenue > 0 ? (repeatRevenue / totalRevenue) * 100 : 0;
                })(),
                ltv: arpu * 3,
                arpuTrend: toSparkline(trendData.slice(-7).map(d => d.activeUsers > 0 ? d.revenue / d.activeUsers : 0))
            },

            // AI Revenue Forecast
            aiForecast: (() => {
                const last7 = trendData.slice(-7);
                // Base prediction on Weighted Moving Average (more weight to recent days)
                let weightedSum = 0;
                let weightSum = 0;
                last7.forEach((d, i) => {
                    const weight = i + 1; // 1 to length
                    weightedSum += d.revenue * weight;
                    weightSum += weight;
                });
                const wmaDaily = weightSum > 0 ? weightedSum / weightSum : 0;
                const predicted30 = wmaDaily * 30;

                const mean = last7.reduce((s, d) => s + d.revenue, 0) / (last7.length || 1);
                const variance = last7.reduce((s, d) => s + Math.pow(d.revenue - mean, 2), 0) / (last7.length || 1);
                const stddev = Math.sqrt(variance);
                const cv = mean > 0 ? (stddev / mean) : 0;

                // Stability and confidence
                const stability = Math.max(0, Math.min(100, Math.round((1 - cv) * 100)));
                const confidence = Math.max(40, Math.min(95, stability + 5));
                return { predicted30, confidence, stability, avgDaily: wmaDaily };
            })(),

            // AI Risk Signals
            aiRiskSignals: (() => {
                const signals = [];
                const last7Rev = trendData.slice(-7).reduce((s, d) => s + d.revenue, 0);
                const prior7Rev = trendData.slice(-14, -7).reduce((s, d) => s + d.revenue, 0);
                const dropPct = prior7Rev > 0 ? ((prior7Rev - last7Rev) / prior7Rev) * 100 : 0;
                if (dropPct > 15) signals.push({ type: 'Revenue Drop', severity: 'critical', message: `Revenue dropped ${dropPct.toFixed(1)}% vs prior week`, detected: true });
                else signals.push({ type: 'Revenue Drop', severity: 'ok', message: `Revenue stable (${dropPct > 0 ? '-' : '+'}${Math.abs(dropPct).toFixed(1)}% WoW)`, detected: false });
                if (refundRate > 8) signals.push({ type: 'Refund Spike', severity: 'warning', message: `Refund rate at ${refundRate.toFixed(1)}% — above threshold`, detected: true });
                else signals.push({ type: 'Refund Spike', severity: 'ok', message: `Refund rate normal (${refundRate.toFixed(1)}%)`, detected: false });
                const catEntries = Object.entries(categoryMap);
                if (catEntries.length > 1) {
                    const catSorted = catEntries.sort((a, b) => b[1] - a[1]);
                    const ratio = catSorted[0][1] > 0 ? (catSorted[catSorted.length - 1][1] / catSorted[0][1]) * 100 : 0;
                    if (ratio < 20) signals.push({ type: 'Category Decline', severity: 'warning', message: `${catSorted[catSorted.length - 1][0]} contributes only ${ratio.toFixed(0)}% of ${catSorted[0][0]}`, detected: true });
                    else signals.push({ type: 'Category Decline', severity: 'ok', message: 'Category revenue balanced', detected: false });
                }
                return signals;
            })(),

            // AI Volatility
            aiVolatility: (() => {
                const revenues = trendData.map(d => d.revenue);
                const mean = revenues.reduce((s, v) => s + v, 0) / (revenues.length || 1);
                const variance = revenues.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / (revenues.length || 1);
                const stddev = Math.sqrt(variance);
                const index = mean > 0 ? Math.round((stddev / mean) * 100) : 0;
                const badge = index > 40 ? 'High' : index > 20 ? 'Moderate' : 'Low';
                return { index, badge, stddev: Math.round(stddev) };
            })(),

            // Revenue Alerts
            revenueAlerts: (() => {
                const alerts = [];
                const ts = now.toISOString();
                const last7Rev = trendData.slice(-7).reduce((s, d) => s + d.revenue, 0);
                const prior7Rev = trendData.slice(-14, -7).reduce((s, d) => s + d.revenue, 0);
                const dropPct = prior7Rev > 0 ? ((prior7Rev - last7Rev) / prior7Rev) * 100 : 0;
                if (dropPct > 10) alerts.push({ type: 'Revenue Drop', severity: dropPct > 20 ? 'critical' : 'warning', message: `Revenue declined ${dropPct.toFixed(1)}% week-over-week`, timestamp: ts, action: 'Investigate' });
                if (refundRate > 5) alerts.push({ type: 'Refund Surge', severity: refundRate > 10 ? 'critical' : 'warning', message: `Refund rate at ${refundRate.toFixed(1)}% — exceeds safe threshold`, timestamp: ts, action: 'Investigate' });
                const sortedV = processedVendors.filter(v => v.revenue > 0).sort((a, b) => b.revenue - a.revenue);
                const totalVR = sortedV.reduce((s, v) => s + v.revenue, 0);
                const topShare = totalVR > 0 && sortedV.length > 0 ? (sortedV[0].revenue / totalVR) * 100 : 0;
                if (topShare > 50) alerts.push({ type: 'Vendor Dependency', severity: 'warning', message: `${sortedV[0].name} accounts for ${topShare.toFixed(0)}% of revenue`, timestamp: ts, action: 'View' });
                const catEntries2 = Object.entries(categoryMap);
                if (catEntries2.length > 1) {
                    const catSorted2 = catEntries2.sort((a, b) => b[1] - a[1]);
                    const ratio2 = catSorted2[0][1] > 0 ? (catSorted2[catSorted2.length - 1][1] / catSorted2[0][1]) * 100 : 0;
                    if (ratio2 < 25) alerts.push({ type: 'Category Imbalance', severity: 'info', message: `${catSorted2[catSorted2.length - 1][0]} is significantly underperforming`, timestamp: ts, action: 'View' });
                }
                return alerts;
            })(),

            // --- VENDOR INTELLIGENCE ---
            vendorIntelligence: (() => {
                // 1) Vendor Order Performance
                const ordersPerVendor = [...processedVendors].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).map(v => {
                    const ordersCur = vendorOrderCount[v.id] || 0;
                    const ordersPrev = vendorOrderCountPrev[v.id] || 0;
                    const orderGrowthPct = ordersPrev > 0 ? safePercentChange(ordersCur, ordersPrev) : (ordersCur > 0 ? 100 : 0);
                    const cancelCount = vendorCancelCount[v.id] || 0;
                    const cancelRatePct = ordersCur > 0 ? (cancelCount / ordersCur) * 100 : 0;
                    const successCount = ordersCur - cancelCount - (v.refunds || 0);
                    const successRatePct = ordersCur > 0 ? (successCount / ordersCur) * 100 : 0;
                    return {
                        vendorId: v.id,
                        vendorName: v.name,
                        category: v.category,
                        orders: ordersCur,
                        orderGrowthPct: Math.round(orderGrowthPct * 10) / 10,
                        cancellationRatePct: Math.round(cancelRatePct * 10) / 10,
                        refundRatePct: Math.round(v.refundRate * 10) / 10,
                        successfulOrderRatePct: Math.round(successRatePct * 10) / 10,
                    };
                });

                // 2) Vendor Quality Metrics (review count, low-rating count, rating trend)
                const vendorQuality = [...allStores].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).map(s => {
                    let ratingSum = 0, ratingCount = 0;
                    const ratingByDate = []; // { createdAt, rating } for trend
                    s.Product.forEach(p => {
                        p.rating.forEach(r => {
                            ratingSum += r.rating;
                            ratingCount++;
                            if (r.createdAt) ratingByDate.push({ createdAt: new Date(r.createdAt), rating: r.rating });
                        });
                    });
                    const avgRating = ratingCount > 0 ? ratingSum / ratingCount : 0;
                    const lowRating = avgRating > 0 && avgRating < 3;
                    ratingByDate.sort((a, b) => a.createdAt - b.createdAt);
                    const now = new Date();
                    const last14 = ratingByDate.filter(x => x.createdAt >= fourteenDaysAgo);
                    const recent14 = last14.filter(x => x.createdAt >= sevenDaysAgo);
                    const prior14 = last14.filter(x => x.createdAt < sevenDaysAgo);
                    const avgRecent = recent14.length > 0 ? recent14.reduce((a, x) => a + x.rating, 0) / recent14.length : 0;
                    const avgPrior = prior14.length > 0 ? prior14.reduce((a, x) => a + x.rating, 0) / prior14.length : 0;
                    let ratingTrend = 'stable';
                    if (recent14.length >= 2 && prior14.length >= 2) {
                        if (avgRecent - avgPrior > 0.3) ratingTrend = 'improving';
                        else if (avgPrior - avgRecent > 0.3) ratingTrend = 'declining';
                    }
                    return {
                        vendorId: s.id,
                        vendorName: s.name,
                        rating: Math.round(avgRating * 10) / 10,
                        reviewCount: ratingCount,
                        lowRating: lowRating,
                        ratingTrend,
                    };
                });
                const lowRatingVendorCount = vendorQuality.filter(q => q.lowRating).length;

                // 3) Vendor Category Metrics
                const vendorCountByCategory = { electronics: 0, fashion: 0 };
                const revenueByVendorCategory = { electronics: 0, fashion: 0 };
                const ordersByVendorCategory = { electronics: 0, fashion: 0 };
                processedVendors.forEach(v => {
                    const cat = String(v.category).toLowerCase() === 'fashion' ? 'fashion' : 'electronics';
                    vendorCountByCategory[cat]++;
                    revenueByVendorCategory[cat] += v.revenue || 0;
                    ordersByVendorCategory[cat] += vendorOrderCount[v.id] || 0;
                });
                const ordersElectronicsPrev = Object.keys(vendorOrderCountPrev).filter(sid => {
                    const store = allStores.find(s => s.id === sid);
                    return store && String(store.storeType).toLowerCase() === 'electronics';
                }).reduce((s, sid) => s + (vendorOrderCountPrev[sid] || 0), 0);
                const ordersFashionPrev = Object.keys(vendorOrderCountPrev).filter(sid => {
                    const store = allStores.find(s => s.id === sid);
                    return store && String(store.storeType).toLowerCase() === 'fashion';
                }).reduce((s, sid) => s + (vendorOrderCountPrev[sid] || 0), 0);
                const categoryWiseVendorGrowthPct = {
                    electronics: ordersElectronicsPrev > 0 ? safePercentChange(ordersByVendorCategory.electronics, ordersElectronicsPrev) : 0,
                    fashion: ordersFashionPrev > 0 ? safePercentChange(ordersByVendorCategory.fashion, ordersFashionPrev) : 0,
                };

                // 4) Inventory Reliability (only if stock exists)
                const vendorsWithOutOfStock = [];
                const pctProductsOutOfStockPerVendor = [];
                let revenueAtRiskStockout = 0;
                let lowStockAlertCount = 0;
                allStores.forEach(s => {
                    const total = s.Product.length;
                    const outOfStockProducts = s.Product.filter(p => !p.inStock);
                    const outOfStock = outOfStockProducts.length;

                    if (outOfStock > 0) {
                        vendorsWithOutOfStock.push({ vendorId: s.id, vendorName: s.name, outOfStockCount: outOfStock });
                        pctProductsOutOfStockPerVendor.push({
                            vendorId: s.id,
                            vendorName: s.name,
                            pct: total > 0 ? Math.round((outOfStock / total) * 1000) / 10 : 0,
                            outOfStock: outOfStock,
                            total,
                        });
                        lowStockAlertCount += outOfStock;
                    }

                    // Calculate revenue at risk using the specific price of the out-of-stock items, 
                    // assuming each item could have sold at least once. (A real model would use historic sales velocity)
                    outOfStockProducts.forEach(p => {
                        revenueAtRiskStockout += (p.price || 0);
                    });
                });

                // 5) AI-Based Vendor Metrics
                const vendorRevenueSeries = Object.keys(vendorRevenueByDay).map(sid => {
                    const days = Object.entries(vendorRevenueByDay[sid] || {}).filter(([d]) => d >= fourteenDaysAgo.toISOString().split('T')[0]).map(([, val]) => val);
                    return { sid, series: days };
                });
                const revenueVolatilityByVendor = processedVendors.map(v => {
                    const series = (vendorRevenueByDay[v.id] || {});
                    const values = Object.values(series).filter(Number.isFinite);
                    if (values.length < 2) return { vendorId: v.id, vendorName: v.name, volatilityIndex: 0 };
                    const mean = values.reduce((a, b) => a + b, 0) / values.length;
                    const variance = values.reduce((s, x) => s + Math.pow(x - mean, 2), 0) / values.length;
                    const stddev = Math.sqrt(variance);
                    const index = mean > 0 ? Math.round((stddev / mean) * 100) : 0;
                    return { vendorId: v.id, vendorName: v.name, volatilityIndex: index };
                });

                const refundSpikeDetection = processedVendors.filter(v => {
                    const last7Ref = vendorRefundCountLast7[v.id] || 0;
                    const last7Ord = vendorOrdersLast7[v.id] || 0;
                    const prior7Ref = vendorRefundCountPrior21[v.id] || 0;
                    const prior7Ord = vendorOrdersPrior7[v.id] || 0;
                    const rateLast7 = last7Ord > 0 ? (last7Ref / last7Ord) * 100 : 0;
                    const ratePrior = prior7Ord > 0 ? (prior7Ref / prior7Ord) * 100 : 0;
                    return ratePrior > 0 && rateLast7 > ratePrior * 1.5;
                }).map(v => ({ vendorId: v.id, vendorName: v.name, type: 'refund_spike' }));

                const cancellationSpikeDetection = processedVendors.filter(v => {
                    const last7 = vendorCancelCountLast7[v.id] || 0;
                    const prior = vendorCancelCountPrior21[v.id] || 0;
                    const last7Ord = vendorOrdersLast7[v.id] || 0;
                    const priorOrd = vendorOrdersPrior7[v.id] || 0;
                    const rateLast7 = last7Ord > 0 ? (last7 / last7Ord) * 100 : 0;
                    const ratePrior = priorOrd > 0 ? (prior / priorOrd) * 100 : 0;
                    return ratePrior > 0 && rateLast7 > ratePrior * 1.5;
                }).map(v => ({ vendorId: v.id, vendorName: v.name, type: 'cancellation_spike' }));

                const suddenRevenueDropDetection = processedVendors.filter(v => {
                    const revLast7 = vendorRevenueLast7[v.id] || 0;
                    const revPrior7 = vendorRevenuePrior7[v.id] || 0;
                    if (revPrior7 <= 0) return false;
                    const dropPct = ((revPrior7 - revLast7) / revPrior7) * 100;
                    return dropPct > 20;
                }).map(v => {
                    const revLast7 = vendorRevenueLast7[v.id] || 0;
                    const revPrior7 = vendorRevenuePrior7[v.id] || 0;
                    const dropPct = revPrior7 > 0 ? ((revPrior7 - revLast7) / revPrior7) * 100 : 0;
                    return { vendorId: v.id, vendorName: v.name, dropPct: Math.round(dropPct * 10) / 10, type: 'revenue_drop' };
                });

                const abnormalOrderSpikeDetection = processedVendors.filter(v => {
                    const last7 = vendorOrdersLast7[v.id] || 0;
                    const prior7 = vendorOrdersPrior7[v.id] || 0;
                    if (prior7 <= 0) return false;
                    const spikePct = ((last7 - prior7) / prior7) * 100;
                    return spikePct > 50;
                }).map(v => {
                    const last7 = vendorOrdersLast7[v.id] || 0;
                    const prior7 = vendorOrdersPrior7[v.id] || 0;
                    const spikePct = prior7 > 0 ? ((last7 - prior7) / prior7) * 100 : 0;
                    return { vendorId: v.id, vendorName: v.name, spikePct: Math.round(spikePct * 10) / 10, type: 'order_spike' };
                });

                const storeUserIdMap = {};
                allStores.forEach(s => { storeUserIdMap[s.id] = s.userId; });
                const selfPurchaseOrders = orders30.filter(o => o.store?.id && storeUserIdMap[o.store.id] === o.userId);
                const selfPurchasePatternDetection = [...new Set(selfPurchaseOrders.map(o => o.store?.id))].map(sid => {
                    const count = selfPurchaseOrders.filter(o => o.store?.id === sid).length;
                    const store = allStores.find(s => s.id === sid);
                    return { vendorId: sid, vendorName: store?.name || sid, selfOrderCount: count, type: 'self_purchase' };
                }).filter(x => x.selfOrderCount > 0);

                const reviewManipulationSuspicion = [];
                allStores.forEach(s => {
                    const ratings = [];
                    s.Product.forEach(p => p.rating.forEach(r => ratings.push({ ...r, productId: p.id })));
                    if (ratings.length < 5) return;
                    const last7 = ratings.filter(r => new Date(r.createdAt) >= sevenDaysAgo);
                    const fiveStarLast7 = last7.filter(r => r.rating === 5).length;
                    const uniqueUsers = new Set(last7.map(r => r.userId)).size;
                    if (last7.length >= 3 && fiveStarLast7 / last7.length >= 0.9 && uniqueUsers <= 2)
                        reviewManipulationSuspicion.push({ vendorId: s.id, vendorName: s.name, recentReviews: last7.length, fiveStarShare: Math.round((fiveStarLast7 / last7.length) * 100), type: 'review_manipulation' });
                });

                const vendorDefaultProbability = [...processedVendors].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).map(v => {
                    const q = vendorQuality.find(q => q.vendorId === v.id);
                    const refund = v.refundRate || 0;
                    const rating = q?.rating || 0;
                    const revLast7 = vendorRevenueLast7[v.id] || 0;
                    const revPrior7 = vendorRevenuePrior7[v.id] || 0;
                    const drop = revPrior7 > 0 ? ((revPrior7 - revLast7) / revPrior7) * 100 : 0;
                    // Base from shared risk score, then add revenue-drop specific signals
                    let prob = v.riskScore * 0.6; // Use 60% of unified risk score as base
                    if (drop > 30) prob += 25;
                    else if (drop > 20) prob += 10;
                    return { vendorId: v.id, vendorName: v.name, defaultProbability: Math.min(100, Math.round(prob)), riskScore: v.riskScore };
                });

                // Fast-complaint detection for dashboard vendors
                const vendorFastComplaint = {};
                allReportsForRisk.forEach((report) => {
                    const storeId = report.product?.storeId;
                    if (!storeId) return;
                    const reportTime = new Date(report.createdAt).getTime();
                    (report.product?.orderItems || []).forEach((oi) => {
                        if (oi.order?.status === 'DELIVERED' && oi.order?.storeId === storeId) {
                            const deliveryTime = new Date(oi.order.updatedAt).getTime();
                            const gapMs = reportTime - deliveryTime;
                            if (gapMs >= 0 && gapMs < 2 * 60 * 60 * 1000) {
                                const gapMin = gapMs / (1000 * 60);
                                if (!vendorFastComplaint[storeId] || gapMin < vendorFastComplaint[storeId]) {
                                    vendorFastComplaint[storeId] = gapMin;
                                }
                            }
                        }
                    });
                });

                // Weighted risk score 0-100: unified via computeVendorRiskScore
                const vendorRiskScoresWeighted = [...processedVendors].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).map(v => {
                    const cancelRate = (vendorOrderCount[v.id] || 0) > 0 ? ((vendorCancelCount[v.id] || 0) / (vendorOrderCount[v.id] || 1)) * 100 : 0;
                    const q = vendorQuality.find(x => x.vendorId === v.id);
                    const rating = q?.rating || 0;
                    const vol = revenueVolatilityByVendor.find(x => x.vendorId === v.id);
                    const volatility = vol?.volatilityIndex || 0;
                    const totalOrd90 = vendorTotalOrders90d[v.id] || 0;
                    const refCnt90 = vendorRefundCount90d[v.id] || 0;
                    const returnRatio = totalOrd90 > 0 ? (refCnt90 / totalOrd90) * 100 : 0;
                    const hasFast = vendorFastComplaint[v.id] != null;
                    const isNewVendor = v.createdAt && (now - new Date(v.createdAt)) < 14 * 24 * 60 * 60 * 1000;

                    const { riskScore, reasons } = computeVendorRiskScore({
                        refundRatePercent: v.refundRate || 0,
                        cancelRatePercent: cancelRate,
                        avgRating: rating,
                        volatilityIndex: volatility,
                        refundCount90d: refCnt90,
                        totalOrders90d: totalOrd90,
                        returnToPurchasePercent: returnRatio,
                        hasFastComplaint: hasFast,
                        fastComplaintMinutes: vendorFastComplaint[v.id] ?? null,
                        isNewVendor,
                        hasAnyRefund: refCnt90 > 0,
                    });
                    return { vendorId: v.id, vendorName: v.name, riskScore: Math.min(100, Math.round(riskScore)), reasons };
                });

                return {
                    vendorOrderPerformance: {
                        ordersPerVendor: ordersPerVendor,
                        summary: {
                            avgOrderGrowthPct: ordersPerVendor.length > 0 ? ordersPerVendor.reduce((s, v) => s + v.orderGrowthPct, 0) / ordersPerVendor.length : 0,
                            avgCancellationRatePct: ordersPerVendor.length > 0 ? ordersPerVendor.reduce((s, v) => s + v.cancellationRatePct, 0) / ordersPerVendor.length : 0,
                            avgRefundRatePct: ordersPerVendor.length > 0 ? ordersPerVendor.reduce((s, v) => s + v.refundRatePct, 0) / ordersPerVendor.length : 0,
                            avgSuccessRatePct: ordersPerVendor.length > 0 ? ordersPerVendor.reduce((s, v) => s + v.successfulOrderRatePct, 0) / ordersPerVendor.length : 0,
                        },
                    },
                    vendorQuality: {
                        byVendor: vendorQuality,
                        reviewCountPerVendor: vendorQuality.map(q => ({ vendorId: q.vendorId, vendorName: q.vendorName, reviewCount: q.reviewCount, rating: q.rating })),
                        lowRatingVendorCount,
                        ratingTrendSummary: vendorQuality.filter(q => q.ratingTrend !== 'stable').map(q => ({ vendorId: q.vendorId, vendorName: q.vendorName, trend: q.ratingTrend })),
                    },
                    vendorCategory: {
                        vendorCountByCategory: { electronics: vendorCountByCategory.electronics, fashion: vendorCountByCategory.fashion },
                        revenueByVendorCategory: { electronics: revenueByVendorCategory.electronics, fashion: revenueByVendorCategory.fashion },
                        ordersByVendorCategory: { electronics: ordersByVendorCategory.electronics, fashion: ordersByVendorCategory.fashion },
                        categoryWiseVendorGrowthPct,
                    },
                    inventoryReliability: {
                        vendorsWithOutOfStock,
                        pctProductsOutOfStockPerVendor,
                        revenueAtRiskStockout: Math.round(revenueAtRiskStockout),
                        lowStockAlertCount,
                    },
                    aiVendorMetrics: {
                        vendorRiskScores: vendorRiskScoresWeighted,
                        refundSpikeDetection,
                        cancellationSpikeDetection,
                        suddenRevenueDropDetection,
                        revenueVolatilityIndex: revenueVolatilityByVendor,
                        vendorDefaultProbability,
                        abnormalOrderSpikeDetection,
                        selfPurchasePatternDetection,
                        reviewManipulationSuspicion,
                    },
                };
            })(),

            // --- USER INTELLIGENCE ---
            userIntelligence: (() => {
                const totalRevenue = usersArray.reduce((s, u) => s + u.spent, 0);
                const returningUsers30 = activeUsers30 - newUsers30;
                const inactiveUsers30 = totalUsers - activeUsers30;
                const activePrev30 = new Set(previousOrders.map(o => o.userId)).size;
                const churnedCount = usersArray.filter(u => {
                    const hadOrderPrev = previousOrders.some(o => o.userId === u.id);
                    const hasOrderCur = orders30.some(o => o.userId === u.id);
                    return hadOrderPrev && !hasOrderCur;
                }).length;
                const churnRate = activePrev30 > 0 ? (churnedCount / activePrev30) * 100 : 0;
                const INACTIVE_DAYS = 30;
                const inactiveCountXDays = usersArray.filter(u => (now - u.lastOrder) / (1000 * 60 * 60 * 24) > INACTIVE_DAYS).length;

                // 1) User Growth Metrics
                const userGrowthPercent = totalUsers > 0 && totalRegisteredUsers > 0 ? safePercentChange(totalUsers, Math.max(1, totalRegisteredUsers - newUsers30)) : (newUsers30 / (totalRegisteredUsers || 1)) * 100;
                const newVsReturningRatio = returningUsers30 > 0 ? (newUsers30 / returningUsers30) : (newUsers30 > 0 ? 1 : 0);
                const activeVsInactiveTrend = trendData.map(d => ({
                    date: d.date,
                    name: d.name,
                    active: d.activeUsers,
                    inactive: Math.max(0, totalUsers - d.activeUsers)
                }));

                // 2) User Revenue Metrics
                const revenueByNewUsers = usersArray.filter(u => u.firstOrder >= thirtyDaysAgo).reduce((s, u) => s + u.spent, 0);
                const revenueByReturningUsers = totalRevenue - revenueByNewUsers;
                const top5Revenue = usersArray.sort((a, b) => b.spent - a.spent).slice(0, 5).reduce((s, u) => s + u.spent, 0);
                const topUsersRevenueContributionPercent = totalRevenue > 0 ? (top5Revenue / totalRevenue) * 100 : 0;
                const p90Spent = (() => {
                    const sorted = [...usersArray].sort((a, b) => b.spent - a.spent);
                    const idx = Math.floor(sorted.length * 0.1);
                    return sorted.length > 0 ? sorted[Math.max(0, idx)].spent : 0;
                })();
                const highValueUsersCount = usersArray.filter(u => u.spent >= p90Spent && p90Spent > 0).length;
                const ordersPerUserAvg = totalUsers > 0 ? usersArray.reduce((s, u) => s + u.count, 0) / totalUsers : 0;

                // 3) User Behavior (already have userFreqDist, userCatSplit); add avg days between orders from orderHealth
                const avgOrdersPerUser = ordersPerUserAvg;
                const paymentMethodPreference = Object.entries(ordersByPaymentCount).map(([name, count]) => ({ name, count, percent: totalOrders30 > 0 ? (count / totalOrders30) * 100 : 0 }));

                // 4) User Conversion Metrics
                const registrationToPurchaseRate = totalRegisteredUsers > 0 ? (totalUsers / totalRegisteredUsers) * 100 : 0;
                const cartToPurchaseRate = null; // Cart data not tracked in this aggregation
                const dropOffRegisteredToActive = totalRegisteredUsers > 0 ? 100 - (activeUsers30 / totalRegisteredUsers) * 100 : 0;
                const dropOffActiveToRepeat = activeUsers30 > 0 ? 100 - (repeatUsers / activeUsers30) * 100 : 0;

                // 5) Cohort & Retention
                const cohortByMonth = {};
                usersArray.forEach(u => {
                    const key = u.firstOrder.toISOString().slice(0, 7);
                    if (!cohortByMonth[key]) cohortByMonth[key] = { users: [], revenue: 0 };
                    cohortByMonth[key].users.push(u.id);
                    cohortByMonth[key].revenue += u.spent;
                });
                const cohortRetention = Object.entries(cohortByMonth).map(([month, d]) => {
                    const repeatInCohort = d.users.filter(uid => { const u = usersArray.find(x => x.id === uid); return u && u.count > 1; }).length;
                    return {
                        cohort: month,
                        userCount: d.users.length,
                        revenue: d.revenue,
                        retentionPercent: d.users.length > 0 ? (repeatInCohort / d.users.length) * 100 : 0
                    };
                }).sort((a, b) => b.cohort.localeCompare(a.cohort)).slice(0, 6);
                const monthlyCohortRetentionPercent = cohortRetention.length > 0 ? cohortRetention.reduce((s, c) => s + (c.retentionPercent || 0), 0) / cohortRetention.length : 0;

                // 6) AI-Based User Metrics
                const aov = revCurrent.orders > 0 ? netRev / revCurrent.orders : 0;
                // LTV Prediction with retention multiplier
                const retentionMultiplier = 1 + (monthlyCohortRetentionPercent / 100);
                const ltvPrediction = aov * avgOrdersPerUser * retentionMultiplier;

                const highValueUserProbability = usersArray.map(u => {
                    const recency = (now - u.lastOrder) / (1000 * 60 * 60 * 24);
                    const score = Math.max(0, 100 - (recency / 2) - (u.count < 2 ? 20 : 0) + (u.spent > arpu * 2 ? 15 : 0));
                    return { userId: u.id, userName: u.name, score: Math.round(Math.min(100, score)) };
                });

                const churnRiskScore = usersArray.map(u => {
                    const daysSinceLastOrder = (now - u.lastOrder) / (1000 * 60 * 60 * 24);
                    let risk = 0;
                    if (daysSinceLastOrder > 60) risk += 40;
                    else if (daysSinceLastOrder > 30) risk += 25;
                    else if (daysSinceLastOrder > 14) risk += 10;
                    if (u.count === 1) risk += 20;
                    if (u.refundAmount > 0 && u.spent > 0 && (u.refundAmount / (u.spent + u.refundAmount)) > 0.2) risk += 25;
                    return { userId: u.id, userName: u.name, churnRiskScore: Math.min(100, Math.round(risk)) };
                });

                const spendingAnomalyDetection = usersArray.filter(u => {
                    const userOrders = orders30.filter(o => o.userId === u.id && o.status !== 'CANCELLED' && o.status !== 'RETURNED');
                    if (userOrders.length < 2) return false;
                    const amounts = userOrders.map(o => o.total);
                    const avg = amounts.reduce((a, b) => a + b, 0) / amounts.length;

                    // Use Standard Deviation for dynamic thresholding
                    const variance = amounts.reduce((s, a) => s + Math.pow(a - avg, 2), 0) / amounts.length;
                    const stdDev = Math.sqrt(variance);
                    const threshold = avg + (2 * stdDev); // Flag if > 2 std devs above mean

                    const last = amounts[amounts.length - 1];
                    return last > threshold && stdDev > 0; // Require some variance to avoid flagging exact same orders
                }).map(u => ({ userId: u.id, userName: u.name, type: 'unusually_high_purchase' }));

                const refundAbuseDetection = usersArray.filter(u => {
                    const totalOrdered = u.spent + (u.refundAmount || 0);
                    if (totalOrdered <= 0) return false;
                    const refundRatio = (u.refundAmount || 0) / totalOrdered;
                    return refundRatio > 0.3 && u.count >= 2;
                }).map(u => ({ userId: u.id, userName: u.name, refundRatio: Math.round(((u.refundAmount || 0) / (u.spent + (u.refundAmount || 0))) * 100), type: 'high_refund_ratio' }));

                const multipleAccountPatternDetection = (() => {
                    const byPayment = {};
                    // Exclude generic/common gateway names from multi-account checks
                    const excludedMethods = ['stripe', 'paypal', 'cod', 'wallet', 'credit card', 'credit_card', 'cash on delivery'];

                    usersArray.forEach(u => {
                        const methods = u.paymentMethods ? Object.keys(u.paymentMethods) : [];
                        methods.forEach(m => {
                            if (excludedMethods.includes(m.toLowerCase())) return;
                            if (!byPayment[m]) byPayment[m] = [];
                            byPayment[m].push(u.id);
                        });
                    });
                    const suspicious = Object.entries(byPayment).filter(([, ids]) => ids.length > 3).map(([method, ids]) => ({ paymentMethod: method, userIds: ids, count: ids.length }));
                    return suspicious;
                })();

                return {
                    userGrowthMetrics: {
                        growthOverTime: trendData.map(d => ({ date: d.date, name: d.name, newUsers: d.newUsers, activeUsers: d.activeUsers })),
                        activeVsInactiveTrend,
                        userGrowthPercent: Math.round(userGrowthPercent * 10) / 10,
                        newVsReturningRatio: Math.round(newVsReturningRatio * 100) / 100,
                    },
                    userRevenueMetrics: {
                        revenueByNewUsers: Math.round(revenueByNewUsers),
                        revenueByReturningUsers: Math.round(revenueByReturningUsers),
                        topUsersRevenueContributionPercent: Math.round(topUsersRevenueContributionPercent * 10) / 10,
                        highValueUsersCount,
                        ordersPerUserAvg: Math.round(ordersPerUserAvg * 100) / 100,
                    },
                    userBehaviorMetrics: (() => {
                        const userOrderDates = {};
                        orders30.forEach(o => {
                            const uid = o.userId;
                            if (!userOrderDates[uid]) userOrderDates[uid] = [];
                            userOrderDates[uid].push(new Date(o.createdAt).getTime());
                        });
                        Object.keys(userOrderDates).forEach(uid => userOrderDates[uid].sort((a, b) => a - b));
                        let repeatIntervals = [];
                        Object.values(userOrderDates).forEach(dates => {
                            for (let i = 1; i < dates.length; i++) repeatIntervals.push((dates[i] - dates[i - 1]) / (1000 * 60 * 60 * 24));
                        });
                        const avgDaysBetweenOrders = repeatIntervals.length > 0 ? repeatIntervals.reduce((a, b) => a + b, 0) / repeatIntervals.length : 0;
                        return {
                            orderFrequencyDistribution: [{ name: '1 order', value: usersArray.filter(u => u.count === 1).length }, { name: '2–5 orders', value: usersArray.filter(u => u.count > 1 && u.count <= 5).length }, { name: '5+ orders', value: usersArray.filter(u => u.count > 5).length }],
                            avgOrdersPerUser: Math.round(avgOrdersPerUser * 100) / 100,
                            avgDaysBetweenOrders: Math.round(avgDaysBetweenOrders * 10) / 10,
                            categoryPreference: [{ name: 'Electronics', value: catPref.electronics }, { name: 'Fashion', value: catPref.fashion }],
                            paymentMethodPreference,
                        };
                    })(),
                    userConversionMetrics: {
                        registrationToPurchaseRate: Math.round(registrationToPurchaseRate * 10) / 10,
                        cartToPurchaseRate,
                        dropOffRegisteredToActive: Math.round(dropOffRegisteredToActive * 10) / 10,
                        dropOffActiveToRepeat: Math.round(dropOffActiveToRepeat * 10) / 10,
                    },
                    cohortRetentionMetrics: {
                        monthlyCohortRetentionPercent: Math.round(monthlyCohortRetentionPercent * 10) / 10,
                        revenuePerCohort: cohortRetention,
                        churnRatePercent: Math.round(churnRate * 10) / 10,
                        inactiveUsersCount: inactiveCountXDays,
                        inactiveDaysThreshold: INACTIVE_DAYS,
                    },
                    aiUserMetrics: {
                        ltvPrediction: Math.round(ltvPrediction),
                        highValueUserProbability: highValueUserProbability.sort((a, b) => b.score - a.score).slice(0, 20),
                        churnRiskScore: churnRiskScore.filter(x => x.churnRiskScore >= 30).sort((a, b) => b.churnRiskScore - a.churnRiskScore).slice(0, 20),
                        spendingAnomalyDetection,
                        refundAbuseDetection,
                        multipleAccountPatternDetection,
                    },
                };
            })(),
        };

        return NextResponse.json({ dashboardData });

    } catch (error) {
        console.error("Dashboard API Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
