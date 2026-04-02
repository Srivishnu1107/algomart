'use client'

import ProductCard from '@/components/ModelCard'
import PageTitle from '@/components/PageTitle'
import { useSelector } from 'react-redux'
import { useUser } from '@clerk/nextjs'
import Link from 'next/link'
import { Heart } from 'lucide-react'
import { usePathname } from 'next/navigation'

export default function WishlistPageClient() {
  const { user } = useUser()
  const pathname = usePathname()
  const isFashion = pathname?.startsWith('/fashion')
  const storeType = isFashion ? 'fashion' : 'electronics'
  const wishlistBucket = useSelector(state => state.wishlist[storeType] || { items: [], productIds: [] })
  const wishlistItems = wishlistBucket.items || []
  const browsePath = isFashion ? '/fashion' : '/shop'
  const fashionCategories = new Set(['Men', 'Women', 'Footwear', 'Accessories', 'Streetwear', 'Luxury'])
  const getProductType = (product) => {
    if (!product) return storeType
    if (product.productType) return product.productType
    if (product.store?.storeType) return product.store.storeType
    if (product.type) return product.type
    return fashionCategories.has(product.category) ? 'fashion' : 'electronics'
  }

  if (!user) {
    return (
      <div className={`min-h-[60vh] mx-4 sm:mx-6 flex flex-col items-center justify-center gap-4 ${
        isFashion ? 'bg-[#faf5f0] text-[#8B7355]' : 'bg-[#0a0a0b] text-zinc-400'
      }`}>
        <Heart size={48} className={isFashion ? 'text-[#d4c4a8]' : 'text-zinc-600'} />
        <h1 className={`text-xl sm:text-2xl font-semibold ${isFashion ? 'text-[#2d1810]' : 'text-zinc-300'}`}>Sign in to view your wishlist</h1>
        <p className={`text-sm ${isFashion ? 'text-[#8B7355]' : 'text-zinc-500'}`}>Save items you love and access them from any device</p>
        <Link href="/sign-in" className={`px-6 py-3 text-sm font-semibold rounded-xl transition ${
          isFashion ? 'text-white bg-[#8B6914] hover:bg-[#7a5c12]' : 'text-zinc-900 bg-teal-400 hover:bg-teal-300'
        }`}>
          Sign In
        </Link>
      </div>
    )
  }

  if (wishlistItems.length === 0) {
    return (
      <div className={`min-h-[60vh] mx-4 sm:mx-6 flex flex-col items-center justify-center gap-4 ${
        isFashion ? 'bg-[#faf5f0] text-[#8B7355]' : 'bg-[#0a0a0b] text-zinc-400'
      }`}>
        <Heart size={48} className={isFashion ? 'text-[#d4c4a8]' : 'text-zinc-600'} />
        <h1 className={`text-xl sm:text-2xl font-semibold ${isFashion ? 'text-[#2d1810]' : 'text-zinc-300'}`}>Your wishlist is empty</h1>
        <p className={`text-sm ${isFashion ? 'text-[#8B7355]' : 'text-zinc-500'}`}>Save items you love by clicking the heart icon on any product</p>
        <Link href={browsePath} className={`px-6 py-3 text-sm font-semibold rounded-xl transition ${
          isFashion ? 'text-white bg-[#8B6914] hover:bg-[#7a5c12]' : 'text-zinc-900 bg-teal-400 hover:bg-teal-300'
        }`}>
          Browse Products
        </Link>
      </div>
    )
  }

  return (
    <div className={`min-h-screen mx-4 sm:mx-6 ${isFashion ? 'bg-[#faf5f0]' : 'bg-[#0a0a0b]'}`}>
      <div className="max-w-7xl mx-auto py-6">
        <PageTitle heading="My Wishlist" text={`${wishlistItems.length} item${wishlistItems.length !== 1 ? 's' : ''} saved`} linkText="Continue Shopping" path={browsePath} isFashion={isFashion} />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {wishlistItems.map((item) => (
            <ProductCard
              key={item.id || item.productId}
              product={item.product}
              showTypeBadge
              productType={getProductType(item.product)}
              storeType={storeType}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
