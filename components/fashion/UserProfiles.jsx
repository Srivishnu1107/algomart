'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Plus, Pencil, Trash2, User, X } from 'lucide-react'

const ACTIVE_PROFILE_KEY = 'activeFashionProfile'
const MAX_PROFILES = 3

const BODY_TYPES = ['Slim', 'Athletic', 'Regular', 'Heavy', 'Plus Size']

const AGE_INTERVALS = [
  'Under 18',
  '18–24',
  '25–34',
  '35–44',
  '45–54',
  '55–64',
  '65+',
]

const GENDERS = ['Male', 'Female', 'Non-binary', 'Prefer not to say']

const HEIGHT_MIN = 120
const HEIGHT_MAX = 220
const WEIGHT_MIN = 30
const WEIGHT_MAX = 200

// ---------------------------------------------------------------------------
// Helpers (exported for AI / fashion context)
// ---------------------------------------------------------------------------

/**
 * Saves the selected profile as the active fashion profile for AI recommendations (session-only, in localStorage).
 * @param {object|string} profileOrId - Full profile object { id, name, height, ... } or profile id (if you already have the list, pass the object)
 * @returns {object|null} The profile data stored for AI, or null
 */
export function selectProfileForAI(profileOrId) {
  if (typeof window === 'undefined') return null
  try {
    const profile = typeof profileOrId === 'object' && profileOrId != null && profileOrId.id
      ? profileOrId
      : null
    if (profile) {
      localStorage.setItem(ACTIVE_PROFILE_KEY, JSON.stringify(profile))
      return profile
    }
    return null
  } catch {
    return null
  }
}

/**
 * Builds a formatted context string for fashion AI (size & outfit suggestions).
 * @param {object} profile - Profile object with height, weight, bodyType
 * @returns {string} Formatted prompt snippet
 */
export function generateFashionContextPrompt(profile) {
  if (!profile || typeof profile !== 'object') return ''
  const height = profile.height != null ? `${profile.height} cm` : '—'
  const weight = profile.weight != null ? `${profile.weight} kg` : '—'
  const bodyType = profile.bodyType || '—'
  const ageInterval = profile.ageInterval || '—'
  const gender = profile.gender || '—'
  return `User Profile — use every field below for personalized recommendations:

Height: ${height}
Weight: ${weight}
Body Type: ${bodyType}
Age: ${ageInterval}
Gender: ${gender}

RULES YOU MUST FOLLOW:
- Gender: Use this to recommend the correct category (Men vs Women) and fits. Only suggest products that match this gender (e.g. if Gender is Female, suggest women's items; if Male, men's).
- Age: Use this for age-appropriate style, occasion, and trends (e.g. Under 18, 18–24, 25–34, 35–44, 45–54, 55–64, 65+). Match your suggestions to what fits this age.
- Height & weight: Use for size (S/M/L, shoe size, fit).
- Body type: Use for silhouettes and cuts that flatter.

Suggest only products that match this profile's gender, age, and body.`
}

// ---------------------------------------------------------------------------
// API helpers (profiles stored in DB)
// ---------------------------------------------------------------------------

