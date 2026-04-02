'use client'
import { PackageIcon, Search, Menu, MapPin, MessageCircle, Home, Crown, Zap, Sparkles, ShoppingCart, Heart, ScanSearch } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useRef, useEffect, useCallback } from "react";
import { useSelector } from "react-redux";
import { useUser, useClerk, UserButton, Protect } from "@clerk/nextjs";
import axios from "axios";
import { useAuth } from "@clerk/nextjs";
import AiChatWidget from "./AiChatWidget";
import { useAskAi } from "@/contexts/AskAiContext";

const HOVER_CLOSE_DELAY = 150;

const Navbar = () => {
    const { user, isLoaded: isUserLoaded } = useUser();
    const { getToken } = useAuth();
    const { openSignIn } = useClerk();
    const { setIsOpen } = useAskAi();
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const isFashion = pathname?.startsWith('/fashion') || searchParams?.get('from') === 'fashion';
    const [searchByMode, setSearchByMode] = useState({ fashion: '', electronics: '' });
    const search = searchByMode[isFashion ? 'fashion' : 'electronics'];
    const setSearch = useCallback((valueOrUpdater) => {
        const mode = isFashion ? 'fashion' : 'electronics';
        setSearchByMode((prev) => ({
            ...prev,
            [mode]: typeof valueOrUpdater === 'function' ? valueOrUpdater(prev[mode]) : valueOrUpdater,
        }));
    }, [isFashion]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const searchInputRef = useRef(null);
    const [menuOpen, setMenuOpen] = useState(false);
    const [menuPinned, setMenuPinned] = useState(false);
    const [isSeller, setIsSeller] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);
    const [isPro, setIsPro] = useState(false);
    const [isFashionSeller, setIsFashionSeller] = useState(false);
    const [fashionStoreUsername, setFashionStoreUsername] = useState('');
    const [electronicsStoreUsername, setElectronicsStoreUsername] = useState('');
    const [showFashionAnnounce, setShowFashionAnnounce] = useState(false);
    const [showElectronicsAnnounce, setShowElectronicsAnnounce] = useState(false);
    const [isScrolled, setIsScrolled] = useState(false);
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const cartCount = useSelector(state => state.cart.total);
    const products = useSelector(state => state.product.list);
    const menuRef = useRef(null);
    const hoverCloseTimeoutRef = useRef(null);
    const userButtonRef = useRef(null);
    const searchRef = useRef(null);

    // Expand header only on the homepage when not scrolled
    const isHomePage = pathname === '/' || pathname === '/fashion';
    const shouldExpand = isHomePage && !isScrolled;

    // Track scroll position for expand/compact transition
    useEffect(() => {
        const onScroll = () => {
            setIsScrolled(window.scrollY > 80);
            setIsSearchOpen(false);
        };
        window.addEventListener('scroll', onScroll, { passive: true });
        onScroll();
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    // Auto-focus search input when opened in compact mode
    useEffect(() => {
        if (isSearchOpen && !shouldExpand && searchInputRef.current) {
            const t = setTimeout(() => searchInputRef.current?.focus(), 60);
            return () => clearTimeout(t);
        }
    }, [isSearchOpen, shouldExpand]);

    const fetchRoles = useCallback(async () => {
        if (!user) return;
        try {
            const token = await getToken();
            if (!token) {
                // If no token, reset all roles
                setIsSeller(false);
                setIsFashionSeller(false);
                setFashionStoreUsername('');
                setElectronicsStoreUsername('');
                setIsAdmin(false);
                setIsPro(false);
                return;
            }
            const [fashionSellerRes, electronicsSellerRes, adminRes, proRes] = await Promise.all([
                axios.get('/api/store/is-seller?type=fashion', { headers: { Authorization: `Bearer ${token}` } })
                    .catch(() => ({ data: { isSeller: false } })),
                axios.get('/api/store/is-seller?type=electronics', { headers: { Authorization: `Bearer ${token}` } })
                    .catch(() => ({ data: { isSeller: false } })),
                axios.get('/api/admin/is-admin', { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: { isAdmin: false } })),
                axios.get('/api/user/pro-status', { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: { isPro: false } })),
            ]);
            const fashionSeller = fashionSellerRes?.data?.isSeller ?? false;
            const electronicsSeller = electronicsSellerRes?.data?.isSeller ?? false;
            setIsFashionSeller(fashionSeller);
            setIsSeller(electronicsSeller);
            setFashionStoreUsername(fashionSellerRes?.data?.storeInfo?.username ?? '');
            setElectronicsStoreUsername(electronicsSellerRes?.data?.storeInfo?.username ?? '');
            setIsAdmin(adminRes?.data?.isAdmin ?? false);
            setIsPro(proRes?.data?.isPro ?? false);
        } catch {
            setIsSeller(false);
            setIsFashionSeller(false);
            setFashionStoreUsername('');
            setElectronicsStoreUsername('');
            setIsAdmin(false);
            setIsPro(false);
        }
    }, [user, getToken]);

    useEffect(() => {
        if (user) fetchRoles();
        else {
            setIsSeller(false);
            setIsFashionSeller(false);
            setIsAdmin(false);
            setIsPro(false);
            setFashionStoreUsername('');
            setElectronicsStoreUsername('');
        }
    }, [user, fetchRoles]);

    useEffect(() => {
        const onProUpdated = () => fetchRoles();
        window.addEventListener('pro-status-updated', onProUpdated);
        return () => window.removeEventListener('pro-status-updated', onProUpdated);
    }, [fetchRoles]);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        if (isFashion && sessionStorage.getItem('showFashionAnnounce') === '1') {
            sessionStorage.removeItem('showFashionAnnounce');
            setShowFashionAnnounce(true);
            const t = setTimeout(() => setShowFashionAnnounce(false), 2100);
            return () => clearTimeout(t);
        }
        if (!isFashion && sessionStorage.getItem('showElectronicsAnnounce') === '1') {
            sessionStorage.removeItem('showElectronicsAnnounce');
            setShowElectronicsAnnounce(true);
            const t = setTimeout(() => setShowElectronicsAnnounce(false), 2100);
            return () => clearTimeout(t);
        }
    }, [isFashion, pathname]);

    const handleSearch = (e) => {
        e.preventDefault();
        const targetPath = isFashion ? '/fashion/shop' : '/shop';
        router.push(`${targetPath}?search=${search}`);
        setShowSuggestions(false);
        setIsSearchOpen(false);
    };

    const normalizeText = useCallback((value) => {
        if (!value) return '';
        return value.toString().toLowerCase();
    }, []);

    const tokenizeSearch = useCallback((query) => {
        return query
            .toLowerCase()
            .replace(/[^a-z0-9\s]/g, ' ')
            .split(/\s+/)
            .filter(Boolean);
    }, []);

    const getSearchText = useCallback((product) => {
        const fields = [
            product.name,
            product.description,
            product.category,
            product.brand,
            product.store?.name,
            product.store?.username,
        ];
        return fields.map(normalizeText).join(' ');
    }, [normalizeText]);

    const scopedProducts = useCallback(() => {
        const fashionCategories = new Set(['Men', 'Women', 'Footwear', 'Accessories', 'Streetwear', 'Luxury']);
        return products.filter((product) => {
            const resolvedType = product.productType || product.store?.storeType;
            if (resolvedType) {
                return resolvedType === (isFashion ? 'fashion' : 'electronics');
            }
            const isFashionCategory = fashionCategories.has(product.category);
            return isFashion ? isFashionCategory : !isFashionCategory;
        });
    }, [products, isFashion]);

    const suggestions = useCallback(() => {
        const query = search.trim();
        if (!query) return [];
        const tokens = tokenizeSearch(query);
        if (tokens.length === 0) return [];
        const list = scopedProducts();
        const scored = list.map((product) => {
            const haystack = getSearchText(product);
            const matches = tokens.filter((token) => haystack.includes(token));
            return { product, matchCount: matches.length };
        });
        const anyTokenMatch = scored.filter((item) => item.matchCount > 0);
        return anyTokenMatch
            .sort((a, b) => b.matchCount - a.matchCount)
            .slice(0, 7)
            .map((item) => item.product);
    }, [getSearchText, scopedProducts, search, tokenizeSearch]);

    const scheduleHoverClose = useCallback(() => {
        if (menuPinned) return;
        hoverCloseTimeoutRef.current = setTimeout(() => {
            setMenuOpen(false);
        }, HOVER_CLOSE_DELAY);
    }, [menuPinned]);

    const cancelHoverClose = useCallback(() => {
        if (hoverCloseTimeoutRef.current) {
            clearTimeout(hoverCloseTimeoutRef.current);
            hoverCloseTimeoutRef.current = null;
        }
    }, []);

    const handleMenuMouseEnter = () => {
        cancelHoverClose();
        setMenuOpen(true);
    };

    const handleMenuMouseLeave = () => {
        scheduleHoverClose();
    };

    const handleMenuClick = () => {
        if (menuOpen && menuPinned) {
            setMenuOpen(false);
            setMenuPinned(false);
        } else if (menuOpen && !menuPinned) {
            setMenuPinned(true);
        } else {
            setMenuOpen(true);
            setMenuPinned(true);
        }
    };

    const handleMenuLinkClick = () => {
        setMenuOpen(false);
        setMenuPinned(false);
    };

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                setMenuOpen(false);
                setMenuPinned(false);
            }
            if (searchRef.current && !searchRef.current.contains(e.target)) {
                setShowSuggestions(false);
                if (!shouldExpand) setIsSearchOpen(false);
            }
        };

        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                setShowSuggestions(false);
                setIsSearchOpen(false);
                searchInputRef.current?.blur();
            }
        };

        document.addEventListener('keydown', handleEscape);
        const handleScroll = () => {
            setMenuOpen(false);
            setMenuPinned(false);

            const popoverContainer = document.querySelector('.cl-userButtonPopover');
            const popoverCard = document.querySelector('.cl-userButtonPopoverCard');

            if (popoverContainer || popoverCard) {
                if (popoverContainer) popoverContainer.remove();
                if (popoverCard) popoverCard.remove();

                const escapeEvent = new KeyboardEvent('keydown', {
                    key: 'Escape',
                    code: 'Escape',
                    keyCode: 27,
                    bubbles: true,
                    cancelable: true
                });
                document.dispatchEvent(escapeEvent);

                const clickEvent = new MouseEvent('mousedown', {
                    bubbles: true,
                    cancelable: true,
                    view: window
                });
                document.body.dispatchEvent(clickEvent);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);

        const scrollHandlerWrapper = () => {
            handleScroll();
        };
        window.addEventListener('scroll', scrollHandlerWrapper, { passive: true, capture: true });
        window.addEventListener('wheel', scrollHandlerWrapper, { passive: true, capture: true });
        document.addEventListener('scroll', scrollHandlerWrapper, { passive: true, capture: true });

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscape);
            window.removeEventListener('scroll', scrollHandlerWrapper, { capture: true });
            window.removeEventListener('wheel', scrollHandlerWrapper, { capture: true });
            document.removeEventListener('scroll', scrollHandlerWrapper, { capture: true });
        };
    }, [search, shouldExpand]);

    useEffect(() => {
        return () => cancelHoverClose();
    }, [cancelHoverClose]);

    // Fix UserButton dropdown positioning to always appear below header and close on scroll
    useEffect(() => {
        let isScrolling = false;
        let scrollTimeout = null;
        let shouldPreventReopen = false;

        const fixDropdownPosition = () => {
            if (isScrolling || shouldPreventReopen) return;

            const popover = document.querySelector('.cl-userButtonPopoverCard');
            const popoverContainer = document.querySelector('.cl-userButtonPopover');
            if (popover && userButtonRef.current) {
                const buttonRect = userButtonRef.current.getBoundingClientRect();

                popover.style.position = 'fixed';
                popover.style.top = `${buttonRect.bottom + 8}px`;
                popover.style.right = `${window.innerWidth - buttonRect.right}px`;
                popover.style.left = 'auto';
                popover.style.zIndex = '9999';
                popover.style.transform = 'none';

                if (popoverContainer) {
                    popoverContainer.style.position = 'fixed';
                    popoverContainer.style.zIndex = '9999';
                }
            }
        };

        const closeDropdown = () => {
            const popoverContainer = document.querySelector('.cl-userButtonPopover');
            const popoverCard = document.querySelector('.cl-userButtonPopoverCard');

            if (popoverContainer || popoverCard) {
                if (popoverContainer) popoverContainer.remove();
                if (popoverCard) popoverCard.remove();

                shouldPreventReopen = true;

                setTimeout(() => {
                    shouldPreventReopen = false;
                }, 300);
            }
        };

        const checkAndFix = () => {
            if (!isScrolling && !shouldPreventReopen) {
                const popover = document.querySelector('.cl-userButtonPopoverCard');
                if (popover) {
                    fixDropdownPosition();
                }
            }
        };

        const observer = new MutationObserver(() => {
            if (!isScrolling && !shouldPreventReopen) {
                setTimeout(checkAndFix, 10);
            } else {
                const popover = document.querySelector('.cl-userButtonPopoverCard');
                if (popover) {
                    closeDropdown();
                }
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        const handleScrollClose = () => {
            isScrolling = true;
            closeDropdown();

            if (scrollTimeout) {
                clearTimeout(scrollTimeout);
            }

            scrollTimeout = setTimeout(() => {
                isScrolling = false;
            }, 150);
        };

        const interval = setInterval(checkAndFix, 100);
        const scrollHandler = () => {
            handleScrollClose();
        };
        window.addEventListener('scroll', scrollHandler, { passive: true, capture: true });
        window.addEventListener('wheel', scrollHandler, { passive: true, capture: true });
        document.addEventListener('scroll', scrollHandler, { passive: true, capture: true });
        window.addEventListener('resize', checkAndFix);

        return () => {
            observer.disconnect();
            clearInterval(interval);
            if (scrollTimeout) clearTimeout(scrollTimeout);
            window.removeEventListener('scroll', scrollHandler, { capture: true });
            window.removeEventListener('wheel', scrollHandler, { capture: true });
            document.removeEventListener('scroll', scrollHandler, { capture: true });
            window.removeEventListener('resize', checkAndFix);
        };
    }, []);

    const storeItem = isFashion
        ? { label: isFashionSeller ? 'My AI STORE' : 'Become a DEVELOPER', path: isFashionSeller && fashionStoreUsername ? `/fashion/shop/${fashionStoreUsername}` : '/fashion/create-store', show: true }
        : { label: isSeller ? 'My Store' : 'Become a DEVELOPER?', path: isSeller && electronicsStoreUsername ? `/shop/${electronicsStoreUsername}` : '/create-store', show: true };

    const menuItems = [
        { label: ' AI Stores', path: isFashion ? '/fashion/stores' : '/stores', show: true },
        storeItem,
        ...(isFashion ? [{ label: 'My Adjustments', path: '/fashion/adjustments', show: true }] : []),
        { label: isPro ? 'Pro AI' : 'Upgrade to PRO AI?', path: '/pro', show: true, isProLink: true },
        ...(isAdmin ? [{ label: 'Admin', path: '/admin', show: true, isAdmin: true }] : []),
    ];

    /* Hover glow shared across interactive elements */
    const limeHover = 'hover:shadow-[0_0_15px_-3px_rgba(163,230,53,0.22)] hover:border-lime-400/20';
    const warmHover = 'hover:shadow-[0_0_12px_-3px_rgba(139,105,20,0.12)] hover:border-[#c4a882]/30';
    const accentHover = isFashion ? warmHover : limeHover;

    /* Fashion warm palette */
    const W = {
        accent: '#8B6914',
        text: '#2d1810',
        muted: '#8B7355',
        border: '#d4c4a8',
        bg: '#faf5f0',
    };

    return (
        <nav
            className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ease-out ${shouldExpand ? 'px-0 pt-0' : 'px-3 sm:px-5 pt-3'
                }`}
            style={{ isolation: 'isolate' }}
        >
            {/* Container — full-width when expanded, floating pill when compact */}
            <div className={`relative mx-auto transition-all duration-500 ease-out border ${shouldExpand
                ? (isFashion
                    ? 'max-w-full rounded-none bg-[#faf5f0]/95 backdrop-blur-xl border-transparent border-b-[#d4c4a8]/30'
                    : 'max-w-full rounded-none bg-[#060814]/50 backdrop-blur-xl border-transparent border-b-white/[0.06]')
                : (isFashion
                    ? 'max-w-7xl rounded-2xl bg-[#faf5f0]/90 backdrop-blur-2xl border-[#c4a882]/25 shadow-[0_8px_32px_-8px_rgba(139,105,20,0.08)]'
                    : 'max-w-7xl rounded-2xl bg-[#0a0b14]/70 backdrop-blur-2xl border-cyan-500/15 shadow-[0_8px_32px_-8px_rgba(0,0,0,0.5)]')
                }`}>
                {/* Accent glow line — compact mode only */}
                {!shouldExpand && (
                    <div className={`absolute bottom-0 left-[15%] right-[15%] h-px ${isFashion ? 'bg-gradient-to-r from-transparent via-[#c4a882]/40 to-transparent' : 'bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent'
                        }`} />
                )}

                <div className={`transition-all duration-500 ${shouldExpand ? 'px-6 sm:px-10 lg:px-16' : 'px-4 sm:px-6'
                    }`}>
                    <div className={`relative flex items-center justify-between gap-4 transition-all duration-500 ${shouldExpand ? 'py-4 sm:py-5' : 'py-3 sm:py-3.5'
                        }`}>

                        {/* ── Left: Logo + Pro at power (superscript) ── */}
                        <div className="flex items-center gap-2.5 order-1 min-w-0 flex-shrink-0 z-10">
                            <Link href={isFashion ? '/fashion' : '/'} className="flex items-center gap-2 flex-shrink-0 group relative">
                                {isFashion ? (
                                    <Crown
                                        size={shouldExpand ? 32 : 26}
                                        className={`transition-all duration-500 ${isPro ? 'text-amber-600 drop-shadow-[0_0_8px_rgba(234,179,8,0.8)] animate-golden-flow' : 'text-[#8B6914]'}`}
                                        strokeWidth={2}
                                    />
                                ) : (
                                    <Zap
                                        size={shouldExpand ? 32 : 26}
                                        className={`transition-all duration-500 ${isPro ? 'text-amber-400' : 'text-cyan-400'}`}
                                        strokeWidth={2.5}
                                    />
                                )}
                                <span className={`font-bold leading-tight tracking-tight transition-all duration-500 ${shouldExpand ? 'text-2xl sm:text-3xl' : 'text-xl sm:text-2xl'
                                    } ${isFashion ? 'text-[#2d1810]' : 'text-white'}`}>
                                    <span className={isFashion ? 'text-[#8B6914]' : 'text-cyan-400'}>ALgo</span>Mort<span className={isFashion ? 'text-[#8B6914]' : 'text-cyan-400'}>.</span>
                                    {isPro && (
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                router.push('/pro');
                                            }}
                                            className={`ml-0.5 text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider inline-block px-1.5 py-0.5 rounded cursor-pointer ${isFashion ? 'text-amber-700 bg-amber-400/30 border border-amber-500/50 shadow-[0_0_12px_rgba(234,179,8,0.4)] animate-golden-flow hover:bg-amber-400/40' : 'text-amber-400 bg-amber-500/20 border border-amber-500/40 hover:bg-amber-500/30'}`}
                                            style={{ verticalAlign: 'super' }}
                                        >
                                            Pro
                                        </button>
                                    )}
                                </span>
                                <Protect plan='plus'>
                                    <span className={`ml-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${isFashion
                                        ? 'bg-[#8B6914]/15 text-[#8B6914] border-[#8B6914]/30'
                                        : 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40'
                                        }`}>plus</span>
                                </Protect>
                            </Link>
                        </div>

                        {/* ── Center: Nav links (desktop) ── */}
                        <div className={`hidden md:flex items-center gap-1 lg:gap-1.5 order-2 absolute -translate-x-1/2 z-10 transition-all duration-300 ${!shouldExpand ? 'left-[36%]' : 'left-[42%]'}`}>
                            <Link
                                href={isFashion ? '/fashion' : '/'}
                                className={`transition-all duration-300 whitespace-nowrap rounded-lg ${shouldExpand ? 'text-base px-4 py-2.5' : 'text-sm px-3.5 py-2'
                                    } ${pathname === (isFashion ? '/fashion' : '/')
                                        ? (isFashion ? 'text-[#2d1810] bg-[#8B6914]/15 font-bold' : 'text-white bg-cyan-500/10 font-semibold')
                                        : (isFashion ? 'text-[#4a3728] font-semibold hover:text-[#2d1810] hover:bg-[#8B6914]/[0.08]' : 'text-zinc-400 font-medium hover:text-white hover:bg-white/5')}`}
                            >
                                Home
                            </Link>
                            <Link
                                href={isFashion ? '/fashion/shop' : '/shop'}
                                className={`transition-all duration-300 whitespace-nowrap rounded-lg ${shouldExpand ? 'text-base px-4 py-2.5' : 'text-sm px-3.5 py-2'
                                    } ${pathname?.startsWith(isFashion ? '/fashion/shop' : '/shop')
                                        ? (isFashion ? 'text-[#2d1810] bg-[#8B6914]/15 font-bold' : 'text-white bg-cyan-500/10 font-semibold')
                                        : (isFashion ? 'text-[#4a3728] font-semibold hover:text-[#2d1810] hover:bg-[#8B6914]/[0.08]' : 'text-zinc-400 font-medium hover:text-white hover:bg-white/5')}`}
                            >
                                {isFashion ? 'Explore' : 'Models'}
                            </Link>
                            <Link
                                href={isFashion ? '/address?from=fashion' : '/address'}
                                className={`transition-all duration-300 whitespace-nowrap rounded-lg ${shouldExpand ? 'text-base px-4 py-2.5' : 'text-sm px-3.5 py-2'
                                    } ${pathname === '/address'
                                        ? (isFashion ? 'text-[#2d1810] bg-[#8B6914]/15 font-bold' : 'text-white bg-cyan-500/10 font-semibold')
                                        : (isFashion ? 'text-[#4a3728] font-semibold hover:text-[#2d1810] hover:bg-[#8B6914]/[0.08]' : 'text-zinc-400 font-medium hover:text-white hover:bg-white/5')}`}
                            >
                                Location
                            </Link>
                            {isPro ? (
                                <button
                                    onClick={() => setIsOpen(prev => !prev)}
                                    className={`flex items-center gap-1.5 rounded-lg border transition-all duration-300 whitespace-nowrap cursor-pointer focus:outline-none ${shouldExpand ? 'text-base px-4 py-2.5' : 'text-sm px-3.5 py-2'
                                        } ${isFashion
                                            ? 'border-[#8B6914]/50 text-[#8B6914] font-semibold hover:bg-[#8B6914]/[0.1] hover:border-[#8B6914]/70 shadow-[0_0_10px_-3px_rgba(139,105,20,0.15)]'
                                            : 'border-cyan-500/30 text-cyan-300 font-semibold hover:bg-cyan-500/10 hover:border-cyan-500/50 shadow-[0_0_10px_-3px_rgba(6,182,212,0.15)]'
                                        }`}
                                    aria-label="Ask AI"
                                >
                                    <Sparkles size={shouldExpand ? 17 : 15} className={isFashion ? "text-[#8B6914]" : "text-cyan-400"} />
                                    <span className="font-semibold">Ask Assistant</span>
                                </button>
                            ) : (
                                <Link
                                    href="/pro"
                                    className={`flex items-center gap-1.5 rounded-lg border transition-all duration-300 whitespace-nowrap cursor-pointer focus:outline-none ${shouldExpand ? 'text-base px-4 py-2.5' : 'text-sm px-3.5 py-2'
                                        } ${isFashion
                                            ? 'border-[#d4c4a8]/40 text-[#8B7355] font-semibold hover:bg-[#8B6914]/[0.08] hover:border-[#8B6914]/50 opacity-90'
                                            : 'border-zinc-600 text-zinc-500 font-semibold hover:bg-white/5 hover:border-zinc-500/50 opacity-90'
                                        }`}
                                    aria-label="Ask AI (Pro)"
                                    title="Ask AI is available for Pro members"
                                >
                                    <Sparkles size={shouldExpand ? 17 : 15} className={isFashion ? "text-[#8B7355]" : "text-zinc-500"} />
                                    <span className="font-semibold">Ask AI</span>
                                    <Crown size={shouldExpand ? 14 : 12} className={isFashion ? "text-amber-600" : "text-amber-500/80"} />
                                </Link>
                            )}
                        </div>

                        {/* ── Right: Search, Fashion/Electronics toggle, Cart, Menu, Profile ── */}
                        <div className="flex items-center gap-2 flex-shrink-0 order-3 z-10 min-w-0">

                            {/* Search — full bar when expanded; icon that opens bar in compact */}
                            <div ref={searchRef} className="relative flex-shrink-0 min-w-0">
                                <form onSubmit={handleSearch} className="relative">
                                    <div
                                        className={`flex items-center rounded-xl transition-all duration-300 ease-in-out ${shouldExpand
                                            ? (isFashion
                                                ? 'bg-[#2d1810]/[0.04] border border-[#d4c4a8]/50 px-4 py-2.5 w-[170px] sm:w-[210px] lg:w-[250px] max-w-[250px] min-w-[170px] focus-within:border-[#8B6914]/50 focus-within:shadow-[0_0_12px_-3px_rgba(139,105,20,0.15)]'
                                                : 'bg-white/[0.06] border border-white/10 px-4 py-2.5 w-[170px] sm:w-[210px] lg:w-[250px] max-w-[250px] min-w-[170px] focus-within:border-lime-400/25 focus-within:shadow-[0_0_15px_-3px_rgba(163,230,53,0.12)]')
                                            : isSearchOpen
                                                ? (isFashion
                                                    ? 'bg-[#2d1810]/[0.04] border border-[#d4c4a8]/40 px-3.5 py-2 w-[190px] sm:w-[230px] max-w-[230px] min-w-[190px] focus-within:border-[#8B6914]/40'
                                                    : 'bg-white/[0.06] border border-white/10 px-3.5 py-2 w-[190px] sm:w-[230px] max-w-[230px] min-w-[190px] focus-within:border-lime-400/25 focus-within:shadow-[0_0_15px_-3px_rgba(163,230,53,0.12)]')
                                                : (isFashion
                                                    ? `bg-[#2d1810]/[0.06] border border-[#d4c4a8]/40 w-9 h-9 justify-center cursor-pointer hover:border-[#c4a882]/50 hover:bg-[#2d1810]/[0.1] flex-shrink-0`
                                                    : `bg-white/[0.06] border border-transparent w-9 h-9 justify-center cursor-pointer flex-shrink-0 ${limeHover}`)
                                            }`}
                                        onClick={() => {
                                            if (!shouldExpand && !isSearchOpen) setIsSearchOpen(true);
                                        }}
                                    >
                                        {(shouldExpand || isSearchOpen) ? (
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    router.push(isFashion ? '/fashion/find-product' : '/find-product');
                                                    setIsSearchOpen(false);
                                                }}
                                                className={`flex-shrink-0 cursor-pointer rounded-lg p-1.5 transition-all duration-200 ${isFashion ? 'hover:bg-[#8B6914]/15 text-[#4a3728] hover:text-[#8B6914] hover:scale-110' : 'hover:bg-cyan-500/15 text-zinc-400 hover:text-cyan-400 hover:scale-110'}`}
                                                title="got image? search it here"
                                            >
                                                <ScanSearch size={shouldExpand ? 18 : 16} />
                                            </button>
                                        ) : (
                                            <Search size={shouldExpand ? 18 : 16} className={isFashion ? 'text-[#4a3728] flex-shrink-0' : 'text-zinc-400 flex-shrink-0'} />
                                        )}
                                        <div className={`overflow-hidden transition-all duration-300 min-w-0 ${shouldExpand || isSearchOpen ? 'w-full opacity-100 ml-2.5' : 'w-0 opacity-0 ml-0'
                                            }`}>
                                            <input
                                                ref={searchInputRef}
                                                id="header-search-input"
                                                className={`w-full bg-transparent outline-none min-w-0 ${shouldExpand ? 'text-sm' : 'text-[13px]'
                                                    } ${isFashion ? 'placeholder-[#8B7355]/60 text-[#2d1810]' : 'placeholder-zinc-500 text-white'}`}
                                                type="text"
                                                placeholder="Search AI Models..."
                                                value={search}
                                                onChange={(e) => setSearch(e.target.value)}
                                                onFocus={() => setShowSuggestions(true)}
                                                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                                            />
                                        </div>
                                    </div>
                                    {showSuggestions && (shouldExpand || isSearchOpen) && search.trim() && suggestions().length > 0 && (
                                        <div className={`absolute right-0 top-full mt-2 w-[240px] sm:w-[280px] rounded-xl border shadow-2xl overflow-hidden z-[100] ${isFashion ? 'border-[#d4c4a8]/30 bg-[#faf5f0]/95 backdrop-blur-xl shadow-[#8B6914]/10' : 'border-white/10 bg-[#0d0f1a]/95 backdrop-blur-xl shadow-black/60'
                                            }`}>
                                            {suggestions().map((item) => (
                                                <button
                                                    key={item.id}
                                                    type="button"
                                                    onMouseDown={(event) => event.preventDefault()}
                                                    onClick={() => {
                                                        setSearch(item.name || '');
                                                        const targetPath = isFashion ? '/fashion/shop' : '/shop';
                                                        router.push(`${targetPath}?search=${encodeURIComponent(item.name || '')}`);
                                                        setShowSuggestions(false);
                                                        setIsSearchOpen(false);
                                                    }}
                                                    className={`w-full text-left px-4 py-2.5 text-sm transition ${isFashion ? 'text-[#8B7355] hover:bg-[#8B6914]/[0.06] hover:text-[#2d1810]' : 'text-zinc-400 hover:bg-white/5 hover:text-white'
                                                        }`}
                                                >
                                                    {item.name}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </form>
                            </div>

                            {/* Store toggle link — "Electronics" when on fashion, "Fashion" when on electronics */}
                            <Link
                                href={isFashion ? '/' : '/fashion'}
                                onClick={() => {
                                    if (!isFashion) sessionStorage.setItem('showFashionAnnounce', '1');
                                    else sessionStorage.setItem('showElectronicsAnnounce', '1');
                                }}
                                className={`flex items-center gap-1.5 rounded-xl transition-all duration-200 cursor-pointer border flex-shrink-0 whitespace-nowrap ${isFashion
                                    ? `bg-[#2d1810]/[0.06] border-[#d4c4a8]/40 text-[#4a3728] font-semibold hover:text-[#2d1810] hover:bg-[#2d1810]/[0.1] hover:border-[#c4a882]/50`
                                    : `bg-white/[0.06] border-transparent text-zinc-400 hover:text-white hover:bg-white/10 ${limeHover}`
                                    } ${shouldExpand ? 'px-4 py-2.5' : 'px-3 py-2'}`}
                            >
                                {isFashion ? <Zap size={shouldExpand ? 18 : 16} /> : <Crown size={shouldExpand ? 18 : 16} />}
                                <span className="hidden lg:inline text-sm font-semibold">{isFashion ? 'Back to Dashboard' : 'Explore'}</span>
                            </Link>

                            {/* AI Chat Widget — panel only */}
                            <AiChatWidget isFashion={isFashion} hideButton={true} />

                            {/* Wishlist heart icon */}
                            <Link
                                href={isFashion ? '/fashion/wishlist' : '/wishlist'}
                                className={`group relative flex items-center justify-center gap-0 hover:gap-1.5 rounded-xl transition-all duration-300 border overflow-hidden ${isFashion
                                    ? `bg-[#2d1810]/[0.06] border-[#d4c4a8]/40 text-[#4a3728] hover:text-red-500 hover:bg-[#2d1810]/[0.1] hover:border-[#c4a882]/50`
                                    : `bg-white/[0.06] border-transparent text-zinc-400 hover:text-red-400 hover:bg-white/10 ${limeHover}`
                                    } ${shouldExpand ? 'h-11 w-11 hover:w-[7rem] px-0 hover:px-3' : 'h-9 w-9 hover:w-[6.5rem] px-0 hover:px-2.5'}`}
                                aria-label="Wishlist"
                            >
                                <Heart size={shouldExpand ? 18 : 16} className="flex-shrink-0" />
                                <span className="max-w-0 overflow-hidden group-hover:max-w-[4rem] transition-all duration-300 text-sm font-semibold whitespace-nowrap">Wishlist</span>
                            </Link>

                            {/* Cart icon */}
                            <div className="relative">
                                <Link
                                    href={isFashion ? '/cart?from=fashion' : '/cart'}
                                    className={`group relative flex items-center justify-center gap-0 hover:gap-1.5 rounded-xl transition-all duration-300 border overflow-hidden ${isFashion
                                        ? `bg-[#2d1810]/[0.06] border-[#d4c4a8]/40 text-[#4a3728] hover:text-[#2d1810] hover:bg-[#2d1810]/[0.1] hover:border-[#c4a882]/50`
                                        : `bg-white/[0.06] border-transparent text-zinc-400 hover:text-white hover:bg-white/10 ${limeHover}`
                                        } ${shouldExpand ? 'h-11 w-11 hover:w-[5.5rem] px-0 hover:px-3' : 'h-9 w-9 hover:w-[5rem] px-0 hover:px-2.5'}`}
                                    aria-label="Cart"
                                >
                                    <ShoppingCart size={shouldExpand ? 18 : 16} className="flex-shrink-0" />
                                    <span className="max-w-0 overflow-hidden group-hover:max-w-[3rem] transition-all duration-300 text-sm font-semibold whitespace-nowrap">Cart</span>
                                </Link>
                                {cartCount > 0 && (
                                    <span className={`absolute -top-1.5 -right-1.5 min-w-[17px] h-[17px] flex items-center justify-center rounded-full text-[10px] font-bold text-white pointer-events-none z-10 ${isFashion ? 'bg-[#8B6914] shadow-[0_0_8px_rgba(139,105,20,0.4)]' : 'bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.5)]'
                                        }`}>
                                        {cartCount}
                                    </span>
                                )}
                            </div>

                            {/* Menu — positioned BEFORE profile */}
                            <div ref={menuRef} className="relative" onMouseEnter={handleMenuMouseEnter} onMouseLeave={handleMenuMouseLeave}>
                                <button
                                    onClick={handleMenuClick}
                                    className={`flex items-center gap-1.5 rounded-xl transition-all duration-200 cursor-pointer focus:outline-none border ${isFashion
                                        ? `bg-[#2d1810]/[0.06] border-[#d4c4a8]/40 text-[#4a3728] font-semibold hover:text-[#2d1810] hover:bg-[#2d1810]/[0.1] hover:border-[#c4a882]/50`
                                        : `bg-white/[0.06] border-transparent text-zinc-400 hover:text-white hover:bg-white/10 ${limeHover}`
                                        } ${shouldExpand ? 'px-4 py-2.5' : 'px-3 py-2'}`}
                                    aria-label="Menu"
                                    aria-expanded={menuOpen}
                                >
                                    <Menu size={shouldExpand ? 18 : 16} />
                                    <span className="hidden sm:inline text-sm font-semibold">Menu</span>
                                </button>
                                {menuOpen && (
                                    <div className={`absolute right-0 top-full mt-2 z-[100] w-52 rounded-xl border shadow-2xl py-2 animate-slide-in ${isFashion ? 'bg-[#faf5f0]/95 backdrop-blur-xl border-[#d4c4a8]/30 shadow-[#8B6914]/10' : 'bg-[#0d0f1a]/95 backdrop-blur-xl border-white/10 shadow-black/60'
                                        }`}>
                                        {menuItems.filter(item => item.show).map((item, index) => {
                                            const isLastAdmin = item.isAdmin && index === menuItems.filter(i => i.show).length - 1;
                                            return item.isAdmin ? (
                                                <Link
                                                    key={item.label}
                                                    href={item.path}
                                                    onClick={handleMenuLinkClick}
                                                    className="block mx-2 mt-2 mb-1"
                                                >
                                                    <span className={`flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-bold text-white rounded-xl transition shadow-lg cursor-pointer ${isFashion
                                                        ? 'bg-gradient-to-r from-[#8B6914] to-[#a07820] shadow-[#8B6914]/20'
                                                        : 'bg-gradient-to-r from-cyan-500 to-cyan-600 shadow-cyan-500/20'
                                                        }`}>
                                                        Admin
                                                    </span>
                                                </Link>
                                            ) : item.isProLink ? (
                                                <Link
                                                    key={item.label}
                                                    href={item.path}
                                                    onClick={handleMenuLinkClick}
                                                    className={`block flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold transition cursor-pointer rounded-lg mx-1 ${isPro
                                                        ? isFashion ? 'text-amber-700 bg-amber-400/30 border border-amber-500/50 hover:bg-amber-400/40' : 'text-amber-400 bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/15 hover:border-amber-500/30'
                                                        : isFashion ? 'text-amber-700 bg-amber-400/25 border border-amber-500/50 hover:bg-amber-400/35' : 'text-zinc-400 hover:bg-white/5 hover:text-white'
                                                        }`}
                                                >
                                                    <Crown size={15} className={isPro ? (isFashion ? "text-amber-700" : "text-amber-400") : isFashion ? "text-amber-700" : ""} />
                                                    {item.label}
                                                </Link>
                                            ) : (
                                                <Link
                                                    key={item.label}
                                                    href={item.path}
                                                    onClick={handleMenuLinkClick}
                                                    className={`block px-4 py-2.5 text-sm transition cursor-pointer rounded-lg mx-1 ${isFashion ? 'text-[#8B7355] hover:bg-[#8B6914]/[0.06] hover:text-[#2d1810]' : 'text-zinc-400 hover:bg-white/5 hover:text-white'
                                                        }`}
                                                >
                                                    {item.label}
                                                </Link>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* Login / Profile — positioned AFTER menu */}
                            {!isUserLoaded ? null : !user ? (
                                <button
                                    onClick={() => {
                                        // Only call openSignIn if user is definitely not signed in
                                        if (isUserLoaded && !user) {
                                            openSignIn();
                                        }
                                    }}
                                    className={`font-semibold text-white rounded-xl transition-all duration-200 cursor-pointer focus:outline-none ${shouldExpand ? 'px-5 py-2.5 text-sm' : 'px-4 py-2 text-sm'
                                        } ${isFashion
                                            ? 'bg-[#8B6914] hover:bg-[#7a5c12] shadow-[0_0_20px_-4px_rgba(139,105,20,0.3)]'
                                            : 'bg-cyan-500 hover:bg-cyan-400 shadow-[0_0_20px_-4px_rgba(6,182,212,0.4)] hover:shadow-[0_0_24px_-4px_rgba(163,230,53,0.3)]'
                                        }`}
                                >
                                    Login
                                </button>
                            ) : (
                                <div className="flex items-center gap-2">
                                    <div ref={userButtonRef} className="relative inline-block transition-all duration-500">
                                        <UserButton
                                            appearance={{
                                                elements: {
                                                    userButtonAvatarBox: shouldExpand
                                                        ? { width: '2.5rem', height: '2.5rem' }
                                                        : { width: '1.75rem', height: '1.75rem' },
                                                    userButtonPopoverCard: {
                                                        position: 'fixed',
                                                        zIndex: 9999,
                                                    },
                                                    userButtonPopover: {
                                                        position: 'fixed',
                                                        zIndex: 9999,
                                                    }
                                                }
                                            }}
                                        >
                                            <UserButton.MenuItems>
                                                <UserButton.Action labelIcon={<PackageIcon size={16} />} label="My Orders" onClick={() => router.push(isFashion ? '/orders?from=fashion' : '/orders')} />
                                                {(isSeller || isFashionSeller) && (
                                                    <UserButton.Action
                                                        labelIcon={<MessageCircle size={16} />}
                                                        label="Messages"
                                                        onClick={() => router.push(isFashion ? '/fashion/store/messages' : '/store/messages')}
                                                    />
                                                )}
                                            </UserButton.MenuItems>
                                        </UserButton>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
