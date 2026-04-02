import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getAuth } from "@clerk/nextjs/server";
import authAdmin from "@/middlewares/authAdmin";
import { generateForInsights } from "@/lib/aiClient";

// Calculate Vendor Trust Index
export async function GET(request, { params }) {
    try {
        const { userId } = getAuth(request);
        const isAdmin = await authAdmin(userId);

        if (!isAdmin) {
            return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
        }

        const { username } = await params;

        if (!username) {
            return NextResponse.json({ error: 'Username required' }, { status: 400 });
        }

        // Get store with all necessary data
        // IMPORTANT: Always include trustAnalysis to fetch from DB first
        const store = await prisma.store.findUnique({
            where: { username },
            include: {
                trustAnalysis: {
                    select: {
                        summary: true,
                        tone: true,
                        highlights: true,
                        analyzedAt: true
                    }
                },
                Order: {
                    select: {
                        id: true,
                        status: true,
                        total: true,
                        createdAt: true,
                        updatedAt: true
                    },
                    orderBy: { createdAt: 'desc' }
                },
                Product: {
                    select: {
                        id: true,
                        name: true,
                        images: true,
                        category: true,
                        inStock: true,
                        stock_quantity: true,
                        low_stock_threshold: true,
                        rating: {
                            select: {
                                rating: true,
                                createdAt: true
                            }
                        },
                        orderItems: {
                            select: {
                                quantity: true,
                                price: true,
                                orderId: true,
                                order: {
                                    select: {
                                        id: true,
                                        status: true,
                                        createdAt: true,
                                        total: true
                                    }
                                }
                            }
                        }
                    }
                }
            }
        });

        if (!store) {
            return NextResponse.json({ error: 'Store not found' }, { status: 404 });
        }

        const now = new Date();
        const thirtyDaysAgo = new Date(now);
        thirtyDaysAgo.setDate(now.getDate() - 30);
        const sixtyDaysAgo = new Date(now);
        sixtyDaysAgo.setDate(now.getDate() - 60);

        // 1️⃣ Order Reliability (30%)
        const allOrders = store.Order || [];
        const successfulOrders = allOrders.filter(o => 
            ['DELIVERED', 'SHIPPED', 'PROCESSING', 'ORDER_PLACED'].includes(o.status)
        );
        const cancelledOrders = allOrders.filter(o => o.status === 'CANCELLED');
        const totalOrderCount = allOrders.length;
        
        const successfulOrderRate = totalOrderCount > 0 
            ? (successfulOrders.length / totalOrderCount) * 100 
            : 100; // Default to 100 if no orders
        
        const cancellationRate = totalOrderCount > 0 
            ? (cancelledOrders.length / totalOrderCount) * 100 
            : 0;

        // Order Reliability Score (0-100)
        // Higher successful rate = higher score, lower cancellation = higher score
        const orderReliabilityScore = Math.max(0, Math.min(100, 
            (successfulOrderRate * 0.7) + ((100 - cancellationRate) * 0.3)
        ));

        // 2️⃣ Refund Behavior (20%)
        const returnedOrders = allOrders.filter(o => o.status === 'RETURNED');
        const refundRate = totalOrderCount > 0 
            ? (returnedOrders.length / totalOrderCount) * 100 
            : 0;

        // Refund spike detection (last 30 days vs previous 30 days)
        const recentReturns = returnedOrders.filter(o => new Date(o.createdAt) >= thirtyDaysAgo).length;
        const previousReturns = returnedOrders.filter(o => {
            const date = new Date(o.createdAt);
            return date >= sixtyDaysAgo && date < thirtyDaysAgo;
        }).length;
        
        const refundSpike = previousReturns > 0 
            ? ((recentReturns - previousReturns) / previousReturns) * 100 
            : recentReturns > 0 ? 100 : 0; // Spike if any recent returns when none before

        // Refund Score (0-100) - lower refunds = higher score
        const refundScore = Math.max(0, Math.min(100, 
            100 - (refundRate * 0.8) - (Math.min(refundSpike, 50) * 0.2)
        ));

        // 3️⃣ Customer Feedback (20%)
        const allRatings = store.Product.flatMap(p => p.rating || []);
        const avgRating = allRatings.length > 0
            ? allRatings.reduce((sum, r) => sum + r.rating, 0) / allRatings.length
            : 0;
        
        const reviewVolume = allRatings.length;
        const negativeReviews = allRatings.filter(r => r.rating <= 2).length;
        const negativeReviewPercent = reviewVolume > 0 
            ? (negativeReviews / reviewVolume) * 100 
            : 0;

        // Rating Score (0-100)
        // Based on average rating (0-5 scale -> 0-100), review volume bonus, negative review penalty
        const ratingScore = Math.max(0, Math.min(100,
            (avgRating / 5) * 100 * 0.7 + // Base rating score
            Math.min(reviewVolume / 10, 1) * 20 + // Volume bonus (max 20 points for 10+ reviews)
            Math.max(0, 10 - (negativeReviewPercent / 10)) // Negative review penalty
        ));

        // 4️⃣ Revenue Stability (15%)
        // Calculate revenue by month for last 6 months
        const monthlyRevenue = {};
        successfulOrders.forEach(order => {
            const monthKey = new Date(order.createdAt).toISOString().slice(0, 7); // YYYY-MM
            monthlyRevenue[monthKey] = (monthlyRevenue[monthKey] || 0) + order.total;
        });

        const revenueValues = Object.values(monthlyRevenue);
        const avgRevenue = revenueValues.length > 0
            ? revenueValues.reduce((sum, r) => sum + r, 0) / revenueValues.length
            : 0;

        // Calculate volatility (coefficient of variation)
        const variance = revenueValues.length > 1
            ? revenueValues.reduce((sum, r) => sum + Math.pow(r - avgRevenue, 2), 0) / revenueValues.length
            : 0;
        const stdDev = Math.sqrt(variance);
        const volatility = avgRevenue > 0 ? (stdDev / avgRevenue) * 100 : 0;

        // Check for sudden revenue drop (last 30 days vs previous 30 days)
        const recentRevenue = successfulOrders
            .filter(o => new Date(o.createdAt) >= thirtyDaysAgo)
            .reduce((sum, o) => sum + o.total, 0);
        const previousRevenue = successfulOrders
            .filter(o => {
                const date = new Date(o.createdAt);
                return date >= sixtyDaysAgo && date < thirtyDaysAgo;
            })
            .reduce((sum, o) => sum + o.total, 0);
        
        const revenueDropPercent = previousRevenue > 0
            ? ((previousRevenue - recentRevenue) / previousRevenue) * 100
            : 0;

        // Stability Score (0-100) - lower volatility and drops = higher score
        const stabilityScore = Math.max(0, Math.min(100,
            100 - (Math.min(volatility, 50) * 0.6) - (Math.min(revenueDropPercent, 50) * 0.4)
        ));

        // 5️⃣ Inventory Discipline (10%)
        const allProducts = store.Product || [];
        const outOfStockProducts = allProducts.filter(p => !p.inStock || p.stock_quantity === 0);
        const outOfStockPercent = allProducts.length > 0
            ? (outOfStockProducts.length / allProducts.length) * 100
            : 0;

        // Low stock frequency (products below threshold)
        const lowStockProducts = allProducts.filter(p => 
            p.inStock && p.stock_quantity > 0 && p.stock_quantity <= p.low_stock_threshold
        );
        const lowStockPercent = allProducts.length > 0
            ? (lowStockProducts.length / allProducts.length) * 100
            : 0;

        // Inventory Score (0-100) - lower stockouts = higher score
        const inventoryScore = Math.max(0, Math.min(100,
            100 - (outOfStockPercent * 0.7) - (lowStockPercent * 0.3)
        ));

        // 6️⃣ Account Maturity (5%)
        const accountAgeMonths = (now - new Date(store.createdAt)) / (1000 * 60 * 60 * 24 * 30);
        const totalOrdersVolume = totalOrderCount;

        // Experience Score (0-100)
        // Based on account age (max 12 months = 50 points) and order volume (max 100 orders = 50 points)
        const experienceScore = Math.max(0, Math.min(100,
            Math.min(accountAgeMonths / 12, 1) * 50 + // Age component
            Math.min(totalOrdersVolume / 100, 1) * 50  // Volume component
        ));

        // Calculate Final Trust Score
        const trustScore = Math.round(
            (0.30 * orderReliabilityScore) +
            (0.20 * refundScore) +
            (0.20 * ratingScore) +
            (0.15 * stabilityScore) +
            (0.10 * inventoryScore) +
            (0.05 * experienceScore)
        );

        // Determine Trust Level
        let trustLevel, trustLevelColor, trustLevelBg;
        if (trustScore >= 80) {
            trustLevel = 'Elite';
            trustLevelColor = 'text-green-300';
            trustLevelBg = 'bg-green-500/20 border-green-500/40';
        } else if (trustScore >= 60) {
            trustLevel = 'Reliable';
            trustLevelColor = 'text-blue-300';
            trustLevelBg = 'bg-blue-500/20 border-blue-500/40';
        } else if (trustScore >= 40) {
            trustLevel = 'Watch';
            trustLevelColor = 'text-yellow-300';
            trustLevelBg = 'bg-yellow-500/20 border-yellow-500/40';
        } else {
            trustLevel = 'Risky';
            trustLevelColor = 'text-red-300';
            trustLevelBg = 'bg-red-500/20 border-red-500/40';
        }

        // Calculate additional data for Store Profile
        // Rating breakdown
        const ratingBreakdown = {
            5: allRatings.filter(r => r.rating === 5).length,
            4: allRatings.filter(r => r.rating === 4).length,
            3: allRatings.filter(r => r.rating === 3).length,
            2: allRatings.filter(r => r.rating === 2).length,
            1: allRatings.filter(r => r.rating === 1).length
        }

        // Orders per week (last 8 weeks)
        const eightWeeksAgo = new Date(now);
        eightWeeksAgo.setDate(now.getDate() - 56);
        const weeklyOrders = [];
        const weeklyCancellations = [];
        
        for (let i = 7; i >= 0; i--) {
            const weekStart = new Date(now);
            weekStart.setDate(now.getDate() - (i * 7));
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekStart.getDate() + 7);
            
            const weekOrders = successfulOrders.filter(o => {
                const orderDate = new Date(o.createdAt);
                return orderDate >= weekStart && orderDate < weekEnd;
            }).length;
            
            const weekCancellations = cancelledOrders.filter(o => {
                const orderDate = new Date(o.createdAt);
                return orderDate >= weekStart && orderDate < weekEnd;
            }).length;
            
            weeklyOrders.push({
                week: `Week ${8 - i}`,
                orders: weekOrders,
                cancelled: weekCancellations
            });
        }

        // Total revenue and AOV
        const totalRevenue = successfulOrders.reduce((sum, o) => sum + o.total, 0);
        const averageOrderValue = successfulOrders.length > 0 
            ? totalRevenue / successfulOrders.length 
            : 0;

        // Top products by revenue
        const productsWithRevenue = allProducts.map(product => {
            const productOrderItems = product.orderItems || [];
            const productOrders = productOrderItems.filter(oi => 
                oi.order && ['DELIVERED', 'SHIPPED', 'PROCESSING', 'ORDER_PLACED'].includes(oi.order.status)
            );
            const revenue = productOrders.reduce((sum, oi) => sum + (oi.price * oi.quantity), 0);
            // Get unique order IDs using orderId from orderItems or order.id
            const orderIds = productOrders
                .map(oi => oi.order?.id || oi.orderId)
                .filter(Boolean);
            const orderCount = new Set(orderIds).size;
            const productRating = product.rating && product.rating.length > 0
                ? product.rating.reduce((sum, r) => sum + r.rating, 0) / product.rating.length
                : 0;
            
            return {
                id: product.id,
                name: product.name,
                images: product.images || [],
                category: product.category || 'Uncategorized',
                revenue,
                orderCount,
                rating: productRating,
                reviewCount: product.rating?.length || 0
            };
        });

        const topProducts = [...productsWithRevenue]
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 4);

        // Top categories by revenue
        const categoryRevenue = {};
        productsWithRevenue.forEach(product => {
            const category = product.category || 'Uncategorized';
            if (!categoryRevenue[category]) {
                categoryRevenue[category] = {
                    name: category,
                    revenue: 0,
                    productCount: 0
                };
            }
            categoryRevenue[category].revenue += product.revenue;
            categoryRevenue[category].productCount += 1;
        });

        const topCategories = Object.values(categoryRevenue)
            .sort((a, b) => b.revenue - a.revenue)
            .map(cat => ({
                ...cat,
                percentOfTotal: totalRevenue > 0 ? (cat.revenue / totalRevenue) * 100 : 0
            }));

        // Build response object
        const responseData = {
            store: {
                id: store.id,
                name: store.name,
                username: store.username,
                logo: store.logo,
                createdAt: store.createdAt,
                storeType: store.storeType
            },
            trustScore,
            trustLevel,
            trustLevelColor,
            trustLevelBg,
            breakdown: {
                orderReliability: {
                    score: Math.round(orderReliabilityScore),
                    successfulOrderRate: Math.round(successfulOrderRate * 10) / 10,
                    cancellationRate: Math.round(cancellationRate * 10) / 10,
                    totalOrders: totalOrderCount,
                    successfulOrders: successfulOrders.length,
                    cancelledOrders: cancelledOrders.length
                },
                refund: {
                    score: Math.round(refundScore),
                    refundRate: Math.round(refundRate * 10) / 10,
                    refundSpike: Math.round(refundSpike * 10) / 10,
                    totalReturns: returnedOrders.length
                },
                rating: {
                    score: Math.round(ratingScore),
                    averageRating: Math.round(avgRating * 10) / 10,
                    reviewVolume,
                    negativeReviewPercent: Math.round(negativeReviewPercent * 10) / 10
                },
                stability: {
                    score: Math.round(stabilityScore),
                    volatility: Math.round(volatility * 10) / 10,
                    revenueDropPercent: Math.round(revenueDropPercent * 10) / 10,
                    monthlyRevenueData: Object.entries(monthlyRevenue).map(([month, revenue]) => ({
                        month,
                        revenue: Math.round(revenue * 100) / 100
                    }))
                },
                inventory: {
                    score: Math.round(inventoryScore),
                    outOfStockPercent: Math.round(outOfStockPercent * 10) / 10,
                    lowStockPercent: Math.round(lowStockPercent * 10) / 10,
                    totalProducts: allProducts.length,
                    outOfStockProducts: outOfStockProducts.length,
                    lowStockProducts: lowStockProducts.length
                },
                experience: {
                    score: Math.round(experienceScore),
                    accountAgeMonths: Math.round(accountAgeMonths * 10) / 10,
                    totalOrdersVolume
                }
            },
            // Store Profile Data
            profile: {
                ratingBreakdown,
                weeklyOrders,
                totalRevenue: Math.round(totalRevenue * 100) / 100,
                averageOrderValue: Math.round(averageOrderValue * 100) / 100,
                totalProducts: allProducts.length,
                totalOrdersCompleted: successfulOrders.length,
                refundRate: Math.round(refundRate * 10) / 10,
                topProducts,
                topCategories
            }
        };

        // Generate Vendor Analysis Summary using Gemini AI
        const generateVendorAnalysis = async (forceRegenerate = false) => {
            try {
                // Determine overall assessment
                const isElite = trustScore >= 80;
                const isReliable = trustScore >= 60 && trustScore < 80;
                const isWatch = trustScore >= 40 && trustScore < 60;
                const isRisky = trustScore < 40;

                // Check if store has sufficient data
                const hasOrders = responseData.breakdown.orderReliability.totalOrders > 0;
                const hasProducts = responseData.profile.totalProducts > 0;
                const hasReviews = responseData.breakdown.rating.reviewVolume > 0;
                const accountAgeMonths = responseData.breakdown.experience.accountAgeMonths;

                // Handle edge cases - ensure clean text without undefined
                if (!hasOrders && !hasProducts) {
                    const summary = `${store.name} is a new store that has just started. No sales or product data is available yet. The store is in its initial phase and requires time to build a track record and establish reliability.`;
                    return {
                        summary: summary.replace(/undefined/gi, '').trim(),
                        tone: 'neutral',
                        highlights: []
                    };
                }

                if (!hasOrders && hasProducts) {
                    const summary = `${store.name} has listed products but hasn't made any sales yet. The store is actively preparing for business and waiting for its first customers to establish operational credibility.`;
                    return {
                        summary: summary.replace(/undefined/gi, '').trim(),
                        tone: 'neutral',
                        highlights: []
                    };
                }

                if (accountAgeMonths < 1 && responseData.breakdown.orderReliability.totalOrders < 5) {
                    const summary = `${store.name} is a very new store with limited transaction history. Early indicators are promising, but more data is needed to assess long-term reliability and establish a complete trust profile.`;
                    return {
                        summary: summary.replace(/undefined/gi, '').trim(),
                        tone: 'neutral',
                        highlights: []
                    };
                }

                // Build context for Gemini
                const vendorContext = {
                    storeName: store.name,
                    storeType: store.storeType,
                    trustScore,
                    trustLevel,
                    orderReliability: {
                        successRate: responseData.breakdown.orderReliability.successfulOrderRate,
                        cancellationRate: responseData.breakdown.orderReliability.cancellationRate,
                        totalOrders: responseData.breakdown.orderReliability.totalOrders,
                        successfulOrders: responseData.breakdown.orderReliability.successfulOrders
                    },
                    refund: {
                        rate: responseData.breakdown.refund.refundRate,
                        totalReturns: responseData.breakdown.refund.totalReturns
                    },
                    rating: {
                        average: responseData.breakdown.rating.averageRating,
                        totalReviews: responseData.breakdown.rating.reviewVolume,
                        negativePercent: responseData.breakdown.rating.negativeReviewPercent
                    },
                    revenue: {
                        total: responseData.profile.totalRevenue,
                        averageOrderValue: responseData.profile.averageOrderValue,
                        volatility: responseData.breakdown.stability.volatility,
                        dropPercent: responseData.breakdown.stability.revenueDropPercent
                    },
                    inventory: {
                        outOfStockPercent: responseData.breakdown.inventory.outOfStockPercent,
                        totalProducts: responseData.profile.totalProducts
                    },
                    experience: {
                        accountAgeMonths: Math.floor(accountAgeMonths),
                        totalOrders: responseData.breakdown.experience.totalOrdersVolume
                    }
                };

                const systemPrompt = `You are an expert vendor trust analyst. Generate a concise, professional assessment of a vendor's reliability and safety based on their performance metrics. 

IMPORTANT GUIDELINES:
- Write in 2-3 sentences maximum
- DO NOT mention specific numbers, percentages, ratings, or statistics - the user can see those themselves
- Focus on overall assessment, reliability, trustworthiness, and safety
- Use a professional but friendly tone
- Highlight key strengths if trust score is 60+ (without mentioning numbers)
- Mention concerns if trust score is below 40 (without mentioning numbers)
- For new stores, acknowledge limited data without mentioning specific metrics
- Keep it concise, actionable, and qualitative rather than quantitative
- Ensure proper grammar and complete sentences
- End with proper punctuation (period)
- DO NOT include the word "undefined" anywhere in your response
- DO NOT include placeholder text or incomplete thoughts`;

                // Determine qualitative descriptors instead of numbers
                const orderReliabilityDesc = vendorContext.orderReliability.successRate >= 95 ? 'excellent' : 
                                            vendorContext.orderReliability.successRate >= 85 ? 'good' : 
                                            vendorContext.orderReliability.successRate >= 70 ? 'moderate' : 'needs improvement';
                
                const refundDesc = vendorContext.refund.rate <= 2 ? 'very low' : 
                                  vendorContext.refund.rate <= 5 ? 'low' : 
                                  vendorContext.refund.rate <= 10 ? 'moderate' : 'high';
                
                const ratingDesc = vendorContext.rating.average >= 4.5 ? 'excellent' : 
                                  vendorContext.rating.average >= 4.0 ? 'good' : 
                                  vendorContext.rating.average >= 3.0 ? 'moderate' : 'needs improvement';
                
                const revenueTrendDesc = vendorContext.revenue.dropPercent <= 0 ? 'stable' : 'declining';
                
                const accountMaturityDesc = vendorContext.experience.accountAgeMonths >= 12 ? 'established' : 
                                           vendorContext.experience.accountAgeMonths >= 6 ? 'growing' : 
                                           vendorContext.experience.accountAgeMonths >= 1 ? 'new' : 'very new';

                const userPrompt = `Analyze this vendor's performance and provide a brief qualitative assessment:

Store: ${vendorContext.storeName} (${vendorContext.storeType})
Trust Level: ${vendorContext.trustLevel}

Overall Performance Indicators:
- Order fulfillment: ${orderReliabilityDesc}
- Refund behavior: ${refundDesc}
- Customer satisfaction: ${ratingDesc}
- Revenue stability: ${revenueTrendDesc}
- Account maturity: ${accountMaturityDesc}
- Trust assessment: ${vendorContext.trustLevel}

Provide a concise qualitative assessment focusing on reliability and safety. DO NOT mention any numbers, percentages, or specific metrics. Focus on the overall trustworthiness and whether this vendor is safe to work with.`;

                const aiSummary = await generateForInsights(userPrompt, systemPrompt);
                
                // Clean the AI response - remove any markdown, extra whitespace, or undefined
                let cleanSummary = aiSummary
                    .replace(/undefined/gi, '') // Remove undefined (case insensitive)
                    .replace(/null/gi, '') // Remove null
                    .replace(/\*\*/g, '') // Remove markdown bold
                    .replace(/\*/g, '') // Remove markdown italic
                    .replace(/```[\s\S]*?```/g, '') // Remove code blocks
                    .replace(/`/g, '') // Remove backticks
                    .replace(/\n+/g, ' ') // Replace newlines with spaces
                    .replace(/\s+/g, ' ') // Normalize whitespace
                    .replace(/\s+undefined\s*/gi, ' ') // Remove standalone "undefined" word
                    .replace(/undefined\s*/gi, '') // Remove any remaining undefined
                    .replace(/\s+/g, ' ') // Normalize whitespace again
                    .trim();
                
                // Remove trailing "undefined" if it appears at the end
                cleanSummary = cleanSummary.replace(/\s+undefined\.?$/i, '').trim();
                
                // Ensure proper sentence ending
                if (cleanSummary && !cleanSummary.match(/[.!?]$/)) {
                    cleanSummary = cleanSummary + '.';
                }
                
                // Final cleanup - remove any double spaces or trailing issues
                cleanSummary = cleanSummary.replace(/\s+/g, ' ').trim();
                
                // Determine tone based on trust score
                let tone = 'neutral';
                if (isElite || isReliable) tone = 'positive';
                else if (isWatch || isRisky) tone = 'caution';

                // Extract highlights
                const highlights = [];
                if (vendorContext.orderReliability.successRate >= 95 && vendorContext.orderReliability.cancellationRate <= 5) {
                    highlights.push('Excellent order fulfillment');
                }
                if (vendorContext.refund.rate <= 2) {
                    highlights.push('Low refund rate');
                }
                if (vendorContext.rating.average >= 4.5 && vendorContext.rating.totalReviews >= 10) {
                    highlights.push('High customer satisfaction');
                }
                if (vendorContext.revenue.dropPercent <= 0 && vendorContext.revenue.volatility < 20) {
                    highlights.push('Stable revenue');
                }
                if (vendorContext.experience.accountAgeMonths >= 12 && vendorContext.experience.totalOrders >= 50) {
                    highlights.push('Established vendor');
                }

                return {
                    summary: cleanSummary,
                    tone,
                    highlights
                };
            } catch (error) {
                console.error('Gemini AI Error:', error);
                // Fallback to basic analysis - ensure no undefined
                const isElite = trustScore >= 80;
                const isReliable = trustScore >= 60 && trustScore < 80;
                
                let fallbackSummary = `${store.name} ${isElite ? 'demonstrates exceptional performance and reliability' : isReliable ? 'shows solid performance and maintains good reliability standards' : 'requires monitoring as some performance metrics indicate areas for improvement'}.`;
                
                // Clean fallback summary
                fallbackSummary = fallbackSummary
                    .replace(/undefined/gi, '')
                    .replace(/null/gi, '')
                    .replace(/\s+/g, ' ')
                    .trim();
                
                return {
                    summary: fallbackSummary,
                    tone: isElite || isReliable ? 'positive' : 'caution',
                    highlights: []
                };
            }
        };

        // ALWAYS check DB first - never regenerate unless explicitly requested via regenerate endpoint
        let vendorAnalysis;
        
        if (store.trustAnalysis && store.trustAnalysis.summary) {
            // Use existing analysis from DB - this ensures persistence across refreshes, re-logins, and server restarts
            let highlights = [];
            if (Array.isArray(store.trustAnalysis.highlights)) {
                highlights = store.trustAnalysis.highlights;
            } else if (typeof store.trustAnalysis.highlights === 'string') {
                try {
                    highlights = JSON.parse(store.trustAnalysis.highlights);
                } catch (e) {
                    console.warn('Failed to parse highlights JSON:', e);
                    highlights = [];
                }
            }
            
            // Clean the summary from DB to remove any undefined that might have been stored
            let cleanSummary = store.trustAnalysis.summary
                .replace(/undefined/gi, '')
                .replace(/null/gi, '')
                .replace(/\s+undefined\s*/gi, ' ')
                .replace(/undefined\s*/gi, '')
                .replace(/\s+/g, ' ')
                .trim();
            
            // Remove trailing "undefined" if it appears at the end
            cleanSummary = cleanSummary.replace(/\s+undefined\.?$/i, '').trim();
            
            vendorAnalysis = {
                summary: cleanSummary,
                tone: store.trustAnalysis.tone || 'neutral',
                highlights: highlights
            };
        } else {
            // Only generate new analysis if it doesn't exist in DB
            vendorAnalysis = await generateVendorAnalysis();
            
            // Save to database - ensure it's persisted
            try {
                await prisma.vendorTrustAnalysis.upsert({
                    where: { storeId: store.id },
                    update: {
                        summary: vendorAnalysis.summary,
                        tone: vendorAnalysis.tone,
                        highlights: vendorAnalysis.highlights,
                        analyzedAt: new Date()
                    },
                    create: {
                        storeId: store.id,
                        storeType: store.storeType,
                        summary: vendorAnalysis.summary,
                        tone: vendorAnalysis.tone,
                        highlights: vendorAnalysis.highlights
                    }
                });
            } catch (dbError) {
                console.error('Error saving trust analysis to DB:', dbError);
                // If DB save fails, still return the generated analysis but log the error
                // This ensures the user gets a response even if DB write fails
            }
        }

        // Add vendorAnalysis to the response
        responseData.vendorAnalysis = vendorAnalysis;

        return NextResponse.json(responseData);
    } catch (error) {
        console.error('Trust Index Error:', error);
        console.error('Error stack:', error.stack);
        return NextResponse.json({ 
            error: error.message || 'Failed to calculate trust index',
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        }, { status: 500 });
    }
}
