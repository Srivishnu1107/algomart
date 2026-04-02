/**
 * Centralized product filtering for the electronics homepage.
 * Excludes fashion categories and uses productType/storeType when available.
 */

const FASHION_CATEGORIES = new Set([
  'Men',
  'Women',
  'Footwear',
  'Accessories',
  'Streetwear',
  'Luxury',
])

function normalizeText(value) {
  if (!value) return ''
  return value.toString().toLowerCase().trim()
}

function getProductRating(product) {
  const ratingCount = product.rating?.length || 0
  if (ratingCount === 0) return 0
  return product.rating.reduce((acc, curr) => acc + curr.rating, 0) / ratingCount
}

function getProductBaseKey(product) {
  const brand = normalizeText(product.brand)
  const category = normalizeText(product.category)
  const rawName = normalizeText(product.name)

  if (!rawName) return [brand, category, product.id].filter(Boolean).join('|')

  const STOP_WORDS = new Set(['with', 'and', 'for', 'of', 'by', 'the', 'a', 'an', 'new', 'latest', 'edition', 'series', 'model'])
  const tokens = rawName
    .replace(/\(.*?\)/g, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .filter((token) => !STOP_WORDS.has(token))
    .slice(0, 6)

  const coreName = tokens.join(' ') || rawName
  return [brand, category, coreName].filter(Boolean).join('|')
}

function scoreProductForListing(product) {
  const ratingCount = product.rating?.length || 0
  const avgRating = getProductRating(product)

  const trustTone = product.store?.trustAnalysis?.tone
  let trustBoost = 0
  if (trustTone === 'positive') trustBoost = 0.5
  else if (trustTone === 'caution') trustBoost = -0.3

  let stockBoost = 0
  if (typeof product.stock_quantity === 'number') {
    stockBoost = product.stock_quantity > 0 ? 0.5 : -2
  } else if (product.inStock === false) {
    stockBoost = -2
  }

  const ratingScore = avgRating * 2
  const volumeScore = Math.min(ratingCount / 20, 3)

  return ratingScore + volumeScore + trustBoost + stockBoost
}

function dedupeProductsForListing(products) {
  if (!Array.isArray(products)) return []
  const bestByKey = new Map()

  for (const product of products) {
    const key = getProductBaseKey(product)
    const existing = bestByKey.get(key)
    if (!existing) {
      bestByKey.set(key, product)
      continue
    }

    const existingScore = scoreProductForListing(existing)
    const newScore = scoreProductForListing(product)
    if (newScore > existingScore) {
      bestByKey.set(key, product)
    }
  }

  return Array.from(bestByKey.values())
}

/**
 * @param {Array} products - state.product.list
 * @returns {Array} electronics products only
 */
export function getElectronicsProducts(products) {
  if (!Array.isArray(products)) return []
  const filtered = products.filter((product) => {
    const resolvedType = product.productType || product.store?.storeType
    if (resolvedType && resolvedType !== 'electronics') return false
    if (!resolvedType && FASHION_CATEGORIES.has(product.category)) return false

    if (product.inStock === false) return false
    if (typeof product.stock_quantity === 'number' && product.stock_quantity <= 0) return false

    return true
  })

  return dedupeProductsForListing(filtered)
}

/**
 * Flash sale: discount-sorted (best % off first), fallback to first N electronics.
 * @param {Array} products - state.product.list
 * @param {number} limit
 * @returns {Array}
 */
export function getFlashSaleProducts(products, limit = 8) {
  const electronics = getElectronicsProducts(products)
  const withDiscount = electronics.filter((p) => p.mrp && p.mrp > p.price)
  const sorted = withDiscount
    .slice()
    .sort((a, b) => (b.mrp - b.price) / b.mrp - (a.mrp - a.price) / a.mrp)
    .slice(0, limit)
  return sorted.length ? sorted : electronics.slice(0, limit)
}

/**
 * Best sellers: by rating count (most reviews first).
 * @param {Array} products - state.product.list
 * @param {number} limit
 * @returns {Array}
 */
export function getBestSellers(products, limit = 8) {
  const electronics = getElectronicsProducts(products)
  return electronics
    .slice()
    .sort((a, b) => (b.rating?.length || 0) - (a.rating?.length || 0))
    .slice(0, limit)
}

/**
 * Latest arrivals: most recently published (createdAt descending).
 * @param {Array} products - state.product.list
 * @param {number} limit
 * @returns {Array}
 */
export function getLatestProducts(products, limit = 8) {
  const electronics = getElectronicsProducts(products)
  return electronics
    .slice()
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
    .slice(0, limit)
}

/**
 * Picked for you / AI recommended: by rating count (same as best sellers, can be varied later).
 * @param {Array} products - state.product.list
 * @param {number} limit
 * @returns {Array}
 */
export function getPickedForYou(products, limit = 8) {
  return getBestSellers(products, limit)
}

/**
 * Trending: newest first, then by rating count as tiebreaker.
 * @param {Array} products - state.product.list
 * @param {number} limit
 * @returns {Array}
 */
export function getTrendingProducts(products, limit = 8) {
  const electronics = getElectronicsProducts(products)
  return electronics
    .slice()
    .sort((a, b) => {
      const dateA = new Date(a.createdAt || 0)
      const dateB = new Date(b.createdAt || 0)
      if (dateB - dateA !== 0) return dateB - dateA
      return (b.rating?.length || 0) - (a.rating?.length || 0)
    })
    .slice(0, limit)
}
