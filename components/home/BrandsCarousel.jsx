'use client'

import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { PRODUCT_BRANDS } from '@/lib/brands'

export default function BrandsCarousel() {
  const scrollRef = useRef(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(true)

  const updateScrollState = () => {
    if (!scrollRef.current) return
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current
    setCanScrollLeft(scrollLeft > 0)
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10)
  }

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(updateScrollState) : null
    if (ro) ro.observe(el)
    const t = setTimeout(updateScrollState, 0)
    return () => {
      clearTimeout(t)
      ro?.disconnect()
    }
  }, [])

  const scroll = (dir) => {
    if (!scrollRef.current) return
    scrollRef.current.scrollBy({ left: dir * 260, behavior: 'smooth' })
    setTimeout(updateScrollState, 300)
  }

  return (
    <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
      <div className="mb-8">
        <h2 className="text-xl sm:text-2xl font-semibold text-zinc-100">Shop by Brand</h2>
      </div>
      <div className="relative flex items-center">
        <button
          type="button"
          onClick={() => scroll(-1)}
          disabled={!canScrollLeft}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 text-zinc-400 hover:text-zinc-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors -translate-x-full pr-4"
          aria-label="Scroll left"
        >
          <ChevronLeft size={64} strokeWidth={1.5} />
        </button>
        <div
          ref={scrollRef}
          onScroll={updateScrollState}
          className="flex gap-4 sm:gap-6 overflow-x-auto no-scrollbar pb-2 scroll-smooth snap-x snap-mandatory flex-1"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {PRODUCT_BRANDS.map((brandName) => (
            <Link
              key={brandName}
              href={`/models?brand=${encodeURIComponent(brandName)}`}
              className="flex-shrink-0 min-w-[160px] h-[96px] sm:min-w-[200px] sm:h-[110px] flex items-center justify-center px-6 rounded-2xl bg-zinc-800/90 border border-zinc-600/70 text-white font-semibold text-base sm:text-lg tracking-wide uppercase hover:bg-zinc-700/90 hover:border-zinc-500/80 transition-all duration-300 snap-start"
            >
              {brandName}
            </Link>
          ))}
        </div>
        <button
          type="button"
          onClick={() => scroll(1)}
          disabled={!canScrollRight}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 text-zinc-400 hover:text-zinc-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors translate-x-full pl-4"
          aria-label="Scroll right"
        >
          <ChevronRight size={64} strokeWidth={1.5} />
        </button>
      </div>
    </div>
  )
}
