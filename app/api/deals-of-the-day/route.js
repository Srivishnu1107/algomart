import prisma from "@/lib/prisma"
import { NextResponse } from "next/server"
import { getAuth } from "@clerk/nextjs/server"
import authAdmin from "@/middlewares/authAdmin"

const FASHION_CATEGORIES = new Set([
  "Men", "Women", "Footwear", "Accessories", "Streetwear", "Luxury",
])

function configKey(storeType) {
  if (storeType === "fashion") return "deals_of_the_day_fashion"
  return "deals_of_the_day_electronics"
}

/** GET: Public – return deals-of-the-day config and products for home page */
export async function GET(request) {
  try {
    const { userId } = getAuth(request)
    const isAdmin = await authAdmin(userId)
    const statusFilter = isAdmin ? {} : { status: "active" }

    const { searchParams } = new URL(request.url)
    const storeType = searchParams.get("type") || "electronics"
    const key = configKey(storeType)

    const row = await prisma.assistantConfig.findUnique({ where: { key } })

    let config = null
    let parsed = null
    if (row?.value) {
      try {
        parsed = JSON.parse(row.value)
        if (parsed.enabled) {
          config = {
            title: parsed.title ?? "Deals of the Day",
            subtitle: parsed.subtitle ?? "Best discounts for a limited time",
            viewHref: parsed.viewHref ?? "/deals",
            viewLabel: parsed.viewLabel ?? "View all deals",
            showCountdown: !!parsed.showCountdown,
            cardSize: parsed.cardSize === "default" ? "default" : "large",
            columns: parsed.columns ?? "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4",
          }
        }
      } catch (_) { }
    }

    if (!config || !parsed) {
      return NextResponse.json({ config: null, products: [] })
    }

    const limit = Math.min(24, Math.max(1, Number(parsed.limit) || 8))

    let products = []

    const hasManualIds = Array.isArray(parsed.productIds) && parsed.productIds.length > 0

    if (parsed.autoDiscount) {
      const storeTypeFilter = storeType === "fashion"
        ? { store: { isActive: true, storeType: "fashion" } }
        : { store: { isActive: true, storeType: { not: "fashion" } } }

      const autoProducts = await prisma.product.findMany({
        where: {
          inStock: true,
          is_draft: false,
          ...statusFilter,
          actual_price: { gt: 0 },
          ...storeTypeFilter,
        },
        include: {
          rating: {
            select: { createdAt: true, rating: true, review: true, user: { select: { name: true, image: true } } },
          },
          store: true,
        },
        take: 100,
      })

      const withDiscount = autoProducts
        .filter((p) => {
          const mrp = p.actual_price || p.mrp || 0
          const price = p.offer_price ?? p.price ?? mrp
          return mrp > price
        })
        .map((p) => {
          const mrp = p.actual_price || p.mrp || 0
          const price = p.offer_price ?? p.price ?? mrp
          return { ...p, _discount: ((mrp - price) / mrp) * 100 }
        })
        .sort((a, b) => b._discount - a._discount)

      products = withDiscount.slice(0, parsed.autoDiscountLimit || limit)
    }

    if (hasManualIds) {
      const ids = parsed.productIds.slice(0, 24)
      const manualProducts = await prisma.product.findMany({
        where: {
          id: { in: ids },
          inStock: true,
          is_draft: false,
          ...statusFilter,
          store: { isActive: true },
        },
        include: {
          rating: {
            select: { createdAt: true, rating: true, review: true, user: { select: { name: true, image: true } } },
          },
          store: true,
        },
      })

      const orderMap = Object.fromEntries(ids.map((id, i) => [id, i]))
      const sorted = manualProducts.sort((a, b) => (orderMap[a.id] ?? 999) - (orderMap[b.id] ?? 999))

      const existingIds = new Set(products.map((p) => p.id))
      for (const p of sorted) {
        if (!existingIds.has(p.id)) {
          products.push(p)
        }
      }
    }

    const final = products
      .slice(0, limit)
      .map((p) => ({
        ...p,
        _discount: undefined,
        price: p.offer_price ?? p.price ?? 0,
        mrp: p.actual_price ?? p.mrp ?? p.offer_price ?? p.price ?? 0,
      }))

    return NextResponse.json({ config, products: final })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ config: null, products: [] }, { status: 200 })
  }
}
