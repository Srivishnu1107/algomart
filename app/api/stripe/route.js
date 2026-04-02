import prisma from "@/lib/prisma"
import { NextResponse } from "next/server"
import Stripe from "stripe"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

export async function POST(request) {
    try {
        const body = await request.text()
        const sig = request.headers.get('stripe-signature')

        const event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET)

        // Handle Stripe Checkout Session completed (used for Pro membership)
        const handleCheckoutSessionCompleted = async (session) => {
            const metadata = session.metadata || {}
            const { appId, type, userId } = metadata
            if (appId !== 'gocart' || session.payment_status !== 'paid') return

            if (type === 'pro_membership' && userId) {
                const amount = session.amount_total || 20000 // paise, default 200 INR
                const currency = (session.currency || 'inr').toLowerCase()
                const now = new Date()
                let proExpiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) // 1 month fallback
                let stripeSubscriptionId = null
                const stripeCustomerId = session.customer && typeof session.customer === 'string' ? session.customer : null

                if (session.subscription && typeof session.subscription === 'string') {
                    const sub = await stripe.subscriptions.retrieve(session.subscription)
                    const subMeta = sub.metadata || {}
                    if (subMeta.appId === 'gocart' && subMeta.type === 'pro_membership' && subMeta.userId === userId) {
                        stripeSubscriptionId = sub.id
                        if (sub.current_period_end) {
                            proExpiresAt = new Date(sub.current_period_end * 1000)
                        }
                    }
                }

                const existing = await prisma.user.findUnique({
                    where: { id: userId },
                    select: { proMemberSince: true }
                })
                const proMemberSince = existing?.proMemberSince ?? now
                const updateData = { isPro: true, proMemberSince, proExpiresAt }
                if (stripeCustomerId) updateData.stripeCustomerId = stripeCustomerId
                if (stripeSubscriptionId) updateData.stripeSubscriptionId = stripeSubscriptionId

                await prisma.$transaction([
                    prisma.user.update({
                        where: { id: userId },
                        data: updateData
                    }),
                    prisma.proPayment.upsert({
                        where: { stripeSessionId: session.id },
                        create: {
                            userId,
                            stripeSessionId: session.id,
                            amount,
                            currency,
                        },
                        update: {}
                    })
                ])
            }
        }

        // Pro subscription renewal: extend access and record payment (skip initial invoice; handled by checkout.session.completed)
        const handleInvoicePaid = async (invoice) => {
            if (invoice.billing_reason === 'subscription_create') return
            const subId = invoice.subscription
            if (!subId || typeof subId !== 'string') return
            try {
                const sub = await stripe.subscriptions.retrieve(subId)
                const meta = sub.metadata || {}
                if (meta.appId !== 'gocart' || meta.type !== 'pro_membership' || !meta.userId) return

                const proExpiresAt = sub.current_period_end ? new Date(sub.current_period_end * 1000) : null
                const amount = invoice.amount_paid || 20000
                const currency = (invoice.currency || 'inr').toLowerCase()

                const user = await prisma.user.findFirst({
                    where: { stripeSubscriptionId: subId },
                    select: { id: true }
                })
                if (!user) return

                await prisma.$transaction([
                    prisma.user.update({
                        where: { id: user.id },
                        data: proExpiresAt ? { isPro: true, proExpiresAt } : { isPro: true }
                    }),
                    prisma.proPayment.upsert({
                        where: { stripeSessionId: invoice.id },
                        create: {
                            userId: user.id,
                            stripeSessionId: invoice.id,
                            amount,
                            currency,
                        },
                        update: {}
                    })
                ])
            } catch (e) {
                console.warn('handleInvoicePaid Pro:', e.message)
            }
        }

        // Keep proExpiresAt in sync when subscription is updated; revert to free if subscription canceled/unpaid (e.g. payment declined)
        const handleSubscriptionUpdated = async (subscription) => {
            const meta = subscription.metadata || {}
            if (meta.appId !== 'gocart' || meta.type !== 'pro_membership') return
            const status = subscription.status
            if (status === 'canceled' || status === 'unpaid' || status === 'incomplete_expired') {
                await prisma.user.updateMany({
                    where: { stripeSubscriptionId: subscription.id },
                    data: { isPro: false, proExpiresAt: null, stripeSubscriptionId: null }
                })
                return
            }
            const proExpiresAt = subscription.current_period_end ? new Date(subscription.current_period_end * 1000) : null
            await prisma.user.updateMany({
                where: { stripeSubscriptionId: subscription.id },
                data: proExpiresAt ? { proExpiresAt } : {}
            })
        }

        // Revoke Pro when subscription is deleted/canceled (e.g. after payment decline and Stripe retries exhausted)
        const handleSubscriptionDeleted = async (subscription) => {
            const meta = subscription.metadata || {}
            if (meta.appId !== 'gocart' || meta.type !== 'pro_membership') return
            await prisma.user.updateMany({
                where: { stripeSubscriptionId: subscription.id },
                data: { isPro: false, proExpiresAt: null, stripeSubscriptionId: null }
            })
        }

        // When renewal payment fails, Stripe retries; if subscription is canceled we revert in subscription.updated/deleted
        const handleInvoicePaymentFailed = async (invoice) => {
            const subId = invoice.subscription
            if (!subId || typeof subId !== 'string') return
            try {
                const sub = await stripe.subscriptions.retrieve(subId)
                const meta = sub.metadata || {}
                if (meta.appId !== 'gocart' || meta.type !== 'pro_membership') return
                if (sub.status === 'canceled' || sub.status === 'unpaid' || sub.status === 'incomplete_expired') {
                    await prisma.user.updateMany({
                        where: { stripeSubscriptionId: subId },
                        data: { isPro: false, proExpiresAt: null, stripeSubscriptionId: null }
                    })
                }
            } catch (e) {
                console.warn('handleInvoicePaymentFailed:', e.message)
            }
        }

        const handlePaymentIntent = async (paymentIntentId, isPaid) => {
            const session = await stripe.checkout.sessions.list({
                payment_intent: paymentIntentId
            })
            const firstSession = session?.data?.[0]
            if (!firstSession?.metadata) return

            const { orderIds, userId, appId, type } = firstSession.metadata

            if (appId !== 'gocart') {
                return NextResponse.json({ received: true, message: 'Invalid app id' })
            }

            if (type === 'pro_membership' && isPaid && userId) {
                const now = new Date();
                const proExpiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
                const existing = await prisma.user.findUnique({
                    where: { id: userId },
                    select: { proMemberSince: true }
                });
                const proMemberSince = existing?.proMemberSince ?? now;
                await prisma.user.update({
                    where: { id: userId },
                    data: { isPro: true, proMemberSince, proExpiresAt }
                })
                return;
            }

            // Normal order processing
            if (!orderIds) return;
            const orderIdsArray = orderIds.split(',')

            if (isPaid) {
                // mark order as paid and decrease stock
                await Promise.all(orderIdsArray.map(async (orderId) => {
                    const order = await prisma.order.findUnique({
                        where: { id: orderId },
                        include: { orderItems: true }
                    })
                    if (order) {
                        await prisma.order.update({
                            where: { id: orderId },
                            data: { isPaid: true }
                        })
                        // Decrease stock quantity for each order item
                        for (const orderItem of order.orderItems) {
                            // Decrease stock and update inStock in a single transaction
                            const updatedProduct = await prisma.product.update({
                                where: { id: orderItem.productId },
                                data: {
                                    stock_quantity: {
                                        decrement: orderItem.quantity
                                    }
                                },
                                select: { stock_quantity: true }
                            })
                            // Update inStock based on new stock_quantity
                            await prisma.product.update({
                                where: { id: orderItem.productId },
                                data: {
                                    inStock: updatedProduct.stock_quantity > 0
                                }
                            })
                        }
                    }
                }))
                // delete cart from user
                await prisma.user.update({
                    where: { id: userId },
                    data: { cart: {} }
                })
            } else {
                // delete order from db
                await Promise.all(orderIdsArray.map(async (orderId) => {
                    await prisma.order.delete({
                        where: { id: orderId }
                    })
                }))
            }
        }

        switch (event.type) {
            case 'checkout.session.completed': {
                const session = event.data.object
                await handleCheckoutSessionCompleted(session)
                break;
            }

            case 'invoice.paid': {
                await handleInvoicePaid(event.data.object)
                break;
            }

            case 'invoice.payment_failed': {
                await handleInvoicePaymentFailed(event.data.object)
                break;
            }

            case 'customer.subscription.updated': {
                await handleSubscriptionUpdated(event.data.object)
                break;
            }

            case 'customer.subscription.deleted': {
                await handleSubscriptionDeleted(event.data.object)
                break;
            }

            case 'payment_intent.succeeded': {
                await handlePaymentIntent(event.data.object.id, true)
                break;
            }

            case 'payment_intent.canceled': {
                await handlePaymentIntent(event.data.object.id, false)
                break;
            }

            default:
                console.log('Unhandled event type:', event.type)
                break;
        }

        return NextResponse.json({ received: true })
    } catch (error) {
        console.error(error)
        return NextResponse.json({ error: error.message }, { status: 400 })
    }
}