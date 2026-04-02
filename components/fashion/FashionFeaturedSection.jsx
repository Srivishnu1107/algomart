'use client'

import React, { useMemo } from 'react'
import { useSelector } from 'react-redux'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowRight, ChevronRight } from 'lucide-react'
import ProductCard from '@/components/ModelCard'
import SectionCarousel from '@/components/home/SectionCarousel'

const FASHION_TYPES = ['Men', 'Women', 'Footwear', 'Accessories', 'Streetwear', 'Luxury']

function getFashionProducts(products) {
  if (!Array.isArray(products)) return []
  return products.filter((product) => {
    const resolvedType = product.productType || product.store?.storeType
    if (resolvedType) return resolvedType === 'fashion'
    return FASHION_TYPES.includes(product.category)
  })
}

export default function FashionFeaturedSection() {
  const products = useSelector((state) => state.product.list)

  const featured = useMemo(() => {
    const fashion = getFashionProducts(products)
    return [...fashion]
      .sort((a, b) => (b.rating?.length || 0) - (a.rating?.length || 0))
      .slice(0, 12)
  }, [products])

  if (featured.length === 0) return null

  return (
    <section className="relative py-10 sm:py-14 overflow-hidden">
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="flex items-center gap-1.5 mb-1">
          <h2 className="text-2xl sm:text-3xl font-bold text-[#2d1810] tracking-tight">
            Featured Products
          </h2>
          <Link
            href="/fashion/shop"
            className="text-[#8B6914] hover:text-[#7a5c12] transition-colors ml-1"
            aria-label="View all featured products"
          >
            <ChevronRight size={24} strokeWidth={2.5} />
          </Link>
        </div>
        <p className="text-sm text-[#8B7355] max-w-xl mb-8">
          Top-rated fashion picks handpicked for you
        </p>

        {/* Carousel */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-50px' }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        >
          <SectionCarousel step={320}>
            {featured.map((product) => (
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
