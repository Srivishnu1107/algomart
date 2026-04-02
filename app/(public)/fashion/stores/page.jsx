import FashionStoresClient from "./FashionStoresClient"

// Prevent static prerender — this page uses useSearchParams() and usePathname()
export const dynamic = "force-dynamic"

export default function FashionStoresPage() {
    return <FashionStoresClient />
}
