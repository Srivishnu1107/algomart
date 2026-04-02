'use client'
import { useEffect, useState } from "react"
import Loading from "../Loading"
import Link from "next/link"
import Image from "next/image"
import { ArrowRightIcon, HomeIcon, SquarePlusIcon, SquarePenIcon, LayoutListIcon, SparklesIcon, ImageIcon } from "lucide-react"
import SellerNavbar from "./StoreNavbar"
import { useAuth } from "@clerk/nextjs"
import { usePathname } from "next/navigation"
import axios from "axios"

const StoreLayout = ({ children }) => {

    const { getToken } = useAuth()
    const pathname = usePathname()
    const isFashion = pathname?.startsWith('/fashion')
    const storeType = isFashion ? 'fashion' : 'electronics'
    const homePath = isFashion ? '/fashion' : '/'
    const basePath = isFashion ? '/fashion/store' : '/store'

    const accentText = isFashion ? 'text-pink-400' : 'text-teal-400'
    const accentBg = isFashion ? 'bg-pink-400' : 'bg-teal-400'
    const accentBorder = isFashion ? 'border-pink-500/50' : 'border-teal-500/50'
    const accentShadow = isFashion ? 'shadow-pink-500/10' : 'shadow-teal-500/10'

    const sidebarLinks = [
        { name: 'Dashboard', href: basePath, icon: HomeIcon },
        { name: 'AI Insights', href: `${basePath}/ai-insights`, icon: SparklesIcon },
        { name: 'Add Product', href: `${basePath}/add-product`, icon: SquarePlusIcon },
        { name: 'Manage Product', href: `${basePath}/manage-product`, icon: SquarePenIcon },
        { name: 'Orders', href: `${basePath}/orders`, icon: LayoutListIcon },
        { name: 'Home Page Banner', href: `${basePath}/home-banner`, icon: ImageIcon },
    ]

    const [isSeller, setIsSeller] = useState(false)
    const [loading, setLoading] = useState(true)
    const [storeInfo, setStoreInfo] = useState(null)
    const [sidebarExpanded, setSidebarExpanded] = useState(false)

    const fetchIsSeller = async () => {
        try {
            const token = await getToken()
            const { data } = await axios.get(`/api/store/is-seller?type=${storeType}`, { headers: { Authorization: `Bearer ${token}` } })
            setIsSeller(data.isSeller)
            setStoreInfo(data.storeInfo)
        } catch (error) {
            console.log(error)
        }
        finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchIsSeller()
    }, [storeType])

    return loading ? (
        <Loading />
    ) : isSeller ? (
        <div className="flex flex-col h-screen bg-[#0a0a0b]">
            <SellerNavbar storeInfo={storeInfo} />
            <div className="flex flex-1 overflow-hidden">
                {/* Sidebar */}
                <div
                    className="relative flex-shrink-0 z-20 flex flex-col gap-3 py-4 pl-4 pr-2 transition-all duration-300 ease-in-out hidden lg:flex"
                    style={{ width: sidebarExpanded ? '240px' : '88px' }}
                    onMouseEnter={() => setSidebarExpanded(true)}
                    onMouseLeave={() => setSidebarExpanded(false)}
                >
                    {/* Store Logo & Name */}
                    {storeInfo && (
                        <div className="mb-2 px-1 flex items-center gap-3 overflow-hidden">
                            <div className={`flex-shrink-0 w-12 h-12 rounded-full border border-zinc-800 bg-zinc-900 flex items-center justify-center overflow-hidden transition-all duration-300 ${sidebarExpanded ? '' : 'mx-auto'}`}>
                                {storeInfo.logo ? (
                                    <Image src={storeInfo.logo} alt={storeInfo.name} width={48} height={48} className="object-cover w-full h-full rounded-full" />
                                ) : (
                                    <div className={`text-lg font-bold ${accentText}`}>{storeInfo.name.charAt(0)}</div>
                                )}
                            </div>
                            <div className={`flex flex-col transition-opacity duration-300 ${sidebarExpanded ? 'opacity-100' : 'opacity-0 w-0'}`}>
                                <h2 className="text-sm font-bold text-zinc-100 truncate max-w-[140px]">{storeInfo.name}</h2>
                                <p className={`text-[10px] uppercase font-semibold ${accentText}`}>{storeType}</p>
                            </div>
                        </div>
                    )}

                    {/* Divider */}
                    <div className="h-px bg-zinc-800/50 mx-2 mb-2" />

                    {/* Navigation Links */}
                    <div className="flex flex-col gap-3 flex-1 overflow-y-auto">
                        {sidebarLinks.map((link, index) => (
                            <Link
                                key={index}
                                href={link.href}
                                className={`flex items-center gap-4 p-3 rounded-2xl border transition-all duration-300 group ${pathname === link.href || (link.href !== basePath && pathname?.startsWith(link.href))
                                    ? `bg-zinc-800/80 ${accentBorder} shadow-lg ${accentShadow}`
                                    : 'bg-zinc-900/40 border-zinc-800/60 hover:bg-zinc-800 hover:border-zinc-700'
                                    }`}
                                title={!sidebarExpanded ? link.name : undefined}
                            >
                                <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 ${pathname === link.href || (link.href !== basePath && pathname?.startsWith(link.href))
                                    ? `${accentBg} ${isFashion ? 'text-white' : 'text-zinc-900'} shadow-md ${accentShadow}`
                                    : 'bg-zinc-800 text-zinc-400 group-hover:text-zinc-200 group-hover:bg-zinc-700'
                                    }`}>
                                    <link.icon size={20} />
                                </div>
                                <span
                                    className={`text-sm font-semibold whitespace-nowrap overflow-hidden transition-all duration-500 ${sidebarExpanded ? 'opacity-100 max-w-[200px]' : 'opacity-0 max-w-0'
                                        } ${pathname === link.href || (link.href !== basePath && pathname?.startsWith(link.href)) ? accentText : 'text-zinc-400 group-hover:text-zinc-200'}`}
                                >
                                    {link.name}
                                </span>
                            </Link>
                        ))}
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 h-full overflow-y-auto bg-[#0a0a0b] p-5 lg:px-8 lg:pt-8">
                    {children}
                </div>
            </div>
        </div>
    ) : (
        <div className="min-h-screen flex flex-col items-center justify-center text-center px-6 bg-[#0a0a0b]">
            <h1 className="text-2xl sm:text-4xl font-semibold text-zinc-400">You are not authorized to access this page</h1>
            <Link href={homePath} className="bg-zinc-700 text-zinc-100 hover:bg-zinc-600 flex items-center gap-2 mt-8 p-2 px-6 max-sm:text-sm rounded-full transition">
                Go to home <ArrowRightIcon size={18} />
            </Link>
        </div>
    )
}

export default StoreLayout
