import prisma from '@/lib/prisma'
import { getAuth } from '@clerk/nextjs/server'
import authAdmin from '@/middlewares/authAdmin'
import { NextResponse } from 'next/server'
import {
  getParamCount,
  shouldShowSection,
  computeRecommendations,
} from '@/lib/behaviorRecommendations'

const ONE_DAY_MS = 24 * 60 * 60 * 1000

/**
 * GET /api/recommendations?visitorId=...&category=electronics|fashion
 * Returns: { showSection, paramCount, products[], category }
 * - showSection: true when at least 3–4 param types collected for this category
 * - products: only when showSection is true; refreshed at most once per day
 */
export async function GET(request) {
  try {
    const { userId } = getAuth(request)
    const isAdmin = await authAdmin(userId)
    const statusFilter = isAdmin ? {} : { status: 'active' }

    const { searchParams } = new URL(request.url)
    const visitorId = searchParams.get('visitorId')
    const category = searchParams.get('category') || 'electronics'

    if (!visitorId || !['electronics', 'fashion'].includes(category)) {
      return NextResponse.json(
        { error: 'visitorId and category (electronics|fashion) required' },
        { status: 400 }
      )
    }

    const { paramCount } = await getParamCount(prisma, visitorId, userId || null, category)
    const showSection = shouldShowSection(paramCount)

    let productIds = []
    if (showSection) {
      let cache = await prisma.userRecommendation.findUnique({
        where: {
          visitorId_category: { visitorId, category },
        },
      })
      // Cross-device fallback: try userId-based cache if visitorId cache misses
      if (!cache && userId) {
        cache = await prisma.userRecommendation.findFirst({
          where: { userId, category },
        })
      }
      const now = Date.now()
      const lastUpdated = cache?.lastUpdated ? new Date(cache.lastUpdated).getTime() : 0
      const needsRefresh = !cache || now - lastUpdated >= ONE_DAY_MS

      if (needsRefresh) {
        productIds = await computeRecommendations(prisma, visitorId, userId || null, category, 8)
        await prisma.userRecommendation.upsert({
          where: { visitorId_category: { visitorId, category } },
          create: {
            visitorId,
            userId: userId || null,
            category,
            productIds,
          },
          update: {
            userId: userId || null,
            productIds,
            lastUpdated: new Date(),
          },
        })
      } else {
        productIds = cache.productIds || []
      }
    }

    const products =
      productIds.length > 0
        ? await prisma.product.findMany({
          where: { id: { in: productIds }, inStock: true, ...statusFilter },
          include: {
            rating: { select: { createdAt: true, rating: true, review: true, user: { select: { name: true, image: true } } } },
            store: true,
          },
        })
        : []

    const byId = new Map(products.map((p) => [p.id, p]))
    const ordered = productIds.map((id) => byId.get(id)).filter(Boolean)

    return NextResponse.json({
      showSection,
      paramCount,
      category,
      products: ordered,
    })
  } catch (error) {
    console.error('[recommendations]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
