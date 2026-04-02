import StoresClient from "./StoresClient"

// Prevent static prerender — this page uses useSearchParams()
export const dynamic = "force-dynamic"

export default function StoresPage() {
    return <StoresClient />
}
