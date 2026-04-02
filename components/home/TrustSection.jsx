'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { Truck, RefreshCw, CreditCard, Headset } from 'lucide-react'
import SectionCarousel from './SectionCarousel'

const TRUST_ITEMS = [
  {
    title: 'Free Shipping',
    description: 'Fast, free delivery on every order — no conditions.',
    icon: Truck,
    accent: '#14b8a6',
  },
  {
    title: 'Easy Returns',
    description: 'Change your mind? Return any item within 7 days.',
    icon: RefreshCw,
    accent: '#f59e0b',
  },
  {
    title: 'Secure Payments',
    description: 'Your data is protected with industry-standard encryption.',
    icon: CreditCard,
    accent: '#8b5cf6',
  },
  {
    title: '24/7 Support',
    description: "We're here for you. Get expert help anytime.",
    icon: Headset,
    accent: '#a855f7',
  },
]

export default function TrustSection() {
  return (
    <section className="relative py-12 overflow-hidden">
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6">
        <motion.div
          className="mt-4"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-50px' }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        >
          <SectionCarousel step={320}>
            {TRUST_ITEMS.map((item) => {
              const Icon = item.icon
              return (
                <motion.div
                  key={item.title}
                  className="flex-shrink-0 w-[280px] sm:w-[300px] snap-start"
                  whileHover={{ transition: { duration: 0.3, ease: 'easeOut' } }}
                >
                  <div className="group relative flex flex-col items-center text-center p-8 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md transition-all duration-300 ease-out hover:-translate-y-1 hover:border-teal-500/30 hover:shadow-lg hover:shadow-teal-500/10 h-full">
                    <div
                      className="w-16 h-16 rounded-2xl flex items-center justify-center text-white mb-4 transition-transform duration-300 ease-out group-hover:scale-105"
                      style={{ backgroundColor: item.accent }}
                    >
                      <Icon size={28} />
                    </div>
                    <h3 className="text-zinc-100 font-semibold text-lg">{item.title}</h3>
                    <p className="text-sm text-zinc-500 mt-2 max-w-xs">{item.description}</p>
                  </div>
                </motion.div>
              )
            })}
          </SectionCarousel>
        </motion.div>
      </div>
    </section>
  )
}
