/**
 * Check if an offer price (INR) is extremely suspicious for admin notice.
 * Used when vendors publish products and in the admin notices API.
 * @param {number | null | undefined} offerPrice - offer_price or legacy price
 * @param {number | null | undefined} actualPrice - actual_price or legacy mrp
 * @param {string} [category] - product category for baseline checks
 * @returns {boolean}
 */
export function isSuspiciousPrice(offerPrice, actualPrice = null, category = "general") {
    const p = offerPrice != null ? Number(offerPrice) : NaN;
    const mrp = actualPrice != null ? Number(actualPrice) : NaN;
    if (Number.isNaN(p)) return false;

    // Zero or negative prices are always suspicious
    if (p <= 0) return true;

    // Extremely high (placeholder / error), 50 lakh INR
    if (p > 5_000_000) return true;

    // Common placeholder numbers (₹99 and ₹999 excluded — legitimate Indian prices)
    const placeholders = [9999, 99999, 999999];
    if (placeholders.includes(p)) return true;

    // Category-aware minimum baselines
    const lowThresholds = {
        smartphones: 2000,
        laptops: 5000,
        televisions: 3000,
        furniture: 500,
        appliances: 500,
        // general electronics/fashion catches the rest
        general: 10
    };

    // Normalize category string
    const normalizedCat = (category || "general").toLowerCase();
    const minReasonablePrice = lowThresholds[normalizedCat] || lowThresholds.general;

    if (p < minReasonablePrice) return true;

    // Extreme discount check (> 90% off)
    if (!Number.isNaN(mrp) && mrp > 0) {
        // Only flag extreme discounts on items where the MRP itself is somewhat substantial
        // (A ₹10 item discounted to ₹1 is 90%, but maybe not a high-priority scam)
        if (mrp >= 500) {
            const discountPercent = ((mrp - p) / mrp) * 100;
            if (discountPercent > 90) return true;
        }
    }

    return false;
}
