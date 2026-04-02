'use client'

import Link from 'next/link'
import Image from 'next/image'
import { ChevronLeft, ChevronRight, ImageIcon } from 'lucide-react'
import React, { useState, useEffect } from 'react'
import axios from 'axios'

/** Main page hero = admin-selected vendor banners. storeType = electronics | fashion so banners are separated by page. */
export default function HeroSection({ storeType = 'electronics' }) {
  const [banners, setBanners] = useState([])
  const [loading, setLoading] = useState(true)
  const [current, setCurrent] = useState(0)
  const type = storeType === 'fashion' ? 'fashion' : 'electronics'

  useEffect(() => {
    axios
      .get(`/api/home-banners?type=${type}`)
      .then(({ data }) => {
        if (Array.isArray(data.banners)) setBanners(data.banners)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [type])

  useEffect(() => {
    if (banners.length <= 1) return
    const t = setInterval(() => setCurrent((c) => (c + 1) % banners.length), 5000)
    return () => clearInterval(t)
  }, [banners.length])

  const hasBanners = banners.length > 0

  return (
    <section className="relative w-full bg-gradient-to-b from-zinc-950 via-zinc-900/95 to-zinc-950">
      {/* Preferred banner aspect 1920×600 — consistent hero height, always reserved */}
      <div className="relative w-full aspect-[32/10] min-h-[280px] max-h-[520px] sm:min-h-[320px] md:min-h-[380px] lg:min-h-[420px] overflow-hidden bg-zinc-900">
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-zinc-800 to-zinc-900">
            <div className="flex flex-col items-center gap-3 text-zinc-500">
              <div className="h-12 w-12 rounded-xl bg-zinc-700/50 animate-pulse" />
              <div className="h-3 w-24 rounded-full bg-zinc-700/50 animate-pulse" />
            </div>
          </div>
        ) : !hasBanners ? (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-zinc-800/90 via-zinc-900 to-zinc-800/90">
            <div className="flex flex-col items-center gap-3 text-zinc-500">
              <div className="rounded-2xl bg-zinc-800/80 p-5 border border-zinc-700/50">
                <ImageIcon className="size-10 sm:size-12 text-zinc-600" strokeWidth={1} aria-hidden />
              </div>
              <span className="text-sm font-medium text-zinc-500 tracking-wide">Hero banner</span>
            </div>
          </div>
        ) : null}

        {hasBanners && banners.map((banner, i) => (
          <div
            key={banner.id}
            className={`absolute inset-0 transition-all duration-500 ease-out ${
              i === current ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
            }`}
          >
            <div className="w-full h-full relative">
              {banner.bannerLink ? (
                <Link
                  href={banner.bannerLink}
                  className="absolute inset-0 z-0"
                  target={banner.bannerLink.startsWith('http') ? '_blank' : undefined}
                  rel={banner.bannerLink.startsWith('http') ? 'noopener noreferrer' : undefined}
                  aria-label="Banner link"
                >
                  <BannerImage url={banner.imageUrl} />
                </Link>
              ) : (
                <BannerImage url={banner.imageUrl} />
              )}
              <OverlayButtons buttons={banner.buttons} />
            </div>
          </div>
        ))}

        {banners.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => setCurrent((c) => (c - 1 + banners.length) % banners.length)}
              className="absolute left-4 sm:left-8 md:left-12 top-1/2 -translate-y-1/2 z-20 text-white/80 hover:text-white transition-colors"
              aria-label="Previous"
            >
              <ChevronLeft size={48} strokeWidth={1.5} />
            </button>
            <button
              type="button"
              onClick={() => setCurrent((c) => (c + 1) % banners.length)}
              className="absolute right-4 sm:right-8 md:right-12 top-1/2 -translate-y-1/2 z-20 text-white/80 hover:text-white transition-colors"
              aria-label="Next"
            >
              <ChevronRight size={48} strokeWidth={1.5} />
            </button>
            <div className="absolute bottom-5 sm:bottom-6 left-1/2 -translate-x-1/2 z-20 flex gap-2">
              {banners.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setCurrent(i)}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    i === current ? 'bg-teal-400 w-8' : 'bg-zinc-600 hover:bg-zinc-500 w-2'
                  }`}
                  aria-label={`Slide ${i + 1}`}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  )
}

function BannerImage({ url }) {
  return (
    <div className="relative w-full h-full bg-zinc-900">
      <Image
        src={url}
        alt=""
        fill
        className="object-cover"
        sizes="100vw"
        unoptimized={url?.includes('imagekit')}
      />
    </div>
  )
}

function OverlayButtons({ buttons }) {
  if (!Array.isArray(buttons) || buttons.length === 0) return null
  const sizeMap = { sm: 'px-3 py-1.5 text-xs', md: 'px-5 py-2.5 text-sm', lg: 'px-6 py-3 text-base' }
  return (
    <div className="absolute bottom-4 left-4 right-4 flex flex-wrap gap-3 z-[11]">
      {buttons.map((btn, idx) => {
        const style = { backgroundColor: btn.backgroundColor || '#14b8a6', color: btn.textColor || '#ffffff' }
        const sizeClass = sizeMap[btn.size] || sizeMap.md
        const href = btn.link || '#'
        const stop = (e) => e.stopPropagation()
        if (href.startsWith('http')) {
          return (
            <a key={idx} href={href} target="_blank" rel="noopener noreferrer" className={`inline-flex items-center justify-center font-semibold rounded-xl transition hover:opacity-90 ${sizeClass}`} style={style} onClick={stop}>
              {btn.label || 'Button'}
            </a>
          )
        }
        return (
          <Link key={idx} href={href} className={`inline-flex items-center justify-center font-semibold rounded-xl transition hover:opacity-90 ${sizeClass}`} style={style} onClick={stop}>
            {btn.label || 'Button'}
          </Link>
        )
      })}
    </div>
  )
}
