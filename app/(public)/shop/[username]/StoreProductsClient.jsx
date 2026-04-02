'use client'

import ProductCard from "@/components/ModelCard"
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import Loading from "@/components/Loading"
import axios from "axios"
import toast from "react-hot-toast"
import StoreCover from "@/components/StoreCover"
import { FilterIcon, ArrowUpDownIcon } from "lucide-react"

export default function StoreProductsClient() {
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
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const productsPerPage = 16
  const currency = process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || '₹'

  useEffect(() => {
    const fetchStoreData = async () => {
      try {
        const { data } = await axios.get(`/api/store/data?username=${username}`)
        setStoreData(data)
      } catch (error) {
        toast.error(error?.response?.data?.error || error.message)
      }
      setLoading(false)
    }

    if (username) fetchStoreData()
  }, [username])

  useEffect(() => {
    if (!storeData?.store || !username) return
    const isFashionPath = pathname?.startsWith('/fashion/shop/')
    const isFashionStore = storeData.store.storeType === 'fashion'
    if (isFashionStore && !isFashionPath) {
      router.replace(`/fashion/shop/${username}/products${searchParams?.toString() ? `?${searchParams.toString()}` : ''}`)
      return
    }
    if (!isFashionStore && isFashionPath) {
      router.replace(`/shop/${username}/products${searchParams?.toString() ? `?${searchParams.toString()}` : ''}`)
    }
  }, [storeData, username, pathname, router, searchParams])

  useEffect(() => {
    if (!searchParams) return
    const initialSearch = searchParams.get('q') || ''
    const initialCategory = searchParams.get('category') || ''
    if (initialSearch) setSearchQuery(initialSearch)
    if (initialCategory) setCategoryFilter(initialCategory)
  }, [searchParams])

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
  }, [storeData?.allProducts, sortBy, priceFilter, searchQuery, categoryFilter])

  const totalPages = Math.ceil(filteredAndSortedProducts.length / productsPerPage)
  const paginatedProducts = filteredAndSortedProducts.slice((currentPage - 1) * productsPerPage, currentPage * productsPerPage)

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

  const { store } = storeData
  const isFashion = store.storeType === 'fashion'

  const c = {
    pageBg: isFashion ? 'bg-[#faf5f0]' : 'bg-[#0a0a0b]',
    cardBg: isFashion ? 'bg-white' : 'bg-zinc-900/60',
    cardBorder: isFashion ? 'border-[#d4c4a8]/30' : 'border-zinc-800',
    heading: isFashion ? 'text-[#2d1810]' : 'text-white',
    text: isFashion ? 'text-[#8B7355]' : 'text-zinc-400',
    textMuted: isFashion ? 'text-[#8B7355]/60' : 'text-zinc-500',
    btnSecBg: isFashion ? 'bg-[#f5ede3] hover:bg-[#ece2d0]' : 'bg-zinc-700 hover:bg-zinc-600',
    btnSecText: isFashion ? 'text-[#4a3728]' : 'text-zinc-200',
    btnSecBorder: isFashion ? 'border-[#d4c4a8]/50' : 'border-zinc-600',
    inputBg: isFashion ? 'bg-[#faf5f0]' : 'bg-zinc-800',
    inputBorder: isFashion ? 'border-[#d4c4a8]/40' : 'border-zinc-700',
    inputText: isFashion ? 'text-[#2d1810]' : 'text-white',
  }

  return (
    <div className={`min-h-screen ${c.pageBg}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <StoreCover
          cover={store.banner || null}
          logo={store.logo}
          name={store.name}
          subtitle={store.description}
          className="mt-0 mb-8"
          isFashion={isFashion}
        />

        <div className="mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className={`text-2xl sm:text-3xl font-bold ${c.heading}`}>All Products</h1>
            {categoryFilter && (
              <p className={`text-sm mt-1 ${c.textMuted}`}>Category: {categoryFilter}</p>
            )}
          </div>
          <button
            type="button"
            onClick={() => router.push(isFashion ? `/fashion/shop/${store.username}` : `/shop/${store.username}`)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold ${c.btnSecBg} ${c.btnSecText} border ${c.btnSecBorder}`}
          >
            Back to Store Profile
          </button>
        </div>

        <div className="mb-6 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="flex-1 sm:flex-none">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1) }}
              placeholder="Search products..."
              className={`w-full px-3 py-2 ${c.inputBg} border ${c.inputBorder} rounded-lg ${c.inputText} text-sm focus:outline-none`}
            />
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-4 py-2 ${c.cardBg} hover:opacity-90 border ${c.cardBorder} rounded-lg text-sm font-semibold ${c.btnSecText} flex items-center gap-2 transition`}
            >
              <FilterIcon className="w-4 h-4" />
              Filters
            </button>
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className={`px-4 py-2 ${c.cardBg} hover:opacity-90 border ${c.cardBorder} rounded-lg text-sm font-semibold ${c.btnSecText} appearance-none pr-8 cursor-pointer transition`}
              >
                <option value="popular">Popular</option>
                <option value="newest">Newest</option>
                <option value="price-low">Price: Low to High</option>
              </select>
              <ArrowUpDownIcon className={`w-4 h-4 absolute right-2 top-1/2 -translate-y-1/2 ${c.text} pointer-events-none`} />
            </div>
          </div>
        </div>

        {showFilters && (
          <div className={`${c.cardBg} border ${c.cardBorder} rounded-xl p-4 mb-6`}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={`text-xs uppercase tracking-wide mb-2 block ${c.text}`}>Min Price</label>
                <input
                  type="number"
                  value={priceFilter.min}
                  onChange={(e) => setPriceFilter({ ...priceFilter, min: e.target.value })}
                  placeholder="0"
                  className={`w-full px-3 py-2 ${c.inputBg} border ${c.inputBorder} rounded-lg ${c.inputText} text-sm focus:outline-none`}
                />
              </div>
              <div>
                <label className={`text-xs uppercase tracking-wide mb-2 block ${c.text}`}>Max Price</label>
                <input
                  type="number"
                  value={priceFilter.max}
                  onChange={(e) => setPriceFilter({ ...priceFilter, max: e.target.value })}
                  placeholder="1000"
                  className={`w-full px-3 py-2 ${c.inputBg} border ${c.inputBorder} rounded-lg ${c.inputText} text-sm focus:outline-none`}
                />
              </div>
            </div>
          </div>
        )}

        {paginatedProducts.length === 0 ? (
          <div className="text-center py-12">
            <p className={c.text}>No products found matching your filters.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
              {paginatedProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-8">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className={`px-4 py-2 ${c.cardBg} hover:opacity-90 border ${c.cardBorder} rounded-lg text-sm font-semibold ${c.btnSecText} disabled:opacity-50 disabled:cursor-not-allowed transition`}
                >
                  Previous
                </button>
                <span className={`text-sm ${c.text}`}>
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className={`px-4 py-2 ${c.cardBg} hover:opacity-90 border ${c.cardBorder} rounded-lg text-sm font-semibold ${c.btnSecText} disabled:opacity-50 disabled:cursor-not-allowed transition`}
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

