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

/** PATCH: update a fashion profile */
export async function PATCH(request, { params }) {
    try {
        const { userId } = await getAuth(request);
        if (!userId) {
            return NextResponse.json({ error: "Sign in to update a profile" }, { status: 401 });
        }
        const { id } = await params;
        const existing = await prisma.fashionProfile.findFirst({
            where: { id, userId },
        });
        if (!existing) {
            return NextResponse.json({ error: "Profile not found" }, { status: 404 });
        }
        const body = await request.json();
        const data = {};
        if (body?.name !== undefined) data.name = String(body.name).trim();
        if (body?.height !== undefined) data.height = Number(body.height);
        if (body?.weight !== undefined) data.weight = Number(body.weight);
        if (body?.bodyType !== undefined) data.bodyType = (body.bodyType ?? "Regular").trim() || "Regular";
        if (body?.ageInterval !== undefined) data.ageInterval = body.ageInterval?.trim() || null;
        if (body?.gender !== undefined) data.gender = body.gender?.trim() || null;
        const updated = await prisma.fashionProfile.update({
            where: { id },
            data,
        });
        return NextResponse.json({ profile: toProfile(updated) });
    } catch (e) {
        console.error("[PATCH /api/fashion-profiles/:id]", e);
        return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
    }
}

/** DELETE: remove a fashion profile */
export async function DELETE(request, { params }) {
    try {
        const { userId } = await getAuth(request);
        if (!userId) {
            return NextResponse.json({ error: "Sign in to delete a profile" }, { status: 401 });
        }
        const { id } = await params;
        const existing = await prisma.fashionProfile.findFirst({
            where: { id, userId },
        });
        if (!existing) {
            return NextResponse.json({ error: "Profile not found" }, { status: 404 });
        }
        await prisma.fashionProfile.delete({ where: { id } });
        return NextResponse.json({ ok: true });
    } catch (e) {
        console.error("[DELETE /api/fashion-profiles/:id]", e);
        return NextResponse.json({ error: "Failed to delete profile" }, { status: 500 });
    }
}
