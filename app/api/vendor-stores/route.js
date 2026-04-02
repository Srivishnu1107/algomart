import prisma from "@/lib/prisma";
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

/** GET: Search approved stores by name/username (for vendors to find other vendors). Excludes current user's stores. */
export async function GET(request) {
    try {
        const userId = getAuth(request).userId;
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const search = searchParams.get("search")?.trim();
        const where = { status: "approved", userId: { not: userId } };
        if (search) {
            where.OR = [
                { name: { contains: search, mode: "insensitive" } },
                { username: { contains: search, mode: "insensitive" } },
            ];
        }

        const stores = await prisma.store.findMany({
            where,
            include: { user: true },
            take: 20,
            orderBy: { name: "asc" },
        });

        return NextResponse.json({ stores });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: error.message || "Server error" }, { status: 500 });
    }
}
