import imagekit from "@/configs/imageKit";
import prisma from "@/lib/prisma";
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

/** Generate URL-safe slug from store name (e.g. "Shanks Store" -> "shanks-store") */
function slugFromName(name) {
    if (!name || typeof name !== "string") return ""
    return name
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "") || "store"
}

/** Find a unique username (slug) for the store; may append -2, -3, etc. */
async function ensureUniqueSlug(baseSlug, excludeStoreId = null) {
    let slug = baseSlug
    let n = 1
    for (;;) {
        const existing = await prisma.store.findFirst({
            where: {
                username: slug,
                ...(excludeStoreId ? { id: { not: excludeStoreId } } : {})
            }
        })
        if (!existing) return slug
        slug = `${baseSlug}-${++n}`
    }
}

// create the store
export async function POST(request){
    try {
        const { userId } = getAuth(request)
        if (!userId) {
            return NextResponse.json({ error: "Please sign in to submit an application." }, { status: 401 })
        }

        const formData = await request.formData()
        const name = String(formData.get("name") ?? "").trim()
        const description = formData.get("description")
        const email = formData.get("email")
        const contact = formData.get("contact")
        const address = formData.get("address")
        const image = formData.get("image")
        const bannerFile = formData.get("banner")
        const rawStoreType = formData.get("storeType")
        const storeType = ["electronics", "fashion"].includes(rawStoreType) ? rawStoreType : "electronics"

        if (!name || !description || !email || !contact || !address) {
            return NextResponse.json({ error: "Please fill in all required fields." }, { status: 400 })
        }
        const isValidImage = image && typeof image === "object" && "arrayBuffer" in image && image.size > 0
        if (!isValidImage) {
            return NextResponse.json({ error: "Please upload a store logo image." }, { status: 400 })
        }

        const baseSlug = slugFromName(name)
        if (!baseSlug) {
            return NextResponse.json({ error: "Store name must contain at least one letter or number." }, { status: 400 })
        }

        // check is user have already registered a store
        const store = await prisma.store.findFirst({
            where: { userId: userId, storeType }
        })

        const username = await ensureUniqueSlug(baseSlug, store?.id ?? null)

        // logo upload to imagekit
        let optimizedImage
        try {
            const buffer = Buffer.from(await image.arrayBuffer())
            const response = await imagekit.upload({
                file: buffer,
                fileName: image.name || "logo",
                folder: "logos",
            })
            optimizedImage = imagekit.url({
                path: response.filePath,
                transformation: [
                    { quality: "auto" },
                    { format: "webp" },
                    { width: "512" },
                ],
            })
        } catch (uploadError) {
            const status = uploadError?.status ?? uploadError?.statusCode ?? (String(uploadError?.message || "").includes("403") ? 403 : 400)
            const message = status === 403
                ? "Logo upload failed. Check ImageKit credentials in .env."
                : uploadError?.message || "Logo upload failed. Try a smaller image."
            return NextResponse.json({ error: message }, { status: status === 403 ? 403 : 400 })
        }

        // optional banner upload
        let bannerUrl = null
        const isValidBanner = bannerFile && typeof bannerFile === "object" && "arrayBuffer" in bannerFile && bannerFile.size > 0
        if (isValidBanner) {
            try {
                const bannerBuffer = Buffer.from(await bannerFile.arrayBuffer())
                const bannerResponse = await imagekit.upload({
                    file: bannerBuffer,
                    fileName: bannerFile.name || "banner",
                    folder: "banners",
                })
                bannerUrl = imagekit.url({
                    path: bannerResponse.filePath,
                    transformation: [
                        { quality: "auto" },
                        { format: "webp" },
                        { width: "1920" },
                        { height: "480", crop: "at_max" },
                    ],
                })
            } catch (bannerErr) {
                console.warn("Banner upload failed, continuing without banner:", bannerErr?.message)
            }
        }

        if (store && store.status === "rejected") {
            await prisma.store.update({
                where: { id: store.id },
                data: {
                    name,
                    description,
                    username,
                    email,
                    contact,
                    address,
                    logo: optimizedImage,
                    ...(bannerUrl !== null && { banner: bannerUrl }),
                    status: "pending",
                    isActive: false,
                    storeType
                }
            })
            return NextResponse.json({message: "re-applied, waiting for approval"})
        }

        // if store is already registered then send status of store
        if(store){
            return NextResponse.json({status: store.status})
        }

        await prisma.store.create({
            data: {
                userId,
                name,
                description,
                username,
                email,
                contact,
                address,
                logo: optimizedImage,
                ...(bannerUrl && { banner: bannerUrl }),
                storeType
            }
        })

        return NextResponse.json({message: "applied, waiting for approval"})

    } catch (error) {
        console.error(error)
        const message = error?.code || error?.message || "Something went wrong. Please try again."
        return NextResponse.json({ error: message }, { status: 400 })
    }
}

// check is user have already registered a store if yes then send status of store

export async function GET(request) {
    try {
        const { userId } = getAuth(request)
        if (!userId) {
            return NextResponse.json({ status: "not registered" })
        }
        const { searchParams } = new URL(request.url)
        const rawStoreType = searchParams.get('type')
        const storeType = ["electronics", "fashion"].includes(rawStoreType) ? rawStoreType : "electronics"

        const store = await prisma.store.findFirst({
            where: { userId: userId, storeType }
        })

        // if store is already registered then send status and store details (for edit prefilling)
        if(store){
            const storeForEdit = {
                username: store.username ?? "",
                name: store.name ?? "",
                description: store.description ?? "",
                email: store.email ?? "",
                contact: store.contact ?? "",
                address: store.address ?? "",
                logo: store.logo ?? null,
                banner: store.banner ?? null
            }
            return NextResponse.json({ status: store.status, store: storeForEdit })
        }

        return NextResponse.json({ status: "not registered" })
    } catch (error) {
        console.error(error);
        return NextResponse.json({error: error.code || error.message}, { status: 400 })
    }
}