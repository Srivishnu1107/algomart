'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import { useDispatch } from 'react-redux'
import { addAddress } from '@/lib/features/address/addressSlice'
import axios from 'axios'
import { MapPin, Loader2, ChevronLeft, ChevronRight } from 'lucide-react'
import { useCallback, useEffect, useRef, useState, Suspense } from 'react'
import dynamic from 'next/dynamic'
import { toast } from 'react-hot-toast'
import Link from 'next/link'
import AddressCard from '@/components/AddressCard'

const DEFAULT_CENTER = [20.5937, 78.9629]

const LocationMap = dynamic(
  () => import('@/components/LocationMap').then((m) => m.default),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[400px] rounded-xl bg-zinc-800/80 animate-pulse flex items-center justify-center text-zinc-500">
        <Loader2 className="animate-spin size-8" />
      </div>
    ),
  }
)

function AddressPageFallback() {
  // Fallback uses default dark theme since it's a brief loading state
  // Main content will have proper fashion detection
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0b]">
      <div className="flex items-center gap-2 text-zinc-500">
        <Loader2 className="size-6 animate-spin" />
        <span>Loading…</span>
      </div>
    </div>
  )
}

export default function AddressPageClient() {
  return (
    <Suspense fallback={<AddressPageFallback />}>
      <AddressPageContent />
    </Suspense>
  )
}

