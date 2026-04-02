'use client'
import StoreInfo from "@/components/admin/StoreInfo"
import Loading from "@/components/Loading"
import { useAuth, useUser } from "@clerk/nextjs"
import axios from "axios"
import { useEffect, useState } from "react"
import toast from "react-hot-toast"

export default function AdminApprove() {

    const {user} = useUser()
    const {getToken} = useAuth()
    const [stores, setStores] = useState([])
    const [loading, setLoading] = useState(true)


    const fetchStores = async () => {
        try {
            const token = await getToken()
            const { data } = await axios.get('/api/admin/approve-store', {
                 headers: { Authorization: `Bearer ${token}` }
            })
            setStores(data.stores)
        } catch (error) {
            toast.error(error?.response?.data?.error || error.message)
        }
        setLoading(false)
    }

    const handleApprove = async ({ storeId, status }) => {
        try {
            const token = await getToken()
            const { data } = await axios.post('/api/admin/approve-store', {storeId, status}, {
                 headers: { Authorization: `Bearer ${token}` }
            })
            toast.success(data.message)
            await fetchStores()
        } catch (error) {
            toast.error(error?.response?.data?.error || error.message)
        }

    }

    useEffect(() => {
        if(user){
            fetchStores()
        }
    }, [user])

    return !loading ? (
        <div className="min-h-screen bg-[#0a0a0b]">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
                <h1 className="text-2xl sm:text-3xl font-bold text-zinc-100 mb-1">Approve <span className="text-emerald-400">Stores</span></h1>
                <p className="text-sm text-zinc-500 mb-8">Review pending store applications and approve or reject.</p>

                {stores.length ? (
                    <div className="flex flex-col gap-4">
                        {stores.map((store) => (
                            <div key={store.id} className="rounded-2xl border border-zinc-700/60 bg-zinc-900/80 p-6 flex max-md:flex-col gap-4 md:items-end">
                                <StoreInfo store={store} />
                                <div className="flex gap-3 pt-2 flex-wrap">
                                    <button
                                        onClick={() => toast.promise(handleApprove({ storeId: store.id, status: 'approved' }), { loading: "approving" })}
                                        className="px-4 py-2 text-sm font-semibold text-zinc-900 bg-emerald-400 hover:bg-emerald-300 rounded-xl transition shadow-lg shadow-emerald-500/20"
                                    >
                                        Approve
                                    </button>
                                    <button
                                        onClick={() => toast.promise(handleApprove({ storeId: store.id, status: 'rejected' }), { loading: 'rejecting' })}
                                        className="px-4 py-2 text-sm font-semibold text-zinc-200 border border-zinc-700/80 rounded-xl hover:bg-zinc-800 transition"
                                    >
                                        Reject
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="rounded-2xl border border-zinc-700/60 bg-zinc-900/70 p-12 text-center text-zinc-500">
                        No applications pending
                    </div>
                )}
            </div>
        </div>
    ) : <Loading />
}