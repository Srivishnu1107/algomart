import prisma from '@/lib/prisma'
import { getAuth } from '@clerk/nextjs/server'
import { NextResponse } from "next/server"

const VALID_CATEGORIES = ['electronics', 'fashion']
const VALID_EVENT_TYPES = [
  'product_view',
  'time_on_page',
  'add_to_cart',
  'purchase',
  'wishlist',
  'search',
  'click',
  'category_browse',
]

/**
 * POST /api/behavior/track
 * Body: { visitorId, category, eventType, productId?, payload? }
 * Collects user behavior for recommendations; data is separate per electronics/fashion.
 */
export async function POST(request) {
  try {
    const { userId } = getAuth(request)
    const body = await request.json().catch(() => ({}))
    const { visitorId, category, eventType, productId = null, payload = {} } = body

    if (!visitorId || typeof visitorId !== 'string' || visitorId.length > 128) {
      return NextResponse.json({ error: 'Valid visitorId required' }, { status: 400 })
    }
    if (!VALID_CATEGORIES.includes(category)) {
      return NextResponse.json({ error: 'category must be electronics or fashion' }, { status: 400 })
    }
    if (!VALID_EVENT_TYPES.includes(eventType)) {
      return NextResponse.json({ error: 'Invalid eventType' }, { status: 400 })
    }

    await prisma.userBehaviorEvent.create({
      data: {
        visitorId: visitorId.trim(),
        userId: userId || null,
        category,
        eventType,
        productId: productId && typeof productId === 'string' ? productId : null,
        payload: typeof payload === 'object' ? payload : {},
      },
    })

    // Background: retroactively merge visitorId events with userId for cross-device continuity
    if (userId) {
      prisma.userBehaviorEvent.updateMany({
        where: { visitorId: visitorId.trim(), userId: null },
        data: { userId },
      }).catch(() => { }) // fire-and-forget, never block the response
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[behavior/track]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
