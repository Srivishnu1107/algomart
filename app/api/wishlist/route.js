import prisma from "@/lib/prisma";
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const VALID_STORE_TYPES = ["electronics", "fashion"];

// GET - get current user wishlist for a store type (electronics | fashion)
export async function GET(request) {
    try {
        const { userId } = getAuth(request);
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const storeType = searchParams.get("storeType");
        if (!storeType || !VALID_STORE_TYPES.includes(storeType)) {
            return NextResponse.json({ error: "storeType query param required: electronics or fashion" }, { status: 400 });
        }

        const wishlist = await prisma.wishlist.findMany({
            where: { userId, storeType },
            include: { product: { include: { store: true } } },
            orderBy: { createdAt: "desc" },
        });

        // Hide disabled/draft products and products from inactive stores
        const visible = wishlist.filter(
            (item) =>
                item.product &&
                item.product.status === "active" &&
                !item.product.is_draft &&
                item.product.store?.isActive
        );

        return NextResponse.json(visible);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
}

// POST - add product to wishlist (storeType set from product's store)
export async function POST(request) {
    try {
        const { userId } = getAuth(request);
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { productId } = await request.json();
        if (!productId) {
            return NextResponse.json({ error: "productId required" }, { status: 400 });
        }

        const product = await prisma.product.findUnique({
            where: { id: productId },
            include: { store: true },
        });
        if (!product?.store) {
            return NextResponse.json({ error: "Product or store not found" }, { status: 404 });
        }
        if (product.status !== "active" || product.is_draft || !product.store.isActive) {
            return NextResponse.json({ error: "Product is not available" }, { status: 400 });
        }
        const storeType = product.store.storeType;

        const existing = await prisma.wishlist.findUnique({
            where: {
                userId_productId: { userId, productId },
            },
        });

        if (existing) {
            return NextResponse.json(existing);
        }

        const wishlistItem = await prisma.wishlist.create({
            data: { userId, productId, storeType },
            include: { product: true },
        });

        return NextResponse.json(wishlistItem);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
}
