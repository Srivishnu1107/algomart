'use client'
import StoreInfo from "@/components/admin/StoreInfo"
import Loading from "@/components/Loading"
import { useAuth, useUser } from "@clerk/nextjs"
import axios from "axios"
import { useEffect, useState } from "react"
import toast from "react-hot-toast"

export default function AdminStores() {

    const { user } = useUser()
    const { getToken } = useAuth()

    const [stores, setStores] = useState([])
    const [loading, setLoading] = useState(true)

    const fetchStores = async () => {
        try {
            const token = await getToken()
            const { data } = await axios.get('/api/admin/stores', {headers: { Authorization: `Bearer ${token}` }})
            setStores(data.stores)
        } catch (error) {
            toast.error(error?.response?.data?.error || error.message)
        }
        setLoading(false)
    }

    const toggleIsActive = async (storeId) => {
        try {
            const token = await getToken()
            const { data } = await axios.post('/api/admin/toggle-store', {storeId}, {headers: { Authorization: `Bearer ${token}` }})
            await fetchStores()
            toast.success(data.message)
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
                <h1 className="text-2xl sm:text-3xl font-bold text-zinc-100 mb-1">Live <span className="text-emerald-400">Stores</span></h1>
                <p className="text-sm text-zinc-500 mb-8">Monitor and toggle store availability.</p>

                {stores.length ? (
                    <div className="flex flex-col gap-4">
                        {stores.map((store) => (
                            <div key={store.id} className="rounded-2xl border border-zinc-700/60 bg-zinc-900/80 p-6 flex max-md:flex-col gap-4 md:items-end">
                                <StoreInfo store={store} />
                                <div className="flex items-center gap-3 pt-2 flex-wrap text-zinc-300">
                                    <p className="text-sm">Active</p>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            className="sr-only peer"
                                            onChange={() => toast.promise(toggleIsActive(store.id), { loading: "Updating data..." })}
                                            checked={store.isActive}
                                        />
                                        <div className="w-9 h-5 bg-zinc-700 rounded-full peer peer-checked:bg-emerald-500 transition-colors duration-200"></div>
                                        <span className="dot absolute left-1 top-1 w-3 h-3 bg-white rounded-full transition-transform duration-200 ease-in-out peer-checked:translate-x-4"></span>
                                    </label>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="rounded-2xl border border-zinc-700/60 bg-zinc-900/70 p-12 text-center text-zinc-500">
                        No stores available
                    </div>
                )}
            </div>
        </div>
    ) : <Loading />
}