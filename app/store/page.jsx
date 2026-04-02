'use client'
import Loading from "@/components/Loading"
import { useAuth } from "@clerk/nextjs"
import axios from "axios"
import {
    CircleDollarSignIcon,
    ShoppingBasketIcon,
    StarIcon,
    TagsIcon,
    RefreshCw,
    XCircle,
    TrendingUp,
    Activity,
} from "lucide-react"
import { usePathname } from "next/navigation"
import { useEffect, useState, useMemo } from "react"
import toast from "react-hot-toast"
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from 'recharts'

const currency = process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || '₹'

export default function Dashboard() {
    const { getToken } = useAuth()
    const pathname = usePathname()
    const isFashion = pathname?.startsWith('/fashion')
    const dashboardParam = isFashion ? '?type=fashion' : ''
    const accentText = isFashion ? 'text-pink-400' : 'text-teal-400'
    const [loading, setLoading] = useState(true)
    const [earningsViewMode, setEarningsViewMode] = useState('daily')
    const [dashboardData, setDashboardData] = useState({
        totalProducts: 0,
        totalEarnings: 0,
        totalOrders: 0,
        ratings: [],
        refundRate: 0,
        cancellationRate: 0,
        netEarnings: 0,
        storeHealthScore: 0,
        earningsTrendDaily: [],
        earningsTrendWeekly: [],
        topCategories: [],
        topProducts: [],
        revenueBreakdown: {
            grossRevenue: 0,
            commissionDeducted: 0,
            refundLoss: 0,
            netEarnings: 0
        }
    })

    const dashboardCardsData = [
        { title: 'Total Products', value: dashboardData.totalProducts, icon: ShoppingBasketIcon },
        { title: 'Total Earnings', value: currency + dashboardData.totalEarnings.toLocaleString(), icon: CircleDollarSignIcon },
        { title: 'Total Orders', value: dashboardData.totalOrders, icon: TagsIcon },
        { title: 'Total Ratings', value: dashboardData.ratings.length, icon: StarIcon },
        { title: 'Refund Rate %', value: `${dashboardData.refundRate.toFixed(1)}%`, icon: RefreshCw, isBad: dashboardData.refundRate > 5 },
        { title: 'Cancellation Rate %', value: `${dashboardData.cancellationRate.toFixed(1)}%`, icon: XCircle, isBad: dashboardData.cancellationRate > 10 },
        { title: 'Net Earnings', value: currency + dashboardData.netEarnings.toLocaleString(), icon: TrendingUp },
        { title: 'Store Health Score', value: `${dashboardData.storeHealthScore}/100`, icon: Activity, isScore: true },
    ]

    const earningsChartData = useMemo(() => {
        const trend = earningsViewMode === 'daily' 
            ? dashboardData.earningsTrendDaily 
            : dashboardData.earningsTrendWeekly
        return trend || []
    }, [earningsViewMode, dashboardData.earningsTrendDaily, dashboardData.earningsTrendWeekly])

    const fetchDashboardData = async () => {
        try {
            const token = await getToken()
            const { data } = await axios.get(`/api/store/dashboard${dashboardParam}`, { headers: { Authorization: `Bearer ${token}` } })
            setDashboardData(data.dashboardData)
        } catch (error) {
            toast.error(error?.response?.data?.error || error.message)
        }
        setLoading(false)
    }

    useEffect(() => {
        fetchDashboardData()
    }, [])

    if (loading) return <Loading />

    return (
        <div className="min-h-full pb-12">
            <h1 className="text-2xl sm:text-3xl font-bold text-zinc-100 mb-1">
                Seller <span className={accentText}>Dashboard</span>
            </h1>
            <p className="text-sm text-zinc-500 mb-8">Monitor your store performance and AI-powered insights</p>

            {/* KPI Cards - 8 total */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
                {dashboardCardsData.map((card, index) => (
                    <div
                        key={index}
                        className={`flex items-center gap-4 p-5 rounded-xl bg-zinc-900/80 border transition-all ${
                            card.isBad 
                                ? 'border-red-500/40 hover:border-red-500/60' 
                                : card.isScore && dashboardData.storeHealthScore >= 80
                                ? 'border-green-500/40 hover:border-green-500/60'
                                : card.isScore && dashboardData.storeHealthScore >= 60
                                ? 'border-yellow-500/40 hover:border-yellow-500/60'
                                : 'border-zinc-700/60 hover:border-zinc-600/80'
                        }`}
                    >
                        <div className={`flex-shrink-0 w-12 h-12 rounded-xl bg-zinc-800 flex items-center justify-center ${
                            card.isBad ? 'bg-red-500/10' : card.isScore && dashboardData.storeHealthScore >= 80 ? 'bg-green-500/10' : ''
                        }`}>
                            <card.icon size={24} className={
                                card.isBad 
                                    ? 'text-red-400' 
                                    : card.isScore && dashboardData.storeHealthScore >= 80
                                    ? 'text-green-400'
                                    : card.isScore && dashboardData.storeHealthScore >= 60
                                    ? 'text-yellow-400'
                                    : accentText
                            } />
                        </div>
                        <div>
                            <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">{card.title}</p>
                            <p className={`text-xl font-bold mt-0.5 ${
                                card.isBad 
                                    ? 'text-red-400' 
                                    : card.isScore && dashboardData.storeHealthScore >= 80
                                    ? 'text-green-400'
                                    : card.isScore && dashboardData.storeHealthScore >= 60
                                    ? 'text-yellow-400'
                                    : 'text-white'
                            }`}>{card.value}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Earnings Over Time Chart */}
            <div className="rounded-2xl border border-zinc-700/60 bg-gradient-to-br from-zinc-900/80 via-zinc-900/60 to-zinc-900/80 shadow-lg p-6 mb-10">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-lg font-semibold text-white mb-1">Earnings Over Time</h2>
                        <p className="text-sm text-zinc-500">Track your revenue and net earnings</p>
                    </div>
                    <div className="flex items-center gap-2 bg-zinc-800/80 rounded-xl p-1 border border-zinc-700/50">
                        {['daily', 'weekly'].map(mode => (
                            <button
                                key={mode}
                                onClick={() => setEarningsViewMode(mode)}
                                className={`px-4 py-1.5 text-xs font-medium uppercase tracking-wider rounded-lg transition-all ${
                                    earningsViewMode === mode
                                        ? isFashion 
                                            ? 'bg-pink-500/20 text-pink-400'
                                            : 'bg-teal-500/20 text-teal-400'
                                        : 'text-zinc-500 hover:text-zinc-300'
                                }`}
                            >
                                {mode}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="h-80 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={earningsChartData}>
                            <defs>
                                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor={isFashion ? "#ec4899" : "#14b8a6"} stopOpacity={0.4} />
                                    <stop offset="100%" stopColor={isFashion ? "#ec4899" : "#14b8a6"} stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="colorNet" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor={isFashion ? "#f472b6" : "#2dd4bf"} stopOpacity={0.3} />
                                    <stop offset="100%" stopColor={isFashion ? "#f472b6" : "#2dd4bf"} stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(63,63,70,0.4)" vertical={false} />
                            <XAxis 
                                dataKey="name" 
                                stroke="#71717a" 
                                fontSize={11} 
                                tickLine={false} 
                                axisLine={false} 
                            />
                            <YAxis 
                                stroke="#71717a" 
                                fontSize={11} 
                                tickLine={false} 
                                axisLine={false}
                                tickFormatter={(v) => `${currency}${(v / 1000).toFixed(1)}k`}
                            />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: 'rgba(18,18,20,0.98)',
                                    border: '1px solid rgba(63,63,70,0.6)',
                                    borderRadius: '12px',
                                    fontSize: '12px',
                                    padding: '12px 16px'
                                }}
                                labelStyle={{ color: '#a1a1aa', fontWeight: 600 }}
                                formatter={(value, name) => [
                                    `${currency}${Number(value).toLocaleString()}`,
                                    name === 'revenue' ? 'Gross Revenue' : 'Net Earnings'
                                ]}
                            />
                            <Area
                                type="monotone"
                                dataKey="revenue"
                                stroke={isFashion ? "#ec4899" : "#14b8a6"}
                                strokeWidth={2}
                                fillOpacity={1}
                                fill="url(#colorRevenue)"
                                name="revenue"
                            />
                            <Area
                                type="monotone"
                                dataKey="net"
                                stroke={isFashion ? "#f472b6" : "#2dd4bf"}
                                strokeWidth={2}
                                fillOpacity={1}
                                fill="url(#colorNet)"
                                name="net"
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">
                {/* Top Categories Table */}
                <div className="rounded-2xl border border-zinc-700/60 bg-gradient-to-br from-zinc-900/80 via-zinc-900/60 to-zinc-900/80 shadow-lg p-6">
                    <h2 className="text-lg font-semibold text-white mb-4">Top Categories</h2>
                    {dashboardData.topCategories && dashboardData.topCategories.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-zinc-700/50">
                                        <th className="text-left py-3 px-2 text-xs font-medium text-zinc-500 uppercase tracking-wider">Category</th>
                                        <th className="text-right py-3 px-2 text-xs font-medium text-zinc-500 uppercase tracking-wider">Revenue</th>
                                        <th className="text-right py-3 px-2 text-xs font-medium text-zinc-500 uppercase tracking-wider">% Contribution</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {dashboardData.topCategories.map((cat, idx) => (
                                        <tr key={idx} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors">
                                            <td className="py-3 px-2 text-sm font-medium text-white">{cat.category || 'Uncategorized'}</td>
                                            <td className="py-3 px-2 text-sm text-right text-zinc-300">{currency}{cat.revenue.toLocaleString()}</td>
                                            <td className="py-3 px-2 text-sm text-right text-zinc-400">{cat.contribution.toFixed(1)}%</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <p className="text-sm text-zinc-500 py-4">No category data available</p>
                    )}
                </div>

                {/* Top Products Table */}
                <div className="rounded-2xl border border-zinc-700/60 bg-gradient-to-br from-zinc-900/80 via-zinc-900/60 to-zinc-900/80 shadow-lg p-6">
                    <h2 className="text-lg font-semibold text-white mb-4">Top Products</h2>
                    {dashboardData.topProducts && dashboardData.topProducts.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-zinc-700/50">
                                        <th className="text-left py-3 px-2 text-xs font-medium text-zinc-500 uppercase tracking-wider">Product</th>
                                        <th className="text-right py-3 px-2 text-xs font-medium text-zinc-500 uppercase tracking-wider">Revenue</th>
                                        <th className="text-right py-3 px-2 text-xs font-medium text-zinc-500 uppercase tracking-wider">Orders</th>
                                        <th className="text-right py-3 px-2 text-xs font-medium text-zinc-500 uppercase tracking-wider">Refund Rate</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {dashboardData.topProducts.map((product, idx) => (
                                        <tr key={idx} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors">
                                            <td className="py-3 px-2 text-sm font-medium text-white max-w-[200px] truncate" title={product.name}>{product.name}</td>
                                            <td className="py-3 px-2 text-sm text-right text-zinc-300">{currency}{product.revenue.toLocaleString()}</td>
                                            <td className="py-3 px-2 text-sm text-right text-zinc-300">{product.orders}</td>
                                            <td className={`py-3 px-2 text-sm text-right font-medium ${
                                                product.refundRate > 5 ? 'text-red-400' : product.refundRate > 2 ? 'text-yellow-400' : 'text-green-400'
                                            }`}>
                                                {product.refundRate.toFixed(1)}%
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <p className="text-sm text-zinc-500 py-4">No product data available</p>
                    )}
                </div>
            </div>

            {/* Revenue Breakdown Card */}
            <div className="rounded-2xl border border-zinc-700/60 bg-gradient-to-br from-zinc-900/80 via-zinc-900/60 to-zinc-900/80 shadow-lg p-6">
                <h2 className="text-lg font-semibold text-white mb-4">Revenue Breakdown</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="p-4 rounded-xl bg-zinc-800/40 border border-zinc-700/30">
                        <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">Gross Revenue</p>
                        <p className="text-xl font-bold text-white">{currency}{dashboardData.revenueBreakdown.grossRevenue.toLocaleString()}</p>
                    </div>
                    <div className="p-4 rounded-xl bg-zinc-800/40 border border-yellow-500/20">
                        <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">Commission Deducted</p>
                        <p className="text-xl font-bold text-yellow-400">-{currency}{dashboardData.revenueBreakdown.commissionDeducted.toLocaleString()}</p>
                    </div>
                    <div className="p-4 rounded-xl bg-zinc-800/40 border border-red-500/20">
                        <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">Refund Loss</p>
                        <p className="text-xl font-bold text-red-400">-{currency}{dashboardData.revenueBreakdown.refundLoss.toLocaleString()}</p>
                    </div>
                    <div className="p-4 rounded-xl bg-zinc-800/40 border border-green-500/20">
                        <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">Net Earnings</p>
                        <p className="text-xl font-bold text-green-400">{currency}{dashboardData.revenueBreakdown.netEarnings.toLocaleString()}</p>
                    </div>
                </div>
            </div>

        </div>
    )
}
