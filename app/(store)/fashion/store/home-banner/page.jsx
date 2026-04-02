'use client'

import HomeBannerForm from '@/components/store/HomeBannerForm'

export default function FashionStoreHomeBannerPage() {
  return (
    <div className="min-h-full pb-12">
      <h1 className="text-2xl sm:text-3xl font-bold text-zinc-100 mb-1">
        Home page <span className="text-pink-400">banner</span>
      </h1>
      <p className="text-sm text-zinc-500 mb-8">
        Upload a banner image and add buttons that appear on the home page. Set a link for the whole banner or per button.
      </p>
      <HomeBannerForm storeType="fashion" isFashion={true} />
    </div>
  )
}
