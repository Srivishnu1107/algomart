import prisma from "@/lib/prisma";
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const ALLOWED_REASON_TYPES = [
    "inappropriate",
    "fake",
    "wrong_info",
    "copyright",
    "spam",
    "other",
];

export async function POST(request) {
    try {
        const { userId } = getAuth(request);
        if (!userId) {
            return NextResponse.json({ error: "Sign in to report" }, { status: 401 });
        }

        const body = await request.json();
        const { productId, reasonType, customReason } = body;

        if (!productId || typeof productId !== "string") {
            return NextResponse.json({ error: "Product is required" }, { status: 400 });
        }

        if (!reasonType || !ALLOWED_REASON_TYPES.includes(reasonType)) {
            return NextResponse.json({ error: "Invalid reason" }, { status: 400 });
        }

        const product = await prisma.product.findUnique({
            where: { id: productId },
            select: { id: true },
        });
        if (!product) {
            return NextResponse.json({ error: "Product not found" }, { status: 404 });
        }

        await prisma.report.create({
            data: {
                reporterId: userId,
                productId,
                reasonType,
                customReason:
                    reasonType === "other" && typeof customReason === "string"
                        ? customReason.trim().slice(0, 2000)
                        : null,
            },
        });

        return NextResponse.json({ message: "Report submitted" });
    } catch (error) {
        console.error("Report submit error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to submit report" },
            { status: 500 }
        );
    }
}
