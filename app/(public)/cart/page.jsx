import { Suspense } from 'react'
import CartContent from './CartContent'

export const dynamic = 'force-dynamic'

function CartFallback() {
  return (
    <div className="min-h-screen mx-4 sm:mx-6 flex items-center justify-center bg-[#0a0a0b]">
      <div className="text-zinc-500">Loading cart…</div>
    </div>
  )
}

export default function CartPage() {
  return (
    <Suspense fallback={<CartFallback />}>
      <CartContent />
    </Suspense>
  )
}
