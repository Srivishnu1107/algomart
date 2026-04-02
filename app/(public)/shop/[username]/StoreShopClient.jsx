'use client'
import ProductCard from "@/components/ModelCard"
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation"
import { useEffect, useState, useMemo } from "react"
import { MailIcon, MapPinIcon, StarIcon, Heart, ShoppingCart, CalendarIcon, PackageIcon, TrendingUpIcon, ShieldCheckIcon, FilterIcon, ArrowUpDownIcon, Users, Award, Pencil, LayoutDashboard, MessageCircle, ImageIcon } from "lucide-react"
import Loading from "@/components/Loading"
import Image from "next/image"
import axios from "axios"
import toast from "react-hot-toast"
import Link from "next/link"
import { useDispatch, useSelector } from 'react-redux'
import { addToCart } from '@/lib/features/cart/cartSlice'
import { useAuth, useUser } from '@clerk/nextjs'
import ContactPopup from "@/components/ContactPopup"
import StoreCover from "@/components/StoreCover"

export default function StoreShopClient() {
    const { username } = useParams()
    const pathname = usePathname()
    const router = useRouter()
    const searchParams = useSearchParams()
    const [storeData, setStoreData] = useState(null)
    const [loading, setLoading] = useState(true)
    const [sortBy, setSortBy] = useState('popular')
    const [priceFilter, setPriceFilter] = useState({ min: '', max: '' })
    const [showFilters, setShowFilters] = useState(false)
    const [currentPage, setCurrentPage] = useState(1)
    const productsPerPage = 12
    const dispatch = useDispatch()
    const { user } = useUser()
    const { getToken } = useAuth()
    const currency = process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || '₹'
    const [isFollowing, setIsFollowing] = useState(false)
    const [followerCount, setFollowerCount] = useState(0)
    const [showContactPopup, setShowContactPopup] = useState(false)
    const [followLoading, setFollowLoading] = useState(false)
    const [isAdmin, setIsAdmin] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const [categoryFilter, setCategoryFilter] = useState('')

    const fetchStoreData = async () => {
        try {
            const { data } = await axios.get(`/api/store/data?username=${username}`)
            setStoreData(data)
            setIsFollowing(data.isFollowing || false)
            setFollowerCount(data.followerCount || 0)
        } catch (error) {
            toast.error(error?.response?.data?.error || error.message)
        }
        setLoading(false)
    }

    const handleFollow = async () => {
        if (!user) {
            toast.error('Please sign in to follow stores')
            return
        }
        if (!storeData?.store?.id) return
        setFollowLoading(true)
        try {
            const token = await getToken()
            const { data } = await axios.post(
                '/api/store/follow',
                { storeId: storeData.store.id },
                { headers: { Authorization: `Bearer ${token}` } }
            )
            setIsFollowing(data.following)
            setFollowerCount(prev => data.following ? prev + 1 : prev - 1)
            toast.success(data.following ? 'Following store!' : 'Unfollowed store')
        } catch (error) {
            toast.error(error?.response?.data?.error || 'Failed to update follow status')
        }
        setFollowLoading(false)
    }

    useEffect(() => {
        if (username) fetchStoreData()
    }, [username])

    useEffect(() => {
        if (!storeData?.store || !username) return
        const isFashionPath = pathname?.startsWith('/fashion/shop/')
        const isFashionStore = storeData.store.storeType === 'fashion'
        if (isFashionStore && !isFashionPath) {
            router.replace(`/fashion/shop/${username}`)
            return
        }
        if (!isFashionStore && isFashionPath) {
            router.replace(`/shop/${username}`)
        }
    }, [storeData, username, pathname, router])

    useEffect(() => {
        if (!searchParams) return
        const initialSearch = searchParams.get('q') || ''
        const initialCategory = searchParams.get('category') || ''
        if (initialSearch) setSearchQuery(initialSearch)
        if (initialCategory) setCategoryFilter(initialCategory)
    }, [searchParams])

    useEffect(() => {
        const checkAdmin = async () => {
            if (!user) { setIsAdmin(false); return }
            try {
                const token = await getToken()
                const { data } = await axios.get('/api/admin/is-admin', {
                    headers: { Authorization: `Bearer ${token}` }
                }).catch(() => ({ data: { isAdmin: false } }))
                setIsAdmin(data.isAdmin || false)
            } catch (error) {
                setIsAdmin(false)
            }
        }
        if (user) checkAdmin()
    }, [user, getToken])

    const formatDate = (dateString) => {
        const date = new Date(dateString)
        return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    }

    const formatRelativeTime = (dateString) => {
        const date = new Date(dateString)
        const now = new Date()
        const diffMs = now - date
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
        if (diffDays === 0) return 'Today'
        if (diffDays === 1) return 'Yesterday'
        if (diffDays < 7) return `${diffDays} days ago`
        if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
        if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`
        return `${Math.floor(diffDays / 365)} years ago`
    }

    const filteredAndSortedProducts = useMemo(() => {
        if (!storeData?.allProducts) return []
        let products = [...storeData.allProducts]
        if (categoryFilter) {
            const target = categoryFilter.toLowerCase()
            products = products.filter(p => (p.category || '').toLowerCase() === target)
        }
        if (searchQuery && searchQuery.trim()) {
            const q = searchQuery.toLowerCase().trim()
            products = products.filter(p => {
                const haystack = [
                    p.name,
                    p.description,
                    p.category,
                    p.brand,
                ].filter(Boolean).join(' ').toLowerCase()
                return haystack.includes(q)
            })
        }
        if (priceFilter.min) products = products.filter(p => (p.price || p.offer_price || 0) >= parseFloat(priceFilter.min))
        if (priceFilter.max) products = products.filter(p => (p.price || p.offer_price || 0) <= parseFloat(priceFilter.max))
        switch (sortBy) {
            case 'newest': products.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)); break
            case 'price-low': products.sort((a, b) => (a.price || a.offer_price || 0) - (b.price || b.offer_price || 0)); break
            case 'popular': default: products.sort((a, b) => (b.orderCount || 0) - (a.orderCount || 0) || (b.revenue || 0) - (a.revenue || 0)); break
        }
        return products
    }, [storeData?.allProducts, sortBy, priceFilter])

    const totalPages = Math.ceil(filteredAndSortedProducts.length / productsPerPage)
    const paginatedProducts = filteredAndSortedProducts.slice((currentPage - 1) * productsPerPage, currentPage * productsPerPage)

    const handleQuickAdd = (product) => {
        dispatch(addToCart({ productId: product.id }))
        toast.success('Added to cart!')
    }

    const isProductsPage = pathname?.endsWith('/products')

    if (loading) return <Loading />

    if (!storeData) {
        const isFashionPath = pathname?.startsWith('/fashion')
        return (
            <div className={`min-h-[70vh] flex items-center justify-center ${isFashionPath ? 'bg-[#faf5f0]' : ''}`}>
                <div className="text-center">
                    <h2 className={`text-2xl font-semibold mb-2 ${isFashionPath ? 'text-[#2d1810]' : 'text-zinc-100'}`}>Store not found</h2>
                    <p className={isFashionPath ? 'text-[#8B7355]' : 'text-zinc-400'}>This store doesn&apos;t exist or is not active.</p>
                </div>
            </div>
        )
    }

    const { store, metrics, featuredProducts, categories, recentReviews, ratingBreakdown, isOwner } = storeData
    const isFashion = store.storeType === 'fashion'

    const accent = isFashion ? '#8B6914' : '#22c55e'
    const productBasePath = isFashion ? '/fashion/product' : '/product'

    const c = {
        pageBg: isFashion ? 'bg-[#faf5f0]' : 'bg-[#0a0a0b]',
        cardBg: isFashion ? 'bg-white' : 'bg-zinc-900/60',
        cardBgGrad: isFashion ? 'bg-gradient-to-br from-white to-[#faf5f0]' : 'bg-gradient-to-br from-zinc-900/95 to-zinc-900/80',
        cardBorder: isFashion ? 'border-[#d4c4a8]/30' : 'border-zinc-800',
        heading: isFashion ? 'text-[#2d1810]' : 'text-white',
        text: isFashion ? 'text-[#8B7355]' : 'text-zinc-400',
        textMuted: isFashion ? 'text-[#8B7355]/60' : 'text-zinc-500',
        divider: isFashion ? 'bg-[#d4c4a8]/40' : 'bg-zinc-700',
        accentBg: isFashion ? 'bg-[#8B6914]' : 'bg-[#22c55e]',
        accentBgSoft: isFashion ? 'bg-[#8B6914]/20' : 'bg-[#22c55e]/20',
        accentText: isFashion ? 'text-[#8B6914]' : 'text-[#22c55e]',
        accentBorder: isFashion ? 'border-[#8B6914]/40' : 'border-[#22c55e]/40',
        accentFill: isFashion ? 'fill-[#8B6914] text-[#8B6914]' : 'fill-[#22c55e] text-[#22c55e]',
        accentFillEmpty: isFashion ? 'fill-[#d4c4a8]/30 text-[#d4c4a8]/30' : 'fill-zinc-700 text-zinc-700',
        btnSecBg: isFashion ? 'bg-[#f5ede3] hover:bg-[#ece2d0]' : 'bg-zinc-700 hover:bg-zinc-600',
        btnSecText: isFashion ? 'text-[#4a3728]' : 'text-zinc-200',
        btnSecBorder: isFashion ? 'border-[#d4c4a8]/50' : 'border-zinc-600',
        inputBg: isFashion ? 'bg-[#faf5f0]' : 'bg-zinc-800',
        inputBorder: isFashion ? 'border-[#d4c4a8]/40' : 'border-zinc-700',
        inputText: isFashion ? 'text-[#2d1810]' : 'text-white',
        barBg: isFashion ? 'bg-[#f5ede3]' : 'bg-zinc-800',
        imgBg: isFashion ? 'bg-[#f5ede3]' : 'bg-zinc-900',
        badgeTypeBg: isFashion ? 'bg-[#8B6914]/20 text-[#8B6914] border-[#8B6914]/40' : 'bg-teal-500/20 text-teal-300 border-teal-500/40',
    }

    return (
        <div className={`min-h-screen ${c.pageBg}`}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
                <StoreCover
                    cover={store.banner || null}
                    logo={store.logo}
                    name={store.name}
                    subtitle={store.description}
                    className="mt-0 mb-6"
                    isFashion={isFashion}
                />

                {/* Stats + Actions card */}
                <div className="max-w-6xl mx-auto mb-8">
                    <div className={`${c.cardBgGrad} border ${c.cardBorder} rounded-2xl p-6 shadow-xl`}>
                        <div className="flex flex-wrap items-center gap-2 mb-6">
                            <span className={`inline-flex items-center px-3 py-1.5 text-xs font-bold border rounded-full ${c.badgeTypeBg}`}>
                                {isFashion ? 'Fashion' : 'Electronics'}
                            </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 mb-6">
                            <div className="flex items-center gap-2">
                                <StarIcon className={`w-5 h-5 ${c.accentFill}`} />
                                <span className={`text-lg font-semibold ${c.heading}`}>{isNaN(metrics.avgRating) ? '0.0' : metrics.avgRating.toFixed(1)}</span>
                                <span className={`text-sm ${c.text}`}>({metrics.totalReviews} reviews)</span>
                            </div>
                            <div className={`h-5 w-px ${c.divider}`} />
                            <div className={`flex items-center gap-2 text-sm ${c.text}`}>
                                <PackageIcon className="w-4 h-4" />
                                <span>{metrics.totalOrders} orders</span>
                            </div>
                            <div className={`h-5 w-px ${c.divider}`} />
                            <div className={`flex items-center gap-2 text-sm ${c.text}`}>
                                <Users className="w-4 h-4" />
                                <span>{followerCount} followers</span>
                            </div>
                            <div className={`h-5 w-px ${c.divider}`} />
                            <div className={`flex items-center gap-2 text-sm ${c.text}`}>
                                <CalendarIcon className="w-4 h-4" />
                                <span>Since {formatDate(store.createdAt)}</span>
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-3">
                            <button
                                onClick={handleFollow}
                                disabled={followLoading || !user}
                                className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 flex items-center gap-2 ${isFollowing
                                        ? `${c.accentBg} hover:opacity-90 text-white shadow-lg`
                                        : `${c.accentBgSoft} hover:opacity-80 ${c.accentText} border ${c.accentBorder}`
                                    } ${followLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                <Heart className={`w-4 h-4 ${isFollowing ? 'fill-current' : ''}`} />
                                {isFollowing ? 'Following' : 'Follow Store'}
                            </button>
                            {isOwner && (
                                <Link
                                    href={isFashion ? "/fashion/create-store?edit=1" : "/create-store?edit=1"}
                                    className={`px-5 py-2.5 ${c.btnSecBg} ${c.btnSecText} border ${c.btnSecBorder} rounded-lg text-sm font-semibold transition-all duration-200 flex items-center gap-2`}
                                >
                                    <Pencil className="w-4 h-4" />
                                    Edit Store
                                </Link>
                            )}
                            {isOwner && (
                                <Link
                                    href={isFashion ? "/fashion/store" : "/store"}
                                    className={`px-5 py-2.5 ${c.btnSecBg} ${c.btnSecText} border ${c.btnSecBorder} rounded-lg text-sm font-semibold transition-all duration-200 flex items-center gap-2`}
                                >
                                    <LayoutDashboard className="w-4 h-4" />
                                    Dashboard
                                </Link>
                            )}
                            {isOwner && (
                                <Link
                                    href={isAdmin ? "/admin/messages" : (isFashion ? "/fashion/store/messages" : "/store/messages")}
                                    className={`px-5 py-2.5 ${c.btnSecBg} ${c.btnSecText} border ${c.btnSecBorder} rounded-lg text-sm font-semibold transition-all duration-200 flex items-center gap-2`}
                                >
                                    <MessageCircle className="w-4 h-4" />
                                    Messages
                                </Link>
                            )}
                            {(isOwner || isAdmin) && (
                                <Link
                                    href={isFashion ? "/fashion/store/home-banner" : "/store/home-banner"}
                                    className={`px-5 py-2.5 ${c.btnSecBg} ${c.btnSecText} border ${c.btnSecBorder} rounded-lg text-sm font-semibold transition-all duration-200 flex items-center gap-2`}
                                >
                                    <ImageIcon className="w-4 h-4" />
                                    Banners
                                </Link>
                            )}
                            {!isOwner && (
                                <button
                                    onClick={() => setShowContactPopup(true)}
                                    className={`px-5 py-2.5 ${c.accentBgSoft} hover:opacity-80 ${c.accentText} border ${c.accentBorder} rounded-lg text-sm font-semibold transition-all duration-200 flex items-center gap-2`}
                                    title="Contact store"
                                >
                                    <MailIcon className="w-4 h-4" />
                                    Contact
                                </button>
                            )}
                            {isAdmin && (
                                <Link
                                    href={`/admin/vendor-trust/${store.username}`}
                                    className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 flex items-center gap-2 shadow-lg ${isFashion
                                            ? 'bg-gradient-to-r from-amber-700/20 to-amber-800/20 hover:from-amber-700/30 hover:to-amber-800/30 text-amber-800 border border-amber-700/50 hover:border-amber-700/70 shadow-amber-800/10'
                                            : 'bg-gradient-to-r from-yellow-500/20 to-yellow-600/20 hover:from-yellow-500/30 hover:to-yellow-600/30 text-yellow-300 border border-yellow-500/40 hover:border-yellow-500/60 shadow-yellow-500/10'
                                        }`}
                                >
                                    <Award className="w-4 h-4" />
                                    Trust Index
                                </Link>
                            )}
                        </div>
                    </div>
                </div>

                <ContactPopup
                    isOpen={showContactPopup}
                    onClose={() => setShowContactPopup(false)}
                    store={store}
                    isOwner={isOwner}
                    isFashion={isFashion}
                />

                {/* Trust Snapshot */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    {[
                        { icon: StarIcon, label: 'Rating', value: isNaN(metrics.avgRating) ? '0.0' : metrics.avgRating.toFixed(1), sub: 'out of 5.0' },
                        { icon: PackageIcon, label: 'Orders', value: metrics.totalOrders, sub: 'completed' },
                        { icon: TrendingUpIcon, label: 'Products', value: metrics.totalProducts, sub: 'available', href: isFashion ? `/fashion/shop/${store.username}/products` : `/shop/${store.username}/products` },
                        { icon: ShieldCheckIcon, label: 'Refund Rate', value: `${metrics.refundRate.toFixed(1)}%`, sub: 'low & reliable' },
                    ].map(({ icon: Icon, label, value, sub, href }) => (
                        href ? (
                            <button
                                key={label}
                                type="button"
                                onClick={() => router.push(href)}
                                className={`${c.cardBg} border ${c.cardBorder} rounded-xl p-4 text-left w-full hover:border-opacity-80 hover:shadow-md transition`}
                            >
                                <div className="flex items-center gap-2 mb-2">
                                    <Icon className={`w-5 h-5 ${c.accentText}`} />
                                    <span className={`text-xs uppercase tracking-wide ${c.text}`}>{label}</span>
                                </div>
                                <p className={`text-2xl font-bold ${c.heading}`}>{value}</p>
                                <p className={`text-xs mt-1 ${c.textMuted}`}>{sub}</p>
                            </button>
                        ) : (
                            <div key={label} className={`${c.cardBg} border ${c.cardBorder} rounded-xl p-4`}>
                                <div className="flex items-center gap-2 mb-2">
                                    <Icon className={`w-5 h-5 ${c.accentText}`} />
                                    <span className={`text-xs uppercase tracking-wide ${c.text}`}>{label}</span>
                                </div>
                                <p className={`text-2xl font-bold ${c.heading}`}>{value}</p>
                                <p className={`text-xs mt-1 ${c.textMuted}`}>{sub}</p>
                            </div>
                        )
                    ))}
                </div>

                {/* Featured Products */}
                {featuredProducts && featuredProducts.length > 0 ? (
                    <section className="mb-12">
                        <h2 className={`text-2xl font-bold ${c.heading} mb-6`}>Featured Products</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                            {featuredProducts.map((product) => {
                                const productPrice = product.price || product.offer_price || 0
                                const productMrp = product.mrp || product.actual_price || productPrice
                                const discount = productMrp > productPrice ? Math.round(((productMrp - productPrice) / productMrp) * 100) : 0
                                const productRating = product.productRating || 0
                                const reviewCount = product.rating?.length || 0

                                return (
                                    <div key={product.id} className={`group ${c.cardBg} border ${c.cardBorder} rounded-xl overflow-hidden hover:border-[${accent}]/40 transition`}>
                                        <Link href={`${productBasePath}/${product.id}`} className="block">
                                            <div className={`relative h-48 ${c.imgBg} flex items-center justify-center overflow-hidden`}>
                                                <Image
                                                    src={product.images[0]}
                                                    alt={product.name}
                                                    width={300}
                                                    height={300}
                                                    className="max-h-44 w-auto object-contain group-hover:scale-110 transition duration-300"
                                                />
                                                {discount > 0 && (
                                                    <span className={`absolute top-3 left-3 px-2.5 py-1 text-xs font-bold rounded-lg ${c.accentBg} text-white`}>
                                                        {discount}% OFF
                                                    </span>
                                                )}
                                                {product.stock_quantity !== undefined && product.stock_quantity > 0 && product.low_stock_threshold !== undefined && product.stock_quantity <= product.low_stock_threshold && (
                                                    <span className={`absolute top-3 ${discount > 0 ? 'left-20' : 'left-3'} px-2.5 py-1 text-xs font-bold text-yellow-900 bg-yellow-400 rounded-lg`}>
                                                        {product.stock_quantity} left
                                                    </span>
                                                )}
                                            </div>
                                        </Link>
                                        <div className="p-4">
                                            <Link href={`${productBasePath}/${product.id}`}>
                                                <h3 className={`text-sm font-semibold ${c.heading} mb-2 line-clamp-2 group-hover:${c.accentText} transition`}>
                                                    {product.name}
                                                </h3>
                                            </Link>
                                            <div className="flex items-center gap-1 mb-2">
                                                {Array(5).fill('').map((_, i) => (
                                                    <StarIcon key={i} size={12} className={productRating >= i + 1 ? c.accentFill : c.accentFillEmpty} />
                                                ))}
                                                <span className={`text-xs ml-1 ${c.textMuted}`}>({reviewCount})</span>
                                            </div>
                                            <div className="flex items-center justify-between mt-3">
                                                <div>
                                                    <span className={`text-lg font-bold ${c.heading}`}>{currency}{productPrice.toFixed(2)}</span>
                                                    {productMrp > productPrice && (
                                                        <span className={`text-sm line-through ml-2 ${c.textMuted}`}>{currency}{productMrp.toFixed(2)}</span>
                                                    )}
                                                </div>
                                                {product.stock_quantity !== undefined && product.stock_quantity === 0 ? (
                                                    <span className="px-3 py-1.5 bg-red-500/20 border border-red-500/40 text-red-400 rounded-lg text-xs font-semibold">
                                                        Out of Stock
                                                    </span>
                                                ) : (
                                                    <button
                                                        onClick={(e) => { e.preventDefault(); handleQuickAdd(product) }}
                                                        className={`px-3 py-1.5 ${c.accentBg} hover:opacity-90 text-white rounded-lg text-xs font-semibold transition flex items-center gap-1`}
                                                    >
                                                        <ShoppingCart size={14} />
                                                        Add
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </section>
                ) : storeData.allProducts && storeData.allProducts.length === 0 ? (
                    <section className="mb-12">
                        <div className={`${c.cardBg} border ${c.cardBorder} rounded-xl p-12 text-center`}>
                            <PackageIcon className={`w-16 h-16 mx-auto mb-4 ${c.text}`} />
                            <h3 className={`text-xl font-semibold ${c.heading} mb-2`}>No Products Available</h3>
                            <p className={c.text}>This store hasn&apos;t added products yet.</p>
                        </div>
                    </section>
                ) : null}

                {/* Top Categories */}
                {categories && categories.length > 1 && (
                    <section className="mb-12">
                        <h2 className={`text-2xl font-bold ${c.heading} mb-6`}>Top Categories</h2>
                        <div className="space-y-4">
                            {categories.slice(0, 5).map((category, idx) => (
                                <button
                                    key={idx}
                                    type="button"
                                    onClick={() => router.push((isFashion ? `/fashion/shop/${store.username}/products` : `/shop/${store.username}/products`) + `?category=${encodeURIComponent(category.name)}`)}
                                    className={`${c.cardBg} border ${c.cardBorder} rounded-xl p-4 w-full text-left hover:border-opacity-80 hover:shadow-md transition`}
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <span className={`text-sm font-semibold ${c.heading}`}>{category.name}</span>
                                        <span className={`text-xs ${c.text}`}>{category.productCount} products · {category.contributionPercent.toFixed(1)}% of orders</span>
                                    </div>
                                    <div className={`h-2 ${c.barBg} rounded-full overflow-hidden`}>
                                        <div
                                            className={`h-full ${c.accentBg} rounded-full transition-all duration-500`}
                                            style={{ width: `${category.contributionPercent}%` }}
                                        />
                                    </div>
                                </button>
                            ))}
                        </div>
                    </section>
                )}

                {/* All Products Grid - preview only, full list on dedicated page */}
                <section className="mb-12">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                        <h2 className={`text-2xl font-bold ${c.heading}`}>All Products</h2>
                        <button
                            type="button"
                            onClick={() => router.push(isFashion ? `/fashion/shop/${store.username}/products` : `/shop/${store.username}/products`)}
                            className={`px-5 py-2.5 ${c.btnSecBg} ${c.btnSecText} border ${c.btnSecBorder} rounded-lg text-sm font-semibold transition-all duration-200 flex items-center gap-2`}
                        >
                            View all
                        </button>
                    </div>

                    <div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
                            {filteredAndSortedProducts.slice(0, 4).map((product) => (
                                <ProductCard key={product.id} product={product} isAdmin={isAdmin} />
                            ))}
                        </div>
                    </div>
                </section>

                {/* Customer Reviews */}
                <section className="mb-12">
                    <h2 className={`text-2xl font-bold ${c.heading} mb-6`}>Customer Reviews</h2>

                    {recentReviews.length === 0 ? (
                        <div className={`${c.cardBg} border ${c.cardBorder} rounded-xl p-8 text-center`}>
                            <p className={c.text}>No reviews yet. Be the first to review.</p>
                        </div>
                    ) : (
                        <div className="grid md:grid-cols-2 gap-6">
                            {/* Rating Breakdown */}
                            <div className={`${c.cardBg} border ${c.cardBorder} rounded-xl p-6`}>
                                <h3 className={`text-lg font-semibold ${c.heading} mb-4`}>Rating Breakdown</h3>
                                <div className="space-y-3">
                                    {[5, 4, 3, 2, 1].map((rating) => {
                                        const count = ratingBreakdown[rating] || 0
                                        const percentage = metrics.totalReviews > 0 ? (count / metrics.totalReviews) * 100 : 0
                                        return (
                                            <div key={rating} className="flex items-center gap-3">
                                                <div className="flex items-center gap-1 w-16">
                                                    <span className={`text-sm ${c.text}`}>{rating}</span>
                                                    <StarIcon className={`w-4 h-4 ${c.accentFill}`} />
                                                </div>
                                                <div className={`flex-1 h-2 ${c.barBg} rounded-full overflow-hidden`}>
                                                    <div
                                                        className={`h-full ${c.accentBg} rounded-full transition-all duration-500`}
                                                        style={{ width: `${percentage}%` }}
                                                    />
                                                </div>
                                                <span className={`text-xs w-12 text-right ${c.textMuted}`}>{count}</span>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>

                            {/* Recent Reviews */}
                            <div className="space-y-4">
                                <h3 className={`text-lg font-semibold ${c.heading}`}>Recent Reviews</h3>
                                {recentReviews.slice(0, 3).map((review) => (
                                    <div key={review.id} className={`${c.cardBg} border ${c.cardBorder} rounded-xl p-4`}>
                                        <div className="flex items-start gap-3 mb-2">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center overflow-hidden ${isFashion ? 'bg-[#f5ede3]' : 'bg-zinc-800'}`}>
                                                {review.userImage ? (
                                                    <Image src={review.userImage} alt={review.userName} width={32} height={32} className="object-cover" />
                                                ) : (
                                                    <span className={`text-xs ${c.text}`}>{review.userName[0]}</span>
                                                )}
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className={`text-sm font-semibold ${c.heading}`}>{review.userName}</span>
                                                    <span className={`text-xs ${c.textMuted}`}>{formatRelativeTime(review.createdAt)}</span>
                                                    <span className={`px-2 py-0.5 text-xs font-semibold rounded ${c.accentBgSoft} ${c.accentText}`}>
                                                        Verified Purchase
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-1 mb-2">
                                                    {Array(5).fill('').map((_, i) => (
                                                        <StarIcon key={i} size={12} className={review.rating >= i + 1 ? c.accentFill : c.accentFillEmpty} />
                                                    ))}
                                                </div>
                                                <p className={`text-sm ${isFashion ? 'text-[#4a3728]' : 'text-zinc-300'}`}>{review.comment}</p>
                                                <p className={`text-xs mt-2 ${c.textMuted}`}>Product: {review.productName}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </section>

                {/* AI Store Insight */}
                {metrics.avgRating >= 4 && metrics.totalReviews >= 5 && (
                    <section className="mb-12">
                        <div className={`${isFashion ? 'bg-gradient-to-r from-[#8B6914]/10 to-[#8B6914]/5 border-[#8B6914]/20' : 'bg-gradient-to-r from-[#22c55e]/10 to-[#22c55e]/5 border-[#22c55e]/20'} border rounded-xl p-6`}>
                            <div className="flex items-start gap-3">
                                <div className={`w-8 h-8 rounded-full ${c.accentBgSoft} flex items-center justify-center flex-shrink-0`}>
                                    <TrendingUpIcon className={`w-4 h-4 ${c.accentText}`} />
                                </div>
                                <div>
                                    <p className={`text-sm leading-relaxed ${isFashion ? 'text-[#4a3728]' : 'text-zinc-300'}`}>
                                        Customers appreciate this store for {metrics.avgRating >= 4.5 ? 'high-quality' : 'quality'} {store.storeType === 'fashion' ? 'fashion items' : 'electronics'} and competitive pricing.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </section>
                )}

            </div>
        </div>
    )
}
