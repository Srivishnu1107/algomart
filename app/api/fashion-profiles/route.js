import prisma from "@/lib/prisma";
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const MAX_PROFILES = 3;

function toProfile(record) {
    return {
        id: record.id,
        name: record.name,
        height: record.height,
        weight: record.weight,
        bodyType: record.bodyType ?? "Regular",
        ageInterval: record.ageInterval ?? null,
        gender: record.gender ?? null,
    };
}

/** GET: list fashion profiles for the current user */
export async function GET(request) {
    try {
        const { userId } = await getAuth(request);
        if (!userId) {
            return NextResponse.json({ error: "Sign in to view profiles" }, { status: 401 });
        }
        const list = await prisma.fashionProfile.findMany({
            where: { userId },
            orderBy: { updatedAt: "desc" },
        });
        return NextResponse.json({ profiles: list.map(toProfile) });
    } catch (e) {
        console.error("[GET /api/fashion-profiles]", e);
        return NextResponse.json({ error: "Failed to load profiles" }, { status: 500 });
    }
}

/** POST: create a new fashion profile */
export async function POST(request) {
    try {
        const { userId } = await getAuth(request);
        if (!userId) {
            return NextResponse.json({ error: "Sign in to create a profile" }, { status: 401 });
        }
        const count = await prisma.fashionProfile.count({ where: { userId } });
        if (count >= MAX_PROFILES) {
            return NextResponse.json(
                { error: `Maximum ${MAX_PROFILES} profiles allowed` },
                { status: 400 }
            );
        }
        const body = await request.json();
        const name = (body?.name ?? "").trim();
        const height = Number(body?.height);
        const weight = Number(body?.weight);
        if (!name || Number.isNaN(height) || Number.isNaN(weight)) {
            return NextResponse.json(
                { error: "name, height, and weight are required" },
                { status: 400 }
            );
        }
        const created = await prisma.fashionProfile.create({
            data: {
                userId,
                name,
                height,
                weight,
                bodyType: (body?.bodyType ?? "Regular").trim() || "Regular",
                ageInterval: body?.ageInterval?.trim() || null,
                gender: body?.gender?.trim() || null,
            },
        });
        return NextResponse.json({ profile: toProfile(created) });
    } catch (e) {
        console.error("[POST /api/fashion-profiles]", e);
        return NextResponse.json({ error: "Failed to create profile" }, { status: 500 });
    }
}
