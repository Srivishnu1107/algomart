import imagekit from "@/configs/imageKit"
import prisma from "@/lib/prisma"
import { getAuth } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"

/** Update store profile (owner only). Only known fields are applied; others ignored. */
export async function PATCH(request) {
    try {
        const { userId } = getAuth(request)
        if (!userId) {
            return NextResponse.json({ error: "Please sign in to update your store." }, { status: 401 })
        }

        const formData = await request.formData()
        const rawStoreType = formData.get("storeType")
        const storeType = ["electronics", "fashion"].includes(String(rawStoreType || "")) ? rawStoreType : "electronics"

        const store = await prisma.store.findFirst({
            where: { userId, storeType }
        })
        if (!store) {
            return NextResponse.json({ error: "Store not found." }, { status: 404 })
        }

        const name = String(formData.get("name") ?? store.name ?? "").trim()
        const description = formData.get("description") != null ? String(formData.get("description")) : store.description
        const email = formData.get("email") != null ? String(formData.get("email")).trim() : store.email
        const contact = formData.get("contact") != null ? String(formData.get("contact")).trim() : store.contact
        const address = formData.get("address") != null ? String(formData.get("address")) : store.address

        if (!name || !description || !email || !contact || !address) {
            return NextResponse.json({ error: "Please fill in all required fields." }, { status: 400 })
        }

        let logoUrl = store.logo
        const image = formData.get("image")
        const isValidImage = image && typeof image === "object" && "arrayBuffer" in image && image.size > 0
        if (isValidImage) {
            try {
                const buffer = Buffer.from(await image.arrayBuffer())
                const response = await imagekit.upload({
                    file: buffer,
                    fileName: image.name || "logo",
                    folder: "logos",
                })
                logoUrl = imagekit.url({
                    path: response.filePath,
                    transformation: [
                        { quality: "auto" },
                        { format: "webp" },
                        { width: "512" },
                    ],
                })
            } catch (uploadError) {
                const status = uploadError?.status ?? uploadError?.statusCode ?? 400
                const message = String(uploadError?.message || "").includes("403")
                    ? "Logo upload failed. Check ImageKit credentials in .env."
                    : uploadError?.message || "Logo upload failed. Try a smaller image."
                return NextResponse.json({ error: message }, { status: status === 403 ? 403 : 400 })
            }
        }

        let bannerUrl = store.banner
        const bannerFile = formData.get("banner")
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
                console.warn("Banner upload failed, keeping existing:", bannerErr?.message)
            }
        }

        await prisma.store.update({
            where: { id: store.id },
            data: {
                name,
                description,
                email,
                contact,
                address,
                logo: logoUrl,
                banner: bannerUrl,
                lastActiveAt: new Date(),
            },
        })

        return NextResponse.json({ message: "Store updated successfully.", username: store.username })
    } catch (error) {
        console.error(error)
        const message = error?.code || error?.message || "Something went wrong. Please try again."
        return NextResponse.json({ error: message }, { status: 400 })
    }
}
