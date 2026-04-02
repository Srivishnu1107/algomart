'use client'

import React from 'react'
import { useSelector } from 'react-redux'
import { motion } from 'framer-motion'
import SectionTitle from './SectionTitle'
import SectionCarousel from './SectionCarousel'
import ProductCard from '@/components/ModelCard'

export default function FeaturedProductsSection() {

  // 👉 Treat products as AI models
  const models = useSelector((state) => state.product.list)

  // 👉 Simple trending logic (first 12 models)
  const trending = models.slice(0, 12)

  if (!trending || trending.length === 0) return null

  return (
    <section className="relative py-14 overflow-hidden">
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6">

        {/* 🔥 TITLE */}
        <SectionTitle
          title="🔥 Trending AI Models"
          subtitle="Most popular and powerful models right now"
          href="/shop"
        />

        {/* 🔥 CAROUSEL */}
        <motion.div
          className="mt-10"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-50px' }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        >
          <SectionCarousel step={320}>
            {trending.map((model, index) => (
              <div
                key={index}
                className="flex-shrink-0 w-[280px] sm:w-[300px] snap-start"
              >
                {/* 🔥 Reusing ProductCard as ModelCard */}
                <ProductCard product={model} size="tall" />
              </div>
            ))}
          </SectionCarousel>
        </motion.div>

      </div>
    </section>
  )
}