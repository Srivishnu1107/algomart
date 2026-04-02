'use client'
import { usePathname } from "next/navigation"
import { HomeIcon, LayoutListIcon, SquarePenIcon, SquarePlusIcon, ImageIcon } from "lucide-react"
import Image from "next/image"
import Link from "next/link"

const StoreSidebar = ({storeInfo, basePath, isFashion}) => {

    const pathname = usePathname()
    const resolvedBasePath = basePath || (pathname?.startsWith('/fashion') ? '/fashion/store' : '/store')
    const accentText = isFashion ? 'text-pink-400' : 'text-teal-400'
    const accentBar = isFashion ? 'bg-pink-500' : 'bg-teal-500'

    const sidebarLinks = [
        { name: 'Dashboard', href: resolvedBasePath, icon: HomeIcon },
        { name: 'Add Product', href: `${resolvedBasePath}/add-product`, icon: SquarePlusIcon },
        { name: 'Manage Product', href: `${resolvedBasePath}/manage-product`, icon: SquarePenIcon },
        { name: 'Orders', href: `${resolvedBasePath}/orders`, icon: LayoutListIcon },
        { name: 'Home Page Banner', href: `${resolvedBasePath}/home-banner`, icon: ImageIcon },
    ]

    return (
        <div className="inline-flex h-full flex-col gap-5 border-r border-zinc-700/60 sm:min-w-60 bg-zinc-900/40">
            <div className="flex flex-col gap-3 justify-center items-center pt-8 max-sm:hidden">
                <Image className="w-14 h-14 rounded-full shadow-md border border-zinc-700" src={storeInfo?.logo} alt="" width={80} height={80} />
                <p className="text-zinc-200 font-medium">{storeInfo?.name}</p>
            </div>

            <div className="max-sm:mt-6">
                {
                    sidebarLinks.map((link, index) => (
                        <Link key={index} href={link.href} className={`relative flex items-center gap-3 text-zinc-400 hover:bg-zinc-800/80 hover:text-zinc-200 p-2.5 transition rounded-r-lg sm:mx-2 ${pathname === link.href && `bg-zinc-800 ${accentText}`}`}>
                            <link.icon size={18} className="sm:ml-5" />
                            <p className="max-sm:hidden">{link.name}</p>
                            {pathname === link.href && <span className={`absolute ${accentBar} right-0 top-1.5 bottom-1.5 w-1 sm:w-1.5 rounded-l`}></span>}
                        </Link>
                    ))
                }
            </div>
        </div>
    )
}

export default StoreSidebar
