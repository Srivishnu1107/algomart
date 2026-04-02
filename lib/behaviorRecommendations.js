/**
 * User behavior → recommendation logic.
 * Counts distinct parameter types per visitor/user per category.
 * Threshold: show section when >= MIN_PARAM_TYPES.
 * Recommendations refreshed at most once per day.
 */

const MIN_PARAM_TYPES = 3
const PARAM_EVENT_TYPES = [
  'product_view',
  'time_on_page',
  'add_to_cart',
  'purchase',
  'wishlist',
  'search',
  'click',
  'category_browse',
]

const EVENT_WEIGHTS = {
  purchase: 5,
  add_to_cart: 4,
  wishlist: 3.5,
  product_view: 2,
  time_on_page: 1.5,
  click: 1,
  search: 2,
  category_browse: 1.5,
}

/**
 * Count distinct event types present for this visitor (and optionally user) in this category.
 */
export async function getParamCount(prisma, visitorId, userId, category) {
  const or = [{ visitorId }]
  if (userId) or.push({ userId })
  const events = await prisma.userBehaviorEvent.findMany({
    where: { category, eventType: { in: PARAM_EVENT_TYPES }, OR: or },
    select: { eventType: true },
    distinct: ['eventType'],
  })
  const eventTypes = events.map((e) => e.eventType)
  return { paramCount: eventTypes.length, eventTypes }
}

/**
 * Check if we should show the AI Recommended section.
 */
export function shouldShowSection(paramCount) {
  return paramCount >= MIN_PARAM_TYPES
}

/**
 * Compute time-decay weight: recent events matter more.
 */
function timeDecay(createdAt, maxAgeMs = 30 * 24 * 3600 * 1000) {
  const ageMs = Date.now() - new Date(createdAt).getTime()
  if (ageMs >= maxAgeMs) return 0.1
  return 1 - (ageMs / maxAgeMs) * 0.9
}

/**
 * Compute recommended product IDs from behavior data.
 * Uses time-decayed scoring with category/brand/search matching and popularity fallback.
 */
