'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { useSelector } from 'react-redux'
import { motion } from 'framer-motion'
import axios from 'axios'
import { getFlashSaleProducts } from '@/lib/homeProductFilters'
import SectionTitle from './SectionTitle'
import ProductGrid from './ProductGrid'

function useCountdown(endDate) {
  const [remaining, setRemaining] = useState({ h: 0, m: 0, s: 0, done: false })

  useEffect(() => {
    const tick = () => {
      const now = Date.now()
      const diff = Math.max(0, endDate - now)
      if (diff <= 0) {
        setRemaining({ h: 0, m: 0, s: 0, done: true })
        return
      }
      const h = Math.floor(diff / (1000 * 60 * 60))
      const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      const s = Math.floor((diff % (1000 * 60)) / 1000)
      setRemaining({ h, m, s, done: false })
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [endDate])

  return remaining
}

function getEndOfDay() {
  const d = new Date()
  d.setHours(23, 59, 59, 999)
  return d.getTime()
}

export default function FlashSaleSection() {
  const products = useSelector((state) => state.product.list)
  const [apiConfig, setApiConfig] = useState(null)
  const [apiProducts, setApiProducts] = useState([])

  useEffect(() => {
    axios.get('/api/deals-of-the-day').then(({ data }) => {
      if (data.config && Array.isArray(data.products) && data.products.length > 0) {
        setApiConfig(data.config)
        setApiProducts(data.products)
      }
    }).catch(() => {})
  }, [])

  const useApi = apiConfig && apiProducts.length > 0
  const flashProducts = useApi ? apiProducts : getFlashSaleProducts(products, 8)
  const title = useApi ? apiConfig.title : 'Deals of the Day'
  const subtitle = useApi ? apiConfig.subtitle : 'Best discounts for a limited time'
  const showCountdown = useApi ? apiConfig.showCountdown : true
  const cardSize = useApi ? apiConfig.cardSize : 'large'
  const columns = useApi ? apiConfig.columns : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4'

  const endTime = useMemo(() => getEndOfDay(), [])
  const { h, m, s, done } = useCountdown(endTime)

  if (flashProducts.length === 0) return null

  return (
    <section className="relative py-24 overflow-hidden bg-zinc-950">
      <div
        className="absolute inset-0 pointer-events-none"
        aria-hidden
        style={{
          background: [
            'linear-gradient(to bottom, transparent 0%, rgba(127, 29, 29, 0.08) 25%, rgba(190, 18, 60, 0.14) 50%, rgba(127, 29, 29, 0.06) 75%, transparent 100%)',
            'radial-gradient(ellipse 70% 45% at 50% 50%, rgba(251, 113, 133, 0.06) 0%, transparent 65%)',
          ].join(', '),
        }}
      />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-10">
          <SectionTitle
            icon="⚡"
            title={title}
            subtitle={showCountdown && done ? 'Sale ended' : subtitle}
          />
          {showCountdown && !done && (
            <motion.div
              className="flex items-center gap-2 font-mono text-xl sm:text-2xl font-bold text-white bg-red-500/20 border border-red-500/40 rounded-2xl px-5 py-3"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
            >
              <span className="text-red-400">{String(h).padStart(2, '0')}</span>
              <span className="text-zinc-500">:</span>
              <span className="text-red-400">{String(m).padStart(2, '0')}</span>
              <span className="text-zinc-500">:</span>
              <span className="text-red-400">{String(s).padStart(2, '0')}</span>
            </motion.div>
          )}
        </div>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-50px' }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        >
          <ProductGrid
            products={flashProducts}
            columns={columns}
            cardSize={cardSize}
          />
        </motion.div>
      </div>
    </section>
  )
}
