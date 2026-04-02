'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Search, Filter, ChevronDown, Store, Package } from 'lucide-react'
import Image from 'next/image'

const isBlobUrl = (src) => typeof src === 'string' && src.startsWith('blob:')

export default function StoresClient() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const initialSearch = searchParams.get('search') ?? ''
    const isFashion = false
    const basePath = '/stores'
    const storeType = 'electronics'

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
                // Ensure only electronics stores are shown on main stores page
                if (!cancelled) setStores(list.filter((s) => s.storeType !== 'fashion'))
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
        <div className="min-h-[70vh] mx-4 sm:mx-6 bg-[#0a0a0b]">
            <div className="max-w-7xl mx-auto py-6">
                <h1 className="text-2xl sm:text-3xl font-bold text-white mb-6">Stores</h1>

                <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                    <form onSubmit={handleSearchSubmit} className="flex-1 min-w-[200px] max-w-md">
                        <div className="relative flex items-center bg-zinc-900/80 border border-zinc-700/80 rounded-xl px-4 py-2.5 focus-within:border-teal-500/60 focus-within:ring-2 focus-within:ring-teal-500/20">
                            <Search size={20} className="text-zinc-500 flex-shrink-0" />
                            <input
                                type="text"
                                placeholder="Search stores by name or username..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full bg-transparent outline-none placeholder-zinc-500 text-zinc-100 pl-3 text-sm"
                            />
                        </div>
                    </form>
                    <button
                        type="button"
                        onClick={() => setShowFilters(!showFilters)}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-800/80 border border-zinc-700/80 text-zinc-300 hover:text-white hover:bg-zinc-800 transition cursor-pointer"
                    >
                        <Filter size={18} />
                        <span className="text-sm font-medium">Sort & filter</span>
                        <ChevronDown size={18} className={`transition ${showFilters ? 'rotate-180' : ''}`} />
                    </button>
                </div>

                {showFilters && (
                    <div className="mb-6 p-4 rounded-xl bg-zinc-900/60 border border-zinc-700/80">
                        <label className="block text-xs font-medium text-zinc-500 mb-2">Sort by</label>
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                            className="w-full max-w-xs px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-600 text-zinc-200 text-sm outline-none focus:border-teal-500/50 cursor-pointer"
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
                            <div key={i} className="rounded-xl border border-zinc-700/80 bg-zinc-900/60 h-48 animate-pulse" />
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
                                className="group block rounded-xl border border-zinc-700/80 bg-zinc-900/60 overflow-hidden hover:border-teal-500/50 hover:bg-zinc-800/80 transition"
                            >
                                <div className="relative h-32 bg-zinc-800/80">
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
                                            <Store className="w-12 h-12 text-zinc-600" />
                                        </div>
                                    )}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                                    <div className="absolute bottom-2 left-2 right-2 flex items-center gap-2">
                                        {store.logo && !isBlobUrl(store.logo) ? (
                                            <div className="relative w-10 h-10 rounded-full border-2 border-white/20 overflow-hidden bg-zinc-800 flex-shrink-0">
                                                <Image src={store.logo} alt="" fill className="object-cover" sizes="40px" />
                                            </div>
                                        ) : null}
                                        <span className="font-semibold text-white truncate">{store.name}</span>
                                    </div>
                                </div>
                                <div className="p-3">
                                    <p className="text-xs text-zinc-500 truncate">@{store.username}</p>
                                    {store.description && (
                                        <p className="text-sm text-zinc-400 line-clamp-2 mt-1">{store.description}</p>
                                    )}
                                    <div className="flex items-center gap-1 mt-2 text-zinc-500 text-sm">
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
