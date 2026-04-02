import prisma from "@/lib/prisma";
import authAdmin from "@/middlewares/authAdmin";
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export async function POST(request) {
    try {
        const { userId } = getAuth(request);
        const isAdmin = await authAdmin(userId);
        if (!isAdmin) {
            return NextResponse.json({ error: "Not authorized" }, { status: 401 });
        }

        const body = await request.json();
        const { productId, action } = body;

        if (!productId || !action) {
            return NextResponse.json({ error: "Missing productId or action" }, { status: 400 });
        }

        let updatedProduct;

        if (action === "keep") {
            // Dismiss suspicious flag
            updatedProduct = await prisma.product.update({
                where: { id: productId },
                data: { adminClearedSuspicion: true }
            });
        } else if (action === "disable") {
            // Disable the product
            updatedProduct = await prisma.product.update({
                where: { id: productId },
                data: { status: "inactive" }
            });
        } else if (action === "restore") {
            // Restore the product
            updatedProduct = await prisma.product.update({
                where: { id: productId },
                data: { status: "active" }
            });
        } else {
            return NextResponse.json({ error: "Invalid action" }, { status: 400 });
        }

        return NextResponse.json({
            success: true,
            message: `Product ${action} successful`,
            status: updatedProduct.status,
            adminClearedSuspicion: updatedProduct.adminClearedSuspicion
        });

    } catch (error) {
        console.error("Admin Product Action Error:", error);
        return NextResponse.json({ error: "Failed to update product" }, { status: 500 });
    }
}
