import prisma from "@/lib/prisma"
import authAdmin from "@/middlewares/authAdmin"
import { getAuth } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"

function configKey(storeType) {
  if (storeType === "fashion") return "deals_of_the_day_fashion"
  return "deals_of_the_day_electronics"
}

const DEFAULT_CONFIG = {
  enabled: false,
  productIds: [],
  autoDiscount: false,
  autoDiscountLimit: 8,
  limit: 8,
  title: "Deals of the Day",
  subtitle: "Best discounts for a limited time",
  viewHref: "/deals",
  viewLabel: "View all deals",
  showCountdown: true,
  cardSize: "large",
  columns: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4",
}

/** GET: Admin only – return current deals config for a store type */
export async function GET(request) {
  try {
    const { userId } = getAuth(request)
    const isAdmin = await authAdmin(userId)
    if (!isAdmin) {
      return NextResponse.json({ error: "Not authorized" }, { status: 401 })
    }
    const { searchParams } = new URL(request.url)
    const storeType = searchParams.get("type") || "electronics"
    const key = configKey(storeType)

    const row = await prisma.assistantConfig.findUnique({ where: { key } })
    let config = { ...DEFAULT_CONFIG }
    if (row?.value) {
      try {
        config = { ...DEFAULT_CONFIG, ...JSON.parse(row.value) }
      } catch (_) {}
    }
    return NextResponse.json({ config })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: error?.message || "Failed to load config" }, { status: 500 })
  }
}

/** PUT: Admin only – save deals config for a store type */
export async function PUT(request) {
  try {
    const { userId } = getAuth(request)
    const isAdmin = await authAdmin(userId)
    if (!isAdmin) {
      return NextResponse.json({ error: "Not authorized" }, { status: 401 })
    }
    const body = await request.json()
    const storeType = body.storeType || "electronics"
    const key = configKey(storeType)

    const config = {
      enabled: !!body.enabled,
      productIds: Array.isArray(body.productIds) ? body.productIds.filter((id) => typeof id === "string") : [],
      autoDiscount: !!body.autoDiscount,
      autoDiscountLimit: Math.min(24, Math.max(1, Number(body.autoDiscountLimit) || 8)),
      limit: Math.min(24, Math.max(1, Number(body.limit) || 8)),
      title: String(body.title ?? DEFAULT_CONFIG.title).trim() || DEFAULT_CONFIG.title,
      subtitle: String(body.subtitle ?? DEFAULT_CONFIG.subtitle).trim(),
      viewHref: String(body.viewHref ?? DEFAULT_CONFIG.viewHref).trim() || "/deals",
      viewLabel: String(body.viewLabel ?? DEFAULT_CONFIG.viewLabel).trim(),
      showCountdown: !!body.showCountdown,
      cardSize: body.cardSize === "default" ? "default" : "large",
      columns: String(body.columns ?? DEFAULT_CONFIG.columns).trim() || DEFAULT_CONFIG.columns,
    }

    await prisma.assistantConfig.upsert({
      where: { key },
      create: { key, value: JSON.stringify(config) },
      update: { value: JSON.stringify(config) },
    })
    return NextResponse.json({ message: "Deals config saved.", config })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: error?.message || "Failed to save" }, { status: 500 })
  }
}
