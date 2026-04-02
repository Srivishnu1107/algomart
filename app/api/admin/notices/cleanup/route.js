import prisma from "@/lib/prisma";
import authAdmin from "@/middlewares/authAdmin";
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * DELETE /api/admin/notices/cleanup
 *
 * Removes the specific dummy data inserted by the notices seed helper:
 * users, addresses, stores, products, orders, ratings, reports.
 */
async function handleCleanup(request) {
    try {
        const { userId } = getAuth(request);
        const isAdmin = await authAdmin(userId);
        if (!isAdmin) {
            return NextResponse.json({ error: "Not authorized" }, { status: 401 });
        }

        const vendorId = "vendor_notices_demo";
        const buyerId = "buyer_notices_demo";
        const addressId = "addr_notices_demo";

        const storeUsernames = [
            "pending-demo-store",
            "inactive-highrisk-demo-store",
        ];

        const productSkus = [
            "risk-demo-phone-sku",
            "suspicious-demo-phone-sku",
        ];

        const ratingIds = [
            "rating_notices_demo_1",
            "rating_notices_demo_2",
        ];

        const orderIds = [
            "pending_cancel_demo_1",
            "pending_return_demo_1",
            // risk_order_demo_0 ... risk_order_demo_9
            ...Array.from({ length: 10 }, (_, i) => `risk_order_demo_${i}`),
        ];

        const reportIds = [
            "report_notices_demo_fake_1",
            "report_notices_demo_wrong_1",
        ];

        // 1) Reports
        await prisma.report.deleteMany({
            where: { id: { in: reportIds } },
        });

        // 2) OrderItems and Orders
        await prisma.orderItem.deleteMany({
            where: { orderId: { in: orderIds } },
        });

        await prisma.order.deleteMany({
            where: { id: { in: orderIds } },
        });

        // 3) Ratings
        await prisma.rating.deleteMany({
            where: { id: { in: ratingIds } },
        });

        // 4) Products
        await prisma.product.deleteMany({
            where: { sku: { in: productSkus } },
        });

        // 5) Stores
        await prisma.store.deleteMany({
            where: { username: { in: storeUsernames } },
        });

        // 6) Address
        await prisma.address.deleteMany({
            where: { id: addressId },
        });

        // 7) Users
        await prisma.user.deleteMany({
            where: { id: { in: [vendorId, buyerId] } },
        });

        return NextResponse.json({
            success: true,
            message: "Dummy notices seed data removed.",
        });
    } catch (error) {
        console.error("Admin notices cleanup error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to cleanup demo notices" },
            { status: 500 }
        );
    }
}

export async function DELETE(request) {
    return handleCleanup(request);
}

// Convenience: also allow GET for quick manual triggering
export async function GET(request) {
    return handleCleanup(request);
}

