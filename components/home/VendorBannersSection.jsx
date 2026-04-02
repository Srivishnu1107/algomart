'use client'

import Link from 'next/link'
import Image from 'next/image'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useEffect, useState } from 'react'
import axios from 'axios'

export default function VendorBannersSection() {
  const [banners, setBanners] = useState([])
  const [loading, setLoading] = useState(true)
  const [current, setCurrent] = useState(0)

  useEffect(() => {
    axios
      .get('/api/home-banners')
      .then(({ data }) => {
        if (Array.isArray(data.banners)) setBanners(data.banners)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (banners.length <= 1) return
    const t = setInterval(() => setCurrent((c) => (c + 1) % banners.length), 5000)
    return () => clearInterval(t)
  }, [banners.length])

  if (loading || banners.length === 0) return null

  return (
    <section className="relative w-full overflow-hidden py-4">
      <div className="relative h-[280px] sm:h-[340px] md:h-[400px] max-w-7xl mx-auto px-4 sm:px-6">
        {banners.map((banner, i) => (
          <div
            key={banner.id}
            className={`absolute inset-0 rounded-2xl overflow-hidden transition-all duration-500 ease-out ${
              i === current ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
            }`}
          >
            {banner.bannerLink ? (
              <Link
                href={banner.bannerLink}
                className="block w-full h-full relative group"
                target={banner.bannerLink.startsWith('http') ? '_blank' : undefined}
                rel={banner.bannerLink.startsWith('http') ? 'noopener noreferrer' : undefined}
              >
                <BannerImage url={banner.imageUrl} />
                <OverlayButtons buttons={banner.buttons} />
              </Link>
            ) : (
              <div className="w-full h-full relative">
                <BannerImage url={banner.imageUrl} />
                <OverlayButtons buttons={banner.buttons} />
              </div>
            )}
          </div>
        ))}

        {banners.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => setCurrent((c) => (c - 1 + banners.length) % banners.length)}
              className="absolute left-2 top-1/2 -translate-y-1/2 z-20 w-10 h-10 flex items-center justify-center rounded-full bg-zinc-900/80 hover:bg-zinc-800 text-white border border-zinc-600 transition"
              aria-label="Previous"
            >
              <ChevronLeft size={22} />
            </button>
            <button
              type="button"
              onClick={() => setCurrent((c) => (c + 1) % banners.length)}
              className="absolute right-2 top-1/2 -translate-y-1/2 z-20 w-10 h-10 flex items-center justify-center rounded-full bg-zinc-900/80 hover:bg-zinc-800 text-white border border-zinc-600 transition"
              aria-label="Next"
            >
              <ChevronRight size={22} />
            </button>
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex gap-2">
              {banners.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setCurrent(i)}
                  className={`h-1.5 rounded-full transition-all ${
                    i === current ? 'bg-teal-400 w-6' : 'bg-zinc-600 hover:bg-zinc-500 w-1.5'
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
        alt="Vendor banner"
        fill
        className="object-cover"
        sizes="(max-width: 1280px) 100vw, 1280px"
        unoptimized={url?.includes('imagekit')}
      />
    </div>
  )
}

function OverlayButtons({ buttons }) {
  if (!Array.isArray(buttons) || buttons.length === 0) return null

  const sizeMap = { sm: 'px-3 py-1.5 text-xs', md: 'px-5 py-2.5 text-sm', lg: 'px-6 py-3 text-base' }

  return (
    <div className="absolute bottom-4 left-4 right-4 flex flex-wrap gap-3 z-10">
      {buttons.map((btn, idx) => {
        const style = {
          backgroundColor: btn.backgroundColor || '#14b8a6',
          color: btn.textColor || '#ffffff',
        }
        const sizeClass = sizeMap[btn.size] || sizeMap.md
        const href = btn.link || '#'

        const stopBannerClick = (e) => e.stopPropagation()
        if (href.startsWith('http')) {
          return (
            <a
              key={idx}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className={`inline-flex items-center justify-center font-semibold rounded-xl transition hover:opacity-90 ${sizeClass}`}
              style={style}
              onClick={stopBannerClick}
            >
              {btn.label || 'Button'}
            </a>
          )
        }
        return (
          <Link
            key={idx}
            href={href}
            className={`inline-flex items-center justify-center font-semibold rounded-xl transition hover:opacity-90 ${sizeClass}`}
            style={style}
            onClick={stopBannerClick}
          >
            {btn.label || 'Button'}
          </Link>
        )
      })}
    </div>
  )
}
