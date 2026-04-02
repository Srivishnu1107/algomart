'use client'
import { useUser, UserButton } from "@clerk/nextjs"
import Link from "next/link"
import { usePathname } from "next/navigation"
import Image from "next/image"
import { HomeIcon, LayoutListIcon, SquarePenIcon, SquarePlusIcon, SparklesIcon, ImageIcon } from "lucide-react"

const StoreNavbar = ({ storeInfo }) => {

    const { user } = useUser()
    const pathname = usePathname()
    const isFashion = pathname?.startsWith('/fashion')
    const basePath = isFashion ? '/fashion/store' : '/store'
    const homePath = isFashion ? '/fashion' : '/'
    const accentText = isFashion ? 'text-pink-400' : 'text-teal-400'
    const accentBg = isFashion ? 'bg-pink-400' : 'bg-teal-400'
    const accentHover = isFashion ? 'hover:bg-pink-300' : 'hover:bg-teal-300'
    const accentShadow = isFashion ? 'shadow-pink-500/20' : 'shadow-teal-500/20'
    const accentBorder = isFashion ? 'border-pink-500/60' : 'border-teal-500/60'

    const navLinks = [
        { name: 'Dashboard', href: basePath, icon: HomeIcon },
        { name: 'AI Insights', href: `${basePath}/ai-insights`, icon: SparklesIcon },
        { name: 'Add Product', href: `${basePath}/add-product`, icon: SquarePlusIcon },
        { name: 'Manage Product', href: `${basePath}/manage-product`, icon: SquarePenIcon },
        { name: 'Orders', href: `${basePath}/orders`, icon: LayoutListIcon },
        { name: 'Home Page Banner', href: `${basePath}/home-banner`, icon: ImageIcon },
    ]

    return (
        <div className="flex items-center justify-between px-4 sm:px-8 lg:px-12 py-3 border-b border-zinc-700/60 bg-zinc-900/60 backdrop-blur-sm transition-all">
            {/* Left: Logo + Store Info */}
            <div className="flex items-center gap-4">
                <Link href={basePath} className="relative text-2xl sm:text-4xl font-semibold text-zinc-200">
                    <span className={accentText}>go</span>cart<span className={`${accentText} text-3xl sm:text-5xl leading-0`}>.</span>
                    <p className={`absolute text-xs font-semibold -top-1 -right-11 px-3 p-0.5 rounded-full flex items-center gap-2 ${isFashion ? 'text-white' : 'text-zinc-900'} ${accentBg}`}>
                        Store
                    </p>
                </Link>

            </div>

            {/* Mobile Nav Links */}
            <div className="flex lg:hidden items-center gap-0.5 overflow-x-auto no-scrollbar">
                {navLinks.map((link, index) => (
                    <Link
                        key={index}
                        href={link.href}
                        className={`flex items-center gap-1.5 px-2.5 py-2 text-xs font-medium rounded-lg transition-all whitespace-nowrap ${pathname === link.href
                            ? `${accentText} bg-zinc-800`
                            : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/80'
                            }`}
                    >
                        <link.icon size={14} />
                        <span className="hidden sm:inline">{link.name}</span>
                    </Link>
                ))}
            </div>

            {/* Right: Home + User */}
            <div className="flex items-center gap-3 text-zinc-300">
                <Link
                    href={homePath}
                    className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl transition shadow-lg ${isFashion ? 'text-white' : 'text-zinc-900'} ${accentBg} ${accentHover} ${accentShadow}`}
                >
                    Home
                </Link>
                <p className="text-sm hidden sm:block">Hi, {user?.firstName}</p>
                <UserButton />
            </div>
        </div>
    )
}

export default StoreNavbar
