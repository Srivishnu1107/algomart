'use client'

import { usePathname } from "next/navigation"
import { Bot, HomeIcon, ShieldCheckIcon, StoreIcon, TicketPercentIcon, Flag } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useUser } from "@clerk/nextjs"

const AdminSidebar = () => {

    const { user } = useUser()

    const pathname = usePathname()

    const sidebarLinks = [
        { name: 'Dashboard', href: '/admin', icon: HomeIcon },
        { name: 'Stores', href: '/admin/stores', icon: StoreIcon },
        { name: 'Approve Store', href: '/admin/approve', icon: ShieldCheckIcon },
        { name: 'Reports', href: '/admin/reports', icon: Flag },
        { name: 'Coupons', href: '/admin/coupons', icon: TicketPercentIcon },
        { name: 'AI Assistant', href: '/admin/assistant', icon: Bot },
    ]

    return user && (
        <div className="inline-flex h-full flex-col gap-5 border-r border-zinc-700/60 sm:min-w-60 bg-zinc-900/40">
            <div className="flex flex-col gap-3 justify-center items-center pt-8 max-sm:hidden">
                <Image className="w-14 h-14 rounded-full border border-zinc-700" src={user.imageUrl} alt="" width={80} height={80} />
                <p className="text-zinc-200">{user.fullName}</p>
            </div>

            <div className="max-sm:mt-6">
                {sidebarLinks.map((link, index) => (
                    <Link
                        key={index}
                        href={link.href}
                        className={`relative flex items-center gap-3 text-zinc-400 hover:bg-zinc-800/80 hover:text-zinc-200 p-2.5 transition rounded-r-lg sm:mx-2 ${
                            pathname === link.href && 'bg-zinc-800 text-emerald-400'
                        }`}
                    >
                        <link.icon size={18} className="sm:ml-5" />
                        <p className="max-sm:hidden">{link.name}</p>
                        {pathname === link.href && (
                            <span className="absolute bg-emerald-500 right-0 top-1.5 bottom-1.5 w-1 sm:w-1.5 rounded-l"></span>
                        )}
                    </Link>
                ))}
            </div>
        </div>
    )
}

export default AdminSidebar