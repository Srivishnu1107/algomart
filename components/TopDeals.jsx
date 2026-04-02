'use client'
import Title from './Title'
import ProductCard from './ModelCard'
import { useSelector } from 'react-redux'

const TopDeals = () => {
    const displayQuantity = 8
    const products = useSelector(state => state.product.list)
    const fashionCategories = new Set(['Men', 'Women', 'Footwear', 'Accessories', 'Streetwear', 'Luxury'])
    const electronicsProducts = products.filter((product) => {
        const resolvedType = product.productType || product.store?.storeType
        if (resolvedType) return resolvedType === 'electronics'
        return !fashionCategories.has(product.category)
    })
    const withDiscount = electronicsProducts.filter((p) => p.mrp && p.mrp > p.price)
    const topDeals = withDiscount
        .slice()
        .sort((a, b) => (b.mrp - b.price) / b.mrp - (a.mrp - a.price) / a.mrp)
        .slice(0, displayQuantity)
    const list = topDeals.length ? topDeals : electronicsProducts.slice(0, displayQuantity)

    return (
        <div className="px-4 sm:px-6 py-10 max-w-7xl mx-auto">
            <Title
                title="Top Deals"
                description={`Best discounts — up to ${list.length} offers`}
                href="/shop"
            />
            <div className="mt-8 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
                {list.map((product) => (
                    <ProductCard key={product.id} product={product} />
                ))}
            </div>
        </div>
    )
}

export default TopDeals
