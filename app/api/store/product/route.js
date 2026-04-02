import imagekit from "@/configs/imageKit"
import prisma from "@/lib/prisma"
import authSeller from "@/middlewares/authSeller"
import { getAuth } from "@clerk/nextjs/server"
import { NextResponse } from "next/server";
import { isSuspiciousPrice } from "@/lib/suspiciousPrice";

// Add a new product
export async function POST(request) {
    try {
        const { userId } = getAuth(request)
        const { searchParams } = new URL(request.url)
        const rawStoreType = searchParams.get('type')
        const storeType = ["electronics", "fashion"].includes(rawStoreType) ? rawStoreType : "electronics"
        const storeId = await authSeller(userId, storeType)

        if (!storeId) {
            return NextResponse.json({ error: 'not authorized' }, { status: 401 })
        }
        // Get the data from the form
        const formData = await request.formData()
        const name = formData.get("name")
        const description = formData.get("description")
        const mrpRaw = formData.get("mrp")
        const priceRaw = formData.get("price")
        const category = formData.get("category")
        const brandRaw = formData.get("brand")
        const brand = brandRaw && brandRaw !== "" ? brandRaw : null
        const images = formData.getAll("images")

        // Parse numeric values (handle null/empty strings)
        const mrp = mrpRaw && mrpRaw !== "" ? Number(mrpRaw) : null
        const price = priceRaw && priceRaw !== "" ? Number(priceRaw) : null

        // New fields
        const actual_priceRaw = formData.get("actual_price")
        const offer_priceRaw = formData.get("offer_price")
        const cost_priceRaw = formData.get("cost_price")
        const stock_quantityRaw = formData.get("stock_quantity")
        const low_stock_thresholdRaw = formData.get("low_stock_threshold")
        const skuRaw = formData.get("sku")
        const commission_rateRaw = formData.get("commission_rate")
        const is_draftRaw = formData.get("is_draft")
        const statusRaw = formData.get("status")

        const actual_price = actual_priceRaw && actual_priceRaw !== "" ? Number(actual_priceRaw) : null
        const offer_price = offer_priceRaw && offer_priceRaw !== "" ? Number(offer_priceRaw) : null
        const cost_price = cost_priceRaw && cost_priceRaw !== "" ? Number(cost_priceRaw) : null
        const stock_quantity = stock_quantityRaw && stock_quantityRaw !== "" ? Number(stock_quantityRaw) : 0
        const low_stock_threshold = low_stock_thresholdRaw && low_stock_thresholdRaw !== "" ? Number(low_stock_thresholdRaw) : 5
        const sku = skuRaw && skuRaw !== "" ? skuRaw : null
        const commission_rate = commission_rateRaw && commission_rateRaw !== "" ? Number(commission_rateRaw) : 0.10
        const is_draft = is_draftRaw === "true" || is_draftRaw === true
        const status = statusRaw || (is_draft ? "draft" : "active")

        // Backward compatibility: use mrp/price if actual_price/offer_price not provided
        const final_actual_price = actual_price !== null && !isNaN(actual_price) ? actual_price : (mrp !== null && !isNaN(mrp) ? mrp : null)
        const final_offer_price = offer_price !== null && !isNaN(offer_price) ? offer_price : (price !== null && !isNaN(price) ? price : null)

        // Check if updating existing product/draft (for edit functionality)
        const draftId = formData.get("draftId")
        const productId = formData.get("productId")
        const isEditingDraft = draftId && draftId !== ""
        const isEditingProduct = productId && productId !== ""
        const isEditing = isEditingDraft || isEditingProduct

        // Validation - different rules for drafts vs published products
        if (is_draft) {
            // For drafts, only name is required
            if (!name) {
                return NextResponse.json({ error: 'Product name is required to save as draft' }, { status: 400 })
            }
        } else {
            // For published products, required fields must be filled
            if (!name || !description || !category) {
                return NextResponse.json({ error: 'Name, description, and category are required to publish' }, { status: 400 })
            }

            // Check for images: either new images uploaded OR existing images preserved (when editing)
            // Note: imagesUrl will be populated after image upload, so we check images array length here
            // For editing drafts or published products, we'll check existing images later in the update flow
            const hasNewImages = images.length > 0
            const preserveExisting = formData.get("preserveExistingImages") === "true"

            // Allow editing published products without new images (existing images will be preserved)
            if (!hasNewImages && !isEditingDraft && !isEditingProduct) {
                return NextResponse.json({ error: 'At least one image is required to publish' }, { status: 400 })
            }

            if (final_actual_price === null || isNaN(final_actual_price) || final_offer_price === null || isNaN(final_offer_price) || final_actual_price === 0 || final_offer_price === 0) {
                return NextResponse.json({ error: 'Actual price and offer price are required to publish' }, { status: 400 })
            }
        }

        if (final_offer_price > final_actual_price) {
            return NextResponse.json({ error: 'offer_price must be less than or equal to actual_price' }, { status: 400 })
        }

        if (isNaN(stock_quantity) || stock_quantity < 0) {
            return NextResponse.json({ error: 'stock_quantity must be non-negative' }, { status: 400 })
        }

        if (isNaN(commission_rate) || commission_rate < 0 || commission_rate > 1) {
            return NextResponse.json({ error: 'commission_rate must be between 0 and 1' }, { status: 400 })
        }

        if (cost_price !== null && !isNaN(cost_price) && cost_price > final_offer_price) {
            return NextResponse.json({ error: 'cost_price must be less than or equal to offer_price' }, { status: 400 })
        }

        // Uploading Images to ImageKit (optional for drafts)
        let imagesUrl = [];
        if (images.length > 0) {
            try {
                imagesUrl = await Promise.all(images.map(async (image) => {
                    const buffer = Buffer.from(await image.arrayBuffer());
                    const response = await imagekit.upload({
                        file: buffer,
                        fileName: image.name,
                        folder: "products",
                    });
                    const url = imagekit.url({
                        path: response.filePath,
                        transformation: [
                            { quality: "auto" },
                            { format: "webp" },
                            { width: "1024" },
                        ],
                    });
                    return url;
                }));
            } catch (uploadError) {
                const status = uploadError?.status ?? uploadError?.statusCode ?? (String(uploadError?.message || "").includes("403") ? 403 : 400);
                const message = status === 403
                    ? "Image upload forbidden. Check ImageKit credentials (IMAGEKIT_PUBLIC_KEY, IMAGEKIT_PRIVATE_KEY, IMAGEKIT_URL_ENDPOINT in .env) and account permissions."
                    : uploadError?.message || "Image upload failed. Try a smaller image or check storage settings.";
                return NextResponse.json({ error: message }, { status: status === 403 ? 403 : 400 });
            }
        }

        // Compute business intelligence values (server-side only, never trust frontend)
        // Only compute if prices are available
        const commission_amount = final_offer_price !== null && !isNaN(final_offer_price) ? final_offer_price * commission_rate : null
        const net_earnings = final_offer_price !== null && !isNaN(final_offer_price) && commission_amount !== null ? final_offer_price - commission_amount : null
        const net_profit = net_earnings !== null && cost_price !== null && !isNaN(cost_price) ? net_earnings - cost_price : null

        let product

        if (isEditing) {
            // Update existing product/draft
            const editId = isEditingDraft ? draftId : productId
            const existingProduct = await prisma.product.findFirst({
                where: {
                    id: editId,
                    storeId
                }
            })

            if (!existingProduct) {
                return NextResponse.json({ error: 'Product not found' }, { status: 404 })
            }

            // Additional validation when publishing an edited draft
            if (!is_draft && isEditingDraft) {
                // When publishing a draft, ensure we have images (either new or existing)
                const preserveExisting = formData.get("preserveExistingImages") === "true"
                const hasNewImages = imagesUrl.length > 0
                const hasExistingImages = existingProduct.images && existingProduct.images.length > 0

                if (!hasNewImages && !hasExistingImages && !preserveExisting) {
                    return NextResponse.json({ error: 'At least one image is required to publish' }, { status: 400 })
                }
            }

            // Validation when editing a published product without new images
            if (isEditingProduct && !is_draft && imagesUrl.length === 0) {
                // When editing published product, ensure we have existing images if no new ones uploaded
                const hasExistingImages = existingProduct.images && existingProduct.images.length > 0
                if (!hasExistingImages) {
                    return NextResponse.json({ error: 'At least one image is required. Please upload an image or ensure existing images are preserved.' }, { status: 400 })
                }
            }

            // Merge existing images with new ones
            // If new images uploaded, use them; otherwise preserve existing images
            const preserveExisting = formData.get("preserveExistingImages") === "true"
            let finalImages = []
            if (imagesUrl.length > 0) {
                // New images uploaded - use them
                finalImages = imagesUrl
            } else if (preserveExisting && existingProduct.images && existingProduct.images.length > 0) {
                // No new images, preserve existing ones
                finalImages = existingProduct.images
            } else if (existingProduct.images && existingProduct.images.length > 0) {
                // When editing published product or publishing draft, use existing images if no new ones uploaded
                finalImages = existingProduct.images
            } else {
                // No images at all
                finalImages = []
            }

            // When editing published product, keep status as 'active' and is_draft as false
            const finalStatus = isEditingProduct ? 'active' : status
            const finalIsDraft = isEditingProduct ? false : is_draft

            product = await prisma.product.update({
                where: { id: editId },
                data: {
                    name: name || existingProduct.name,
                    description: description || existingProduct.description,
                    mrp: final_actual_price !== null ? final_actual_price : existingProduct.mrp,
                    price: final_offer_price !== null ? final_offer_price : existingProduct.price,
                    actual_price: final_actual_price !== null ? final_actual_price : existingProduct.actual_price,
                    offer_price: final_offer_price !== null ? final_offer_price : existingProduct.offer_price,
                    cost_price: cost_price !== null ? cost_price : existingProduct.cost_price,
                    stock_quantity: stock_quantity !== undefined ? stock_quantity : existingProduct.stock_quantity,
                    low_stock_threshold: low_stock_threshold !== undefined ? low_stock_threshold : existingProduct.low_stock_threshold,
                    sku: sku || existingProduct.sku,
                    commission_rate: commission_rate !== undefined ? commission_rate : existingProduct.commission_rate,
                    commission_amount,
                    net_earnings,
                    net_profit,
                    is_draft: finalIsDraft,
                    status: finalStatus,
                    category: category || existingProduct.category,
                    brand: brand !== undefined ? brand : existingProduct.brand,
                    images: finalImages,
                    inStock: (stock_quantity !== undefined ? stock_quantity : existingProduct.stock_quantity) > 0
                }
            })
        } else {
            // Create new product/draft
            product = await prisma.product.create({
                data: {
                    name,
                    description: description || "",
                    mrp: final_actual_price || null, // Keep for backward compatibility
                    price: final_offer_price || null, // Keep for backward compatibility
                    actual_price: final_actual_price,
                    offer_price: final_offer_price,
                    cost_price: cost_price || null,
                    stock_quantity: stock_quantity || 0,
                    low_stock_threshold: low_stock_threshold || 5,
                    sku: sku || null,
                    commission_rate: commission_rate || 0.10,
                    commission_amount: commission_amount || null,
                    net_earnings: net_earnings || null,
                    net_profit: net_profit || null,
                    is_draft,
                    status,
                    category: category || "",
                    brand: brand || null,
                    images: imagesUrl || [],
                    storeId,
                    productType: storeType,
                    inStock: (stock_quantity || 0) > 0
                }
            })
        }

        // Update store last activity when a product is published (active)
        const isPublished = product && product.status === "active";
        if (isPublished && storeId) {
            await prisma.store.update({
                where: { id: storeId },
                data: { lastActiveAt: new Date() },
            }).catch(() => { })
        }

        // Non-blocking suspicious price warning
        let priceWarning = null;
        if (!is_draft) {
            if (isSuspiciousPrice(final_offer_price, final_actual_price, category)) {
                priceWarning = "Your offer price looks unusually low. Please double-check it. Suspicious pricing may be subject to admin review.";
            }
        }

        return NextResponse.json({
            message: isEditingProduct
                ? "Product updated successfully"
                : draftId
                    ? "Draft updated successfully"
                    : (is_draft ? "Draft saved successfully" : "Product added successfully"),
            product_id: product.id,
            commission_amount,
            net_earnings,
            net_profit,
            ...(priceWarning ? { warning: priceWarning } : {}),
        })

    } catch (error) {
        console.error(error);
        const status = error?.status ?? error?.statusCode ?? (String(error?.message || "").includes("403") ? 403 : 400);
        const message = status === 403
            ? "Request forbidden. Check ImageKit credentials in .env or try a smaller image."
            : error?.code || error?.message || "Failed to add product.";
        return NextResponse.json({ error: message }, { status: status === 403 ? 403 : 400 });
    }
}

