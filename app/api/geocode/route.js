import { NextResponse } from "next/server";

// Server-side reverse geocode using OpenCage (keeps API key private)
export async function GET(request) {
    const key = process.env.OPENCAGE_API_KEY;
    if (!key) {
        return NextResponse.json(
            { error: "Geocoding not configured. Set OPENCAGE_API_KEY in .env" },
            { status: 503 }
        );
    }
    const { searchParams } = new URL(request.url);
    const lat = searchParams.get("lat");
    const lng = searchParams.get("lng");
    if (lat == null || lng == null || isNaN(Number(lat)) || isNaN(Number(lng))) {
        return NextResponse.json(
            { error: "Missing or invalid lat/lng" },
            { status: 400 }
        );
    }
    try {
        const q = `${encodeURIComponent(lat)}+${encodeURIComponent(lng)}`;
        const url = `https://api.opencagedata.com/geocode/v1/json?q=${q}&key=${key}&no_annotations=1`;
        const res = await fetch(url);
        const data = await res.json();
        if (data.status?.code !== 200) {
            return NextResponse.json(
                { error: data.status?.message || "Geocode failed" },
                { status: 502 }
            );
        }
        const result = data.results?.[0];
        if (!result) {
            return NextResponse.json({ components: {} });
        }
        const c = result.components || {};
        return NextResponse.json({
            formatted: result.formatted || "",
            components: {
                street:
                    c.road ||
                    c.street ||
                    c.street_name ||
                    c.footway ||
                    c.pedestrian ||
                    [c.suburb, c.village, c.town].filter(Boolean).join(", ") ||
                    "",
                city:
                    c.city ||
                    c.town ||
                    c.village ||
                    c.municipality ||
                    c.county ||
                    "",
                state: c.state || c.state_district || "",
                pincode: c.postcode || c.postal_code || "",
                country: c.country || "",
                countryCode: c.country_code?.toUpperCase() || "",
            },
        });
    } catch (err) {
        console.error("Geocode error:", err);
        return NextResponse.json(
            { error: err.message || "Geocode request failed" },
            { status: 502 }
        );
    }
}
