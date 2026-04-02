'use client'

import React from 'react'
import { useSelector } from 'react-redux'
import { motion } from 'framer-motion'
import { getLatestProducts } from '@/lib/homeProductFilters'
import SectionTitle from './SectionTitle'
import SectionCarousel from './SectionCarousel'
import ProductCard from '@/components/ModelCard'

export default function LatestArrivalsSection() {
  const products = useSelector((state) => state.product.list)
  const latest = getLatestProducts(products, 8)

  if (latest.length === 0) return null

  return (
    <section className="relative py-12 overflow-hidden bg-gradient-to-b from-zinc-950 via-zinc-900/95 to-zinc-950">
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6">
        <SectionTitle
          title="Latest Arrivals"
          subtitle="Just landed — newest products first"
        />
        <motion.div
          className="mt-10"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-50px' }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        >
          <SectionCarousel step={320}>
            {latest.map((product) => (
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
