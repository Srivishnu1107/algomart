'use client'
import { useEffect, useState } from "react"
import Loading from "../Loading"
import Link from "next/link"
import { ArrowRightIcon, Bot, HomeIcon, ShieldCheckIcon, StoreIcon, TicketPercentIcon, Flag, Zap, ImageIcon } from "lucide-react"
import AdminNavbar from "./AdminNavbar"
import { useUser, useAuth } from "@clerk/nextjs"
import { usePathname } from "next/navigation"
import axios from "axios"

const sidebarLinks = [
    { name: 'Dashboard', href: '/admin', icon: HomeIcon },
    { name: 'Stores', href: '/admin/stores', icon: StoreIcon },
    { name: 'Approve Store', href: '/admin/approve', icon: ShieldCheckIcon },
    { name: 'Reports', href: '/admin/reports', icon: Flag },
    { name: 'Coupons', href: '/admin/coupons', icon: TicketPercentIcon },
    { name: 'Deals of the Day', href: '/admin/deals', icon: Zap },
    { name: 'Banners', href: '/admin/banners', icon: ImageIcon },
    { name: 'AI Assistant', href: '/admin/assistant', icon: Bot },
]

const AdminLayout = ({ children }) => {

    const { user } = useUser()
    const { getToken } = useAuth()
    const pathname = usePathname()

    const [isAdmin, setIsAdmin] = useState(false)
    const [loading, setLoading] = useState(true)
    const [sidebarExpanded, setSidebarExpanded] = useState(false)

    const fetchIsAdmin = async () => {
        try {
            const token = await getToken()
            const { data } = await axios.get('/api/admin/is-admin', { headers: { Authorization: `Bearer ${token}` } })
            setIsAdmin(data.isAdmin)
        } catch (error) {
            console.log(error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (user) {
            fetchIsAdmin()
        }
    }, [user])

    return loading ? (
        <Loading />
    ) : isAdmin ? (
        <div className="flex flex-col h-screen bg-[#0a0a0b]">
            <AdminNavbar />
            <div className="flex flex-1 overflow-hidden">
                {/* Collapsible Sidebar - Card Style */}
                <div
                    className="relative flex-shrink-0 z-20 flex flex-col gap-3 py-4 pl-4 pr-2 transition-all duration-300 ease-in-out"
                    style={{ width: sidebarExpanded ? '240px' : '88px' }}
                    onMouseEnter={() => setSidebarExpanded(true)}
                    onMouseLeave={() => setSidebarExpanded(false)}
                >
                    {sidebarLinks.map((link, index) => (
                        <Link
                            key={index}
                            href={link.href}
                            className={`flex items-center gap-4 p-3 rounded-2xl border transition-all duration-300 group ${pathname === link.href
                                ? 'bg-zinc-800/80 border-amber-500/50 shadow-lg shadow-amber-500/10'
                                : 'bg-zinc-900/40 border-zinc-800/60 hover:bg-zinc-800 hover:border-zinc-700'
                                }`}
                            title={!sidebarExpanded ? link.name : undefined}
                        >
                            <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 ${pathname === link.href
                                ? 'bg-amber-400 text-zinc-900 shadow-md shadow-amber-500/20'
                                : 'bg-zinc-800 text-zinc-400 group-hover:text-zinc-200 group-hover:bg-zinc-700'
                                }`}>
                                <link.icon size={20} />
                            </div>
                            <span
                                className={`text-sm font-semibold whitespace-nowrap overflow-hidden transition-all duration-500 ${sidebarExpanded ? 'opacity-100 max-w-[200px]' : 'opacity-0 max-w-0'
                                    } ${pathname === link.href ? 'text-amber-400' : 'text-zinc-400 group-hover:text-zinc-200'}`}
                            >
                                {link.name}
                            </span>
                        </Link>
                    ))}
                </div>

                {/* Content */}
                <div className="flex-1 h-full overflow-y-auto bg-[#0a0a0b]">
                    {children}
                </div>
            </div>
        </div>
    ) : (
        <div className="min-h-screen flex flex-col items-center justify-center text-center px-6 bg-[#0a0a0b]">
            <h1 className="text-2xl sm:text-4xl font-semibold text-zinc-400">You are not authorized to access this page</h1>
            <Link href="/" className="bg-zinc-700 text-zinc-100 hover:bg-zinc-600 flex items-center gap-2 mt-8 p-2 px-6 max-sm:text-sm rounded-full transition">
                Go to home <ArrowRightIcon size={18} />
            </Link>
        </div>
    )
}

export default AdminLayout