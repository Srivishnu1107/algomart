'use client'
import { assets } from "@/assets/assets"
import { useEffect, useState } from "react"
import Image from "next/image"
import toast from "react-hot-toast"
import Loading from "@/components/Loading"
import { useAuth, useUser } from "@clerk/nextjs"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import axios from "axios"
import StoreCover from "@/components/StoreCover"

const INITIAL_STORE = { username: "", name: "", description: "", email: "", contact: "", address: "", image: "", banner: null }

/** Pick only known form fields from API store; ignore unknown keys */
function normalizeStoreForForm(store) {
    if (!store || typeof store !== "object") return { ...INITIAL_STORE }
    return {
        username: store.username != null ? String(store.username) : "",
        name: store.name != null ? String(store.name) : "",
        description: store.description != null ? String(store.description) : "",
        email: store.email != null ? String(store.email) : "",
        contact: store.contact != null ? String(store.contact) : "",
        address: store.address != null ? String(store.address) : "",
        image: store.logo != null ? store.logo : "",
        banner: store.banner != null ? store.banner : null
    }
}

export default function CreateStoreClient() {

    const { user } = useUser()
    const router = useRouter()
    const searchParams = useSearchParams()
    const { getToken } = useAuth()
    const storeType = "electronics"
    const isEditMode = searchParams.get("edit") === "1"

    const [alreadySubmitted, setAlreadySubmitted] = useState(false)
    const [status, setStatus] = useState("")
    const [loading, setLoading] = useState(true)
    const [message, setMessage] = useState("")
    const [storeInfo, setStoreInfo] = useState({ ...INITIAL_STORE })

    const onChangeHandler = (e) => {
        setStoreInfo({ ...storeInfo, [e.target.name]: e.target.value })
    }

    const fetchSellerStatus = async () => {
        try {
            const token = await getToken()
            if (!token) {
                setLoading(false)
                return
            }
            const { data } = await axios.get(`/api/store/create?type=${storeType}`, { headers: { Authorization: `Bearer ${token}` } })
            if (data && ["approved", "rejected", "pending"].includes(data.status)) {
                setStatus(data.status)
                if (isEditMode && (data.status === "approved" || data.status === "pending") && data.store) {
                    setStoreInfo(normalizeStoreForForm(data.store))
                    setAlreadySubmitted(false)
                } else {
                    setAlreadySubmitted(true)
                    switch (data.status) {
                        case "approved":
                            setMessage("Your store has been approved, you can now add products to your store from dashboard")
                            if (!isEditMode) setTimeout(() => router.push("/store"), 5000)
                            break
                        case "rejected":
                            setMessage("Your store request has been rejected, contact the admin for more details")
                            break
                        case "pending":
                            setMessage("Your store request is pending, please wait for admin to approve your store")
                            break
                        default:
                            break
                    }
                }
            } else {
                setAlreadySubmitted(false)
            }
        } catch (error) {
            toast.error(error?.response?.data?.error || error.message || "Failed to load status")
        } finally {
            setLoading(false)
        }
    }

    const onSubmitHandler = async (e) => {
        e.preventDefault()
        if (!user) {
            toast.error("Please login to continue")
            return
        }
        const { name, description, email, contact, address, image, banner } = storeInfo
        if (!name?.trim() || !description?.trim() || !email?.trim() || !contact?.trim() || !address?.trim()) {
            toast.error("Please fill in all required fields.")
            return
        }
        const hasNewLogo = image && typeof image === "object" && image instanceof File && image.size > 0
        if (!isEditMode && !hasNewLogo) {
            toast.error("Please upload a store logo image.")
            return
        }
        try {
            const token = await getToken()
            if (!token) {
                toast.error("Session expired. Please sign in again.")
                return
            }
            const formData = new FormData()
            formData.append("name", name.trim())
            formData.append("description", description.trim())
            formData.append("email", email.trim())
            formData.append("contact", contact.trim())
            formData.append("address", address.trim())
            if (hasNewLogo) formData.append("image", image)
            if (banner && typeof banner === "object" && banner instanceof File && banner.size > 0) formData.append("banner", banner)
            formData.append("storeType", storeType)

            if (isEditMode) {
                const { data } = await axios.patch("/api/store/update", formData, { headers: { Authorization: `Bearer ${token}` } })
                toast.success(data?.message || "Store updated successfully.")
                if (data?.username) {
                    router.push(`/shop/${data.username}`)
                } else {
                    await fetchSellerStatus()
                }
            } else {
                const { data } = await axios.post("/api/store/create", formData, { headers: { Authorization: `Bearer ${token}` } })
                toast.success(data?.message || "Application submitted. We'll review it shortly.")
                await fetchSellerStatus()
            }
        } catch (error) {
            const msg = error?.response?.data?.error || error?.message || "Submission failed. Please try again."
            toast.error(typeof msg === "string" ? msg : "Submission failed. Please try again.")
        }
    }

    useEffect(() => {
        if (user) fetchSellerStatus()
    }, [user, isEditMode])

    if(!user){
        return (
            <div className="min-h-[80vh] mx-6 flex items-center justify-center text-zinc-400 bg-[#0a0a0b]">
                <h1 className="text-2xl sm:text-4xl font-semibold">Please <span className="text-zinc-500">Login</span> to continue</h1>
            </div>
        )
    }

    return !loading ? (
        <div className="min-h-screen bg-[#0a0a0b]">
            {!alreadySubmitted ? (
                <div className="mx-4 sm:mx-6 py-12">
                    <form onSubmit={e => toast.promise(onSubmitHandler(e), { loading: isEditMode ? "Saving..." : "Submitting data..." })} className="max-w-4xl mx-auto space-y-8">
                        <div className="rounded-2xl border border-zinc-700/60 bg-zinc-900/70 p-8 sm:p-10">
                            <p className="text-xs uppercase tracking-[0.3em] text-teal-300 mb-3">{isEditMode ? "Store Profile" : "Seller Onboarding"}</p>
                            <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3">{isEditMode ? "Edit your electronics store" : "Create your electronics store"}</h1>
                            <p className="text-sm text-zinc-400 max-w-2xl">
                                {isEditMode ? "Update your store details below. Changes are saved immediately." : "Submit your store details for review. Once approved, you can add products and start selling."}
                            </p>
                        </div>

                        {/* Profile preview — StoreCover */}
                        <StoreCover
                            cover={typeof storeInfo.banner === "object" && storeInfo.banner instanceof File ? URL.createObjectURL(storeInfo.banner) : (storeInfo.banner || null)}
                            logo={typeof storeInfo.image === "object" && storeInfo.image instanceof File ? URL.createObjectURL(storeInfo.image) : (storeInfo.image || null)}
                            name={storeInfo.name || "Store Name"}
                            subtitle="This is how your store profile will look. Add a cover and circular logo below."
                        />

                        <div className="rounded-2xl border border-zinc-700/60 bg-zinc-900/70 p-8 sm:p-10 space-y-6">
                            <div>
                                <p className="text-xs font-semibold text-zinc-500 mb-2">Store Type</p>
                                <span className="inline-flex items-center px-4 py-2 text-xs font-semibold uppercase tracking-wide rounded-full bg-teal-500/15 text-teal-300 border border-teal-500/30">
                                    {storeType}
                                </span>
                            </div>

                            <label className="flex items-center gap-5 cursor-pointer">
                                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden border-2 border-zinc-700 bg-zinc-800 flex-shrink-0 flex items-center justify-center">
                                    {storeInfo.image && (typeof storeInfo.image === "object" && storeInfo.image instanceof File) ? (
                                        <Image src={URL.createObjectURL(storeInfo.image)} alt="Logo" width={96} height={96} className="w-full h-full object-cover" />
                                    ) : typeof storeInfo.image === "string" && storeInfo.image ? (
                                        <Image src={storeInfo.image} alt="Logo" width={96} height={96} className="w-full h-full object-cover" />
                                    ) : (
                                        <Image src={assets.upload_area} alt="" width={48} height={48} className="opacity-60" />
                                    )}
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-zinc-200">Store Logo (circular)</p>
                                    <p className="text-xs text-zinc-500">{isEditMode ? "Upload a new logo or keep the current one." : "Upload a square image; it will display as a circle on your store."}</p>
                                </div>
                                <input type="file" accept="image/*" onChange={(e) => setStoreInfo({ ...storeInfo, image: e.target.files[0] ?? (isEditMode && typeof storeInfo.image === "string" ? storeInfo.image : "") })} hidden />
                            </label>

                            <div>
                                <p className="text-xs font-semibold text-zinc-500 mb-2">Store Name</p>
                                <input name="name" onChange={onChangeHandler} value={storeInfo.name} type="text" placeholder="John's store" className="w-full rounded-xl bg-zinc-800 border border-zinc-700 text-zinc-100 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-teal-500/40" />
                            </div>

                            <label className="block">
                                <p className="text-xs font-semibold text-zinc-500 mb-2">Store Cover Photo (optional)</p>
                                <p className="text-xs text-zinc-500 mb-2">A wide banner at the top of your store page. Recommended: 1920×480 or similar.</p>
                                <div className="flex items-center gap-4 rounded-xl border border-zinc-700 border-dashed p-4 bg-zinc-800/50 hover:bg-zinc-800/80 transition cursor-pointer">
                                    {storeInfo.banner && (typeof storeInfo.banner === "object" && storeInfo.banner instanceof File) ? (
                                        <Image src={URL.createObjectURL(storeInfo.banner)} alt="Banner preview" width={240} height={60} className="rounded-lg object-cover h-16 w-full max-w-[240px]" />
                                    ) : typeof storeInfo.banner === "string" && storeInfo.banner ? (
                                        <Image src={storeInfo.banner} alt="Banner preview" width={240} height={60} className="rounded-lg object-cover h-16 w-full max-w-[240px]" />
                                    ) : (
                                        <div className="h-16 w-60 rounded-lg bg-zinc-700/50 flex items-center justify-center text-zinc-500 text-xs">No cover image</div>
                                    )}
                                    <div>
                                        <span className="text-sm font-medium text-teal-300">Upload cover image</span>
                                        <span className="text-xs text-zinc-500 block">or leave empty</span>
                                    </div>
                                    <input type="file" accept="image/*" onChange={(e) => setStoreInfo({ ...storeInfo, banner: e.target.files[0] || storeInfo.banner || null })} className="hidden" />
                                </div>
                            </label>

                            <div>
                                <p className="text-xs font-semibold text-zinc-500 mb-2">Description</p>
                                <textarea name="description" onChange={onChangeHandler} value={storeInfo.description} rows={4} placeholder="Tell customers about your store" className="w-full rounded-xl bg-zinc-800 border border-zinc-700 text-zinc-100 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-teal-500/40 resize-none" />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                <div>
                                    <p className="text-xs font-semibold text-zinc-500 mb-2">Email</p>
                                    <input name="email" onChange={onChangeHandler} value={storeInfo.email} type="email" placeholder="store@email.com" className="w-full rounded-xl bg-zinc-800 border border-zinc-700 text-zinc-100 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-teal-500/40" />
                                </div>
                                <div>
                                    <p className="text-xs font-semibold text-zinc-500 mb-2">Contact Number</p>
                                    <input name="contact" onChange={onChangeHandler} value={storeInfo.contact} type="text" placeholder="+1 555 000 1234" className="w-full rounded-xl bg-zinc-800 border border-zinc-700 text-zinc-100 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-teal-500/40" />
                                </div>
                            </div>

                            <div>
                                <p className="text-xs font-semibold text-zinc-500 mb-2">Address</p>
                                <textarea name="address" onChange={onChangeHandler} value={storeInfo.address} rows={3} placeholder="Store address" className="w-full rounded-xl bg-zinc-800 border border-zinc-700 text-zinc-100 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-teal-500/40 resize-none" />
                            </div>
                        </div>

                        <div className="flex items-center justify-between gap-4 flex-wrap">
                            {!isEditMode && <p className="text-xs text-zinc-500">Applications are reviewed within 1–2 business days.</p>}
                            {isEditMode && <span />}
                            <div className="flex items-center gap-3">
                                {isEditMode && (
                                    <Link
                                        href={storeInfo.username ? `/shop/${storeInfo.username}` : "/store"}
                                        className="px-6 py-3 text-sm font-semibold text-zinc-300 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-xl transition"
                                    >
                                        Cancel
                                    </Link>
                                )}
                                <button type="submit" className="px-8 py-3 text-sm font-semibold text-zinc-900 bg-teal-400 hover:bg-teal-300 rounded-xl transition shadow-lg shadow-teal-500/20 active:scale-[0.98]">
                                    {isEditMode ? "Save changes" : "Submit Application"}
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
            ) : (
                <div className="min-h-[80vh] flex flex-col items-center justify-center text-center px-6">
                    <p className="sm:text-2xl lg:text-3xl font-semibold text-zinc-200 max-w-2xl">{message}</p>
                    {status === "approved" && <p className="mt-4 text-sm text-zinc-500">Redirecting to dashboard in <span className="font-semibold">5 seconds</span></p>}
                    {status === "rejected" && (
                        <button
                            type="button"
                            onClick={() => {
                                setAlreadySubmitted(false)
                                setStatus("")
                                setMessage("")
                            }}
                            className="mt-4 text-sm font-semibold text-[#8B6914] hover:text-[#7a5c12] transition"
                        >
                            Re apply?
                        </button>
                    )}
                </div>
            )}
        </div>
    ) : (<Loading />)
}
