'use client'

import React, { useState, useRef, useEffect } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

/**
 * Single-line carousel with same arrow style as Categories section.
 * @param {{ children: React.ReactNode, step?: number, className?: string }} props
 */
export default function SectionCarousel({ children, step = 300, className = '' }) {
  const scrollRef = useRef(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(true)

  const updateScrollState = () => {
    if (!scrollRef.current) return
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current
    setCanScrollLeft(scrollLeft > 0)
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10)
  }

  // Stable empty dependency array - do not add children or any array that can change length
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(updateScrollState) : null
    if (ro) ro.observe(el)
    // Initial state after mount (ref is set in same commit)
    const t = setTimeout(updateScrollState, 0)
    return () => {
      clearTimeout(t)
      ro?.disconnect()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps -- length must stay constant

  const scroll = (dir) => {
    if (!scrollRef.current) return
    scrollRef.current.scrollBy({ left: dir * step, behavior: 'smooth' })
    setTimeout(updateScrollState, 300)
  }

  return (
    <div className={`relative flex items-center ${className}`}>
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
        className="flex gap-5 sm:gap-6 overflow-x-auto no-scrollbar pb-2 scroll-smooth snap-x snap-mandatory flex-1"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {children}
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
  )
}
