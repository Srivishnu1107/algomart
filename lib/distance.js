/**
 * Geocode a place/address to lat,lng and compute distance to user.
 * Uses OpenCage forward geocoding. Caches by address within the same process (per-request cache passed in).
 */

const EARTH_RADIUS_KM = 6371;

function haversineKm(lat1, lon1, lat2, lon2) {
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return EARTH_RADIUS_KM * c;
}

/**
 * Forward geocode an address to { lat, lng }. Returns null if not found.
 * @param {string} address
 * @param {Map<string, { lat, lng }>} [cache] - optional cache keyed by address
 */
export async function geocodeAddress(address, cache = new Map()) {
    if (!address || typeof address !== "string") return null;
    const key = address.trim();
    if (cache.has(key)) return cache.get(key);

    const apiKey = process.env.OPENCAGE_API_KEY;
    if (!apiKey) return null;

    try {
        const q = encodeURIComponent(key);
        const url = `https://api.opencagedata.com/geocode/v1/json?q=${q}&key=${apiKey}&no_annotations=1&limit=1`;
        const res = await fetch(url);
        const data = await res.json();
        const result = data.results?.[0];
        if (!result?.geometry) {
            cache.set(key, null);
            return null;
        }
        const { lat, lng } = result.geometry;
        const coords = { lat, lng };
        cache.set(key, coords);
        return coords;
    } catch (err) {
        console.warn("Geocode error for address:", key, err.message);
        cache.set(key, null);
        return null;
    }
}

/**
 * Get distance in km from user (lat, lng) to a place (address string). Returns null if geocode fails.
 * @param {number} userLat
 * @param {number} userLng
 * @param {string} address
 * @param {Map<string, { lat, lng }>} [cache]
 */
export async function getDistanceKm(userLat, userLng, address, cache = new Map()) {
    const coords = await geocodeAddress(address, cache);
    if (!coords) return null;
    return haversineKm(userLat, userLng, coords.lat, coords.lng);
}
