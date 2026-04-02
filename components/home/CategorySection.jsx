'use client'

import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useRef, useState } from 'react'
import {
  Smartphone,
  Tv,
  Laptop,
  Headphones,
  Tablet,
  Sparkles,
  Watch,
  Scissors,
} from 'lucide-react'

const CATEGORIES = [
  { label: 'Mobiles', path: '/shop?category=Mobiles', icon: Smartphone },
  { label: 'Televisions', path: '/shop?category=Televisions', icon: Tv },
  { label: 'Laptops', path: '/shop?category=Laptops', icon: Laptop },
  { label: 'Headphones', path: '/shop?category=Headphones', icon: Headphones },
  { label: 'Tablets', path: '/shop?category=Tablets', icon: Tablet },
  { label: 'Accessories', path: '/shop', icon: Sparkles },
  { label: 'Watch', path: '/shop?category=Watch', icon: Watch },
  { label: 'Grooming', path: '/shop', icon: Scissors },
]

export default function CategorySection() {
  const scrollRef = useRef(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(true)

  const scroll = (dir) => {
    if (!scrollRef.current) return
    const step = 140
    scrollRef.current.scrollBy({ left: dir * step, behavior: 'smooth' })
    setTimeout(updateScrollState, 300)
  }

  const updateScrollState = () => {
    if (!scrollRef.current) return
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current
    setCanScrollLeft(scrollLeft > 0)
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10)
  }

  return (
    <section className="relative py-10 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl sm:text-2xl font-semibold text-zinc-100 tracking-tight">
            Shop by Category
          </h2>
          <Link
            href="/shop"
            className="inline-flex items-center gap-1 text-sm font-semibold text-teal-400 hover:text-teal-300 transition"
          >
            View All <span aria-hidden>→</span>
          </Link>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => scroll(-1)}
            disabled={!canScrollLeft}
            className="flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-xl bg-zinc-800/80 border border-zinc-700/80 text-zinc-400 hover:text-white hover:bg-zinc-700/80 hover:border-teal-500/40 disabled:opacity-40 disabled:cursor-not-allowed transition backdrop-blur-sm"
            aria-label="Scroll left"
          >
            <ChevronLeft size={20} />
          </button>
          <div
            ref={scrollRef}
            onScroll={updateScrollState}
            className="flex gap-3 sm:gap-4 overflow-x-auto no-scrollbar pb-2 min-w-0"
            style={{ scrollbarWidth: 'none' }}
          >
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon
              return (
                <Link
                  key={cat.label}
                  href={cat.path}
                  className="flex-shrink-0 w-28 sm:w-32 flex flex-col items-center gap-3 p-4 rounded-2xl bg-zinc-900/60 border border-zinc-700/50 backdrop-blur-md hover:bg-zinc-800/80 hover:border-teal-500/40 hover:shadow-xl hover:shadow-teal-500/5 transition-all duration-200 group"
                >
                  <div className="w-12 h-12 flex items-center justify-center rounded-xl bg-zinc-800/80 group-hover:bg-teal-500/20 text-zinc-400 group-hover:text-teal-400 transition">
                    <Icon size={24} />
                  </div>
                  <span className="text-xs sm:text-sm font-medium text-zinc-300 group-hover:text-white text-center leading-tight">
                    {cat.label}
                  </span>
                </Link>
              )
            })}
          </div>
          <button
            type="button"
            onClick={() => scroll(1)}
            disabled={!canScrollRight}
            className="flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-xl bg-zinc-800/80 border border-zinc-700/80 text-zinc-400 hover:text-white hover:bg-zinc-700/80 hover:border-teal-500/40 disabled:opacity-40 disabled:cursor-not-allowed transition backdrop-blur-sm"
            aria-label="Scroll right"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>
    </section>
  )
}
