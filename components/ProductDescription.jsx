'use client'
import { ArrowRight, StarIcon } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useState } from "react"
import { usePathname } from "next/navigation"
import SentimentAnalysis from "./SentimentAnalysis"

const ProductDescription = ({ product }) => {
    const [selectedTab, setSelectedTab] = useState('Description')
    const pathname = usePathname()
    const isFashion = pathname?.startsWith('/fashion')
    const shopHref = product.store?.username ? (isFashion ? `/fashion/shop/${product.store.username}` : `/shop/${product.store.username}`) : (isFashion ? '/fashion/shop' : '/shop')

    return (
        <div className="my-12 text-sm text-zinc-400">

            {/* Tabs */}
            <div className={`flex border-b mb-6 max-w-2xl ${isFashion ? 'border-[#d4c4a8]/40' : 'border-zinc-700/40'}`}>
                {['Description', 'Reviews'].map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setSelectedTab(tab)}
                        className={`px-4 py-3 font-medium transition ${
                            tab === selectedTab
                                ? (isFashion ? 'border-b-2 border-[#8B6914] text-[#2d1810]' : 'border-b-2 border-teal-500 text-zinc-100')
                                : (isFashion ? 'text-[#8B7355] hover:text-[#2d1810]' : 'text-zinc-500 hover:text-zinc-300')
                        }`}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {selectedTab === "Description" && (
                <p className={`max-w-xl leading-relaxed ${isFashion ? 'text-[#8B7355]' : ''}`}>{product.description}</p>
            )}

            {selectedTab === "Reviews" && (
                <div className="flex flex-col gap-6 mt-6">
                    {product.rating?.length > 0 && (
                        <SentimentAnalysis reviews={product.rating} isFashion={isFashion} />
                    )}

                    <div className="mt-4">
                        {(product.rating || []).map((item, index) => (
                            <div key={index} className="flex gap-4 mb-8">
                                {item.user?.image ? (
                                    <Image src={item.user.image} alt="" className="size-10 rounded-full object-cover flex-shrink-0" width={40} height={40} />
                                ) : (
                                    <div className={`size-10 rounded-full flex items-center justify-center font-semibold flex-shrink-0 ${isFashion ? 'bg-[#f0e8dc] text-[#8B6914]' : 'bg-zinc-700 text-zinc-400'}`}>
                                        {(item.user?.name || '?')[0]}
                                    </div>
                                )}
                                <div>
                                    <div className="flex items-center gap-2">
                                        {Array(5).fill('').map((_, i) => (
                                            <StarIcon key={i} size={16} className="text-transparent" fill={item.rating >= i + 1 ? (isFashion ? '#8B6914' : '#14b8a6') : (isFashion ? '#d4c4a8' : '#3f3f46')} />
                                        ))}
                                    </div>
                                    <p className={`mt-2 max-w-lg ${isFashion ? 'text-[#8B7355]' : 'text-zinc-300'}`}>{item.review}</p>
                                    <p className={`font-medium mt-2 ${isFashion ? 'text-[#2d1810]' : 'text-zinc-200'}`}>{item.user?.name}</p>
                                    <p className={`text-xs mt-1 ${isFashion ? 'text-[#8B7355]/60' : 'text-zinc-500'}`}>{item.createdAt && new Date(item.createdAt).toDateString()}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Store */}
            <div className={`flex gap-4 mt-10 p-5 rounded-2xl transition-all duration-300 ${
                isFashion
                    ? 'bg-white border border-[#d4c4a8]/30 hover:border-[#c4a882]/40 hover:shadow-[0_0_20px_-5px_rgba(139,105,20,0.08)]'
                    : 'bg-zinc-900/40 border border-zinc-700/40 hover:border-cyan-500/15 hover:shadow-[0_0_20px_-5px_rgba(6,182,212,0.08)]'
            }`}>
                <Image src={product.store?.logo} alt="" className={`size-12 rounded-full object-cover ring-2 flex-shrink-0 ${isFashion ? 'ring-[#d4c4a8]' : 'ring-zinc-600'}`} width={48} height={48} />
                <div>
                    <p className={`font-medium ${isFashion ? 'text-[#2d1810]' : 'text-zinc-300'}`}>Sold by {product.store?.name}</p>
                    <Link href={shopHref} className={`inline-flex items-center gap-1.5 mt-1 transition ${isFashion ? 'text-[#8B6914] hover:text-[#7a5c12]' : 'text-teal-400 hover:text-teal-300'}`}>
                        View store <ArrowRight size={14} />
                    </Link>
                </div>
            </div>
        </div>
    )
}

export default ProductDescription
