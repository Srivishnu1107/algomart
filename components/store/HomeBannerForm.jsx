'use client'

import { useAuth } from '@clerk/nextjs'
import axios from 'axios'
import { ImageIcon, Plus, Trash2, Pencil, ImagePlus } from 'lucide-react'
import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'

const PREFERRED_WIDTH = 1920
const PREFERRED_HEIGHT = 600

const SIZE_OPTIONS = [
  { value: 'sm', label: 'Small' },
  { value: 'md', label: 'Medium' },
  { value: 'lg', label: 'Large' },
]

const defaultButtons = (isFashion) => [
  { label: 'Shop Now', link: '/shop', backgroundColor: isFashion ? '#ec4899' : '#14b8a6', textColor: '#ffffff', size: 'md' },
]

export default function HomeBannerForm({ storeType = 'electronics', isFashion = false }) {
  const { getToken } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [banners, setBanners] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)

  const [name, setName] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [imageFile, setImageFile] = useState(null)
  const [bannerLink, setBannerLink] = useState('')
  const [buttons, setButtons] = useState(defaultButtons(isFashion))

  const typeParam = storeType ? `?type=${storeType}` : ''

  const fetchBanners = useCallback(async () => {
    try {
      const token = await getToken()
      const { data } = await axios.get(`/api/store/home-banner${typeParam}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      setBanners(data.banners || [])
    } catch (e) {
      toast.error(e?.response?.data?.error || 'Failed to load banners')
      setBanners([])
    } finally {
      setLoading(false)
    }
  }, [getToken, typeParam])

  useEffect(() => {
    fetchBanners()
  }, [fetchBanners])

  const resetForm = () => {
    setName('')
    setImageUrl('')
    setImageFile(null)
    setBannerLink('')
    setButtons(defaultButtons(isFashion))
    setEditingId(null)
    setShowForm(false)
  }

  const loadBannerIntoForm = (banner) => {
    setName(banner.name || '')
    setImageUrl(banner.imageUrl || '')
    setImageFile(null)
    setBannerLink(banner.bannerLink || '')
    setButtons(Array.isArray(banner.buttons) && banner.buttons.length > 0 ? banner.buttons : defaultButtons(isFashion))
    setEditingId(banner.id)
    setShowForm(true)
  }

  const addButton = () => {
    setButtons((prev) => [
      ...prev,
      { label: 'Button', link: '#', backgroundColor: isFashion ? '#ec4899' : '#14b8a6', textColor: '#ffffff', size: 'md' },
    ])
  }

  const removeButton = (index) => {
    setButtons((prev) => prev.filter((_, i) => i !== index))
  }

  const updateButton = (index, field, value) => {
    setButtons((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], [field]: value }
      return next
    })
  }

  const previewImageSrc = useMemo(() => {
    if (imageUrl) return imageUrl
    if (imageFile) return URL.createObjectURL(imageFile)
    return null
  }, [imageUrl, imageFile])

  useEffect(() => {
    if (!imageFile || !previewImageSrc || !previewImageSrc.startsWith('blob:')) return
    const url = previewImageSrc
    return () => URL.revokeObjectURL(url)
  }, [imageFile, previewImageSrc])

  const handleSave = async () => {
    if (!imageUrl && !imageFile) {
      toast.error('Please upload a banner image.')
      return
    }
    if (!name.trim()) {
      toast.error('Please enter a name for the banner.')
      return
    }
    setSaving(true)
    try {
      const token = await getToken()
      const formData = new FormData()
      formData.append('name', name.trim())
      if (imageFile) formData.append('image', imageFile)
      formData.append('bannerLink', bannerLink)
      formData.append('buttons', JSON.stringify(buttons))

      if (editingId) {
        await axios.put(`/api/store/home-banner${typeParam}&bannerId=${editingId}`, formData, {
          headers: { Authorization: `Bearer ${token}` },
        })
        toast.success('Banner updated successfully.')
      } else {
        await axios.post(`/api/store/home-banner${typeParam}`, formData, {
          headers: { Authorization: `Bearer ${token}` },
        })
        toast.success('Banner saved successfully.')
      }
      setImageFile(null)
      resetForm()
      fetchBanners()
    } catch (e) {
      toast.error(e?.response?.data?.error || 'Failed to save banner')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (bannerId) => {
    if (!window.confirm('Delete this banner?')) return
    try {
      const token = await getToken()
      await axios.delete(`/api/store/home-banner${typeParam}&bannerId=${bannerId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      toast.success('Banner deleted.')
      if (editingId === bannerId) resetForm()
      fetchBanners()
    } catch (e) {
      toast.error(e?.response?.data?.error || 'Failed to delete')
    }
  }

  const accentBg = isFashion ? 'bg-pink-500/20 text-pink-400' : 'bg-teal-500/20 text-teal-400'
  const accentBorder = isFashion ? 'border-pink-500/30' : 'border-teal-500/30'

  if (loading) {
    return (
      <div className="rounded-2xl border border-zinc-700/60 bg-zinc-900/40 p-8 animate-pulse">
        <div className="h-8 w-48 bg-zinc-800 rounded mb-6" />
        <div className="h-64 bg-zinc-800 rounded mb-6" />
        <div className="h-10 w-32 bg-zinc-800 rounded" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* List of saved banners */}
      <div className="rounded-2xl border border-zinc-700/60 bg-gradient-to-br from-zinc-900/80 to-zinc-900/60 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Your banners</h2>
          <button
            type="button"
            onClick={() => { resetForm(); setShowForm(true); setName(''); setImageUrl(''); setBannerLink(''); setButtons(defaultButtons(isFashion)); setEditingId(null); }}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl ${accentBg} border ${accentBorder} hover:opacity-90 transition`}
          >
            <ImagePlus size={18} />
            Add banner
          </button>
        </div>
        <p className="text-sm text-zinc-500 mb-4">All banners are saved in the database and may appear on the home page. Add a name to identify each one.</p>
        {banners.length === 0 && !showForm ? (
          <p className="text-zinc-500 py-6 text-center">No banners yet. Click &quot;Add banner&quot; to create one.</p>
        ) : (
          <ul className="space-y-3">
            {banners.map((b) => (
              <li
                key={b.id}
                className="flex items-center gap-4 p-3 rounded-xl bg-zinc-800/60 border border-zinc-700/50"
              >
                <div className="w-24 h-14 rounded-lg overflow-hidden bg-zinc-800 flex-shrink-0">
                  <img src={b.imageUrl} alt="" className="w-full h-full object-cover" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-white truncate">{b.name || 'Banner'}</p>
                  <p className="text-xs text-zinc-500 truncate">{b.bannerLink || 'No link'}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => loadBannerIntoForm(b)}
                    className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-700 transition"
                    aria-label="Edit"
                  >
                    <Pencil size={18} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(b.id)}
                    className="p-2 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition"
                    aria-label="Delete"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Add / Edit form */}
      {showForm && (
        <div className="rounded-2xl border border-zinc-700/60 bg-gradient-to-br from-zinc-900/80 to-zinc-900/60 p-6 space-y-6">
          <h2 className="text-lg font-semibold text-white">{editingId ? 'Edit banner' : 'New banner'}</h2>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1">Banner name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Summer Sale, New Arrivals"
              className="w-full max-w-md px-4 py-2.5 rounded-xl bg-zinc-800 border border-zinc-600 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50"
            />
            <p className="text-xs text-zinc-500 mt-1">Saved in the database to identify this banner.</p>
          </div>

          <div>
            <h3 className="text-sm font-medium text-white mb-1">Banner image</h3>
            <p className="text-xs text-zinc-500 mb-2">Preferred size: {PREFERRED_WIDTH} × {PREFERRED_HEIGHT} px for best display on the hero.</p>
            <label className="relative flex flex-col items-center justify-center w-full h-48 rounded-xl border-2 border-dashed border-zinc-600 hover:border-zinc-500 bg-zinc-800/50 cursor-pointer transition overflow-hidden">
              {(imageUrl || imageFile) && previewImageSrc ? (
                <>
                  <img src={previewImageSrc} alt="Preview" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); setImageFile(null); setImageUrl(''); }}
                    className="absolute top-2 right-2 p-2 rounded-lg bg-black/60 text-white hover:bg-red-500/90 hover:text-white transition z-10"
                    aria-label="Remove image"
                  >
                    <Trash2 size={18} />
                  </button>
                </>
              ) : (
                <div className="flex flex-col items-center gap-2 text-zinc-500">
                  <ImageIcon size={40} />
                  <span className="text-sm">Click to upload</span>
                </div>
              )}
              <input type="file" className="hidden" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) setImageFile(f) }} />
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1">Banner link (optional)</label>
            <input
              type="url"
              placeholder="e.g. /shop or https://example.com"
              value={bannerLink}
              onChange={(e) => setBannerLink(e.target.value)}
              className="w-full max-w-md px-4 py-2.5 rounded-xl bg-zinc-800 border border-zinc-600 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-white">Buttons</h3>
              <button type="button" onClick={addButton} className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm ${accentBg} border ${accentBorder}`}>
                <Plus size={16} /> Add
              </button>
            </div>
            <div className="space-y-3">
              {buttons.map((btn, index) => (
                <div key={index} className="p-3 rounded-lg bg-zinc-800/60 border border-zinc-700/50 flex flex-wrap items-center gap-2">
                  <input type="text" value={btn.label} onChange={(e) => updateButton(index, 'label', e.target.value)} placeholder="Label" className="w-28 px-2 py-1.5 rounded bg-zinc-800 border border-zinc-600 text-white text-sm" />
                  <input type="text" value={btn.link} onChange={(e) => updateButton(index, 'link', e.target.value)} placeholder="Link" className="flex-1 min-w-[120px] px-2 py-1.5 rounded bg-zinc-800 border border-zinc-600 text-white text-sm" />
                  <input type="color" value={btn.backgroundColor} onChange={(e) => updateButton(index, 'backgroundColor', e.target.value)} className="w-8 h-8 rounded cursor-pointer border border-zinc-600" />
                  <select value={btn.size} onChange={(e) => updateButton(index, 'size', e.target.value)} className="px-2 py-1.5 rounded bg-zinc-800 border border-zinc-600 text-white text-sm">
                    {SIZE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                  <button type="button" onClick={() => removeButton(index)} className="p-1.5 rounded text-zinc-400 hover:text-red-400"><Trash2 size={16} /></button>
                </div>
              ))}
            </div>
          </div>

          {previewImageSrc && (
            <div>
              <h3 className="text-sm font-medium text-white mb-2">Preview on main page</h3>
              <p className="text-xs text-zinc-500 mb-3">How your banner will look on the home page hero.</p>
              <div className="relative w-full max-w-4xl rounded-xl overflow-hidden border border-zinc-600 bg-zinc-900 aspect-[32/10] min-h-[160px]">
                <img src={previewImageSrc} alt="Banner preview" className="absolute inset-0 w-full h-full object-cover" />
                {Array.isArray(buttons) && buttons.length > 0 && (
                  <div className="absolute bottom-3 left-3 right-3 flex flex-wrap gap-2 z-10">
                    {buttons.map((btn, idx) => {
                      const style = { backgroundColor: btn.backgroundColor || '#14b8a6', color: btn.textColor || '#ffffff' }
                      const sizeMap = { sm: 'px-2 py-1 text-xs', md: 'px-3 py-1.5 text-sm', lg: 'px-4 py-2 text-base' }
                      const sizeClass = sizeMap[btn.size] || sizeMap.md
                      const href = btn.link || '#'
                      const content = <span className="inline-flex items-center justify-center font-semibold rounded-lg">{btn.label || 'Button'}</span>
                      if (href.startsWith('http')) {
                        return (
                          <a key={idx} href={href} target="_blank" rel="noopener noreferrer" className={`${sizeClass}`} style={style}>
                            {content}
                          </a>
                        )
                      }
                      return (
                        <Link key={idx} href={href} className={`${sizeClass}`} style={style}>
                          {content}
                        </Link>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || (!imageUrl && !imageFile) || !name.trim()}
              className={`px-6 py-3 rounded-xl font-semibold transition ${accentBg} border ${accentBorder} disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {saving ? 'Saving...' : editingId ? 'Update banner' : 'Save banner'}
            </button>
            <button type="button" onClick={resetForm} className="px-6 py-3 rounded-xl font-semibold text-zinc-400 hover:text-white border border-zinc-600 hover:bg-zinc-800 transition">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
