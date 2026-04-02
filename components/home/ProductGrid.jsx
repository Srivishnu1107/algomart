'use client'

import React from 'react'
import ProductCard from '@/components/ModelCard'

/**
 * Renders a grid of ProductCards. Used for Best Sellers, Trending Now, and optionally Flash Sale.
 * @param {{ products: Array, columns?: string, cardSize?: 'default' | 'large', showTrendingBadge?: boolean }} props
 */
export default function ProductGrid({
  products,
  columns = 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4',
  cardSize = 'default',
  showTrendingBadge = false,
}) {
  if (!Array.isArray(products) || products.length === 0) return null

  const gapClass = cardSize === 'large' ? 'gap-5 sm:gap-6' : 'gap-4 sm:gap-6'
  const gridClass = `grid ${columns} ${gapClass}`

  return (
    <div className={gridClass}>
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          showTrendingBadge={showTrendingBadge}
        />
      ))}
    </div>
  )
}
