'use client'

import Image from "next/image"

const isBlobUrl = (src) => typeof src === "string" && src.startsWith("blob:")

export default function StoreCover({ cover, logo, name, subtitle, className = "", isFashion = false }) {
  return (
    <div className={`w-full max-w-6xl mx-auto ${className}`}>
      <div className={`relative rounded-2xl overflow-hidden border ${
        isFashion ? 'border-[#d4c4a8]/30 bg-[#f5ede3]' : 'border-white/10 bg-black'
      }`}>

        {/* Cover Image */}
        <div className="relative h-64 w-full">
          {cover ? (
            isBlobUrl(cover) ? (
              <img src={cover} alt="Store Cover" className="absolute inset-0 w-full h-full object-cover" />
            ) : (
              <Image
                src={cover}
                alt="Store Cover"
                fill
                className="object-cover"
                sizes="(max-width: 1280px) 100vw, 1152px"
                priority
              />
            )
          ) : (
            <div className={`absolute inset-0 ${
              isFashion
                ? 'bg-gradient-to-br from-[#f5ede3] to-[#e8dcc8]'
                : 'bg-gradient-to-br from-zinc-800 to-zinc-900'
            }`} />
          )}

          {/* Gradient Overlay */}
          <div className={`absolute inset-0 ${
            isFashion
              ? 'bg-gradient-to-b from-[#2d1810]/20 via-[#2d1810]/30 to-[#2d1810]/70'
              : 'bg-gradient-to-b from-black/30 via-black/40 to-black/90'
          }`} />
        </div>

        {/* Bottom Content */}
        <div className={`relative px-6 pb-6 pt-12 backdrop-blur-md ${
          isFashion
            ? 'bg-gradient-to-b from-[#2d1810]/50 to-[#2d1810]/80'
            : 'bg-gradient-to-b from-black/70 to-black'
        }`}>

          {/* Logo */}
          <div className="absolute -top-12 left-6">
            <div className={`relative w-24 h-24 rounded-full border-4 overflow-hidden ${
              isFashion
                ? 'border-[#faf5f0] shadow-[0_0_30px_rgba(139,105,20,0.25)] bg-[#f5ede3]'
                : 'border-black shadow-[0_0_30px_rgba(0,255,180,0.25)] bg-zinc-800'
            }`}>
              {logo ? (
                isBlobUrl(logo) ? (
                  <img src={logo} alt={name || "Store Logo"} className="w-full h-full object-cover" />
                ) : (
                  <Image
                    src={logo}
                    alt={name || "Store Logo"}
                    fill
                    className="object-cover"
                    sizes="96px"
                  />
                )
              ) : (
                <div className={`w-full h-full flex items-center justify-center text-2xl font-medium ${
                  isFashion ? 'text-[#8B7355]' : 'text-zinc-500'
                }`}>?</div>
              )}
            </div>
          </div>

          {/* Store Info */}
          <div className="mt-4">
            <h1 className="text-3xl font-bold text-white">{name || "Store Name"}</h1>
            {subtitle && (
              <p className={`text-sm mt-1 ${isFashion ? 'text-white/70' : 'text-gray-400'}`}>{subtitle}</p>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}
