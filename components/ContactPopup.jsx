'use client'
import { X, Mail, Phone, MapPin } from 'lucide-react'
import { useEffect } from 'react'

export default function ContactPopup({ isOpen, onClose, store, isOwner, isFashion = false }) {
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden'
        } else {
            document.body.style.overflow = 'unset'
        }
        return () => {
            document.body.style.overflow = 'unset'
        }
    }, [isOpen])

    if (!isOpen || !store) return null

    const showContactInfo = !isOwner

    const accent = isFashion ? '#8B6914' : '#22c55e'

    return (
        <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${isFashion ? 'bg-black/40' : 'bg-black/60'} backdrop-blur-sm`}>
            <div className={`border rounded-2xl p-6 max-w-md w-full shadow-2xl animate-in fade-in zoom-in duration-200 ${
                isFashion
                    ? 'bg-white border-[#d4c4a8]/40'
                    : 'bg-zinc-900 border-zinc-800'
            }`}>
                <div className="flex items-center justify-between mb-6">
                    <h2 className={`text-2xl font-bold ${isFashion ? 'text-[#2d1810]' : 'text-white'}`}>Contact Information</h2>
                    <button
                        onClick={onClose}
                        className={`p-2 rounded-lg transition-colors ${isFashion ? 'hover:bg-[#f5ede3]' : 'hover:bg-zinc-800'}`}
                    >
                        <X className={`w-5 h-5 ${isFashion ? 'text-[#8B7355]' : 'text-zinc-400'}`} />
                    </button>
                </div>

                {!showContactInfo ? (
                    <p className={`text-sm ${isFashion ? 'text-[#8B7355]' : 'text-zinc-400'}`}>Contact details are only visible to store visitors.</p>
                ) : (
                <div className="space-y-4">
                    <div className={`flex items-start gap-4 p-4 rounded-xl border ${
                        isFashion ? 'bg-[#faf5f0] border-[#d4c4a8]/30' : 'bg-zinc-800/50 border-zinc-700/50'
                    }`}>
                        <div className="p-2 rounded-lg" style={{ backgroundColor: `${accent}20` }}>
                            <Mail className="w-5 h-5" style={{ color: accent }} />
                        </div>
                        <div className="flex-1">
                            <p className={`text-xs uppercase tracking-wide mb-1 ${isFashion ? 'text-[#8B7355]' : 'text-zinc-400'}`}>Email</p>
                            <a
                                href={`mailto:${store.email}`}
                                className={`transition-colors break-all ${isFashion ? 'text-[#2d1810] hover:text-[#8B6914]' : 'text-white hover:text-[#22c55e]'}`}
                            >
                                {store.email}
                            </a>
                        </div>
                    </div>

                    <div className={`flex items-start gap-4 p-4 rounded-xl border ${
                        isFashion ? 'bg-[#faf5f0] border-[#d4c4a8]/30' : 'bg-zinc-800/50 border-zinc-700/50'
                    }`}>
                        <div className="p-2 rounded-lg" style={{ backgroundColor: `${accent}20` }}>
                            <Phone className="w-5 h-5" style={{ color: accent }} />
                        </div>
                        <div className="flex-1">
                            <p className={`text-xs uppercase tracking-wide mb-1 ${isFashion ? 'text-[#8B7355]' : 'text-zinc-400'}`}>Phone</p>
                            <a
                                href={`tel:${store.contact}`}
                                className={`transition-colors ${isFashion ? 'text-[#2d1810] hover:text-[#8B6914]' : 'text-white hover:text-[#22c55e]'}`}
                            >
                                {store.contact}
                            </a>
                        </div>
                    </div>

                    {store.address && (
                        <div className={`flex items-start gap-4 p-4 rounded-xl border ${
                            isFashion ? 'bg-[#faf5f0] border-[#d4c4a8]/30' : 'bg-zinc-800/50 border-zinc-700/50'
                        }`}>
                            <div className="p-2 rounded-lg" style={{ backgroundColor: `${accent}20` }}>
                                <MapPin className="w-5 h-5" style={{ color: accent }} />
                            </div>
                            <div className="flex-1">
                                <p className={`text-xs uppercase tracking-wide mb-1 ${isFashion ? 'text-[#8B7355]' : 'text-zinc-400'}`}>Address</p>
                                <p className={isFashion ? 'text-[#2d1810]' : 'text-white'}>{store.address}</p>
                            </div>
                        </div>
                    )}
                </div>
                )}

                <div className={`mt-6 pt-6 border-t ${isFashion ? 'border-[#d4c4a8]/30' : 'border-zinc-800'}`}>
                    <button
                        onClick={onClose}
                        className="w-full px-4 py-2.5 text-white rounded-lg font-semibold transition-colors"
                        style={{ backgroundColor: accent }}
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    )
}
