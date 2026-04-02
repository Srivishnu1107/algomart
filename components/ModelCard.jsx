'use client'

import { StarIcon } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'

const ModelCard = ({ product }) => {

  const rating = Number(product.rating || 4.5)

  return (
    <div className="group flex flex-col rounded-2xl bg-zinc-900 border border-zinc-800 hover:border-teal-500/40 transition-all duration-300 overflow-hidden h-[430px] hover:-translate-y-2 hover:shadow-[0_20px_60px_-10px_rgba(20,184,166,0.25)]">

      {/* 🔥 IMAGE / LOGO */}
      <div className="relative h-56 flex items-center justify-center bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 overflow-hidden">

        {/* Glow */}
        <div className="absolute inset-0 bg-gradient-to-br from-teal-500/10 via-transparent to-purple-500/10 blur-2xl opacity-60 group-hover:opacity-100 transition duration-500" />

        {/* Floating effect */}
        <div className="z-10 transform group-hover:scale-110 group-hover:-translate-y-1 transition duration-500">

          <Image
            src="/algomort-logo.png"
            alt="AlgoMort"
            width={140}
            height={140}
            className="object-contain opacity-90 drop-shadow-[0_0_20px_rgba(20,184,166,0.5)]"
          />

        </div>

        {/* 🔥 TOP BADGE */}
        <span className="absolute top-3 left-3 text-[10px] px-2 py-1 rounded-full bg-teal-500/20 text-teal-400 border border-teal-500/30">
          AI MODEL
        </span>

      </div>

      {/* 🔥 CONTENT */}
      <div className="flex flex-col flex-1 px-4 py-4">

        {/* NAME */}
        <h3 className="text-white font-semibold text-sm leading-tight line-clamp-2">
          {product.name}
        </h3>

        {/* CATEGORY */}
        <p className="text-zinc-400 text-xs mt-1">
          {product.category || "AI Model"}
        </p>

        {/* ⭐ RATING */}
        <div className="flex items-center gap-1 mt-2">
          {Array(5).fill('').map((_, i) => (
            <StarIcon
              key={i}
              size={14}
              fill={i < Math.round(rating) ? '#14b8a6' : '#27272a'}
              className="text-transparent"
            />
          ))}
          <span className="text-xs text-zinc-500 ml-1">
            {rating}
          </span>
        </div>

        {/* 💰 PRICE */}
        <p className="text-teal-400 font-bold mt-3 text-lg">
          ₹{product.price || 0}
        </p>

        {/* 🔥 BUTTON */}
        <Link
          href={`/success?model=${encodeURIComponent(product.model)}&price=${product.price}`}
          className="mt-auto text-center bg-gradient-to-r from-teal-500 to-emerald-400 hover:from-teal-400 hover:to-emerald-300 text-black py-2 rounded-lg font-semibold transition duration-300 shadow-lg hover:shadow-teal-500/20"
        >
          Try / Get Model
        </Link>

      </div>
    </div>
  )
}

export default ModelCard