/**
 * Client-side behavior tracking for AI recommendations.
 * Tracks: product_view, time_on_page, add_to_cart, purchase, wishlist, search, click, category_browse.
 * Data is sent per category (electronics | fashion). Uses visitorId from localStorage; auth optional.
 */

const VISITOR_ID_KEY = 'gocart_visitor_id'

function getVisitorId() {
  if (typeof window === 'undefined') return null
  let id = localStorage.getItem(VISITOR_ID_KEY)
  if (!id) {
    id = 'v_' + Math.random().toString(36).slice(2) + '_' + Date.now().toString(36)
    localStorage.setItem(VISITOR_ID_KEY, id)
  }
  return id
}

/**
 * Send one behavior event to the API. Fire-and-forget.
 * @param {object} opts
 * @param {string} opts.eventType - product_view | time_on_page | add_to_cart | purchase | wishlist | search | click | category_browse
 * @param {string} opts.category - 'electronics' | 'fashion'
 * @param {string} [opts.productId]
 * @param {object} [opts.payload] - e.g. { timeSpentSeconds, searchQuery, categoryName }
 */
export function trackBehavior({ eventType, category, productId = null, payload = {} }) {
  const visitorId = getVisitorId()
  if (!visitorId || !category || !eventType) return
  if (category !== 'electronics' && category !== 'fashion') return

  fetch('/api/behavior/track', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      visitorId,
      category,
      eventType,
      productId: productId || undefined,
      payload,
    }),
  }).catch(() => {})
}

export { getVisitorId }