// Get all products for a seller
export async function GET(request) {
    try {
        const { userId } = getAuth(request)
        const { searchParams } = new URL(request.url)
        const rawStoreType = searchParams.get('type')
        const storeType = ["electronics", "fashion"].includes(rawStoreType) ? rawStoreType : "electronics"
        const storeId = await authSeller(userId, storeType)

        if (!storeId) {
            return NextResponse.json({ error: 'not authorized' }, { status: 401 })
        }
        const products = await prisma.product.findMany({ where: { storeId } })

        return NextResponse.json({ products })
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: error.code || error.message }, { status: 400 })
    }
}

// Delete a product (permanent)
export async function DELETE(request) {
    try {
        const { userId } = getAuth(request)
        const { searchParams } = new URL(request.url)
        const rawStoreType = searchParams.get('type')
        const storeType = ["electronics", "fashion"].includes(rawStoreType) ? rawStoreType : "electronics"
        const storeId = await authSeller(userId, storeType)

        if (!storeId) {
            return NextResponse.json({ error: 'not authorized' }, { status: 401 })
        }

        const productId = searchParams.get('productId')
        if (!productId) {
            return NextResponse.json({ error: 'productId required' }, { status: 400 })
        }

        const product = await prisma.product.findFirst({
            where: { id: productId, storeId },
            include: { orderItems: true },
        })
        if (!product) {
            return NextResponse.json({ error: 'Product not found' }, { status: 404 })
        }
        if (product.orderItems?.length > 0) {
            return NextResponse.json({ error: 'Cannot delete product with order history' }, { status: 400 })
        }

        await prisma.wishlist.deleteMany({ where: { productId } })
        await prisma.rating.deleteMany({ where: { productId } })

        const users = await prisma.user.findMany({ select: { id: true, cart: true } })
        for (const user of users) {
            const cart = user.cart && typeof user.cart === 'object' ? user.cart : {}
            if (cart[productId]) {
                const { [productId]: _, ...rest } = cart
                await prisma.user.update({
                    where: { id: user.id },
                    data: { cart: rest },
                })
            }
        }

        await prisma.product.delete({ where: { id: productId, storeId } })

        return NextResponse.json({ message: 'Product deleted successfully' })
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: error.code || error.message }, { status: 400 })
    }
}