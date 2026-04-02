'use client'
import { useEffect, useState } from "react"
import { toast } from "react-hot-toast"
import Image from "next/image"
import Loading from "@/components/Loading"
import { useAuth, useUser } from "@clerk/nextjs"
import axios from "axios"
import { Trash2, Edit } from "lucide-react"
import { usePathname, useRouter } from "next/navigation"
import Link from "next/link"

export default function StoreDrafts() {
    const { getToken } = useAuth()
    const { user } = useUser()
    const pathname = usePathname()
    const router = useRouter()
    const isFashion = pathname?.startsWith('/fashion')
    const storeTypeParam = isFashion ? '?type=fashion' : ''
    const accentText = isFashion ? 'text-[#8B6914]' : 'text-teal-400'
    const accentButton = isFashion ? 'bg-[#8B6914] hover:bg-[#7a5c12] shadow-[#8B6914]/20' : 'bg-teal-400 hover:bg-teal-300 shadow-teal-500/20'
    const accentBadge = isFashion ? 'bg-[#8B6914]/20 text-[#8B6914] border-[#8B6914]/40' : 'bg-teal-500/20 text-teal-400 border-teal-500/40'

    const currency = process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || '₹'

    const [loading, setLoading] = useState(true)
    const [drafts, setDrafts] = useState([])
    const [deleteModal, setDeleteModal] = useState({ open: false, draft: null })
    const [clearAllModal, setClearAllModal] = useState(false)

    const fetchDrafts = async () => {
        try {
            const token = await getToken()
            const { data } = await axios.get(`/api/store/product/drafts${storeTypeParam}`, { headers: { Authorization: `Bearer ${token}` } })
            const sorted = (data.drafts || []).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            setDrafts(sorted)
        } catch (error) {
            toast.error(error?.response?.data?.error || error.message)
        }
        setLoading(false)
    }

    const openDeleteModal = (draft) => setDeleteModal({ open: true, draft })
    const closeDeleteModal = () => setDeleteModal({ open: false, draft: null })

    const confirmDelete = async () => {
        if (!deleteModal.draft) return
        const draftId = deleteModal.draft.id
        try {
            const token = await getToken()
            await axios.delete(`/api/store/product/drafts?draftId=${draftId}${storeTypeParam ? '&type=fashion' : ''}`, { headers: { Authorization: `Bearer ${token}` } })
            setDrafts(prev => prev.filter(d => d.id !== draftId))
            toast.success('Draft deleted')
            closeDeleteModal()
        } catch (error) {
            toast.error(error?.response?.data?.error || error.message)
        }
    }

    const handleEdit = (draft) => {
        // Store draft data in sessionStorage and navigate to add-product
        sessionStorage.setItem('editingDraft', JSON.stringify(draft))
        router.push(`${isFashion ? '/fashion/store' : '/store'}/add-product`)
    }

    const handleClearAll = async () => {
        try {
            const token = await getToken()
            const { data } = await axios.delete(`/api/store/product/drafts?deleteAll=true${storeTypeParam ? '&type=fashion' : ''}`, { headers: { Authorization: `Bearer ${token}` } })
            setDrafts([])
            toast.success(data.message || 'All drafts cleared')
            setClearAllModal(false)
        } catch (error) {
            toast.error(error?.response?.data?.error || error.message)
        }
    }

    useEffect(() => {
        if (user) fetchDrafts()
    }, [user])

    if (loading) return <Loading />

    return (
        <div className="min-h-full pb-12">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-1">
                <h1 className="text-2xl sm:text-3xl font-bold text-zinc-100">
                    Product <span className={accentText}>Drafts</span>
                </h1>
                <div className="flex gap-3">
                    {drafts.length > 0 && (
                        <button
                            onClick={() => setClearAllModal(true)}
                            className="px-4 py-2 text-sm font-medium rounded-xl transition bg-red-500/20 text-red-400 border border-red-500/40 hover:bg-red-500/30"
                        >
                            Clear All
                        </button>
                    )}
                    <Link 
                        href={`${isFashion ? '/fashion/store' : '/store'}/add-product`}
                        className={`px-4 py-2 text-sm font-medium rounded-xl transition ${accentBadge} hover:opacity-80`}
                    >
                        Add Product
                    </Link>
                </div>
            </div>
            <p className="text-sm text-zinc-500 mb-8">Manage your saved product drafts</p>

            <div className="rounded-xl border border-zinc-700/60 bg-zinc-900/80 overflow-hidden">
                {drafts.length === 0 ? (
                    <div className="px-6 py-12 text-center text-zinc-500">
                        <p className="mb-4">No drafts saved yet</p>
                        <Link 
                            href={`${isFashion ? '/fashion/store' : '/store'}/add-product`}
                            className={`inline-block px-6 py-2 text-sm font-medium rounded-xl transition ${accentButton} text-zinc-900`}
                        >
                            Create Your First Draft
                        </Link>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead>
                                <tr className="border-b border-zinc-700/60 bg-zinc-800/50">
                                    <th className="px-4 py-4 font-semibold text-zinc-300 uppercase tracking-wider">Product</th>
                                    <th className="px-4 py-4 font-semibold text-zinc-300 uppercase tracking-wider hidden md:table-cell">Description</th>
                                    <th className="px-4 py-4 font-semibold text-zinc-300 uppercase tracking-wider hidden md:table-cell">Price</th>
                                    <th className="px-4 py-4 font-semibold text-zinc-300 uppercase tracking-wider">Status</th>
                                    <th className="px-4 py-4 font-semibold text-zinc-300 uppercase tracking-wider">Created</th>
                                    <th className="px-4 py-4 font-semibold text-zinc-300 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-700/50">
                                {drafts.map((draft) => (
                                    <tr key={draft.id} className="hover:bg-zinc-800/30 transition-colors">
                                        <td className="px-4 py-4">
                                            <div className="flex gap-3 items-center">
                                                {draft.images && draft.images.length > 0 ? (
                                                    <Image width={48} height={48} className="rounded-lg object-cover flex-shrink-0" src={draft.images[0]} alt="" />
                                                ) : (
                                                    <div className="w-12 h-12 rounded-lg bg-zinc-800 flex items-center justify-center flex-shrink-0">
                                                        <span className="text-zinc-600 text-xs">No Image</span>
                                                    </div>
                                                )}
                                                <div>
                                                    <p className="font-medium text-zinc-200">{draft.name || 'Untitled Product'}</p>
                                                    {draft.sku && (
                                                        <span className="text-xs text-zinc-500 mt-1">SKU: {draft.sku}</span>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-4 max-w-xs text-zinc-500 hidden md:table-cell truncate">
                                            {draft.description || <span className="text-zinc-600 italic">No description</span>}
                                        </td>
                                        <td className="px-4 py-4 text-zinc-400 hidden md:table-cell">
                                            {draft.offer_price || draft.price ? (
                                                <>
                                                    {draft.actual_price || draft.mrp ? (
                                                        <>
                                                            <span className="line-through text-zinc-600 mr-2">{currency}{(draft.actual_price || draft.mrp).toLocaleString()}</span>
                                                            <span className="font-medium text-zinc-200">{currency}{(draft.offer_price || draft.price).toLocaleString()}</span>
                                                        </>
                                                    ) : (
                                                        <span className="font-medium text-zinc-200">{currency}{(draft.offer_price || draft.price).toLocaleString()}</span>
                                                    )}
                                                </>
                                            ) : (
                                                <span className="text-zinc-600 italic">Not set</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-4">
                                            <span className={`inline-block px-2 py-1 text-xs font-medium rounded-md ${accentBadge}`}>
                                                {draft.status || 'draft'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-4 text-zinc-500 text-xs">
                                            {new Date(draft.createdAt).toLocaleDateString()}
                                        </td>
                                        <td className="px-4 py-4">
                                            <div className="flex gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => handleEdit(draft)}
                                                    className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-zinc-300 hover:text-zinc-100 hover:bg-zinc-700 rounded-lg border border-zinc-600 transition"
                                                >
                                                    <Edit size={16} />
                                                    Edit
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => openDeleteModal(draft)}
                                                    className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg border border-red-500/30 transition"
                                                >
                                                    <Trash2 size={16} />
                                                    Delete
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Delete confirmation modal */}
            {deleteModal.open && deleteModal.draft && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={closeDeleteModal}>
                    <div className="bg-zinc-900 border border-zinc-700 rounded-xl shadow-xl max-w-md w-full mx-4 p-6" onClick={e => e.stopPropagation()}>
                        <h3 className="text-lg font-semibold text-zinc-100 mb-2">Delete draft?</h3>
                        <p className="text-sm text-zinc-400 mb-4">
                            &ldquo;{deleteModal.draft.name || 'Untitled Product'}&rdquo; will be permanently removed. This cannot be undone.
                        </p>
                        <div className="flex gap-3 justify-end">
                            <button
                                type="button"
                                onClick={closeDeleteModal}
                                className="px-4 py-2 text-sm font-medium text-zinc-300 bg-zinc-700 hover:bg-zinc-600 rounded-lg transition"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={confirmDelete}
                                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-500 rounded-lg transition"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Clear all drafts confirmation modal */}
            {clearAllModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setClearAllModal(false)}>
                    <div className="bg-zinc-900 border border-zinc-700 rounded-xl shadow-xl max-w-md w-full mx-4 p-6" onClick={e => e.stopPropagation()}>
                        <h3 className="text-lg font-semibold text-zinc-100 mb-2">Clear all drafts?</h3>
                        <p className="text-sm text-zinc-400 mb-4">
                            All {drafts.length} draft(s) will be permanently removed. This cannot be undone.
                        </p>
                        <div className="flex gap-3 justify-end">
                            <button
                                type="button"
                                onClick={() => setClearAllModal(false)}
                                className="px-4 py-2 text-sm font-medium text-zinc-300 bg-zinc-700 hover:bg-zinc-600 rounded-lg transition"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleClearAll}
                                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-500 rounded-lg transition"
                            >
                                Clear All
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
