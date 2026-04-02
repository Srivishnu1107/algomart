'use client'

import { useEffect, useState } from "react"
import ModelCard from "@/components/ModelCard"

const CATEGORIES = ["All", "NLP", "Generative AI", "Vision", "Audio AI"]

export default function ShopPage() {

  const [models, setModels] = useState([])
  const [selectedCategory, setSelectedCategory] = useState("All")

  useEffect(() => {
    fetch("/api/models")
      .then(res => res.json())
      .then(data => setModels(data))
  }, [])

  const filteredModels =
    selectedCategory === "All"
      ? models
      : models.filter((m) => m.category === selectedCategory)

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-white px-4 sm:px-6 py-6">

      {/* 🔥 HEADER */}
      <div className="mb-6">

        <h1 className="text-3xl font-bold mb-4">
          Explore AI Models 
        </h1>

        {/* 🔥 CATEGORY FILTER */}
        <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">

          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-xl text-sm whitespace-nowrap transition ${
                selectedCategory === cat
                  ? "bg-teal-500 text-black shadow-[0_0_15px_rgba(20,184,166,0.6)]"
                  : "bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
              }`}
            >
              {cat}
            </button>
          ))}

        </div>
      </div>

      {/* 🔥 GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">

        {filteredModels.length > 0 ? (
          filteredModels.map((model, i) => (
            <ModelCard key={i} product={model} />
          ))
        ) : (
          <p className="text-zinc-500">Loading models...</p>
        )}

      </div>

    </div>
  )
}