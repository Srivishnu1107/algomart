/**
 * AI prompt templates for Vendor AI Insights. All outputs are structured JSON.
 */

const SYSTEM_JSON = "You are a data analyst. Respond ONLY with valid JSON. No markdown, no code fences, no explanation outside the JSON.";

/**
 * 1) AI Demand & Stock Prediction
 * Output: { demandTrends[], restockSuggestions[], overstockRisks[], summary }
 */
const WISHLIST_DISCLAIMER = "Wishlist count is a secondary signal only: use it to slightly improve accuracy of trends/suggestions. Do not let it alone drive conclusions; primary signals are orders, sales, and stock.";

export function buildDemandPredictionPrompt(context) {
    const { products, productSales, productUnits, ordersByMonth, productWishlistCount = {} } = context;
    const productList = products.map((p) => ({
        id: p.id,
        name: p.name,
        category: p.category,
        price: p.price,
        inStock: p.inStock,
        unitsSold: context.productUnits[p.id] || 0,
        revenue: context.productSales[p.id] || 0,
        wishlistCount: productWishlistCount[p.id] || 0,
        createdAt: p.createdAt,
    }));

    return `Analyze this vendor's historical store data and predict demand and stock needs.

Historical data:
- Orders by month (count, revenue): ${JSON.stringify(ordersByMonth)}
- Products with sales/stock/wishlistCount: ${JSON.stringify(productList)}

Important: ${WISHLIST_DISCLAIMER}

Return a single JSON object with exactly these keys (all arrays; use [] if none):
- demandTrends: array of { productId, productName, trend: "rising"|"stable"|"declining", expectedDemandPerMonth: number, confidence: "low"|"medium"|"high" }
- restockSuggestions: array of { productId, productName, suggestedQuantity: number, reason: string }
- overstockRisks: array of { productId, productName, riskLevel: "low"|"medium"|"high", reason: string }
- summary: string (2-3 sentences)

Base suggestions on order history and trends. No free text outside the JSON.`;
}

/**
 * 2) AI Sales Insight & Reason Analyzer
 * Output: { summary, top_reasons[], actionable_suggestions[] }
 */
export function buildSalesInsightPrompt(context) {
    const { orders, products, productSales, productUnits, ordersByMonth, ratings, productRatingAvg, productWishlistCount = {} } = context;
    const totalRevenue = orders.reduce((a, o) => a + o.total, 0);
    const productPerf = products.map((p) => ({
        id: p.id,
        name: p.name,
        price: p.price,
        mrp: p.mrp,
        inStock: p.inStock,
        unitsSold: productUnits[p.id] || 0,
        revenue: productSales[p.id] || 0,
        avgRating: productRatingAvg[p.id]?.avg,
        reviewCount: productRatingAvg[p.id]?.count || 0,
        wishlistCount: productWishlistCount[p.id] || 0,
    }));

    return `Explain WHY this store's sales increased or dropped based on data. Consider price, reviews, stock levels, delivery (order status), and conversions.

Data:
- Total orders: ${orders.length}, Total revenue: ${totalRevenue}
- Orders by month: ${JSON.stringify(ordersByMonth)}
- Product performance (price, stock, units sold, revenue, avg rating, review count, wishlistCount): ${JSON.stringify(productPerf)}
- Sample reviews (rating, product): ${JSON.stringify(ratings.slice(0, 30).map((r) => ({ rating: r.rating, product: r.product?.name, review: r.review?.slice(0, 80) })))}

Important: ${WISHLIST_DISCLAIMER}

Return a single JSON object with exactly:
- summary: string (2-4 sentences on why sales went up or down)
- top_reasons: array of { reason: string, impact: "positive"|"negative"|"neutral", evidence: string }
- actionable_suggestions: array of { suggestion: string, priority: "high"|"medium"|"low" }

No other keys. No text outside the JSON.`;
}

