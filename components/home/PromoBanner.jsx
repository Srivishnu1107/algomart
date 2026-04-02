'use client'

import Link from 'next/link'
import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
const CATEGORIES = [
  {
    headline: 'Explore AI Chat Models',
    subheading: 'ChatGPT, assistants, and conversational AI tools.',
    buttonText: 'Try Chat AI',
    href: '/models?category=chat',
  },
  {
    headline: 'Generate Stunning Images',
    subheading: 'Create images using powerful diffusion models.',
    buttonText: 'Try Image AI',
    href: '/models?category=image',
  },
  {
    headline: 'Code Smarter with AI',
    subheading: 'AI models for coding, debugging, and development.',
    buttonText: 'Explore Code AI',
    href: '/models?category=code',
  },
  {
    headline: 'Vision & Generative AI',
    subheading: 'Image recognition, generation, and multimodal AI.',
    buttonText: 'Explore Vision',
    href: '/models?category=vision',
  },
];
const ROTATE_INTERVAL_MS = 6000
const HEADLINE_CHAR_MS = 55

export default function PromoBanner() {
  const [index, setIndex] = useState(0)
  const [headlineLen, setHeadlineLen] = useState(0)
  const [showSubheading, setShowSubheading] = useState(false)
  const [showButton, setShowButton] = useState(false)
  const category = CATEGORIES[index]

  // Cycle to next category
  useEffect(() => {
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % CATEGORIES.length)
    }, ROTATE_INTERVAL_MS)
    return () => clearInterval(id)
  }, [])

  // Reset when category changes
  useEffect(() => {
    setHeadlineLen(0)
    setShowSubheading(false)
    setShowButton(false)
  }, [index])

  // Typewriter: headline only; then fade on subheading and button
  useEffect(() => {
    const headline = category.headline
    if (headlineLen < headline.length) {
      const t = setTimeout(() => setHeadlineLen((n) => n + 1), HEADLINE_CHAR_MS)
      return () => clearTimeout(t)
    }
    setShowSubheading(true)
    const t = setTimeout(() => setShowButton(true), 350)
    return () => clearTimeout(t)
  }, [index, category.headline, headlineLen])

  const headlineDone = headlineLen >= category.headline.length

  return (
    <section className="relative py-12 overflow-hidden bg-gradient-to-b from-zinc-950 via-zinc-900/95 to-zinc-950">
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" aria-hidden />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 flex flex-col items-center justify-center text-center min-h-[320px] rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md overflow-hidden">
        <div className="relative min-h-[5rem] sm:min-h-[5.5rem] lg:min-h-[6rem] w-full flex items-center justify-center mb-0 px-4">
          <div className="absolute inset-0 flex items-center justify-center">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white tracking-tight">
              {category.headline.slice(0, headlineLen)}
              <span
                className="inline-block w-0.5 h-[0.9em] align-middle bg-teal-400 ml-0.5 animate-cursor-blink"
                style={{ visibility: headlineDone ? 'hidden' : 'visible' }}
                aria-hidden
              />
            </h2>
          </div>
        </div>
        <div className="relative min-h-[3.5rem] w-full max-w-xl mx-auto mb-4 px-4">
          <div className="absolute inset-0 flex items-center justify-center">
            <motion.p
              className="text-zinc-400 text-lg text-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: showSubheading ? 1 : 0 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
            >
              {category.subheading}
            </motion.p>
          </div>
        </div>
        <div className="relative min-h-[3.5rem] w-full flex items-center justify-center">
          <div className="absolute inset-0 flex items-center justify-center">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: showButton ? 1 : 0 }}
              transition={{ duration: 0.25 }}
              style={{ visibility: showButton ? 'visible' : 'hidden' }}
            >
              <Link
                href={category.href}
                className="inline-flex items-center justify-center px-10 py-4 text-base font-bold text-zinc-900 bg-teal-400 hover:bg-teal-300 rounded-2xl transition-all duration-300 shadow-xl shadow-teal-500/25 hover:shadow-teal-500/40"
              >
                {category.buttonText}
              </Link>
            </motion.div>
          </div>
        </div>
        <div className="flex gap-2 mt-6" aria-hidden>
          {CATEGORIES.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setIndex(i)}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === index ? 'w-6 bg-teal-400' : 'w-2 bg-white/30 hover:bg-white/50'
              }`}
              aria-label={`Show ${CATEGORIES[i].buttonText} promotion`}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
