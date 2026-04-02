import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getAuth } from "@clerk/nextjs/server";
import authAdmin from "@/middlewares/authAdmin";

// Get store info & store products with comprehensive data for shop page
export async function GET(request) {
    try {
        // Get store username from query params
        const { searchParams } = new URL(request.url)
        const username = searchParams.get('username')?.toLowerCase();
        const { userId } = getAuth(request);

        if (!username) {
            return NextResponse.json({ error: "missing username" }, { status: 400 })
        }

        const isAdmin = await authAdmin(userId);
        const productWhere = {
            inStock: true,
            is_draft: false,
            ...(isAdmin ? {} : { status: 'active' })
        };

        // Get store info with products, orders, and ratings
        const store = await prisma.store.findUnique({
            where: { username, isActive: true },
            include: {
                followers: {
                    select: {
                        userId: true
                    }
                },
                Product: {
                    where: productWhere,
                    include: {
                        rating: {
                            include: {
                                user: {
                                    select: {
                                        id: true,
                                        name: true,
                                        image: true
                                    }
                                }
                            }
                        },
                        orderItems: {
                            include: {
                                order: {
                                    select: {
                                        id: true,
                                        status: true
                                    }
                                }
                            }
                        }
                    }
                },
                Order: {
                    select: {
                        id: true,
                        status: true,
                        total: true,
                        createdAt: true
                    }
                }
            }
        })

        if (!store) {
            return NextResponse.json({ error: "store not found" }, { status: 400 })
        }

        // Calculate metrics
        const allRatings = store.Product.flatMap(p => p.rating)
        const avgRating = allRatings.length > 0
            ? allRatings.reduce((sum, r) => sum + r.rating, 0) / allRatings.length
            : 0

        const totalReviews = allRatings.length
        const confirmedOrders = store.Order.filter(o =>
            o.status === 'DELIVERED' || o.status === 'SHIPPED' || o.status === 'PROCESSING' || o.status === 'ORDER_PLACED'
        )
        const totalOrders = confirmedOrders.length

        const refundedOrders = store.Order.filter(o => o.status === 'RETURNED')
        const refundRate = totalOrders > 0
            ? (refundedOrders.length / totalOrders) * 100
            : 0

        // Calculate product revenue and order counts for featured products
        const productsWithMetrics = store.Product.map(product => {
            const orderItems = product.orderItems || []
            const productOrders = orderItems.filter(oi =>
                oi.order && oi.order.status !== 'CANCELLED' && oi.order.status !== 'RETURNED'
            )
            const revenue = productOrders.reduce((sum, oi) => sum + (oi.price * oi.quantity), 0)
            const orderCount = new Set(productOrders.map(oi => oi.order?.id).filter(Boolean)).size
            const productRating = product.rating && product.rating.length > 0
                ? product.rating.reduce((sum, r) => sum + r.rating, 0) / product.rating.length
                : 0

            // Normalize price fields for backward compatibility
            const price = product.offer_price || product.price || 0
            const mrp = product.actual_price || product.mrp || price

            return {
                ...product,
                price, // Normalized offer price
                mrp,   // Normalized actual/MRP price
                revenue,
                orderCount,
                productRating
            }
        })

        // Get featured products (top 4 by revenue or order count)
        const featuredProducts = [...productsWithMetrics]
            .sort((a, b) => (b.revenue || 0) - (a.revenue || 0) || (b.orderCount || 0) - (a.orderCount || 0))
            .slice(0, 4)

        // Calculate category breakdown
        const categoryMap = {}
        store.Product.forEach(product => {
            const category = product.category || 'Uncategorized'
            if (!categoryMap[category]) {
                categoryMap[category] = {
                    name: category,
                    productCount: 0,
                    orderCount: 0
                }
            }
            categoryMap[category].productCount++
            const orderItems = product.orderItems || []
            const categoryOrders = orderItems.filter(oi =>
                oi.order && oi.order.status !== 'CANCELLED' && oi.order.status !== 'RETURNED'
            )
            categoryMap[category].orderCount += new Set(categoryOrders.map(oi => oi.order?.id).filter(Boolean)).size
        })

        const totalCategoryOrders = Object.values(categoryMap).reduce((sum, cat) => sum + cat.orderCount, 0)
        const categories = Object.values(categoryMap).map(cat => ({
            ...cat,
            contributionPercent: totalCategoryOrders > 0 ? (cat.orderCount / totalCategoryOrders) * 100 : 0
        })).sort((a, b) => b.contributionPercent - a.contributionPercent)

        // Get recent reviews (last 5)
        const recentReviews = allRatings
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .slice(0, 5)
            .map(r => ({
                id: r.id,
                rating: r.rating,
                comment: r.review,
                createdAt: r.createdAt,
                userName: r.user?.name || 'Anonymous',
                userImage: r.user?.image || null,
                productName: store.Product.find(p => p.id === r.productId)?.name || 'Product'
            }))

        // Rating breakdown
        const ratingBreakdown = {
            5: allRatings.filter(r => r.rating === 5).length,
            4: allRatings.filter(r => r.rating === 4).length,
            3: allRatings.filter(r => r.rating === 3).length,
            2: allRatings.filter(r => r.rating === 2).length,
            1: allRatings.filter(r => r.rating === 1).length
        }

        // Check if current user is following this store
        const isFollowing = userId ? store.followers.some(f => f.userId === userId) : false
        const followerCount = store.followers.length
        const isOwner = !!userId && store.userId === userId

        return NextResponse.json({
            isOwner,
            store: {
                id: store.id,
                name: store.name,
                username: store.username,
                logo: store.logo,
                banner: store.banner ?? null,
                description: store.description,
                storeType: store.storeType,
                createdAt: store.createdAt,
                email: store.email,
                contact: store.contact,
                address: store.address
            },
            isFollowing,
            followerCount,
            metrics: {
                avgRating: Math.round(avgRating * 10) / 10,
                totalReviews,
                totalOrders,
                totalProducts: store.Product.length,
                refundRate: Math.round(refundRate * 10) / 10
            },
            featuredProducts,
            categories,
            recentReviews,
            ratingBreakdown,
            allProducts: productsWithMetrics
        })
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: error.code || error.message }, { status: 400 })
    }
}