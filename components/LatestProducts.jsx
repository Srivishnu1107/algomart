'use client'
import Title from './Title'
import ProductCard from './ModelCard'
import { useSelector } from 'react-redux'

const LatestProducts = () => {
    const displayQuantity = 4
    const products = useSelector(state => state.product.list)
    const fashionCategories = new Set(['Men', 'Women', 'Footwear', 'Accessories', 'Streetwear', 'Luxury'])
    const electronicsProducts = products.filter((product) => {
        const resolvedType = product.productType || product.store?.storeType
        if (resolvedType) return resolvedType === 'electronics'
        return !fashionCategories.has(product.category)
    })
    const latest = electronicsProducts
        .slice()
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, displayQuantity)

    return (
        <div className="px-4 sm:px-6 py-10 max-w-7xl mx-auto">
            <Title
                title="Latest Products"
                description={`New arrivals — ${latest.length} of ${electronicsProducts.length} products`}
                href="/shop"
            />
            <div className="mt-8 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
                {latest.map((product) => (
                    <ProductCard key={product.id} product={product} />
                ))}
            </div>
        </div>
    )
}

export default LatestProducts