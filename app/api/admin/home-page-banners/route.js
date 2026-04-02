import prisma from "@/lib/prisma"
import authAdmin from "@/middlewares/authAdmin"
import { getAuth } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"

const CONFIG_KEY = "home_page_banner_ids"

/** GET: Admin only – list current home page banners (IDs from config + full details) */
export async function GET(request) {
  try {
    const { userId } = getAuth(request)
    const isAdmin = await authAdmin(userId)
    if (!isAdmin) {
      return NextResponse.json({ error: "Not authorized" }, { status: 401 })
    }

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
      return NextResponse.json({ bannerIds: [], banners: [] })
    }

    const banners = await prisma.vendorHomeBanner.findMany({
      where: { id: { in: ids } },
      include: {
        store: { select: { name: true, username: true, storeType: true } },
      },
    })
    const orderMap = Object.fromEntries(ids.map((id, i) => [id, i]))
    const sorted = banners.slice().sort((a, b) => (orderMap[a.id] ?? 999) - (orderMap[b.id] ?? 999))

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

    return NextResponse.json({ bannerIds: ids, banners: list })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: error?.message || "Failed to load" }, { status: 500 })
  }
}

/** PUT: Admin only – set home page banner IDs (order = display order) */
export async function PUT(request) {
  try {
    const { userId } = getAuth(request)
    const isAdmin = await authAdmin(userId)
    if (!isAdmin) {
      return NextResponse.json({ error: "Not authorized" }, { status: 401 })
    }

    const body = await request.json()
    const bannerIds = Array.isArray(body?.bannerIds) ? body.bannerIds.filter((id) => typeof id === "string") : []

    await prisma.assistantConfig.upsert({
      where: { key: CONFIG_KEY },
      create: { key: CONFIG_KEY, value: JSON.stringify(bannerIds) },
      update: { value: JSON.stringify(bannerIds) },
    })

    return NextResponse.json({ message: "Home page banners updated.", bannerIds })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: error?.message || "Failed to save" }, { status: 500 })
  }
}
