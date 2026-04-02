import imagekit from "@/configs/imageKit"
import prisma from "@/lib/prisma"
import authSeller from "@/middlewares/authSeller"
import { getAuth } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"

export const HOME_BANNER_WIDTH = 1920
export const HOME_BANNER_HEIGHT = 600

/** GET: List all home banners for the vendor's store */
export async function GET(request) {
  try {
    const { userId } = getAuth(request)
    const { searchParams } = new URL(request.url)
    const rawStoreType = searchParams.get("type")
    const storeType = ["electronics", "fashion"].includes(rawStoreType) ? rawStoreType : "electronics"

    const storeId = await authSeller(userId, storeType)
    if (!storeId) {
      return NextResponse.json({ error: "Not authorized" }, { status: 401 })
    }

    const banners = await prisma.vendorHomeBanner.findMany({
      where: { storeId },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    })

    const list = banners.map((b) => ({
      id: b.id,
      name: b.name ?? "Banner",
      imageUrl: b.imageUrl,
      bannerLink: b.bannerLink ?? "",
      buttons: Array.isArray(b.buttons) ? b.buttons : [],
      sortOrder: b.sortOrder,
    }))

    return NextResponse.json({
      banners: list,
      preferredDimensions: { width: HOME_BANNER_WIDTH, height: HOME_BANNER_HEIGHT },
    })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: error?.message || "Failed to fetch banners" }, { status: 400 })
  }
}

/** POST: Create a new home banner */
export async function POST(request) {
  try {
    const { userId } = getAuth(request)
    const { searchParams } = new URL(request.url)
    const rawStoreType = searchParams.get("type")
    const storeType = ["electronics", "fashion"].includes(rawStoreType) ? rawStoreType : "electronics"

    const storeId = await authSeller(userId, storeType)
    if (!storeId) {
      return NextResponse.json({ error: "Not authorized" }, { status: 401 })
    }

    const formData = await request.formData()
    const nameRaw = formData.get("name")
    const name = (nameRaw != null && String(nameRaw).trim() !== "") ? String(nameRaw).trim() : "Banner"
    const bannerLinkRaw = formData.get("bannerLink")
    const bannerLink = (bannerLinkRaw != null && String(bannerLinkRaw).trim() !== "") ? String(bannerLinkRaw).trim() : null
    const buttonsRaw = formData.get("buttons")
    const imageFile = formData.get("image")

    let buttons = []
    if (buttonsRaw != null && String(buttonsRaw).trim() !== "") {
      try {
        buttons = JSON.parse(buttonsRaw)
        if (!Array.isArray(buttons)) buttons = []
      } catch {
        buttons = []
      }
    }
    buttons = buttons.map((b) => ({
      label: String(b?.label ?? "").trim() || "Button",
      link: String(b?.link ?? "").trim() || "#",
      backgroundColor: String(b?.backgroundColor ?? "#14b8a6").trim(),
      textColor: String(b?.textColor ?? "#ffffff").trim(),
      size: ["sm", "md", "lg"].includes(b?.size) ? b.size : "md",
    }))

    const isValidImage = imageFile && typeof imageFile === "object" && "arrayBuffer" in imageFile && imageFile.size > 0
    if (!isValidImage) {
      return NextResponse.json({ error: "Please upload a banner image." }, { status: 400 })
    }

    const buffer = Buffer.from(await imageFile.arrayBuffer())
    const response = await imagekit.upload({
      file: buffer,
      fileName: imageFile.name || "home-banner",
      folder: "home-banners",
    })
    const imageUrl = imagekit.url({
      path: response.filePath,
      transformation: [
        { quality: "auto" },
        { format: "webp" },
        { width: String(HOME_BANNER_WIDTH) },
        { height: String(HOME_BANNER_HEIGHT), crop: "at_max" },
      ],
    })

    const count = await prisma.vendorHomeBanner.count({ where: { storeId } })
    await prisma.vendorHomeBanner.create({
      data: {
        storeId,
        name,
        imageUrl,
        bannerLink,
        buttons,
        sortOrder: count,
      },
    })

    return NextResponse.json({ message: "Banner saved successfully." })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: error?.message || "Failed to save banner" }, { status: 400 })
  }
}

