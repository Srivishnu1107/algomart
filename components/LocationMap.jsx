'use client'

import 'leaflet/dist/leaflet.css'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet'
import L from 'leaflet'

const DEFAULT_CENTER = [20.5937, 78.9629] // India fallback

// Explicit icon so Leaflet never calls .replace on a non-string (avoids str.replace error)
const MARKER_ICON = L.icon({
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
})

function toLatLng(value) {
  if (Array.isArray(value) && value.length >= 2 && typeof value[0] === 'number' && typeof value[1] === 'number') {
    return [value[0], value[1]]
  }
  if (value && typeof value.lat === 'number' && typeof value.lng === 'number') {
    return [value.lat, value.lng]
  }
  return DEFAULT_CENTER
}

// Draggable marker: starts at user location, can be dragged to set address
function UserLocationMarker({ position, onPositionChange, onDragEnd }) {
  const markerRef = useRef(null)
  const safePosition = toLatLng(position)
  const eventHandlers = useMemo(
    () => ({
      dragend() {
        const marker = markerRef.current
        if (marker) {
          const latlng = marker.getLatLng()
          const pos = [latlng.lat, latlng.lng]
          onPositionChange?.(pos)
          onDragEnd?.(pos)
        }
      },
    }),
    [onPositionChange, onDragEnd]
  )
  const latLng = useMemo(
    () => L.latLng(Number(safePosition[0]), Number(safePosition[1])),
    [safePosition[0], safePosition[1]]
  )
  return (
    <Marker
      ref={markerRef}
      position={latLng}
      icon={MARKER_ICON}
      eventHandlers={eventHandlers}
      draggable
    />
  )
}

function CenterOnMarkerButton({ position }) {
  const map = useMap()
  const safePos = toLatLng(position)
  const handleClick = useCallback(() => {
    map.flyTo([safePos[0], safePos[1]], map.getZoom(), { duration: 0.5 })
  }, [map, safePos[0], safePos[1]])
  return (
    <button
      type="button"
      onClick={handleClick}
      className="flex items-center justify-center w-10 h-10 rounded-xl bg-zinc-900/95 border border-zinc-600 text-zinc-200 shadow-lg hover:bg-zinc-800 hover:text-white transition"
      title="Center on marker"
      aria-label="Center map on marker"
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <circle cx="12" cy="12" r="6" />
        <circle cx="12" cy="12" r="2" />
      </svg>
    </button>
  )
}

function LocateMeButton({ onLocationFound }) {
  const map = useMap()
  const [locating, setLocating] = useState(false)
  const [error, setError] = useState(null)

  const handleClick = useCallback(() => {
    if (!navigator?.geolocation) {
      setError('Geolocation not supported')
      return
    }
    setError(null)
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude
        const lng = pos.coords.longitude
        map.flyTo([lat, lng], 18, { duration: 0.6 }) // maximum zoom on user location
        onLocationFound?.([lat, lng])
        setLocating(false)
      },
      () => {
        setError('Location denied or unavailable')
        setLocating(false)
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }, [map, onLocationFound])

  return (
    <div className="flex flex-col items-end gap-1">
      {error && (
        <span className="text-xs text-amber-400 bg-zinc-900/90 px-2 py-1 rounded shadow">
          {error}
        </span>
      )}
      <button
        type="button"
        onClick={handleClick}
        disabled={locating}
        className="flex items-center justify-center w-10 h-10 rounded-xl bg-zinc-900/95 border border-zinc-600 text-zinc-200 shadow-lg hover:bg-zinc-800 hover:text-white transition disabled:opacity-60"
        title="Go to my location"
        aria-label="Go to my current location"
      >
        {locating ? (
          <span className="inline-block w-5 h-5 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin" />
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
        )}
      </button>
    </div>
  )
}

export default function LocationMap({
  center,
  onCenterChange,
  onMarkerPositionChange,
  onGeocode,
  className = '',
  height = '400px',
}) {
  const [mapCenter, setMapCenter] = useState(() => toLatLng(center))
  const [markerPosition, setMarkerPosition] = useState(() => toLatLng(center))
  const [loading, setLoading] = useState(false)
  const geocodeAbortRef = useRef(null)

  const reverseGeocode = useCallback(
    async (lat, lng) => {
      if (geocodeAbortRef.current) geocodeAbortRef.current.abort()
      geocodeAbortRef.current = new AbortController()
      setLoading(true)
      try {
        const res = await fetch(
          `/api/geocode?lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lng)}`,
          { signal: geocodeAbortRef.current.signal }
        )
        const data = await res.json()
        if (res.ok && data.components) onGeocode?.(data.components)
      } catch (err) {
        if (err.name !== 'AbortError') console.error('Geocode error:', err)
      } finally {
        setLoading(false)
        geocodeAbortRef.current = null
      }
    },
    [onGeocode]
  )

  const handleMarkerDragEnd = useCallback(
    (pos) => {
      setMarkerPosition(pos)
      onMarkerPositionChange?.(pos)
      reverseGeocode(pos[0], pos[1])
    },
    [onMarkerPositionChange, reverseGeocode]
  )

  const handleMyLocation = useCallback(
    (pos) => {
      setMarkerPosition(pos)
      onMarkerPositionChange?.(pos)
      reverseGeocode(pos[0], pos[1])
    },
    [onMarkerPositionChange, reverseGeocode]
  )

  // Sync from external center (e.g. geolocation)
  useEffect(() => {
    const next = toLatLng(center)
    setMapCenter(next)
    setMarkerPosition(next)
    onCenterChange?.(next)
  }, [center?.[0], center?.[1]])

  return (
    <div className={`relative ${className}`} style={{ height }}>
      {loading && (
        <div className="absolute top-2 left-2 z-[1000] rounded-lg bg-zinc-900/90 px-3 py-1.5 text-xs text-zinc-300 shadow">
          Looking up address…
        </div>
      )}
      <MapContainer
        center={mapCenter}
        zoom={15}
        className="h-full w-full rounded-xl z-0"
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <UserLocationMarker
          position={markerPosition}
          onPositionChange={setMarkerPosition}
          onDragEnd={handleMarkerDragEnd}
        />
        <div className="absolute bottom-4 right-4 z-[1000] flex items-end gap-2">
          <CenterOnMarkerButton position={markerPosition} />
          <LocateMeButton onLocationFound={handleMyLocation} />
        </div>
      </MapContainer>
    </div>
  )
}