/**
 * 3) AI Return & Complaint Predictor
 * Output: { products: [{ productId, productName, risk: "low"|"medium"|"high", likelyCauses: string[] }], summary }
 */
export function buildReturnPredictorPrompt(context) {
    const { products, ratings, cancelledOrders, productSales, productUnits, productRatingAvg, productWishlistCount = {} } = context;
    const productList = products.map((p) => ({
        id: p.id,
        name: p.name,
        price: p.price,
        descriptionLength: (p.description || "").length,
        inStock: p.inStock,
        unitsSold: productUnits[p.id] || 0,
        revenue: productSales[p.id] || 0,
        avgRating: productRatingAvg[p.id]?.avg,
        reviewCount: productRatingAvg[p.id]?.count || 0,
        wishlistCount: productWishlistCount[p.id] || 0,
    }));
    const lowRatings = ratings.filter((r) => r.rating <= 2).map((r) => ({ productId: r.productId, product: r.product?.name, rating: r.rating, review: r.review?.slice(0, 100) }));
    const cancelledReasons = cancelledOrders.map((o) => o.cancellationReason).filter(Boolean);

    return `Predict return/complaint likelihood per product. Use signals: price vs description, review quality, low ratings, cancellation reasons.

Data:
- Products (wishlistCount is secondary only): ${JSON.stringify(productList)}
- Low ratings (<=2) and review snippet: ${JSON.stringify(lowRatings)}
- Cancellation reasons (when provided): ${JSON.stringify(cancelledReasons)}

Important: ${WISHLIST_DISCLAIMER}

Return a single JSON object with:
- products: array of { productId, productName, risk: "low"|"medium"|"high", likelyCauses: string[] }
  (likelyCauses: e.g. "price mismatch", "description issues", "quality signals from reviews")
- summary: string (brief overall risk summary)

Include every product. No text outside the JSON.`;
}

/**
 * 4) AI Competitor Intelligence
 * Output: graph-friendly JSON for line/bar/comparison charts.
 * Shape: { summary, series: [{ name, data: [{ x, y }] }], comparisons: [{ metric, vendor, competitor, vendorValue, competitorValue }] }
 * Competitor data is passed in; if missing, use placeholder or "unknown".
 */
export function buildCompetitorInsightPrompt(context, competitorData = null) {
    const { products, productSales, productUnits, productRatingAvg, orders, productWishlistCount = {} } = context;
    const vendorProducts = products.map((p) => ({
        id: p.id,
        name: p.name,
        category: p.category,
        price: p.price,
        inStock: p.inStock,
        unitsSold: productUnits[p.id] || 0,
        avgRating: productRatingAvg[p.id]?.avg ?? null,
        reviewCount: productRatingAvg[p.id]?.count ?? 0,
        wishlistCount: productWishlistCount[p.id] || 0,
    }));

    const compData = competitorData && Array.isArray(competitorData) ? competitorData : [];
    const dataBlob = {
        vendorProducts,
        totalVendorOrders: orders.length,
        competitorProducts: compData,
    };

    return `Compare this vendor's products against competitor data. Produce graph-friendly JSON for line, bar, and comparison charts.

Data:
${JSON.stringify(dataBlob)}

Competitor products array may be empty; if so, still return valid structure and set summary to "No competitor data provided. Add competitor prices/ratings for comparison."

Important: wishlistCount in vendorProducts is a secondary signal only; use it to refine comparisons, not to drive conclusions alone.

Return a single JSON object with:
- summary: string
- series: array of { name: string, data: array of { x: string (e.g. month or product name), y: number } } (for line/bar charts)
- comparisons: array of { metric: string, vendorValue: number|string, competitorValue: number|string, label: string } (for comparison charts)
- productComparison: array of { productName, category, vendorPrice, competitorPrice, vendorRating, competitorRating } (when competitor data exists)

Use metric names like "Avg price", "Avg rating", "Delivery", "Availability". No text outside the JSON.`;
}

export { SYSTEM_JSON };
