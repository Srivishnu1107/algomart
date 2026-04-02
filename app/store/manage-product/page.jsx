'use client'
import { useEffect, useState } from "react"
import { toast } from "react-hot-toast"
import Image from "next/image"
import Loading from "@/components/Loading"
import { useAuth, useUser } from "@clerk/nextjs"
import axios from "axios"
import { Trash2, Edit } from "lucide-react"
import { usePathname, useRouter } from "next/navigation"

export default function StoreManageProducts() {
    const { getToken } = useAuth()
    const { user } = useUser()
    const pathname = usePathname()
    const router = useRouter()
    const isFashion = pathname?.startsWith('/fashion')
    const storeTypeParam = isFashion ? '?type=fashion' : ''
    const accentText = isFashion ? 'text-[#8B6914]' : 'text-teal-400'
    const accentToggle = isFashion ? 'peer-checked:bg-[#8B6914]/80' : 'peer-checked:bg-teal-500/80'
    const accentButton = isFashion ? 'bg-[#8B6914] hover:bg-[#7a5c12] shadow-[#8B6914]/20' : 'bg-teal-400 hover:bg-teal-300 shadow-teal-500/20'

    const currency = process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || '₹'

    const [loading, setLoading] = useState(true)
    const [products, setProducts] = useState([])
    const [deleteModal, setDeleteModal] = useState({ open: false, product: null })

    const fetchProducts = async () => {
        try {
            const token = await getToken()
            const { data } = await axios.get(`/api/store/product${storeTypeParam}`, { headers: { Authorization: `Bearer ${token}` } })
            const sorted = (data.products || []).sort((a, b) => {
                const aFirst = a.inStock ? 1 : 0
                const bFirst = b.inStock ? 1 : 0
                if (bFirst !== aFirst) return bFirst - aFirst
                return new Date(b.createdAt) - new Date(a.createdAt)
            })
            setProducts(sorted)
        } catch (error) {
            toast.error(error?.response?.data?.error || error.message)
        }
        setLoading(false)
    }

    const toggleStock = async (productId) => {
        try {
            const token = await getToken()
            const { data } = await axios.post(`/api/store/stock-toggle${storeTypeParam}`, { productId }, { headers: { Authorization: `Bearer ${token}` } })
            setProducts(prev => {
                const next = prev.map(p => p.id === productId ? { ...p, inStock: !p.inStock } : p)
                return next.sort((a, b) => {
                    const aFirst = a.inStock ? 1 : 0
                    const bFirst = b.inStock ? 1 : 0
                    if (bFirst !== aFirst) return bFirst - aFirst
                    return new Date(b.createdAt) - new Date(a.createdAt)
                })
            })
            toast.success(data.message)
        } catch (error) {
            toast.error(error?.response?.data?.error || error.message)
        }
    }

    const openDeleteModal = (product) => setDeleteModal({ open: true, product })
    const closeDeleteModal = () => setDeleteModal({ open: false, product: null })

    const handleEdit = (product) => {
        // Store product data in sessionStorage and navigate to add-product
        sessionStorage.setItem('editingProduct', JSON.stringify(product))
        router.push(`${isFashion ? '/fashion/store' : '/store'}/add-product`)
    }

    const confirmDelete = async () => {
        if (!deleteModal.product) return
        const productId = deleteModal.product.id
        try {
            const token = await getToken()
            await axios.delete(`/api/store/product?productId=${productId}${storeTypeParam ? '&type=fashion' : ''}`, { headers: { Authorization: `Bearer ${token}` } })
            setProducts(prev => prev.filter(p => p.id !== productId))
            toast.success('Product deleted')
            closeDeleteModal()
        } catch (error) {
            toast.error(error?.response?.data?.error || error.message)
        }
    }

    useEffect(() => {
        if (user) fetchProducts()
    }, [user])

    if (loading) return <Loading />

    return (
        <div className="min-h-full pb-12">
            <h1 className="text-2xl sm:text-3xl font-bold text-zinc-100 mb-1">
                Manage <span className={accentText}>Products</span>
            </h1>
            <p className="text-sm text-zinc-500 mb-8">Toggle stock and delete products</p>

            <div className="rounded-xl border border-zinc-700/60 bg-zinc-900/80 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead>
                            <tr className="border-b border-zinc-700/60 bg-zinc-800/50">
                                <th className="px-4 py-4 font-semibold text-zinc-300 uppercase tracking-wider">Product</th>
                                <th className="px-4 py-4 font-semibold text-zinc-300 uppercase tracking-wider hidden md:table-cell">MRP</th>
                                <th className="px-4 py-4 font-semibold text-zinc-300 uppercase tracking-wider">Price</th>
                                <th className="px-4 py-4 font-semibold text-zinc-300 uppercase tracking-wider">Available Stock</th>
                                <th className="px-4 py-4 font-semibold text-zinc-300 uppercase tracking-wider">Stock Status</th>
                                <th className="px-4 py-4 font-semibold text-zinc-300 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-700/50">
                            {products.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-4 py-12 text-center text-zinc-500">No products yet</td>
                                </tr>
                            ) : (
                                products.map((product) => {
                                    const stockQuantity = product.stock_quantity ?? 0
                                    const lowStockThreshold = product.low_stock_threshold ?? 5
                                    const isLowStock = stockQuantity > 0 && stockQuantity <= lowStockThreshold
                                    return (
                                        <tr key={product.id} className="hover:bg-zinc-800/30 transition-colors">
                                            <td className="px-4 py-4">
                                                <div className="flex gap-3 items-center">
                                                    <Image width={48} height={48} className="rounded-lg object-cover flex-shrink-0" src={product.images?.[0]} alt="" />
                                                    <div>
                                                        <p className="font-medium text-zinc-200">{product.name}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-4 text-zinc-400 hidden md:table-cell">{currency}{product.mrp?.toLocaleString()}</td>
                                            <td className="px-4 py-4 font-medium text-zinc-200">{currency}{product.price?.toLocaleString()}</td>
                                            <td className="px-4 py-4">
                                                <div className="flex flex-col gap-1">
                                                    <span className={`text-sm font-medium ${stockQuantity === 0 ? 'text-red-400' : isLowStock ? 'text-yellow-400' : 'text-zinc-200'}`}>
                                                        {stockQuantity} {stockQuantity === 1 ? 'item' : 'items'}
                                                    </span>
                                                    {isLowStock && (
                                                        <span className="text-xs text-yellow-500">Low stock warning</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-4 py-4">
                                                <label className="inline-flex items-center cursor-pointer gap-2">
                                                    <span className="relative inline-block w-10 h-6">
                                                        <input
                                                            type="checkbox"
                                                            className="sr-only peer"
                                                            checked={!!product.inStock}
                                                            onChange={() => toast.promise(toggleStock(product.id), { loading: 'Updating…' })}
                                                        />
                                                        <span className={`absolute inset-0 rounded-full bg-zinc-600 ${accentToggle} transition-colors`} />
                                                        <span className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-4 pointer-events-none" />
                                                    </span>
                                                    <span className="text-sm text-zinc-500">{product.inStock ? 'In stock' : 'Out'}</span>
                                                </label>
                                            </td>
                                        <td className="px-4 py-4">
                                            <div className="flex gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => handleEdit(product)}
                                                    className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-zinc-300 hover:text-zinc-100 hover:bg-zinc-700 rounded-lg border border-zinc-600 transition"
                                                >
                                                    <Edit size={16} />
                                                    Edit
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => openDeleteModal(product)}
                                                    className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg border border-red-500/30 transition"
                                                >
                                                    <Trash2 size={16} />
                                                    Delete
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                    )
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Delete confirmation modal */}
            {deleteModal.open && deleteModal.product && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={closeDeleteModal}>
                    <div className="bg-zinc-900 border border-zinc-700 rounded-xl shadow-xl max-w-md w-full mx-4 p-6" onClick={e => e.stopPropagation()}>
                        <h3 className="text-lg font-semibold text-zinc-100 mb-2">Delete product?</h3>
                        <p className="text-sm text-zinc-400 mb-4">
                            &ldquo;{deleteModal.product.name}&rdquo; will be permanently removed. This cannot be undone.
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
        </div>
    )
}
