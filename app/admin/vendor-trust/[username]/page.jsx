'use client'
import { useParams, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import axios from "axios"
import { useAuth } from "@clerk/nextjs"
import Loading from "@/components/Loading"
import Image from "next/image"
import Link from "next/link"
import { 
    ShieldCheckIcon, 
    StarIcon,
    PackageIcon,
    DollarSignIcon,
    CalendarIcon,
    ArrowLeftIcon,
    TrendingUpIcon,
    TrendingDownIcon,
    AwardIcon,
    CheckCircleIcon,
    Wand2
} from "lucide-react"
import toast from "react-hot-toast"
import { AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

// Magical Text Display Component with word-by-word animation
function MagicalTextDisplay({ text, tone, highlights = [] }) {
    const [displayedText, setDisplayedText] = useState('')
    const [isAnimating, setIsAnimating] = useState(true)
    const [words, setWords] = useState([])

    useEffect(() => {
        if (!text || typeof text !== 'string') {
            setDisplayedText('')
            setIsAnimating(false)
            return
        }
        
        // Clean the text - remove any undefined, null, or invalid values
        let cleanText = text
            .replace(/undefined/gi, '') // Remove undefined (case insensitive)
            .replace(/null/gi, '') // Remove null
            .replace(/\s+undefined\s*/gi, ' ') // Remove standalone "undefined" word
            .replace(/undefined\s*/gi, '') // Remove any remaining undefined
            .replace(/\s+/g, ' ') // Normalize whitespace
            .trim()
        
        // Remove trailing "undefined" if it appears at the end
        cleanText = cleanText.replace(/\s+undefined\.?$/i, '').trim()
        
        if (!cleanText || cleanText.length === 0) {
            setDisplayedText('')
            setIsAnimating(false)
            return
        }
        
        setDisplayedText('')
        setIsAnimating(true)
        
        // Split text into words, preserving spaces
        const textWords = cleanText.split(' ')
        
        let currentIndex = 0
        
        const interval = setInterval(() => {
            if (currentIndex < textWords.length) {
                setDisplayedText(prev => {
                    // Add space before word if not first word
                    const space = prev ? ' ' : ''
                    return prev + space + textWords[currentIndex]
                })
                currentIndex++
            } else {
                setIsAnimating(false)
                clearInterval(interval)
            }
        }, 50) // 50ms per word for smooth magical effect

        return () => clearInterval(interval)
    }, [text])

    const toneStyles = {
        positive: {
            icon: 'text-green-400',
            text: 'text-green-100',
            border: 'border-green-500/20',
            glow: 'shadow-green-500/20',
            bgGlow: 'bg-gradient-to-r from-green-500/5 via-transparent to-green-500/5'
        },
        caution: {
            icon: 'text-yellow-400',
            text: 'text-yellow-100',
            border: 'border-yellow-500/20',
            glow: 'shadow-yellow-500/20',
            bgGlow: 'bg-gradient-to-r from-yellow-500/5 via-transparent to-yellow-500/5'
        },
        neutral: {
            icon: 'text-zinc-400',
            text: 'text-zinc-300',
            border: 'border-zinc-700/50',
            glow: 'shadow-zinc-500/10',
            bgGlow: 'bg-gradient-to-r from-zinc-500/5 via-transparent to-zinc-500/5'
        }
    }

    const styles = toneStyles[tone] || toneStyles.neutral

    return (
        <div className="mt-4 relative">
            <div className="flex items-start gap-3">
                <div className="flex-1">
                    <p className={`text-base sm:text-lg leading-relaxed ${styles.text} font-medium`}>
                        <span className="inline-block">
                            {displayedText}
                        </span>
                        {isAnimating && (
                            <span className={`inline-block w-0.5 h-4 ml-1 ${styles.text} animate-pulse`}>|</span>
                        )}
                    </p>
                    {!isAnimating && highlights && highlights.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-3">
                            {highlights.map((highlight, idx) => (
                                <span 
                                    key={idx}
                                    className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-[#22c55e]/10 text-[#22c55e] border border-[#22c55e]/20 rounded-md animate-fade-in hover:bg-[#22c55e]/20 transition-all duration-200"
                                    style={{ 
                                        animationDelay: `${idx * 100}ms`,
                                        animationDuration: '0.5s'
                                    }}
                                >
                                    <CheckCircleIcon className="w-3 h-3" />
                                    {highlight}
                                </span>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

export default function VendorTrustIndex() {
    const { username } = useParams()
    const router = useRouter()
    const { getToken } = useAuth()
    const [loading, setLoading] = useState(true)
    const [trustData, setTrustData] = useState(null)
    const [mounted, setMounted] = useState(false)
    const [regenerating, setRegenerating] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    const fetchTrustData = async () => {
        try {
            const token = await getToken()
            const { data } = await axios.get(
                `/api/admin/vendor-trust/${username}`,
                { headers: { Authorization: `Bearer ${token}` } }
            )
            setTrustData(data)
        } catch (error) {
            console.error('Error loading trust index:', error)
            console.error('Error response:', error?.response?.data)
            toast.error(error?.response?.data?.error || error?.message || 'Failed to load trust index')
        } finally {
            setLoading(false)
        }
    }

    const handleRegenerate = async () => {
        if (regenerating) return
        
        setRegenerating(true)
        try {
            const token = await getToken()
            const { data } = await axios.post(
                `/api/admin/vendor-trust/${username}/regenerate`,
                {},
                { headers: { Authorization: `Bearer ${token}` } }
            )
            
            // Update the trust data with new analysis
            setTrustData(prev => ({
                ...prev,
                vendorAnalysis: data.vendorAnalysis
            }))
            
            toast.success('Vendor analysis regenerated successfully')
        } catch (error) {
            console.error('Error regenerating analysis:', error)
            toast.error(error?.response?.data?.error || 'Failed to regenerate analysis')
        } finally {
            setRegenerating(false)
        }
    }

    useEffect(() => {
        if (username) {
            fetchTrustData()
        }
    }, [username, getToken])

    if (loading) return <Loading />

    if (!trustData) {
        return (
            <div className="min-h-screen bg-[#0a0a0b] flex items-center justify-center px-4">
                <div className="text-center animate-fade-in">
                    <ShieldCheckIcon className="w-16 h-16 text-zinc-600 mx-auto mb-4" />
                    <h2 className="text-2xl font-semibold text-zinc-100 mb-2">Store Profile Not Available</h2>
                    <p className="text-zinc-400 mb-6">Unable to load store data.</p>
                    <button
                        onClick={() => router.back()}
                        className="px-6 py-2 bg-[#22c55e] hover:bg-[#22c55e]/90 text-white rounded-lg font-semibold transition-all duration-200"
                    >
                        Go Back
                    </button>
                </div>
            </div>
        )
    }

    const { store, trustScore, trustLevel, trustLevelColor, trustLevelBg, breakdown, profile, vendorAnalysis } = trustData
    const currency = process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || '₹'

    // Safety check for profile data
    if (!profile) {
        return (
            <div className="min-h-screen bg-[#0a0a0b] flex items-center justify-center px-4">
                <div className="text-center animate-fade-in">
                    <PackageIcon className="w-16 h-16 text-zinc-600 mx-auto mb-4" />
                    <h2 className="text-2xl font-semibold text-zinc-100 mb-2">Profile Data Not Available</h2>
                    <p className="text-zinc-400 mb-6">Unable to load store profile data.</p>
                    <button
                        onClick={() => router.back()}
                        className="px-6 py-2 bg-[#22c55e] hover:bg-[#22c55e]/90 text-white rounded-lg font-semibold transition-all duration-200"
                    >
                        Go Back
                    </button>
                </div>
            </div>
        )
    }

    // Rating breakdown percentages
    const totalReviews = breakdown.rating.reviewVolume
    const ratingBreakdownPercent = {
        5: totalReviews > 0 ? (profile.ratingBreakdown[5] / totalReviews) * 100 : 0,
        4: totalReviews > 0 ? (profile.ratingBreakdown[4] / totalReviews) * 100 : 0,
        3: totalReviews > 0 ? (profile.ratingBreakdown[3] / totalReviews) * 100 : 0,
        2: totalReviews > 0 ? (profile.ratingBreakdown[2] / totalReviews) * 100 : 0,
        1: totalReviews > 0 ? (profile.ratingBreakdown[1] / totalReviews) * 100 : 0
    }

    return (
        <div className="min-h-screen bg-[#0a0a0b]">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
                {/* Back Button */}
                <button
                    onClick={() => router.back()}
                    className="group flex items-center gap-2 text-zinc-400 hover:text-white mb-6 sm:mb-8 transition-all duration-200 hover:gap-3"
                >
                    <ArrowLeftIcon className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                    <span className="text-sm font-medium">Back</span>
                </button>

                {/* SECTION 1 — STORE HERO */}
                <div className={`bg-gradient-to-br from-zinc-900/80 to-zinc-900/40 border border-zinc-800/50 rounded-2xl sm:rounded-3xl p-6 sm:p-8 lg:p-10 mb-6 sm:mb-8 shadow-xl hover:shadow-2xl transition-all duration-500 ${mounted ? 'animate-fade-in' : ''}`}>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-10 items-start">
                        {/* LEFT SECTION - Store Info & Description (2 columns) */}
                        <div className="lg:col-span-2 space-y-6">
                            {/* Store Header */}
                            <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-6">
                                {store.logo && (
                                    <div className="relative flex-shrink-0 group">
                                        <div className="absolute inset-0 bg-[#22c55e]/20 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                                        <Image
                                            src={store.logo}
                                            alt={store.name}
                                            width={120}
                                            height={120}
                                            className="relative rounded-full border-2 border-zinc-700/50 object-cover shadow-lg group-hover:scale-105 transition-transform duration-300"
                                        />
                                    </div>
                                )}
                                <div className="flex-1 min-w-0">
                                    {/* Store Name & Badge */}
                                    <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-3">
                                        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white break-words">{store.name}</h1>
                                        <span className={`px-3 py-1 text-xs font-bold rounded-lg whitespace-nowrap ${
                                            store.storeType === 'fashion' 
                                                ? 'bg-pink-500/20 text-pink-300 border border-pink-500/40' 
                                                : 'bg-teal-500/20 text-teal-300 border border-teal-500/40'
                                        }`}>
                                            {store.storeType === 'fashion' ? 'Fashion' : 'Electronics'}
                                        </span>
                                    </div>
                                    
                                    {/* Rating Stars */}
                                    <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-4">
                                        <div className="flex items-center gap-0.5">
                                            {[1, 2, 3, 4, 5].map((star) => (
                                                <StarIcon
                                                    key={star}
                                                    className={`w-4 h-4 sm:w-5 sm:h-5 transition-all duration-300 ${
                                                        star <= Math.round(breakdown.rating.averageRating)
                                                            ? 'fill-[#22c55e] text-[#22c55e]'
                                                            : 'fill-zinc-700 text-zinc-700'
                                                    }`}
                                                />
                                            ))}
                                        </div>
                                        <span className="text-base sm:text-lg font-semibold text-white">
                                            {breakdown.rating.averageRating.toFixed(1)}
                                        </span>
                                        <span className="text-xs sm:text-sm text-zinc-400">/ 5.0</span>
                                        {totalReviews > 0 && (
                                            <span className="text-xs sm:text-sm text-zinc-400">
                                                ({totalReviews} {totalReviews === 1 ? 'review' : 'reviews'})
                                            </span>
                                        )}
                                    </div>

                                    {/* Meta Info Row */}
                                    <div className="flex flex-wrap items-center gap-x-4 sm:gap-x-6 gap-y-2">
                                        <div className="flex items-center gap-2 text-xs sm:text-sm text-zinc-400">
                                            <PackageIcon className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                                            <span className="whitespace-nowrap">{profile.totalOrdersCompleted} orders</span>
                                        </div>
                                        <div className="hidden sm:block h-4 w-px bg-zinc-700" />
                                        <div className="flex items-center gap-2 text-xs sm:text-sm text-zinc-400">
                                            <CalendarIcon className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                                            <span className="whitespace-nowrap">Since {new Date(store.createdAt).getFullYear()}</span>
                                        </div>
                                        <div className="hidden sm:block h-4 w-px bg-zinc-700" />
                                        <div className={`inline-flex items-center px-2 sm:px-3 py-1 rounded-lg border ${trustLevelBg} ${trustLevelColor} transition-all duration-200 hover:scale-105`}>
                                            <ShieldCheckIcon className="w-3 h-3 mr-1 flex-shrink-0" />
                                            <span className="text-xs font-semibold whitespace-nowrap">{trustLevel}</span>
                                        </div>
                                        <button
                                            onClick={handleRegenerate}
                                            disabled={regenerating}
                                            className="inline-flex items-center px-2 sm:px-3 py-1 rounded-lg border border-zinc-700 bg-zinc-800/50 text-zinc-300 hover:bg-zinc-700/50 transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                                            title="Regenerate Analysis"
                                        >
                                            <Wand2 className={`w-3 h-3 mr-1 flex-shrink-0 ${regenerating ? 'animate-spin' : ''}`} />
                                            <span className="text-xs font-semibold whitespace-nowrap">update</span>
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Vendor Analysis Description - Constrained Width */}
                            {vendorAnalysis && vendorAnalysis.summary && typeof vendorAnalysis.summary === 'string' && vendorAnalysis.summary.trim().length > 0 && (
                                <div className="max-w-2xl">
                                    <MagicalTextDisplay 
                                        text={vendorAnalysis.summary}
                                        tone={vendorAnalysis.tone || 'neutral'}
                                        highlights={vendorAnalysis.highlights || []}
                                    />
                                </div>
                            )}
                        </div>

                        {/* RIGHT SECTION - KPI Cards Panel (1 column) */}
                        <div className="space-y-4 sm:space-y-6">
                            {/* Total Revenue Card */}
                            <div className="bg-zinc-900/60 border border-zinc-800/50 rounded-2xl p-6 sm:p-8 hover:border-[#22c55e]/40 transition-all duration-300 hover:shadow-lg hover:shadow-[#22c55e]/10 group">
                                <div className="flex items-center gap-2 mb-3">
                                    <DollarSignIcon className="w-5 h-5 text-[#22c55e] group-hover:scale-110 transition-transform" />
                                    <span className="text-xs text-zinc-400 uppercase tracking-wide font-medium">Total Revenue</span>
                                </div>
                                <p className="text-3xl sm:text-4xl font-bold text-white group-hover:text-[#22c55e] transition-colors">{currency}{profile.totalRevenue.toLocaleString()}</p>
                            </div>

                            {/* Products Card */}
                            <div className="bg-zinc-900/60 border border-zinc-800/50 rounded-2xl p-6 sm:p-8 hover:border-[#22c55e]/40 transition-all duration-300 hover:shadow-lg hover:shadow-[#22c55e]/10 group">
                                <div className="flex items-center gap-2 mb-3">
                                    <PackageIcon className="w-5 h-5 text-[#22c55e] group-hover:scale-110 transition-transform" />
                                    <span className="text-xs text-zinc-400 uppercase tracking-wide font-medium">Products</span>
                                </div>
                                <p className="text-3xl sm:text-4xl font-bold text-white group-hover:text-[#22c55e] transition-colors">{profile.totalProducts}</p>
                            </div>

                            {/* Refund Rate Card */}
                            <div className="bg-zinc-900/60 border border-zinc-800/50 rounded-2xl p-6 sm:p-8 hover:border-[#22c55e]/40 transition-all duration-300 hover:shadow-lg hover:shadow-[#22c55e]/10 group">
                                <div className="flex items-center gap-2 mb-3">
                                    <ShieldCheckIcon className="w-5 h-5 text-[#22c55e] group-hover:scale-110 transition-transform" />
                                    <span className="text-xs text-zinc-400 uppercase tracking-wide font-medium">Refund Rate</span>
                                </div>
                                <p className="text-3xl sm:text-4xl font-bold text-white group-hover:text-[#22c55e] transition-colors">{profile.refundRate}%</p>
                                <p className="text-xs text-zinc-500 mt-2">low & reliable</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* SECTION 2 — RATING BREAKDOWN */}
                <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl sm:rounded-2xl p-4 sm:p-6 mb-6 sm:mb-8 hover:border-zinc-700/50 transition-all duration-300">
                    <h2 className="text-lg sm:text-xl font-bold text-white mb-4 sm:mb-6">Rating Breakdown</h2>
                    {totalReviews === 0 ? (
                        <div className="text-center py-8 sm:py-12">
                            <StarIcon className="w-12 h-12 text-zinc-600 mx-auto mb-3 opacity-50" />
                            <p className="text-zinc-400">No reviews yet.</p>
                        </div>
                    ) : (
                        <div className="space-y-3 sm:space-y-4">
                            {[5, 4, 3, 2, 1].map((rating, index) => (
                                <div 
                                    key={rating} 
                                    className="flex items-center gap-3 sm:gap-4 animate-fade-in"
                                    style={{ animationDelay: `${index * 100}ms` }}
                                >
                                    <div className="flex items-center gap-1 w-12 sm:w-16 flex-shrink-0">
                                        <span className="text-xs sm:text-sm text-zinc-400">{rating}</span>
                                        <StarIcon className="w-3 h-3 sm:w-4 sm:h-4 fill-[#22c55e] text-[#22c55e]" />
                                    </div>
                                    <div className="flex-1 h-2 sm:h-2.5 bg-zinc-800 rounded-full overflow-hidden">
                                        <div 
                                            className="h-full bg-gradient-to-r from-[#22c55e] to-[#16a34a] rounded-full transition-all duration-1000 ease-out"
                                            style={{ width: `${ratingBreakdownPercent[rating]}%` }}
                                        />
                                    </div>
                                    <span className="text-xs sm:text-sm text-zinc-400 w-20 sm:w-24 text-right flex-shrink-0">
                                        {profile.ratingBreakdown[rating]} ({ratingBreakdownPercent[rating].toFixed(1)}%)
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* SECTION 3 — ORDERS TREND GRAPH */}
                <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl sm:rounded-2xl p-4 sm:p-6 mb-6 sm:mb-8 hover:border-zinc-700/50 transition-all duration-300">
                    <h2 className="text-lg sm:text-xl font-bold text-white mb-4 sm:mb-6">Orders Trend (Last 8 Weeks)</h2>
                    {profile.weeklyOrders.length === 0 || profile.weeklyOrders.every(w => w.orders === 0) ? (
                        <div className="text-center py-8 sm:py-12">
                            <TrendingUpIcon className="w-12 h-12 text-zinc-600 mx-auto mb-3 opacity-50" />
                            <p className="text-zinc-400">No sales yet.</p>
                        </div>
                    ) : (
                        <div className="h-48 sm:h-64 lg:h-72 -mx-2 sm:mx-0">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={profile.weeklyOrders} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#22c55e" stopOpacity={0.4} />
                                            <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="colorCancelled" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.25} />
                                            <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(63,63,70,0.3)" vertical={false} />
                                    <XAxis 
                                        dataKey="week" 
                                        stroke="#71717a" 
                                        fontSize={10}
                                        tickLine={false} 
                                        axisLine={false}
                                        interval="preserveStartEnd"
                                    />
                                    <YAxis 
                                        stroke="#71717a" 
                                        fontSize={10}
                                        tickLine={false} 
                                        axisLine={false} 
                                    />
                                    <Tooltip 
                                        contentStyle={{ 
                                            backgroundColor: 'rgba(18,18,20,0.98)', 
                                            border: '1px solid rgba(63,63,70,0.6)', 
                                            borderRadius: '12px',
                                            padding: '8px 12px',
                                            fontSize: '12px'
                                        }}
                                        cursor={{ stroke: '#22c55e', strokeWidth: 1, strokeDasharray: '5 5' }}
                                    />
                                    <Area 
                                        type="monotone" 
                                        dataKey="orders" 
                                        stroke="#22c55e" 
                                        strokeWidth={2.5}
                                        fill="url(#colorOrders)" 
                                        name="Orders"
                                        animationDuration={1000}
                                    />
                                    <Area 
                                        type="monotone" 
                                        dataKey="cancelled" 
                                        stroke="#ef4444" 
                                        strokeWidth={2}
                                        fill="url(#colorCancelled)" 
                                        name="Cancelled"
                                        animationDuration={1000}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </div>

                {/* SECTION 4 — REVENUE OVERVIEW */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
                    {[
                        { icon: DollarSignIcon, label: 'Total Revenue', value: `${currency}${profile.totalRevenue.toLocaleString()}` },
                        { icon: TrendingUpIcon, label: 'Avg Order Value', value: `${currency}${profile.averageOrderValue.toFixed(2)}` },
                        { 
                            icon: breakdown.stability.revenueDropPercent <= 0 ? TrendingUpIcon : TrendingDownIcon, 
                            label: 'Revenue Trend', 
                            value: breakdown.stability.revenueDropPercent <= 0 ? 'Stable' : `-${breakdown.stability.revenueDropPercent.toFixed(1)}%`,
                            valueColor: breakdown.stability.revenueDropPercent <= 0 ? 'text-green-400' : 'text-yellow-400'
                        }
                    ].map((item, index) => (
                        <div 
                            key={item.label}
                            className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4 sm:p-6 hover:border-[#22c55e]/40 transition-all duration-300 hover:shadow-lg hover:shadow-[#22c55e]/10 group animate-fade-in"
                            style={{ animationDelay: `${index * 100}ms` }}
                        >
                            <div className="flex items-center gap-2 mb-2">
                                <item.icon className="w-4 h-4 sm:w-5 sm:h-5 text-[#22c55e] group-hover:scale-110 transition-transform" />
                                <span className="text-xs text-zinc-400 uppercase tracking-wide">{item.label}</span>
                            </div>
                            <p className={`text-2xl sm:text-3xl font-bold ${item.valueColor || 'text-white'} group-hover:text-[#22c55e] transition-colors`}>
                                {item.value}
                            </p>
                        </div>
                    ))}
                </div>

                {/* SECTION 5 — TOP PRODUCTS */}
                {profile.topProducts.length > 0 ? (
                    <div className="mb-6 sm:mb-8">
                        <h2 className="text-lg sm:text-xl font-bold text-white mb-4 sm:mb-6">Top Products</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                            {profile.topProducts.map((product, index) => (
                                <Link 
                                    key={product.id}
                                    href={`/product/${product.id}`}
                                    className="group bg-zinc-900/60 border border-zinc-800 rounded-xl overflow-hidden hover:border-[#22c55e]/40 transition-all duration-300 hover:shadow-xl hover:shadow-[#22c55e]/10 hover:-translate-y-1 animate-fade-in"
                                    style={{ animationDelay: `${index * 100}ms` }}
                                >
                                    <div className="relative h-40 sm:h-48 bg-zinc-900 flex items-center justify-center overflow-hidden">
                                        {product.images && product.images.length > 0 ? (
                                            <Image
                                                src={product.images[0]}
                                                alt={product.name}
                                                width={200}
                                                height={200}
                                                className="max-h-36 sm:max-h-44 w-auto object-contain group-hover:scale-110 transition-transform duration-500"
                                            />
                                        ) : (
                                            <PackageIcon className="w-12 h-12 sm:w-16 sm:h-16 text-zinc-700" />
                                        )}
                                        {index === 0 && (
                                            <div className="absolute top-2 left-2 sm:top-3 sm:left-3 animate-pulse">
                                                <span className="px-2 sm:px-2.5 py-1 text-xs font-bold text-zinc-900 bg-[#22c55e] rounded-lg shadow-lg">
                                                    Bestseller
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="p-3 sm:p-4">
                                        <h3 className="text-sm font-semibold text-white mb-2 line-clamp-2 group-hover:text-[#22c55e] transition-colors">
                                            {product.name}
                                        </h3>
                                        <div className="flex items-center gap-1 mb-2">
                                            {[1, 2, 3, 4, 5].map((star) => (
                                                <StarIcon
                                                    key={star}
                                                    className={`w-3 h-3 ${
                                                        star <= Math.round(product.rating)
                                                            ? 'fill-[#22c55e] text-[#22c55e]'
                                                            : 'fill-zinc-700 text-zinc-700'
                                                    }`}
                                                />
                                            ))}
                                            <span className="text-xs text-zinc-500 ml-1">({product.reviewCount})</span>
                                        </div>
                                        <div className="mt-3 space-y-1.5">
                                            <div className="flex justify-between text-xs">
                                                <span className="text-zinc-400">Revenue</span>
                                                <span className="text-white font-semibold">{currency}{product.revenue.toFixed(2)}</span>
                                            </div>
                                            <div className="flex justify-between text-xs">
                                                <span className="text-zinc-400">Orders</span>
                                                <span className="text-white font-semibold">{product.orderCount}</span>
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-8 sm:p-12 text-center mb-6 sm:mb-8">
                        <PackageIcon className="w-12 h-12 sm:w-16 sm:h-16 text-zinc-600 mx-auto mb-4 opacity-50" />
                        <h3 className="text-lg sm:text-xl font-semibold text-white mb-2">No Products Available</h3>
                        <p className="text-sm sm:text-base text-zinc-400">This store has not added products yet.</p>
                    </div>
                )}

                {/* SECTION 6 — TOP CATEGORIES */}
                {profile.topCategories.length > 0 && (
                    <div className="mb-6 sm:mb-8">
                        <h2 className="text-lg sm:text-xl font-bold text-white mb-4 sm:mb-6">Top Categories</h2>
                        <div className="space-y-3 sm:space-y-4">
                            {profile.topCategories.slice(0, 5).map((category, index) => (
                                <div 
                                    key={category.name} 
                                    className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-3 sm:p-4 hover:border-zinc-700/50 transition-all duration-300 animate-fade-in"
                                    style={{ animationDelay: `${index * 50}ms` }}
                                >
                                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
                                        <span className="text-sm font-semibold text-white">{category.name}</span>
                                        <span className="text-xs text-zinc-400">
                                            {currency}{category.revenue.toFixed(2)} • {category.percentOfTotal.toFixed(1)}% of revenue
                                        </span>
                                    </div>
                                    <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                                        <div 
                                            className="h-full bg-gradient-to-r from-[#22c55e] to-[#16a34a] rounded-full transition-all duration-1000 ease-out"
                                            style={{ width: `${category.percentOfTotal}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* SECTION 7 — TRUST INDEX (Compact) */}
                <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl sm:rounded-2xl p-4 sm:p-6 hover:border-zinc-700/50 transition-all duration-300">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4 sm:mb-6">
                        <div>
                            <h2 className="text-lg sm:text-xl font-bold text-white mb-1">Trust Index</h2>
                            <p className="text-xs sm:text-sm text-zinc-400">
                                Based on reliability, refunds, ratings, and stability.
                            </p>
                        </div>
                        <div className="flex flex-col sm:items-end gap-2">
                            <div className="flex items-baseline gap-2">
                                <span className="text-3xl sm:text-4xl font-bold text-white">{trustScore}</span>
                                <span className="text-base sm:text-lg text-zinc-400">/100</span>
                            </div>
                            <div className={`inline-flex items-center px-3 py-1 rounded-lg border ${trustLevelBg} ${trustLevelColor} transition-all duration-200 hover:scale-105`}>
                                <ShieldCheckIcon className="w-3 h-3 mr-1" />
                                <span className="text-xs font-semibold">{trustLevel}</span>
                            </div>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                        {[
                            { label: 'Order Reliability', score: breakdown.orderReliability.score },
                            { label: 'Refund Score', score: breakdown.refund.score },
                            { label: 'Rating Score', score: breakdown.rating.score },
                            { label: 'Stability Score', score: breakdown.stability.score },
                            { label: 'Inventory Score', score: breakdown.inventory.score },
                            { label: 'Experience Score', score: breakdown.experience.score }
                        ].map((item, index) => (
                            <div 
                                key={item.label} 
                                className="space-y-2 animate-fade-in"
                                style={{ animationDelay: `${index * 50}ms` }}
                            >
                                <div className="flex justify-between text-xs">
                                    <span className="text-zinc-400">{item.label}</span>
                                    <span className="text-white font-semibold">{item.score}/100</span>
                                </div>
                                <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                                    <div 
                                        className="h-full bg-gradient-to-r from-[#22c55e] to-[#16a34a] rounded-full transition-all duration-1000 ease-out"
                                        style={{ width: `${item.score}%` }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}
