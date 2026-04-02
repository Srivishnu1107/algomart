'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { Search, Filter, ChevronDown, Store, Package } from 'lucide-react'
import Image from 'next/image'

const isBlobUrl = (src) => typeof src === 'string' && src.startsWith('blob:')

export default function FashionStoresClient() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const pathname = usePathname()
    const initialSearch = searchParams.get('search') ?? ''
    const isFashion = pathname?.startsWith('/fashion') ?? true
    const basePath = '/fashion/stores'
    const storeType = 'fashion'

    const [stores, setStores] = useState([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState(initialSearch)
    const [sortBy, setSortBy] = useState('name')
    const [showFilters, setShowFilters] = useState(false)

    useEffect(() => {
        setSearch(initialSearch)
    }, [initialSearch])

    useEffect(() => {
        let cancelled = false
        setLoading(true)
        const params = new URLSearchParams()
        params.set('type', storeType)
        if (search.trim()) params.set('search', search.trim())
        fetch(`/api/stores?${params}`)
            .then((res) => res.json())
            .then((data) => {
                const list = data.stores ?? []
                // Ensure only fashion stores are shown on fashion side (defensive filter)
                if (!cancelled) setStores(list.filter((s) => s.storeType === 'fashion'))
            })
            .catch(() => {
                if (!cancelled) setStores([])
            })
            .finally(() => {
                if (!cancelled) setLoading(false)
            })
        return () => { cancelled = true }
    }, [storeType, search])

    const filteredAndSorted = useMemo(() => {
        let list = [...stores]
        if (sortBy === 'name') {
            list.sort((a, b) => (a.name || '').localeCompare(b.name || ''))
        } else if (sortBy === 'products') {
            list.sort((a, b) => (b.productCount ?? 0) - (a.productCount ?? 0))
        }
        return list
    }, [stores, sortBy])

    const handleSearchSubmit = (e) => {
        e.preventDefault()
        if (search.trim()) {
            router.push(`${basePath}?search=${encodeURIComponent(search.trim())}`)
        } else {
            router.push(basePath)
        }
    }

    const shopBase = isFashion ? '/fashion/shop' : '/shop'

    return (
        <div className="min-h-[70vh] mx-4 sm:mx-6 bg-[#faf5f0]">
            <div className="max-w-7xl mx-auto py-6">
                <h1 className="text-2xl sm:text-3xl font-bold text-[#2d1810] mb-6">Fashion Stores</h1>

                <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                    <form onSubmit={handleSearchSubmit} className="flex-1 min-w-[200px] max-w-md">
                        <div className="relative flex items-center bg-white border border-[#d4c4a8]/40 rounded-xl px-4 py-2.5 focus-within:border-[#8B6914]/50 focus-within:ring-2 focus-within:ring-[#8B6914]/15">
                            <Search size={20} className="text-[#8B7355] flex-shrink-0" />
                            <input
                                type="text"
                                placeholder="Search stores by name or username..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full bg-transparent outline-none placeholder-[#8B7355]/60 text-[#2d1810] pl-3 text-sm"
                            />
                        </div>
                    </form>
                    <button
                        type="button"
                        onClick={() => setShowFilters(!showFilters)}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-[#d4c4a8]/40 text-[#8B7355] hover:text-[#2d1810] hover:bg-[#f5ede3] transition cursor-pointer"
                    >
                        <Filter size={18} />
                        <span className="text-sm font-medium">Sort & filter</span>
                        <ChevronDown size={18} className={`transition ${showFilters ? 'rotate-180' : ''}`} />
                    </button>
                </div>

                {showFilters && (
                    <div className="mb-6 p-4 rounded-xl bg-white border border-[#d4c4a8]/30">
                        <label className="block text-xs font-medium text-[#8B7355] mb-2">Sort by</label>
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                            className="w-full max-w-xs px-3 py-2 rounded-lg bg-[#faf5f0] border border-[#d4c4a8]/40 text-[#2d1810] text-sm outline-none focus:border-[#8B6914]/50 cursor-pointer"
                        >
                            <option value="name">Name (A–Z)</option>
                            <option value="products">Most products</option>
                        </select>
                    </div>
                )}

                {search && (
                    <p className="text-sm text-zinc-500 mb-4">
                        Search: &quot;{search}&quot; — {filteredAndSorted.length} store{filteredAndSorted.length !== 1 ? 's' : ''}
                    </p>
                )}

                {loading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="rounded-xl border border-[#d4c4a8]/30 bg-white h-48 animate-pulse" />
                        ))}
                    </div>
                ) : filteredAndSorted.length === 0 ? (
                    <p className="text-center text-zinc-500 py-12">No stores found.</p>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                        {filteredAndSorted.map((store) => (
                            <Link
                                key={store.id}
                                href={`${shopBase}/${store.username}`}
                                className="group block rounded-xl border border-[#d4c4a8]/30 bg-white overflow-hidden hover:border-[#8B6914]/30 hover:shadow-[0_0_20px_-5px_rgba(139,105,20,0.08)] transition-all duration-300"
                            >
                                <div className="relative h-32 bg-[#f5ede3]">
                                    {store.banner && !isBlobUrl(store.banner) ? (
                                        <Image
                                            src={store.banner}
                                            alt=""
                                            fill
                                            className="object-cover"
                                            sizes="(max-width: 768px) 100vw, 33vw"
                                        />
                                    ) : (
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <Store className="w-12 h-12 text-[#d4c4a8]" />
                                        </div>
                                    )}
                                    <div className="absolute inset-0 bg-gradient-to-t from-[#2d1810]/70 to-transparent" />
                                    <div className="absolute bottom-2 left-2 right-2 flex items-center gap-2">
                                        {store.logo && !isBlobUrl(store.logo) ? (
                                            <div className="relative w-10 h-10 rounded-full border-2 border-white/30 overflow-hidden bg-[#f5ede3] flex-shrink-0">
                                                <Image src={store.logo} alt="" fill className="object-cover" sizes="40px" />
                                            </div>
                                        ) : null}
                                        <span className="font-semibold text-white truncate">{store.name}</span>
                                    </div>
                                </div>
                                <div className="p-3">
                                    <p className="text-xs text-[#8B7355]/60 truncate">@{store.username}</p>
                                    {store.description && (
                                        <p className="text-sm text-[#8B7355] line-clamp-2 mt-1">{store.description}</p>
                                    )}
                                    <div className="flex items-center gap-1 mt-2 text-[#8B7355] text-sm">
                                        <Package size={14} />
                                        <span>{store.productCount ?? 0} products</span>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
