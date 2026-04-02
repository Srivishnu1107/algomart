
import prisma from "@/lib/prisma";
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export async function PUT(request, { params }) {
    try {
        const { userId } = getAuth(request);
        const { id } = await params;
        const { address } = await request.json();

        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Verify the address belongs to the user
        const existingAddress = await prisma.address.findUnique({
            where: { id },
        });

        if (!existingAddress || existingAddress.userId !== userId) {
            return NextResponse.json({ error: "Address not found or unauthorized" }, { status: 404 });
        }

        // Normalize label to lowercase
        const rawLabel = (address.label ?? 'other').toString().toLowerCase();
        address.label = rawLabel;

        // Only one address per "home" and "work": archive any other with same label (excluding this one)
        if (rawLabel === 'home' || rawLabel === 'work') {
            await prisma.address.updateMany({
                where: { userId, label: rawLabel, isArchived: false, id: { not: id } },
                data: { isArchived: true },
            });
        }

        const updatedAddress = await prisma.address.update({
            where: { id },
            data: address,
        });

        return NextResponse.json({ updatedAddress, message: 'Address updated successfully' });
    } catch (error) {
        console.error("Error updating address:", error);
        return NextResponse.json({ error: error.code || error.message }, { status: 500 });
    }
}

export async function DELETE(request, { params }) {
    try {
        const { userId } = getAuth(request);
        const { id } = await params;

        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Verify the address belongs to the user and check if it has orders
        const existingAddress = await prisma.address.findUnique({
            where: { id },
            select: { userId: true, _count: { select: { Order: true } } },
        });

        if (!existingAddress || existingAddress.userId !== userId) {
            return NextResponse.json({ error: "Address not found or unauthorized" }, { status: 404 });
        }

        const hasOrders = existingAddress._count?.Order > 0;

        if (hasOrders) {
            // Linked to orders: only archive so order history keeps the address
            await prisma.address.update({
                where: { id },
                data: { isArchived: true },
            });
        } else {
            // Not linked to any order: remove from DB
            await prisma.address.delete({
                where: { id },
            });
        }

        return NextResponse.json({ message: 'Address deleted successfully' });
    } catch (error) {
        console.error("Error deleting address:", error);
        return NextResponse.json({ error: error.code || error.message }, { status: 500 });
    }
}
