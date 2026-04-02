'use client'

import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { Sparkles } from 'lucide-react'

import CategoriesMarquee from '@/components/CategoriesMarquee'
import BrandsCarousel from '@/components/home/BrandsCarousel'
import FeaturedProductsSection from '@/components/home/FeaturedProductsSection'
import DealsOfTheDaySection from '@/components/home/DealsOfTheDaySection'
import AiRecommendedSection from '@/components/home/AiRecommendedSection'
import PromoBanner from '@/components/home/PromoBanner'
import NewsletterSection from '@/components/home/NewsletterSection'

export default function HomePageClient() {
  return (
    <div className="min-h-screen bg-[#0a0a0b]">

      {/* 🔥 HERO */}
      <section className="relative min-h-screen flex items-center overflow-hidden -mt-20 pt-20">

        {/* 🔥 BASE BACKGROUND */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#040610] via-[#060814] to-[#0a0818]" />

        {/* 🔥 NEON BLOBS */}
        <div className="absolute top-20 left-10 w-[500px] h-[500px] bg-cyan-500/10 blur-[140px] rounded-full"></div>
        <div className="absolute bottom-10 right-10 w-[500px] h-[500px] bg-purple-500/10 blur-[140px] rounded-full"></div>

        {/* 🔥 CONTENT */}
        <div className="relative z-10 max-w-7xl mx-auto px-6 w-full py-20">
          <div className="grid lg:grid-cols-2 gap-12 items-center">

            {/* 🔥 LEFT */}
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="space-y-8"
            >

              <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-cyan-500/10 border border-cyan-500/20 backdrop-blur">
                <Sparkles size={15} className="text-cyan-400" />
                <span className="text-sm text-cyan-300">
                  AlgoMart AI Marketplace
                </span>
              </div>

              <h1 className="text-5xl sm:text-6xl font-bold leading-tight">
                <span className="text-white">Explore Powerful</span>
                <br />
                <span className="bg-gradient-to-r from-cyan-400 via-teal-300 to-purple-400 bg-clip-text text-transparent">
                  AI Models
                </span>
              </h1>

              <p className="text-lg text-zinc-400 max-w-lg">
                Discover, test and deploy cutting-edge AI models.
                NLP, Vision, Generative AI — all in one place.
              </p>

              <div className="flex gap-5">
                <Link
                  href="/shop"
                  className="px-8 py-4 rounded-full bg-gradient-to-r from-cyan-500 to-purple-500 text-white font-semibold shadow-lg shadow-cyan-500/30 hover:scale-105 transition"
                >
                  Explore Models →
                </Link>

                <Link
                  href="/shop"
                  className="px-8 py-4 rounded-full border border-white/20 text-zinc-300 hover:bg-zinc-800/60 backdrop-blur transition"
                >
                  Browse All
                </Link>
              </div>

            </motion.div>

            {/* 🔥 RIGHT (BIG LOGO) */}
            <motion.div
              initial={{ opacity: 0, x: 60 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.9 }}
              className="flex justify-center items-center min-h-[420px]"
            >
              <div className="relative flex justify-center items-center">

                {/* 🔥 OUTER GLOW */}
                <div className="absolute w-[520px] h-[520px] bg-cyan-500/20 blur-[150px] rounded-full"></div>

                {/* 🔥 RING */}
                <div className="absolute w-[360px] h-[360px] border border-cyan-400/20 rounded-full animate-pulse"></div>

                {/* 🔥 INNER GLOW */}
                <div className="absolute w-[260px] h-[260px] bg-gradient-to-br from-cyan-500/30 via-purple-500/20 to-teal-500/30 blur-3xl rounded-full"></div>

                {/* 🔥 LOGO (BIG) */}
                <Image
                  src="/algomort-logo.png"
                  alt="AlgoMort"
                  width={320}
                  height={320}
                  className="relative z-10 object-contain drop-shadow-[0_0_120px_rgba(34,211,238,1)] hover:scale-105 transition duration-500"
                />

              </div>
            </motion.div>

          </div>
        </div>
      </section>

      {/* 🔥 OTHER SECTIONS */}
      <CategoriesMarquee />
      <FeaturedProductsSection />
      <DealsOfTheDaySection />
      <AiRecommendedSection />
      <PromoBanner />
      <BrandsCarousel />
      <NewsletterSection />

    </div>
  )
}