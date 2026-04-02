import prisma from "@/lib/prisma";
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// POST - Follow or unfollow a store
export async function POST(request) {
    try {
        const { userId } = getAuth(request);
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { storeId } = await request.json();
        if (!storeId) {
            return NextResponse.json({ error: "storeId required" }, { status: 400 });
        }

        // Check if store exists
        const store = await prisma.store.findUnique({
            where: { id: storeId },
        });
        if (!store) {
            return NextResponse.json({ error: "Store not found" }, { status: 404 });
        }

        // Check if already following
        const existing = await prisma.storeFollow.findUnique({
            where: {
                userId_storeId: { userId, storeId },
            },
        });

        if (existing) {
            // Unfollow
            await prisma.storeFollow.delete({
                where: {
                    userId_storeId: { userId, storeId },
                },
            });
            return NextResponse.json({ following: false });
        } else {
            // Follow
            await prisma.storeFollow.create({
                data: { userId, storeId },
            });
            return NextResponse.json({ following: true });
        }
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
}

// GET - Check if user is following a store
export async function GET(request) {
    try {
        const { userId } = getAuth(request);
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const storeId = searchParams.get("storeId");
        if (!storeId) {
            return NextResponse.json({ error: "storeId query param required" }, { status: 400 });
        }

        const follow = await prisma.storeFollow.findUnique({
            where: {
                userId_storeId: { userId, storeId },
            },
        });

        return NextResponse.json({ following: !!follow });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
}
