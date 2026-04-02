import prisma from "@/lib/prisma";
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";


// Verify coupon. Optional body: { code, productIds?: string[] } to validate coupon against cart (electronics/fashion only).
export async function POST(request){
    try {
        const { userId } = getAuth(request)
        const { code, productIds } = await request.json()

        const coupon = await prisma.coupon.findUnique({
            where: {code: code.toUpperCase(),
                expiresAt: {gt: new Date()}
            }
        })

        if (!coupon){
            return NextResponse.json({ error: "Coupon not found" }, { status: 404 })
        }

        if(coupon.forNewUser){
            const userorders = await prisma.order.findMany({where: {userId}})
            if(userorders.length > 0){
                return NextResponse.json({ error: "Coupon valid for new users" }, { status: 400 })
            }
        }

        if (coupon.forMember){
            const user = userId ? await prisma.user.findUnique({ where: { id: userId }, select: { isPro: true } }) : null;
            const isPro = !!user?.isPro;
            if (!isPro) {
                return NextResponse.json({ error: "Coupon valid for Pro members only" }, { status: 400 })
            }
        }

        // Coupon is only valid when cart contains only items from the coupon's store type (electronics or fashion)
        if (Array.isArray(productIds) && productIds.length > 0) {
            const products = await prisma.product.findMany({
                where: { id: { in: productIds } },
                include: { store: true }
            })
            const cartStoreTypes = new Set(
                products.map((p) => p.productType ?? p.store?.storeType ?? 'electronics')
            )
            if (cartStoreTypes.size > 1) {
                return NextResponse.json({ error: "This coupon cannot be applied. Your cart has items from both electronics and fashion. Coupons are only valid when your cart contains items from one store." }, { status: 400 })
            }
            const requiredType = coupon.storeType
            if (!cartStoreTypes.has(requiredType)) {
                const onlyType = [...cartStoreTypes][0] || 'other'
                return NextResponse.json({ error: `This coupon is valid only for ${requiredType} orders. Your cart contains only ${onlyType} items.` }, { status: 400 })
            }
        }

        return NextResponse.json({coupon})
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: error.code || error.message }, { status: 400 })
    }
}