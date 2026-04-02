'use client'
import { ArrowRight } from 'lucide-react'
import Link from 'next/link'
import React from 'react'

const Title = ({ title, description, visibleButton = true, href = '' }) => {
    return (
        <div className="flex flex-col items-center text-center">
            <h2 className="text-xl sm:text-2xl font-semibold text-zinc-100">{title}</h2>
            <Link href={href} className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 text-sm text-zinc-400 mt-2">
                <p className="max-w-lg">{description}</p>
                {visibleButton && (
                    <span className="text-teal-400 flex items-center gap-1 font-semibold hover:text-teal-300 transition">
                        View more <ArrowRight size={14} />
                    </span>
                )}
            </Link>
        </div>
    );
};

export default Title;
