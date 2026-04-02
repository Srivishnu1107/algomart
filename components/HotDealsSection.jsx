'use client'
import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useRef, useState } from 'react'

const HotDealsSection = () => {
    const currency = process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || '₹';
    
    const DEALS = [
        { title: 'Bank Offer', desc: '10% off on cards', badge: 'HDFC', cta: 'View Offer', gradient: 'from-amber-900/50 to-orange-900/40' },
        { title: 'No Cost EMI', desc: `On orders above ${currency}99`, badge: 'EMI', cta: 'View Offer', gradient: 'from-teal-900/50 to-cyan-900/40' },
        { title: 'Exchange Offer', desc: `Up to ${currency}50 off`, badge: 'Exchange', cta: 'View Offer', gradient: 'from-violet-900/50 to-purple-900/40' },
    ];
    const scrollRef = useRef(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(true);

    const scroll = (dir) => {
        if (!scrollRef.current) return;
        scrollRef.current.scrollBy({ left: dir * 320, behavior: 'smooth' });
        setTimeout(() => {
            if (!scrollRef.current) return;
            const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
            setCanScrollLeft(scrollLeft > 0);
            setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
        }, 300);
    };

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-zinc-100">Hot Deals & Bank Offers</h2>
                <div className="flex gap-1">
                    <button type="button" onClick={() => scroll(-1)} disabled={!canScrollLeft} className="w-9 h-9 flex items-center justify-center rounded-xl bg-zinc-800/80 border border-zinc-700/80 text-zinc-400 hover:text-white hover:bg-zinc-700/80 hover:border-teal-500/40 disabled:opacity-40 disabled:cursor-not-allowed transition">
                        <ChevronLeft size={20} />
                    </button>
                    <button type="button" onClick={() => scroll(1)} disabled={!canScrollRight} className="w-9 h-9 flex items-center justify-center rounded-xl bg-zinc-800/80 border border-zinc-700/80 text-zinc-400 hover:text-white hover:bg-zinc-700/80 hover:border-teal-500/40 disabled:opacity-40 disabled:cursor-not-allowed transition">
                        <ChevronRight size={20} />
                    </button>
                </div>
            </div>
            <div ref={scrollRef} onScroll={() => { if (scrollRef.current) { const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current; setCanScrollLeft(scrollLeft > 0); setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10); } }} className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
                {DEALS.map((deal, i) => (
                    <div
                        key={i}
                        className={`flex-shrink-0 w-72 sm:w-80 rounded-xl border border-zinc-700/60 bg-gradient-to-br ${deal.gradient} p-5 hover:border-teal-500/50 hover:shadow-xl hover:shadow-teal-500/5 transition group`}
                    >
                        <span className="inline-block px-2.5 py-1 text-xs font-semibold rounded-lg bg-teal-500/20 text-teal-400 border border-teal-500/30 mb-3">
                            {deal.badge}
                        </span>
                        <h3 className="text-base font-semibold text-white mb-1">{deal.title}</h3>
                        <p className="text-sm text-zinc-400 mb-4">{deal.desc}</p>
                        <Link
                            href="/shop"
                            className="inline-flex items-center gap-1.5 text-sm font-semibold text-teal-400 hover:text-teal-300 transition"
                        >
                            {deal.cta}
                            <ChevronRight size={16} />
                        </Link>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default HotDealsSection;
