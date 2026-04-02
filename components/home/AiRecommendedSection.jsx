'use client'

import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { getVisitorId } from '@/lib/behaviorTracker'
import SectionTitle from './SectionTitle'
import SectionCarousel from './SectionCarousel'
import ProductCard from '@/components/ModelCard'
import { useUser } from '@clerk/nextjs'

/* Module-level cache for instant re-render on route changes */
let _recCache = null
let _recCacheTime = 0
const CACHE_TTL = 120_000

export default function AiRecommendedSection() {
  const { user } = useUser()
  const [data, setData] = useState(_recCache)
  const [loading, setLoading] = useState(!_recCache)

  useEffect(() => {
    if (!user) return
    const visitorId = getVisitorId()
    if (!visitorId) {
      setLoading(false)
      return
    }

    if (_recCache && Date.now() - _recCacheTime < CACHE_TTL) {
      setData(_recCache)
      setLoading(false)
      return
    }

    const category = 'electronics'
    fetch(`/api/recommendations?visitorId=${encodeURIComponent(visitorId)}&category=${category}`)
      .then((res) => res.json())
      .then((json) => {
        setData(json)
        if (json?.showSection && json.products?.length > 0) {
          _recCache = json
          _recCacheTime = Date.now()
        }
      })
      .catch(() => setData({ showSection: false }))
      .finally(() => setLoading(false))
  }, [user])

  if (!user || loading || !data?.showSection || !Array.isArray(data.products) || data.products.length === 0) {
    return null
  }

  return (
    <section className="relative py-14 overflow-hidden">
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6">
        <SectionTitle
          title="Recommended for you"
          subtitle="Based on your browsing and interests — updated daily"
        />
        <motion.div
          className="mt-10"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-50px' }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        >
          <SectionCarousel step={320}>
            {data.products.map((product) => (
              <div key={product.id} className="flex-shrink-0 w-[280px] sm:w-[300px] snap-start">
                <ProductCard product={product} size="tall" />
              </div>
            ))}
          </SectionCarousel>
        </motion.div>
      </div>
    </section>
  )
}
