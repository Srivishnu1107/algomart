'use client'
import { useState, useRef } from 'react';
import { useSelector } from 'react-redux';
import { Upload, X, Search, Image as ImageIcon, Loader2 } from 'lucide-react';
import ProductCard from '@/components/ModelCard';

const FindProductPage = ({ type = 'electronics' }) => {
    const [image, setImage] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [isSearching, setIsSearching] = useState(false);
    const [results, setResults] = useState([]);
    const [hasSearched, setHasSearched] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const fileInputRef = useRef(null);

    const { list: products } = useSelector((state) => state.product);

    const isFashion = type === 'fashion';

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setImage(file);
            setPreviewUrl(URL.createObjectURL(file));
            setHasSearched(false);
            setResults([]);
            setSearchQuery("");
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) {
            setImage(file);
            setPreviewUrl(URL.createObjectURL(file));
            setHasSearched(false);
            setResults([]);
            setSearchQuery("");
        }
    };

    const handleDragOver = (e) => {
        e.preventDefault();
    };

    const handleRemoveImage = () => {
        setImage(null);
        setPreviewUrl(null);
        setResults([]);
        setSearchQuery("");
        setHasSearched(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const normalizeText = (value) => {
        if (!value) return '';
        return value.toString().toLowerCase();
    };

    const convertToBase64 = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = (error) => reject(error);
        });
    };

    const handleSearch = async () => {
        if (!image) return;

        setIsSearching(true);
        setResults([]);
        setSearchQuery("");

        try {
            const base64Image = await convertToBase64(image);

            const response = await fetch('/api/assistant/describe-image', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ image: base64Image, storeType: type }),
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error || 'Failed to analyze image');
            }

            const data = await response.json();
            const query = data.query || "";
            setSearchQuery(query);

            if (!query) {
                setResults([]);
                setHasSearched(true);
                return;
            }

            let candidates = products;

            const fashionCategories = new Set(['Men', 'Women', 'Footwear', 'Accessories', 'Streetwear', 'Luxury']);
            candidates = candidates.filter(product => {
                const resolvedType = product.productType || product.store?.storeType;
                if (resolvedType) return resolvedType === type;
                const isFashionCategory = fashionCategories.has(product.category);
                return isFashion ? isFashionCategory : !isFashionCategory;
            });

            const productTypeKeywords = {
                mobile: ['mobile', 'phone', 'smartphone', 'iphone', 'galaxy', 's24', 's23', 's22', 's21', 'note', 'pixel'],
                television: ['tv', 'television', 'smart tv', 'led tv', 'oled', 'qled'],
                laptop: ['laptop', 'notebook', 'macbook', 'thinkpad', 'dell', 'hp laptop'],
                headphones: ['headphone', 'headphones', 'earphone', 'earphones'],
                earbuds: ['earbud', 'earbuds', 'airpods', 'galaxy buds'],
                watch: ['watch', 'smartwatch', 'apple watch', 'galaxy watch'],
                speaker: ['speaker', 'speakers', 'soundbar'],
            };

            const queryLower = query.toLowerCase();
            let detectedProductType = null;
            for (const [pType, keywords] of Object.entries(productTypeKeywords)) {
                if (keywords.some(keyword => queryLower.includes(keyword))) {
                    detectedProductType = pType;
                    break;
                }
            }

            const typeToCategory = {
                mobile: 'Mobiles',
                television: 'Televisions',
                laptop: 'Laptops',
                headphones: 'Headphones',
                earbuds: 'Earbuds',
                watch: 'Watch',
                speaker: 'Speakers',
            };

            const expectedCategory = detectedProductType ? typeToCategory[detectedProductType] : null;

            const searchTerms = query.toLowerCase().split(' ').filter(t => t.length > 2);
            
            const knownBrands = ['samsung', 'apple', 'sony', 'lg', 'xiaomi', 'oneplus', 'oppo', 'vivo', 'realme', 'nokia', 'motorola', 'google', 'dell', 'hp', 'lenovo', 'asus', 'acer', 'msi'];
            const queryBrand = searchTerms.find(term => knownBrands.includes(term)) || null;

            const matchedProducts = candidates.filter(product => {
                const pName = normalizeText(product.name);
                const pBrand = normalizeText(product.brand || product.store?.name);
                const pCategory = product.category;

                const nameMatches = searchTerms.filter(term => pName.includes(term)).length;
                const brandMatches = searchTerms.filter(term => pBrand.includes(term)).length;
                const totalMatches = nameMatches + brandMatches;

                if (expectedCategory) {
                    const categoryMatch = pCategory === expectedCategory;
                    if (categoryMatch) return totalMatches > 0;
                    if (nameMatches === 0 && brandMatches > 0) return false;
                    if (nameMatches >= 2) return true;
                }

                if (totalMatches < 2 && searchTerms.length >= 2) return false;

                return totalMatches > 0;
            });

            const scored = matchedProducts.map(product => {
                let score = 0;
                const pName = normalizeText(product.name);
                const pBrand = normalizeText(product.brand || product.store?.name);
                const pCategory = product.category;
                const q = query.toLowerCase();

                if (expectedCategory && pCategory === expectedCategory) score += 50;
                else if (expectedCategory) score -= 30;

                if (queryBrand && pBrand.includes(queryBrand)) score += 15;
                if (pName.includes(q)) score += 30;

                const nameIntersection = searchTerms.filter(t => pName.includes(t));
                score += nameIntersection.length * 8;

                const brandIntersection = searchTerms.filter(t => pBrand.includes(t));
                score += brandIntersection.length * 3;

                if (expectedCategory && pCategory !== expectedCategory) {
                    if (brandIntersection.length > 0 && nameIntersection.length === 0) score -= 40;
                }

                return { product, score };
            });

            const finalResults = scored
                .sort((a, b) => b.score - a.score)
                .map(item => item.product);

            setResults(finalResults);
            setHasSearched(true);

        } catch (error) {
            console.error("Search failed:", error);
            setHasSearched(true);
        } finally {
            setIsSearching(false);
        }
    };

    return (
        <div className={`min-h-screen py-8 px-4 sm:px-6 lg:px-8 ${
            isFashion ? 'bg-[#faf5f0] text-[#2d1810]' : 'bg-[#0a0a0b] text-zinc-100'
        }`}>
            <div className="max-w-7xl mx-auto space-y-8">

                <div className="text-center space-y-4">
                    <h1 className={`text-4xl md:text-5xl font-bold tracking-tight ${isFashion ? 'text-[#2d1810]' : 'text-zinc-100'}`}>
                        Find your <span className={isFashion ? 'text-[#8B6914]' : 'text-teal-400'}>Product</span>
                    </h1>
                    <p className={`text-lg max-w-2xl mx-auto ${isFashion ? 'text-[#8B7355]' : 'text-zinc-400'}`}>
                        Upload an image and we'll search for the exact matching product.
                    </p>
                </div>

                <div className="max-w-2xl mx-auto">
                    {!previewUrl ? (
                        <div
                            onDrop={handleDrop}
                            onDragOver={handleDragOver}
                            onClick={() => fileInputRef.current?.click()}
                            className={`border-2 border-dashed rounded-3xl p-12 text-center cursor-pointer transition-all duration-300 group ${
                                isFashion
                                    ? 'border-[#d4c4a8] hover:border-[#8B6914] hover:bg-white/50'
                                    : 'border-zinc-700 hover:border-teal-400 hover:bg-zinc-900/50'
                            }`}
                        >
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileChange}
                                accept="image/*"
                                className="hidden"
                            />
                            <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 ${
                                isFashion ? 'bg-[#f5ede3]' : 'bg-zinc-800'
                            }`}>
                                <Upload className={`w-10 h-10 ${isFashion ? 'text-[#8B7355] group-hover:text-[#8B6914]' : 'text-zinc-400 group-hover:text-teal-400'}`} />
                            </div>
                            <h3 className={`text-xl font-semibold mb-2 ${isFashion ? 'text-[#2d1810]' : 'text-zinc-100'}`}>Click to upload or drag and drop</h3>
                            <p className={isFashion ? 'text-[#8B7355]' : 'text-zinc-500'}>Supports JPG, PNG, WEBP</p>
                        </div>
                    ) : (
                        <div className={`relative rounded-3xl p-6 border shadow-2xl ${
                            isFashion ? 'bg-white border-[#d4c4a8]/40' : 'bg-zinc-900 border-zinc-800'
                        }`}>
                            <button
                                onClick={handleRemoveImage}
                                className="absolute -top-3 -right-3 p-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 rounded-full transition-colors z-10"
                            >
                                <X size={20} />
                            </button>

                            <div className={`relative aspect-video w-full rounded-2xl overflow-hidden mb-6 group ${
                                isFashion ? 'bg-[#f5ede3]' : 'bg-zinc-950'
                            }`}>
                                <img
                                    src={previewUrl}
                                    alt="Preview"
                                    className="w-full h-full object-contain"
                                />
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <p className="text-white font-medium">Change Image</p>
                                </div>
                                <input
                                    type="file"
                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                    onChange={handleFileChange}
                                    accept="image/*"
                                />
                            </div>

                            <button
                                onClick={handleSearch}
                                disabled={isSearching}
                                className={`w-full py-4 rounded-xl font-bold text-lg shadow-lg flex items-center justify-center gap-2 transition-all duration-300 ${isSearching
                                        ? (isFashion ? 'bg-[#f5ede3] text-[#8B7355] cursor-not-allowed' : 'bg-zinc-800 text-zinc-500 cursor-not-allowed')
                                        : (isFashion ? 'bg-[#8B6914] text-white hover:bg-[#7a5c12] shadow-[#8B6914]/20' : 'bg-teal-400 text-zinc-900 hover:brightness-110 shadow-teal-400/20')
                                    }`}
                            >
                                {isSearching ? (
                                    <>
                                        <Loader2 className="animate-spin" />
                                        Analyzing Image...
                                    </>
                                ) : (
                                    <>
                                        <Search size={22} />
                                        Find Similar Products
                                    </>
                                )}
                            </button>
                        </div>
                    )}
                </div>

                {(hasSearched || isSearching) && (
                    <div className="animate-in fade-in slide-in-from-bottom-8 duration-700">
                        <div className="flex items-center gap-3 mb-6">
                            <ImageIcon className={isFashion ? 'text-[#8B6914]' : 'text-teal-400'} />
                            <h2 className={`text-2xl font-bold ${isFashion ? 'text-[#2d1810]' : 'text-zinc-100'}`}>Visual Matches</h2>
                            {searchQuery && (
                                <span className={`ml-2 text-sm border px-2 py-1 rounded-full ${
                                    isFashion ? 'text-[#8B7355] border-[#d4c4a8]/60' : 'text-zinc-400 border-zinc-700'
                                }`}>
                                    Query: "{searchQuery}"
                                </span>
                            )}
                            <div className={`h-px flex-1 ${isFashion ? 'bg-[#d4c4a8]/40' : 'bg-zinc-800'}`}></div>
                        </div>

                        {isSearching ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                                {[...Array(4)].map((_, i) => (
                                    <div key={i} className={`rounded-2xl h-[400px] animate-pulse border ${
                                        isFashion ? 'bg-white border-[#d4c4a8]/30' : 'bg-zinc-900/50 border-zinc-800'
                                    }`} />
                                ))}
                            </div>
                        ) : results.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                                {results.map((product) => (
                                    <ProductCard key={product.id} product={product} />
                                ))}
                            </div>
                        ) : (
                            <div className={`text-center py-20 rounded-3xl border border-dashed ${
                                isFashion ? 'bg-white/50 border-[#d4c4a8]' : 'bg-zinc-900/30 border-zinc-800'
                            }`}>
                                <p className={`text-xl ${isFashion ? 'text-[#8B7355]' : 'text-zinc-400'}`}>No matching products found.</p>
                                <p className={`mt-2 ${isFashion ? 'text-[#8B7355]/60' : 'text-zinc-600'}`}>
                                    We searched for "{searchQuery}". Try a clearer image.
                                </p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default FindProductPage;
