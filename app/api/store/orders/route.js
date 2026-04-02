import prisma from "@/lib/prisma";
import authSeller from "@/middlewares/authSeller";
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";


// Update seller order status
export async function POST(request) {
    try {
        const { userId } = getAuth(request)
        const { searchParams } = new URL(request.url)
        const rawStoreType = searchParams.get('type')
        const storeType = ["electronics", "fashion"].includes(rawStoreType) ? rawStoreType : "electronics"
        const storeId = await authSeller(userId, storeType)

        if (!storeId) {
            return NextResponse.json({ error: 'not authorized' }, { status: 401 })
        }

        const body = await request.json()
        const { orderId, status, cancellationReason, vendorStatusMessage } = body

        const data = { status }

        // If cancelling, update reason if provided. If not provided, preserve existing (e.g. from request)
        if (status === 'CANCELLED' && cancellationReason != null) {
            data.cancellationReason = String(cancellationReason).trim() || null
        }
        // Return approved: mark as RETURNED (keep customer's return reason)
        else if (status === 'RETURNED') {
            // Keep cancellationReason as-is (customer's return reason)
        }
        // Rejecting cancel/return: revert status and store vendor message to user (or clear if none)
        else if (['ORDER_PLACED', 'PROCESSING', 'SHIPPED', 'DELIVERED'].includes(status)) {
            data.cancellationReason = null
            data.vendorStatusMessage = (vendorStatusMessage != null && String(vendorStatusMessage).trim()) ? String(vendorStatusMessage).trim() : null
        }
        // When approving cancel or setting RETURNED, clear any previous vendor rejection message
        if (status === 'CANCELLED' || status === 'RETURNED') {
            data.vendorStatusMessage = null
        }

        await prisma.order.update({
            where: { id: orderId, storeId },
            data
        })

        // Update store last activity (vendor is actively managing orders)
        await prisma.store.update({
            where: { id: storeId },
            data: { lastActiveAt: new Date() },
        }).catch(() => { })

        return NextResponse.json({ message: "Order Status updated" })
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: error.code || error.message }, { status: 400 })
    }
}

// Get all orders for a seller
export async function GET(request) {
    try {
        const { userId } = getAuth(request)
        const { searchParams } = new URL(request.url)
        const rawStoreType = searchParams.get('type')
        const storeType = ["electronics", "fashion"].includes(rawStoreType) ? rawStoreType : "electronics"
        const storeId = await authSeller(userId, storeType)

        if (!storeId) {
            return NextResponse.json({ error: 'not authorized' }, { status: 401 })
        }

        const orders = await prisma.order.findMany({
            where: { storeId },
            include: { user: true, address: true, orderItems: { include: { product: true } } },
            orderBy: { createdAt: 'desc' }
        })

        return NextResponse.json({ orders })
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: error.code || error.message }, { status: 400 })
    }
}