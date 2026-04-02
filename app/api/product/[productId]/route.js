import prisma from "@/lib/prisma";
import { getAuth } from "@clerk/nextjs/server";
import authAdmin from "@/middlewares/authAdmin";
import { NextResponse } from "next/server";

/**
 * GET /api/product/[productId] – Public product by ID.
 * Returns 404 for non-admins when product is disabled (status !== 'active') or store is inactive.
 */
export async function GET(request, { params }) {
    try {
        const { productId } = await params;
        if (!productId) {
            return NextResponse.json({ error: "Product ID required" }, { status: 400 });
        }

        const { userId } = getAuth(request);
        const isAdmin = await authAdmin(userId);

        const product = await prisma.product.findUnique({
            where: { id: productId },
            include: {
                rating: {
                    select: {
                        createdAt: true,
                        rating: true,
                        review: true,
                        user: { select: { name: true, image: true } },
                    },
                },
                store: true,
            },
        });

        if (!product) {
            return NextResponse.json({ error: "Product not found" }, { status: 404 });
        }

        // For non-admins, hide disabled or draft products and products from inactive stores
        if (!isAdmin) {
            if (product.status !== "active" || product.is_draft || !product.store?.isActive) {
                return NextResponse.json({ error: "Product not found" }, { status: 404 });
            }
        }

        return NextResponse.json(product);
    } catch (error) {
        console.error("[api/product/[productId]]", error);
        return NextResponse.json({ error: "An internal server error occurred." }, { status: 500 });
    }
}