function AddressPageContent() {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { getToken, userId } = useAuth()
  const dispatch = useDispatch()
  const fromFashion = searchParams?.get('from') === 'fashion'
  const isFashion = pathname?.startsWith('/fashion') || fromFashion

  const [center, setCenter] = useState(null)
  const [position, setPosition] = useState(null)
  const [geoError, setGeoError] = useState(null)
  const [geoLoading, setGeoLoading] = useState(true)
  const [addressLabel, setAddressLabel] = useState('home')
  const [form, setForm] = useState({
    name: '',
    email: '',
    street: '',
    city: '',
    state: '',
    zip: '',
    country: '',
    phone: '',
  })
  const [submitting, setSubmitting] = useState(false)

  const [addresses, setAddresses] = useState([])
  const [loadingAddresses, setLoadingAddresses] = useState(true)
  const [editingId, setEditingId] = useState(null)

  const addressScrollRef = useRef(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(true)

  useEffect(() => {
    if (typeof window === 'undefined' || !navigator?.geolocation) {
      setCenter(DEFAULT_CENTER)
      setPosition(DEFAULT_CENTER)
      setGeoLoading(false)
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = [pos.coords.latitude, pos.coords.longitude]
        setCenter(coords)
        setPosition(coords)
        setGeoError(null)
        setGeoLoading(false)
      },
      () => {
        setCenter(DEFAULT_CENTER)
        setPosition(DEFAULT_CENTER)
        setGeoError('Location access denied or unavailable. You can still pick a place on the map.')
        setGeoLoading(false)
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    )
  }, [])

  const fetchAddresses = useCallback(async () => {
    try {
      const token = await getToken()
      const { data } = await axios.get('/api/address', {
        headers: { Authorization: `Bearer ${token}` }
      })
      setAddresses(data.addresses || [])
    } catch (error) {
      console.error('Failed to fetch addresses', error)
      toast.error('Failed to load saved addresses')
    } finally {
      setLoadingAddresses(false)
    }
  }, [getToken])

  useEffect(() => {
    if (userId) {
      fetchAddresses()
    }
  }, [userId, fetchAddresses])

  useEffect(() => {
    if (addresses.length === 0) return
    const t = setTimeout(updateAddressScrollState, 100)
    return () => clearTimeout(t)
  }, [addresses.length])

  const handleGeocode = useCallback((components) => {
    setForm((prev) => ({
      ...prev,
      street: components.street ?? prev.street,
      city: components.city ?? prev.city,
      state: components.state ?? prev.state,
      zip: components.pincode ?? prev.zip,
      country: components.country ?? prev.country,
    }))
  }, [])

  const initialGeocodeDone = useRef(false)
  useEffect(() => {
    if (geoLoading || !position || initialGeocodeDone.current || editingId) return
    initialGeocodeDone.current = true
    let cancelled = false
    fetch(`/api/geocode?lat=${position[0]}&lng=${position[1]}`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && data.components) handleGeocode(data.components)
      })
      .catch(() => { })
    return () => { cancelled = true }
  }, [position, geoLoading, handleGeocode, editingId])

  const handleFieldChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const token = await getToken()
      const addressData = {
        ...form,
        label: addressLabel,
        latitude: position?.[0] ?? null,
        longitude: position?.[1] ?? null,
      }

      if (editingId) {
        const { data } = await axios.put(`/api/address/${editingId}`, { address: addressData }, {
          headers: { Authorization: `Bearer ${token}` }
        })
        toast.success(data.message || 'Address updated.')
        await fetchAddresses()
        setEditingId(null)
        setForm({
          name: '', email: '', street: '', city: '', state: '', zip: '', country: '', phone: '',
        })
      } else {
        const { data } = await axios.post('/api/address', { address: addressData }, {
          headers: { Authorization: `Bearer ${token}` }
        })
        dispatch(addAddress(data.newAddress))
        toast.success(data.message || 'Address saved.')
        await fetchAddresses()
        setForm({
          name: '', email: '', street: '', city: '', state: '', zip: '', country: '', phone: '',
        })
      }
    } catch (err) {
      toast.error(err?.response?.data?.error || err.message || 'Failed to save address')
    } finally {
      setSubmitting(false)
    }
  }

  const handleEdit = (addr) => {
    setEditingId(addr.id)
    setForm({
      name: addr.name,
      email: addr.email,
      street: addr.street,
      city: addr.city,
      state: addr.state,
      zip: addr.zip,
      country: addr.country,
      phone: addr.phone,
    })
    setAddressLabel(addr.label || 'home')
    if (addr.latitude && addr.longitude) {
      const newPos = [addr.latitude, addr.longitude]
      setPosition(newPos)
      setCenter(newPos)
    }
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this address?')) return
    try {
      const token = await getToken()
      await axios.delete(`/api/address/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setAddresses(prev => prev.filter(a => a.id !== id))
      toast.success('Address deleted')
      if (editingId === id) {
        setEditingId(null)
        setForm({
          name: '', email: '', street: '', city: '', state: '', zip: '', country: '', phone: '',
        })
      }
    } catch (error) {
      console.error(error)
      toast.error(error?.response?.data?.error || 'Failed to delete address')
    }
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setForm({
      name: '', email: '', street: '', city: '', state: '', zip: '', country: '', phone: '',
    })
  }

  const addressScroll = (dir) => {
    if (!addressScrollRef.current) return
    addressScrollRef.current.scrollBy({ left: dir * 320, behavior: 'smooth' })
    setTimeout(() => {
      if (!addressScrollRef.current) return
      const { scrollLeft, scrollWidth, clientWidth } = addressScrollRef.current
      setCanScrollLeft(scrollLeft > 0)
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10)
    }, 300)
  }

  const updateAddressScrollState = () => {
    if (!addressScrollRef.current) return
    const { scrollLeft, scrollWidth, clientWidth } = addressScrollRef.current
    setCanScrollLeft(scrollLeft > 0)
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10)
  }

  const inputClass = `w-full rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 ${isFashion 
    ? 'bg-[#f5ede3] border border-[#d4c4a8]/30 text-[#2d1810] focus:border-[#8B6914]/40 focus:ring-[#8B6914]/40' 
    : 'bg-zinc-800 border border-zinc-700 text-zinc-100 focus:ring-teal-500/40'}`
  const labelClass = `block text-sm font-medium mb-1.5 ${isFashion ? 'text-[#8B7355]' : 'text-zinc-400'}`

  return (
    <div className={`min-h-screen ${isFashion ? 'bg-[#faf5f0] text-[#2d1810]' : 'bg-[#0a0a0b] text-zinc-100'}`}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex flex-col sm:flex-row gap-6 sm:gap-8 mb-12">
          <div className="w-full sm:max-w-md flex-shrink-0">
            <div className="flex items-center gap-2 mb-6">
              <MapPin className={`size-6 ${isFashion ? 'text-[#8B6914]' : 'text-teal-400'}`} />
              <h1 className={`text-2xl font-bold ${isFashion ? 'text-[#2d1810]' : 'text-white'}`}>
                {editingId ? 'Edit Address' : 'Delivery address'}
              </h1>
            </div>
            <p className={`text-sm mb-6 ${isFashion ? 'text-[#8B7355]' : 'text-zinc-500'}`}>
              {editingId ? 'Update your address details below.' : 'Move the map marker or use Locate me to set location. Address fields will update and can be edited.'}
            </p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <span className={labelClass}>Save as</span>
                <div className={`flex gap-2 p-1 rounded-xl border ${isFashion 
                  ? 'bg-white border-[#d4c4a8]/30' 
                  : 'bg-zinc-800/80 border-zinc-700/80'}`}>
                  {[
                    { value: 'home', label: 'Home' },
                    { value: 'work', label: 'Work' },
                    { value: 'other', label: 'Other' },
                  ].map(({ value, label }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setAddressLabel(value)}
                      className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition ${addressLabel === value
                        ? isFashion
                          ? 'bg-[#8B6914]/20 text-[#8B6914] border border-[#8B6914]/40'
                          : 'bg-teal-500/20 text-teal-400 border border-teal-500/40'
                        : isFashion
                          ? 'text-[#8B7355] hover:text-[#2d1810] hover:bg-[#f5ede3] border border-transparent'
                          : 'text-zinc-500 hover:text-zinc-300 border border-transparent'
                        }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className={labelClass} htmlFor="name">Name</label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  value={form.name}
                  onChange={handleFieldChange}
                  className={inputClass}
                  placeholder="Your name"
                />
              </div>
              <div>
                <label className={labelClass} htmlFor="email">Email</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={form.email}
                  onChange={handleFieldChange}
                  className={inputClass}
                  placeholder="your@email.com"
                />
              </div>
              <div>
                <label className={labelClass} htmlFor="street">Street</label>
                <input
                  id="street"
                  name="street"
                  type="text"
                  value={form.street}
                  onChange={handleFieldChange}
                  className={inputClass}
                  placeholder="Street address"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass} htmlFor="city">City</label>
                  <input
                    id="city"
                    name="city"
                    type="text"
                    value={form.city}
                    onChange={handleFieldChange}
                    className={inputClass}
                    placeholder="City"
                  />
                </div>
                <div>
                  <label className={labelClass} htmlFor="state">State</label>
                  <input
                    id="state"
                    name="state"
                    type="text"
                    value={form.state}
                    onChange={handleFieldChange}
                    className={inputClass}
                    placeholder="State"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass} htmlFor="zip">Pincode / Zip</label>
                  <input
                    id="zip"
                    name="zip"
                    type="text"
                    value={form.zip}
                    onChange={handleFieldChange}
                    className={inputClass}
                    placeholder="Pincode"
                  />
                </div>
                <div>
                  <label className={labelClass} htmlFor="country">Country</label>
                  <input
                    id="country"
                    name="country"
                    type="text"
                    value={form.country}
                    onChange={handleFieldChange}
                    className={inputClass}
                    placeholder="Country"
                  />
                </div>
              </div>
              <div>
                <label className={labelClass} htmlFor="phone">Phone</label>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  required
                  value={form.phone}
                  onChange={handleFieldChange}
                  className={inputClass}
                  placeholder="Phone number"
                />
              </div>
              <div className="flex flex-wrap gap-3 pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className={`px-5 py-2.5 rounded-xl font-semibold transition shadow-lg disabled:opacity-60 ${isFashion
                    ? 'bg-[#8B6914] text-white hover:bg-[#8B6914]/90 shadow-[#8B6914]/20'
                    : 'bg-teal-400 text-zinc-900 hover:bg-teal-300 shadow-teal-500/20'
                    }`}
                >
                  {submitting ? 'Saving…' : (editingId ? 'Update address' : 'Save address')}
                </button>
                {editingId ? (
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className={`px-5 py-2.5 rounded-xl border transition ${isFashion
                      ? 'border-[#d4c4a8]/40 text-[#8B7355] hover:bg-[#f5ede3] hover:border-[#c4a882]/40'
                      : 'border-zinc-600 text-zinc-300 hover:bg-zinc-800'
                      }`}
                  >
                    Cancel
                  </button>
                ) : (
                  <Link
                    href={isFashion ? '/fashion' : '/'}
                    className={`px-5 py-2.5 rounded-xl border transition ${isFashion
                      ? 'border-[#d4c4a8]/40 text-[#8B7355] hover:bg-[#f5ede3] hover:border-[#c4a882]/40'
                      : 'border-zinc-600 text-zinc-300 hover:bg-zinc-800'
                      }`}
                  >
                    Go Back
                  </Link>
                )}
              </div>
            </form>
          </div>

          <div className="flex-1 min-h-[320px] flex flex-col gap-6">
            {geoLoading ? (
              <div className={`w-full h-[400px] rounded-xl flex items-center justify-center ${isFashion
                ? 'bg-[#f5ede3] text-[#8B7355]'
                : 'bg-zinc-800/80 text-zinc-500'
                }`}>
                <span className="flex items-center gap-2">
                  <Loader2 className="animate-spin size-6" />
                  Getting your location…
                </span>
              </div>
            ) : (
              <>
                {geoError && (
                  <p className={`text-sm mb-2 ${isFashion ? 'text-amber-600' : 'text-amber-500/90'}`}>{geoError}</p>
                )}
                <div className={`rounded-xl overflow-hidden border shadow-xl ${isFashion
                  ? 'border-[#d4c4a8]/40'
                  : 'border-zinc-700/80'
                  }`}>
                  <LocationMap
                    center={center}
                    onCenterChange={setCenter}
                    onMarkerPositionChange={setPosition}
                    onGeocode={handleGeocode}
                    height="400px"
                  />
                </div>
                {position && (
                  <p className={`text-xs mt-2 ${isFashion ? 'text-[#8B7355]/60' : 'text-zinc-500'}`}>
                    Coordinates: {position[0].toFixed(5)}, {position[1].toFixed(5)}
                  </p>
                )}
              </>
            )}

            <div className={`pt-4 border-t ${isFashion ? 'border-[#d4c4a8]/30' : 'border-zinc-800'}`}>
              <div className="flex items-center justify-between mb-4">
                <h2 className={`text-lg font-semibold flex items-center gap-2 ${isFashion ? 'text-[#2d1810]' : 'text-zinc-100'}`}>
                  <MapPin className={isFashion ? 'text-[#8B6914]' : 'text-teal-400'} size={18} />
                  Saved Addresses
                </h2>
                {addresses.length > 0 && (
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => addressScroll(-1)}
                      disabled={!canScrollLeft}
                      className={`w-9 h-9 flex items-center justify-center rounded-xl border transition disabled:opacity-40 disabled:cursor-not-allowed ${isFashion
                        ? 'bg-white border-[#d4c4a8]/40 text-[#8B7355] hover:text-[#2d1810] hover:bg-[#f5ede3] hover:border-[#c4a882]/40'
                        : 'bg-zinc-800/80 border-zinc-700/80 text-zinc-400 hover:text-white hover:bg-zinc-700/80'
                        }`}
                      aria-label="Scroll left"
                    >
                      <ChevronLeft size={20} />
                    </button>
                    <button
                      type="button"
                      onClick={() => addressScroll(1)}
                      disabled={!canScrollRight}
                      className={`w-9 h-9 flex items-center justify-center rounded-xl border transition disabled:opacity-40 disabled:cursor-not-allowed ${isFashion
                        ? 'bg-white border-[#d4c4a8]/40 text-[#8B7355] hover:text-[#2d1810] hover:bg-[#f5ede3] hover:border-[#c4a882]/40'
                        : 'bg-zinc-800/80 border-zinc-700/80 text-zinc-400 hover:text-white hover:bg-zinc-700/80 hover:border-teal-500/40'
                        }`}
                      aria-label="Scroll right"
                    >
                      <ChevronRight size={20} />
                    </button>
                  </div>
                )}
              </div>
              {loadingAddresses ? (
                <div className="flex justify-center py-8">
                  <Loader2 className={`animate-spin size-8 ${isFashion ? 'text-[#8B7355]/60' : 'text-zinc-600'}`} />
                </div>
              ) : addresses.length === 0 ? (
                <div className={`text-center py-6 px-4 rounded-xl border border-dashed text-sm ${isFashion
                  ? 'bg-white border-[#d4c4a8]/40 text-[#8B7355]/60'
                  : 'bg-zinc-900/40 border-zinc-800 text-zinc-500'
                  }`}>
                  No saved addresses. Add one using the form on the left.
                </div>
              ) : (
                <div className="max-w-[656px]">
                  <div
                    ref={addressScrollRef}
                    onScroll={updateAddressScrollState}
                    className="flex gap-4 overflow-x-auto no-scrollbar pb-2"
                  >
                    {addresses.map((addr) => (
                      <div key={addr.id} className="flex-shrink-0 w-72 sm:w-80">
                        <AddressCard
                          address={addr}
                          onEdit={handleEdit}
                          onDelete={handleDelete}
                          isFashion={isFashion}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
