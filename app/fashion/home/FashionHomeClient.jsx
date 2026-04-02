'use client'

const CATEGORIES = ['Men', 'Women', 'Footwear', 'Accessories', 'Streetwear'];

export default function FashionHomeClient() {
  return (
    <div className="min-h-screen bg-[#0a0a0b]">
      <section className="mx-4 sm:mx-6">
        <div className="max-w-7xl mx-auto py-10">
          <h1 className="text-3xl sm:text-4xl font-bold text-zinc-100 mb-2">Fashion</h1>
          <p className="text-sm text-zinc-400 mb-6">Discover your style</p>
          <div className="flex flex-wrap gap-3">
            {CATEGORIES.map((cat) => (
              <span key={cat} className="px-4 py-2 text-xs font-medium rounded-full bg-zinc-900 border border-zinc-700 text-zinc-200">
                {cat}
              </span>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
