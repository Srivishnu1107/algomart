'use client'

import ProductDescription from "@/components/ProductDescription";
import ProductDetails from "@/components/ProductDetails";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { trackBehavior } from "@/lib/behaviorTracker";
import { ChevronRight } from "lucide-react";

export default function ProductPageClient() {
  const { productId } = useParams();
  const [product, setProduct] = useState();
  const [notFound, setNotFound] = useState(false);
  const [loadingById, setLoadingById] = useState(false);
  const products = useSelector(state => state.product.list);
  const pathname = usePathname();
  const isFashionRoute = pathname?.startsWith('/fashion');
  const fashionCategories = useMemo(() => new Set(['Men', 'Women', 'Footwear', 'Accessories', 'Streetwear', 'Luxury']), []);
  const viewTrackedRef = useRef(false);
  const enterTimeRef = useRef(null);

  useEffect(() => {
    scrollTo(0, 0);
  }, [productId]);

  useEffect(() => {
    if (!productId) return;
    const fromList = products.find((p) => p.id === productId);
    if (fromList) {
      setProduct(fromList);
      setNotFound(false);
      return;
    }
    if (products.length > 0) {
      setProduct(undefined);
      setNotFound(true);
      return;
    }
    setLoadingById(true);
    setNotFound(false);
    fetch(`/api/product/${productId}`)
      .then((res) => {
        if (res.ok) return res.json();
        if (res.status === 404) {
          setNotFound(true);
          setProduct(undefined);
          return null;
        }
        return null;
      })
      .then((data) => {
        if (data) {
          setProduct(data);
          setNotFound(false);
        }
      })
      .finally(() => setLoadingById(false));
  }, [productId, products]);

  useEffect(() => { viewTrackedRef.current = false; }, [productId]);

  useEffect(() => {
    if (!product || !productId) return;
    const category = product.productType || product.store?.storeType === 'fashion' ? 'fashion' : 'electronics';
    if (!viewTrackedRef.current) {
      viewTrackedRef.current = true;
      enterTimeRef.current = Date.now();
      trackBehavior({ eventType: 'product_view', category, productId });
    }
    const handleLeave = () => {
      if (enterTimeRef.current) {
        const timeSpentSeconds = Math.round((Date.now() - enterTimeRef.current) / 1000);
        if (timeSpentSeconds > 0) {
          trackBehavior({ eventType: 'time_on_page', category, productId, payload: { timeSpentSeconds } });
        }
      }
    };
    const handleVisibility = () => { if (document.visibilityState === 'hidden') handleLeave(); };
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('beforeunload', handleLeave);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('beforeunload', handleLeave);
      handleLeave();
    };
  }, [product, productId]);

  const isFashionProduct = useMemo(() => {
    if (!product) return false;
    const resolvedType = product.productType || product.store?.storeType;
    if (resolvedType) return resolvedType === 'fashion';
    return fashionCategories.has(product.category);
  }, [product, fashionCategories]);

  const isElectronicsProduct = product ? !isFashionProduct : false;
  const accent = isFashionRoute ? 'amber' : 'cyan';

  return (
    <div className={`relative min-h-screen mx-4 sm:mx-6 ${isFashionRoute ? 'bg-[#faf5f0]' : 'bg-[#0a0a0b]'}`}>
      {/* Ambient glow effects */}
      {!isFashionRoute && (
        <>
          <div className="absolute top-0 right-[10%] w-[400px] h-[400px] rounded-full bg-cyan-500/[0.03] blur-[120px] pointer-events-none" />
          <div className="absolute top-[20%] left-[5%] w-[300px] h-[300px] rounded-full bg-purple-500/[0.02] blur-[100px] pointer-events-none" />
        </>
      )}

      <div className="relative max-w-7xl mx-auto py-6">
        {product && isFashionProduct && !isFashionRoute && (
          <div className="rounded-2xl border border-[#8B6914]/20 bg-zinc-900/40 p-6 text-zinc-300 mb-6 hover:border-[#8B6914]/30 hover:shadow-[0_0_25px_-5px_rgba(139,105,20,0.1)] transition-all duration-300">
            <h2 className="text-lg font-semibold text-white mb-2">Fashion product</h2>
            <p className="text-sm text-zinc-400 mb-4">This item is available in the fashion store only.</p>
            <Link href="/fashion/shop" className="inline-flex items-center px-4 py-2 text-sm font-semibold text-white bg-[#8B6914] hover:bg-[#7a5c12] rounded-xl transition shadow-lg shadow-[#8B6914]/20">Go to Fashion Shop</Link>
          </div>
        )}
        {product && isElectronicsProduct && isFashionRoute && (
          <div className="rounded-2xl border border-[#d4c4a8]/30 bg-white p-6 text-[#8B7355] mb-6 hover:border-[#8B6914]/20 hover:shadow-[0_0_25px_-5px_rgba(139,105,20,0.08)] transition-all duration-300">
            <h2 className="text-lg font-semibold text-[#2d1810] mb-2">Electronics product</h2>
            <p className="text-sm text-[#8B7355] mb-4">This item is available in the electronics store only.</p>
            <Link href="/shop" className="inline-flex items-center px-4 py-2 text-sm font-semibold text-zinc-900 bg-teal-400 hover:bg-teal-300 rounded-xl transition shadow-lg shadow-teal-500/20">Go to Electronics Shop</Link>
          </div>
        )}

        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-sm mb-6">
          <Link href={isFashionRoute ? '/fashion' : '/'} className={`${isFashionRoute ? 'text-[#8B7355] hover:text-[#8B6914]' : 'text-zinc-500 hover:text-cyan-400'} transition`}>Home</Link>
          <ChevronRight size={14} className={isFashionRoute ? 'text-[#d4c4a8]' : 'text-zinc-600'} />
          <Link href={isFashionRoute ? '/fashion/shop' : '/shop'} className={`${isFashionRoute ? 'text-[#8B7355] hover:text-[#8B6914]' : 'text-zinc-500 hover:text-cyan-400'} transition`}>{isFashionRoute ? 'Collection' : 'Products'}</Link>
          {product?.category && (
            <>
              <ChevronRight size={14} className={isFashionRoute ? 'text-[#d4c4a8]' : 'text-zinc-600'} />
              <span className={isFashionRoute ? 'text-[#2d1810]' : 'text-zinc-400'}>{product.category}</span>
            </>
          )}
        </nav>

        {notFound && (
          <div className={`rounded-2xl border p-8 text-center ${isFashionRoute ? 'bg-white border-[#d4c4a8]/30 text-[#2d1810]' : 'bg-zinc-900/50 border-zinc-700 text-zinc-300'}`}>
            <h1 className="text-xl font-semibold mb-2">Product unavailable</h1>
            <p className="text-sm opacity-80 mb-4">This product is no longer available or does not exist.</p>
            <Link href={isFashionRoute ? '/fashion/shop' : '/shop'} className={`inline-flex px-4 py-2 text-sm font-semibold rounded-xl transition ${isFashionRoute ? 'bg-[#8B6914] text-white hover:bg-[#7a5c12]' : 'bg-teal-500 text-zinc-900 hover:bg-teal-400'}`}>
              Back to {isFashionRoute ? 'Collection' : 'Products'}
            </Link>
          </div>
        )}
        {loadingById && !product && !notFound && (
          <div className={`rounded-2xl border p-8 text-center ${isFashionRoute ? 'bg-white border-[#d4c4a8]/30 text-[#2d1810]' : 'bg-zinc-900/50 border-zinc-700 text-zinc-400'}`}>
            <p className="text-sm">Loading product…</p>
          </div>
        )}
        {product && ((isFashionRoute && isFashionProduct) || (!isFashionRoute && !isFashionProduct)) && <ProductDetails product={product} />}
        {product && ((isFashionRoute && isFashionProduct) || (!isFashionRoute && !isFashionProduct)) && <ProductDescription product={product} />}
      </div>
    </div>
  );
}
