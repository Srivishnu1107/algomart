'use client'

import { useAuth } from '@clerk/nextjs'
import axios from 'axios'
import { Plus, Search, Send, Trash2, X } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast'

export default function AdminBannersPage() {
  const { getToken } = useAuth()
  const [loading, setLoading] = useState(true)
  const [bannerIds, setBannerIds] = useState([])
  const [banners, setBanners] = useState([])
  const [addPanelOpen, setAddPanelOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [publishing, setPublishing] = useState(false)

  const fetchHomePageBanners = useCallback(async () => {
    try {
      const token = await getToken()
      const { data } = await axios.get('/api/admin/home-page-banners', {
        headers: { Authorization: `Bearer ${token}` },
      })
      setBannerIds(data.bannerIds || [])
      setBanners(data.banners || [])
    } catch (e) {
      toast.error(e?.response?.data?.error || 'Failed to load banners')
      setBannerIds([])
      setBanners([])
    } finally {
      setLoading(false)
    }
  }, [getToken])

  const fetchSearchBanners = useCallback(async (q) => {
    setSearchLoading(true)
    try {
      const token = await getToken()
      const url = q ? `/api/admin/banners/search?q=${encodeURIComponent(q)}` : '/api/admin/banners/search'
      const { data } = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` },
      })
      setSearchResults(data.banners || [])
    } catch (e) {
      toast.error(e?.response?.data?.error || 'Failed to search')
      setSearchResults([])
    } finally {
      setSearchLoading(false)
    }
  }, [getToken])

  useEffect(() => {
    fetchHomePageBanners()
  }, [fetchHomePageBanners])

  useEffect(() => {
    if (!addPanelOpen) return
    const t = setTimeout(() => fetchSearchBanners(searchQuery), 300)
    return () => clearTimeout(t)
  }, [addPanelOpen, searchQuery, fetchSearchBanners])

  const handleRemove = async (bannerId) => {
    const next = bannerIds.filter((id) => id !== bannerId)
    try {
      const token = await getToken()
      await axios.put('/api/admin/home-page-banners', { bannerIds: next }, {
        headers: { Authorization: `Bearer ${token}` },
      })
      toast.success('Banner removed from home page.')
      fetchHomePageBanners()
    } catch (e) {
      toast.error(e?.response?.data?.error || 'Failed to remove')
    }
  }

  const handlePublish = async () => {
    setPublishing(true)
    try {
      const token = await getToken()
      const { data: current } = await axios.get('/api/admin/home-page-banners', {
        headers: { Authorization: `Bearer ${token}` },
      })
      const existingIds = current.bannerIds || []
      const mergedIds = [...existingIds]
      for (const id of bannerIds) {
        if (!mergedIds.includes(id)) mergedIds.push(id)
      }
      await axios.put('/api/admin/home-page-banners', { bannerIds: mergedIds }, {
        headers: { Authorization: `Bearer ${token}` },
      })
      toast.success('Published to home page.')
      fetchHomePageBanners()
    } catch (e) {
      toast.error(e?.response?.data?.error || 'Failed to publish')
    } finally {
      setPublishing(false)
    }
  }

  const handleAddBanner = async (bannerId) => {
    if (bannerIds.includes(bannerId)) {
      toast.success('Already on home page.')
      return
    }
    const next = [...bannerIds, bannerId]
    try {
      const token = await getToken()
      await axios.put('/api/admin/home-page-banners', { bannerIds: next }, {
        headers: { Authorization: `Bearer ${token}` },
      })
      toast.success('Banner added to home page.')
      setBannerIds(next)
      fetchHomePageBanners()
    } catch (e) {
      toast.error(e?.response?.data?.error || 'Failed to add')
    }
  }

  if (loading) {
    return (
      <div className="animate-pulse rounded-2xl border border-zinc-700/60 bg-zinc-900/40 p-8">
        <div className="h-8 w-48 bg-zinc-800 rounded mb-6" />
        <div className="h-48 bg-zinc-800 rounded" />
      </div>
    )
  }

  return (
    <div className="mb-40 max-w-4xl">
      <h1 className="text-2xl sm:text-3xl font-bold text-zinc-100 mb-1">
        <span className="text-amber-400">Home page hero banners</span>
      </h1>
      <p className="text-sm text-zinc-500 mb-8">
        Vendors create banners in their store. You decide which vendor banners appear as the <strong>hero on the main page</strong>. Add or remove below.
      </p>

      <div className="rounded-2xl border border-zinc-700/60 bg-gradient-to-br from-zinc-900/80 to-zinc-900/60 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
          <h2 className="text-lg font-semibold text-white">Banners on home hero</h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePublish}
              disabled={publishing || bannerIds.length === 0}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-500/20 text-teal-400 border border-teal-500/40 hover:bg-teal-500/30 disabled:opacity-50 disabled:pointer-events-none transition"
            >
              <Send size={18} />
              {publishing ? 'Publishing…' : 'Publish to home page'}
            </button>
            <button
              type="button"
              onClick={() => { setAddPanelOpen(true); setSearchQuery(''); fetchSearchBanners(''); }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/40 hover:bg-amber-500/30 transition"
            >
              <Plus size={18} />
              Add
            </button>
          </div>
        </div>
        <p className="text-xs text-zinc-500 mb-4">Electronics banners show on main home; fashion banners show on the Fashion page.</p>

        {banners.length === 0 ? (
          <p className="text-zinc-500 py-8 text-center">No banners on the hero yet. Click &quot;Add&quot; to choose vendor banners to show on the main page.</p>
        ) : (
          <ul className="space-y-3">
            {banners.map((b) => (
              <li
                key={b.id}
                className="flex items-center gap-4 p-3 rounded-xl bg-zinc-800/60 border border-zinc-700/50"
              >
                <div className="w-28 h-16 rounded-lg overflow-hidden bg-zinc-800 flex-shrink-0">
                  <img src={b.imageUrl} alt="" className="w-full h-full object-cover" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-white truncate">{b.name || 'Banner'}</p>
                  <p className="text-xs text-zinc-500 truncate">{b.storeName} · {b.storeUsername}</p>
                  <span className={`inline-block mt-1 px-2 py-0.5 rounded text-xs font-medium ${b.storeType === 'fashion' ? 'bg-pink-500/20 text-pink-400' : 'bg-teal-500/20 text-teal-400'}`}>
                    {b.storeType === 'fashion' ? 'Fashion' : 'Electronics'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemove(b.id)}
                  className="p-2 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition flex-shrink-0"
                  aria-label="Remove from home page"
                >
                  <Trash2 size={18} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Add panel (slide-over) */}
      {addPanelOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/60 z-40"
            onClick={() => setAddPanelOpen(false)}
            aria-hidden
          />
          <div className="fixed top-0 right-0 bottom-0 w-full max-w-md bg-zinc-900 border-l border-zinc-700 shadow-xl z-50 flex flex-col">
            <div className="p-4 border-b border-zinc-700 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Add banner to hero</h3>
              <button
                type="button"
                onClick={() => setAddPanelOpen(false)}
                className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-4 border-b border-zinc-700">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search banners by name..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-zinc-800 border border-zinc-600 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                />
              </div>
              <p className="text-xs text-zinc-500 mt-2">Vendor banners are listed below. Search by name or browse. You decide what to post on the main page.</p>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {searchLoading ? (
                <div className="py-8 text-center text-zinc-500">Loading...</div>
              ) : searchResults.length === 0 ? (
                <p className="text-zinc-500 py-8 text-center">No banners found. Vendors create banners in Store → Home Page Banner.</p>
              ) : (
                <ul className="space-y-3">
                  {searchResults.map((b) => {
                    const isOnHomePage = bannerIds.includes(b.id)
                    return (
                      <li
                        key={b.id}
                        className="flex items-center gap-3 p-3 rounded-xl bg-zinc-800/60 border border-zinc-700/50"
                      >
                        <div className="w-20 h-12 rounded-lg overflow-hidden bg-zinc-800 flex-shrink-0">
                          <img src={b.imageUrl} alt="" className="w-full h-full object-cover" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-white text-sm truncate">{b.name || 'Banner'}</p>
                          <p className="text-xs text-zinc-500 truncate">{b.storeName}</p>
                          <span className={`inline-block mt-1 px-2 py-0.5 rounded text-xs font-medium ${b.storeType === 'fashion' ? 'bg-pink-500/20 text-pink-400' : 'bg-teal-500/20 text-teal-400'}`}>
                            {b.storeType === 'fashion' ? 'Fashion' : 'Electronics'}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleAddBanner(b.id)}
                          disabled={isOnHomePage}
                          className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                            isOnHomePage
                              ? 'bg-zinc-700 text-zinc-500 cursor-default'
                              : 'bg-amber-500/20 text-amber-400 border border-amber-500/40 hover:bg-amber-500/30'
                          }`}
                        >
                          {isOnHomePage ? 'Added' : 'Add'}
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
