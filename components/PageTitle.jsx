'use client'
import { ArrowRightIcon } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const PageTitle = ({ heading, text, path = "/", linkText, isFashion: propIsFashion = false }) => {
    const pathname = usePathname();
    const isFashion = propIsFashion || pathname?.includes('/fashion');
    
    return (
        <div className="my-6">
            <h2 className={`text-2xl font-semibold ${isFashion ? 'text-[#2d1810]' : 'text-zinc-100'}`}>{heading}</h2>
            <div className="flex items-center gap-3 mt-1">
                <p className={isFashion ? 'text-[#8B7355]' : 'text-zinc-500'}>{text}</p>
                <Link href={path} className={`flex items-center gap-1 text-sm font-medium transition ${isFashion ? 'text-[#8B6914] hover:text-[#7a5c12]' : 'text-teal-400 hover:text-teal-300'}`}>
                    {linkText} <ArrowRightIcon size={14} />
                </Link>
            </div>
        </div>
    )
}

export default PageTitle