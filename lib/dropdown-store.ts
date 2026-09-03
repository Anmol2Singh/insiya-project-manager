import { createClient } from "@/lib/supabase/client"

export const DEFAULT_ORDER_TYPES = [
  "Heat Pump",
  "SWH",
  "Solar Water Heater",
  "Solar System",
  "Commercial SWH",
]

export const DEFAULT_SALESMAN_OPTIONS = ["Sales Person 1", "Sales Person 2"]

export const DEFAULT_FIRM_OPTIONS = ["Firm A", "Firm B"]

export async function getDropdownCategories(): Promise<string[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("app_settings")
    .select("value")
    .eq("id", "dropdown_categories")
    .single()

  if (error || !data) {
    if (error?.code !== 'PGRST116') { // PGRST116 is "Results contain 0 rows"
      console.error("Error fetching categories:", error)
    }
    return DEFAULT_ORDER_TYPES
  }

  return data.value as string[]
}

export async function saveDropdownCategories(categories: string[]): Promise<boolean> {
  const supabase = createClient()
  const { error } = await supabase
    .from("app_settings")
    .upsert({
      id: "dropdown_categories",
      value: categories,
    })

  if (error) {
    console.error("Error saving categories:", error)
    return false
  }
  return true
}

export async function getDropdownSalesmen(): Promise<string[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("app_settings")
    .select("value")
    .eq("id", "dropdown_salesman")
    .single()

  if (error || !data) {
    if (error?.code !== 'PGRST116') {
      console.error("Error fetching salesmen:", error)
    }
    return DEFAULT_SALESMAN_OPTIONS
  }

  return data.value as string[]
}

export async function saveDropdownSalesmen(salesmen: string[]): Promise<boolean> {
  const supabase = createClient()
  const { error } = await supabase
    .from("app_settings")
    .upsert({
      id: "dropdown_salesman",
      value: salesmen,
    })

  if (error) {
    console.error("Error saving salesmen:", error)
    return false
  }
  return true
}

export async function getDropdownFirms(): Promise<string[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("app_settings")
    .select("value")
    .eq("id", "dropdown_firms")
    .single()

  if (error || !data) {
    if (error?.code !== 'PGRST116') {
      console.error("Error fetching firms:", error)
    }
    return DEFAULT_FIRM_OPTIONS
  }

  return data.value as string[]
}

export async function saveDropdownFirms(firms: string[]): Promise<boolean> {
  const supabase = createClient()
  const { error } = await supabase
    .from("app_settings")
    .upsert({
      id: "dropdown_firms",
      value: firms,
    })

  if (error) {
    console.error("Error saving firms:", error)
    return false
  }
  return true
}
