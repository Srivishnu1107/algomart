import prisma from "@/lib/prisma";
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// Add new address
export async function POST(request) {
    try {
        const { userId } = getAuth(request)
        const { address } = await request.json()

        address.userId = userId
        // Normalize label to lowercase so we always store and match consistently
        const rawLabel = (address.label ?? 'other').toString().toLowerCase()
        address.label = rawLabel

        // Only one address per "home" and "work": archive any existing one with same label
        if (rawLabel === 'home' || rawLabel === 'work') {
            await prisma.address.updateMany({
                where: { userId, label: rawLabel, isArchived: false },
                data: { isArchived: true },
            })
        }

        const newAddress = await prisma.address.create({
            data: address
        })

        return NextResponse.json({ newAddress, message: 'Address added successfully' })
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: error.code || error.message }, { status: 400 })
    }
}

// Get all addresses for a user
export async function GET(request) {
    try {
        const { userId } = getAuth(request)

        const addresses = await prisma.address.findMany({
            where: { userId, isArchived: false }
        })

        return NextResponse.json({ addresses })
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: error.code || error.message }, { status: 400 })
    }
}