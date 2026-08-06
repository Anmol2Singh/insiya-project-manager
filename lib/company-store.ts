export interface Company {
  id: string
  name: string
  tagline?: string
}

export const DEFAULT_COMPANIES: Company[] = [
  {
    id: "insiya-solar",
    name: "Insiya Solar Industry",
    tagline: "Solar & Heat Pump Project Manager",
  },
  {
    id: "insiya-trading",
    name: "Insiya Trading Corporation",
    tagline: "Trading & Supply Project Manager",
  },
]

export function getCompanies(): Company[] {
  if (typeof window === "undefined") return DEFAULT_COMPANIES
  const raw = localStorage.getItem("app_companies_list")
  if (!raw) {
    localStorage.setItem("app_companies_list", JSON.stringify(DEFAULT_COMPANIES))
    return DEFAULT_COMPANIES
  }
  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed
    }
  } catch (e) {
    console.error("Error reading companies:", e)
  }
  localStorage.setItem("app_companies_list", JSON.stringify(DEFAULT_COMPANIES))
  return DEFAULT_COMPANIES
}

export function saveCompanies(companies: Company[]) {
  if (typeof window !== "undefined") {
    const listToSave = Array.isArray(companies) && companies.length > 0 ? companies : DEFAULT_COMPANIES
    localStorage.setItem("app_companies_list", JSON.stringify(listToSave))
  }
}

export function getActiveCompany(): Company {
  const companies = getCompanies()
  const fallback = (companies && companies[0]) || DEFAULT_COMPANIES[0]
  if (typeof window === "undefined") return fallback
  const activeId = localStorage.getItem("active_company_id")
  const found = companies.find((c) => c && c.id === activeId)
  return found || fallback
}

export function setActiveCompanyId(id: string) {
  if (typeof window !== "undefined") {
    localStorage.setItem("active_company_id", id)
  }
}

export function deleteCompany(id: string) {
  if (typeof window !== "undefined") {
    let companies = getCompanies().filter((c) => c && c.id !== id)
    if (companies.length === 0) {
      companies = DEFAULT_COMPANIES
    }
    saveCompanies(companies)
    localStorage.removeItem(`checklist_app_local_db_${id}`)
    const activeId = localStorage.getItem("active_company_id")
    if (activeId === id) {
      setActiveCompanyId(companies[0].id)
    }
  }
}
