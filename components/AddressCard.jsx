
'use client'
import { MapPin, Briefcase, Home, Edit2, Trash2 } from 'lucide-react'

const AddressCard = ({ address, onEdit, onDelete, isFashion }) => {
    const { label, name, street, city, state, zip, country, phone } = address
    const categoryLabel = label === 'work' ? 'Work' : label === 'home' ? 'Home' : 'Other'

    const badgeClass = isFashion
        ? 'bg-[#8B6914]/20 text-[#8B6914] border-[#8B6914]/30'
        : 'bg-teal-500/20 text-teal-400 border-teal-500/30'
    const cardBorder = isFashion
        ? 'border-[#d4c4a8]/60 hover:border-[#c4a882]/50 hover:shadow-[#c4a882]/5'
        : 'border-zinc-700/60 hover:border-teal-500/50 hover:shadow-teal-500/5'

    return (
        <div
            className={`flex flex-col rounded-xl border p-5 transition-all duration-200 group hover:shadow-xl ${cardBorder} ${isFashion ? 'bg-white' : 'bg-zinc-900/60'}`}
        >
            <span className={`inline-block w-fit px-2.5 py-1 text-xs font-semibold rounded-lg border mb-3 ${badgeClass}`}>
                {categoryLabel}
            </span>
            <h3 className={`text-base font-semibold mb-1 ${isFashion ? 'text-[#2d1810]' : 'text-white'}`}>{name}</h3>
            <p className={`text-sm mb-1 leading-relaxed ${isFashion ? 'text-[#8B7355]' : 'text-zinc-400'}`}>
                {street}, {city}, {state} – {zip}
            </p>
            <p className={`text-sm mb-1 ${isFashion ? 'text-[#8B7355]' : 'text-zinc-400'}`}>{country}</p>
            <span className={`text-xs block mb-4 ${isFashion ? 'text-[#8B7355]' : 'text-zinc-500'}`}>Phone: {phone}</span>

            <div className={`flex gap-2 mt-auto pt-3 border-t ${isFashion ? 'border-[#d4c4a8]/50' : 'border-zinc-800/50'}`}>
                <button
                    type="button"
                    onClick={() => onEdit(address)}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-medium transition ${isFashion 
                        ? 'bg-[#f5ede3] hover:bg-[#e8ddd0] text-[#2d1810]' 
                        : 'bg-zinc-800/50 hover:bg-zinc-700 text-zinc-300'}`}
                >
                    <Edit2 size={14} />
                    Edit
                </button>
                <button
                    type="button"
                    onClick={() => onDelete(address.id)}
                    className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-xs font-medium text-red-400 transition"
                >
                    <Trash2 size={14} />
                    Delete
                </button>
            </div>
        </div>
    )
}

export default AddressCard
