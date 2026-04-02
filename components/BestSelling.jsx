'use client'
import Title from './Title'
import ProductCard from './ModelCard'
import { useSelector } from 'react-redux'

const BestSelling = () => {
    const displayQuantity = 8
    const products = useSelector(state => state.product.list)
    const fashionCategories = new Set(['Men', 'Women', 'Footwear', 'Accessories', 'Streetwear', 'Luxury'])
    const electronicsProducts = products.filter((product) => {
        const resolvedType = product.productType || product.store?.storeType
        if (resolvedType) return resolvedType === 'electronics'
        return !fashionCategories.has(product.category)
    })
    const bestSelling = electronicsProducts
        .slice()
        .sort((a, b) => (b.rating?.length || 0) - (a.rating?.length || 0))
        .slice(0, displayQuantity)

    return (
        <div className="px-4 sm:px-6 py-10 max-w-7xl mx-auto">
            <Title
                title="Best Sellers"
                description={`Showing ${bestSelling.length} of ${electronicsProducts.length} products`}
                href="/shop"
            />
            <div className="mt-8 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
                {bestSelling.map((product) => (
                    <ProductCard key={product.id} product={product} />
                ))}
            </div>
        </div>
    )
}

export default BestSelling