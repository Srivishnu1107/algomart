import UserProfiles from '@/components/fashion/UserProfiles'

/** Avoid prerender: layout uses useSearchParams/Clerk/Redux; UserProfiles uses localStorage. */
export const dynamic = 'force-dynamic'

export default function FashionAdjustmentsPage() {
  return <UserProfiles />
}
