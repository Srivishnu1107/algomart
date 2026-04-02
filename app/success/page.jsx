'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { Download, ShoppingCart, ArrowLeft, ExternalLink } from 'lucide-react'
import { useSearchParams } from 'next/navigation'

export default function SuccessPage() {

  const params = useSearchParams()
  const model = params.get('model')
  const price = params.get('price') || "Free"

  // ✅ SAFE URL (FIXES 404 ISSUE)
  const modelUrl =
    model && model.includes("/")
      ? `https://huggingface.co/${model}`
      : null

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-white px-6 py-10 flex items-center justify-center">

      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="max-w-3xl w-full bg-zinc-900/80 border border-zinc-700 rounded-3xl p-8 shadow-[0_0_60px_-20px_rgba(20,184,166,0.3)]"
      >

        {/* 🔥 HEADER */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-3xl sm:text-4xl font-bold text-teal-400 mb-3"
        >
          🚀 Model Ready
        </motion.h1>

        <p className="text-zinc-400 mb-6">
          Your AI model is ready to use. You can download it or use it directly.
        </p>

        {/* 🔥 MODEL INFO */}
        <div className="bg-zinc-800 rounded-xl p-5 mb-6 border border-zinc-700">

          <p className="text-sm text-zinc-400">Model</p>
          <h2 className="text-lg font-semibold break-all">
            {model || "Unknown Model"}
          </h2>

          <p className="text-sm text-zinc-400 mt-4">Price</p>
          <h3 className="text-teal-400 font-bold text-lg">
            {price === "0" ? "Free" : `₹${price}`}
          </h3>

        </div>

        {/* 🔥 INSTRUCTIONS */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3">
            📌 How to Use
          </h3>

          <ul className="space-y-2 text-sm text-zinc-400">
            <li>• Download model files from HuggingFace</li>
            <li>• Or run using APIs / SDK</li>
            <li>• Integrate into your app (React / Node / Python)</li>
            <li>• Use for AI tasks like text, image, or speech</li>
          </ul>
        </div>

        {/* 🔥 BUTTONS */}
        <div className="flex flex-col sm:flex-row gap-4">

          {/* BUY BUTTON */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => alert("Coming Soon 🚀")}
            className="flex-1 flex items-center justify-center gap-2 bg-teal-500 hover:bg-teal-400 text-black py-3 rounded-xl font-semibold transition"
          >
            <ShoppingCart size={18} />
            Buy & Use Model
          </motion.button>

          {/* DOWNLOAD BUTTON */}
          <motion.a
            href={modelUrl || "#"}
            target="_blank"
            rel="noopener noreferrer"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={(e) => {
              if (!modelUrl) {
                e.preventDefault()
                alert("⚠️ Invalid model link")
              }
            }}
            className="flex-1 flex items-center justify-center gap-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 py-3 rounded-xl font-semibold transition"
          >
            <Download size={18} />
            Download Free
            <ExternalLink size={14} />
          </motion.a>

        </div>

        {/* 🔥 BACK BUTTON */}
        <div className="mt-6 text-center">
          <Link
            href="/shop"
            className="inline-flex items-center gap-2 text-zinc-400 hover:text-white transition"
          >
            <ArrowLeft size={16} />
            Back to Models
          </Link>
        </div>

      </motion.div>
    </div>
  )
}