/** PUT: Update an existing banner (query: bannerId) */
export async function PUT(request) {
  try {
    const { userId } = getAuth(request)
    const { searchParams } = new URL(request.url)
    const rawStoreType = searchParams.get("type")
    const bannerId = searchParams.get("bannerId")
    const storeType = ["electronics", "fashion"].includes(rawStoreType) ? rawStoreType : "electronics"

    const storeId = await authSeller(userId, storeType)
    if (!storeId) {
      return NextResponse.json({ error: "Not authorized" }, { status: 401 })
    }
    if (!bannerId) {
      return NextResponse.json({ error: "bannerId is required" }, { status: 400 })
    }

    const existing = await prisma.vendorHomeBanner.findFirst({
      where: { id: bannerId, storeId },
    })
    if (!existing) {
      return NextResponse.json({ error: "Banner not found" }, { status: 404 })
    }

    const formData = await request.formData()
    const nameRaw = formData.get("name")
    const bannerLinkRaw = formData.get("bannerLink")
    const buttonsRaw = formData.get("buttons")
    const imageFile = formData.get("image")

    const name = (nameRaw != null && String(nameRaw).trim() !== "") ? String(nameRaw).trim() : existing.name
    const bannerLink = (bannerLinkRaw != null && String(bannerLinkRaw).trim() !== "") ? String(bannerLinkRaw).trim() : null

    let buttons = existing.buttons
    if (Array.isArray(existing.buttons)) buttons = existing.buttons
    if (buttonsRaw != null && String(buttonsRaw).trim() !== "") {
      try {
        const parsed = JSON.parse(buttonsRaw)
        if (Array.isArray(parsed)) {
          buttons = parsed.map((b) => ({
            label: String(b?.label ?? "").trim() || "Button",
            link: String(b?.link ?? "").trim() || "#",
            backgroundColor: String(b?.backgroundColor ?? "#14b8a6").trim(),
            textColor: String(b?.textColor ?? "#ffffff").trim(),
            size: ["sm", "md", "lg"].includes(b?.size) ? b.size : "md",
          }))
        }
      } catch (_) {}
    }

    let imageUrl = existing.imageUrl
    const isValidImage = imageFile && typeof imageFile === "object" && "arrayBuffer" in imageFile && imageFile.size > 0
    if (isValidImage) {
      const buffer = Buffer.from(await imageFile.arrayBuffer())
      const response = await imagekit.upload({
        file: buffer,
        fileName: imageFile.name || "home-banner",
        folder: "home-banners",
      })
      imageUrl = imagekit.url({
        path: response.filePath,
        transformation: [
          { quality: "auto" },
          { format: "webp" },
          { width: String(HOME_BANNER_WIDTH) },
          { height: String(HOME_BANNER_HEIGHT), crop: "at_max" },
        ],
      })
    }

    await prisma.vendorHomeBanner.update({
      where: { id: bannerId },
      data: { name, imageUrl, bannerLink, buttons },
    })

    return NextResponse.json({ message: "Banner updated successfully." })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: error?.message || "Failed to update banner" }, { status: 400 })
  }
}

/** DELETE: Delete a banner (query: bannerId) */
export async function DELETE(request) {
  try {
    const { userId } = getAuth(request)
    const { searchParams } = new URL(request.url)
    const bannerId = searchParams.get("bannerId")
    const rawStoreType = searchParams.get("type")
    const storeType = ["electronics", "fashion"].includes(rawStoreType) ? rawStoreType : "electronics"

    const storeId = await authSeller(userId, storeType)
    if (!storeId) {
      return NextResponse.json({ error: "Not authorized" }, { status: 401 })
    }
    if (!bannerId) {
      return NextResponse.json({ error: "bannerId is required" }, { status: 400 })
    }

    const banner = await prisma.vendorHomeBanner.findFirst({
      where: { id: bannerId, storeId },
    })
    if (!banner) {
      return NextResponse.json({ error: "Banner not found" }, { status: 404 })
    }

    await prisma.vendorHomeBanner.delete({ where: { id: bannerId } })
    return NextResponse.json({ message: "Banner deleted." })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: error?.message || "Failed to delete banner" }, { status: 400 })
  }
}
