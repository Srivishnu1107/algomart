'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ChevronRight, Sparkles } from 'lucide-react'
import { getVisitorId } from '@/lib/behaviorTracker'
import SectionCarousel from '@/components/home/SectionCarousel'
import ProductCard from '@/components/ModelCard'
import { useUser } from '@clerk/nextjs'

let _fashionRecCache = null
let _fashionRecCacheTime = 0
const CACHE_TTL = 120_000

export default function FashionRecommendedSection() {
  const { user } = useUser()
  const [data, setData] = useState(_fashionRecCache)
  const [loading, setLoading] = useState(!_fashionRecCache)

  useEffect(() => {
    if (!user) return
    const visitorId = getVisitorId()
    if (!visitorId) {
      setLoading(false)
      return
    }

    if (_fashionRecCache && Date.now() - _fashionRecCacheTime < CACHE_TTL) {
      setData(_fashionRecCache)
      setLoading(false)
      return
    }

    const category = 'fashion'
    fetch(`/api/recommendations?visitorId=${encodeURIComponent(visitorId)}&category=${category}`)
      .then((res) => res.json())
      .then((json) => {
        setData(json)
        if (json?.showSection && json.products?.length > 0) {
          _fashionRecCache = json
          _fashionRecCacheTime = Date.now()
        }
      })
      .catch(() => setData({ showSection: false }))
      .finally(() => setLoading(false))
  }, [user])

  if (!user || loading || !data?.showSection || !Array.isArray(data.products) || data.products.length === 0) {
    return null
  }

  return (
    <section className="relative py-10 sm:py-14 overflow-hidden">
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="flex items-center gap-2 mb-1">
          <Sparkles size={20} className="text-[#8B6914]" />
          <h2 className="text-2xl sm:text-3xl font-bold text-[#2d1810] tracking-tight">
            Recommended for You
          </h2>
        </div>
        <p className="text-sm text-[#8B7355] max-w-xl mb-8">
          Based on your browsing and interests — updated daily
        </p>

        {/* Carousel */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-50px' }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        >
          <SectionCarousel step={320}>
            {data.products.map((product) => (
              <div key={product.id} className="flex-shrink-0 w-[280px] sm:w-[300px] snap-start">
                <ProductCard product={product} storeType="fashion" size="tall" />
              </div>
            ))}
          </SectionCarousel>
        </motion.div>
      </div>
    </section>
  )
}
