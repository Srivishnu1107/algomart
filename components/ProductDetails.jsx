'use client'

import { addToCart } from "@/lib/features/cart/cartSlice";
import { addToWishlist, removeFromWishlist } from "@/lib/features/wishlist/wishlistSlice";
import { trackBehavior } from "@/lib/behaviorTracker";
import { StarIcon, TagIcon, EarthIcon, CreditCardIcon, UserIcon, MoreVertical, Heart, Share2, Flag, AlertTriangle, Copy, Info, FileWarning, MessageCircle, MessageSquare } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import Counter from "./Counter";
import { useDispatch, useSelector } from "react-redux";
import { useAuth } from "@clerk/nextjs";
import toast from "react-hot-toast";

const REPORT_REASONS = [
    { id: "inappropriate", label: "Inappropriate content", icon: AlertTriangle },
    { id: "fake", label: "Fake or counterfeit", icon: Copy },
    { id: "wrong_info", label: "Wrong or misleading information", icon: Info },
    { id: "copyright", label: "Copyright or trademark", icon: FileWarning },
    { id: "spam", label: "Spam", icon: MessageCircle },
    { id: "other", label: "Other", icon: MessageSquare },
];

const ProductDetails = ({ product }) => {
    const productId = product.id;
    const currency = process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || '₹';
    const storeType = product.store?.storeType || (product.productType === "fashion" ? "fashion" : "electronics");
    const pathname = usePathname();
    const isFashion = pathname?.startsWith('/fashion');
    const cartPath = isFashion ? '/cart?from=fashion' : '/cart';

    const cart = useSelector(state => state.cart.cartItems);
    const wishlistIds = useSelector(state => state.wishlist?.[storeType]?.productIds ?? []);
    const isWishlisted = wishlistIds.includes(productId);

    const dispatch = useDispatch();
    const router = useRouter();
    const { getToken } = useAuth();

    const [mainImage, setMainImage] = useState(product.images[0]);
    const [menuOpen, setMenuOpen] = useState(false);
    const [reportDrawerOpen, setReportDrawerOpen] = useState(false);
    const [reportReason, setReportReason] = useState("");
    const [reportCustom, setReportCustom] = useState("");
    const [reportSubmitting, setReportSubmitting] = useState(false);
    const menuRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
        };
        document.addEventListener("click", handleClickOutside);
        return () => document.removeEventListener("click", handleClickOutside);
    }, []);

    const addToCartHandler = () => {
        dispatch(addToCart({ productId }));
        trackBehavior({ eventType: 'add_to_cart', category: storeType, productId });
    };

    const [wishlistLoading, setWishlistLoading] = useState(false);
    const handleWishlistToggle = async () => {
        setMenuOpen(false);
        if (wishlistLoading) return;
        setWishlistLoading(true);
        try {
            if (isWishlisted) {
                await dispatch(removeFromWishlist({ productId, storeType, getToken })).unwrap();
                toast.success("Removed from wishlist");
            } else {
                await dispatch(addToWishlist({ productId, storeType, getToken })).unwrap();
                trackBehavior({ eventType: 'wishlist', category: storeType, productId });
                toast.success("Added to wishlist");
            }
        } catch (e) {
            if (e?.message?.includes?.("Unauthorized") || e?.status === 401) {
                toast.error("Sign in to use wishlist");
            } else {
                toast.error(e?.message || "Could not update wishlist");
            }
        } finally {
            setWishlistLoading(false);
        }
    };

    const handleShare = async () => {
        setMenuOpen(false);
        const url = typeof window !== "undefined" ? window.location.href : "";
        try {
            if (navigator.share) {
                await navigator.share({ title: product.name, url });
                toast.success("Link shared");
            } else {
                await navigator.clipboard.writeText(url);
                toast.success("Link copied to clipboard");
            }
        } catch (e) {
            if (e.name !== "AbortError") {
                await navigator.clipboard.writeText(url);
                toast.success("Link copied to clipboard");
            }
        }
    };

    const openReportDrawer = () => {
        setMenuOpen(false);
        setReportReason("");
        setReportCustom("");
        setReportDrawerOpen(true);
    };

    const closeReportDrawer = () => {
        setReportDrawerOpen(false);
        setReportReason("");
        setReportCustom("");
    };

    const handleReportSubmit = async () => {
        if (!reportReason) {
            toast.error("Please select a reason");
            return;
        }
        if (reportReason === "other" && !reportCustom.trim()) {
            toast.error("Please describe the reason");
            return;
        }
        setReportSubmitting(true);
        try {
            const res = await fetch("/api/report", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    productId,
                    reasonType: reportReason,
                    customReason: reportReason === "other" ? reportCustom.trim() : undefined,
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to submit");
            toast.success("Report submitted. We’ll look into it.");
            closeReportDrawer();
        } catch (e) {
            toast.error(e.message || "Could not submit report");
        } finally {
            setReportSubmitting(false);
        }
    };

    const averageRating = product.rating?.length
        ? product.rating.reduce((acc, item) => acc + item.rating, 0) / product.rating.length
        : 0;

    const discount = product.mrp ? Math.round(((product.mrp - product.price) / product.mrp) * 100) : 0;

    return (
        <div className="flex max-lg:flex-col gap-8 lg:gap-12">
            {/* Left: Vertical image gallery */}
            <div className="flex max-sm:flex-col-reverse gap-4 flex-shrink-0">
                <div className="flex sm:flex-col gap-2 order-2 sm:order-1">
                    {product.images.map((image, index) => (
                        <button
                            key={index}
                            type="button"
                            onClick={() => setMainImage(product.images[index])}
                            className={`flex items-center justify-center size-16 sm:size-20 rounded-xl border-2 transition-all duration-300 ${mainImage === image
                                ? (isFashion ? 'border-[#8B6914] bg-[#f5ede3] shadow-[0_0_15px_-3px_rgba(139,105,20,0.15)]' : 'border-cyan-500 bg-zinc-800 shadow-[0_0_15px_-3px_rgba(6,182,212,0.2)]')
                                : (isFashion ? 'border-[#d4c4a8]/40 bg-[#f5ede3]/60 hover:border-[#c4a882]/60' : 'border-zinc-700/40 bg-zinc-800/40 hover:border-zinc-500/60')
                                }`}
                        >
                            <Image src={image} alt="" width={64} height={64} className="max-h-12 w-auto object-contain" />
                        </button>
                    ))}
                </div>
                {/* Center: Large product preview */}
                <div className={`flex-1 flex justify-center items-center min-h-[280px] sm:min-h-[400px] rounded-2xl p-6 order-1 sm:order-2 transition-all duration-300 ${isFashion ? 'bg-[#f5ede3] border border-[#d4c4a8]/30 hover:border-[#c4a882]/40 hover:shadow-[0_0_30px_-8px_rgba(139,105,20,0.08)]'
                    : 'bg-zinc-900/40 border border-zinc-700/40 hover:border-cyan-500/20 hover:shadow-[0_0_30px_-8px_rgba(6,182,212,0.08)]'
                    }`}>
                    <Image src={mainImage} alt={product.name} width={400} height={400} className="max-h-80 w-auto object-contain" />
                </div>
            </div>

            {/* Right: Pricing, EMI (UI), offers, sticky CTA */}
            <div className="flex-1 lg:sticky lg:top-24 lg:self-start space-y-6">
                <div className="flex items-start justify-between gap-3">
                    <h1 className={`text-2xl sm:text-3xl font-semibold min-w-0 flex-1 ${isFashion ? 'text-[#2d1810]' : 'text-zinc-100'}`}>{product.name}</h1>
                    <div className="relative flex-shrink-0" ref={menuRef}>
                        <button
                            type="button"
                            onClick={() => setMenuOpen((o) => !o)}
                            className={`p-2 rounded-lg transition ${isFashion ? 'text-[#8B7355] hover:text-[#2d1810] hover:bg-[#f0e8dc]' : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800'}`}
                            aria-label="More options"
                        >
                            <MoreVertical size={22} />
                        </button>
                        {menuOpen && (
                            <div className={`absolute right-0 top-full mt-1 py-1.5 min-w-[180px] rounded-xl border shadow-xl z-20 animate-in fade-in duration-150 ${isFashion ? 'border-[#d4c4a8]/30 bg-white' : 'border-zinc-700 bg-zinc-900'
                                }`}>
                                <button
                                    type="button"
                                    onClick={handleWishlistToggle}
                                    disabled={wishlistLoading}
                                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm transition disabled:opacity-60 ${isFashion ? 'text-[#8B7355] hover:bg-[#f5ede3] hover:text-[#2d1810]' : 'text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100'
                                        }`}
                                >
                                    <Heart size={18} className={isWishlisted ? (isFashion ? "text-[#8B6914]" : "text-rose-400") : (isFashion ? "text-[#8B7355]" : "text-zinc-500")} fill={isWishlisted ? "currentColor" : "none"} />
                                    {isWishlisted ? "In wishlist" : "Add to wishlist"}
                                </button>
                                <button
                                    type="button"
                                    onClick={handleShare}
                                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm transition ${isFashion ? 'text-[#8B7355] hover:bg-[#f5ede3] hover:text-[#2d1810]' : 'text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100'
                                        }`}
                                >
                                    <Share2 size={18} className={isFashion ? "text-[#8B7355]" : "text-zinc-500"} />
                                    Share
                                </button>
                                <button
                                    type="button"
                                    onClick={openReportDrawer}
                                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm transition ${isFashion ? 'text-[#8B7355] hover:bg-[#f5ede3] hover:text-[#2d1810]' : 'text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100'
                                        }`}
                                >
                                    <Flag size={18} className={isFashion ? "text-[#8B7355]" : "text-zinc-500"} />
                                    Report
                                </button>
                            </div>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex">
                        {Array(5).fill('').map((_, i) => (
                            <StarIcon key={i} size={16} className="text-transparent" fill={averageRating >= i + 1 ? (isFashion ? '#8B6914' : '#14b8a6') : (isFashion ? '#d4c4a8' : '#3f3f46')} />
                        ))}
                    </div>
                    <span className={`text-sm ${isFashion ? 'text-[#8B7355]' : 'text-zinc-500'}`}>{product.rating?.length || 0} Reviews</span>
                </div>

                <div className="flex items-baseline gap-3">
                    <span className={`text-2xl font-bold ${isFashion ? 'text-[#2d1810]' : 'text-white'}`}>{currency}{product.price}</span>
                    {product.mrp && product.mrp > product.price && (
                        <>
                            <span className={`text-lg line-through ${isFashion ? 'text-[#8B7355]/60' : 'text-zinc-500'}`}>{currency}{product.mrp}</span>
                            <span className={`px-2.5 py-1 text-xs font-bold rounded-lg ${isFashion ? 'bg-[#8B6914] text-white' : 'bg-teal-400 text-zinc-900'}`}>{discount}% OFF</span>
                        </>
                    )}
                </div>
                {product.mrp && product.mrp > product.price && (
                    <div className={`flex items-center gap-2 text-sm ${isFashion ? 'text-[#8B7355]' : 'text-zinc-400'}`}>
                        <TagIcon size={14} />
                        <span>Save {discount}% right now</span>
                    </div>
                )}

                {/* Low Stock Warning */}
                {product.stock_quantity !== undefined && product.stock_quantity > 0 && product.low_stock_threshold !== undefined && product.stock_quantity <= product.low_stock_threshold && (
                    <div className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/30">
                        <div className="flex items-start gap-3">
                            <AlertTriangle size={18} className="text-yellow-400 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="text-sm font-medium text-yellow-400">Limited Stock Available</p>
                                <p className="text-xs text-yellow-300/80 mt-1">
                                    Only {product.stock_quantity} {product.stock_quantity === 1 ? 'item' : 'items'} remaining. Order soon!
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Out of Stock Warning */}
                {product.stock_quantity !== undefined && product.stock_quantity === 0 && (
                    <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30">
                        <div className="flex items-start gap-3">
                            <AlertTriangle size={18} className="text-red-400 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="text-sm font-medium text-red-400">Out of Stock</p>
                                <p className="text-xs text-red-300/80 mt-1">
                                    This product is currently unavailable.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* EMI (UI only) */}
                <div className={`p-4 rounded-2xl transition-all duration-300 ${isFashion
                    ? 'bg-[#f5ede3] border border-[#d4c4a8]/30 hover:border-[#c4a882]/40 hover:shadow-[0_0_20px_-5px_rgba(139,105,20,0.08)]'
                    : 'bg-zinc-900/40 border border-zinc-700/40 hover:border-cyan-500/15 hover:shadow-[0_0_20px_-5px_rgba(6,182,212,0.06)]'
                    }`}>
                    <p className={`text-sm font-medium ${isFashion ? 'text-[#2d1810]' : 'text-zinc-300'}`}>EMI available</p>
                    <p className={`text-xs mt-1 ${isFashion ? 'text-[#8B7355]' : 'text-zinc-500'}`}>No cost EMI on select cards. T&Cs apply.</p>
                </div>

                {product.stock_quantity === undefined || product.stock_quantity > 0 ? (
                    <div className="flex flex-wrap items-end gap-4">
                        {cart[productId] && (
                            <div className="flex flex-col gap-2">
                                <p className={`text-sm font-medium ${isFashion ? 'text-[#8B7355]' : 'text-zinc-400'}`}>Quantity</p>
                                <Counter productId={productId} />
                            </div>
                        )}
                        <button
                            onClick={() => (!cart[productId] ? addToCartHandler() : router.push(cartPath))}
                            className={`px-8 py-4 text-sm font-bold rounded-xl transition hover:scale-[1.02] active:scale-[0.98] ${isFashion ? 'bg-[#8B6914] hover:bg-[#7a5c12] text-white shadow-xl shadow-[#8B6914]/25' : 'bg-teal-400 hover:bg-teal-300 text-zinc-900 shadow-xl shadow-teal-500/25'}`}
                        >
                            {!cart[productId] ? 'Add to Cart' : 'View Cart'}
                        </button>
                        <button
                            onClick={() => {
                                if (cart[productId]) {
                                    router.push(cartPath)
                                } else {
                                    dispatch(addToCart({ productId }))
                                    router.push(cartPath)
                                }
                            }}
                            className={`px-8 py-4 text-sm font-semibold rounded-xl transition ${isFashion
                                ? 'text-[#2d1810] bg-[#f0e8dc] hover:bg-[#e8ddd0] border border-[#d4c4a8]/50'
                                : 'text-zinc-100 bg-zinc-700 hover:bg-zinc-600 border border-zinc-600'
                                }`}
                        >
                            Buy Now
                        </button>
                    </div>
                ) : null}

                <hr className={isFashion ? 'border-[#d4c4a8]/30' : 'border-zinc-700'} />

                <div className={`flex flex-col gap-3 text-sm ${isFashion ? 'text-[#8B7355]' : 'text-zinc-400'}`}>
                    <p className="flex items-center gap-3"><EarthIcon size={18} className={isFashion ? 'text-[#8B6914]' : 'text-zinc-500'} /> Free shipping worldwide</p>
                    <p className="flex items-center gap-3"><CreditCardIcon size={18} className={isFashion ? 'text-[#8B6914]' : 'text-zinc-500'} /> 100% Secured Payment</p>
                    <p className="flex items-center gap-3"><UserIcon size={18} className={isFashion ? 'text-[#8B6914]' : 'text-zinc-500'} /> Trusted by top brands</p>
                </div>
            </div>

            {/* Report drawer overlay */}
            {reportDrawerOpen && (
                <>
                    <div
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 animate-in fade-in duration-200"
                        aria-hidden
                        onClick={closeReportDrawer}
                    />
                    <div
                        className={`fixed inset-y-0 right-0 w-full max-w-md shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-300 ${isFashion ? 'bg-[#faf5f0] border-l border-[#d4c4a8]/30' : 'bg-zinc-900 border-l border-zinc-700'
                            }`}
                        role="dialog"
                        aria-labelledby="report-drawer-title"
                    >
                        <div className={`flex items-center justify-between p-5 border-b ${isFashion ? 'border-[#d4c4a8]/30' : 'border-zinc-700'}`}>
                            <h2 id="report-drawer-title" className={`text-lg font-semibold ${isFashion ? 'text-[#2d1810]' : 'text-zinc-100'}`}>Report this product</h2>
                            <button
                                type="button"
                                onClick={closeReportDrawer}
                                className={`p-2 rounded-lg transition ${isFashion ? 'text-[#8B7355] hover:text-[#2d1810] hover:bg-[#f0e8dc]' : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800'}`}
                                aria-label="Close"
                            >
                                <span className="sr-only">Close</span>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-5 space-y-5">
                            <p className={`text-sm ${isFashion ? 'text-[#8B7355]' : 'text-zinc-400'}`}>Why are you reporting this listing? Your report helps us keep the marketplace safe.</p>
                            <div className="space-y-1.5">
                                {REPORT_REASONS.map(({ id, label, icon: Icon }) => (
                                    <button
                                        key={id}
                                        type="button"
                                        onClick={() => setReportReason(id)}
                                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left text-sm transition ${reportReason === id
                                            ? (isFashion ? "border-[#8B6914]/60 bg-[#8B6914]/10 text-[#8B6914]" : "border-teal-500/60 bg-teal-500/10 text-teal-300")
                                            : (isFashion ? "border-[#d4c4a8]/40 bg-white text-[#8B7355] hover:border-[#c4a882]/50 hover:bg-[#f5ede3]" : "border-zinc-700 bg-zinc-800/50 text-zinc-300 hover:border-zinc-600 hover:bg-zinc-800")
                                            }`}
                                    >
                                        <Icon size={18} className="flex-shrink-0 text-zinc-500" />
                                        {label}
                                    </button>
                                ))}
                            </div>
                            {reportReason === "other" && (
                                <div className="pt-2">
                                    <label htmlFor="report-custom" className={`block text-sm font-medium mb-2 ${isFashion ? 'text-[#2d1810]' : 'text-zinc-300'}`}>Please describe (optional but helpful)</label>
                                    <textarea
                                        id="report-custom"
                                        value={reportCustom}
                                        onChange={(e) => setReportCustom(e.target.value)}
                                        placeholder="Provide more details..."
                                        rows={4}
                                        maxLength={2000}
                                        className={`w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 transition ${isFashion
                                            ? 'border-[#d4c4a8]/40 bg-white text-[#2d1810] placeholder-[#8B7355]/50 focus:ring-[#8B6914]/30 focus:border-[#8B6914]/40'
                                            : 'border-zinc-700 bg-zinc-800/50 text-zinc-100 placeholder-zinc-500 focus:ring-teal-500/50 focus:border-teal-500/50'
                                            }`}
                                    />
                                    <p className={`text-xs mt-1 ${isFashion ? 'text-[#8B7355]/60' : 'text-zinc-500'}`}>{reportCustom.length}/2000</p>
                                </div>
                            )}
                        </div>
                        <div className={`p-5 border-t flex gap-3 ${isFashion ? 'border-[#d4c4a8]/30' : 'border-zinc-700'}`}>
                            <button
                                type="button"
                                onClick={closeReportDrawer}
                                className={`flex-1 py-3 rounded-xl border transition font-medium ${isFashion ? 'border-[#d4c4a8]/40 text-[#8B7355] hover:bg-[#f5ede3]' : 'border-zinc-600 text-zinc-300 hover:bg-zinc-800'
                                    }`}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleReportSubmit}
                                disabled={reportSubmitting || !reportReason || (reportReason === "other" && !reportCustom.trim())}
                                className={`flex-1 py-3 rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition ${isFashion ? 'bg-[#8B6914] text-white hover:bg-[#7a5c12]' : 'bg-teal-500 text-zinc-900 hover:bg-teal-400'
                                    }`}
                            >
                                {reportSubmitting ? "Submitting…" : "Submit report"}
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default ProductDetails;
