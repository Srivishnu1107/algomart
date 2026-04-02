'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Mail } from 'lucide-react'

export default function NewsletterSection() {
  const [email, setEmail] = useState('')

  return (
    <section className="relative py-12 overflow-hidden">
      <div className="relative max-w-4xl mx-auto px-4 sm:px-6">
        <motion.div
          className="relative rounded-2xl border border-white/10 bg-zinc-900/80 backdrop-blur-md overflow-hidden p-8 sm:p-12 text-center"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-50px' }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          style={{
            boxShadow: '0 0 0 1px rgba(255,255,255,0.05), 0 0 60px -15px rgba(20, 184, 166, 0.2)',
          }}
        >
          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight mb-2">
            Join 25,000+ AI Builders
          </h2>
          <p className="text-sm text-zinc-500 mb-8 max-w-md mx-auto">
            Get Latest AI Models,updates,and tools directly to your inbox.
          </p>
          <form
            className="flex flex-col sm:flex-row gap-3 w-full max-w-xl mx-auto"
            onSubmit={(e) => e.preventDefault()}
          >
            <div className="relative flex-1">
              <Mail
                className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500 pointer-events-none"
                aria-hidden
              />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email for Algo updates"
                className="w-full pl-12 pr-5 py-4 rounded-2xl bg-zinc-800/80 border border-zinc-600/80 text-zinc-100 placeholder-zinc-500 outline-none focus:border-teal-500/50 focus:ring-2 focus:ring-teal-500/20 transition"
                aria-label="Email address"
              />
            </div>
            <motion.button
              type="submit"
              className="px-8 py-4 rounded-2xl font-bold text-zinc-900 bg-gradient-to-r from-teal-400 to-cyan-400 hover:from-teal-300 hover:to-cyan-300 transition-all duration-300 shadow-lg shadow-teal-500/25"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              Join Algo Community
            </motion.button>
          </form>
        </motion.div>
      </div>
    </section>
  )
}
