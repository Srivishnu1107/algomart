import HelpClient from "./HelpClient"

// Prevent static prerender — this page uses useSearchParams() and auth
export const dynamic = "force-dynamic"

export default function HelpPage() {
    return <HelpClient />
}
