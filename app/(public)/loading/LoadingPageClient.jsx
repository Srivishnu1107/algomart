'use client'

import Loading from "@/components/Loading"
import { useRouter } from "next/navigation"
import { useEffect } from "react"

export default function LoadingPageClient() {
  const router = useRouter()

  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const url = params.get('nextUrl')

    if (url) {
      const t = setTimeout(() => {
        router.push(url)
      }, 8000)
      return () => clearTimeout(t)
    }
  }, [router])

  return <Loading />
}
