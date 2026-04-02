import FashionCreateStoreClient from "./FashionCreateStoreClient"

// Prevent static prerender — this page uses useSearchParams() and auth
export const dynamic = "force-dynamic"

export default function FashionCreateStorePage() {
    return <FashionCreateStoreClient />
}
