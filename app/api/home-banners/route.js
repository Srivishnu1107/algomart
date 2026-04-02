import prisma from "@/lib/prisma"
import { NextResponse } from "next/server"

const CONFIG_KEY = "home_page_banner_ids"

/** GET: List home page banners (only admin-selected IDs from config). Query ?type=electronics|fashion to show only that store type. */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get("type")?.toLowerCase()
    const storeType = type === "fashion" ? "fashion" : "electronics"

    const row = await prisma.assistantConfig.findUnique({
      where: { key: CONFIG_KEY },
    })
    let ids = []
    if (row?.value) {
      try {
        ids = JSON.parse(row.value)
        if (!Array.isArray(ids)) ids = []
      } catch (_) {}
    }

    if (ids.length === 0) {
      return NextResponse.json({ banners: [] })
    }

    const banners = await prisma.vendorHomeBanner.findMany({
      where: {
        id: { in: ids },
        store: { storeType },
      },
      include: {
        store: {
          select: {
            id: true,
            name: true,
            username: true,
            storeType: true,
          },
        },
      },
    })

    const orderMap = Object.fromEntries(ids.map((id, i) => [id, i]))
    const sorted = banners
      .slice()
      .sort((a, b) => (orderMap[a.id] ?? 999) - (orderMap[b.id] ?? 999))

    const list = sorted.map((b) => ({
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
    return NextResponse.json({ error: error?.message || "Failed to fetch banners" }, { status: 400 })
  }
}