async function fetchProfiles() {
  try {
    const res = await fetch('/api/fashion-profiles')
    const data = await res.json()
    if (!res.ok) return []
    return Array.isArray(data?.profiles) ? data.profiles : []
  } catch {
    return []
  }
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

function validateProfile({ name, height, weight }) {
  const errors = {}
  const nameTrim = (name ?? '').trim()
  if (!nameTrim) errors.name = 'Profile name is required'
  const h = Number(height)
  if (Number.isNaN(h) || h < HEIGHT_MIN || h > HEIGHT_MAX) {
    errors.height = `Height must be between ${HEIGHT_MIN} and ${HEIGHT_MAX} cm`
  }
  const w = Number(weight)
  if (Number.isNaN(w) || w < WEIGHT_MIN || w > WEIGHT_MAX) {
    errors.weight = `Weight must be between ${WEIGHT_MIN} and ${WEIGHT_MAX} kg`
  }
  return errors
}

// ---------------------------------------------------------------------------
// Modal: Create / Edit Profile
// ---------------------------------------------------------------------------

function ProfileModal({ isOpen, onClose, profile, onSave, saving }) {
  const isEdit = Boolean(profile?.id)
  const [form, setForm] = useState({
    name: profile?.name ?? '',
    height: profile?.height ?? '',
    weight: profile?.weight ?? '',
    bodyType: profile?.bodyType ?? BODY_TYPES[0],
    ageInterval: profile?.ageInterval ?? AGE_INTERVALS[1],
    gender: profile?.gender ?? GENDERS[0],
  })
  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (!isOpen) return
    setForm({
      name: profile?.name ?? '',
      height: profile?.height ?? '',
      weight: profile?.weight ?? '',
      bodyType: profile?.bodyType ?? BODY_TYPES[0],
      ageInterval: profile?.ageInterval ?? AGE_INTERVALS[1],
      gender: profile?.gender ?? GENDERS[0],
    })
    setErrors({})
  }, [isOpen, profile])

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: null }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (saving) return
    const validation = validateProfile(form)
    if (Object.keys(validation).length > 0) {
      setErrors(validation)
      return
    }
    onSave({
      ...(profile?.id && { id: profile.id }),
      name: form.name.trim(),
      height: Number(form.height),
      weight: Number(form.weight),
      bodyType: form.bodyType,
      ageInterval: form.ageInterval,
      gender: form.gender,
    })
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl shadow-gray-200/50">
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
          <h2 className="text-xl font-semibold text-gray-900">
            {isEdit ? 'Edit Profile' : 'Create New Profile'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label htmlFor="profile-name" className="block text-sm font-medium text-gray-700 mb-1.5">
              Profile Name
            </label>
            <input
              id="profile-name"
              name="name"
              type="text"
              value={form.name}
              onChange={handleChange}
              placeholder="e.g. Me, Friend, Sister"
              className={`w-full px-4 py-2.5 rounded-xl border bg-gray-50/50 focus:bg-white focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 outline-none transition ${
                errors.name ? 'border-red-400' : 'border-gray-200'
              }`}
            />
            {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="profile-height" className="block text-sm font-medium text-gray-700 mb-1.5">
                Height (cm)
              </label>
              <input
                id="profile-height"
                name="height"
                type="number"
                min={HEIGHT_MIN}
                max={HEIGHT_MAX}
                value={form.height}
                onChange={handleChange}
                placeholder="120–220"
                className={`w-full px-4 py-2.5 rounded-xl border bg-gray-50/50 focus:bg-white focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 outline-none transition ${
                  errors.height ? 'border-red-400' : 'border-gray-200'
                }`}
              />
              {errors.height && <p className="mt-1 text-sm text-red-500">{errors.height}</p>}
            </div>
            <div>
              <label htmlFor="profile-weight" className="block text-sm font-medium text-gray-700 mb-1.5">
                Weight (kg)
              </label>
              <input
                id="profile-weight"
                name="weight"
                type="number"
                min={WEIGHT_MIN}
                max={WEIGHT_MAX}
                value={form.weight}
                onChange={handleChange}
                placeholder="30–200"
                className={`w-full px-4 py-2.5 rounded-xl border bg-gray-50/50 focus:bg-white focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 outline-none transition ${
                  errors.weight ? 'border-red-400' : 'border-gray-200'
                }`}
              />
              {errors.weight && <p className="mt-1 text-sm text-red-500">{errors.weight}</p>}
            </div>
          </div>

          <div>
            <label htmlFor="profile-bodyType" className="block text-sm font-medium text-gray-700 mb-1.5">
              Body Type
            </label>
            <select
              id="profile-bodyType"
              name="bodyType"
              value={form.bodyType}
              onChange={handleChange}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50/50 focus:bg-white focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 outline-none transition"
            >
              {BODY_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="profile-ageInterval" className="block text-sm font-medium text-gray-700 mb-1.5">
                Age
              </label>
              <select
                id="profile-ageInterval"
                name="ageInterval"
                value={form.ageInterval}
                onChange={handleChange}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50/50 focus:bg-white focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 outline-none transition"
              >
                {AGE_INTERVALS.map((interval) => (
                  <option key={interval} value={interval}>
                    {interval}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="profile-gender" className="block text-sm font-medium text-gray-700 mb-1.5">
                Gender
              </label>
              <select
                id="profile-gender"
                name="gender"
                value={form.gender}
                onChange={handleChange}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50/50 focus:bg-white focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 outline-none transition"
              >
                {GENDERS.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 rounded-xl bg-amber-600 text-white font-medium hover:bg-amber-700 active:scale-[0.98] transition disabled:opacity-60 disabled:pointer-events-none"
            >
              {saving ? 'Saving…' : (isEdit ? 'Save' : 'Create')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Profile card
// ---------------------------------------------------------------------------

function ProfileCard({ profile, onEdit, onDelete }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-2 mb-4">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
            <User size={20} className="text-amber-700" />
          </div>
          <h3 className="font-semibold text-gray-900 truncate">{profile.name}</h3>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            type="button"
            onClick={() => onEdit(profile)}
            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-amber-600 transition"
            aria-label="Edit profile"
          >
            <Pencil size={16} />
          </button>
          <button
            type="button"
            onClick={() => onDelete(profile.id)}
            className="p-2 rounded-lg text-gray-500 hover:bg-red-50 hover:text-red-600 transition"
            aria-label="Delete profile"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
      <dl className="space-y-1.5 text-sm text-gray-600">
        <div className="flex justify-between">
          <dt>Height</dt>
          <dd className="font-medium text-gray-900">{profile.height} cm</dd>
        </div>
        <div className="flex justify-between">
          <dt>Weight</dt>
          <dd className="font-medium text-gray-900">{profile.weight} kg</dd>
        </div>
        <div className="flex justify-between">
          <dt>Body type</dt>
          <dd className="font-medium text-gray-900">{profile.bodyType}</dd>
        </div>
        {profile.ageInterval && (
          <div className="flex justify-between">
            <dt>Age</dt>
            <dd className="font-medium text-gray-900">{profile.ageInterval}</dd>
          </div>
        )}
        {profile.gender && (
          <div className="flex justify-between">
            <dt>Gender</dt>
            <dd className="font-medium text-gray-900">{profile.gender}</dd>
          </div>
        )}
      </dl>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function UserProfiles() {
  const [profiles, setProfiles] = useState([])
  const [modalOpen, setModalOpen] = useState(false)
  const [editingProfile, setEditingProfile] = useState(null)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    setLoading(true)
    const list = await fetchProfiles()
    setProfiles(list)
    setLoading(false)
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const handleSave = async (data) => {
    setSaving(true)
    try {
      if (data.id) {
        const res = await fetch(`/api/fashion-profiles/${data.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: data.name,
            height: data.height,
            weight: data.weight,
            bodyType: data.bodyType,
            ageInterval: data.ageInterval,
            gender: data.gender,
          }),
        })
        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          throw new Error(err?.error || 'Update failed')
        }
      } else {
        if (profiles.length >= MAX_PROFILES) {
          setSaving(false)
          return
        }
        const res = await fetch('/api/fashion-profiles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: data.name,
            height: data.height,
            weight: data.weight,
            bodyType: data.bodyType,
            ageInterval: data.ageInterval,
            gender: data.gender,
          }),
        })
        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          throw new Error(err?.error || 'Create failed')
        }
      }
      await refresh()
      setEditingProfile(null)
      setModalOpen(false)
    } catch (e) {
      window.alert(e?.message || 'Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (profile) => {
    setEditingProfile(profile)
    setModalOpen(true)
  }

  const handleDelete = async (id) => {
    if (typeof window === 'undefined' || !id) return
    if (!window.confirm('Delete this profile?')) return
    try {
      const res = await fetch(`/api/fashion-profiles/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Delete failed')
      await refresh()
      setEditingProfile((prev) => {
        if (prev?.id === id) setModalOpen(false)
        return prev?.id === id ? null : prev
      })
    } catch {
      window.alert('Failed to delete profile')
    }
  }

  const canAddProfile = profiles.length < MAX_PROFILES

  return (
    <div className="min-h-screen bg-gray-50/80">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
        <header className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
            Fashion Profiles
          </h1>
          <p className="mt-1 text-gray-600">
            Manage body profiles for personalized fashion size and outfit recommendations.
          </p>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {loading ? (
            <p className="text-gray-500 col-span-full">Loading profiles…</p>
          ) : null}
          {!loading && profiles.map((profile) => (
            <ProfileCard
              key={profile.id}
              profile={profile}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
          {!loading && canAddProfile ? (
            <button
              type="button"
              onClick={() => {
                setEditingProfile(null)
                setModalOpen(true)
              }}
              className="flex flex-col items-center justify-center min-h-[200px] rounded-2xl border-2 border-dashed border-gray-300 bg-white text-gray-500 hover:border-amber-400 hover:bg-amber-50/50 hover:text-amber-700 transition"
            >
              <Plus size={28} className="mb-2 opacity-80" />
              <span className="text-sm font-medium">Create New Profile</span>
            </button>
          ) : !loading ? (
            <div className="flex flex-col items-center justify-center min-h-[200px] rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50/50 text-gray-500">
              <span className="text-sm font-medium">Maximum {MAX_PROFILES} profiles</span>
            </div>
          ) : null}
        </div>

        {!loading && profiles.length === 0 && (
          <p className="mt-6 text-center text-gray-500 text-sm">
            No profiles yet. Add one to get fashion recommendations tailored to body measurements.
          </p>
        )}
      </div>

      <ProfileModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false)
          setEditingProfile(null)
        }}
        profile={editingProfile}
        onSave={handleSave}
        saving={saving}
      />
    </div>
  )
}
