/**
 * Unified vendor risk scoring utility.
 *
 * Single source of truth used by both the admin notices API and the dashboard API.
 * Returns a score 0–100 plus human-readable reasons for every triggered signal.
 *
 * @param {object} vendor
 * @param {number}  vendor.refundRatePercent      - Value-based refund rate (refundValue / revenue * 100)
 * @param {number}  vendor.cancelRatePercent       - Count-based cancellation rate (cancelCount / totalOrders * 100)
 * @param {number}  vendor.avgRating               - Average product rating (0 = no ratings)
 * @param {number}  vendor.volatilityIndex         - Revenue volatility (stddev / mean * 100), 0 if insufficient data
 * @param {number}  vendor.refundCount90d          - Total refund count in last 90 days
 * @param {number}  vendor.totalOrders90d          - Total orders in last 90 days
 * @param {number}  vendor.returnToPurchasePercent - (returned + cancelled orders) / total orders * 100
 * @param {boolean} vendor.hasFastComplaint        - true if any report was filed within 2h of delivery
 * @param {number}  vendor.fastComplaintMinutes    - Minutes between delivery and fastest complaint (optional)
 * @param {boolean} vendor.isNewVendor             - true if store age < 14 days
 * @param {boolean} vendor.hasAnyRefund            - true if vendor has at least one refund
 *
 * @returns {{ riskScore: number, reasons: string[] }}
 */
export function computeVendorRiskScore(vendor) {
    const {
        refundRatePercent = 0,
        cancelRatePercent = 0,
        avgRating = 0,
        volatilityIndex = 0,
        refundCount90d = 0,
        totalOrders90d = 0,
        returnToPurchasePercent = 0,
        hasFastComplaint = false,
        fastComplaintMinutes = null,
        isNewVendor = false,
        hasAnyRefund = false,
    } = vendor;

    let score = 0;
    const reasons = [];

    // ── 1. Refund rate (value-based) ──
    if (refundRatePercent > 15) {
        score += 30;
        reasons.push(`refund rate ${refundRatePercent.toFixed(1)}%`);
    } else if (refundRatePercent > 8) {
        score += 18;
        reasons.push(`refund rate ${refundRatePercent.toFixed(1)}%`);
    } else if (refundRatePercent > 3) {
        score += 8;
        reasons.push(`refund rate ${refundRatePercent.toFixed(1)}%`);
    }

    // ── 2. Cancellation rate ──
    if (cancelRatePercent > 20) {
        score += 25;
        reasons.push(`cancel rate ${cancelRatePercent.toFixed(1)}%`);
    } else if (cancelRatePercent > 10) {
        score += 15;
        reasons.push(`cancel rate ${cancelRatePercent.toFixed(1)}%`);
    } else if (cancelRatePercent > 5) {
        score += 5;
        reasons.push(`cancel rate ${cancelRatePercent.toFixed(1)}%`);
    }

    // ── 3. Average rating ──
    if (avgRating > 0 && avgRating < 3) {
        score += 25;
        reasons.push(`rating ${avgRating.toFixed(1)}★`);
    } else if (avgRating > 0 && avgRating < 3.5) {
        score += 12;
        reasons.push(`rating ${avgRating.toFixed(1)}★`);
    } else if (avgRating > 0 && avgRating < 4) {
        score += 5;
        reasons.push(`rating ${avgRating.toFixed(1)}★`);
    }

    // ── 4. Revenue volatility ──
    if (volatilityIndex > 50) {
        score += 20;
        reasons.push(`high volatility (${volatilityIndex})`);
    } else if (volatilityIndex > 30) {
        score += 10;
        reasons.push(`moderate volatility (${volatilityIndex})`);
    }

    // ── 5. Refund frequency (90 days) ── [NEW]
    if (refundCount90d >= 5) {
        score += 15;
        reasons.push(`${refundCount90d} refunds in 90d`);
    } else if (refundCount90d >= 3) {
        score += 8;
        reasons.push(`${refundCount90d} refunds in 90d`);
    }

    // ── 6. Return-to-purchase ratio ── [NEW]
    if (totalOrders90d >= 5 && returnToPurchasePercent > 40) {
        score += 15;
        reasons.push(`${returnToPurchasePercent.toFixed(0)}% return rate`);
    } else if (totalOrders90d >= 5 && returnToPurchasePercent > 25) {
        score += 8;
        reasons.push(`${returnToPurchasePercent.toFixed(0)}% return rate`);
    }

    // ── 7. Fast complaint after delivery ── [NEW]
    if (hasFastComplaint) {
        score += 10;
        const mins = fastComplaintMinutes != null ? `${Math.round(fastComplaintMinutes)}min` : '<2h';
        reasons.push(`complaint ${mins} after delivery`);
    }

    // ── 8. New vendor with refunds (replaces old "low revenue" penalty) ── [FIXED]
    if (isNewVendor && hasAnyRefund) {
        score += 5;
        reasons.push('new vendor with refunds');
    }

    return {
        riskScore: Math.min(100, Math.round(score)),
        reasons,
    };
}
