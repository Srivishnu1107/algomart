import prisma from "@/lib/prisma";
import authSeller from "@/middlewares/authSeller";
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";


// Get Dashboard Data for Seller ( total orders, total earnings, total products )
export async function GET(request){
    try {
        const { userId } = getAuth(request)
        const { searchParams } = new URL(request.url)
        const rawStoreType = searchParams.get('type')
        const storeType = ["electronics", "fashion"].includes(rawStoreType) ? rawStoreType : "electronics"
        const storeId = await authSeller(userId, storeType)

        // Get all orders for seller with orderItems
        const orders = await prisma.order.findMany({
            where: { storeId },
            include: {
                orderItems: {
                    include: {
                        product: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        })

        // Get all products with ratings for seller
        const products = await prisma.product.findMany({where: {storeId}})

        const ratings = await prisma.rating.findMany({
            where: {productId: {in: products.map(product => product.id)}},
            include: {user: true, product: true}
        })

        // Calculate KPIs
        const totalOrders = orders.length
        const grossRevenue = orders.reduce((acc, order) => acc + order.total, 0)
        
        // Calculate refunds (RETURNED status)
        const refundedOrders = orders.filter(o => o.status === 'RETURNED')
        const refundLoss = refundedOrders.reduce((acc, order) => acc + order.total, 0)
        const refundRate = totalOrders > 0 ? (refundedOrders.length / totalOrders) * 100 : 0

        // Calculate cancellations (CANCELLED status)
        const cancelledOrders = orders.filter(o => o.status === 'CANCELLED')
        const cancellationRate = totalOrders > 0 ? (cancelledOrders.length / totalOrders) * 100 : 0

        // Calculate commission deducted
        let totalCommission = 0
        orders.forEach(order => {
            order.orderItems.forEach(item => {
                const commissionRate = item.product.commission_rate || 0.10
                const itemTotal = item.price * item.quantity
                totalCommission += itemTotal * commissionRate
            })
        })

        // Net earnings (after commission and refunds)
        const netEarnings = grossRevenue - totalCommission - refundLoss

        // Store Health Score (0-100)
        // Factors: refund rate (lower is better), cancellation rate (lower is better), 
        // order completion rate, average rating
        const avgRating = ratings.length > 0 
            ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length 
            : 0
        const completedOrders = orders.filter(o => o.status === 'DELIVERED').length
        const completionRate = totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 0
        
        // Health score calculation (weighted)
        const refundScore = Math.max(0, 100 - (refundRate * 10)) // Max 40 points
        const cancellationScore = Math.max(0, 100 - (cancellationRate * 10)) // Max 30 points
        const completionScore = completionRate * 0.2 // Max 20 points
        const ratingScore = (avgRating / 5) * 10 // Max 10 points
        const storeHealthScore = Math.round(Math.min(100, refundScore * 0.4 + cancellationScore * 0.3 + completionScore + ratingScore))

        // Earnings Over Time (Daily/Weekly)
        const now = new Date()
        const thirtyDaysAgo = new Date(now)
        thirtyDaysAgo.setDate(now.getDate() - 30)
        
        const dailyEarnings = {}
        const weeklyEarnings = {}
        
        // Initialize daily map for last 30 days
        for (let i = 0; i < 30; i++) {
            const d = new Date(now)
            d.setDate(d.getDate() - i)
            const dateKey = d.toISOString().split('T')[0]
            dailyEarnings[dateKey] = { revenue: 0, commission: 0, refunds: 0, net: 0 }
        }

        // Process orders for time-based earnings
        orders.forEach(order => {
            const orderDate = new Date(order.createdAt)
            const dateKey = orderDate.toISOString().split('T')[0]
            
            if (dailyEarnings[dateKey]) {
                let orderCommission = 0
                order.orderItems.forEach(item => {
                    const commissionRate = item.product.commission_rate || 0.10
                    const itemTotal = item.price * item.quantity
                    orderCommission += itemTotal * commissionRate
                })
                
                const isRefunded = order.status === 'RETURNED'
                dailyEarnings[dateKey].revenue += order.total
                dailyEarnings[dateKey].commission += orderCommission
                if (isRefunded) {
                    dailyEarnings[dateKey].refunds += order.total
                }
                dailyEarnings[dateKey].net = dailyEarnings[dateKey].revenue - dailyEarnings[dateKey].commission - dailyEarnings[dateKey].refunds
            }
        })

        // Aggregate weekly earnings
        const weeklyMap = {}
        Object.keys(dailyEarnings).forEach(dateKey => {
            const date = new Date(dateKey)
            const weekStart = new Date(date)
            weekStart.setDate(date.getDate() - date.getDay()) // Start of week (Sunday)
            const weekKey = weekStart.toISOString().split('T')[0]
            
            if (!weeklyEarnings[weekKey]) {
                weeklyEarnings[weekKey] = { revenue: 0, commission: 0, refunds: 0, net: 0 }
            }
            weeklyEarnings[weekKey].revenue += dailyEarnings[dateKey].revenue
            weeklyEarnings[weekKey].commission += dailyEarnings[dateKey].commission
            weeklyEarnings[weekKey].refunds += dailyEarnings[dateKey].refunds
            weeklyEarnings[weekKey].net += dailyEarnings[dateKey].net
        })

        // Format earnings trend data
        const earningsTrendDaily = Object.keys(dailyEarnings)
            .sort()
            .slice(-30)
            .map(dateKey => ({
                date: dateKey,
                name: new Date(dateKey).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                revenue: dailyEarnings[dateKey].revenue,
                net: dailyEarnings[dateKey].net
            }))

        const earningsTrendWeekly = Object.keys(weeklyEarnings)
            .sort()
            .slice(-8)
            .map(weekKey => ({
                date: weekKey,
                name: `Week ${new Date(weekKey).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
                revenue: weeklyEarnings[weekKey].revenue,
                net: weeklyEarnings[weekKey].net
            }))

        // Top Categories by Revenue
        const categoryRevenue = {}
        orders.forEach(order => {
            order.orderItems.forEach(item => {
                const category = item.product.category || 'Uncategorized'
                const itemTotal = item.price * item.quantity
                if (!categoryRevenue[category]) {
                    categoryRevenue[category] = 0
                }
                categoryRevenue[category] += itemTotal
            })
        })

        const topCategories = Object.keys(categoryRevenue)
            .map(category => ({
                category,
                revenue: categoryRevenue[category],
                contribution: grossRevenue > 0 ? (categoryRevenue[category] / grossRevenue) * 100 : 0
            }))
            .sort((a, b) => b.revenue - a.revenue)

        // Top Products by Revenue (Max 5)
        const productRevenue = {}
        const productOrderIds = {} // Track unique order IDs per product
        const productRefundOrderIds = {} // Track refund order IDs per product
        
        orders.forEach(order => {
            const isRefunded = order.status === 'RETURNED'
            order.orderItems.forEach(item => {
                const productId = item.productId
                const productName = item.product.name
                const itemTotal = item.price * item.quantity
                
                if (!productRevenue[productId]) {
                    productRevenue[productId] = { name: productName, revenue: 0 }
                    productOrderIds[productId] = new Set()
                    productRefundOrderIds[productId] = new Set()
                }
                productRevenue[productId].revenue += itemTotal
                
                // Track unique orders per product
                productOrderIds[productId].add(order.id)
                
                if (isRefunded) {
                    productRefundOrderIds[productId].add(order.id)
                }
            })
        })

        const topProducts = Object.keys(productRevenue)
            .map(productId => {
                const orderCount = productOrderIds[productId].size
                const refundCount = productRefundOrderIds[productId].size
                return {
                    productId,
                    name: productRevenue[productId].name,
                    revenue: productRevenue[productId].revenue,
                    orders: orderCount,
                    refundRate: orderCount > 0 ? (refundCount / orderCount) * 100 : 0
                }
            })
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 5)

        // Revenue Breakdown
        const revenueBreakdown = {
            grossRevenue: Math.round(grossRevenue),
            commissionDeducted: Math.round(totalCommission),
            refundLoss: Math.round(refundLoss),
            netEarnings: Math.round(netEarnings)
        }

        const dashboardData = {
            ratings,
            totalOrders,
            totalEarnings: Math.round(grossRevenue),
            totalProducts: products.length,
            // New KPIs
            refundRate: Math.round(refundRate * 10) / 10,
            cancellationRate: Math.round(cancellationRate * 10) / 10,
            netEarnings: Math.round(netEarnings),
            storeHealthScore,
            // Earnings trend
            earningsTrendDaily,
            earningsTrendWeekly,
            // Top categories
            topCategories,
            // Top products
            topProducts,
            // Revenue breakdown
            revenueBreakdown
        }

         return NextResponse.json({ dashboardData });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: error.code || error.message }, { status: 400 })
    }
}