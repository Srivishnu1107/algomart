'use client'
import { useEffect, useState } from "react"
import Loading from "@/components/Loading"
import { useAuth } from "@clerk/nextjs"
import axios from "axios"
import toast from "react-hot-toast"
import { AlertCircle } from "lucide-react"
import { usePathname } from "next/navigation"

export default function StoreOrders() {
    const [orders, setOrders] = useState([])
    const [loading, setLoading] = useState(true)
    const [selectedOrder, setSelectedOrder] = useState(null)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [cancelModal, setCancelModal] = useState({ open: false, order: null, reason: "" })
    const [rejectModal, setRejectModal] = useState({ open: false, order: null, message: "" })
    const [activeTab, setActiveTab] = useState('All')

    const { getToken } = useAuth()
    const pathname = usePathname()
    // ... existing ...

    const filteredOrders = orders.filter(o => {
        if (activeTab === 'All') return true
        if (activeTab === 'Live') return ['ORDER_PLACED', 'PROCESSING', 'SHIPPED'].includes(o.status)
        if (activeTab === 'Completed') return ['DELIVERED', 'RETURNED'].includes(o.status)
        if (activeTab === 'Requests') return ['CANCELLATION_REQUESTED', 'RETURN_REQUESTED'].includes(o.status)
        if (activeTab === 'Cancelled') return o.status === 'CANCELLED'
        return true
    })
    const isFashion = pathname?.startsWith('/fashion')
    const storeTypeParam = isFashion ? '?type=fashion' : ''
    const accentText = isFashion ? 'text-[#8B6914]' : 'text-teal-400'
    const accentBadge = isFashion ? 'bg-[#8B6914]/20 text-[#8B6914] border-[#8B6914]/30' : 'bg-teal-500/20 text-teal-400 border-teal-500/30'
    const accentRing = isFashion ? 'focus:ring-[#8B6914]/30' : 'focus:ring-teal-500/50'

    const fetchOrders = async () => {
        try {
            const token = await getToken()
            const { data } = await axios.get(`/api/store/orders${storeTypeParam}`, { headers: { Authorization: `Bearer ${token}` } })
            setOrders(data.orders || [])
        } catch (error) {
            toast.error(error?.response?.data?.error || error.message)
        } finally {
            setLoading(false)
        }
    }

    const updateOrderStatus = async (orderId, status, cancellationReason, vendorStatusMessage) => {
        try {
            const token = await getToken()
            const body = { orderId, status }
            if (cancellationReason != null) body.cancellationReason = cancellationReason
            if (vendorStatusMessage != null) body.vendorStatusMessage = vendorStatusMessage
            await axios.post(`/api/store/orders${storeTypeParam}`, body, { headers: { Authorization: `Bearer ${token}` } })
            setOrders(prev =>
                prev.map(order =>
                    order.id === orderId
                        ? {
                            ...order,
                            status,
                            ...(cancellationReason !== undefined && { cancellationReason: cancellationReason ?? order.cancellationReason }),
                            ...(vendorStatusMessage !== undefined && { vendorStatusMessage: vendorStatusMessage ?? order.vendorStatusMessage }),
                        }
                        : order
                )
            )
            toast.success('Order status updated')
        } catch (error) {
            toast.error(error?.response?.data?.error || error.message)
        }
    }

    const openModal = (order) => {
        setSelectedOrder(order)
        setIsModalOpen(true)
    }

    const closeModal = () => {
        setSelectedOrder(null)
        setIsModalOpen(false)
    }

    const openCancelModal = (order) => setCancelModal({ open: true, order, reason: "" })
    const closeCancelModal = () => setCancelModal({ open: false, order: null, reason: "" })
    const closeRejectModal = () => setRejectModal({ open: false, order: null, message: "" })

    const confirmReject = () => {
        const { order, message } = rejectModal
        const newStatus = order.status === 'RETURN_REQUESTED' ? 'DELIVERED' : 'PROCESSING'
        updateOrderStatus(order.id, newStatus, undefined, message.trim() || undefined)
        closeRejectModal()
    }

    const confirmCancel = () => {
        const reason = cancelModal.reason.trim()
        if (!reason) {
            toast.error('Please enter a cancellation reason')
            return
        }
        updateOrderStatus(cancelModal.order.id, 'CANCELLED', reason)
        closeCancelModal()
    }

    const handleStatusChange = (order, newStatus) => {
        if (newStatus === 'CANCELLED') {
            openCancelModal(order)
            return
        }
        updateOrderStatus(order.id, newStatus)
    }

    useEffect(() => {
        fetchOrders()
    }, [])

    if (loading) return <Loading />

    return (
        <div className="min-h-full pb-12">
            <h1 className="text-2xl sm:text-3xl font-bold text-zinc-100 mb-1">
                Store <span className={accentText}>Orders</span>
            </h1>
            <p className="text-sm text-zinc-500 mb-8">View and update order status</p>

            {/* Tabs */}
            <div className="flex items-center gap-2 mb-6 border-b border-zinc-700/60 overflow-x-auto no-scrollbar">
                {['All', 'Live', 'Completed', 'Requests', 'Cancelled'].map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === tab
                            ? `${accentText} border-current`
                            : 'text-zinc-500 border-transparent hover:text-zinc-300'
                            }`}
                    >
                        {tab}
                        <span className={`ml-2 px-1.5 py-0.5 rounded-full text-[10px] ${activeTab === tab ? 'bg-zinc-800' : 'bg-zinc-800/50'}`}>
                            {orders.filter(o => {
                                if (tab === 'All') return true
                                if (tab === 'Live') return ['ORDER_PLACED', 'PROCESSING', 'SHIPPED'].includes(o.status)
                                if (tab === 'Completed') return ['DELIVERED', 'RETURNED'].includes(o.status)
                                if (tab === 'Requests') return ['CANCELLATION_REQUESTED', 'RETURN_REQUESTED'].includes(o.status)
                                if (tab === 'Cancelled') return o.status === 'CANCELLED'
                                return true
                            }).length}
                        </span>
                    </button>
                ))}
            </div>

            {filteredOrders.length === 0 ? (
                <div className="rounded-xl border border-zinc-700/60 bg-zinc-900/80 p-12 text-center text-zinc-500">
                    No {activeTab.toLowerCase()} orders found
                </div>
            ) : (
                <div className="rounded-xl border border-zinc-700/60 bg-zinc-900/80 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead>
                                <tr className="border-b border-zinc-700/60 bg-zinc-800/50">
                                    {["Sr. No.", "Customer", "Products", "Total", "Status", activeTab === 'Requests' || activeTab === 'Cancelled' ? "Reason" : "Date", activeTab === 'Requests' ? "Actions" : ""].map((heading, i) => (
                                        heading && <th key={i} className="px-4 py-4 font-semibold text-zinc-300 uppercase tracking-wider">
                                            {heading}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-700/50">
                                {filteredOrders.map((order, index) => (
                                    <tr
                                        key={order.id}
                                        className="hover:bg-zinc-800/30 transition-colors cursor-pointer"
                                        onClick={() => openModal(order)}
                                    >
                                        <td className={`px-4 py-4 ${accentText} font-medium`}>{index + 1}</td>
                                        <td className="px-4 py-4 text-zinc-200">
                                            <div>
                                                <p className="font-medium text-zinc-100">{order.user?.name}</p>
                                                <p className="text-xs text-zinc-500">{order.address?.city}, {order.address?.state}</p>
                                            </div>
                                        </td>
                                        <td className="px-4 py-4">
                                            <div className="flex items-center gap-[-8px]">
                                                {order.orderItems?.slice(0, 3).map((item, i) => (
                                                    <div key={i} className="relative w-8 h-8 rounded-full border border-zinc-800 overflow-hidden -ml-2 first:ml-0 bg-zinc-800">
                                                        <img src={item.product?.images?.[0]} alt="" className="w-full h-full object-cover" />
                                                    </div>
                                                ))}
                                                {order.orderItems?.length > 3 && (
                                                    <div className="relative w-8 h-8 rounded-full border border-zinc-800 bg-zinc-800 flex items-center justify-center text-[10px] text-zinc-400 font-medium -ml-2">
                                                        +{order.orderItems.length - 3}
                                                    </div>
                                                )}
                                                <span className="ml-3 text-xs text-zinc-400">
                                                    {order.orderItems?.length} item{order.orderItems?.length !== 1 ? 's' : ''}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-4 font-medium text-zinc-200">₹{order.total}</td>
                                        <td className="px-4 py-4" onClick={e => e.stopPropagation()}>
                                            {activeTab === 'Requests' ? (
                                                <span className="px-2 py-1 text-xs font-medium rounded-lg border bg-amber-500/10 text-amber-400 border-amber-500/30 whitespace-nowrap">
                                                    {order.status === 'CANCELLATION_REQUESTED' ? 'Cancel Req' : 'Return Req'}
                                                </span>
                                            ) : (
                                                <select
                                                    value={order.status}
                                                    onChange={e => handleStatusChange(order, e.target.value)}
                                                    disabled={['CANCELLED', 'RETURNED', 'CANCELLATION_REQUESTED', 'RETURN_REQUESTED'].includes(order.status)}
                                                    className={`px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-600 text-zinc-200 text-sm focus:outline-none focus:ring-2 ${accentRing} disabled:opacity-50 disabled:cursor-not-allowed`}
                                                >
                                                    <option value="ORDER_PLACED">ORDER_PLACED</option>
                                                    <option value="PROCESSING">PROCESSING</option>
                                                    <option value="SHIPPED">SHIPPED</option>
                                                    <option value="DELIVERED">DELIVERED</option>
                                                    <option value="RETURNED">RETURNED</option>
                                                    <option value="CANCELLATION_REQUESTED" disabled>CANCEL REQ</option>
                                                    <option value="RETURN_REQUESTED" disabled>RETURN REQ</option>
                                                    <option value="CANCELLED">CANCELLED</option>
                                                </select>
                                            )}
                                        </td>
                                        <td className="px-4 py-4 text-zinc-500">
                                            {activeTab === 'Requests' || activeTab === 'Cancelled' ? (
                                                <span className="text-amber-400/90 font-medium text-xs px-2 py-1 bg-amber-500/10 border border-amber-500/20 rounded-md">
                                                    {order.cancellationReason || "No reason provided"}
                                                </span>
                                            ) : (
                                                new Date(order.createdAt).toLocaleDateString()
                                            )}
                                        </td>
                                        {activeTab === 'Requests' && (
                                            <td className="px-4 py-4" onClick={e => e.stopPropagation()}>
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => order.status === 'RETURN_REQUESTED'
                                                            ? updateOrderStatus(order.id, 'RETURNED')
                                                            : updateOrderStatus(order.id, 'CANCELLED')
                                                        }
                                                        className="p-1.5 rounded-md bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 border border-emerald-500/20 transition-colors"
                                                        title={order.status === 'RETURN_REQUESTED' ? 'Approve return' : 'Approve cancel'}
                                                    >
                                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                                    </button>
                                                    <button
                                                        onClick={() => setRejectModal({ open: true, order, message: "" })}
                                                        className="p-1.5 rounded-md bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 border border-rose-500/20 transition-colors"
                                                        title="Reject (add reason for customer)"
                                                    >
                                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                                    </button>
                                                </div>
                                            </td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Order details modal */}
            {isModalOpen && selectedOrder && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={closeModal}>
                    <div className="bg-zinc-900 border border-zinc-700 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
                        <h2 className="text-xl font-semibold text-zinc-100 mb-4 text-center">Order Details</h2>

                        {selectedOrder.cancellationReason && (
                            <div className="mb-4 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex gap-3">
                                <AlertCircle size={20} className="text-amber-400 flex-shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-sm font-medium text-amber-400">Customer reason</p>
                                    <p className="text-sm text-zinc-300 mt-1">{selectedOrder.cancellationReason}</p>
                                </div>
                            </div>
                        )}
                        {selectedOrder.vendorStatusMessage && (
                            <div className="mb-4 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 flex gap-3">
                                <AlertCircle size={20} className="text-rose-400 flex-shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-sm font-medium text-rose-400">Your message to customer</p>
                                    <p className="text-sm text-zinc-300 mt-1">{selectedOrder.vendorStatusMessage}</p>
                                </div>
                            </div>
                        )}

                        <div className="mb-4">
                            <h3 className="font-semibold text-zinc-200 mb-2">Customer</h3>
                            <p className="text-sm text-zinc-400"><span className={accentText}>Name:</span> {selectedOrder.user?.name}</p>
                            <p className="text-sm text-zinc-400"><span className={accentText}>Email:</span> {selectedOrder.user?.email}</p>
                            <p className="text-sm text-zinc-400"><span className={accentText}>Phone:</span> {selectedOrder.address?.phone}</p>
                            <p className="text-sm text-zinc-400"><span className={accentText}>Address:</span> {selectedOrder.address?.street}, {selectedOrder.address?.city}, {selectedOrder.address?.state}, {selectedOrder.address?.zip}, {selectedOrder.address?.country}</p>
                        </div>

                        <div className="mb-4">
                            <h3 className="font-semibold text-zinc-200 mb-2">Products</h3>
                            <div className="space-y-2">
                                {selectedOrder.orderItems?.map((item, i) => (
                                    <div key={i} className="flex items-center gap-4 p-3 rounded-lg bg-zinc-800/60 border border-zinc-700/50">
                                        <img src={item.product?.images?.[0]} alt={item.product?.name} className="w-16 h-16 object-cover rounded-lg" />
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-zinc-200">{item.product?.name}</p>
                                            <p className="text-sm text-zinc-500">Qty: {item.quantity} · ₹{item.price}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="mb-4 text-sm text-zinc-400">
                            <p><span className={accentText}>Payment:</span> {selectedOrder.paymentMethod}</p>
                            <p><span className={accentText}>Paid:</span> {selectedOrder.isPaid ? 'Yes' : 'No'}</p>
                            {selectedOrder.isCouponUsed && selectedOrder.coupon && (
                                <p><span className={accentText}>Coupon:</span> {selectedOrder.coupon.code} ({selectedOrder.coupon.discount}% off)</p>
                            )}
                            <p><span className={accentText}>Status:</span> {selectedOrder.status}</p>
                            <p><span className={accentText}>Date:</span> {new Date(selectedOrder.createdAt).toLocaleString()}</p>
                        </div>

                        <div className="flex justify-end">
                            <button onClick={closeModal} className="px-4 py-2 text-sm font-medium rounded-lg bg-zinc-700 hover:bg-zinc-600 text-zinc-200 transition">
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Cancellation reason modal */}
            {cancelModal.open && cancelModal.order && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={closeCancelModal}>
                    <div className="bg-zinc-900 border border-zinc-700 rounded-xl shadow-xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
                        <h3 className="text-lg font-semibold text-zinc-100 mb-2">Cancel order</h3>
                        <p className="text-sm text-zinc-400 mb-4">Please provide a reason for cancellation (required).</p>
                        <textarea
                            value={cancelModal.reason}
                            onChange={e => setCancelModal(prev => ({ ...prev, reason: e.target.value }))}
                            placeholder="e.g. Out of stock, customer request…"
                            rows={3}
                            className="w-full px-4 py-3 rounded-xl bg-zinc-800 border border-zinc-600 text-zinc-100 placeholder-zinc-500 resize-none focus:outline-none focus:ring-2 focus:ring-teal-500/50 mb-4"
                        />
                        <div className="flex gap-3 justify-end">
                            <button
                                type="button"
                                onClick={closeCancelModal}
                                className="px-4 py-2 text-sm font-medium text-zinc-300 bg-zinc-700 hover:bg-zinc-600 rounded-lg transition"
                            >
                                Back
                            </button>
                            <button
                                type="button"
                                onClick={confirmCancel}
                                disabled={!cancelModal.reason.trim()}
                                className="px-4 py-2 text-sm font-medium text-white bg-amber-600 hover:bg-amber-500 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Confirm cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Reject request modal: vendor message to customer */}
            {rejectModal.open && rejectModal.order && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={closeRejectModal}>
                    <div className="bg-zinc-900 border border-zinc-700 rounded-xl shadow-xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
                        <h3 className="text-lg font-semibold text-zinc-100 mb-2">Reject request</h3>
                        <p className="text-sm text-zinc-400 mb-4">Add a message for the customer (optional). They will see this when viewing the order.</p>
                        <textarea
                            value={rejectModal.message}
                            onChange={e => setRejectModal(prev => ({ ...prev, message: e.target.value }))}
                            placeholder="e.g. Return window has passed; Item is not eligible for return…"
                            rows={3}
                            className="w-full px-4 py-3 rounded-xl bg-zinc-800 border border-zinc-600 text-zinc-100 placeholder-zinc-500 resize-none focus:outline-none focus:ring-2 focus:ring-teal-500/50 mb-4"
                        />
                        <div className="flex gap-3 justify-end">
                            <button
                                type="button"
                                onClick={closeRejectModal}
                                className="px-4 py-2 text-sm font-medium text-zinc-300 bg-zinc-700 hover:bg-zinc-600 rounded-lg transition"
                            >
                                Back
                            </button>
                            <button
                                type="button"
                                onClick={confirmReject}
                                className="px-4 py-2 text-sm font-medium text-white bg-rose-600 hover:bg-rose-500 rounded-lg transition"
                            >
                                Reject and send message
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
