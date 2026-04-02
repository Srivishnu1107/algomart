'use client'

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { useDispatch, useSelector } from 'react-redux'
import { motion } from 'framer-motion'
import { Flame, Clock, ChevronLeft, ChevronRight, Star, ShoppingCart, Zap } from 'lucide-react'
import { addToCart } from '@/lib/features/cart/cartSlice'
import { trackBehavior } from '@/lib/behaviorTracker'
import axios from 'axios'

/* ── Module-level cache for instant re-render on route changes ── */
const _cacheMap = {}
const CACHE_TTL = 90_000

/* ── Countdown ── */
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

/* ═══════════════════ Section ═══════════════════ */
export default function DealsOfTheDaySection({ storeType: storeTypeProp } = {}) {
  const resolvedType = storeTypeProp || 'electronics'
  const cached = _cacheMap[resolvedType]
  const [config, setConfig] = useState(cached?.config ?? null)
  const [products, setProducts] = useState(cached?.products ?? [])
  const scrollRef = useRef(null)
  const [canLeft, setCanLeft] = useState(false)
  const [canRight, setCanRight] = useState(false)

  useEffect(() => {
    const c = _cacheMap[resolvedType]
    if (c && Date.now() - c.time < CACHE_TTL) {
      setConfig(c.config)
      setProducts(c.products)
    }
    axios.get(`/api/deals-of-the-day?type=${resolvedType}`)
      .then(({ data }) => {
        if (data.config) setConfig(data.config)
        if (data.products) setProducts(data.products)
        _cacheMap[resolvedType] = { config: data.config, products: data.products, time: Date.now() }
      })
      .catch(() => {})
  }, [resolvedType])

  const endTime = useMemo(() => {
    const d = new Date()
    d.setHours(23, 59, 59, 999)
    return d.getTime()
  }, [])
  const { h, m, s, done } = useCountdown(endTime)

  const updateArrows = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    setCanLeft(el.scrollLeft > 0)
    setCanRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 10)
  }, [])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(updateArrows) : null
    if (ro) ro.observe(el)
    const t = setTimeout(updateArrows, 0)
    return () => { clearTimeout(t); ro?.disconnect() }
  }, [products, updateArrows])

  const scroll = (dir) => {
    scrollRef.current?.scrollBy({ left: dir * 420, behavior: 'smooth' })
    setTimeout(updateArrows, 400)
  }

  if (!config || products.length === 0) return null

  return (
    <section className="relative py-14 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-50px' }}
          transition={{ duration: 0.5 }}
          className="rounded-2xl border border-red-500/20 bg-gradient-to-br from-[#140a0a] to-[#0a0608] p-6 sm:p-8 shadow-[0_0_50px_-10px_rgba(239,68,68,0.08)]"
        >
          {/* ── Header ── */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <Link href="/deals" className="group flex items-center gap-3">
              <Flame size={26} className="text-red-400" />
              <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                Today&apos;s Deals
              </h2>
              <ChevronRight size={22} className="text-zinc-500 group-hover:text-white transition-colors" />
            </Link>

            {config.showCountdown && !done && (
              <div className="flex items-center gap-2.5 text-sm text-zinc-400">
                <Clock size={16} />
                <span>Ends in</span>
                <div className="flex items-center gap-1 font-mono">
                  {[h, m, s].map((v, i) => (
                    <React.Fragment key={i}>
                      {i > 0 && <span className="text-zinc-600 font-bold text-lg">:</span>}
                      <span className="bg-red-500 text-white min-w-[2.2rem] text-center px-2 py-1.5 rounded-lg text-base font-bold tabular-nums">
                        {String(v).padStart(2, '0')}
                      </span>
                    </React.Fragment>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── Carousel ── */}
          <div className="relative flex items-center">
            {canLeft && (
              <button
                type="button"
                onClick={() => scroll(-1)}
                className="absolute -left-3 sm:-left-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 flex items-center justify-center rounded-full bg-zinc-900/90 border border-zinc-700 text-zinc-300 hover:text-white hover:border-red-500/40 transition shadow-lg"
                aria-label="Previous"
              >
                <ChevronLeft size={20} />
              </button>
            )}

            <div
              ref={scrollRef}
              onScroll={updateArrows}
              className="flex gap-5 sm:gap-6 overflow-x-auto no-scrollbar scroll-smooth snap-x snap-mandatory flex-1"
              style={{ scrollbarWidth: 'none' }}
            >
              {products.map((product, i) => (
                <DealCard key={product.id} product={product} index={i} />
              ))}
            </div>

            {canRight && (
              <button
                type="button"
                onClick={() => scroll(1)}
                className="absolute -right-3 sm:-right-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 flex items-center justify-center rounded-full bg-zinc-900/90 border border-zinc-700 text-zinc-300 hover:text-white hover:border-red-500/40 transition shadow-lg"
                aria-label="Next"
              >
                <ChevronRight size={20} />
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </section>
  )
}

/* ═══════════════════ Deal Card ═══════════════════ */
function DealCard({ product, index }) {
  const dispatch = useDispatch()
  const router = useRouter()
  const pathname = usePathname()
  const isFashion = pathname?.startsWith('/fashion')
  const storeType = product.productType || product.store?.storeType || (isFashion ? 'fashion' : 'electronics')
  const cartItems = useSelector((s) => s.cart.cartItems)
  const isInCart = !!cartItems[product.id]
  const cartQty = cartItems[product.id] || 0

  const discount = product.mrp && product.mrp > product.price
    ? Math.round(((product.mrp - product.price) / product.mrp) * 100)
    : 0
  const currency = process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || '₹'
  const ratingCount = product.rating?.length || 0
  const avgRating = ratingCount
    ? (product.rating.reduce((acc, r) => acc + r.rating, 0) / ratingCount).toFixed(1)
    : 0

  const badges = ['BEST SELLER', 'DEAL', 'HOT', 'TOP PICK']
  const badge = index < badges.length ? badges[index] : discount > 15 ? 'DEAL' : null

  const handleQuickAdd = (e) => {
    e.preventDefault()
    e.stopPropagation()
    dispatch(addToCart({ productId: product.id }))
    trackBehavior({ eventType: 'add_to_cart', category: storeType, productId: product.id })
  }

  const handleBuyNow = (e) => {
    e.preventDefault()
    e.stopPropagation()
    dispatch(addToCart({ productId: product.id }))
    trackBehavior({ eventType: 'add_to_cart', category: storeType, productId: product.id })
    router.push(isFashion ? '/cart?from=fashion' : '/cart')
  }

  return (
    <div className="flex-shrink-0 w-[340px] sm:w-[380px] snap-start group">
      <div className="rounded-2xl overflow-hidden bg-[#110e11] border border-white/[0.06] hover:border-red-400/25 hover:shadow-[0_0_30px_-5px_rgba(239,68,68,0.14)] transition-all duration-300 h-full flex flex-col">
        {/* Image */}
        <Link href={`/product/${product.id}`} className="relative aspect-[4/3] bg-zinc-800/30 overflow-hidden block flex-shrink-0">
          {product.images?.[0] && (
            <div className="absolute inset-0 flex items-center justify-center p-4">
              <Image
                src={product.images[0]}
                alt={product.name || ''}
                width={340}
                height={260}
                className="w-auto max-h-full object-contain group-hover:scale-105 transition-transform duration-300"
                sizes="380px"
                unoptimized={product.images[0]?.includes('imagekit')}
              />
            </div>
          )}
          {badge && (
            <span className={`absolute top-3 left-3 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide rounded-lg shadow-lg ${
              badge === 'BEST SELLER' ? 'bg-red-500 text-white' :
              badge === 'DEAL' ? 'bg-emerald-500 text-white' :
              badge === 'HOT' ? 'bg-orange-500 text-white' :
              'bg-purple-500 text-white'
            }`}>
              {badge}
            </span>
          )}
        </Link>

        {/* Content */}
        <div className="p-5 flex flex-col flex-1">
          {product.category && (
            <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
              {product.category}
            </span>
          )}
          <Link href={`/product/${product.id}`}>
            <h3 className="text-base font-semibold text-zinc-200 mt-1 line-clamp-1 group-hover:text-white transition-colors">
              {product.name}
            </h3>
          </Link>
          {ratingCount > 0 && (
            <div className="flex items-center gap-1.5 mt-2">
              <div className="flex">
                {Array(5).fill('').map((_, i) => (
                  <Star
                    key={i}
                    size={13}
                    fill={i < Math.round(Number(avgRating)) ? '#f59e0b' : '#3f3f46'}
                    className="text-transparent"
                  />
                ))}
              </div>
              <span className="text-xs text-zinc-500">({ratingCount.toLocaleString()})</span>
            </div>
          )}
          <div className="flex items-center gap-2.5 mt-3">
            <span className="text-xl font-bold text-white">{currency}{product.price}</span>
            {product.mrp > product.price && (
              <span className="text-sm text-zinc-500 line-through">{currency}{product.mrp}</span>
            )}
            {discount > 0 && (
              <span className="text-xs font-bold text-red-400 bg-red-500/10 px-2 py-0.5 rounded-md">
                {discount}% OFF
              </span>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex gap-2.5 mt-auto pt-4">
            {isInCart ? (
              <div className="flex-1 flex items-center justify-center gap-3 px-4 py-2.5 text-sm font-semibold text-white rounded-xl bg-red-500/20 border border-red-500/30">
                <ShoppingCart size={16} className="text-red-400" />
                <span>{cartQty} in cart</span>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleQuickAdd}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white rounded-xl bg-white/[0.06] border border-white/10 hover:bg-white/10 hover:border-red-400/30 transition-all"
              >
                <ShoppingCart size={16} /> Quick Add
              </button>
            )}
            <button
              type="button"
              onClick={handleBuyNow}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-zinc-900 rounded-xl bg-red-500 hover:bg-red-400 shadow-[0_0_20px_-4px_rgba(239,68,68,0.4)] transition-all"
            >
              <Zap size={16} /> Buy Now
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
