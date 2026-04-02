'use client'

import React, { useState, useEffect, useMemo } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Flame, Clock, Star, ChevronRight } from 'lucide-react'
import axios from 'axios'

function useCountdown(endDate) {
  const [remaining, setRemaining] = useState({ h: 0, m: 0, s: 0, done: false })
  useEffect(() => {
    const tick = () => {
      const diff = Math.max(0, endDate - Date.now())
      if (diff <= 0) { setRemaining({ h: 0, m: 0, s: 0, done: true }); return }
      setRemaining({
        h: Math.floor(diff / 3600000),
        m: Math.floor((diff % 3600000) / 60000),
        s: Math.floor((diff % 60000) / 1000),
        done: false,
      })
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [endDate])
  return remaining
}

export default function DealsPageClient() {
  const [products, setProducts] = useState([])
  const [config, setConfig] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const [elRes, fashRes] = await Promise.all([
          axios.get('/api/deals-of-the-day?type=electronics'),
          axios.get('/api/deals-of-the-day?type=fashion'),
        ])
        const all = [
          ...(elRes.data.products || []).map((p) => ({ ...p, _storeType: 'electronics' })),
          ...(fashRes.data.products || []).map((p) => ({ ...p, _storeType: 'fashion' })),
        ]
        setProducts(all)
        setConfig(elRes.data.config || fashRes.data.config)
      } catch {
        setProducts([])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const endTime = useMemo(() => {
    const d = new Date()
    d.setHours(23, 59, 59, 999)
    return d.getTime()
  }, [])
  const { h, m, s, done } = useCountdown(endTime)

  const grouped = useMemo(() => {
    const map = {}
    for (const p of products) {
      const cat = p.category || 'Other'
      if (!map[cat]) map[cat] = []
      map[cat].push(p)
    }
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b))
  }, [products])

  const currency = process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || '₹'

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0b] pt-28 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-10 w-64 bg-zinc-800 rounded-xl" />
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
              {Array(8).fill('').map((_, i) => (
                <div key={i} className="h-80 bg-zinc-800/60 rounded-2xl" />
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0a0b] pt-28 pb-20 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto">
        {/* Page header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-12">
          <div className="flex items-center gap-3">
            <Flame size={28} className="text-cyan-400" />
            <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">Deals of the Day</h1>
          </div>
          {!done && (
            <div className="flex items-center gap-2.5 text-sm text-zinc-400">
              <Clock size={16} />
              <span>Ends in</span>
              <div className="flex items-center gap-1 font-mono">
                {[h, m, s].map((v, i) => (
                  <React.Fragment key={i}>
                    {i > 0 && <span className="text-zinc-600 font-bold text-lg">:</span>}
                    <span className="bg-cyan-500 text-white min-w-[2.2rem] text-center px-2 py-1.5 rounded-lg text-base font-bold tabular-nums">
                      {String(v).padStart(2, '0')}
                    </span>
                  </React.Fragment>
                ))}
              </div>
            </div>
          )}
        </div>

        {products.length === 0 && (
          <div className="text-center py-20">
            <p className="text-zinc-500 text-lg">No deals available right now. Check back later!</p>
          </div>
        )}

        {/* Category sections */}
        {grouped.map(([category, catProducts]) => (
          <section key={category} className="mb-14">
            <div className="flex items-center gap-2 mb-6">
              <h2 className="text-xl sm:text-2xl font-semibold text-zinc-100">{category}</h2>
              <ChevronRight size={20} className="text-zinc-500" />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
              {catProducts.map((product) => {
                const discount = product.mrp && product.mrp > product.price
                  ? Math.round(((product.mrp - product.price) / product.mrp) * 100)
                  : 0
                const ratingCount = product.rating?.length || 0
                const avgRating = ratingCount
                  ? (product.rating.reduce((acc, r) => acc + r.rating, 0) / ratingCount).toFixed(1)
                  : 0

                return (
                  <Link
                    key={product.id}
                    href={`/product/${product.id}`}
                    className="group"
                  >
                    <div className="rounded-2xl overflow-hidden bg-[#0f1118] border border-white/[0.06] hover:border-lime-400/20 hover:shadow-[0_0_25px_-5px_rgba(163,230,53,0.15)] transition-all duration-300 h-full">
                      <div className="relative aspect-square bg-zinc-800/40 overflow-hidden">
                        {product.images?.[0] && (
                          <Image
                            src={product.images[0]}
                            alt={product.name || ''}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform duration-300"
                            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                            unoptimized={product.images[0]?.includes('imagekit')}
                          />
                        )}
                        {discount > 0 && (
                          <span className="absolute top-3 left-3 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide rounded-lg bg-cyan-500 text-white shadow-lg">
                            {discount}% OFF
                          </span>
                        )}
                      </div>
                      <div className="p-4">
                        <h3 className="text-sm font-semibold text-zinc-200 line-clamp-2 group-hover:text-white transition-colors">
                          {product.name}
                        </h3>
                        {ratingCount > 0 && (
                          <div className="flex items-center gap-1 mt-1.5">
                            <div className="flex">
                              {Array(5).fill('').map((_, i) => (
                                <Star key={i} size={11} fill={i < Math.round(Number(avgRating)) ? '#14b8a6' : '#3f3f46'} className="text-transparent" />
                              ))}
                            </div>
                            <span className="text-[11px] text-zinc-500">({ratingCount})</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-lg font-bold text-white">{currency}{product.price}</span>
                          {product.mrp > product.price && (
                            <span className="text-xs text-zinc-500 line-through">{currency}{product.mrp}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
