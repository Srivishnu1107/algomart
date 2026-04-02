// 🎯 Category Mapping
function getCategory(tag) {
  if (!tag) return "AI"

  if (tag.includes("text")) return "NLP"
  if (tag.includes("generation")) return "Generative AI"
  if (tag.includes("image")) return "Vision"
  if (tag.includes("speech") || tag.includes("audio")) return "Audio AI"

  return "AI"
}

// 🚀 API
export async function GET() {
  try {
    const response = await fetch(
      "https://huggingface.co/api/models?limit=200&sort=downloads",
      {
        headers: {
          Authorization: `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
        },
      }
    )

    const data = await response.json()

    const formatted = data
      // ✅ REMOVE BAD MODELS
      .filter(m =>
        m.id &&
        m.pipeline_tag &&
        !m.id.includes("internal") &&
        !m.id.includes("test") &&
        m.downloads > 1000   // 🔥 IMPORTANT (only real models)
      )
      .slice(0, 100) // 👉 YOU GET 100 MODELS
      .map((m) => ({
        name: m.id,
        category: getCategory(m.pipeline_tag),
        price: Math.floor(Math.random() * 50) + 10,
        rating: (Math.random() * 1 + 4).toFixed(1),
        model: m.id,
        image: "/algomort-logo.png"
      }))

    return Response.json(formatted)

  } catch (error) {
    return Response.json({ error: "Failed to fetch models" })
  }
}