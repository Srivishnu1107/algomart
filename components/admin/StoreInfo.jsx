'use client'
import Image from "next/image"
import { MapPin, Mail, Phone } from "lucide-react"

const StoreInfo = ({store}) => {
    return (
        <div className="flex-1 space-y-3 text-sm text-zinc-400">
            <div className="flex items-center gap-4">
                <Image width={72} height={72} src={store.logo} alt={store.name} className="w-16 h-16 object-contain rounded-full border border-zinc-700 bg-zinc-900 p-1" />
                <div>
                    <div className="flex flex-wrap items-center gap-3">
                        <h3 className="text-xl font-semibold text-white">{store.name}</h3>
                        <span className="text-xs text-zinc-500">@{store.username}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                        <span className={`text-xs font-semibold px-3 py-1 rounded-full border ${
                            store.status === 'pending'
                                ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                                : store.status === 'rejected'
                                ? 'bg-red-500/10 text-red-300 border-red-500/30'
                                : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                        }`}>
                            {store.status}
                        </span>
                        {store.storeType && (
                            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700 capitalize">
                                {store.storeType}
                            </span>
                        )}
                    </div>
                </div>
            </div>

            <p className="text-zinc-400 max-w-2xl">{store.description}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <p className="flex items-center gap-2"><MapPin size={16} /> {store.address}</p>
                <p className="flex items-center gap-2"><Phone size={16} /> {store.contact}</p>
                <p className="flex items-center gap-2"><Mail size={16} /> {store.email}</p>
                <p className="text-zinc-500">
                    Applied on <span className="text-xs">{new Date(store.createdAt).toLocaleDateString()}</span>
                </p>
            </div>

            <div className="flex items-center gap-3 pt-2 text-xs text-zinc-400">
                <Image width={36} height={36} src={store.user.image} alt={store.user.name} className="w-9 h-9 rounded-full border border-zinc-700" />
                <div>
                    <p className="text-zinc-300 font-medium">{store.user.name}</p>
                    <p className="text-zinc-500">{store.user.email}</p>
                </div>
            </div>
        </div>
    )
}

export default StoreInfo