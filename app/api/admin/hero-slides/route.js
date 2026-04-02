import imagekit from "@/configs/imageKit"
import prisma from "@/lib/prisma"
import authAdmin from "@/middlewares/authAdmin"
import { getAuth } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"

const CONFIG_KEY = "hero_slides"

/** GET: Admin – list hero slides */
export async function GET(request) {
  try {
    const { userId } = getAuth(request)
    const isAdmin = await authAdmin(userId)
    if (!isAdmin) return NextResponse.json({ error: "Not authorized" }, { status: 401 })

    const row = await prisma.assistantConfig.findUnique({ where: { key: CONFIG_KEY } })
    let slides = []
    if (row?.value) {
      try {
        slides = JSON.parse(row.value)
        if (!Array.isArray(slides)) slides = []
      } catch (_) {}
    }
    return NextResponse.json({ slides })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: error?.message }, { status: 500 })
  }
}

/** PUT: Admin – set full hero slides array */
export async function PUT(request) {
  try {
    const { userId } = getAuth(request)
    const isAdmin = await authAdmin(userId)
    if (!isAdmin) return NextResponse.json({ error: "Not authorized" }, { status: 401 })

    const body = await request.json()
    const slides = Array.isArray(body?.slides) ? body.slides : []
    const normalized = slides.map((s, i) => ({
      id: s.id || `hero-${i}`,
      name: String(s.name ?? "Hero").trim() || "Hero",
      title: String(s.title ?? "").trim(),
      subtitle: String(s.subtitle ?? "").trim(),
      price: String(s.price ?? "").trim(),
      cta: String(s.cta ?? "Shop Now").trim(),
      ctaLink: String(s.ctaLink ?? "/shop").trim() || "/shop",
      imageUrl: String(s.imageUrl ?? "").trim(),
      bg: String(s.bg ?? "from-zinc-950 via-teal-950/50 to-zinc-950").trim(),
      overlay: String(s.overlay ?? "bg-gradient-to-r from-black/60 via-transparent to-transparent").trim(),
    }))

    await prisma.assistantConfig.upsert({
      where: { key: CONFIG_KEY },
      create: { key: CONFIG_KEY, value: JSON.stringify(normalized) },
      update: { value: JSON.stringify(normalized) },
    })
    return NextResponse.json({ message: "Hero slides saved.", slides: normalized })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: error?.message }, { status: 500 })
  }
}

/** POST: Admin – add one hero slide (formData: name, title, subtitle, price, cta, ctaLink, image, bg?, overlay?) */
export async function POST(request) {
  try {
    const { userId } = getAuth(request)
    const isAdmin = await authAdmin(userId)
    if (!isAdmin) return NextResponse.json({ error: "Not authorized" }, { status: 401 })

    const formData = await request.formData()
    const name = String(formData.get("name") ?? "Hero").trim() || "Hero"
    const title = String(formData.get("title") ?? "").trim()
    const subtitle = String(formData.get("subtitle") ?? "").trim()
    const price = String(formData.get("price") ?? "").trim()
    const cta = String(formData.get("cta") ?? "Shop Now").trim()
    const ctaLink = String(formData.get("ctaLink") ?? "/shop").trim() || "/shop"
    const bg = String(formData.get("bg") ?? "from-zinc-950 via-teal-950/50 to-zinc-950").trim()
    const overlay = String(formData.get("overlay") ?? "bg-gradient-to-r from-black/60 via-transparent to-transparent").trim()
    const imageFile = formData.get("image")

    let imageUrl = ""
    if (imageFile && typeof imageFile === "object" && "arrayBuffer" in imageFile && imageFile.size > 0) {
      const buffer = Buffer.from(await imageFile.arrayBuffer())
      const response = await imagekit.upload({
        file: buffer,
        fileName: imageFile.name || "hero-slide",
        folder: "hero",
      })
      imageUrl = imagekit.url({
        path: response.filePath,
        transformation: [{ quality: "auto" }, { format: "webp" }, { width: "800" }],
      })
    }

    const row = await prisma.assistantConfig.findUnique({ where: { key: CONFIG_KEY } })
    let slides = []
    if (row?.value) {
      try {
        slides = JSON.parse(row.value)
        if (!Array.isArray(slides)) slides = []
      } catch (_) {}
    }
    const newSlide = {
      id: `hero-${Date.now()}`,
      name,
      title,
      subtitle,
      price,
      cta,
      ctaLink,
      imageUrl,
      bg,
      overlay,
    }
    slides.push(newSlide)
    await prisma.assistantConfig.upsert({
      where: { key: CONFIG_KEY },
      create: { key: CONFIG_KEY, value: JSON.stringify(slides) },
      update: { value: JSON.stringify(slides) },
    })
    return NextResponse.json({ message: "Hero slide added.", slides })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: error?.message }, { status: 500 })
  }
}
