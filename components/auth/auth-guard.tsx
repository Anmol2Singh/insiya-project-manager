"use client"

import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { isSessionActive } from "@/lib/auth-store"

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)

  useEffect(() => {
    // Basic protection client-side
    const active = isSessionActive()
    
    // Always allow /login
    if (pathname === '/login') {
      setIsAuthenticated(true)
      return
    }

    if (!active) {
      router.replace('/login')
    } else {
      setIsAuthenticated(true)
    }
  }, [pathname, router])

  // Don't render anything while checking auth to prevent flash of content
  if (isAuthenticated === null) {
    return <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="h-8 w-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
    </div>
  }

  // Prevent rendering children if not authenticated (before redirect kicks in)
  if (!isAuthenticated && pathname !== '/login') {
    return null
  }

  return <>{children}</>
}
