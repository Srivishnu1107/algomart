import { Suspense } from 'react'
import AddressPageClient from './AddressPageClient'

export const dynamic = 'force-dynamic'

function AddressFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0b]">
      <div className="text-zinc-500">Loading…</div>
    </div>
  )
}

export default function AddressPage() {
  return (
    <Suspense fallback={<AddressFallback />}>
      <AddressPageClient />
    </Suspense>
  )
}
