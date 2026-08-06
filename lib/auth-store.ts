import { createClient } from "./supabase/client"

export type UserRole = 'admin' | 'edit' | 'view'

export interface AppUser {
  userId: string
  password?: string // Omitted when checking session
  role: UserRole
}

export async function getAppUsers(): Promise<AppUser[]> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('app_settings')
      .select('value')
      .eq('id', 'app_users')
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        // No row found, let's fall back to trying to migrate from admin_credentials
        const adminData = await getLegacyAdminCredentials()
        const defaultUsers: AppUser[] = [
          { userId: adminData.email || 'admin@insiya.com', password: adminData.password || 'admin@123', role: 'admin' }
        ]
        // Auto-save the migrated list
        await saveAppUsers(defaultUsers)
        return defaultUsers
      }
      console.warn("Could not fetch users from Supabase:", error.message)
      return []
    }

    if (data && data.value && Array.isArray(data.value)) {
      return data.value as AppUser[]
    }
  } catch (err) {
    console.error("Error fetching app users:", err)
  }
  return [{ userId: 'admin@insiya.com', password: 'admin@123', role: 'admin' }]
}

async function getLegacyAdminCredentials() {
  const supabase = createClient()
  const { data } = await supabase
    .from('app_settings')
    .select('value')
    .eq('id', 'admin_credentials')
    .single()
  
  if (data?.value) {
    return data.value
  }
  return { email: 'admin@insiya.com', password: 'admin@123' }
}

export async function saveAppUsers(users: AppUser[]) {
  try {
    const supabase = createClient()
    const { error } = await supabase
      .from('app_settings')
      .upsert({ id: 'app_users', value: users as any })
      
    if (error) throw error
    return true
  } catch (err) {
    console.error("Error saving app users:", err)
    throw err
  }
}

export function setSessionActive(user: AppUser) {
  if (typeof window !== "undefined") {
    const sessionData = {
      userId: user.userId,
      role: user.role,
      token: btoa(Date.now().toString() + "_" + user.userId)
    }
    localStorage.setItem("auth_session", JSON.stringify(sessionData))
  }
}

export function getSessionData(): { userId: string, role: UserRole } | null {
  if (typeof window === "undefined") return null
  try {
    const raw = localStorage.getItem("auth_session")
    if (raw) return JSON.parse(raw)
  } catch(e) {
    console.error("Failed to parse auth session", e)
  }
  return null
}

export function isSessionActive(): boolean {
  return getSessionData() !== null
}

export function clearSession() {
  if (typeof window !== "undefined") {
    localStorage.removeItem("auth_session")
  }
}

export function hasEditPermission(): boolean {
  const session = getSessionData()
  if (!session) return false
  return session.role === 'admin' || session.role === 'edit'
}

export function isAdmin(): boolean {
  const session = getSessionData()
  if (!session) return false
  return session.role === 'admin'
}
