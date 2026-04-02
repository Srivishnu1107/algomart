'use client'

import { useAuth } from '@clerk/nextjs'
import axios from 'axios'
import { Search, X, Zap, Percent, Monitor, Shirt } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast'

const FASHION_CATEGORIES = new Set(['Men', 'Women', 'Footwear', 'Accessories', 'Streetwear', 'Luxury'])

const CARD_SIZE_OPTIONS = [
  { value: 'default', label: 'Default' },
  { value: 'large', label: 'Large' },
]
const COLUMNS_OPTIONS = [
  { value: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4', label: '2 / 3 / 4 columns' },
  { value: 'grid-cols-2 sm:grid-cols-2 lg:grid-cols-4', label: '2 / 2 / 4 columns' },
  { value: 'grid-cols-2 sm:grid-cols-4 lg:grid-cols-6', label: '2 / 4 / 6 columns' },
]

const TABS = [
  { key: 'electronics', label: 'Electronics', icon: Monitor },
  { key: 'fashion', label: 'Fashion', icon: Shirt },
]

const DEFAULT_CONFIG = {
  enabled: false,
  productIds: [],
  autoDiscount: false,
  autoDiscountLimit: 8,
  limit: 8,
  title: 'Deals of the Day',
  subtitle: 'Best discounts for a limited time',
  viewHref: '/deals',
  viewLabel: 'View all deals',
  showCountdown: true,
  cardSize: 'large',
  columns: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4',
}

export default function AdminDealsPage() {
  const { getToken } = useAuth()
  const [activeTab, setActiveTab] = useState('electronics')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [config, setConfig] = useState({ ...DEFAULT_CONFIG })
  const [allProducts, setAllProducts] = useState([])
  const [search, setSearch] = useState('')

  const fetchConfig = useCallback(async (type) => {
    setLoading(true)
    try {
      const token = await getToken()
      const { data } = await axios.get(`/api/admin/deals-of-the-day?type=${type}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      setConfig(data.config ? { ...DEFAULT_CONFIG, ...data.config } : { ...DEFAULT_CONFIG })
    } catch (e) {
      toast.error(e?.response?.data?.error || 'Failed to load config')
      setConfig({ ...DEFAULT_CONFIG })
    } finally {
      setLoading(false)
    }
  }, [getToken])

  const fetchProducts = useCallback(async () => {
    try {
      const { data } = await axios.get('/api/products')
      setAllProducts(data.products || [])
    } catch (_) {
      setAllProducts([])
    }
  }, [])

  useEffect(() => {
    fetchConfig(activeTab)
  }, [activeTab, fetchConfig])

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const token = await getToken()
      await axios.put('/api/admin/deals-of-the-day', { ...config, storeType: activeTab }, {
        headers: { Authorization: `Bearer ${token}` },
      })
      toast.success(`Deals config saved for ${activeTab}.`)
    } catch (e) {
      toast.error(e?.response?.data?.error || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const isProductOfType = (p, type) => {
    const resolved = p.productType || p.store?.storeType
    if (resolved) return type === 'fashion' ? resolved === 'fashion' : resolved !== 'fashion'
    return type === 'fashion' ? FASHION_CATEGORIES.has(p.category) : !FASHION_CATEGORIES.has(p.category)
  }

  const typeProducts = allProducts.filter((p) => isProductOfType(p, activeTab))

  const filteredProducts = typeProducts.filter(
    (p) =>
      !config.productIds.includes(p.id) &&
      (search === '' ||
        p.name?.toLowerCase().includes(search.toLowerCase()) ||
        p.category?.toLowerCase().includes(search.toLowerCase()) ||
        p.brand?.toLowerCase().includes(search.toLowerCase()))
  )

  const selectedProducts = config.productIds
    .map((id) => allProducts.find((p) => p.id === id))
    .filter(Boolean)

  const addProduct = (id) => {
    if (config.productIds.includes(id)) return
    setConfig((c) => ({ ...c, productIds: [...c.productIds, id] }))
  }
  const removeProduct = (id) => {
    setConfig((c) => ({ ...c, productIds: c.productIds.filter((x) => x !== id) }))
  }

  const autoFillByDiscount = () => {
    const withDiscount = typeProducts
      .filter((p) => {
        const mrp = p.actual_price || p.mrp || 0
        const price = p.offer_price ?? p.price ?? mrp
        return mrp > price
      })
      .map((p) => {
        const mrp = p.actual_price || p.mrp || 0
        const price = p.offer_price ?? p.price ?? mrp
        return { ...p, _discount: ((mrp - price) / mrp) * 100 }
      })
      .sort((a, b) => b._discount - a._discount)
      .slice(0, config.autoDiscountLimit || 8)

    const ids = withDiscount.map((p) => p.id)
    setConfig((c) => ({ ...c, productIds: ids }))
    toast.success(`Auto-filled ${ids.length} products by highest discount.`)
  }

  const getDiscount = (p) => {
    const mrp = p.actual_price || p.mrp || 0
    const price = p.offer_price ?? p.price ?? mrp
    if (mrp <= price || mrp <= 0) return 0
    return Math.round(((mrp - price) / mrp) * 100)
  }

  const topDiscounted = typeProducts
    .filter((p) => getDiscount(p) > 0 && !config.productIds.includes(p.id))
    .sort((a, b) => getDiscount(b) - getDiscount(a))
    .slice(0, 6)

  if (loading) {
    return (
      <div className="animate-pulse rounded-2xl border border-zinc-700/60 bg-zinc-900/40 p-8">
        <div className="h-8 w-48 bg-zinc-800 rounded mb-6" />
        <div className="h-64 bg-zinc-800 rounded" />
      </div>
    )
  }

  return (
    <div className="mb-40 max-w-4xl">
      <h1 className="text-2xl sm:text-3xl font-bold text-zinc-100 mb-1">
        <span className="text-amber-400">Deals of the Day</span>
      </h1>
      <p className="text-sm text-zinc-500 mb-6">
        Configure which products appear in the &quot;Deals of the Day&quot; section. Settings are separate for electronics and fashion.
      </p>

      {/* ── Tabs ── */}
      <div className="flex gap-2 mb-8">
        {TABS.map((tab) => {
          const active = activeTab === tab.key
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => { setActiveTab(tab.key); setSearch('') }}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition border ${
                active
                  ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                  : 'bg-zinc-800/60 text-zinc-400 border-zinc-700 hover:bg-zinc-700/60 hover:text-zinc-200'
              }`}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          )
        })}
      </div>

      <form onSubmit={handleSave} className="space-y-8">
        {/* ── Enable + display options ── */}
        <div className="rounded-2xl border border-zinc-700/60 bg-gradient-to-br from-zinc-900/80 to-zinc-900/60 p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Zap size={20} className="text-amber-400" />
            Section &amp; display ({activeTab})
          </h2>
          <label className="flex items-center gap-3 cursor-pointer mb-6">
            <input
              type="checkbox"
              checked={config.enabled}
              onChange={(e) => setConfig((c) => ({ ...c, enabled: e.target.checked }))}
              className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-amber-500 focus:ring-amber-500/50"
            />
            <span className="text-zinc-200">Show &quot;Deals of the Day&quot; on <strong>{activeTab}</strong> home page</span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1">Section title</label>
              <input
                type="text"
                value={config.title}
                onChange={(e) => setConfig((c) => ({ ...c, title: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-xl bg-zinc-800 border border-zinc-600 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                placeholder="Deals of the Day"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1">Subtitle</label>
              <input
                type="text"
                value={config.subtitle}
                onChange={(e) => setConfig((c) => ({ ...c, subtitle: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-xl bg-zinc-800 border border-zinc-600 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                placeholder="Best discounts for a limited time"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1">Max products to show</label>
              <input
                type="number"
                min={1}
                max={24}
                value={config.limit}
                onChange={(e) => setConfig((c) => ({ ...c, limit: Math.min(24, Math.max(1, Number(e.target.value) || 8)) }))}
                className="w-full px-4 py-2.5 rounded-xl bg-zinc-800 border border-zinc-600 text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1">Card size</label>
              <select
                value={config.cardSize}
                onChange={(e) => setConfig((c) => ({ ...c, cardSize: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-xl bg-zinc-800 border border-zinc-600 text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              >
                {CARD_SIZE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <label className="flex items-center gap-3 cursor-pointer sm:col-span-2">
              <input
                type="checkbox"
                checked={config.showCountdown}
                onChange={(e) => setConfig((c) => ({ ...c, showCountdown: e.target.checked }))}
                className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-amber-500 focus:ring-amber-500/50"
              />
              <span className="text-zinc-200">Show countdown timer (end of day)</span>
            </label>
          </div>
        </div>

        {/* ── Auto-discount selector ── */}
        <div className="rounded-2xl border border-zinc-700/60 bg-gradient-to-br from-zinc-900/80 to-zinc-900/60 p-6">
          <h2 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
            <Percent size={20} className="text-emerald-400" />
            Auto-select by discount
          </h2>
          <p className="text-sm text-zinc-500 mb-4">
            Automatically include the most discounted <strong>{activeTab}</strong> products. Manual selections below are added on top.
          </p>
          <label className="flex items-center gap-3 cursor-pointer mb-4">
            <input
              type="checkbox"
              checked={config.autoDiscount}
              onChange={(e) => setConfig((c) => ({ ...c, autoDiscount: e.target.checked }))}
              className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-emerald-500 focus:ring-emerald-500/50"
            />
            <span className="text-zinc-200">Enable auto-select by highest discount %</span>
          </label>
          {config.autoDiscount && (
            <div className="flex items-center gap-4">
              <div>
                <label className="block text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1">Auto-select count</label>
                <input
                  type="number"
                  min={1}
                  max={24}
                  value={config.autoDiscountLimit}
                  onChange={(e) => setConfig((c) => ({ ...c, autoDiscountLimit: Math.min(24, Math.max(1, Number(e.target.value) || 8)) }))}
                  className="w-32 px-4 py-2.5 rounded-xl bg-zinc-800 border border-zinc-600 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                />
              </div>
            </div>
          )}
          <button
            type="button"
            onClick={autoFillByDiscount}
            className="mt-4 px-5 py-2.5 rounded-xl text-sm font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 hover:bg-emerald-500/30 transition"
          >
            Auto-fill manual list with top discounts
          </button>
        </div>

        {/* ── Product picker ── */}
        <div className="rounded-2xl border border-zinc-700/60 bg-gradient-to-br from-zinc-900/80 to-zinc-900/60 p-6">
          <h2 className="text-lg font-semibold text-white mb-2">Manually Selected Products ({activeTab})</h2>
          <p className="text-sm text-zinc-500 mb-4">Order = display order. Only in-stock, active products from active stores are shown.</p>

          {/* Selected chips */}
          {selectedProducts.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {selectedProducts.map((p) => {
                const disc = getDiscount(p)
                return (
                  <span
                    key={p.id}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-800 border border-zinc-600 text-sm text-zinc-200"
                  >
                    <span className="max-w-[180px] truncate" title={p.name}>{p.name}</span>
                    {disc > 0 && (
                      <span className="text-[11px] font-bold text-emerald-400">{disc}%</span>
                    )}
                    <button
                      type="button"
                      onClick={() => removeProduct(p.id)}
                      className="p-0.5 rounded text-zinc-400 hover:text-red-400 hover:bg-red-500/10"
                      aria-label="Remove"
                    >
                      <X size={14} />
                    </button>
                  </span>
                )
              })}
            </div>
          )}

          {/* Quick add — top discounted products */}
          {topDiscounted.length > 0 && !search && (
            <div className="mb-4">
              <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">Top discounted {activeTab} products</p>
              <div className="flex flex-wrap gap-2">
                {topDiscounted.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => addProduct(p.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800/80 border border-zinc-700 text-sm text-zinc-300 hover:bg-zinc-700 hover:text-white transition"
                  >
                    <span className="max-w-[160px] truncate">{p.name}</span>
                    <span className="text-[11px] font-bold text-emerald-400">{getDiscount(p)}% off</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Search */}
          <div className="relative mb-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`Search ${activeTab} products to add...`}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-zinc-800 border border-zinc-600 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
            />
          </div>
          <ul className="max-h-56 overflow-y-auto rounded-xl border border-zinc-700 bg-zinc-800/50 divide-y divide-zinc-700">
            {filteredProducts.length === 0 ? (
              <li className="py-4 px-4 text-sm text-zinc-500 text-center">
                {search ? 'No matching products or all are already selected.' : `No ${activeTab} products available to add.`}
              </li>
            ) : (
              filteredProducts.slice(0, 50).map((p) => {
                const disc = getDiscount(p)
                return (
                  <li key={p.id} className="flex items-center justify-between gap-2 py-2 px-3 hover:bg-zinc-700/50">
                    <span className="text-sm text-zinc-200 truncate flex-1" title={p.name}>{p.name}</span>
                    <span className="text-xs text-zinc-500 shrink-0">{p.category || '—'}</span>
                    {disc > 0 && (
                      <span className="text-[11px] font-bold text-emerald-400 shrink-0">{disc}%</span>
                    )}
                    <button
                      type="button"
                      onClick={() => addProduct(p.id)}
                      className="text-xs font-medium text-amber-400 hover:text-amber-300 px-2 py-1 rounded border border-amber-500/40 hover:bg-amber-500/10"
                    >
                      Add
                    </button>
                  </li>
                )
              })
            )}
          </ul>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-3 rounded-xl font-semibold bg-amber-500/20 text-amber-400 border border-amber-500/40 hover:bg-amber-500/30 disabled:opacity-50 transition"
          >
            {saving ? 'Saving...' : `Save ${activeTab} deals`}
          </button>
        </div>
      </form>
    </div>
  )
}
