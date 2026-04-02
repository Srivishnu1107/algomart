import DealsPageClient from './DealsPageClient'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Deals of the Day - GoCart',
  description: 'Best discounts and deals on electronics and fashion',
}

export default function DealsPage() {
  return <DealsPageClient />
}
