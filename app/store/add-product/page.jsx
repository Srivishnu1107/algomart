'use client'
import { assets } from "@/assets/assets"
import { useAuth } from "@clerk/nextjs"
import axios from "axios"
import Image from "next/image"
import { usePathname, useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import { toast } from "react-hot-toast"
import { Sparkles } from "lucide-react"
import Link from "next/link"
import { PRODUCT_BRANDS } from "@/lib/brands"

const CATEGORIES = ['Mobiles', 'Televisions', 'Laptops', 'Headphones', 'Earbuds', 'Watches', 'Speakers', 'Accessories', 'Tablets']
const FASHION_CATEGORIES = ['Men', 'Women', 'Footwear', 'Accessories', 'Streetwear', 'Luxury', 'Outerwear', 'Dresses', 'Jewelry', 'Knitwear', 'Bottoms']

export default function StoreAddProduct() {
    const [images, setImages] = useState({ 1: null, 2: null, 3: null, 4: null })
    const [existingImages, setExistingImages] = useState([]) // For editing drafts with existing images
    const [isDraft, setIsDraft] = useState(true)
    const [editingDraftId, setEditingDraftId] = useState(null)
    const [editingProductId, setEditingProductId] = useState(null) // For editing published products
    const [isEditingPublished, setIsEditingPublished] = useState(false) // Track if editing published product
    const [productInfo, setProductInfo] = useState({
        name: "",
        description: "",
        mrp: 0,
        price: 0,
        category: "",
        brand: "",
        // New fields
        actual_price: "",
        offer_price: "",
        cost_price: "",
        stock_quantity: 1,
        low_stock_threshold: 5,
        sku: "",
        commission_rate: 0.10,
    })
    const [loading, setLoading] = useState(false)
    const [aiLoading, setAiLoading] = useState(false)

    const { getToken } = useAuth()
    const pathname = usePathname()
    const router = useRouter()
    const isFashion = pathname?.startsWith('/fashion')
    const storeTypeParam = isFashion ? '?type=fashion' : ''
    const categories = isFashion ? FASHION_CATEGORIES : CATEGORIES
    const accentText = isFashion ? 'text-[#8B6914]' : 'text-teal-400'
    const accentRing = isFashion ? 'focus:ring-[#8B6914]/30' : 'focus:ring-teal-500/50'
    const accentBorder = isFashion ? 'focus:border-[#8B6914]/40' : 'focus:border-teal-500/50'
    const accentBorderHover = isFashion ? 'hover:border-[#8B6914]/50' : 'hover:border-teal-500/50'
    const accentBadge = isFashion ? 'bg-[#8B6914]/20 text-[#8B6914] border-[#8B6914]/40' : 'bg-teal-500/20 text-teal-400 border-teal-500/40'
    const accentButton = isFashion ? 'bg-[#8B6914] hover:bg-[#7a5c12] shadow-[#8B6914]/20' : 'bg-teal-400 hover:bg-teal-300 shadow-teal-500/20'

    const onChangeHandler = (e) => {
        const value = e.target.type === 'number' ? (e.target.value === '' ? '' : Number(e.target.value)) : e.target.value
        setProductInfo({ ...productInfo, [e.target.name]: value })
    }

    // Client-side preview calculation (for display only, server computes actual values)
    const calculatePreview = () => {
        const offerPrice = productInfo.offer_price || productInfo.price || 0
        const commissionRate = productInfo.commission_rate || 0.10
        const commissionAmount = offerPrice * commissionRate
        const netEarnings = offerPrice - commissionAmount
        const costPrice = productInfo.cost_price || 0
        const netProfit = costPrice > 0 ? netEarnings - costPrice : null

        return {
            commissionAmount: commissionAmount.toFixed(2),
            netEarnings: netEarnings.toFixed(2),
            netProfit: netProfit !== null ? netProfit.toFixed(2) : null
        }
    }

    const preview = calculatePreview()

    // Load product/draft data from sessionStorage if editing
    useEffect(() => {
        const draftData = sessionStorage.getItem('editingDraft')
        const productData = sessionStorage.getItem('editingProduct')

        if (draftData) {
            try {
                const draft = JSON.parse(draftData)
                setEditingDraftId(draft.id)
                setProductInfo({
                    name: draft.name || "",
                    description: draft.description || "",
                    mrp: draft.mrp || 0,
                    price: draft.price || 0,
                    category: draft.category || "",
                    brand: draft.brand || "",
                    actual_price: draft.actual_price || "",
                    offer_price: draft.offer_price || "",
                    cost_price: draft.cost_price || "",
                    stock_quantity: draft.stock_quantity || 1,
                    low_stock_threshold: draft.low_stock_threshold || 5,
                    sku: draft.sku || "",
                    commission_rate: draft.commission_rate || 0.10,
                })
                setIsDraft(draft.is_draft || draft.status === 'draft')

                // Load existing images if they exist (for editing)
                if (draft.images && draft.images.length > 0) {
                    setExistingImages(draft.images)
                    // Map existing images to the images state for display
                    const imageMap = { 1: null, 2: null, 3: null, 4: null }
                    draft.images.forEach((imgUrl, index) => {
                        if (index < 4) {
                            imageMap[index + 1] = imgUrl // Store URL as string for display
                        }
                    })
                    setImages(imageMap)
                } else {
                    setExistingImages([])
                }

                // Clear sessionStorage after loading
                sessionStorage.removeItem('editingDraft')
            } catch (error) {
                console.error('Error loading draft:', error)
            }
        } else if (productData) {
            try {
                const product = JSON.parse(productData)
                setEditingProductId(product.id)
                setIsEditingPublished(true)
                setIsDraft(false) // Published products are not drafts
                setProductInfo({
                    name: product.name || "",
                    description: product.description || "",
                    mrp: product.mrp || 0,
                    price: product.price || 0,
                    category: product.category || "",
                    brand: product.brand || "",
                    actual_price: product.actual_price || product.mrp || "",
                    offer_price: product.offer_price || product.price || "",
                    cost_price: product.cost_price || "",
                    stock_quantity: product.stock_quantity || 1,
                    low_stock_threshold: product.low_stock_threshold || 5,
                    sku: product.sku || "",
                    commission_rate: product.commission_rate || 0.10,
                })

                // Load existing images if they exist (for editing)
                if (product.images && product.images.length > 0) {
                    setExistingImages(product.images)
                    // Map existing images to the images state for display
                    const imageMap = { 1: null, 2: null, 3: null, 4: null }
                    product.images.forEach((imgUrl, index) => {
                        if (index < 4) {
                            imageMap[index + 1] = imgUrl // Store URL as string for display
                        }
                    })
                    setImages(imageMap)
                } else {
                    setExistingImages([])
                }

                // Clear sessionStorage after loading
                sessionStorage.removeItem('editingProduct')
            } catch (error) {
                console.error('Error loading product:', error)
            }
        }
    }, [])

    const handleImageUpload = (key, file) => {
        setImages(prev => ({ ...prev, [key]: file }))
    }

    const fileToBase64 = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader()
            reader.onloadend = () => {
                const dataUrl = reader.result
                const match = dataUrl.match(/^data:(.+);base64,(.+)$/)
                if (match) resolve({ mimeType: match[1], base64: match[2] })
                else reject(new Error("Invalid image"))
            }
            reader.onerror = () => reject(new Error("Failed to read image"))
            reader.readAsDataURL(file)
        })
    }

    const handleAiGenerate = async () => {
        const imageFiles = [images[1], images[2], images[3], images[4]].filter(Boolean)
        if (!imageFiles.length) {
            toast.error("Please upload at least one product image first")
            return
        }
        setAiLoading(true)
        try {
            const imagePayloads = await Promise.all(imageFiles.map(fileToBase64))
            const token = await getToken()
            const { data } = await axios.post(
                `/api/store/ai/generate${storeTypeParam}`,
                { images: imagePayloads },
                { headers: { Authorization: `Bearer ${token}` } }
            )
            if (!data || (!data.name && !data.description && !data.category)) {
                toast.error("AI could not generate details from the images")
                return
            }
            setProductInfo(prev => ({
                ...prev,
                name: data.name ?? prev.name,
                description: data.description ?? prev.description,
                category: data.category ?? prev.category,
            }))
            toast.success("AI generated product details")
        } catch (error) {
            if (error?.response?.status === 400 && error?.response?.data?.error) {
                toast.error(error.response.data.error)
            } else {
                toast.error(error?.response?.data?.error || error.message || "AI generation failed")
            }
        } finally {
            setAiLoading(false)
        }
    }

    const onSubmitHandler = async (e, publish = false) => {
        e.preventDefault()
        try {
            // For drafts, only name is required
            if (!publish && !productInfo.name) {
                return toast.error('Product name is required to save as draft')
            }

            // For publishing or editing published products, required fields must be filled
            if (publish || isEditingPublished) {
                // Check for images: either new files uploaded OR existing images preserved
                const hasNewImages = Object.values(images).some(img => img instanceof File)
                const hasExistingImages = existingImages.length > 0 && (editingDraftId || editingProductId)

                if (!hasNewImages && !hasExistingImages) {
                    return toast.error('Please upload at least one image')
                }

                if (!productInfo.name || !productInfo.description || !productInfo.category) {
                    return toast.error('Name, description, and category are required')
                }

                // Validation for prices
                const actualPrice = productInfo.actual_price || productInfo.mrp || 0
                const offerPrice = productInfo.offer_price || productInfo.price || 0

                if (!actualPrice || !offerPrice || actualPrice === 0 || offerPrice === 0) {
                    return toast.error('Actual price and offer price are required')
                }

                if (offerPrice > actualPrice) {
                    return toast.error('Offer price must be less than or equal to actual price')
                }

                // Validate stock quantity for publishing
                if (!productInfo.stock_quantity || productInfo.stock_quantity < 1) {
                    return toast.error('Stock quantity is required and must be at least 1')
                }
            }

            // General validations (apply to both draft and publish)
            const actualPrice = productInfo.actual_price || productInfo.mrp || 0
            const offerPrice = productInfo.offer_price || productInfo.price || 0

            if (actualPrice && offerPrice && offerPrice > actualPrice) {
                return toast.error('Offer price must be less than or equal to actual price')
            }

            if (!productInfo.stock_quantity || productInfo.stock_quantity < 1) {
                return toast.error('Stock quantity is required and must be at least 1')
            }

            if (productInfo.commission_rate < 0 || productInfo.commission_rate > 1) {
                return toast.error('Commission rate must be between 0 and 1')
            }

            if (productInfo.cost_price && offerPrice && productInfo.cost_price > offerPrice) {
                return toast.error('Cost price must be less than or equal to offer price')
            }

            setLoading(true)

            const formData = new FormData()
            formData.append('name', productInfo.name)
            if (productInfo.description) formData.append('description', productInfo.description)
            if (productInfo.category) formData.append('category', productInfo.category)
            if (productInfo.brand) formData.append('brand', productInfo.brand)

            // Add productId if editing (draft or published product)
            if (editingDraftId) {
                formData.append('draftId', editingDraftId)
            }
            if (editingProductId) {
                formData.append('productId', editingProductId)
            }

            // Pricing fields (support both old and new)
            if (productInfo.actual_price) formData.append('actual_price', productInfo.actual_price)
            if (productInfo.offer_price) formData.append('offer_price', productInfo.offer_price)
            // Backward compatibility
            if (productInfo.mrp) formData.append('mrp', productInfo.mrp)
            if (productInfo.price) formData.append('price', productInfo.price)

            // New business intelligence fields
            if (productInfo.cost_price) formData.append('cost_price', productInfo.cost_price)
            formData.append('stock_quantity', productInfo.stock_quantity || 1)
            formData.append('low_stock_threshold', productInfo.low_stock_threshold || 5)
            if (productInfo.sku) formData.append('sku', productInfo.sku)
            formData.append('commission_rate', productInfo.commission_rate || 0.10)
            // When editing published product, keep it published (don't change status)
            if (isEditingPublished) {
                formData.append('is_draft', 'false')
                formData.append('status', 'active') // Keep as active
            } else {
                formData.append('is_draft', (!publish).toString())
                formData.append('status', publish ? 'active' : 'draft')
            }

            // Only append new images (file objects), not existing image URLs
            Object.keys(images).forEach((key) => {
                // Check if it's a File object (new upload) vs string URL (existing image)
                if (images[key] && images[key] instanceof File) {
                    formData.append('images', images[key])
                }
            })

            // If editing and no new images uploaded, pass existing images info
            // This applies to both drafts and published products
            if ((editingDraftId || editingProductId) && existingImages.length > 0) {
                // The backend will handle preserving existing images if no new ones are uploaded
                formData.append('preserveExistingImages', 'true')
            }

            const token = await getToken()
            const { data } = await axios.post(`/api/store/product${storeTypeParam}`, formData, { headers: { Authorization: `Bearer ${token}` } })
            toast.success(data.message)

            // Reset form
            setProductInfo({
                name: "",
                description: "",
                mrp: 0,
                price: 0,
                category: "",
                brand: "",
                actual_price: "",
                offer_price: "",
                cost_price: "",
                stock_quantity: 1,
                low_stock_threshold: 5,
                sku: "",
                commission_rate: 0.10,
            })
            setImages({ 1: null, 2: null, 3: null, 4: null })
            setExistingImages([])
            setIsDraft(true)
            setEditingDraftId(null)
            setEditingProductId(null)
            setIsEditingPublished(false)

            // Redirect after save
            if (isEditingPublished) {
                // If editing published product, redirect to manage-product page
                setTimeout(() => {
                    router.push(`${isFashion ? '/fashion/store' : '/store'}/manage-product`)
                }, 1000)
            } else if (publish && editingDraftId) {
                // If published draft, redirect to drafts page
                setTimeout(() => {
                    router.push(`${isFashion ? '/fashion/store' : '/store'}/drafts`)
                }, 1000)
            }
        } catch (error) {
            const msg = error?.response?.data?.error || error.message
            toast.error(typeof msg === "string" ? msg : "Failed to add product")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-full pb-12">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-1">
                <h1 className="text-2xl sm:text-3xl font-bold text-zinc-100">
                    {(editingDraftId || editingProductId) ? 'Edit' : 'Add New'} <span className={accentText}>Product</span>
                </h1>
                {!isEditingPublished && (
                    <Link
                        href={`${isFashion ? '/fashion/store' : '/store'}/drafts`}
                        className={`px-4 py-2 text-sm font-medium rounded-xl transition ${accentBadge} hover:opacity-80`}
                    >
                        Drafts
                    </Link>
                )}
            </div>
            <p className="text-sm text-zinc-500 mb-8">
                {isEditingPublished
                    ? 'Edit your published product'
                    : editingDraftId
                        ? 'Edit your product draft'
                        : 'Create a new product listing for your store'}
            </p>

            <form onSubmit={e => { e.preventDefault(); }} className="space-y-8">
                {/* Product Images – top card */}
                <section className="rounded-xl bg-zinc-900/80 border border-zinc-700/60 p-6 sm:p-8">
                    <h2 className="text-lg font-semibold text-zinc-200 mb-1">Product Images</h2>
                    <p className="text-sm text-zinc-500 mb-6">Upload at least one image (max 4)</p>
                    <div className="flex flex-wrap gap-4">
                        {Object.keys(images).map((key) => {
                            const imageValue = images[key]
                            const imageSrc = imageValue
                                ? (imageValue instanceof File
                                    ? URL.createObjectURL(imageValue)
                                    : imageValue) // If it's a string URL (existing image)
                                : assets.upload_area

                            return (
                                <label key={key} htmlFor={`images${key}`} className="cursor-pointer relative group">
                                    <div className={`w-28 h-28 sm:w-32 sm:h-32 rounded-xl border-2 border-dashed border-zinc-600 ${accentBorderHover} bg-zinc-800/60 flex items-center justify-center overflow-hidden transition-colors relative`}>
                                        <Image
                                            width={128}
                                            height={128}
                                            className="w-full h-full object-cover"
                                            src={imageSrc}
                                            alt=""
                                        />
                                        {imageValue && !(imageValue instanceof File) && (
                                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                <span className="text-xs text-white px-2 py-1 bg-zinc-800 rounded">Click to replace</span>
                                            </div>
                                        )}
                                    </div>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        id={`images${key}`}
                                        onChange={e => handleImageUpload(key, e.target.files[0])}
                                        className="sr-only"
                                    />
                                </label>
                            )
                        })}
                    </div>
                    {existingImages.length > 0 && editingDraftId && (
                        <p className="text-xs text-zinc-500 mt-2">
                            {existingImages.length} existing image(s) will be preserved. Upload new images to replace them.
                        </p>
                    )}
                </section>

                {/* Product Details – left content, AI button right of description */}
                <section className="rounded-xl bg-zinc-900/80 border border-zinc-700/60 p-6 sm:p-8">
                    <h2 className="text-lg font-semibold text-zinc-200 mb-6">Product Details</h2>
                    <div className="space-y-6 max-w-2xl">
                        <label className="block">
                            <span className="text-sm font-medium text-zinc-400 mb-2 block">Name</span>
                            <input
                                type="text"
                                name="name"
                                onChange={onChangeHandler}
                                value={productInfo.name}
                                placeholder="Enter product name"
                                className={`w-full px-4 py-3 rounded-xl bg-zinc-800 border border-zinc-600 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 ${accentRing} ${accentBorder} text-sm`}
                                required
                            />
                        </label>
                        <div className="block">
                            <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
                                <span className="text-sm font-medium text-zinc-400">Description</span>
                                <button
                                    type="button"
                                    onClick={handleAiGenerate}
                                    disabled={aiLoading}
                                    className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl ${accentBadge} transition disabled:opacity-60 disabled:cursor-not-allowed`}
                                >
                                    <Sparkles size={16} className={aiLoading ? "animate-pulse" : ""} />
                                    {aiLoading ? "Generating…" : "AI Generate"}
                                </button>
                            </div>
                            <textarea
                                name="description"
                                onChange={onChangeHandler}
                                value={productInfo.description}
                                placeholder="Write a short product description"
                                rows={5}
                                className={`w-full px-4 py-3 rounded-xl bg-zinc-800 border border-zinc-600 text-zinc-100 placeholder-zinc-500 resize-none focus:outline-none focus:ring-2 ${accentRing} ${accentBorder} text-sm min-h-[120px]`}
                                required
                            />
                        </div>
                    </div>
                </section>

                {/* Pricing – isolated, never touched by AI */}
                <section className="rounded-xl bg-zinc-900/80 border border-zinc-700/60 p-6 sm:p-8">
                    <h2 className="text-lg font-semibold text-zinc-200 mb-6">Pricing</h2>
                    <div className="space-y-6">
                        <div className="flex flex-wrap gap-8">
                            <label className="block w-full sm:w-auto sm:min-w-[140px]">
                                <span className="text-sm font-medium text-zinc-400 mb-2 block">Actual Price (₹)</span>
                                <input
                                    type="number"
                                    name="actual_price"
                                    onChange={onChangeHandler}
                                    value={productInfo.actual_price || ""}
                                    placeholder="Set actual price"
                                    min="0"
                                    step="0.01"
                                    className={`w-full sm:w-36 px-4 py-3 rounded-xl bg-zinc-800 border border-zinc-600 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 ${accentRing} text-sm`}
                                    required
                                />
                            </label>
                            <label className="block w-full sm:w-auto sm:min-w-[140px]">
                                <span className="text-sm font-medium text-zinc-400 mb-2 block">Offer Price (₹)</span>
                                <input
                                    type="number"
                                    name="offer_price"
                                    onChange={onChangeHandler}
                                    value={productInfo.offer_price || ""}
                                    placeholder="Set offer price"
                                    min="0"
                                    step="0.01"
                                    className={`w-full sm:w-36 px-4 py-3 rounded-xl bg-zinc-800 border border-zinc-600 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 ${accentRing} text-sm`}
                                    required
                                />
                            </label>
                        </div>
                        <label className="block w-full sm:w-auto sm:min-w-[140px]">
                            <span className="text-sm font-medium text-zinc-400 mb-2 block">Cost Price (₹) <span className="text-zinc-500 text-xs">(Optional)</span></span>
                            <input
                                type="number"
                                name="cost_price"
                                onChange={onChangeHandler}
                                value={productInfo.cost_price || ""}
                                placeholder="Your cost"
                                min="0"
                                step="0.01"
                                className={`w-full sm:w-36 px-4 py-3 rounded-xl bg-zinc-800 border border-zinc-600 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 ${accentRing} text-sm`}
                            />
                        </label>
                        <label className="block w-full sm:w-auto sm:min-w-[140px]">
                            <span className="text-sm font-medium text-zinc-400 mb-2 block">Commission Rate</span>
                            <input
                                type="number"
                                name="commission_rate"
                                onChange={onChangeHandler}
                                value={productInfo.commission_rate || 0.10}
                                placeholder="0.10"
                                min="0"
                                max="1"
                                step="0.01"
                                className={`w-full sm:w-36 px-4 py-3 rounded-xl bg-zinc-800 border border-zinc-600 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 ${accentRing} text-sm`}
                            />
                            <span className="text-xs text-zinc-500 mt-1 block">Default: 10% (0.10)</span>
                        </label>
                        {/* Live Preview */}
                        {(productInfo.offer_price || productInfo.price) && (
                            <div className="mt-4 p-4 rounded-xl bg-zinc-800/60 border border-zinc-700/40">
                                <h3 className="text-sm font-semibold text-zinc-300 mb-3">Earnings Preview</h3>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-zinc-400">Commission Amount:</span>
                                        <span className="text-zinc-200">₹{preview.commissionAmount}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-zinc-400">Net Earnings:</span>
                                        <span className="text-green-400 font-medium">₹{preview.netEarnings}</span>
                                    </div>
                                    {preview.netProfit !== null && (
                                        <div className="flex justify-between pt-2 border-t border-zinc-700">
                                            <span className="text-zinc-400">Net Profit:</span>
                                            <span className={`font-medium ${Number(preview.netProfit) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                ₹{preview.netProfit}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </section>

                {/* Inventory */}
                <section className="rounded-xl bg-zinc-900/80 border border-zinc-700/60 p-6 sm:p-8">
                    <h2 className="text-lg font-semibold text-zinc-200 mb-6">Inventory</h2>
                    <div className="flex flex-wrap gap-8">
                        <label className="block w-full sm:w-auto sm:min-w-[140px]">
                            <span className="text-sm font-medium text-zinc-400 mb-2 block">Stock Quantity</span>
                            <input
                                type="number"
                                name="stock_quantity"
                                onChange={onChangeHandler}
                                value={productInfo.stock_quantity || ""}
                                placeholder="1"
                                min="1"
                                step="1"
                                className={`w-full sm:w-36 px-4 py-3 rounded-xl bg-zinc-800 border border-zinc-600 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 ${accentRing} text-sm`}
                                required
                            />
                        </label>
                        <label className="block w-full sm:w-auto sm:min-w-[140px]">
                            <span className="text-sm font-medium text-zinc-400 mb-2 block">Low Stock Threshold</span>
                            <input
                                type="number"
                                name="low_stock_threshold"
                                onChange={onChangeHandler}
                                value={productInfo.low_stock_threshold || ""}
                                placeholder="5"
                                min="0"
                                step="1"
                                className={`w-full sm:w-36 px-4 py-3 rounded-xl bg-zinc-800 border border-zinc-600 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 ${accentRing} text-sm`}
                            />
                        </label>
                        <label className="block w-full sm:w-auto sm:min-w-[200px]">
                            <span className="text-sm font-medium text-zinc-400 mb-2 block">SKU <span className="text-zinc-500 text-xs">(Optional)</span></span>
                            <input
                                type="text"
                                name="sku"
                                onChange={onChangeHandler}
                                value={productInfo.sku || ""}
                                placeholder="Product SKU"
                                className={`w-full px-4 py-3 rounded-xl bg-zinc-800 border border-zinc-600 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 ${accentRing} text-sm`}
                            />
                        </label>
                    </div>
                </section>

                {/* Category */}
                <section className="rounded-xl bg-zinc-900/80 border border-zinc-700/60 p-6 sm:p-8">
                    <h2 className="text-lg font-semibold text-zinc-200 mb-4">Category</h2>
                    <select
                        onChange={e => setProductInfo({ ...productInfo, category: e.target.value })}
                        value={productInfo.category}
                        className={`w-full max-w-md px-4 py-3 rounded-xl bg-zinc-800 border border-zinc-600 text-zinc-100 focus:outline-none focus:ring-2 ${accentRing} ${accentBorder} text-sm`}
                        required
                    >
                        <option value="">Select category</option>
                        {categories.map((category) => (
                            <option key={category} value={category}>{category}</option>
                        ))}
                    </select>
                </section>

                {/* Brand - Hidden for Fashion */}
                {!isFashion && (
                    <section className="rounded-xl bg-zinc-900/80 border border-zinc-700/60 p-6 sm:p-8">
                        <h2 className="text-lg font-semibold text-zinc-200 mb-4">Brand</h2>
                        <select
                            onChange={e => setProductInfo({ ...productInfo, brand: e.target.value })}
                            value={productInfo.brand}
                            className={`w-full max-w-md px-4 py-3 rounded-xl bg-zinc-800 border border-zinc-600 text-zinc-100 focus:outline-none focus:ring-2 ${accentRing} ${accentBorder} text-sm`}
                        >
                            <option value="">Select brand (optional)</option>
                            {PRODUCT_BRANDS.map((brandName) => (
                                <option key={brandName} value={brandName}>{brandName}</option>
                            ))}
                        </select>
                    </section>
                )}

                <div className="pt-2 flex flex-wrap gap-4">
                    {!isEditingPublished && (
                        <button
                            type="button"
                            onClick={(e) => onSubmitHandler(e, false)}
                            disabled={loading}
                            className={`px-8 py-3 text-sm font-semibold text-zinc-100 rounded-xl transition shadow-lg disabled:opacity-60 disabled:cursor-not-allowed bg-zinc-700 hover:bg-zinc-600 border border-zinc-600`}
                        >
                            {loading ? "Saving…" : "Save as Draft"}
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={(e) => onSubmitHandler(e, !isEditingPublished)}
                        disabled={loading}
                        className={`px-8 py-3 text-sm font-semibold text-zinc-900 rounded-xl transition shadow-lg disabled:opacity-60 disabled:cursor-not-allowed ${accentButton}`}
                    >
                        {loading
                            ? (isEditingPublished ? "Saving…" : "Publishing…")
                            : (isEditingPublished ? "Save Changes" : "Publish Product")}
                    </button>
                </div>
            </form>
        </div>
    )
}
