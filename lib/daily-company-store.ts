import { createClient } from "./supabase/client"

export interface DailyCompany {
  id: string
  name: string
  opening_balance: number // Always credit
  created_at?: string
}

export const DEFAULT_DAILY_COMPANIES: DailyCompany[] = [
  {
    id: "dt-comp-insiya-solar",
    name: "Insiya Solar Industry",
    opening_balance: 0,
  },
  {
    id: "dt-comp-insiya-trading",
    name: "Insiya Trading Corporation",
    opening_balance: 0,
  },
]

const LOCAL_STORAGE_COMPANIES_KEY = "daily_transaction_companies"
const LOCAL_STORAGE_ACTIVE_KEY = "daily_transaction_active_company_id"

export function getDailyCompanies(): DailyCompany[] {
  if (typeof window === "undefined") return DEFAULT_DAILY_COMPANIES

  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_COMPANIES_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed
      }
    }
  } catch (e) {}

  return DEFAULT_DAILY_COMPANIES
}

export async function fetchDailyCompaniesFromCloud(): Promise<DailyCompany[]> {
  try {
    const supabase = createClient()
    const { data } = await supabase
      .from("app_settings")
      .select("value")
      .eq("id", "daily_transaction_companies")
      .single()

    if (data?.value && Array.isArray(data.value) && data.value.length > 0) {
      if (typeof window !== "undefined") {
        localStorage.setItem(LOCAL_STORAGE_COMPANIES_KEY, JSON.stringify(data.value))
      }
      return data.value as DailyCompany[]
    }
  } catch (e) {
    console.warn("Failed to fetch daily companies from cloud:", e)
  }
  return getDailyCompanies()
}

export async function saveDailyCompanies(companies: DailyCompany[]): Promise<boolean> {
  if (typeof window !== "undefined") {
    localStorage.setItem(LOCAL_STORAGE_COMPANIES_KEY, JSON.stringify(companies))
  }

  try {
    const supabase = createClient()
    await supabase.from("app_settings").upsert({
      id: "daily_transaction_companies",
      value: companies,
    })
    return true
  } catch (e) {
    console.warn("Failed to save daily companies to cloud:", e)
    return false
  }
}

export function getActiveDailyCompany(): DailyCompany {
  const companies = getDailyCompanies()
  if (typeof window === "undefined") return companies[0] || DEFAULT_DAILY_COMPANIES[0]

  try {
    const activeId = localStorage.getItem(LOCAL_STORAGE_ACTIVE_KEY)
    if (activeId) {
      const found = companies.find((c) => c.id === activeId)
      if (found) return found
    }
  } catch (e) {}

  return companies[0] || DEFAULT_DAILY_COMPANIES[0]
}

export function setActiveDailyCompany(companyId: string): DailyCompany {
  const companies = getDailyCompanies()
  const found = companies.find((c) => c.id === companyId) || companies[0] || DEFAULT_DAILY_COMPANIES[0]

  if (typeof window !== "undefined") {
    localStorage.setItem(LOCAL_STORAGE_ACTIVE_KEY, found.id)
  }
  return found
}

export async function addDailyCompany(name: string, openingBalance: number = 0): Promise<DailyCompany> {
  const companies = getDailyCompanies()
  const newCompany: DailyCompany = {
    id: `dt-comp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    name: name.trim(),
    opening_balance: Number(openingBalance) || 0,
    created_at: new Date().toISOString(),
  }

  const updated = [...companies, newCompany]
  await saveDailyCompanies(updated)
  setActiveDailyCompany(newCompany.id)
  return newCompany
}

export async function updateDailyCompany(
  id: string,
  updates: Partial<Omit<DailyCompany, "id">>
): Promise<DailyCompany[]> {
  const companies = getDailyCompanies()
  const updated = companies.map((c) => (c.id === id ? { ...c, ...updates } : c))
  await saveDailyCompanies(updated)
  return updated
}

export async function deleteDailyCompany(id: string): Promise<DailyCompany[]> {
  const companies = getDailyCompanies()
  if (companies.length <= 1) {
    throw new Error("Cannot delete the only remaining company")
  }
  const updated = companies.filter((c) => c.id !== id)
  await saveDailyCompanies(updated)
  setActiveDailyCompany(updated[0].id)
  return updated
}
