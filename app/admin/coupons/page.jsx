'use client'
import { useEffect, useState } from "react"
import { format } from "date-fns"
import toast from "react-hot-toast"
import { Trash2, Plus, RefreshCw, Tag, Check, X, Smartphone, Shirt } from "lucide-react"
import { useAuth } from "@clerk/nextjs"
import axios from "axios"

export default function AdminCoupons() {
    const { getToken } = useAuth()
    const [coupons, setCoupons] = useState([])
    const [isLoading, setIsLoading] = useState(true)
    const [activeTab, setActiveTab] = useState('electronics') // 'electronics' or 'fashion'

    const [newCoupon, setNewCoupon] = useState({
        code: '',
        description: '',
        discount: '',
        forNewUser: false,
        forMember: false,
        isPublic: false,
        expiresAt: new Date()
    })

    const fetchCoupons = async () => {
        setIsLoading(true)
        try {
            const token = await getToken()
            const { data } = await axios.get(`/api/admin/coupon?storeType=${activeTab}`, { headers: { Authorization: `Bearer ${token}` } })
            setCoupons(data.coupons || [])
        } catch (error) {
            toast.error(error?.response?.data?.error || "Failed to fetch coupons")
        } finally {
            setIsLoading(false)
        }
    }

    const handleAddCoupon = async (e) => {
        e.preventDefault()
        try {
            const token = await getToken()

            const payload = { ...newCoupon }
            payload.discount = Number(payload.discount)
            payload.expiresAt = new Date(payload.expiresAt)
            payload.storeType = activeTab // Assign active category

            const { data } = await axios.post('/api/admin/coupon', { coupon: payload }, { headers: { Authorization: `Bearer ${token}` } })
            toast.success(data.message || "Coupon added successfully")

            // Reset form
            setNewCoupon({
                code: '',
                description: '',
                discount: '',
                forNewUser: false,
                forMember: false,
                isPublic: false,
                expiresAt: new Date()
            })

            await fetchCoupons()
        } catch (error) {
            toast.error(error?.response?.data?.error || error.message)
        }
    }

    const handleChange = (e) => {
        setNewCoupon({ ...newCoupon, [e.target.name]: e.target.value })
    }

    const handleToggle = (name) => {
        setNewCoupon(prev => ({ ...prev, [name]: !prev[name] }))
    }

    const deleteCoupon = async (code) => {
        try {
            const confirm = window.confirm("Are you sure you want to delete this coupon? This action cannot be undone.")
            if (!confirm) return;
            const token = await getToken()
            await axios.delete(`/api/admin/coupon?code=${code}`, { headers: { Authorization: `Bearer ${token}` } })
            await fetchCoupons()
            toast.success("Coupon deleted successfully")
        } catch (error) {
            toast.error(error?.response?.data?.error || error.message)
        }
    }

    useEffect(() => {
        fetchCoupons()
    }, [activeTab]) // Refetch when tab changes

    const isFashion = activeTab === 'fashion';

    return (
        <div className="min-h-screen bg-zinc-950 p-6 space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-zinc-100 flex items-center gap-3">
                        <Tag className={`w-8 h-8 ${isFashion ? 'text-pink-400' : 'text-emerald-400'}`} />
                        Coupon <span className={isFashion ? 'text-pink-400' : 'text-emerald-400'}>Management</span>
                    </h1>
                    <p className="text-zinc-400 mt-1 max-w-2xl">
                        Create, monitor, and manage discount codes for your store. Configure audience-specific rules and track expiration dates.
                    </p>
                </div>
                <button
                    onClick={fetchCoupons}
                    className={`flex items-center gap-2 px-4 py-2 bg-zinc-900 border border-zinc-800 text-zinc-300 rounded-lg hover:bg-zinc-800 transition-colors ${isFashion ? 'hover:text-pink-400' : 'hover:text-emerald-400'}`}
                >
                    <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                    Refresh List
                </button>
            </div>

            {/* Store Type Category Toggle */}
            <div className="flex bg-zinc-900 p-1 rounded-lg border border-zinc-800 shadow-xl shadow-black/20 w-full sm:w-fit">
                <button
                    onClick={() => setActiveTab('electronics')}
                    className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-md text-sm font-medium transition-all ${!isFashion
                        ? 'bg-zinc-800 text-emerald-400 shadow-sm border border-zinc-700/50'
                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
                        }`}
                >
                    <Smartphone className="w-4 h-4" />
                    Electronics
                </button>
                <button
                    onClick={() => setActiveTab('fashion')}
                    className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-md text-sm font-medium transition-all ${isFashion
                        ? 'bg-zinc-800 text-pink-400 shadow-sm border border-zinc-700/50'
                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
                        }`}
                >
                    <Shirt className="w-4 h-4" />
                    Fashion
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Add Coupon Form */}
                <div className="lg:col-span-1 border border-zinc-800 bg-zinc-900/50 rounded-xl p-6 h-fit sticky top-6 shadow-xl shadow-black/20">
                    <h2 className="text-xl font-semibold text-zinc-100 mb-6 flex items-center gap-2">
                        <Plus className={`w-5 h-5 ${isFashion ? 'text-pink-400' : 'text-emerald-400'}`} />
                        Create New Coupon
                    </h2>

                    <form onSubmit={(e) => toast.promise(handleAddCoupon(e), { loading: "Adding coupon...", success: "Saved", error: "Failed" })} className="space-y-5">
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Coupon Code</label>
                            <input
                                type="text"
                                placeholder="e.g. SUMMER24"
                                className={`w-full bg-zinc-950 border border-zinc-800 text-zinc-100 placeholder:text-zinc-600 rounded-lg p-3 focus:outline-none focus:ring-2 transition-all uppercase ${isFashion ? 'focus:ring-pink-500/50 focus:border-pink-500' : 'focus:ring-emerald-500/50 focus:border-emerald-500'}`}
                                name="code"
                                value={newCoupon.code}
                                onChange={handleChange}
                                required
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Discount (%)</label>
                                <input
                                    type="number"
                                    placeholder="1-100"
                                    min={1} max={100}
                                    className={`w-full bg-zinc-950 border border-zinc-800 text-zinc-100 placeholder:text-zinc-600 rounded-lg p-3 focus:outline-none focus:ring-2 transition-all ${isFashion ? 'focus:ring-pink-500/50 focus:border-pink-500' : 'focus:ring-emerald-500/50 focus:border-emerald-500'}`}
                                    name="discount"
                                    value={newCoupon.discount}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Expiry Date</label>
                                <input
                                    type="date"
                                    className={`w-full bg-zinc-950 border border-zinc-800 text-zinc-100 rounded-lg p-3 focus:outline-none focus:ring-2 transition-all [color-scheme:dark] ${isFashion ? 'focus:ring-pink-500/50 focus:border-pink-500' : 'focus:ring-emerald-500/50 focus:border-emerald-500'}`}
                                    name="expiresAt"
                                    value={format(newCoupon.expiresAt, 'yyyy-MM-dd')}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Description</label>
                            <input
                                type="text"
                                placeholder="Brief details about the coupon..."
                                className={`w-full bg-zinc-950 border border-zinc-800 text-zinc-100 placeholder:text-zinc-600 rounded-lg p-3 focus:outline-none focus:ring-2 transition-all ${isFashion ? 'focus:ring-pink-500/50 focus:border-pink-500' : 'focus:ring-emerald-500/50 focus:border-emerald-500'}`}
                                name="description"
                                value={newCoupon.description}
                                onChange={handleChange}
                                required
                            />
                        </div>

                        <div className="space-y-4 pt-4 border-t border-zinc-800">
                            <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider block mb-2">Usage Rules</label>

                            {/* Toggle Switches */}
                            {[
                                { key: 'forNewUser', label: 'First-time Users Only', desc: 'Restricts coupon to new accounts' },
                                { key: 'forMember', label: 'Members Only', desc: 'Requires an active store membership' },
                                { key: 'isPublic', label: 'Make Public', desc: 'Displays coupon on product pages' },
                            ].map((rule) => (
                                <div key={rule.key} className="flex items-start justify-between group cursor-pointer" onClick={() => handleToggle(rule.key)}>
                                    <div>
                                        <p className={`text-sm font-medium text-zinc-200 transition-colors ${isFashion ? 'group-hover:text-pink-400' : 'group-hover:text-emerald-400'}`}>{rule.label}</p>
                                        <p className="text-xs text-zinc-500">{rule.desc}</p>
                                    </div>
                                    <button
                                        type="button"
                                        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${newCoupon[rule.key] ? (isFashion ? 'bg-pink-500' : 'bg-emerald-500') : 'bg-zinc-700'}`}
                                        role="switch"
                                        aria-checked={newCoupon[rule.key]}
                                    >
                                        <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${newCoupon[rule.key] ? 'translate-x-5' : 'translate-x-0'}`} />
                                    </button>
                                </div>
                            ))}
                        </div>

                        <button
                            type="submit"
                            className={`w-full mt-6 py-3 px-4 text-zinc-950 font-semibold rounded-lg shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-2 ${isFashion ? 'bg-pink-500 hover:bg-pink-400 shadow-pink-500/20' : 'bg-emerald-500 hover:bg-emerald-400 shadow-emerald-500/20'}`}
                        >
                            <Plus className="w-5 h-5" />
                            Generate <span className="capitalize">{activeTab}</span> Coupon
                        </button>
                    </form>
                </div>

                {/* Coupons Table */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-xl shadow-black/20">
                        {isLoading ? (
                            <div className="p-12 text-center text-zinc-500 flex flex-col items-center gap-3">
                                <RefreshCw className={`w-6 h-6 animate-spin ${isFashion ? 'text-pink-500' : 'text-emerald-500'}`} />
                                <p>Loading <span className="capitalize">{activeTab}</span> coupons...</p>
                            </div>
                        ) : coupons.length === 0 ? (
                            <div className="p-16 text-center text-zinc-500 border-dashed border-2 border-zinc-800/50 m-4 rounded-xl flex flex-col items-center justify-center gap-4 bg-zinc-900/30">
                                <div className="p-4 bg-zinc-900 rounded-full border border-zinc-800">
                                    <Tag className="w-8 h-8 text-zinc-400" />
                                </div>
                                <div>
                                    <p className="text-zinc-300 font-medium text-lg">No active <span className="lowercase">{activeTab}</span> coupons</p>
                                    <p className="text-sm mt-1">Create a new coupon to start offering discounts.</p>
                                </div>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="text-xs text-zinc-400 uppercase bg-zinc-950/50 border-b border-zinc-800">
                                        <tr>
                                            <th className="px-6 py-4 font-medium tracking-wider">Code & Details</th>
                                            <th className="px-6 py-4 font-medium tracking-wider">Discount</th>
                                            <th className="px-6 py-4 font-medium tracking-wider">Rules</th>
                                            <th className="px-6 py-4 font-medium tracking-wider">Expires</th>
                                            <th className="px-6 py-4 text-right font-medium tracking-wider">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-zinc-800/50">
                                        {coupons.map((coupon) => (
                                            <tr key={coupon.code} className="hover:bg-zinc-800/20 transition-colors group">
                                                <td className="px-6 py-4">
                                                    <div className={`font-mono font-bold mb-1 tracking-wide text-base ${isFashion ? 'text-pink-400' : 'text-emerald-400'}`}>{coupon.code}</div>
                                                    <div className="text-zinc-400 text-xs truncate max-w-[200px]" title={coupon.description}>
                                                        {coupon.description}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-baseline gap-1">
                                                        <span className="text-2xl font-bold text-zinc-100">{coupon.discount}</span>
                                                        <span className={`font-medium ${isFashion ? 'text-pink-500' : 'text-emerald-500'}`}>%</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-wrap gap-2 max-w-[180px]">
                                                        {coupon.isPublic && (
                                                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px] font-medium uppercase tracking-wider">
                                                                <Check className="w-3 h-3" /> Public
                                                            </span>
                                                        )}
                                                        {coupon.forNewUser && (
                                                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-medium uppercase tracking-wider">
                                                                New Users
                                                            </span>
                                                        )}
                                                        {coupon.forMember && (
                                                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20 text-[10px] font-medium uppercase tracking-wider">
                                                                Members
                                                            </span>
                                                        )}
                                                        {!coupon.isPublic && !coupon.forNewUser && !coupon.forMember && (
                                                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-zinc-800 text-zinc-500 border border-zinc-700 text-[10px] font-medium uppercase tracking-wider">
                                                                Standard
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="text-zinc-300 font-medium">
                                                        {format(new Date(coupon.expiresAt), 'MMM dd, yyyy')}
                                                    </div>
                                                    {new Date(coupon.expiresAt) < new Date() && (
                                                        <div className="text-red-400 text-xs font-medium mt-1 flex items-center gap-1">
                                                            <X className="w-3 h-3" /> Expired
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <button
                                                        onClick={() => deleteCoupon(coupon.code)}
                                                        className="p-2 bg-zinc-950 border border-zinc-800 hover:border-red-500/50 hover:bg-red-500/10 text-zinc-400 hover:text-red-400 rounded-lg transition-colors group-hover:opacity-100 opacity-60"
                                                        title="Delete Coupon"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}