import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

/** Public: list approved, active stores. Query: type=electronics|fashion, search=string */
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const type = searchParams.get("type"); // electronics | fashion
        const search = searchParams.get("search")?.trim()?.toLowerCase();

        const where = {
            status: "approved",
            isActive: true,
            // Fashion stores only on fashion; default to electronics so fashion is never mixed in
            storeType: type === "fashion" ? "fashion" : "electronics",
        };

        if (search) {
            where.OR = [
                { name: { contains: search, mode: "insensitive" } },
                { username: { contains: search, mode: "insensitive" } },
                { description: { contains: search, mode: "insensitive" } },
            ];
        }

        const stores = await prisma.store.findMany({
            where,
            select: {
                id: true,
                name: true,
                username: true,
                description: true,
                logo: true,
                banner: true,
                storeType: true,
                _count: { select: { Product: true } },
            },
            orderBy: { name: "asc" },
        });

        return NextResponse.json({
            stores: stores.map((s) => ({
                id: s.id,
                name: s.name,
                username: s.username,
                description: s.description,
                logo: s.logo,
                banner: s.banner,
                storeType: s.storeType,
                productCount: s._count.Product,
            })),
        });
    } catch (error) {
        console.error(error);
        return NextResponse.json(
            { error: error.code || error.message },
            { status: 400 }
        );
    }
}
