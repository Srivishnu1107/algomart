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

export default function FashionDealsPageClient() {
  const [products, setProducts] = useState([])
  const [config, setConfig] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const res = await axios.get('/api/deals-of-the-day?type=fashion')
        setProducts(res.data.products || [])
        setConfig(res.data.config || null)
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
      <div className="min-h-screen bg-[#faf5f0] pt-28 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-10 w-64 bg-[#ede3d3] rounded-xl" />
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
              {Array(8).fill('').map((_, i) => (
                <div key={i} className="h-80 bg-[#f5ede3] rounded-2xl" />
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#faf5f0] pt-28 pb-20 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto">
        {/* Page header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-12">
          <div className="flex items-center gap-3">
            <Flame size={28} className="text-[#8B6914]" />
            <h1 className="text-3xl sm:text-4xl font-bold text-[#2d1810] tracking-tight">Fashion Deals of the Day</h1>
          </div>
          {!done && (
            <div className="flex items-center gap-2.5 text-sm text-[#8B7355]">
              <Clock size={16} />
              <span>Ends in</span>
              <div className="flex items-center gap-1 font-mono">
                {[h, m, s].map((v, i) => (
                  <React.Fragment key={i}>
                    {i > 0 && <span className="text-[#8B7355] font-bold text-lg">:</span>}
                    <span className="bg-[#8B6914] text-white min-w-[2.2rem] text-center px-2 py-1.5 rounded-lg text-base font-bold tabular-nums">
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
            <p className="text-[#8B7355] text-lg">No fashion deals available right now. Check back later!</p>
          </div>
        )}

        {/* Category sections */}
        {grouped.map(([category, catProducts]) => (
          <section key={category} className="mb-14">
            <div className="flex items-center gap-2 mb-6">
              <h2 className="text-xl sm:text-2xl font-semibold text-[#2d1810]">{category}</h2>
              <ChevronRight size={20} className="text-[#8B7355]" />
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
                    <div className="rounded-2xl overflow-hidden bg-white border border-[#d4c4a8]/30 hover:border-[#8B6914]/30 hover:shadow-[0_8px_30px_-8px_rgba(139,105,20,0.12)] transition-all duration-300 h-full">
                      <div className="relative aspect-square bg-[#f9f4ee] overflow-hidden">
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
                          <span className="absolute top-3 left-3 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide rounded-lg bg-[#8B6914] text-white shadow-md">
                            {discount}% OFF
                          </span>
                        )}
                      </div>
                      <div className="p-4">
                        <h3 className="text-sm font-semibold text-[#2d1810] line-clamp-2 group-hover:text-[#8B6914] transition-colors">
                          {product.name}
                        </h3>
                        {ratingCount > 0 && (
                          <div className="flex items-center gap-1 mt-1.5">
                            <div className="flex">
                              {Array(5).fill('').map((_, i) => (
                                <Star key={i} size={11} fill={i < Math.round(Number(avgRating)) ? '#f59e0b' : '#d4c4a8'} className="text-transparent" />
                              ))}
                            </div>
                            <span className="text-[11px] text-[#8B7355]">({ratingCount})</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-lg font-bold text-[#2d1810]">{currency}{product.price}</span>
                          {product.mrp > product.price && (
                            <span className="text-xs text-[#8B7355] line-through">{currency}{product.mrp}</span>
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
