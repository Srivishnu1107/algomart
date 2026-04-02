import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default function FashionCartPage() {
  redirect('/cart?from=fashion')
}
