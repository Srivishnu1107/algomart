import prisma from "@/lib/prisma"
import authAdmin from "@/middlewares/authAdmin"
import { getAuth } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"

/** GET: Admin only – search vendor banners by name. No q = list recent (e.g. 25). */
export async function GET(request) {
  try {
    const { userId } = getAuth(request)
    const isAdmin = await authAdmin(userId)
    if (!isAdmin) {
      return NextResponse.json({ error: "Not authorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const q = searchParams.get("q")?.trim() || ""

    const where = q
      ? { name: { contains: q, mode: "insensitive" } }
      : {}

    const banners = await prisma.vendorHomeBanner.findMany({
      where,
      include: {
        store: { select: { name: true, username: true, storeType: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: q ? 50 : 25,
    })

    const list = banners.map((b) => ({
      id: b.id,
      name: b.name ?? "Banner",
      imageUrl: b.imageUrl,
      bannerLink: b.bannerLink ?? null,
      buttons: Array.isArray(b.buttons) ? b.buttons : [],
      storeName: b.store.name,
      storeUsername: b.store.username,
      storeType: b.store.storeType,
    }))

    return NextResponse.json({ banners: list })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: error?.message || "Failed to search" }, { status: 500 })
  }
}
