import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getAuth } from "@clerk/nextjs/server";
import authAdmin from "@/middlewares/authAdmin";

export async function GET(request) {
    try {
        const { userId } = getAuth(request);
        const isAdmin = await authAdmin(userId);

        const whereClause = {
            inStock: true,
            ...(isAdmin ? {} : { status: 'active' })
        };

        let products = await prisma.product.findMany({
            where: whereClause,
            include: {
                rating: {
                    select: {
                        createdAt: true, rating: true, review: true,
                        user: { select: { name: true, image: true } }
                    }
                },
                store: {
                    include: {
                        trustAnalysis: {
                            select: {
                                tone: true,
                            },
                        },
                    },
                },
            },
            orderBy: { createdAt: 'desc' }
        })

        // remove products with store isActive false
        products = products.filter(product => product.store.isActive)
        return NextResponse.json({ products })
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "An internal server error occurred." }, { status: 500 });
    }
}