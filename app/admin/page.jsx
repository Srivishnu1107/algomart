'use client'
import Loading from "@/components/Loading"
import { useAuth } from "@clerk/nextjs"
import axios from "axios"
import {
    CircleDollarSignIcon, ShoppingBasketIcon, StoreIcon, TagsIcon, PackageIcon, UsersIcon,
    TrendingUp, TrendingDown, Activity, AlertTriangle, Zap, MapPin, MoreHorizontal, ArrowUpRight, ArrowDownRight,
    Search, Bell, Filter, Download, CreditCard, Wallet, Landmark, Percent, PieChart as PieChartIcon, BarChart3, AlertCircle, Clock, ShieldCheck, RefreshCw, XCircle, CheckCircle, ShieldAlert, BadgeCheck, UserPlus, History, Award,
    Brain, Eye, Gauge, Target, DollarSign, BarChart2, Layers, Shield, Radio
} from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import toast from "react-hot-toast"
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, Legend, ComposedChart
} from 'recharts'

export default function AdminDashboard() {

    const { getToken } = useAuth()
    const searchParams = useSearchParams()
    const activeTab = searchParams.get('tab') || 'revenue'

    const currency = process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || '₹'

    const [loading, setLoading] = useState(true)
    const [revenueViewMode, setRevenueViewMode] = useState('daily')
    const [showOverlay, setShowOverlay] = useState(false)
    const [categoryTab, setCategoryTab] = useState('electronics')
    const [concentrationTab, setConcentrationTab] = useState('electronics')
    const [dashboardData, setDashboardData] = useState({
        kpi: {}, orderKpi: {}, vendorKpi: {}, userKpi: {},
        revenueTrend: [], orderTrend: [], userTrend: [],
        categorySplit: [], paymentMix: [], topVendors: [],
        vendorLeaderboard: [], vendorDist: [], vendorCategorySplit: [], vendorAlerts: [],
        customer: {}, forecast: [], waterfall: [], orderDist: [], cancelReasons: [], heatmap: [], highValueOrders: [],
        highValueUsers: [], userCatSplit: [], userFreqDist: [], userAlerts: [],
        orderStatusDistribution: {}, categoryOrderMetrics: {}, cancellationIntelligence: {},
        orderBehavior: {}, paymentOrderMetrics: {}, orderHealth: {}, orderRiskSignals: {},
        vendorIntelligence: {}, userIntelligence: {}
    })

    const fetchDashboardData = async () => {
        try {
            const token = await getToken()
            const { data } = await axios.get('/api/admin/dashboard', { headers: { Authorization: `Bearer ${token}` } })
            if (data.dashboardData) setDashboardData(data.dashboardData)
        } catch (error) {
            console.error(error)
            toast.error("Failed to fetch dashboard metrics")
        }
        setLoading(false)
    }

    useEffect(() => { fetchDashboardData() }, [])

    // Revenue chart data: aggregate daily trend by week or month when view mode changes
    const revenueChartData = useMemo(() => {
        const raw = dashboardData.revenueTrend || []
        if (!raw.length || revenueViewMode === 'daily') return raw
        if (!raw[0].date) return raw // API without date field: show daily
        if (revenueViewMode === 'weekly') {
            const weekMap = {}
            raw.forEach((d) => {
                const dt = new Date(d.date)
                const start = new Date(dt)
                start.setDate(dt.getDate() - dt.getDay())
                const key = start.toISOString().split('T')[0]
                if (!weekMap[key]) weekMap[key] = { date: key, revenue: 0, orders: 0, cancelled: 0, refunds: 0, net: 0, newUsers: 0, activeUsers: 0 }
                weekMap[key].revenue += d.revenue || 0
                weekMap[key].orders += d.orders || 0
                weekMap[key].cancelled += (d.cancelled || 0)
                weekMap[key].refunds += d.refunds || 0
                weekMap[key].net += d.net || 0
                weekMap[key].newUsers += d.newUsers || 0
                weekMap[key].activeUsers += d.activeUsers || 0
            })
            return Object.entries(weekMap)
                .sort((a, b) => a[0].localeCompare(b[0]))
                .map(([key, d]) => ({
                    ...d,
                    name: `Wk ${new Date(key).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
                }))
        }
        if (revenueViewMode === 'monthly') {
            const monthMap = {}
            raw.forEach((d) => {
                const key = d.date.slice(0, 7) // YYYY-MM
                if (!monthMap[key]) monthMap[key] = { date: key, revenue: 0, orders: 0, cancelled: 0, refunds: 0, net: 0, newUsers: 0, activeUsers: 0 }
                monthMap[key].revenue += d.revenue || 0
                monthMap[key].orders += d.orders || 0
                monthMap[key].cancelled += (d.cancelled || 0)
                monthMap[key].refunds += d.refunds || 0
                monthMap[key].net += d.net || 0
                monthMap[key].newUsers += d.newUsers || 0
                monthMap[key].activeUsers += d.activeUsers || 0
            })
            return Object.entries(monthMap)
                .sort((a, b) => a[0].localeCompare(b[0]))
                .map(([, d]) => ({
                    ...d,
                    name: new Date(d.date + '-01').toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
                }))
        }
        return raw
    }, [dashboardData.revenueTrend, revenueViewMode])

    if (loading) return <Loading />

    const formatSignedPercent = (value = 0) => {
        const safeValue = Number.isFinite(value) ? value : 0
        return `${safeValue >= 0 ? '+' : ''}${safeValue.toFixed(1)}%`
    }

    // KPI Cards Configuration (Real Data)
    const renderKpiCards = () => {
        if (activeTab === 'revenue') {
            const grossChange = dashboardData.kpi?.grossChange || 0
            const netChange = dashboardData.kpi?.netChange || 0
            const aovChange = dashboardData.kpi?.aovChange || 0
            const growth = dashboardData.kpi?.growth || 0
            const refundRateChange = dashboardData.kpi?.refundRateChange || 0
            const refundImprovement = -refundRateChange

            return [
                { title: 'Gross Revenue', value: `${currency}${(dashboardData.kpi?.gross || 0).toLocaleString()}`, change: formatSignedPercent(grossChange), isUp: grossChange >= 0, icon: CircleDollarSignIcon, sparkline: dashboardData.kpi?.sparkline?.gross || [4, 5, 6, 7, 8, 9, 10] },
                { title: 'Net Revenue', value: `${currency}${(dashboardData.kpi?.net || 0).toLocaleString()}`, change: formatSignedPercent(netChange), isUp: netChange >= 0, icon: Landmark, sparkline: dashboardData.kpi?.sparkline?.net || [4, 5, 5, 6, 7, 8, 9] },
                { title: 'Rev Growth', value: `${growth.toFixed(1)}%`, change: formatSignedPercent(growth), isUp: growth >= 0, icon: TrendingUp, sparkline: dashboardData.kpi?.sparkline?.growth || [4, 5, 6, 7, 8, 9, 10] },
                { title: 'Avg Order Value', value: `${currency}${(dashboardData.kpi?.aov || 0).toFixed(0)}`, change: formatSignedPercent(aovChange), isUp: aovChange >= 0, icon: TagsIcon, sparkline: dashboardData.kpi?.sparkline?.aov || [4, 4, 5, 5, 6, 7, 8] },
                { title: 'Refund Impact', value: `${(dashboardData.kpi?.refundRate || 0).toFixed(1)}%`, change: formatSignedPercent(refundImprovement), isUp: refundImprovement >= 0, bad: (dashboardData.kpi?.refundRate || 0) > 5, icon: AlertCircle, sparkline: dashboardData.kpi?.sparkline?.refundRate || [3, 3, 2, 2, 2, 1, 1] },
                { title: 'Gross Margin', value: dashboardData.kpi?.grossMargin != null ? `${dashboardData.kpi.grossMargin.toFixed(1)}%` : 'N/A', change: 'N/A', isUp: true, icon: Percent, sparkline: [5, 5, 5, 5, 5, 5, 5], na: dashboardData.kpi?.grossMargin == null },
            ]
        } else if (activeTab === 'orders') {
            const orderGrowth = dashboardData.orderKpi?.growth ?? 0
            return [
                { title: 'Total Orders', value: (dashboardData.orderKpi?.total || 0).toLocaleString(), change: formatSignedPercent(orderGrowth), isUp: orderGrowth >= 0, icon: ShoppingBasketIcon, sparkline: dashboardData.orderTrend?.slice(-7).map(d => d.orders) || [4, 6, 5, 7, 6, 8, 9] },
                { title: 'Order Growth', value: formatSignedPercent(orderGrowth), change: 'vs prev 30d', isUp: orderGrowth >= 0, icon: TrendingUp, sparkline: dashboardData.orderTrend?.slice(-7).map(d => d.orders) || [3, 4, 4, 5, 5, 6, 6] },
                { title: 'Cancellation Rate', value: `${(dashboardData.orderKpi?.cancelRate ?? 0).toFixed(1)}%`, change: '—', isUp: (dashboardData.orderKpi?.cancelRate ?? 0) <= 10, bad: (dashboardData.orderKpi?.cancelRate > 10), icon: XCircle, sparkline: [2, 3, 2, 4, 2, 3, 2] },
                { title: 'Refund Rate', value: `${(dashboardData.orderKpi?.refundRate ?? 0).toFixed(1)}%`, change: '—', isUp: (dashboardData.orderKpi?.refundRate ?? 0) <= 5, bad: (dashboardData.orderKpi?.refundRate > 5), icon: RefreshCw, sparkline: [1, 2, 1, 2, 1, 2, 1] },
                { title: 'Pending Orders', value: (dashboardData.orderKpi?.pending || 0).toLocaleString(), change: '—', isUp: true, icon: Clock, sparkline: [5, 4, 6, 5, 4, 3, 2] },
                { title: 'Success Rate', value: `${(dashboardData.orderKpi?.successRate ?? 0).toFixed(1)}%`, change: '—', isUp: true, icon: CheckCircle, sparkline: [80, 82, 81, 83, 84, 85, 86] },
            ]
        } else if (activeTab === 'vendors') {
            return [
                { title: 'Active Vendors', value: (dashboardData.vendorKpi?.active || 0).toString(), change: '—', isUp: true, icon: StoreIcon, sparkline: [10, 12, 11, 13, 12, 14, 14] },
                { title: 'New Vendors (30d)', value: (dashboardData.vendorKpi?.new || 0).toString(), change: '—', isUp: true, icon: UserPlus, sparkline: [1, 0, 2, 1, 0, 3, 2] },
                { title: 'Top Vendor Rev %', value: `${(dashboardData.vendorKpi?.topRevShare ?? 0).toFixed(1)}%`, change: '—', isUp: true, icon: Percent, sparkline: [40, 38, 35, 32, 30, 28, 26] },
                { title: 'Avg Vendor Rating', value: (dashboardData.vendorKpi?.rating ?? 0).toFixed(1), change: '—', isUp: true, icon: BadgeCheck, sparkline: [4.2, 4.3, 4.2, 4.4, 4.5, 4.6, 4.6] },
                { title: 'Vendor Refund %', value: `${(dashboardData.vendorKpi?.refundRate ?? 0).toFixed(1)}%`, change: '—', isUp: (dashboardData.vendorKpi?.refundRate ?? 0) <= 5, bad: (dashboardData.vendorKpi?.refundRate > 5), icon: RefreshCw, sparkline: [3, 4, 3, 5, 3, 2, 2] },
                { title: 'High Risk Vendors', value: (dashboardData.vendorKpi?.riskCount || 0).toString(), change: '—', isUp: (dashboardData.vendorKpi?.riskCount || 0) === 0, bad: (dashboardData.vendorKpi?.riskCount > 0), icon: ShieldAlert, sparkline: [1, 0, 0, 1, 0, 0, 0] },
            ]
        } else if (activeTab === 'users') {
            const newGrowth = dashboardData.userKpi?.newGrowth ?? 0
            return [
                { title: 'Total Registered', value: (dashboardData.userKpi?.total || 0).toLocaleString(), change: '—', isUp: true, icon: UsersIcon, sparkline: dashboardData.userTrend?.slice(-7).map(d => d.activeUsers) || [100, 105, 110, 115, 120, 125, 130] },
                { title: 'Active (30d)', value: (dashboardData.userKpi?.active || 0).toLocaleString(), change: '—', isUp: true, icon: Activity, sparkline: dashboardData.userTrend?.slice(-7).map(d => d.activeUsers) || [40, 45, 42, 48, 50, 55, 60] },
                { title: 'New Users (30d)', value: (dashboardData.userKpi?.new || 0).toString(), change: formatSignedPercent(newGrowth), isUp: newGrowth >= 0, icon: UserPlus, sparkline: dashboardData.userTrend?.slice(-7).map(d => d.newUsers) || [5, 8, 6, 9, 7, 10, 12] },
                { title: 'Repeat Purch %', value: `${(dashboardData.userKpi?.repeatRate ?? 0).toFixed(1)}%`, change: '—', isUp: true, icon: RefreshCw, sparkline: [20, 22, 21, 24, 25, 27, 28] },
                { title: 'ARPU', value: `${currency}${(dashboardData.userKpi?.arpu ?? 0).toFixed(0)}`, change: '—', isUp: true, icon: Wallet, sparkline: [150, 155, 160, 158, 162, 165, 170] },
                { title: 'Pred. LTV', value: `${currency}${(dashboardData.userKpi?.ltv ?? 0).toFixed(0)}`, change: '—', isUp: true, icon: Award, sparkline: [450, 460, 455, 470, 480, 490, 500] },
            ]
        }
        return []
    }

    const kpiCards = renderKpiCards();

    return (
        <div className="min-h-full bg-[#0a0a0b] text-zinc-100 font-sans selection:bg-emerald-500/30">
            {/* Dynamic Alerts Panel */}
            <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 w-80">
                {(activeTab === 'revenue' && dashboardData.kpi?.refundRate > 10) && (<div className="p-3 rounded-xl border shadow-xl backdrop-blur-md flex items-start gap-3 animate-in fade-in slide-in-from-bottom-5 duration-500 bg-amber-500/10 border-amber-500/30 text-amber-200"><AlertTriangle size={16} className="mt-0.5 flex-shrink-0" /><div className="flex-1"><p className="text-xs font-semibold">High Refund Rate ({dashboardData.kpi.refundRate.toFixed(1)}%)</p></div></div>)}
                {(activeTab === 'orders' && dashboardData.orderKpi?.cancelRate > 15) && (<div className="p-3 rounded-xl border shadow-xl backdrop-blur-md flex items-start gap-3 animate-in fade-in slide-in-from-bottom-5 duration-500 bg-red-500/10 border-red-500/30 text-red-200"><AlertTriangle size={16} className="mt-0.5 flex-shrink-0" /><div className="flex-1"><p className="text-xs font-semibold">Critical Cancellation Spike ({dashboardData.orderKpi.cancelRate.toFixed(1)}%)</p></div></div>)}
                {(activeTab === 'vendors' && dashboardData.vendorAlerts?.length > 0) && dashboardData.vendorAlerts.map((alert, i) => (<div key={i} className="p-3 rounded-xl border shadow-xl backdrop-blur-md flex items-start gap-3 animate-in fade-in slide-in-from-bottom-5 duration-500 bg-red-500/10 border-red-500/30 text-red-200"><ShieldAlert size={16} className="mt-0.5 flex-shrink-0" /><div className="flex-1"><p className="text-xs font-semibold">{alert.vendor}: {alert.type}</p><p className="text-[10px] opacity-70">{alert.value}</p></div></div>))}
                {(activeTab === 'users' && dashboardData.userAlerts?.length > 0) && dashboardData.userAlerts.map((alert, i) => (<div key={i} className="p-3 rounded-xl border shadow-xl backdrop-blur-md flex items-start gap-3 animate-in fade-in slide-in-from-bottom-5 duration-500 bg-red-500/10 border-red-500/30 text-red-200"><ShieldAlert size={16} className="mt-0.5 flex-shrink-0" /><div className="flex-1"><p className="text-xs font-semibold">{alert.type}</p><p className="text-[10px] opacity-70">{alert.value}</p></div></div>))}
            </div>

            <div className="px-6 sm:px-8 lg:px-12 py-8 max-w-[1920px] mx-auto">

                {/* 1. KPI ROW — Premium shiny grey cards */}
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 mb-8">
                    {kpiCards.map((kpi, index) => (
                        <div
                            key={index}
                            className="group relative rounded-2xl p-5 transition-all duration-300 cursor-pointer overflow-hidden border border-zinc-600/30 bg-gradient-to-br from-zinc-700/50 via-zinc-800/60 to-zinc-800/50 shadow-lg hover:shadow-xl hover:border-zinc-500/40 hover:from-zinc-700/60 hover:via-zinc-800/70 hover:to-zinc-800/60"
                            style={{ animationDelay: `${index * 40}ms`, boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)' }}
                        >
                            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/[0.04] via-transparent to-transparent pointer-events-none" />
                            <div className="relative flex flex-col h-full min-h-[100px]">
                                <div className="flex justify-between items-start gap-2 mb-3">
                                    <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">{kpi.title}</span>
                                    <div className="flex items-end gap-[2px] h-5">
                                        {(kpi.sparkline || []).slice(-7).map((h, i) => (
                                            <div key={i} className={`w-1 min-h-[4px] rounded-sm transition-all duration-300 ${kpi.bad ? 'bg-rose-500/30' : 'bg-amber-500/25'}`} style={{ height: `${Math.max(4, (h / 10) * 20)}px` }} />
                                        ))}
                                    </div>
                                </div>
                                <div className="mt-auto flex items-baseline justify-between gap-2 flex-wrap">
                                    <span className={`text-xl lg:text-2xl font-bold tracking-tight tabular-nums ${kpi.na ? 'text-zinc-500' : 'text-white'}`}>{kpi.value}</span>
                                    {!kpi.na && (
                                        <span className={`inline-flex items-center gap-0.5 text-[10px] font-semibold px-2 py-0.5 rounded-md shrink-0 ${kpi.bad ? 'bg-rose-500/15 text-rose-400' : kpi.isUp ? 'bg-amber-500/15 text-amber-400' : 'bg-rose-500/15 text-rose-400'}`}>
                                            {kpi.isUp ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                                            {kpi.change}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {activeTab === 'revenue' && (
                    <div className="admin-dashboard-content space-y-8">

                        {/* ========== 2. HERO: Revenue trend + insight cards ========== */}
                        <div className="grid grid-cols-12 gap-5 animate-fadeIn">
                            <div className="col-span-12 lg:col-span-8 revenue-card revenue-glow-gold rounded-2xl p-6 flex flex-col relative overflow-hidden" style={{ minHeight: 440 }}>
                                <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
                                <div className="relative flex justify-between items-start mb-5">
                                    <div>
                                        <h2 className="dash-section-title text-white">Revenue performance</h2>
                                        <p className="dash-caption text-zinc-500 mt-1">Last 30 days · Gross vs net</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="flex bg-zinc-800/80 rounded-xl p-1 border border-zinc-700/50">
                                            {['daily', 'weekly', 'monthly'].map(mode => (
                                                <button key={mode} onClick={() => setRevenueViewMode(mode)}
                                                    className={`dash-tab px-3 py-1.5 uppercase tracking-wider rounded-lg transition-all ${revenueViewMode === mode ? 'bg-amber-500/20 text-amber-400' : 'text-zinc-500 hover:text-zinc-300'}`}
                                                >{mode}</button>
                                            ))}
                                        </div>
                                        <button onClick={() => setShowOverlay(!showOverlay)}
                                            className={`dash-tab px-3 py-1.5 uppercase tracking-wider rounded-xl border transition-all flex items-center gap-1.5 ${showOverlay ? 'border-cyan-500/50 bg-cyan-500/10 text-cyan-400' : 'border-zinc-600 text-zinc-500 hover:text-zinc-300'}`}
                                        ><Layers size={14} /> Orders</button>
                                    </div>
                                </div>
                                <div className="relative flex-1 w-full min-h-[320px] -ml-2">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <ComposedChart data={revenueChartData}>
                                            <defs>
                                                <linearGradient id="colorRevHero" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.35} />
                                                    <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
                                                </linearGradient>
                                                <linearGradient id="colorOrdersLine" x1="0" y1="0" x2="1" y2="0">
                                                    <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.8} />
                                                    <stop offset="100%" stopColor="#06b6d4" stopOpacity={1} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(63,63,70,0.4)" vertical={false} />
                                            <XAxis dataKey="name" stroke="#71717a" fontSize={11} tickLine={false} axisLine={false} />
                                            <YAxis yAxisId="left" stroke="#71717a" fontSize={11} tickLine={false} axisLine={false} tickFormatter={v => `${(v / 1000).toFixed(1)}k`} />
                                            {showOverlay && <YAxis yAxisId="right" orientation="right" stroke="#71717a" fontSize={11} tickLine={false} axisLine={false} />}
                                            <Tooltip
                                                wrapperStyle={{ zIndex: 9999 }}
                                                contentStyle={{ backgroundColor: 'rgba(18,18,20,0.98)', border: '1px solid rgba(63,63,70,0.6)', borderRadius: '12px', fontSize: '12px', padding: '12px 16px', color: '#e4e4e7' }}
                                                labelStyle={{ color: '#e4e4e7', fontWeight: 600 }}
                                                formatter={(value, name) => [name === 'revenue' ? `${currency}${Number(value).toLocaleString()}` : value, name === 'revenue' ? 'Revenue' : 'Orders']}
                                            />
                                            <Area yAxisId="left" type="monotone" dataKey="revenue" stroke="#f59e0b" strokeWidth={2.5} fillOpacity={1} fill="url(#colorRevHero)" name="revenue" />
                                            {showOverlay && <Line yAxisId="right" type="monotone" dataKey="orders" stroke="#06b6d4" strokeWidth={2} dot={false} name="orders" />}
                                        </ComposedChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            <div className="col-span-12 lg:col-span-4 flex flex-col gap-4">
                                {/* Concentration — tabs: Electronics / Fashion, top 5 stores for selected mode */}
                                <div className="relative rounded-2xl p-5 flex flex-col border border-zinc-600/30 bg-gradient-to-br from-zinc-700/50 via-zinc-800/60 to-zinc-800/50 shadow-lg hover:shadow-xl hover:border-zinc-500/40 transition-all duration-300 border-t-2 border-t-cyan-500/30" style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)', minHeight: 320 }}>
                                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/[0.03] via-transparent to-transparent pointer-events-none" />
                                    <div className="relative flex flex-col gap-4 mb-2">
                                        <div className="flex justify-between items-center">
                                            <h3 className="dash-card-title text-zinc-300 uppercase tracking-wider">Concentration</h3>
                                            <span className={`dash-label px-2.5 py-1 rounded-lg ${dashboardData.revenueConcentration?.riskLevel === 'High' ? 'bg-rose-500/15 text-rose-400' : dashboardData.revenueConcentration?.riskLevel === 'Moderate' ? 'bg-amber-500/15 text-amber-400' : 'bg-cyan-500/15 text-cyan-400'}`}>
                                                {dashboardData.revenueConcentration?.riskLevel || 'Low'}
                                            </span>
                                        </div>
                                        <div className="flex rounded-xl bg-zinc-800/80 p-1 border border-zinc-700/50">
                                            {['electronics', 'fashion'].map((mode) => (
                                                <button
                                                    key={mode}
                                                    onClick={() => setConcentrationTab(mode)}
                                                    className={`dash-tab flex-1 px-3 py-2 uppercase tracking-wider rounded-lg transition-all capitalize ${concentrationTab === mode
                                                        ? mode === 'electronics'
                                                            ? 'bg-emerald-500/25 text-emerald-400 shadow-sm'
                                                            : 'bg-pink-500/25 text-pink-400 shadow-sm'
                                                        : 'text-zinc-500 hover:text-zinc-300'
                                                        }`}
                                                >
                                                    {mode === 'electronics' ? 'Electronics' : 'Fashion'}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="relative flex-1 space-y-2">
                                        {(dashboardData.revenueConcentration?.topStoresByMode?.[concentrationTab] || []).length === 0 ? (
                                            <p className="dash-body text-zinc-500 py-4">{concentrationTab === 'electronics' ? 'No electronics stores' : 'No fashion stores'}</p>
                                        ) : (
                                            (dashboardData.revenueConcentration?.topStoresByMode?.[concentrationTab] || []).map((v, i) => (
                                                <div key={i} className="flex items-center gap-2">
                                                    <span className="dash-body text-zinc-400 truncate flex-1 min-w-0" title={v.name}>{v.name}</span>
                                                    <div className="flex items-center gap-2 w-28 shrink-0">
                                                        <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                                                            <div className={`h-full rounded-full transition-all duration-500 ${concentrationTab === 'electronics' ? 'bg-gradient-to-r from-emerald-500/80 to-emerald-400/60' : 'bg-gradient-to-r from-pink-500/80 to-pink-400/60'}`} style={{ width: `${Math.min(100, v.share)}%` }} />
                                                        </div>
                                                        <span className="dash-body font-semibold text-zinc-300 w-10 text-right tabular-nums">{v.share.toFixed(0)}%</span>
                                                    </div>
                                                    <span className="dash-body text-zinc-500 w-14 text-right tabular-nums">{currency}{v.revenue.toLocaleString()}</span>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                    <p className="relative dash-caption text-zinc-600 mt-3">Top 3 overall = {(dashboardData.revenueConcentration?.totalShare || 0).toFixed(0)}% of total revenue</p>
                                </div>

                                {/* Payment mix — method name visible */}
                                <div className="revenue-card rounded-2xl p-5 flex flex-col flex-1">
                                    <h3 className="dash-card-title text-zinc-300 uppercase tracking-wider mb-4">Payment mix</h3>
                                    <div className="space-y-4 flex-1">
                                        {(dashboardData.paymentBreakdown || []).map((pm, i) => (
                                            <div key={i} className="space-y-1.5">
                                                <div className="flex items-center justify-between gap-2">
                                                    <span className="dash-body font-semibold text-zinc-200 shrink-0 min-w-[5rem]">{pm.name}</span>
                                                    <span className="dash-caption text-zinc-500">{pm.percent.toFixed(0)}%</span>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <div className="flex-1 h-2.5 bg-zinc-800 rounded-full overflow-hidden">
                                                        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pm.percent}%`, backgroundColor: pm.color }} />
                                                    </div>
                                                    <span className="dash-body font-semibold text-zinc-300 tabular-nums shrink-0 w-16 text-right">{currency}{pm.value.toLocaleString()}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* ========== 3. Category revenue — Electronics / Fashion tabs + pie ========== */}
                        <div className="grid grid-cols-12 gap-5" style={{ minHeight: 320 }}>
                            <div className="col-span-12 lg:col-span-7 revenue-card rounded-2xl p-6 flex flex-col">
                                <div className="flex items-center justify-between mb-5">
                                    <h2 className="dash-section-title text-white">Category revenue</h2>
                                    <div className="flex rounded-xl bg-zinc-800/80 p-1 border border-zinc-700/50">
                                        {['electronics', 'fashion'].map((mode) => (
                                            <button
                                                key={mode}
                                                onClick={() => setCategoryTab(mode)}
                                                className={`dash-tab px-4 py-2 uppercase tracking-wider rounded-lg transition-all capitalize ${categoryTab === mode
                                                    ? mode === 'electronics'
                                                        ? 'bg-emerald-500/25 text-emerald-400 shadow-sm'
                                                        : 'bg-pink-500/25 text-pink-400 shadow-sm'
                                                    : 'text-zinc-500 hover:text-zinc-300'
                                                    }`}
                                            >
                                                {mode === 'electronics' ? 'Electronics' : 'Fashion'}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="space-y-3 flex-1">
                                    {((dashboardData.categoryByMode && dashboardData.categoryByMode[categoryTab]) || []).length === 0 ? (
                                        <div className="flex flex-col items-center justify-center py-12 text-zinc-500">
                                            <TagsIcon size={32} className="opacity-50 mb-2" />
                                            <p className="dash-body font-medium">No categories yet</p>
                                            <p className="dash-caption mt-1">Revenue in this mode will appear here</p>
                                        </div>
                                    ) : (
                                        (dashboardData.categoryByMode && dashboardData.categoryByMode[categoryTab] || []).map((cat, i) => {
                                            const isElectronics = categoryTab === 'electronics';
                                            const colors = isElectronics ? ['from-emerald-500/20 to-emerald-500/5', 'from-emerald-600/15 to-emerald-500/5', 'from-emerald-400/15 to-emerald-500/5'] : ['from-pink-500/20 to-pink-500/5', 'from-rose-500/15 to-pink-500/5', 'from-fuchsia-500/15 to-pink-500/5'];
                                            const barColors = isElectronics ? ['bg-emerald-500', 'bg-emerald-400', 'bg-emerald-300'] : ['bg-pink-500', 'bg-rose-400', 'bg-fuchsia-500'];
                                            return (
                                                <div key={i} className={`p-4 rounded-xl bg-gradient-to-r ${colors[i % colors.length]} border border-zinc-700/30 hover:border-zinc-600/50 transition-all duration-300`}>
                                                    <div className="flex justify-between items-center mb-2">
                                                        <div className="flex items-center gap-3">
                                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isElectronics ? 'bg-emerald-500/20 text-emerald-400' : 'bg-pink-500/20 text-pink-400'}`}>
                                                                <Zap size={18} className={!isElectronics ? 'hidden' : ''} />
                                                                <TagsIcon size={18} className={isElectronics ? 'hidden' : ''} />
                                                            </div>
                                                            <div>
                                                                <p className="dash-body font-semibold text-zinc-100">{cat.name}</p>
                                                                <p className="dash-caption text-zinc-500">{currency}{cat.revenue.toLocaleString()}</p>
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="text-lg font-bold text-white tabular-nums">{cat.contribution.toFixed(1)}%</p>
                                                            <p className="dash-caption text-zinc-500">share</p>
                                                        </div>
                                                    </div>
                                                    <div className="w-full h-2 bg-zinc-800/80 rounded-full overflow-hidden">
                                                        <div className={`h-full rounded-full ${barColors[i % barColors.length]} transition-all duration-700`} style={{ width: `${cat.contribution}%` }} />
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </div>
                            <div className="col-span-12 lg:col-span-5 revenue-card revenue-glow-cyan rounded-2xl p-6 flex flex-col">
                                <h2 className="dash-section-title text-white mb-5">Revenue by mode</h2>
                                <p className="dash-caption text-zinc-500 mb-4">Electronics vs Fashion</p>
                                <div className="flex-1 min-h-[200px] flex items-center justify-center">
                                    {(dashboardData.vendorCategorySplit || []).filter(d => (d.revenue || 0) > 0).length === 0 ? (
                                        <div className="flex flex-col items-center justify-center py-8 text-zinc-500">
                                            <BarChart3 size={32} className="opacity-50 mb-2" />
                                            <p className="dash-body font-medium">No revenue by mode yet</p>
                                        </div>
                                    ) : (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={(dashboardData.vendorCategorySplit || []).filter(d => (d.revenue || 0) > 0).map((c, i) => ({ ...c, name: c.name }))}
                                                    cx="50%" cy="50%" innerRadius={64} outerRadius={88} paddingAngle={2} dataKey="revenue" nameKey="name"
                                                >
                                                    {(dashboardData.vendorCategorySplit || []).filter(d => (d.revenue || 0) > 0).map((_, i) => (
                                                        <Cell key={i} fill={i === 0 ? '#34d399' : '#ec4899'} stroke="rgba(18,18,20,0.9)" strokeWidth={2} />
                                                    ))}
                                                </Pie>
                                                <Tooltip wrapperStyle={{ zIndex: 9999 }} contentStyle={{ backgroundColor: 'rgba(18,18,20,0.98)', border: '1px solid rgba(63,63,70,0.6)', borderRadius: '12px', fontSize: '12px', color: '#e4e4e7' }} labelStyle={{ color: '#e4e4e7' }} formatter={(v, name, item) => [`${currency}${Number(v).toLocaleString()}`, item?.payload?.name || name || 'Revenue']} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    )}
                                </div>
                                <div className="flex flex-wrap justify-center gap-x-6 gap-y-1 mt-3">
                                    {(dashboardData.vendorCategorySplit || []).filter(d => d.revenue > 0).map((seg, i) => {
                                        const total = (dashboardData.vendorCategorySplit || []).reduce((s, x) => s + (x.revenue || 0), 0);
                                        const pct = total > 0 ? ((seg.revenue || 0) / total * 100) : 0;
                                        return (
                                            <div key={i} className="flex items-center gap-2">
                                                <div className={`w-3 h-3 rounded-full ${i === 0 ? 'bg-emerald-500' : 'bg-pink-500'}`} />
                                                <span className="dash-body text-zinc-400"><span className="font-semibold text-zinc-200">{seg.name}</span> <span className="text-zinc-500">{pct.toFixed(0)}%</span></span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        {/* ========== 4. Customer & net revenue metrics — shiny grey like KPI, accent border ========== */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {[
                                { title: 'ARPU', value: `${currency}${(dashboardData.customerRevenue?.arpu || 0).toFixed(0)}`, sub: 'Avg. revenue per user', icon: UsersIcon, iconClass: 'bg-amber-500/10 text-amber-400', accent: 'border-l-amber-500/50' },
                                { title: 'Repeat revenue', value: `${(dashboardData.customerRevenue?.repeatPurchaseRevPercent || 0).toFixed(1)}%`, sub: 'From repeat buyers', icon: RefreshCw, iconClass: 'bg-cyan-500/10 text-cyan-400', accent: 'border-l-cyan-500/50' },
                                { title: 'LTV (est.)', value: `${currency}${(dashboardData.customerRevenue?.ltv || 0).toFixed(0)}`, sub: 'Lifetime value', icon: Award, iconClass: 'bg-violet-500/10 text-violet-400', accent: 'border-l-violet-500/50' },
                                { title: 'Net revenue', value: `${currency}${(dashboardData.kpi?.net || 0).toLocaleString()}`, sub: 'After refunds', icon: DollarSign, iconClass: 'bg-amber-500/10 text-amber-400', accent: 'border-l-amber-500/50' },
                            ].map((metric, i) => (
                                <div key={i} className={`relative rounded-2xl p-5 border border-zinc-600/30 bg-gradient-to-br from-zinc-700/50 via-zinc-800/60 to-zinc-800/50 shadow-lg hover:shadow-xl hover:border-zinc-500/40 transition-all duration-300 group cursor-pointer border-l-4 ${metric.accent}`} style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)' }}>
                                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/[0.03] via-transparent to-transparent pointer-events-none" />
                                    <div className="relative flex items-start justify-between gap-2 mb-3">
                                        <p className="dash-label text-zinc-400 uppercase tracking-wider">{metric.title}</p>
                                        <div className={`p-2 rounded-xl ${metric.iconClass} group-hover:scale-105 transition-transform`}>
                                            <metric.icon size={18} />
                                        </div>
                                    </div>
                                    <p className="relative text-2xl font-bold text-white tracking-tight tabular-nums">{metric.value}</p>
                                    <p className="relative dash-caption text-zinc-500 mt-1">{metric.sub}</p>
                                    {metric.title === 'ARPU' && dashboardData.customerRevenue?.arpuTrend?.length > 0 && (
                                        <div className="relative flex items-end gap-0.5 h-6 mt-3">
                                            {dashboardData.customerRevenue.arpuTrend.slice(-7).map((h, si) => (
                                                <div key={si} className="flex-1 min-w-[2px] rounded-sm bg-amber-500/20" style={{ height: `${Math.max(4, (h / 10) * 24)}px` }} />
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* ========== 5. Insights: 30-day, risk, volatility — shiny grey like KPI, subtle accent ========== */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                            <div className="relative rounded-2xl p-6 border border-zinc-600/30 bg-gradient-to-br from-zinc-700/50 via-zinc-800/60 to-zinc-800/50 shadow-lg hover:shadow-xl hover:border-amber-500/25 transition-all duration-300 border-t-2 border-t-amber-500/30" style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)' }}>
                                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/[0.03] via-transparent to-transparent pointer-events-none" />
                                <div className="relative flex items-center gap-3 mb-5">
                                    <div className="p-2.5 rounded-xl bg-amber-500/15 text-amber-400">
                                        <Target size={20} />
                                    </div>
                                    <div>
                                        <h3 className="dash-card-title text-white">30-day outlook</h3>
                                        <p className="dash-caption text-zinc-500">Projected revenue</p>
                                    </div>
                                </div>
                                <p className="relative text-2xl font-bold text-amber-400 tabular-nums tracking-tight">
                                    {currency}{(dashboardData.aiForecast?.predicted30 || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                </p>
                                <div className="relative grid grid-cols-2 gap-4 mt-5">
                                    <div>
                                        <p className="dash-label text-zinc-500 uppercase mb-1.5">Confidence</p>
                                        <div className="flex items-center gap-2">
                                            <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
                                                <div className="h-full bg-amber-500 rounded-full transition-all duration-500" style={{ width: `${dashboardData.aiForecast?.confidence || 0}%` }} />
                                            </div>
                                            <span className="dash-body font-bold text-amber-400 w-8">{(dashboardData.aiForecast?.confidence || 0)}%</span>
                                        </div>
                                    </div>
                                    <div>
                                        <p className="dash-label text-zinc-500 uppercase mb-1.5">Stability</p>
                                        <div className="flex items-center gap-2">
                                            <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
                                                <div className="h-full bg-cyan-500 rounded-full transition-all duration-500" style={{ width: `${dashboardData.aiForecast?.stability || 0}%` }} />
                                            </div>
                                            <span className="dash-body font-bold text-cyan-400 w-8">{(dashboardData.aiForecast?.stability || 0)}%</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="relative rounded-2xl p-6 border border-zinc-600/30 bg-gradient-to-br from-zinc-700/50 via-zinc-800/60 to-zinc-800/50 shadow-lg hover:shadow-xl hover:border-cyan-500/25 transition-all duration-300 border-t-2 border-t-cyan-500/30" style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)' }}>
                                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/[0.03] via-transparent to-transparent pointer-events-none" />
                                <div className="relative flex items-center gap-3 mb-5">
                                    <div className="p-2.5 rounded-xl bg-cyan-500/15 text-cyan-400">
                                        <Shield size={20} />
                                    </div>
                                    <div>
                                        <h3 className="dash-card-title text-white">Risk signals</h3>
                                        <p className="dash-caption text-zinc-500">Revenue health</p>
                                    </div>
                                </div>
                                <div className="relative space-y-2.5">
                                    {(dashboardData.aiRiskSignals || []).map((signal, i) => (
                                        <div key={i} className={`flex items-start gap-3 p-3 rounded-xl border-l-2 ${signal.detected ? signal.severity === 'critical' ? 'border-rose-500 bg-rose-500/5' : 'border-amber-500 bg-amber-500/5' : 'border-zinc-600 bg-zinc-800/30'}`}>
                                            {signal.detected ? <AlertTriangle size={16} className={`shrink-0 mt-0.5 ${signal.severity === 'critical' ? 'text-rose-400' : 'text-amber-400'}`} /> : <CheckCircle size={16} className="shrink-0 mt-0.5 text-cyan-400" />}
                                            <div>
                                                <p className={`dash-body font-bold ${signal.detected ? signal.severity === 'critical' ? 'text-rose-300' : 'text-amber-300' : 'text-zinc-400'}`}>{signal.type}</p>
                                                <p className="dash-caption text-zinc-500 mt-0.5">{signal.message}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="relative rounded-2xl p-6 border border-zinc-600/30 bg-gradient-to-br from-zinc-700/50 via-zinc-800/60 to-zinc-800/50 shadow-lg hover:shadow-xl hover:border-violet-500/25 transition-all duration-300 border-t-2 border-t-violet-500/30" style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)' }}>
                                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/[0.03] via-transparent to-transparent pointer-events-none" />
                                <div className="relative flex items-center gap-3 mb-5">
                                    <div className="p-2.5 rounded-xl bg-violet-500/15 text-violet-400">
                                        <Gauge size={20} />
                                    </div>
                                    <div>
                                        <h3 className="dash-card-title text-white">Volatility</h3>
                                        <p className="dash-caption text-zinc-500">Revenue stability</p>
                                    </div>
                                </div>
                                <div className="relative flex flex-col items-center">
                                    <div className="relative w-32 h-32">
                                        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                                            <circle cx="50" cy="50" r="42" stroke="rgba(63,63,70,0.6)" strokeWidth="6" fill="none" />
                                            <circle cx="50" cy="50" r="42" stroke={dashboardData.aiVolatility?.badge === 'High' ? '#f43f5e' : dashboardData.aiVolatility?.badge === 'Moderate' ? '#f59e0b' : '#06b6d4'} strokeWidth="6" fill="none" strokeLinecap="round"
                                                strokeDasharray={`${(dashboardData.aiVolatility?.index || 0) * 2.64} 264`} style={{ transition: 'stroke-dasharray 0.6s ease' }} />
                                        </svg>
                                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                                            <span className="text-3xl font-bold text-white tabular-nums">{dashboardData.aiVolatility?.index ?? 0}</span>
                                            <span className="dash-caption text-zinc-500 font-medium">index</span>
                                        </div>
                                    </div>
                                    <span className={`mt-4 dash-body font-bold px-4 py-1.5 rounded-xl ${dashboardData.aiVolatility?.badge === 'High' ? 'bg-rose-500/15 text-rose-400' : dashboardData.aiVolatility?.badge === 'Moderate' ? 'bg-amber-500/15 text-amber-400' : 'bg-cyan-500/15 text-cyan-400'}`}>
                                        {dashboardData.aiVolatility?.badge || 'Low'}
                                    </span>
                                    <p className="dash-caption text-zinc-500 mt-2">σ ≈ {currency}{dashboardData.aiVolatility?.stddev ?? 0}</p>
                                </div>
                            </div>
                        </div>

                        {/* ========== 6. Revenue alerts ========== */}
                        {(dashboardData.revenueAlerts?.length > 0) && (
                            <div className="revenue-card rounded-2xl p-6">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="p-2 rounded-xl bg-rose-500/15 text-rose-400">
                                        <Bell size={18} />
                                    </div>
                                    <h3 className="dash-card-title text-white">Alerts</h3>
                                    <span className="dash-label bg-rose-500/20 text-rose-400 px-2.5 py-1 rounded-lg">{dashboardData.revenueAlerts.length} active</span>
                                </div>
                                <div className="space-y-2">
                                    {dashboardData.revenueAlerts.map((alert, i) => (
                                        <div key={i} className={`flex items-center justify-between gap-4 p-4 rounded-xl border-l-4 transition-all hover:bg-zinc-800/30 ${alert.severity === 'critical' ? 'border-rose-500 bg-rose-500/5' : alert.severity === 'warning' ? 'border-amber-500 bg-amber-500/5' : 'border-cyan-500 bg-cyan-500/5'}`}>
                                            <div className="flex items-center gap-3 min-w-0">
                                                <AlertTriangle size={18} className={`shrink-0 ${alert.severity === 'critical' ? 'text-rose-400' : alert.severity === 'warning' ? 'text-amber-400' : 'text-cyan-400'}`} />
                                                <div className="min-w-0">
                                                    <p className="dash-body font-bold text-zinc-100">{alert.type}</p>
                                                    <p className="dash-caption text-zinc-500 truncate">{alert.message}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3 shrink-0">
                                                <span className="dash-caption text-zinc-500">{new Date(alert.timestamp).toLocaleDateString()}</span>
                                                <button className={`dash-tab px-3 py-1.5 rounded-lg transition-all ${alert.severity === 'critical' ? 'bg-rose-500/20 text-rose-400 hover:bg-rose-500/30' : alert.severity === 'warning' ? 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30' : 'bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30'}`}>
                                                    {alert.action}
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                    </div>
                )}

                {activeTab === 'orders' && (
                    <div className="admin-dashboard-content space-y-8 animate-fadeIn">
                        {/* 2. Order Flow + Status — same style as revenue hero */}
                        <div className="grid grid-cols-12 gap-5">
                            <div className="col-span-12 lg:col-span-8 relative rounded-2xl p-6 flex flex-col border border-zinc-600/30 bg-gradient-to-br from-zinc-700/50 via-zinc-800/60 to-zinc-800/50 shadow-lg overflow-hidden" style={{ minHeight: 380 }}>
                                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />
                                <div className="relative">
                                    <h2 className="dash-section-title text-white">Order flow analysis</h2>
                                    <p className="dash-caption text-zinc-500 mt-1">Last 30 days · Created vs cancelled</p>
                                </div>
                                <div className="relative flex-1 w-full min-h-[300px] -ml-2 mt-4">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={dashboardData.orderTrend || []}>
                                            <defs>
                                                <linearGradient id="colorOrdersFlow" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3b82f6" stopOpacity={0.35} /><stop offset="95%" stopColor="#3b82f6" stopOpacity={0} /></linearGradient>
                                                <linearGradient id="colorCancelledFlow" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#ef4444" stopOpacity={0.35} /><stop offset="95%" stopColor="#ef4444" stopOpacity={0} /></linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(63,63,70,0.4)" vertical={false} />
                                            <XAxis dataKey="name" stroke="#71717a" fontSize={11} tickLine={false} axisLine={false} />
                                            <YAxis stroke="#71717a" fontSize={11} tickLine={false} axisLine={false} />
                                            <Tooltip wrapperStyle={{ zIndex: 9999 }} contentStyle={{ backgroundColor: 'rgba(18,18,20,0.98)', border: '1px solid rgba(63,63,70,0.6)', borderRadius: '12px', color: '#e4e4e7' }} labelStyle={{ color: '#e4e4e7' }} />
                                            <Area type="monotone" dataKey="orders" stroke="#3b82f6" strokeWidth={2.5} fill="url(#colorOrdersFlow)" name="Orders" />
                                            <Area type="monotone" dataKey="cancelled" stroke="#ef4444" strokeWidth={2} fill="url(#colorCancelledFlow)" name="Cancelled" />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                            <div className="col-span-12 lg:col-span-4 flex flex-col gap-4">
                                <div className="relative rounded-2xl p-5 flex flex-col border border-zinc-600/30 bg-gradient-to-br from-zinc-700/50 via-zinc-800/60 to-zinc-800/50 shadow-lg border-t-2 border-t-blue-500/30" style={{ minHeight: 320, boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)' }}>
                                    <h3 className="dash-card-title text-zinc-300 uppercase tracking-wider mb-4">Status breakdown</h3>
                                    <div className="flex-1 min-h-[200px]">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie data={dashboardData.orderDist || []} cx="50%" cy="50%" innerRadius={56} outerRadius={80} paddingAngle={2} dataKey="value" nameKey="name">
                                                    {(dashboardData.orderDist || []).map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} stroke="rgba(18,18,20,0.9)" strokeWidth={2} />)}
                                                </Pie>
                                                <Tooltip wrapperStyle={{ zIndex: 9999 }} contentStyle={{ backgroundColor: 'rgba(18,18,20,0.98)', border: '1px solid rgba(63,63,70,0.6)', borderRadius: '12px', color: '#e4e4e7' }} labelStyle={{ color: '#e4e4e7' }} formatter={(value, name) => [value, name]} />
                                                <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '10px' }} formatter={(v) => <span className="text-zinc-400">{v}</span>} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                                <div className="relative rounded-2xl p-5 border border-zinc-600/30 bg-gradient-to-br from-zinc-700/50 via-zinc-800/60 to-zinc-800/50 shadow-lg overflow-y-auto custom-scrollbar" style={{ maxHeight: 200 }}>
                                    <h3 className="dash-card-title text-zinc-300 uppercase tracking-wider mb-3">Top cancellation reasons</h3>
                                    <div className="space-y-2">
                                        {(dashboardData.cancellationIntelligence?.topReasons || dashboardData.cancelReasons || []).length > 0
                                            ? (dashboardData.cancellationIntelligence?.topReasons || dashboardData.cancelReasons).map((r, i) => (
                                                <div key={i} className="flex justify-between items-center dash-body"><span className="text-zinc-400 truncate max-w-[140px]">{r.name}</span><span className="text-zinc-200 font-bold tabular-nums">{r.value}</span></div>
                                            ))
                                            : <p className="dash-caption text-zinc-600">No cancellation data yet.</p>}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 3. Order Status Distribution — KPI row */}
                        <div>
                            <h2 className="dash-section-title text-white mb-4">Order status distribution</h2>
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                                {[
                                    { key: 'created', label: 'Created orders', value: dashboardData.orderStatusDistribution?.created ?? 0, icon: PackageIcon, borderClass: 'border-l-amber-500/50', iconClass: 'bg-amber-500/15', textClass: 'text-amber-400' },
                                    { key: 'paid', label: 'Paid orders', value: dashboardData.orderStatusDistribution?.paid ?? 0, icon: CreditCard, borderClass: 'border-l-emerald-500/50', iconClass: 'bg-emerald-500/15', textClass: 'text-emerald-400' },
                                    { key: 'confirmed', label: 'Confirmed orders', value: dashboardData.orderStatusDistribution?.confirmed ?? 0, icon: CheckCircle, borderClass: 'border-l-cyan-500/50', iconClass: 'bg-cyan-500/15', textClass: 'text-cyan-400' },
                                    { key: 'cancelled', label: 'Cancelled orders', value: dashboardData.orderStatusDistribution?.cancelled ?? 0, icon: XCircle, borderClass: 'border-l-rose-500/50', iconClass: 'bg-rose-500/15', textClass: 'text-rose-400' },
                                    { key: 'refunded', label: 'Refunded orders', value: dashboardData.orderStatusDistribution?.refunded ?? 0, icon: RefreshCw, borderClass: 'border-l-orange-500/50', iconClass: 'bg-orange-500/15', textClass: 'text-orange-400' },
                                ].map((m, i) => (
                                    <div key={m.key} className={`relative rounded-2xl p-5 border border-zinc-600/30 bg-gradient-to-br from-zinc-700/50 via-zinc-800/60 to-zinc-800/50 shadow-lg hover:shadow-xl transition-all duration-300 border-l-4 ${m.borderClass}`} style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)' }}>
                                        <div className="flex items-start justify-between gap-2 mb-2">
                                            <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">{m.label}</span>
                                            <div className={`p-1.5 rounded-lg ${m.iconClass}`}><m.icon size={14} className={m.textClass} /></div>
                                        </div>
                                        <p className="text-xl font-bold text-white tabular-nums">{(m.value || 0).toLocaleString()}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* 4. Category-based order metrics */}
                        <div>
                            <h2 className="dash-section-title text-white mb-4">Category-based order metrics</h2>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="relative rounded-2xl p-5 border border-zinc-600/30 bg-gradient-to-br from-zinc-700/50 via-zinc-800/60 to-zinc-800/50 shadow-lg border-t-2 border-t-amber-500/30" style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)' }}>
                                    <h3 className="dash-card-title text-zinc-300 uppercase tracking-wider mb-1">Orders by category (Electronics)</h3>
                                    <p className="text-2xl font-bold text-amber-400 tabular-nums">{(dashboardData.categoryOrderMetrics?.ordersElectronics ?? 0).toLocaleString()}</p>
                                    <p className="dash-caption text-zinc-500 mt-1">Last 30 days</p>
                                </div>
                                <div className="relative rounded-2xl p-5 border border-zinc-600/30 bg-gradient-to-br from-zinc-700/50 via-zinc-800/60 to-zinc-800/50 shadow-lg border-t-2 border-t-pink-500/30" style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)' }}>
                                    <h3 className="dash-card-title text-zinc-300 uppercase tracking-wider mb-1">Orders by category (Fashion)</h3>
                                    <p className="text-2xl font-bold text-pink-400 tabular-nums">{(dashboardData.categoryOrderMetrics?.ordersFashion ?? 0).toLocaleString()}</p>
                                    <p className="dash-caption text-zinc-500 mt-1">Last 30 days</p>
                                </div>
                                <div className="relative rounded-2xl p-5 border border-zinc-600/30 bg-gradient-to-br from-zinc-700/50 via-zinc-800/60 to-zinc-800/50 shadow-lg border-t-2 border-t-cyan-500/30" style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)' }}>
                                    <h3 className="dash-card-title text-zinc-300 uppercase tracking-wider mb-1">Category order growth %</h3>
                                    <p className={`text-2xl font-bold tabular-nums ${(dashboardData.categoryOrderMetrics?.categoryOrderGrowthPercent ?? 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{formatSignedPercent(dashboardData.categoryOrderMetrics?.categoryOrderGrowthPercent ?? 0)}</p>
                                    <p className="dash-caption text-zinc-500 mt-1">vs prior 30 days</p>
                                </div>
                            </div>
                        </div>

                        {/* 5. Cancellation intelligence */}
                        <div>
                            <h2 className="dash-section-title text-white mb-4">Cancellation intelligence</h2>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="relative rounded-2xl p-5 border border-zinc-600/30 bg-gradient-to-br from-zinc-700/50 via-zinc-800/60 to-zinc-800/50 shadow-lg overflow-y-auto" style={{ maxHeight: 260, boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)' }}>
                                    <h3 className="dash-card-title text-zinc-300 uppercase tracking-wider mb-3">Top cancellation reasons</h3>
                                    <div className="space-y-2">
                                        {(dashboardData.cancellationIntelligence?.topReasons || []).map((r, i) => (
                                            <div key={i} className="flex justify-between items-center dash-body"><span className="text-zinc-400 truncate">{r.name}</span><span className="text-zinc-200 font-bold">{r.value}</span></div>
                                        ))}
                                        {(dashboardData.cancellationIntelligence?.topReasons || []).length === 0 && <p className="dash-caption text-zinc-600">No data</p>}
                                    </div>
                                </div>
                                <div className="relative rounded-2xl p-5 border border-zinc-600/30 bg-gradient-to-br from-zinc-700/50 via-zinc-800/60 to-zinc-800/50 shadow-lg" style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)' }}>
                                    <h3 className="dash-card-title text-zinc-300 uppercase tracking-wider mb-3">Cancellation rate by category</h3>
                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center"><span className="dash-body text-zinc-400">Electronics</span><span className="font-bold text-amber-400">{(dashboardData.cancellationIntelligence?.cancelRateByCategory?.electronics ?? 0).toFixed(1)}%</span></div>
                                        <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden"><div className="h-full bg-amber-500/70 rounded-full" style={{ width: `${Math.min(100, dashboardData.cancellationIntelligence?.cancelRateByCategory?.electronics ?? 0)}%` }} /></div>
                                        <div className="flex justify-between items-center"><span className="dash-body text-zinc-400">Fashion</span><span className="font-bold text-pink-400">{(dashboardData.cancellationIntelligence?.cancelRateByCategory?.fashion ?? 0).toFixed(1)}%</span></div>
                                        <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden"><div className="h-full bg-pink-500/70 rounded-full" style={{ width: `${Math.min(100, dashboardData.cancellationIntelligence?.cancelRateByCategory?.fashion ?? 0)}%` }} /></div>
                                    </div>
                                </div>
                                <div className="relative rounded-2xl p-5 border border-zinc-600/30 bg-gradient-to-br from-zinc-700/50 via-zinc-800/60 to-zinc-800/50 shadow-lg border-t-2 border-t-rose-500/30" style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)' }}>
                                    <h3 className="dash-card-title text-zinc-300 uppercase tracking-wider mb-1">High cancellation vendor count</h3>
                                    <p className="text-2xl font-bold text-rose-400 tabular-nums">{dashboardData.cancellationIntelligence?.highCancellationVendorCount ?? 0}</p>
                                    <p className="dash-caption text-zinc-500 mt-1">Vendors with cancel rate ≥15%</p>
                                </div>
                            </div>
                        </div>

                        {/* 6. Order behavior metrics */}
                        <div className="grid grid-cols-12 gap-5">
                            <div className="col-span-12 lg:col-span-7 relative rounded-2xl p-6 border border-zinc-600/30 bg-gradient-to-br from-zinc-700/50 via-zinc-800/60 to-zinc-800/50 shadow-lg" style={{ minHeight: 320 }}>
                                <h3 className="dash-section-title text-white mb-1">Orders by hour (peak time)</h3>
                                <p className="dash-caption text-zinc-500 mb-4">Last 30 days</p>
                                <div className="w-full h-[240px] -ml-2">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={dashboardData.orderBehavior?.byHour ?? dashboardData.heatmap ?? []} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(63,63,70,0.4)" vertical={false} />
                                            <XAxis dataKey="hourLabel" stroke="#71717a" fontSize={10} tickLine={false} axisLine={false} interval={2} />
                                            <YAxis stroke="#71717a" fontSize={10} tickLine={false} axisLine={false} />
                                            <Tooltip wrapperStyle={{ zIndex: 9999 }} contentStyle={{ backgroundColor: 'rgba(18,18,20,0.98)', border: '1px solid rgba(63,63,70,0.6)', borderRadius: '12px', color: '#e4e4e7' }} labelStyle={{ color: '#e4e4e7' }} />
                                            <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} name="Orders" />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                            <div className="col-span-12 lg:col-span-5 flex flex-col gap-4">
                                <div className="relative rounded-2xl p-5 border border-zinc-600/30 bg-gradient-to-br from-zinc-700/50 via-zinc-800/60 to-zinc-800/50 shadow-lg flex-1 min-h-[200px]" style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)' }}>
                                    <h3 className="dash-card-title text-zinc-300 uppercase tracking-wider mb-4">Orders by weekday</h3>
                                    <ResponsiveContainer width="100%" height={180}>
                                        <BarChart layout="vertical" data={dashboardData.orderBehavior?.byWeekday ?? []} margin={{ left: 0, right: 20 }}>
                                            <XAxis type="number" hide />
                                            <YAxis dataKey="day" type="category" width={32} tick={{ fontSize: 10, fill: '#a1a1aa' }} tickLine={false} axisLine={false} />
                                            <Tooltip wrapperStyle={{ zIndex: 9999 }} contentStyle={{ backgroundColor: 'rgba(18,18,20,0.98)', borderRadius: '8px', color: '#e4e4e7' }} labelStyle={{ color: '#e4e4e7' }} />
                                            <Bar dataKey="count" fill="#8b5cf6" radius={[0, 4, 4, 0]} barSize={18} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="relative rounded-2xl p-4 border border-zinc-600/30 bg-gradient-to-br from-zinc-700/50 to-zinc-800/50 shadow-lg border-t-2 border-t-violet-500/30">
                                        <p className="dash-label text-zinc-500 uppercase text-[10px]">High-value order count</p>
                                        <p className="text-xl font-bold text-violet-400 tabular-nums">{dashboardData.orderBehavior?.highValueOrderCount ?? 0}</p>
                                    </div>
                                    <div className="relative rounded-2xl p-4 border border-zinc-600/30 bg-gradient-to-br from-zinc-700/50 to-zinc-800/50 shadow-lg border-t-2 border-t-cyan-500/30">
                                        <p className="dash-label text-zinc-500 uppercase text-[10px]">High-value order % of total</p>
                                        <p className="text-xl font-bold text-cyan-400 tabular-nums">{(dashboardData.orderBehavior?.highValueOrderPercent ?? 0).toFixed(1)}%</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 7. Payment order metrics */}
                        <div>
                            <h2 className="dash-section-title text-white mb-4">Payment order metrics</h2>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="relative rounded-2xl p-5 border border-zinc-600/30 bg-gradient-to-br from-zinc-700/50 via-zinc-800/60 to-zinc-800/50 shadow-lg border-t-2 border-t-emerald-500/30" style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)' }}>
                                    <h3 className="dash-card-title text-zinc-300 uppercase tracking-wider mb-1">Payment success rate %</h3>
                                    <p className="text-2xl font-bold text-emerald-400 tabular-nums">{(dashboardData.paymentOrderMetrics?.paymentSuccessRate ?? 0).toFixed(1)}%</p>
                                </div>
                                <div className="relative rounded-2xl p-5 border border-zinc-600/30 bg-gradient-to-br from-zinc-700/50 via-zinc-800/60 to-zinc-800/50 shadow-lg border-t-2 border-t-rose-500/30" style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)' }}>
                                    <h3 className="dash-card-title text-zinc-300 uppercase tracking-wider mb-1">Payment failure rate %</h3>
                                    <p className="text-2xl font-bold text-rose-400 tabular-nums">{(dashboardData.paymentOrderMetrics?.paymentFailureRate ?? 0).toFixed(1)}%</p>
                                </div>
                                <div className="relative rounded-2xl p-5 border border-zinc-600/30 bg-gradient-to-br from-zinc-700/50 via-zinc-800/60 to-zinc-800/50 shadow-lg" style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)' }}>
                                    <h3 className="dash-card-title text-zinc-300 uppercase tracking-wider mb-3">Orders by payment method</h3>
                                    <div className="space-y-2">
                                        {(dashboardData.paymentOrderMetrics?.ordersByPaymentMethod || []).map((pm, i) => (
                                            <div key={i} className="flex justify-between items-center dash-body"><span className="text-zinc-400">{pm.name}</span><span className="text-zinc-200 font-bold">{pm.count} <span className="text-zinc-500 font-normal">({pm.percent?.toFixed(0)}%)</span></span></div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 8. Order health metrics */}
                        <div>
                            <h2 className="dash-section-title text-white mb-4">Order health metrics</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="relative rounded-2xl p-5 border border-zinc-600/30 bg-gradient-to-br from-zinc-700/50 via-zinc-800/60 to-zinc-800/50 shadow-lg border-t-2 border-t-cyan-500/30" style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)' }}>
                                    <h3 className="dash-card-title text-zinc-300 uppercase tracking-wider mb-1">Average order processing time</h3>
                                    <p className="text-2xl font-bold text-cyan-400 tabular-nums">{(dashboardData.orderHealth?.avgProcessingTimeHours ?? 0).toFixed(1)} hrs</p>
                                    <p className="dash-caption text-zinc-500 mt-1">Created → confirmed (delivered)</p>
                                </div>
                                <div className="relative rounded-2xl p-5 border border-zinc-600/30 bg-gradient-to-br from-zinc-700/50 via-zinc-800/60 to-zinc-800/50 shadow-lg border-t-2 border-t-violet-500/30" style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)' }}>
                                    <h3 className="dash-card-title text-zinc-300 uppercase tracking-wider mb-1">Repeat order interval</h3>
                                    <p className="text-2xl font-bold text-violet-400 tabular-nums">{(dashboardData.orderHealth?.repeatOrderIntervalDays ?? 0).toFixed(1)} days</p>
                                    <p className="dash-caption text-zinc-500 mt-1">Avg days between user orders</p>
                                </div>
                            </div>
                        </div>

                        {/* 9. Risk & anomaly signals */}
                        <div>
                            <h2 className="dash-section-title text-white mb-4">Risk & anomaly signals (simple AI)</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                {[
                                    { key: 'demandSpike', label: 'Demand spike detection', detected: dashboardData.orderRiskSignals?.demandSpikeDetected, value: dashboardData.orderRiskSignals?.demandSpikePercent, icon: TrendingUp },
                                    { key: 'cancellationSpike', label: 'Cancellation spike detection', detected: dashboardData.orderRiskSignals?.cancellationSpikeDetected, value: dashboardData.orderRiskSignals?.cancellationSpikePercent, icon: XCircle },
                                    { key: 'highValueCluster', label: 'High-value order cluster detection', detected: dashboardData.orderRiskSignals?.highValueClusterDetected, value: dashboardData.orderRiskSignals?.highValueClusterCount, icon: DollarSign },
                                    { key: 'unusualPayment', label: 'Unusual payment pattern detection', detected: dashboardData.orderRiskSignals?.unusualPaymentDetected, value: dashboardData.orderRiskSignals?.dominantPaymentShare, icon: CreditCard },
                                ].map((s) => (
                                    <div key={s.key} className={`relative rounded-2xl p-5 border transition-all duration-300 ${s.detected ? 'border-amber-500/40 bg-amber-500/5' : 'border-zinc-600/30 bg-gradient-to-br from-zinc-700/50 via-zinc-800/60 to-zinc-800/50'} shadow-lg`} style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)' }}>
                                        <div className="flex items-start justify-between gap-2 mb-2">
                                            <s.icon size={18} className={s.detected ? 'text-amber-400' : 'text-zinc-500'} />
                                            <span className={`dash-label px-2 py-0.5 rounded-lg text-[10px] ${s.detected ? 'bg-amber-500/20 text-amber-400' : 'bg-zinc-700/80 text-zinc-500'}`}>{s.detected ? 'Detected' : 'Normal'}</span>
                                        </div>
                                        <p className="dash-card-title text-zinc-300 text-sm mb-1">{s.label}</p>
                                        <p className={`text-lg font-bold tabular-nums ${s.detected ? 'text-amber-400' : 'text-zinc-500'}`}>
                                            {typeof s.value === 'number' && s.key === 'unusualPayment' ? `${s.value?.toFixed(0)}% dominant` : typeof s.value === 'number' && s.key === 'highValueCluster' ? `${s.value} orders` : typeof s.value === 'number' ? `${s.value >= 0 ? '+' : ''}${s.value?.toFixed(1)}%` : '—'}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* High-value orders list (existing, restyled) */}
                        <div className="relative rounded-2xl p-6 border border-zinc-600/30 bg-gradient-to-br from-zinc-700/50 via-zinc-800/60 to-zinc-800/50 shadow-lg border-t-2 border-t-violet-500/30">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="dash-section-title text-white">High-value orders</h3>
                                <span className="dash-label bg-purple-500/10 text-purple-400 px-2 py-1 rounded-lg">Risk monitor</span>
                            </div>
                            <div className="overflow-y-auto custom-scrollbar space-y-3 max-h-64">
                                {(dashboardData.highValueOrders || []).length > 0 ? dashboardData.highValueOrders.map((o, i) => (
                                    <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-zinc-800/30 border border-zinc-700/30 hover:border-zinc-600/50 transition-colors">
                                        <div><p className="dash-body font-bold text-zinc-200">{o.id?.slice(-8)}</p><p className="dash-caption text-zinc-500">{o.user}</p></div>
                                        <div className="text-right"><p className="dash-body font-bold text-emerald-400">{currency}{Number(o.total).toLocaleString()}</p><p className="dash-caption text-zinc-500 uppercase">{o.payment}</p></div>
                                    </div>
                                )) : <p className="dash-body text-zinc-600 text-center py-8">No high-value orders found.</p>}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'vendors' && (
                    <div className="admin-dashboard-content space-y-6 animate-fadeIn">
                        {/* VENDOR REVENUE & CATEGORIES — single card */}
                        <div className="rounded-2xl border border-zinc-600/30 bg-gradient-to-br from-zinc-700/50 via-zinc-800/60 to-zinc-800/50 shadow-lg overflow-hidden">
                            <div className="p-5 border-b border-zinc-700/50 flex items-center gap-2">
                                <BarChart3 size={20} className="text-amber-400" />
                                <h2 className="dash-section-title text-white">Revenue & Categories</h2>
                            </div>
                            <div className="p-5 flex flex-col sm:flex-row gap-6 items-stretch">
                                <div className="flex-1 min-w-0">
                                    <h3 className="dash-card-title text-zinc-300 uppercase tracking-wider mb-3">Top 5 Revenue Share</h3>
                                    <div className="h-[140px] w-full -ml-2">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart layout="vertical" data={dashboardData.vendorDist || []} margin={{ left: 0, right: 12, top: 4, bottom: 4 }}>
                                                <XAxis type="number" hide />
                                                <YAxis dataKey="name" type="category" width={72} tick={{ fontSize: 10, fill: '#a1a1aa' }} tickLine={false} axisLine={false} />
                                                <Tooltip wrapperStyle={{ zIndex: 9999 }} contentStyle={{ backgroundColor: 'rgba(18,18,20,0.98)', border: '1px solid rgba(63,63,70,0.6)', borderRadius: '8px', fontSize: '11px', color: '#e4e4e7' }} labelStyle={{ color: '#e4e4e7' }} formatter={(v) => [currency + Number(v).toLocaleString(), 'Revenue']} />
                                                <Bar dataKey="value" fill="#f59e0b" radius={[0, 4, 4, 0]} barSize={14} name="Revenue" />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                                <div className="sm:w-px sm:min-w-0 bg-zinc-700/50 shrink-0" aria-hidden />
                                <div className="sm:w-48 shrink-0 flex flex-col justify-center">
                                    <h3 className="dash-card-title text-zinc-300 uppercase tracking-wider mb-3">Vendor Categories</h3>
                                    <div className="flex sm:flex-col gap-4 sm:gap-3">
                                        {(dashboardData.vendorCategorySplit || []).map((c, i) => (
                                            <div key={i} className="flex items-center gap-3 sm:gap-2">
                                                <div className={`w-2 h-8 sm:h-2 sm:w-8 rounded-full shrink-0 ${i === 0 ? 'bg-amber-500' : 'bg-pink-500'}`} />
                                                <div>
                                                    <p className="text-xl font-bold text-white tabular-nums">{c.count}</p>
                                                    <p className="dash-caption text-zinc-500 uppercase tracking-wider">{c.name}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 3. VENDOR ORDER PERFORMANCE */}
                        <div className="rounded-2xl border border-zinc-600/30 bg-gradient-to-br from-zinc-700/50 via-zinc-800/60 to-zinc-800/50 shadow-lg overflow-hidden">
                            <div className="p-5 border-b border-zinc-700/50 flex items-center gap-2">
                                <ShoppingBasketIcon size={20} className="text-amber-400" />
                                <h2 className="dash-section-title text-white">Vendor Order Performance</h2>
                            </div>
                            <div className="p-5">
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-5">
                                    {[
                                        { label: 'Avg order growth %', value: (dashboardData.vendorIntelligence?.vendorOrderPerformance?.summary?.avgOrderGrowthPct ?? 0).toFixed(1), suffix: '%' },
                                        { label: 'Avg cancellation rate %', value: (dashboardData.vendorIntelligence?.vendorOrderPerformance?.summary?.avgCancellationRatePct ?? 0).toFixed(1), suffix: '%', bad: true },
                                        { label: 'Avg refund rate %', value: (dashboardData.vendorIntelligence?.vendorOrderPerformance?.summary?.avgRefundRatePct ?? 0).toFixed(1), suffix: '%', bad: true },
                                        { label: 'Avg success rate %', value: (dashboardData.vendorIntelligence?.vendorOrderPerformance?.summary?.avgSuccessRatePct ?? 0).toFixed(1), suffix: '%' },
                                    ].map((m, i) => (
                                        <div key={i} className="rounded-xl p-4 bg-zinc-800/40 border border-zinc-700/30">
                                            <p className="dash-label text-zinc-500 uppercase text-[10px] mb-1">{m.label}</p>
                                            <p className={`text-xl font-bold tabular-nums ${m.bad && Number(m.value) > 10 ? 'text-rose-400' : 'text-white'}`}>{m.value}{m.suffix}</p>
                                        </div>
                                    ))}
                                </div>
                                <div className="overflow-x-auto max-h-64 overflow-y-auto custom-scrollbar">
                                    <table className="w-full text-left dash-body text-zinc-400">
                                        <thead className="sticky top-0 bg-zinc-900/95 z-10">
                                            <tr className="border-b border-zinc-700">
                                                <th className="pb-2 pr-4 dash-label text-zinc-500">Vendor</th>
                                                <th className="pb-2 pr-4 dash-label text-zinc-500">Orders</th>
                                                <th className="pb-2 pr-4 dash-label text-zinc-500">Order growth %</th>
                                                <th className="pb-2 pr-4 dash-label text-zinc-500">Cancel %</th>
                                                <th className="pb-2 pr-4 dash-label text-zinc-500">Refund %</th>
                                                <th className="pb-2 dash-label text-zinc-500">Success %</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {(dashboardData.vendorIntelligence?.vendorOrderPerformance?.ordersPerVendor || []).slice(0, 15).map((v, i) => (
                                                <tr key={i} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                                                    <td className="py-2 pr-4 font-semibold text-zinc-200">{v.vendorName}</td>
                                                    <td className="py-2 pr-4">{v.orders}</td>
                                                    <td className="py-2 pr-4">{v.orderGrowthPct}%</td>
                                                    <td className="py-2 pr-4 text-rose-300/90">{v.cancellationRatePct}%</td>
                                                    <td className="py-2 pr-4 text-amber-300/90">{v.refundRatePct}%</td>
                                                    <td className="py-2 text-emerald-300/90">{v.successfulOrderRatePct}%</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>

                        {/* 4. VENDOR QUALITY METRICS */}
                        <div className="grid grid-cols-12 gap-5">
                            <div className="col-span-12 lg:col-span-8 rounded-2xl border border-zinc-600/30 bg-gradient-to-br from-zinc-700/50 via-zinc-800/60 to-zinc-800/50 shadow-lg p-6">
                                <div className="flex items-center gap-2 mb-4">
                                    <BadgeCheck size={20} className="text-cyan-400" />
                                    <h2 className="dash-section-title text-white">Vendor Quality Metrics</h2>
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-5">
                                    <div className="rounded-xl p-4 bg-zinc-800/40 border border-zinc-700/30">
                                        <p className="dash-label text-zinc-500 uppercase text-[10px] mb-1">Low-rating vendors (&lt;3★)</p>
                                        <p className="text-2xl font-bold text-rose-400 tabular-nums">{dashboardData.vendorIntelligence?.vendorQuality?.lowRatingVendorCount ?? 0}</p>
                                    </div>
                                    <div className="rounded-xl p-4 bg-zinc-800/40 border border-zinc-700/30">
                                        <p className="dash-label text-zinc-500 uppercase text-[10px] mb-1">Improving trend</p>
                                        <p className="text-2xl font-bold text-emerald-400 tabular-nums">{(dashboardData.vendorIntelligence?.vendorQuality?.ratingTrendSummary || []).filter(t => t.trend === 'improving').length}</p>
                                    </div>
                                    <div className="rounded-xl p-4 bg-zinc-800/40 border border-zinc-700/30">
                                        <p className="dash-label text-zinc-500 uppercase text-[10px] mb-1">Declining trend</p>
                                        <p className="text-2xl font-bold text-amber-400 tabular-nums">{(dashboardData.vendorIntelligence?.vendorQuality?.ratingTrendSummary || []).filter(t => t.trend === 'declining').length}</p>
                                    </div>
                                </div>
                                <div className="overflow-x-auto max-h-48 overflow-y-auto custom-scrollbar">
                                    <table className="w-full text-left dash-body text-zinc-400">
                                        <thead><tr className="border-b border-zinc-700"><th className="pb-2 dash-label text-zinc-500">Vendor</th><th className="pb-2 dash-label text-zinc-500">Rating</th><th className="pb-2 dash-label text-zinc-500">Review count</th><th className="pb-2 dash-label text-zinc-500">Trend</th></tr></thead>
                                        <tbody>
                                            {(dashboardData.vendorIntelligence?.vendorQuality?.reviewCountPerVendor || []).filter(q => q.reviewCount > 0).slice(0, 10).map((q, i) => (
                                                <tr key={i} className="border-b border-zinc-800/50">
                                                    <td className="py-2 font-semibold text-zinc-200">{q.vendorName}</td>
                                                    <td className="py-2">{q.rating?.toFixed(1) ?? '—'}</td>
                                                    <td className="py-2">{q.reviewCount}</td>
                                                    <td className="py-2">
                                                        {(() => {
                                                            const t = (dashboardData.vendorIntelligence?.vendorQuality?.ratingTrendSummary || []).find(x => x.vendorId === q.vendorId);
                                                            return t ? <span className={t.trend === 'improving' ? 'text-emerald-400' : t.trend === 'declining' ? 'text-amber-400' : 'text-zinc-500'}>{t.trend}</span> : '—';
                                                        })()}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                            <div className="col-span-12 lg:col-span-4 rounded-2xl border border-zinc-600/30 bg-gradient-to-br from-zinc-700/50 via-zinc-800/60 to-zinc-800/50 shadow-lg p-6 flex flex-col">
                                <h3 className="dash-card-title text-zinc-300 uppercase tracking-wider mb-4">Rating trend summary</h3>
                                <div className="space-y-2 flex-1">
                                    {(dashboardData.vendorIntelligence?.vendorQuality?.ratingTrendSummary || []).map((t, i) => (
                                        <div key={i} className="flex justify-between items-center p-2 rounded-lg bg-zinc-800/40">
                                            <span className="dash-body text-zinc-300 truncate max-w-[140px]">{t.vendorName}</span>
                                            <span className={`dash-label px-2 py-0.5 rounded ${t.trend === 'improving' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>{t.trend}</span>
                                        </div>
                                    ))}
                                    {(dashboardData.vendorIntelligence?.vendorQuality?.ratingTrendSummary || []).length === 0 && <p className="dash-caption text-zinc-600">No trend data yet.</p>}
                                </div>
                            </div>
                        </div>

                        {/* 5. VENDOR CATEGORY METRICS */}
                        <div className="rounded-2xl border border-zinc-600/30 bg-gradient-to-br from-zinc-700/50 via-zinc-800/60 to-zinc-800/50 shadow-lg p-6">
                            <div className="flex items-center gap-2 mb-5">
                                <TagsIcon size={20} className="text-pink-400" />
                                <h2 className="dash-section-title text-white">Vendor Category Metrics</h2>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
                                <div className="rounded-xl p-4 bg-zinc-800/40 border border-amber-500/20">
                                    <p className="dash-label text-zinc-500 uppercase text-[10px] mb-1">Electronics vendors</p>
                                    <p className="text-xl font-bold text-amber-400 tabular-nums">{dashboardData.vendorIntelligence?.vendorCategory?.vendorCountByCategory?.electronics ?? 0}</p>
                                </div>
                                <div className="rounded-xl p-4 bg-zinc-800/40 border border-pink-500/20">
                                    <p className="dash-label text-zinc-500 uppercase text-[10px] mb-1">Fashion vendors</p>
                                    <p className="text-xl font-bold text-pink-400 tabular-nums">{dashboardData.vendorIntelligence?.vendorCategory?.vendorCountByCategory?.fashion ?? 0}</p>
                                </div>
                                <div className="rounded-xl p-4 bg-zinc-800/40 border border-zinc-700/30">
                                    <p className="dash-label text-zinc-500 uppercase text-[10px] mb-1">Revenue (Electronics)</p>
                                    <p className="text-lg font-bold text-white tabular-nums">{currency}{(dashboardData.vendorIntelligence?.vendorCategory?.revenueByVendorCategory?.electronics ?? 0).toLocaleString()}</p>
                                </div>
                                <div className="rounded-xl p-4 bg-zinc-800/40 border border-zinc-700/30">
                                    <p className="dash-label text-zinc-500 uppercase text-[10px] mb-1">Revenue (Fashion)</p>
                                    <p className="text-lg font-bold text-white tabular-nums">{currency}{(dashboardData.vendorIntelligence?.vendorCategory?.revenueByVendorCategory?.fashion ?? 0).toLocaleString()}</p>
                                </div>
                                <div className="rounded-xl p-4 bg-zinc-800/40 border border-zinc-700/30">
                                    <p className="dash-label text-zinc-500 uppercase text-[10px] mb-1">Orders (Electronics)</p>
                                    <p className="text-xl font-bold text-white tabular-nums">{(dashboardData.vendorIntelligence?.vendorCategory?.ordersByVendorCategory?.electronics ?? 0).toLocaleString()}</p>
                                </div>
                                <div className="rounded-xl p-4 bg-zinc-800/40 border border-zinc-700/30">
                                    <p className="dash-label text-zinc-500 uppercase text-[10px] mb-1">Orders (Fashion)</p>
                                    <p className="text-xl font-bold text-white tabular-nums">{(dashboardData.vendorIntelligence?.vendorCategory?.ordersByVendorCategory?.fashion ?? 0).toLocaleString()}</p>
                                </div>
                                <div className="rounded-xl p-4 bg-zinc-800/40 border border-emerald-500/20">
                                    <p className="dash-label text-zinc-500 uppercase text-[10px] mb-1">Category growth % (Electronics)</p>
                                    <p className="text-xl font-bold text-emerald-400 tabular-nums">{formatSignedPercent(dashboardData.vendorIntelligence?.vendorCategory?.categoryWiseVendorGrowthPct?.electronics ?? 0)}</p>
                                </div>
                                <div className="rounded-xl p-4 bg-zinc-800/40 border border-emerald-500/20">
                                    <p className="dash-label text-zinc-500 uppercase text-[10px] mb-1">Category growth % (Fashion)</p>
                                    <p className="text-xl font-bold text-emerald-400 tabular-nums">{formatSignedPercent(dashboardData.vendorIntelligence?.vendorCategory?.categoryWiseVendorGrowthPct?.fashion ?? 0)}</p>
                                </div>
                            </div>
                        </div>

                        {/* 6. INVENTORY RELIABILITY */}
                        <div className="rounded-2xl border border-zinc-600/30 bg-gradient-to-br from-zinc-700/50 via-zinc-800/60 to-zinc-800/50 shadow-lg p-6">
                            <div className="flex items-center gap-2 mb-5">
                                <PackageIcon size={20} className="text-violet-400" />
                                <h2 className="dash-section-title text-white">Inventory Reliability</h2>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
                                <div className="rounded-xl p-4 bg-zinc-800/40 border border-zinc-700/30">
                                    <p className="dash-label text-zinc-500 uppercase text-[10px] mb-1">Vendors with OOS products</p>
                                    <p className="text-2xl font-bold text-white tabular-nums">{(dashboardData.vendorIntelligence?.inventoryReliability?.vendorsWithOutOfStock || []).length}</p>
                                </div>
                                <div className="rounded-xl p-4 bg-zinc-800/40 border border-zinc-700/30">
                                    <p className="dash-label text-zinc-500 uppercase text-[10px] mb-1">Low stock alert count</p>
                                    <p className="text-2xl font-bold text-amber-400 tabular-nums">{dashboardData.vendorIntelligence?.inventoryReliability?.lowStockAlertCount ?? 0}</p>
                                </div>
                                <div className="rounded-xl p-4 bg-zinc-800/40 border border-rose-500/20">
                                    <p className="dash-label text-zinc-500 uppercase text-[10px] mb-1">Revenue at risk (stockout)</p>
                                    <p className="text-xl font-bold text-rose-400 tabular-nums">{currency}{(dashboardData.vendorIntelligence?.inventoryReliability?.revenueAtRiskStockout ?? 0).toLocaleString()}</p>
                                </div>
                            </div>
                            <div className="overflow-x-auto max-h-40 overflow-y-auto custom-scrollbar">
                                <table className="w-full text-left dash-body text-zinc-400">
                                    <thead><tr className="border-b border-zinc-700"><th className="pb-2 dash-label text-zinc-500">Vendor</th><th className="pb-2 dash-label text-zinc-500">% products OOS</th><th className="pb-2 dash-label text-zinc-500">Out of stock</th><th className="pb-2 dash-label text-zinc-500">Total products</th></tr></thead>
                                    <tbody>
                                        {(dashboardData.vendorIntelligence?.inventoryReliability?.pctProductsOutOfStockPerVendor || []).slice(0, 10).map((v, i) => (
                                            <tr key={i} className="border-b border-zinc-800/50">
                                                <td className="py-2 font-semibold text-zinc-200">{v.vendorName}</td>
                                                <td className="py-2 text-amber-400">{v.pct}%</td>
                                                <td className="py-2">{v.outOfStock}</td>
                                                <td className="py-2">{v.total}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* 7. AI-BASED VENDOR METRICS */}
                        <div className="rounded-2xl border border-zinc-600/30 bg-gradient-to-br from-zinc-700/50 via-zinc-800/60 to-zinc-800/50 shadow-lg overflow-hidden border-t-2 border-t-amber-500/30">
                            <div className="p-5 border-b border-zinc-700/50 flex items-center gap-2">
                                <Brain size={20} className="text-amber-400" />
                                <h2 className="dash-section-title text-white">AI-Based Vendor Metrics</h2>
                            </div>
                            <div className="p-5 space-y-6">
                                <div>
                                    <h3 className="dash-card-title text-zinc-300 uppercase tracking-wider mb-3">Vendor Risk Score (0–100)</h3>
                                    <div className="overflow-x-auto max-h-44 overflow-y-auto custom-scrollbar">
                                        <div className="flex flex-wrap gap-2">
                                            {(dashboardData.vendorIntelligence?.aiVendorMetrics?.vendorRiskScores || []).slice(0, 20).map((v, i) => (
                                                <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-zinc-800/60 border border-zinc-700/40">
                                                    <span className="dash-body text-zinc-300 truncate max-w-[120px]">{v.vendorName}</span>
                                                    <div className="w-14 h-2 bg-zinc-700 rounded-full overflow-hidden">
                                                        <div className={`h-full rounded-full ${v.riskScore > 60 ? 'bg-rose-500' : v.riskScore > 30 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${v.riskScore}%` }} />
                                                    </div>
                                                    <span className={`text-sm font-bold tabular-nums ${v.riskScore > 60 ? 'text-rose-400' : v.riskScore > 30 ? 'text-amber-400' : 'text-emerald-400'}`}>{v.riskScore}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <div className="rounded-xl p-4 bg-zinc-800/40 border border-zinc-700/30">
                                        <h4 className="dash-card-title text-zinc-300 mb-2 flex items-center gap-2"><RefreshCw size={14} /> Refund spike detection</h4>
                                        <ul className="space-y-1.5 max-h-28 overflow-y-auto custom-scrollbar">
                                            {(dashboardData.vendorIntelligence?.aiVendorMetrics?.refundSpikeDetection || []).length === 0 ? <li className="dash-caption text-zinc-600">None detected</li> : (dashboardData.vendorIntelligence?.aiVendorMetrics?.refundSpikeDetection || []).map((x, i) => <li key={i} className="dash-body text-amber-400">{x.vendorName}</li>)}
                                        </ul>
                                    </div>
                                    <div className="rounded-xl p-4 bg-zinc-800/40 border border-zinc-700/30">
                                        <h4 className="dash-card-title text-zinc-300 mb-2 flex items-center gap-2"><XCircle size={14} /> Cancellation spike detection</h4>
                                        <ul className="space-y-1.5 max-h-28 overflow-y-auto custom-scrollbar">
                                            {(dashboardData.vendorIntelligence?.aiVendorMetrics?.cancellationSpikeDetection || []).length === 0 ? <li className="dash-caption text-zinc-600">None detected</li> : (dashboardData.vendorIntelligence?.aiVendorMetrics?.cancellationSpikeDetection || []).map((x, i) => <li key={i} className="dash-body text-rose-400">{x.vendorName}</li>)}
                                        </ul>
                                    </div>
                                    <div className="rounded-xl p-4 bg-zinc-800/40 border border-zinc-700/30">
                                        <h4 className="dash-card-title text-zinc-300 mb-2 flex items-center gap-2"><TrendingDown size={14} /> Sudden revenue drop (&gt;20%)</h4>
                                        <ul className="space-y-1.5 max-h-28 overflow-y-auto custom-scrollbar">
                                            {(dashboardData.vendorIntelligence?.aiVendorMetrics?.suddenRevenueDropDetection || []).length === 0 ? <li className="dash-caption text-zinc-600">None detected</li> : (dashboardData.vendorIntelligence?.aiVendorMetrics?.suddenRevenueDropDetection || []).map((x, i) => <li key={i} className="dash-body text-rose-400">{x.vendorName} ({x.dropPct}%)</li>)}
                                        </ul>
                                    </div>
                                    <div className="rounded-xl p-4 bg-zinc-800/40 border border-zinc-700/30">
                                        <h4 className="dash-card-title text-zinc-300 mb-2 flex items-center gap-2"><Activity size={14} /> Abnormal order spike</h4>
                                        <ul className="space-y-1.5 max-h-28 overflow-y-auto custom-scrollbar">
                                            {(dashboardData.vendorIntelligence?.aiVendorMetrics?.abnormalOrderSpikeDetection || []).length === 0 ? <li className="dash-caption text-zinc-600">None detected</li> : (dashboardData.vendorIntelligence?.aiVendorMetrics?.abnormalOrderSpikeDetection || []).map((x, i) => <li key={i} className="dash-body text-amber-400">{x.vendorName} (+{x.spikePct}%)</li>)}
                                        </ul>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <div className="rounded-xl p-4 bg-zinc-800/40 border border-rose-500/20">
                                        <h4 className="dash-card-title text-zinc-300 mb-2 flex items-center gap-2"><AlertTriangle size={14} /> Self-purchase pattern detection</h4>
                                        <ul className="space-y-1.5 max-h-24 overflow-y-auto custom-scrollbar">
                                            {(dashboardData.vendorIntelligence?.aiVendorMetrics?.selfPurchasePatternDetection || []).length === 0 ? <li className="dash-caption text-zinc-600">None detected</li> : (dashboardData.vendorIntelligence?.aiVendorMetrics?.selfPurchasePatternDetection || []).map((x, i) => <li key={i} className="dash-body text-rose-400">{x.vendorName} ({x.selfOrderCount} orders)</li>)}
                                        </ul>
                                    </div>
                                    <div className="rounded-xl p-4 bg-zinc-800/40 border border-amber-500/20">
                                        <h4 className="dash-card-title text-zinc-300 mb-2 flex items-center gap-2"><Eye size={14} /> Review manipulation suspicion</h4>
                                        <ul className="space-y-1.5 max-h-24 overflow-y-auto custom-scrollbar">
                                            {(dashboardData.vendorIntelligence?.aiVendorMetrics?.reviewManipulationSuspicion || []).length === 0 ? <li className="dash-caption text-zinc-600">None detected</li> : (dashboardData.vendorIntelligence?.aiVendorMetrics?.reviewManipulationSuspicion || []).map((x, i) => <li key={i} className="dash-body text-amber-400">{x.vendorName} ({x.fiveStarShare}% 5★)</li>)}
                                        </ul>
                                    </div>
                                </div>
                                <div>
                                    <h4 className="dash-card-title text-zinc-300 mb-3">Revenue volatility index (per vendor)</h4>
                                    <div className="flex flex-wrap gap-2 max-h-28 overflow-y-auto custom-scrollbar">
                                        {(dashboardData.vendorIntelligence?.aiVendorMetrics?.revenueVolatilityIndex || []).filter(v => v.volatilityIndex > 0).slice(0, 15).map((v, i) => (
                                            <div key={i} className="px-3 py-1.5 rounded-lg bg-zinc-800/60 border border-zinc-700/40 flex items-center gap-2">
                                                <span className="dash-body text-zinc-400 truncate max-w-[100px]">{v.vendorName}</span>
                                                <span className={`text-sm font-bold ${v.volatilityIndex > 40 ? 'text-rose-400' : v.volatilityIndex > 20 ? 'text-amber-400' : 'text-zinc-500'}`}>{v.volatilityIndex}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <h4 className="dash-card-title text-zinc-300 mb-3">Vendor default probability (predictive)</h4>
                                    <div className="overflow-x-auto max-h-40 overflow-y-auto custom-scrollbar">
                                        <table className="w-full text-left dash-body text-zinc-400">
                                            <thead><tr className="border-b border-zinc-700"><th className="pb-2 dash-label text-zinc-500">Vendor</th><th className="pb-2 dash-label text-zinc-500">Default prob. %</th><th className="pb-2 dash-label text-zinc-500">Risk score</th></tr></thead>
                                            <tbody>
                                                {(dashboardData.vendorIntelligence?.aiVendorMetrics?.vendorDefaultProbability || []).filter(v => v.defaultProbability > 20).sort((a, b) => b.defaultProbability - a.defaultProbability).slice(0, 10).map((v, i) => (
                                                    <tr key={i} className="border-b border-zinc-800/50">
                                                        <td className="py-2 font-semibold text-zinc-200">{v.vendorName}</td>
                                                        <td className={`py-2 font-bold ${v.defaultProbability >= 50 ? 'text-rose-400' : 'text-amber-400'}`}>{v.defaultProbability}%</td>
                                                        <td className="py-2">{v.riskScore}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'users' && (
                    <div className="admin-dashboard-content space-y-8 animate-fadeIn">
                        {/* User Growth Metrics — KPI style */}
                        <div className="rounded-2xl border border-zinc-600/30 bg-gradient-to-br from-zinc-700/50 via-zinc-800/60 to-zinc-800/50 shadow-lg overflow-hidden">
                            <div className="p-5 border-b border-zinc-700/50 flex items-center gap-2">
                                <TrendingUp size={20} className="text-amber-400" />
                                <h2 className="dash-section-title text-white">User Growth Metrics</h2>
                            </div>
                            <div className="p-5">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
                                    <div className="rounded-xl p-4 bg-zinc-800/40 border border-zinc-700/30">
                                        <p className="dash-label text-zinc-500 uppercase text-[10px] mb-1">User growth %</p>
                                        <p className="text-xl font-bold text-white tabular-nums">{dashboardData.userIntelligence?.userGrowthMetrics?.userGrowthPercent ?? 0}%</p>
                                    </div>
                                    <div className="rounded-xl p-4 bg-zinc-800/40 border border-zinc-700/30">
                                        <p className="dash-label text-zinc-500 uppercase text-[10px] mb-1">New vs returning ratio</p>
                                        <p className="text-xl font-bold text-amber-400 tabular-nums">{dashboardData.userIntelligence?.userGrowthMetrics?.newVsReturningRatio ?? 0}</p>
                                    </div>
                                    <div className="rounded-xl p-4 bg-zinc-800/40 border border-emerald-500/20">
                                        <p className="dash-label text-zinc-500 uppercase text-[10px] mb-1">Active (30d)</p>
                                        <p className="text-xl font-bold text-emerald-400 tabular-nums">{(dashboardData.userKpi?.active ?? 0).toLocaleString()}</p>
                                    </div>
                                    <div className="rounded-xl p-4 bg-zinc-800/40 border border-cyan-500/20">
                                        <p className="dash-label text-zinc-500 uppercase text-[10px] mb-1">New users (30d)</p>
                                        <p className="text-xl font-bold text-cyan-400 tabular-nums">{(dashboardData.userKpi?.new ?? 0).toLocaleString()}</p>
                                    </div>
                                </div>
                                <div className="h-[260px] -ml-2">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <ComposedChart data={dashboardData.userIntelligence?.userGrowthMetrics?.growthOverTime ?? dashboardData.userTrend ?? []}>
                                            <defs><linearGradient id="colorNewUsers" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.35} /><stop offset="95%" stopColor="#10b981" stopOpacity={0} /></linearGradient></defs>
                                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(63,63,70,0.4)" vertical={false} />
                                            <XAxis dataKey="name" stroke="#71717a" fontSize={10} tickLine={false} axisLine={false} />
                                            <YAxis stroke="#71717a" fontSize={10} tickLine={false} axisLine={false} />
                                            <Tooltip wrapperStyle={{ zIndex: 9999 }} contentStyle={{ backgroundColor: "rgba(18,18,20,0.98)", border: "1px solid rgba(63,63,70,0.6)", borderRadius: "12px", color: "#e4e4e7" }} labelStyle={{ color: "#e4e4e7" }} />
                                            <Area type="monotone" dataKey="newUsers" stroke="#10b981" strokeWidth={2} fill="url(#colorNewUsers)" name="New Users" />
                                            <Line type="monotone" dataKey="activeUsers" stroke="#3b82f6" strokeWidth={2} dot={false} name="Active Users" />
                                        </ComposedChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>

                        {/* User Revenue Metrics — KPI style */}
                        <div className="rounded-2xl border border-zinc-600/30 bg-gradient-to-br from-zinc-700/50 via-zinc-800/60 to-zinc-800/50 shadow-lg overflow-hidden">
                            <div className="p-5 border-b border-zinc-700/50 flex items-center gap-2">
                                <DollarSign size={20} className="text-amber-400" />
                                <h2 className="dash-section-title text-white">User Revenue Metrics</h2>
                            </div>
                            <div className="p-5">
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                                    {[
                                        { label: "Revenue by new users", value: currency + (dashboardData.userIntelligence?.userRevenueMetrics?.revenueByNewUsers ?? 0).toLocaleString(), border: "border-amber-500/20", color: "text-amber-400" },
                                        { label: "Revenue by returning", value: currency + (dashboardData.userIntelligence?.userRevenueMetrics?.revenueByReturningUsers ?? 0).toLocaleString(), border: "border-emerald-500/20", color: "text-emerald-400" },
                                        { label: "Top users rev. contribution %", value: (dashboardData.userIntelligence?.userRevenueMetrics?.topUsersRevenueContributionPercent ?? 0) + "%", border: "border-zinc-700/30", color: "text-white" },
                                        { label: "High-value users count", value: (dashboardData.userIntelligence?.userRevenueMetrics?.highValueUsersCount ?? 0).toString(), border: "border-violet-500/20", color: "text-violet-400" },
                                        { label: "Orders per user (avg)", value: (dashboardData.userIntelligence?.userRevenueMetrics?.ordersPerUserAvg ?? 0).toFixed(2), border: "border-zinc-700/30", color: "text-white" },
                                        { label: "ARPU", value: currency + (dashboardData.userKpi?.arpu ?? 0).toFixed(0), border: "border-cyan-500/20", color: "text-cyan-400" },
                                    ].map((m, i) => (
                                        <div key={i} className={"rounded-xl p-4 bg-zinc-800/40 border " + m.border}>
                                            <p className="dash-label text-zinc-500 uppercase text-[10px] mb-1">{m.label}</p>
                                            <p className={"text-lg font-bold tabular-nums " + m.color}>{m.value}</p>
                                        </div>
                                    ))}
                                </div>
                                <div className="mt-4 rounded-xl p-4 bg-zinc-800/40 border border-zinc-700/30">
                                    <h4 className="dash-card-title text-zinc-300 uppercase tracking-wider mb-3">High-value users</h4>
                                    <div className="flex flex-wrap gap-2 max-h-28 overflow-y-auto custom-scrollbar">
                                        {(dashboardData.highValueUsers || []).map((u, i) => (
                                            <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-800/60 border border-zinc-700/40">
                                                <span className="dash-body text-zinc-300 truncate max-w-[100px]">{u.name}</span>
                                                <span className="text-sm font-bold text-emerald-400">{currency}{Number(u.revenue).toLocaleString()}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* User Behavior Metrics — KPI style */}
                        <div className="rounded-2xl border border-zinc-600/30 bg-gradient-to-br from-zinc-700/50 via-zinc-800/60 to-zinc-800/50 shadow-lg overflow-hidden">
                            <div className="p-5 border-b border-zinc-700/50 flex items-center gap-2">
                                <BarChart2 size={20} className="text-amber-400" />
                                <h2 className="dash-section-title text-white">User Behavior Metrics</h2>
                            </div>
                            <div className="p-5">
                                <div className="grid grid-cols-12 gap-5">
                                    <div className="col-span-12 lg:col-span-4">
                                        <h3 className="dash-card-title text-zinc-300 uppercase tracking-wider mb-3">Order frequency (1 / 2–5 / 5+)</h3>
                                        <div className="grid grid-cols-3 gap-3">
                                            {(dashboardData.userIntelligence?.userBehaviorMetrics?.orderFrequencyDistribution ?? dashboardData.userFreqDist ?? []).map((item, i) => (
                                                <div key={i} className="rounded-xl p-4 bg-zinc-800/40 border border-zinc-700/30 text-center">
                                                    <p className="text-xl font-bold text-white tabular-nums">{item.value}</p>
                                                    <p className="dash-label text-zinc-500 text-[10px] uppercase">{item.name}</p>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="grid grid-cols-2 gap-3 mt-4">
                                            <div className="rounded-xl p-4 bg-zinc-800/40 border border-zinc-700/30">
                                                <p className="dash-label text-zinc-500 uppercase text-[10px] mb-1">Avg orders per user</p>
                                                <p className="text-xl font-bold text-white tabular-nums">{dashboardData.userIntelligence?.userBehaviorMetrics?.avgOrdersPerUser ?? 0}</p>
                                            </div>
                                            <div className="rounded-xl p-4 bg-zinc-800/40 border border-cyan-500/20">
                                                <p className="dash-label text-zinc-500 uppercase text-[10px] mb-1">Avg days between orders</p>
                                                <p className="text-xl font-bold text-cyan-400 tabular-nums">{(dashboardData.userIntelligence?.userBehaviorMetrics?.avgDaysBetweenOrders ?? 0)} days</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="col-span-12 lg:col-span-4">
                                        <h3 className="dash-card-title text-zinc-300 uppercase tracking-wider mb-3">Category preference</h3>
                                        <div className="h-[140px]">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <PieChart>
                                                    <Pie data={dashboardData.userIntelligence?.userBehaviorMetrics?.categoryPreference ?? dashboardData.userCatSplit ?? []} cx="50%" cy="50%" innerRadius={36} outerRadius={56} paddingAngle={4} dataKey="value" nameKey="name">
                                                        {(dashboardData.userIntelligence?.userBehaviorMetrics?.categoryPreference ?? dashboardData.userCatSplit ?? []).map((entry, index) => (
                                                            <Cell key={"cell-" + index} fill={entry.color || (index === 0 ? "#3b82f6" : "#ec4899")} stroke="none" />
                                                        ))}
                                                    </Pie>
                                                    <Tooltip wrapperStyle={{ zIndex: 9999 }} contentStyle={{ backgroundColor: "#18181b", border: "1px solid rgba(63,63,70,0.6)", borderRadius: "8px", color: "#e4e4e7" }} labelStyle={{ color: "#e4e4e7" }} />
                                                </PieChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>
                                    <div className="col-span-12 lg:col-span-4">
                                        <h3 className="dash-card-title text-zinc-300 uppercase tracking-wider mb-3">Payment method preference</h3>
                                        <div className="space-y-2">
                                            {(dashboardData.userIntelligence?.userBehaviorMetrics?.paymentMethodPreference ?? []).map((pm, i) => (
                                                <div key={i} className="flex justify-between items-center p-2 rounded-lg bg-zinc-800/40 border border-zinc-700/30">
                                                    <span className="dash-body text-zinc-400">{pm.name}</span>
                                                    <span className="font-bold text-white tabular-nums">{pm.count} <span className="text-zinc-500 font-normal">({(pm.percent ?? 0).toFixed(0)}%)</span></span>
                                                </div>
                                            ))}
                                            {(!dashboardData.userIntelligence?.userBehaviorMetrics?.paymentMethodPreference?.length) && <p className="dash-caption text-zinc-600">No data</p>}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* User Conversion Metrics — KPI style */}
                        <div className="rounded-2xl border border-zinc-600/30 bg-gradient-to-br from-zinc-700/50 via-zinc-800/60 to-zinc-800/50 shadow-lg overflow-hidden">
                            <div className="p-5 border-b border-zinc-700/50 flex items-center gap-2">
                                <Target size={20} className="text-amber-400" />
                                <h2 className="dash-section-title text-white">User Conversion Metrics</h2>
                            </div>
                            <div className="p-5">
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                    <div className="rounded-xl p-5 bg-zinc-800/40 border border-emerald-500/20 border-t-2 border-t-emerald-500/30">
                                        <p className="dash-label text-zinc-500 uppercase text-[10px] mb-1">Registration → purchase %</p>
                                        <p className="text-2xl font-bold text-emerald-400 tabular-nums">{(dashboardData.userIntelligence?.userConversionMetrics?.registrationToPurchaseRate ?? 0)}%</p>
                                    </div>
                                    <div className="rounded-xl p-5 bg-zinc-800/40 border border-zinc-700/30">
                                        <p className="dash-label text-zinc-500 uppercase text-[10px] mb-1">Cart → purchase %</p>
                                        <p className="text-2xl font-bold text-zinc-400 tabular-nums">{dashboardData.userIntelligence?.userConversionMetrics?.cartToPurchaseRate != null ? dashboardData.userIntelligence.userConversionMetrics.cartToPurchaseRate + "%" : "N/A"}</p>
                                        <p className="dash-caption text-zinc-600 text-[10px] mt-1">If cart data exists</p>
                                    </div>
                                    <div className="rounded-xl p-5 bg-zinc-800/40 border border-rose-500/20">
                                        <p className="dash-label text-zinc-500 uppercase text-[10px] mb-1">Drop-off % (registered → active)</p>
                                        <p className="text-2xl font-bold text-rose-400 tabular-nums">{(dashboardData.userIntelligence?.userConversionMetrics?.dropOffRegisteredToActive ?? 0)}%</p>
                                    </div>
                                    <div className="rounded-xl p-5 bg-zinc-800/40 border border-amber-500/20">
                                        <p className="dash-label text-zinc-500 uppercase text-[10px] mb-1">Drop-off % (active → repeat)</p>
                                        <p className="text-2xl font-bold text-amber-400 tabular-nums">{(dashboardData.userIntelligence?.userConversionMetrics?.dropOffActiveToRepeat ?? 0)}%</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Cohort & Retention Metrics — KPI style */}
                        <div className="rounded-2xl border border-zinc-600/30 bg-gradient-to-br from-zinc-700/50 via-zinc-800/60 to-zinc-800/50 shadow-lg overflow-hidden">
                            <div className="p-5 border-b border-zinc-700/50 flex items-center gap-2">
                                <Layers size={20} className="text-amber-400" />
                                <h2 className="dash-section-title text-white">Cohort & Retention Metrics</h2>
                            </div>
                            <div className="p-5">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
                                    <div className="rounded-xl p-4 bg-zinc-800/40 border border-emerald-500/20">
                                        <p className="dash-label text-zinc-500 uppercase text-[10px] mb-1">Monthly cohort retention %</p>
                                        <p className="text-xl font-bold text-emerald-400 tabular-nums">{(dashboardData.userIntelligence?.cohortRetentionMetrics?.monthlyCohortRetentionPercent ?? 0)}%</p>
                                    </div>
                                    <div className="rounded-xl p-4 bg-zinc-800/40 border border-rose-500/20">
                                        <p className="dash-label text-zinc-500 uppercase text-[10px] mb-1">Churn rate %</p>
                                        <p className="text-xl font-bold text-rose-400 tabular-nums">{(dashboardData.userIntelligence?.cohortRetentionMetrics?.churnRatePercent ?? 0)}%</p>
                                    </div>
                                    <div className="rounded-xl p-4 bg-zinc-800/40 border border-amber-500/20">
                                        <p className="dash-label text-zinc-500 uppercase text-[10px] mb-1">Inactive users count</p>
                                        <p className="text-xl font-bold text-amber-400 tabular-nums">{(dashboardData.userIntelligence?.cohortRetentionMetrics?.inactiveUsersCount ?? 0).toLocaleString()}</p>
                                        <p className="dash-caption text-zinc-600 text-[10px] mt-0.5">&gt; {(dashboardData.userIntelligence?.cohortRetentionMetrics?.inactiveDaysThreshold ?? 30)} days</p>
                                    </div>
                                </div>
                                <h3 className="dash-card-title text-zinc-300 uppercase tracking-wider mb-3">Revenue per cohort</h3>
                                <div className="overflow-x-auto max-h-48 overflow-y-auto custom-scrollbar">
                                    <table className="w-full text-left dash-body text-zinc-400">
                                        <thead><tr className="border-b border-zinc-700"><th className="pb-2 dash-label text-zinc-500">Cohort</th><th className="pb-2 dash-label text-zinc-500">Users</th><th className="pb-2 dash-label text-zinc-500">Revenue</th><th className="pb-2 dash-label text-zinc-500">Retention %</th></tr></thead>
                                        <tbody>
                                            {(dashboardData.userIntelligence?.cohortRetentionMetrics?.revenuePerCohort ?? []).map((c, i) => (
                                                <tr key={i} className="border-b border-zinc-800/50">
                                                    <td className="py-2 font-semibold text-zinc-200">{c.cohort}</td>
                                                    <td className="py-2">{c.userCount}</td>
                                                    <td className="py-2 text-emerald-400">{currency}{Number(c.revenue).toLocaleString()}</td>
                                                    <td className="py-2">{(c.retentionPercent ?? 0).toFixed(1)}%</td>
                                                </tr>
                                            ))}
                                            {(!dashboardData.userIntelligence?.cohortRetentionMetrics?.revenuePerCohort?.length) && <tr><td colSpan={4} className="py-4 dash-caption text-zinc-600 text-center">No cohort data yet</td></tr>}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>

                        {/* AI-Based User Metrics — KPI style */}
                        <div className="rounded-2xl border border-zinc-600/30 bg-gradient-to-br from-zinc-700/50 via-zinc-800/60 to-zinc-800/50 shadow-lg overflow-hidden border-t-2 border-t-amber-500/30">
                            <div className="p-5 border-b border-zinc-700/50 flex items-center gap-2">
                                <Brain size={20} className="text-amber-400" />
                                <h2 className="dash-section-title text-white">AI-Based User Metrics</h2>
                            </div>
                            <div className="p-5 space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="rounded-xl p-4 bg-zinc-800/40 border border-emerald-500/20">
                                        <h4 className="dash-card-title text-zinc-300 mb-1 flex items-center gap-2"><Gauge size={14} /> LTV prediction</h4>
                                        <p className="text-2xl font-bold text-emerald-400 tabular-nums">{currency}{(dashboardData.userIntelligence?.aiUserMetrics?.ltvPrediction ?? 0).toLocaleString()}</p>
                                        <p className="dash-caption text-zinc-500 text-[10px] mt-1">AOV × avg orders per user</p>
                                    </div>
                                    <div className="rounded-xl p-4 bg-zinc-800/40 border border-zinc-700/30">
                                        <h4 className="dash-card-title text-zinc-300 mb-2 flex items-center gap-2"><Award size={14} /> High-value user probability (top 20)</h4>
                                        <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto custom-scrollbar">
                                            {(dashboardData.userIntelligence?.aiUserMetrics?.highValueUserProbability ?? []).slice(0, 20).map((u, i) => (
                                                <div key={i} className="px-2 py-1 rounded-lg bg-zinc-800/60 border border-zinc-700/40 flex items-center gap-2">
                                                    <span className="dash-body text-zinc-400 truncate max-w-[80px]">{u.userName}</span>
                                                    <span className={"text-xs font-bold " + (u.score >= 70 ? "text-emerald-400" : u.score >= 40 ? "text-amber-400" : "text-zinc-500")}>{u.score}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <h4 className="dash-card-title text-zinc-300 mb-3 flex items-center gap-2"><AlertTriangle size={14} /> Churn risk score (≥30)</h4>
                                    <div className="flex flex-wrap gap-2 max-h-28 overflow-y-auto custom-scrollbar">
                                        {(dashboardData.userIntelligence?.aiUserMetrics?.churnRiskScore ?? []).map((u, i) => (
                                            <div key={i} className="px-3 py-2 rounded-xl bg-zinc-800/60 border border-zinc-700/40 flex items-center gap-2">
                                                <span className="dash-body text-zinc-300 truncate max-w-[100px]">{u.userName}</span>
                                                <div className="w-12 h-2 bg-zinc-700 rounded-full overflow-hidden">
                                                    <div className={"h-full rounded-full " + (u.churnRiskScore >= 60 ? "bg-rose-500" : "bg-amber-500")} style={{ width: u.churnRiskScore + "%" }} />
                                                </div>
                                                <span className={"text-sm font-bold " + (u.churnRiskScore >= 60 ? "text-rose-400" : "text-amber-400")}>{u.churnRiskScore}</span>
                                            </div>
                                        ))}
                                        {(dashboardData.userIntelligence?.aiUserMetrics?.churnRiskScore ?? []).length === 0 && <span className="dash-caption text-zinc-600">None above threshold</span>}
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                                    <div className="rounded-xl p-4 bg-zinc-800/40 border border-amber-500/20">
                                        <h4 className="dash-card-title text-zinc-300 mb-2 flex items-center gap-2"><Activity size={14} /> Spending anomaly</h4>
                                        <ul className="space-y-1 max-h-24 overflow-y-auto custom-scrollbar">
                                            {(dashboardData.userIntelligence?.aiUserMetrics?.spendingAnomalyDetection ?? []).length === 0 ? <li className="dash-caption text-zinc-600">None detected</li> : (dashboardData.userIntelligence?.aiUserMetrics?.spendingAnomalyDetection ?? []).map((x, i) => <li key={i} className="dash-body text-amber-400">{x.userName}</li>)}
                                        </ul>
                                    </div>
                                    <div className="rounded-xl p-4 bg-zinc-800/40 border border-rose-500/20">
                                        <h4 className="dash-card-title text-zinc-300 mb-2 flex items-center gap-2"><RefreshCw size={14} /> Refund abuse detection</h4>
                                        <ul className="space-y-1 max-h-24 overflow-y-auto custom-scrollbar">
                                            {(dashboardData.userIntelligence?.aiUserMetrics?.refundAbuseDetection ?? []).length === 0 ? <li className="dash-caption text-zinc-600">None detected</li> : (dashboardData.userIntelligence?.aiUserMetrics?.refundAbuseDetection ?? []).map((x, i) => <li key={i} className="dash-body text-rose-400">{x.userName} ({x.refundRatio}%)</li>)}
                                        </ul>
                                    </div>
                                    <div className="rounded-xl p-4 bg-zinc-800/40 border border-violet-500/20">
                                        <h4 className="dash-card-title text-zinc-300 mb-2 flex items-center gap-2"><Shield size={14} /> Multiple account pattern</h4>
                                        <ul className="space-y-1 max-h-24 overflow-y-auto custom-scrollbar">
                                            {(dashboardData.userIntelligence?.aiUserMetrics?.multipleAccountPatternDetection ?? []).length === 0 ? <li className="dash-caption text-zinc-600">None detected</li> : (dashboardData.userIntelligence?.aiUserMetrics?.multipleAccountPatternDetection ?? []).map((x, i) => <li key={i} className="dash-body text-violet-400">{x.paymentMethod}: {x.count} users</li>)}
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab !== 'revenue' && activeTab !== 'orders' && activeTab !== 'vendors' && activeTab !== 'users' && (
                    <div className="animate-fadeIn flex flex-col items-center justify-center py-28 text-center min-h-[60vh]">
                        {/* Fallback */}
                    </div>
                )}
            </div>
        </div>
    )
}
