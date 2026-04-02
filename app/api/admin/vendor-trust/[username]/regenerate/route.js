import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getAuth } from "@clerk/nextjs/server";
import authAdmin from "@/middlewares/authAdmin";
import { generateForInsights } from "@/lib/aiClient";

// Regenerate Vendor Trust Analysis
export async function POST(request, { params }) {
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
        const store = await prisma.store.findUnique({
            where: { username },
            include: {
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

        // Calculate trust metrics
        const now = new Date();
        const allOrders = store.Order || [];
        const successfulOrders = allOrders.filter(o => 
            ['DELIVERED', 'SHIPPED', 'PROCESSING', 'ORDER_PLACED'].includes(o.status)
        );
        const cancelledOrders = allOrders.filter(o => o.status === 'CANCELLED');
        const returnedOrders = allOrders.filter(o => o.status === 'RETURNED');
        const totalOrderCount = allOrders.length;
        
        const successfulOrderRate = totalOrderCount > 0 
            ? (successfulOrders.length / totalOrderCount) * 100 
            : 100;
        const cancellationRate = totalOrderCount > 0 
            ? (cancelledOrders.length / totalOrderCount) * 100 
            : 0;
        const refundRate = totalOrderCount > 0 
            ? (returnedOrders.length / totalOrderCount) * 100 
            : 0;

        const allRatings = store.Product.flatMap(p => p.rating || []);
        const avgRating = allRatings.length > 0
            ? allRatings.reduce((sum, r) => sum + r.rating, 0) / allRatings.length
            : 0;
        
        const accountAgeMonths = (now - new Date(store.createdAt)) / (1000 * 60 * 60 * 24 * 30);
        
        // Calculate trust score
        const orderReliabilityScore = Math.max(0, Math.min(100, 
            (successfulOrderRate * 0.7) + ((100 - cancellationRate) * 0.3)
        ));
        const refundScore = Math.max(0, Math.min(100, 100 - (refundRate * 0.8)));
        const ratingScore = Math.max(0, Math.min(100, (avgRating / 5) * 100 * 0.7));
        const stabilityScore = 85; // Simplified
        const inventoryScore = 90; // Simplified
        const experienceScore = Math.max(0, Math.min(100,
            Math.min(accountAgeMonths / 12, 1) * 50 + Math.min(totalOrderCount / 100, 1) * 50
        ));
        
        const trustScore = Math.round(
            (0.30 * orderReliabilityScore) +
            (0.20 * refundScore) +
            (0.20 * ratingScore) +
            (0.15 * stabilityScore) +
            (0.10 * inventoryScore) +
            (0.05 * experienceScore)
        );
        
        const trustLevel = trustScore >= 80 ? 'Elite' : 
                          trustScore >= 60 ? 'Reliable' : 
                          trustScore >= 40 ? 'Watch' : 'Risky';

        // Generate new analysis
        const isElite = trustScore >= 80;
        const isReliable = trustScore >= 60 && trustScore < 80;
        const isWatch = trustScore >= 40 && trustScore < 60;
        const isRisky = trustScore < 40;

        const hasOrders = totalOrderCount > 0;
        const hasProducts = store.Product.length > 0;
        const hasReviews = allRatings.length > 0;

        let vendorAnalysis;

        // Handle edge cases - ensure clean text without undefined
        if (!hasOrders && !hasProducts) {
            const summary = `${store.name} is a new store that has just started. No sales or product data is available yet. The store is in its initial phase and requires time to build a track record and establish reliability.`;
            vendorAnalysis = {
                summary: summary.replace(/undefined/gi, '').trim(),
                tone: 'neutral',
                highlights: []
            };
        } else if (!hasOrders && hasProducts) {
            const summary = `${store.name} has listed products but hasn't made any sales yet. The store is actively preparing for business and waiting for its first customers to establish operational credibility.`;
            vendorAnalysis = {
                summary: summary.replace(/undefined/gi, '').trim(),
                tone: 'neutral',
                highlights: []
            };
        } else if (accountAgeMonths < 1 && totalOrderCount < 5) {
            const summary = `${store.name} is a very new store with limited transaction history. Early indicators are promising, but more data is needed to assess long-term reliability and establish a complete trust profile.`;
            vendorAnalysis = {
                summary: summary.replace(/undefined/gi, '').trim(),
                tone: 'neutral',
                highlights: []
            };
        } else {
            // Build context for Gemini
            const orderReliabilityDesc = successfulOrderRate >= 95 ? 'excellent' : 
                                        successfulOrderRate >= 85 ? 'good' : 
                                        successfulOrderRate >= 70 ? 'moderate' : 'needs improvement';
            
            const refundDesc = refundRate <= 2 ? 'very low' : 
                              refundRate <= 5 ? 'low' : 
                              refundRate <= 10 ? 'moderate' : 'high';
            
            const ratingDesc = avgRating >= 4.5 ? 'excellent' : 
                              avgRating >= 4.0 ? 'good' : 
                              avgRating >= 3.0 ? 'moderate' : 'needs improvement';
            
            const revenueTrendDesc = 'stable';
            const accountMaturityDesc = accountAgeMonths >= 12 ? 'established' : 
                                       accountAgeMonths >= 6 ? 'growing' : 
                                       accountAgeMonths >= 1 ? 'new' : 'very new';

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

            const userPrompt = `Analyze this vendor's performance and provide a brief qualitative assessment:

Store: ${store.name} (${store.storeType})
Trust Level: ${trustLevel}

Overall Performance Indicators:
- Order fulfillment: ${orderReliabilityDesc}
- Refund behavior: ${refundDesc}
- Customer satisfaction: ${ratingDesc}
- Revenue stability: ${revenueTrendDesc}
- Account maturity: ${accountMaturityDesc}
- Trust assessment: ${trustLevel}

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
            
            let tone = 'neutral';
            if (isElite || isReliable) tone = 'positive';
            else if (isWatch || isRisky) tone = 'caution';

            const highlights = [];
            if (successfulOrderRate >= 95 && cancellationRate <= 5) {
                highlights.push('Excellent order fulfillment');
            }
            if (refundRate <= 2) {
                highlights.push('Low refund rate');
            }
            if (avgRating >= 4.5 && allRatings.length >= 10) {
                highlights.push('High customer satisfaction');
            }
            if (accountAgeMonths >= 12 && totalOrderCount >= 50) {
                highlights.push('Established vendor');
            }

            vendorAnalysis = {
                summary: cleanSummary,
                tone,
                highlights
            };
        }

        // Save to database
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

        return NextResponse.json({
            success: true,
            vendorAnalysis
        });
    } catch (error) {
        console.error('Regenerate Trust Analysis Error:', error);
        return NextResponse.json({ 
            error: error.message || 'Failed to regenerate trust analysis'
        }, { status: 500 });
    }
}
