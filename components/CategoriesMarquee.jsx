'use client'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, Sparkles, Image, Code, Brain, Eye, Mic, Zap } from "lucide-react";
import { useState, useRef, useMemo } from 'react'
import { useSelector } from 'react-redux'
import { motion } from 'framer-motion'
import { getElectronicsProducts } from '@/lib/homeProductFilters'

const CATEGORY_CONFIG = {
    'Chat Models': { label: 'Chat Models', path: '/models?category=chat', icon: Sparkles },
    'Image Generation': { label: 'Image Generation', path: '/models?category=image', icon: Image },
    'Code Models': { label: 'Code Models', path: '/models?category=code', icon: Code },
    'NLP': { label: 'NLP', path: '/models?category=nlp', icon: Brain },
    'Generative AI': { label: 'Generative AI', path: '/models?category=genai', icon: Sparkles },
    'Vision': { label: 'Vision', path: '/models?category=vision', icon: Eye },
    'Audio AI': { label: 'Audio AI', path: '/models?category=audio', icon: Mic },
    'Automation': { label: 'Automation', path: '/models?category=automation', icon: Zap },
};

const CategoriesMarquee = () => {
    const products = useSelector(state => state.product.list)
    const scrollRef = useRef(null);

    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(true);

    // 🔥 DRAG STATE
    const isDown = useRef(false);
    const startX = useRef(0);
    const scrollLeft = useRef(0);

    const categories = useMemo(() => {
        const electronicsProducts = getElectronicsProducts(products)

        const categoryCounts = {}
        electronicsProducts.forEach(product => {
            let category = product.category || ''
            if (category) {
                if (category === 'Watches') category = 'Watch'
                if (['Headphones', 'Earbuds', 'Earphones'].includes(category)) {
                    category = 'Earbuds and Headphones'
                }
                if (category === 'Appliances') category = 'Tablets'

                categoryCounts[category] = (categoryCounts[category] || 0) + 1
            }
        })

        return Object.keys(CATEGORY_CONFIG).map(key => ({
            name: key,
            count: categoryCounts[key] || 0,
            config: CATEGORY_CONFIG[key]
        }))
    }, [products])

    // 🔥 SCROLL BUTTON
    const scroll = (dir) => {
        if (!scrollRef.current) return;

        const cardWidth = 160;
        scrollRef.current.scrollBy({
            left: dir * cardWidth,
            behavior: 'smooth',
        });

        setTimeout(updateScrollState, 300);
    };

    const updateScrollState = () => {
        if (!scrollRef.current) return;
        const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
        setCanScrollLeft(scrollLeft > 0);
        setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    };

    // 🔥 DRAG HANDLERS
    const handleMouseDown = (e) => {
        isDown.current = true;
        startX.current = e.pageX - scrollRef.current.offsetLeft;
        scrollLeft.current = scrollRef.current.scrollLeft;
    };

    const handleMouseLeave = () => {
        isDown.current = false;
    };

    const handleMouseUp = () => {
        isDown.current = false;
    };

    const handleMouseMove = (e) => {
        if (!isDown.current) return;
        e.preventDefault();
        const x = e.pageX - scrollRef.current.offsetLeft;
        const walk = (x - startX.current) * 1.5;
        scrollRef.current.scrollLeft = scrollLeft.current - walk;
    };

    return (
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-10">

            {/* 🔥 HEADING */}
            <motion.div
                className="mb-6"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
            >
                <h2 className="text-xl sm:text-2xl font-semibold text-zinc-100 mb-6">
                     Explore AI Categories
                </h2>
            </motion.div>

            <div className="relative flex items-center">

                {/* Fade left */}
                {canScrollLeft && (
                    <div className="absolute left-0 top-0 bottom-0 w-12 sm:w-20 bg-gradient-to-r from-[#0a0a0b] to-transparent z-[5]" />
                )}

                {/* Fade right */}
                {canScrollRight && (
                    <div className="absolute right-0 top-0 bottom-0 w-12 sm:w-20 bg-gradient-to-l from-[#0a0a0b] to-transparent z-[5]" />
                )}

                {/* LEFT BUTTON */}
                <button
                    onClick={() => scroll(-1)}
                    disabled={!canScrollLeft}
                    className="absolute left-0 top-1/2 -translate-y-1/2 z-10 text-zinc-400 hover:text-white disabled:opacity-30 -translate-x-full pr-4"
                >
                    <ChevronLeft size={50} />
                </button>

                {/* 🔥 SCROLL CONTAINER */}
                <div
                    ref={scrollRef}
                    onScroll={updateScrollState}
                    onMouseDown={handleMouseDown}
                    onMouseLeave={handleMouseLeave}
                    onMouseUp={handleMouseUp}
                    onMouseMove={handleMouseMove}
                    className="flex gap-4 overflow-x-auto no-scrollbar scroll-smooth snap-x snap-mandatory w-full cursor-grab active:cursor-grabbing pb-2"
                >

                    {categories.map((cat) => {
                        const Icon = cat.config.icon;
                        return (
                            <Link
                                key={cat.name}
                                href={cat.config.path}
                                className="flex-shrink-0 min-w-[140px] h-[130px] snap-start flex flex-col items-center justify-center gap-2 p-3 rounded-2xl bg-gradient-to-br from-slate-900 via-blue-950/50 to-purple-950/40 border border-slate-700/50 hover:border-slate-600 hover:scale-[1.05] transition-all duration-300"
                            >
                                <Icon className="w-10 h-10 text-white" />
                                <span className="text-xs text-white text-center">
                                    {cat.config.label}
                                </span>
                            </Link>
                        );
                    })}

                </div>

                {/* RIGHT BUTTON */}
                <button
                    onClick={() => scroll(1)}
                    disabled={!canScrollRight}
                    className="absolute right-0 top-1/2 -translate-y-1/2 z-10 text-zinc-400 hover:text-white disabled:opacity-30 translate-x-full pl-4"
                >
                    <ChevronRight size={50} />
                </button>

            </div>
        </div>
    );
};

export default CategoriesMarquee;