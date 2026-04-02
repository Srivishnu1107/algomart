import prisma from "@/lib/prisma";
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export async function POST(request) {
    try {
        const { userId } = getAuth(request);
        if (!userId) {
            return NextResponse.json({ error: "Not authorized" }, { status: 401 });
        }

        const { orderId, action, reason } = await request.json();

        if (!orderId || !action) {
            return NextResponse.json({ error: "Missing orderId or action" }, { status: 400 });
        }

        const order = await prisma.order.findUnique({
            where: { id: orderId },
            include: { orderItems: { include: { product: true } } },
        });

        if (!order) {
            return NextResponse.json({ error: "Order not found" }, { status: 404 });
        }

        if (order.userId !== userId) {
            return NextResponse.json({ error: "Not authorized" }, { status: 403 });
        }

        // Cancel: only if not yet delivered
        if (action === "cancel") {
            if (order.status === "DELIVERED") {
                return NextResponse.json({ error: "Cannot cancel a delivered order" }, { status: 400 });
            }
            if (order.status === "CANCELLED") {
                return NextResponse.json({ error: "Order is already cancelled" }, { status: 400 });
            }
            if (order.status === "CANCELLATION_REQUESTED") {
                return NextResponse.json({ error: "Cancellation already requested" }, { status: 400 });
            }

            await prisma.order.update({
                where: { id: orderId },
                data: {
                    status: "CANCELLATION_REQUESTED",
                    cancellationReason: reason || "Cancelled by customer",
                },
            });

            return NextResponse.json({ message: "Cancellation request submitted successfully" });
        }

        // Return: only if delivered
        if (action === "return") {
            if (order.status !== "DELIVERED") {
                return NextResponse.json({ error: "Only delivered orders can be returned" }, { status: 400 });
            }
            if (order.status === "RETURN_REQUESTED") {
                return NextResponse.json({ error: "Return already requested" }, { status: 400 });
            }

            await prisma.order.update({
                where: { id: orderId },
                data: {
                    status: "RETURN_REQUESTED",
                    cancellationReason: reason || "Return requested by customer",
                },
            });

            return NextResponse.json({ message: "Return request submitted successfully" });
        }

        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
