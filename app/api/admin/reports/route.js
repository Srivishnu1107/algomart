import prisma from "@/lib/prisma";
import authAdmin from "@/middlewares/authAdmin";
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export async function GET(request) {
    try {
        const { userId } = getAuth(request);
        const isAdmin = await authAdmin(userId);

        if (!isAdmin) {
            return NextResponse.json({ error: "Not authorized" }, { status: 401 });
        }

        const reports = await prisma.report.findMany({
            orderBy: { createdAt: "desc" },
            include: {
                product: {
                    select: {
                        id: true,
                        name: true,
                        category: true,
                        productType: true,
                        storeId: true,
                        images: true,
                        store: {
                            select: {
                                id: true,
                                name: true,
                                username: true,
                                storeType: true,
                            },
                        },
                    },
                },
            },
        });

        const list = reports.map((r) => ({
            id: r.id,
            productId: r.product.id,
            productName: r.product.name,
            productCategory: r.product.category,
            productType: r.product.productType,
            productImages: r.product.images ?? [],
            storeName: r.product.store?.name ?? "—",
            storeUsername: r.product.store?.username ?? "—",
            storeType: r.product.store?.storeType ?? "electronics",
            reasonType: r.reasonType,
            customReason: r.customReason,
            reporterId: r.reporterId,
            createdAt: r.createdAt,
        }));

        return NextResponse.json({ reports: list });
    } catch (error) {
        console.error("Admin reports fetch error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to load reports" },
            { status: 500 }
        );
    }
}