export async function computeRecommendations(prisma, visitorId, userId, category, limit = 8) {
  const or = [{ visitorId }]
  if (userId) or.push({ userId })

  // Time-based window aligned with the 30-day time-decay function
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 3600 * 1000)

  const events = await prisma.userBehaviorEvent.findMany({
    where: { category, OR: or, createdAt: { gte: thirtyDaysAgo } },
    orderBy: { createdAt: 'desc' },
    take: 500,
  })

  const productTypeFilter = category === 'fashion' ? 'fashion' : 'electronics'
  const viewedIds = new Map()
  const cartOrWishlistIds = new Set()
  const purchasedIds = new Set()
  const searchTerms = []
  const categoryNames = new Map()
  const productInteractions = new Map()

  for (const e of events) {
    const decay = timeDecay(e.createdAt)
    const weight = (EVENT_WEIGHTS[e.eventType] || 1) * decay

    if (e.productId) {
      if (e.eventType === 'purchase') {
        purchasedIds.add(e.productId)
      } else if (e.eventType === 'add_to_cart' || e.eventType === 'wishlist') {
        cartOrWishlistIds.add(e.productId)
      }
      viewedIds.set(e.productId, (viewedIds.get(e.productId) || 0) + weight)
      productInteractions.set(e.productId, (productInteractions.get(e.productId) || 0) + weight)
    }
    if (e.eventType === 'search' && e.payload?.searchQuery) {
      searchTerms.push({ term: String(e.payload.searchQuery).toLowerCase().trim(), weight })
    }
    if (e.eventType === 'category_browse' && e.payload?.categoryName) {
      const cn = String(e.payload.categoryName)
      categoryNames.set(cn, (categoryNames.get(cn) || 0) + weight)
    }
  }

  const seedIds = [...cartOrWishlistIds, ...viewedIds.keys()].filter((id) => !purchasedIds.has(id))
  const excludeIds = new Set([...purchasedIds, ...seedIds])

  const productWhere = {
    inStock: true,
    status: 'active',
    is_draft: false,
    id: { notIn: [...excludeIds] },
    store: { isActive: true },
    OR: [
      { productType: productTypeFilter },
      { store: { storeType: productTypeFilter } },
    ],
  }

  const typed = await prisma.product.findMany({
    where: productWhere,
    include: {
      store: { select: { storeType: true } },
      rating: { select: { rating: true } },
    },
  })

  const seedProducts = await prisma.product.findMany({
    where: { id: { in: [...seedIds].slice(0, 30) } },
    include: { store: true },
  })

  const preferredCategories = new Map()
  const preferredBrands = new Map()
  for (const p of seedProducts) {
    const interaction = productInteractions.get(p.id) || 1
    if (p.category) preferredCategories.set(p.category, (preferredCategories.get(p.category) || 0) + interaction)
    if (p.brand) preferredBrands.set(p.brand, (preferredBrands.get(p.brand) || 0) + interaction)
  }

  const maxPopularity = Math.max(...typed.map((p) => p.rating?.length || 0), 1)

  const scored = typed.map((p) => {
    let score = 0

    if (p.category && preferredCategories.has(p.category)) {
      score += 4 * Math.min(preferredCategories.get(p.category), 5)
    }
    if (p.brand && preferredBrands.has(p.brand)) {
      score += 3 * Math.min(preferredBrands.get(p.brand), 4)
    }

    if (categoryNames.size > 0 && p.category) {
      const catWeight = categoryNames.get(p.category) || 0
      score += catWeight * 2
    }

    const nameLower = (p.name || '').toLowerCase()
    const descLower = (p.description || '').toLowerCase()
    for (const { term, weight } of searchTerms.slice(0, 10)) {
      if (term.length >= 2) {
        // Word-boundary-aware matching for better precision
        const wordRe = new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i')
        if (wordRe.test(nameLower)) score += 3 * weight
        else if (wordRe.test(descLower)) score += 1.5 * weight
      }
    }

    const ratingCount = p.rating?.length || 0
    const avgRating = ratingCount > 0
      ? p.rating.reduce((sum, r) => sum + r.rating, 0) / ratingCount
      : 0
    score += (ratingCount / maxPopularity) * 2
    score += (avgRating / 5) * 1.5

    return { id: p.id, score, category: p.category }
  })

  scored.sort((a, b) => b.score - a.score)

  const result = []
  const categoryCounts = {}
  const maxPerCategory = Math.ceil(limit / 2)

  for (const item of scored) {
    if (result.length >= limit) break
    const cat = item.category || 'other'
    categoryCounts[cat] = (categoryCounts[cat] || 0) + 1
    if (categoryCounts[cat] <= maxPerCategory) {
      result.push(item.id)
    }
  }

  if (result.length < limit) {
    for (const item of scored) {
      if (result.length >= limit) break
      if (!result.includes(item.id)) {
        result.push(item.id)
      }
    }
  }

  if (result.length < limit) {
    const now = Date.now()
    const popular = typed
      .filter((p) => !result.includes(p.id) && !excludeIds.has(p.id))
      .sort((a, b) => {
        const ratingDiff = (b.rating?.length || 0) - (a.rating?.length || 0)
        // Recency boost: newer products get a slight edge in the fallback
        const ageA = (now - new Date(a.createdAt).getTime()) / (30 * 86400000)
        const ageB = (now - new Date(b.createdAt).getTime()) / (30 * 86400000)
        const recencyBoost = Math.min(ageA, 1) - Math.min(ageB, 1) // lower age = newer = better
        return ratingDiff || recencyBoost
      })
      .slice(0, limit - result.length)
    for (const p of popular) {
      result.push(p.id)
    }
  }

  return result.slice(0, limit)
}
