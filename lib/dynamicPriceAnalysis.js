/**
 * Analyzes a product's price for suspicious behavior using context, market averages, and vendor trust.
 * @param {Object} product - Product details { offer_price, actual_price, name, category }
 * @param {Object} categoryAverages - Market averages indexed by category { [categoryName]: averagePrice }
 * @param {Object} vendorTrust - Trust metrics { isTrusted: boolean, deliveredCount: number }
 * @returns {Object} { isSuspicious: boolean, reason: string | null }
 */
export function analyzePricingSuspicion(product, categoryAverages, vendorTrust = { isTrusted: false }) {
    const offerPrice = product.offer_price != null ? Number(product.offer_price) : NaN;
    const actualPrice = product.actual_price != null ? Number(product.actual_price) : NaN;
    const category = (product.category || "general").toLowerCase();
    const name = (product.name || "").toLowerCase();

    if (Number.isNaN(offerPrice)) return { isSuspicious: false, reason: null };

    // 1. Extreme Hardcoded Boundaries (Always suspicious regardless of trust)
    if (offerPrice <= 0) {
        return { isSuspicious: true, reason: `Suspicious Price: ₹${offerPrice} is zero or negative.` };
    }
    if (offerPrice > 5_000_000) {
        return { isSuspicious: true, reason: `Suspicious Price: ₹${offerPrice} exceeds maximum reasonable limit.` };
    }
    const scamPlaceholders = [9999, 99999, 999999];
    if (scamPlaceholders.includes(offerPrice)) {
        return { isSuspicious: true, reason: `Suspicious Price: ₹${offerPrice} looks like a placeholder.` };
    }

    // 2. Premium Keyword Spoofing (Only strict if not heavily trusted)
    const premiumKeywords = ["iphone", "samsung", "macbook", "ipad", "sony", "rolex", "gold", "diamond", "ps5", "playstation"];
    const hasPremiumKeyword = premiumKeywords.some(kw => name.includes(kw));

    // Allow highly trusted vendors more leeway, but still catch obvious fakes
    const keywordBaseline = vendorTrust.isTrusted ? 1000 : 2000;

    if (hasPremiumKeyword && offerPrice < keywordBaseline) {
        return {
            isSuspicious: true,
            reason: `Premium keyword detected but price is suspiciously low (₹${offerPrice}).`
        };
    }

    // 3. Dynamic Market Average Deviation
    const marketAverage = categoryAverages[category];
    if (marketAverage && marketAverage > 0) {
        // If they are > 85% below market average
        const deviationPercent = ((marketAverage - offerPrice) / marketAverage) * 100;

        // Trusted vendors can run 80% off flash sales. New vendors cannot.
        const maxAllowedDeviation = vendorTrust.isTrusted ? 90 : 80;

        if (deviationPercent > maxAllowedDeviation) {
            // Only alert if the absolute difference is also meaningful (don't alert on a ₹50 item sold for ₹5)
            if (marketAverage > 500) {
                return {
                    isSuspicious: true,
                    reason: `Price is ${Math.round(deviationPercent)}% below the market average for '${category}'.`
                };
            }
        }
    } else {
        // Fallback rigid check if no market average exists yet
        const strictThresholds = { smartphones: 2000, laptops: 5000, televisions: 3000, furniture: 500, appliances: 500, general: 10 };
        const minPrice = strictThresholds[category] || strictThresholds.general;
        if (offerPrice < minPrice) {
            return { isSuspicious: true, reason: `Price (₹${offerPrice}) is below the strict minimum for '${category}'.` };
        }
    }

    // 4. Anchor Pricing / Mega Discount Scam (MRP vs Offer Price)
    if (!Number.isNaN(actualPrice) && actualPrice > 0) {
        const discountPercent = ((actualPrice - offerPrice) / actualPrice) * 100;
        // Scam: List MRP as 50k, sell for 500
        if (actualPrice >= 5000 && discountPercent > 95) {
            return {
                isSuspicious: true,
                reason: `Unrealistic discount detected (${Math.round(discountPercent)}% off MRP of ₹${actualPrice}).`
            };
        }
        if (actualPrice >= 500 && discountPercent > 98) {
            return {
                isSuspicious: true,
                reason: `Unrealistic discount detected (${Math.round(discountPercent)}% off MRP of ₹${actualPrice}).`
            };
        }
    }

    return { isSuspicious: false, reason: null };
}
