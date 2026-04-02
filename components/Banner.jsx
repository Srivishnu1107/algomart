'use client'
import React from 'react'
import { usePathname } from 'next/navigation';
import toast from 'react-hot-toast';

export default function Banner() {

    const [isOpen, setIsOpen] = React.useState(true);
    const pathname = usePathname();
    const isFashion = pathname?.startsWith('/fashion');

    const handleClaim = () => {
        setIsOpen(false);
        toast.success('Coupon copied to clipboard!');
        navigator.clipboard.writeText('NEW20');
    };

    return isOpen && (
        <div className={`w-full px-6 py-2.5 font-medium text-sm text-zinc-100 text-center border-b backdrop-blur-sm ${
            isFashion
                ? 'bg-gradient-to-r from-[#7a5c12]/90 via-[#6a4f10]/80 to-[#7a5c12]/90 border-[#8B6914]/30'
                : 'bg-gradient-to-r from-teal-800/90 via-cyan-900/80 to-teal-800/90 border-teal-500/30'
        }`}>
            <div className='flex items-center justify-between max-w-7xl mx-auto'>
                <p>Get 20% OFF on Your First Order!</p>
                <div className="flex items-center gap-4">
                    <button onClick={handleClaim} type="button" className={`font-semibold text-zinc-900 px-5 py-2 rounded-xl max-sm:hidden transition shadow-lg ${
                        isFashion ? 'bg-pink-400 hover:bg-pink-300 shadow-pink-500/20' : 'bg-teal-400 hover:bg-teal-300 shadow-teal-500/20'
                    }`}>Claim Offer</button>
                    <button onClick={() => setIsOpen(false)} type="button" className="text-zinc-300 hover:text-white p-1 rounded-lg transition">
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <rect y="12.532" width="17.498" height="2.1" rx="1.05" transform="rotate(-45.74 0 12.532)" fill="currentColor" />
                            <rect x="12.533" y="13.915" width="17.498" height="2.1" rx="1.05" transform="rotate(-135.74 12.533 13.915)" fill="currentColor" />
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    );
};
