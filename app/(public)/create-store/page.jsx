import CreateStoreClient from "./CreateStoreClient"

// Prevent static prerender — this page uses useSearchParams() and auth, which need request context
export const dynamic = "force-dynamic"

export default function CreateStorePage() {
    return <CreateStoreClient />
}
