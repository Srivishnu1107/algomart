import prisma from "@/lib/prisma";
import { getAuth } from "@clerk/nextjs/server";
import { PaymentMethod } from "@prisma/client";
import { NextResponse } from "next/server";
import Stripe from "stripe";


export async function POST(request){
    try {
        const { userId } = getAuth(request)
        if(!userId){
            return NextResponse.json({ error: "not authorized" }, { status: 401 });
        }
        const { addressId, items, couponCode, paymentMethod } = await request.json()

        // Check if all required fields are present
        if(!addressId || !paymentMethod || !items || !Array.isArray(items) || items.length === 0){
           return NextResponse.json({ error: "missing order details." }, { status: 401 }); 
        }

        let coupon = null;

        if (couponCode) {
        coupon = await prisma.coupon.findUnique({
                    where: {code: couponCode }
                })
                if (!coupon){
            return NextResponse.json({ error: "Coupon not found" }, { status: 400 })
        }
        }
         
            // Check if coupon is applicable for new users
        if(couponCode && coupon.forNewUser){
            const userorders = await prisma.order.findMany({where: {userId}})
            if(userorders.length > 0){
                return NextResponse.json({ error: "Coupon valid for new users" }, { status: 400 })
            }
        }

        // Fetch user's Pro status once (for member-only coupons and for shipping fee)
        const dbUser = await prisma.user.findUnique({
            where: { id: userId },
            select: { isPro: true, proExpiresAt: true }
        });
        const now = new Date();
        const isPlusMember = !!(dbUser?.isPro && (!dbUser.proExpiresAt || dbUser.proExpiresAt > now));

        // Check if coupon is applicable for members (Pro)
        if (couponCode && coupon.forMember){
            if (!dbUser?.isPro) {
                return NextResponse.json({ error: "Coupon valid for Pro members only" }, { status: 400 })
            }
        }

         // Group orders by storeId using a Map; also collect cart product types for coupon validation
         const ordersByStore = new Map()
         const cartStoreTypes = new Set()

         for(const item of items){
            const product = await prisma.product.findUnique({ where: { id: item.id }, include: { store: true } })
            if(!product){
                return NextResponse.json({ error: `Product ${item.id} not found` }, { status: 404 })
            }
            if (product.status !== "active" || product.is_draft || !product.store?.isActive) {
                return NextResponse.json({ error: `Product "${product.name}" is no longer available` }, { status: 400 })
            }
            // Check stock availability
            if(product.stock_quantity < item.quantity){
                return NextResponse.json({ error: `Insufficient stock for ${product.name}. Available: ${product.stock_quantity}, Requested: ${item.quantity}` }, { status: 400 })
            }
            const storeId = product.storeId
            const productStoreType = product.productType ?? product.store?.storeType ?? 'electronics'
            cartStoreTypes.add(productStoreType)
            if(!ordersByStore.has(storeId)){
                ordersByStore.set(storeId, [])
            }
            ordersByStore.get(storeId).push({...item, price: product.price})
         }

         // Coupon is only valid when cart contains only items from the coupon's store type (electronics or fashion)
         if (couponCode && coupon) {
            if (cartStoreTypes.size > 1) {
                return NextResponse.json({ error: "This coupon cannot be applied. Your cart has items from both electronics and fashion. Coupons are only valid when your cart contains items from one store." }, { status: 400 })
            }
            const requiredType = coupon.storeType
            if (!cartStoreTypes.has(requiredType)) {
                const onlyType = [...cartStoreTypes][0] || 'other'
                return NextResponse.json({ error: `This coupon is valid only for ${requiredType} orders. Your cart contains only ${onlyType} items.` }, { status: 400 })
            }
         }

         let orderIds = [];
         let fullAmount = 0;

         let isShippingFeeAdded = false

         // Create orders for each seller
         for(const [storeId, sellerItems] of ordersByStore.entries()){
            let total = sellerItems.reduce((acc, item)=>acc + (item.price * item.quantity), 0)

            if(couponCode){
                total -= (total * coupon.discount) / 100;
            }
            if(!isPlusMember && !isShippingFeeAdded){
                total += 5;
                isShippingFeeAdded = true
            }

            fullAmount += parseFloat(total.toFixed(2))

            const order = await prisma.order.create({
                data: {
                    userId,
                     storeId,
                     addressId,
                     total: parseFloat(total.toFixed(2)),
                     paymentMethod,
                     isCouponUsed: coupon ? true : false,
                     coupon: coupon ? coupon : {},
                      orderItems: {
                        create: sellerItems.map(item => ({
                            productId: item.id,
                            quantity: item.quantity,
                            price: item.price
                        }))
                      }
                }
            })
            orderIds.push(order.id)

            // Decrease stock quantity for COD orders (Stripe orders handled in webhook)
            if(paymentMethod !== 'STRIPE'){
                for(const item of sellerItems){
                    // Decrease stock and update inStock in a single transaction
                    const updatedProduct = await prisma.product.update({
                        where: { id: item.id },
                        data: {
                            stock_quantity: {
                                decrement: item.quantity
                            }
                        },
                        select: { stock_quantity: true }
                    })
                    // Update inStock based on new stock_quantity
                    await prisma.product.update({
                        where: { id: item.id },
                        data: {
                            inStock: updatedProduct.stock_quantity > 0
                        }
                    })
                }
            }
         }

         if(paymentMethod === 'STRIPE'){
            const stripe = Stripe(process.env.STRIPE_SECRET_KEY)
            const origin = await request.headers.get('origin')

            const session = await stripe.checkout.sessions.create({
                payment_method_types: ['card'],
                line_items: [{
                    price_data:{
                        currency: 'usd',
                        product_data:{
                            name: 'Order'
                        },
                        unit_amount: Math.round(fullAmount * 100)
                    },
                    quantity: 1
                }],
                expires_at: Math.floor(Date.now() / 1000) + 30 * 60, // current time + 30 minutes
                mode: 'payment',
                success_url: `${origin}/loading?nextUrl=orders`,
                cancel_url: `${origin}/cart`,
                metadata: {
                    orderIds: orderIds.join(','),
                    userId,
                    appId: 'gocart'
                }
            })
            return NextResponse.json({session})
         }

          // clear the cart
          await prisma.user.update({
            where: {id: userId},
            data: {cart : {}}
          })

          return NextResponse.json({message: 'Orders Placed Successfully'})

    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: error.code || error.message }, { status: 400 })
    }
}

// Get all orders for a user
export async function GET(request){
    try {
        const { userId } = getAuth(request)
        const orders = await prisma.order.findMany({
            where: {userId, OR: [
                {paymentMethod: PaymentMethod.COD},
                {AND: [{paymentMethod: PaymentMethod.STRIPE}, {isPaid: true}]}
            ]},
            include: {
                orderItems: {include: {product: true}},
                address: true
            },
            orderBy: {createdAt: 'desc'}
        })

        return NextResponse.json({orders})
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: error.message }, { status: 400 })
    }
}