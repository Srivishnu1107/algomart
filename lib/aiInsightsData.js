/**
 * Aggregates store data for Vendor AI Insights. Used by all four insight features.
 */

import prisma from "@/lib/prisma";

/**
 * Fetch orders, products, ratings and computed metrics for a store.
 * @param {string} storeId
 * @returns {Promise<{
 *   orders: Array,
 *   products: Array,
 *   ratings: Array,
 *   productSales: Record<string, number>,
 *   productUnits: Record<string, number>,
 *   ordersByMonth: Array<{ month: string, count: number, revenue: number }>,
 *   cancelledOrders: Array,
 *   productRatingAvg: Record<string, { avg: number, count: number }>
 * }>}
 */
export async function getStoreContext(storeId) {
    const [orders, products, ratings, wishlistCounts] = await Promise.all([
        prisma.order.findMany({
            where: { storeId },
            include: { orderItems: { include: { product: true } } },
            orderBy: { createdAt: "desc" },
        }),
        prisma.product.findMany({ where: { storeId } }),
        prisma.rating.findMany({
            where: { product: { storeId } },
            include: { product: true },
        }),
        prisma.wishlist.groupBy({
            by: ["productId"],
            where: { product: { storeId } },
            _count: { productId: true },
        }),
    ]);

    const productIds = products.map((p) => p.id);
    const productWishlistCount = {};
    wishlistCounts.forEach((row) => {
        productWishlistCount[row.productId] = row._count.productId;
    });
    const ratingsForStore = ratings;

    const productSales = {};
    const productUnits = {};
    const ordersByMonthMap = {};
    const cancelledOrders = orders.filter((o) => o.status === "CANCELLED");

    orders.forEach((o) => {
        const monthKey = o.createdAt.toISOString().slice(0, 7);
        if (!ordersByMonthMap[monthKey]) ordersByMonthMap[monthKey] = { month: monthKey, count: 0, revenue: 0 };
        ordersByMonthMap[monthKey].count += 1;
        ordersByMonthMap[monthKey].revenue += o.total;

        o.orderItems.forEach((oi) => {
            if (!productIds.includes(oi.productId)) return;
            productSales[oi.productId] = (productSales[oi.productId] || 0) + oi.quantity * oi.price;
            productUnits[oi.productId] = (productUnits[oi.productId] || 0) + oi.quantity;
        });
    });

    const ordersByMonth = Object.values(ordersByMonthMap).sort((a, b) => a.month.localeCompare(b.month));

    const productRatingAvg = {};
    ratingsForStore.forEach((r) => {
        if (!productRatingAvg[r.productId]) productRatingAvg[r.productId] = { sum: 0, count: 0 };
        productRatingAvg[r.productId].sum += r.rating;
        productRatingAvg[r.productId].count += 1;
    });
    Object.keys(productRatingAvg).forEach((id) => {
        const x = productRatingAvg[id];
        productRatingAvg[id] = { avg: x.sum / x.count, count: x.count };
    });

    return {
        orders,
        products,
        ratings: ratingsForStore,
        productSales,
        productUnits,
        ordersByMonth,
        cancelledOrders,
        productRatingAvg,
        productWishlistCount,
    };
}
