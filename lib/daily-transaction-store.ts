import { createClient } from "@/lib/supabase/client"
import { getActiveDailyCompany } from "@/lib/daily-company-store"
import {
  DailyTransaction,
  TimeframeFilter,
  DailyPdfColumnsConfig,
  DEFAULT_DAILY_PDF_COLUMNS,
} from "./daily-transaction-types"

// Default options for dropdowns
export const DEFAULT_PAYMENT_MODES = [
  "Cash",
  "Bank Transfer / NEFT",
  "RTGS",
  "Cheque",
  "UPI / GPay / PhonePe",
  "Card / POS",
  "Online Gateway"
]

export const DEFAULT_CREDIT_PARTIES = [
  "Client / Customer",
  "Direct Sale Buyer",
  "HDFC Bank",
  "ICICI Bank",
  "State Bank of India",
  "Self / Cash"
]

export const DEFAULT_DEBIT_PARTIES = [
  "Material Supplier",
  "Transport Agency",
  "Site Contractor",
  "Office Landlord",
  "Vendor / Fabricator",
  "Staff Member",
  "Self / Cash"
]

export const DEFAULT_CREDIT_TRANSACTIONS = [
  "Advance Received",
  "Final Payment Received",
  "Project Milestone Payment",
  "Scrap Sale",
  "Customer Refund Recovery",
  "Other Inward Income"
]

export const DEFAULT_DEBIT_TRANSACTIONS = [
  "Material Purchase",
  "Site Installation Expense",
  "Freight & Transport",
  "Office Expense",
  "Staff Salary / Advance",
  "Vendor Payment",
  "Customer Refund",
  "GST Payment",
  "Miscellaneous Expense"
]

export type DailyDropdownKey =
  | "payment_modes"
  | "parties_credit"
  | "parties_debit"
  | "transactions_credit"
  | "transactions_debit"
  | "firms"

// ----------------- Dropdowns Management -----------------

export async function getDailyDropdownOptions(
  key: DailyDropdownKey
): Promise<string[]> {
  const settingKey = `daily_dropdown_${key}`
  const defaultMap: Record<DailyDropdownKey, string[]> = {
    payment_modes: DEFAULT_PAYMENT_MODES,
    parties_credit: DEFAULT_CREDIT_PARTIES,
    parties_debit: DEFAULT_DEBIT_PARTIES,
    transactions_credit: DEFAULT_CREDIT_TRANSACTIONS,
    transactions_debit: DEFAULT_DEBIT_TRANSACTIONS,
    firms: ["Insiya Solar Industry", "Insiya Trading Corporation"],
  }

  // Check localStorage first for instant speed
  if (typeof window !== "undefined") {
    const local = localStorage.getItem(settingKey)
    if (local) {
      try {
        const parsed = JSON.parse(local)
        if (Array.isArray(parsed) && parsed.length > 0) return parsed
      } catch (e) {}
    }
  }

  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from("app_settings")
      .select("value")
      .eq("id", settingKey)
      .single()

    if (data?.value && Array.isArray(data.value) && data.value.length > 0) {
      if (typeof window !== "undefined") {
        localStorage.setItem(settingKey, JSON.stringify(data.value))
      }
      return data.value as string[]
    }
  } catch (err) {
    console.warn(`Failed to fetch dropdown for ${key}:`, err)
  }

  return defaultMap[key] || []
}

export async function saveDailyDropdownOptions(
  key: DailyDropdownKey,
  options: string[]
): Promise<boolean> {
  const settingKey = `daily_dropdown_${key}`
  if (typeof window !== "undefined") {
    localStorage.setItem(settingKey, JSON.stringify(options))
  }

  try {
    const supabase = createClient()
    const { error } = await supabase
      .from("app_settings")
      .upsert({ id: settingKey, value: options })

    if (error) throw error
    return true
  } catch (err) {
    console.warn(`Failed to save dropdown for ${key}:`, err)
    return false
  }
}

// ----------------- PDF Columns Config -----------------

export function getDailyPdfColumnsConfig(): DailyPdfColumnsConfig {
  if (typeof window === "undefined") return DEFAULT_DAILY_PDF_COLUMNS
  try {
    const raw = localStorage.getItem("daily_pdf_columns_config")
    if (raw) {
      return { ...DEFAULT_DAILY_PDF_COLUMNS, ...JSON.parse(raw) }
    }
  } catch (e) {}
  return DEFAULT_DAILY_PDF_COLUMNS
}

export function saveDailyPdfColumnsConfig(config: DailyPdfColumnsConfig) {
  if (typeof window !== "undefined") {
    localStorage.setItem("daily_pdf_columns_config", JSON.stringify(config))
  }
}

// ----------------- Transactions CRUD -----------------

function getLocalTransactionsKey(companyId: string): string {
  return `daily_transactions_data_${companyId || "default"}`
}

export async function getDailyTransactions(companyId?: string): Promise<DailyTransaction[]> {
  const targetCompany = companyId || getActiveDailyCompany()?.id || "default"
  const localKey = getLocalTransactionsKey(targetCompany)

  // 1. Try native daily_transactions table first
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from("daily_transactions")
      .select("*")
      .eq("company_id", targetCompany)
      .order("date", { ascending: false })
      .order("sr_no", { ascending: false })

    if (!error && data) {
      if (typeof window !== "undefined") {
        localStorage.setItem(localKey, JSON.stringify(data))
      }
      return data as DailyTransaction[]
    }
  } catch (e) {}

  // 2. Fallback to app_settings key
  try {
    const supabase = createClient()
    const { data } = await supabase
      .from("app_settings")
      .select("value")
      .eq("id", `daily_transactions_${targetCompany}`)
      .single()

    if (data?.value && Array.isArray(data.value)) {
      if (typeof window !== "undefined") {
        localStorage.setItem(localKey, JSON.stringify(data.value))
      }
      return data.value as DailyTransaction[]
    }
  } catch (e) {}

  // 3. Fallback to localStorage
  if (typeof window !== "undefined") {
    const raw = localStorage.getItem(localKey)
    if (raw) {
      try {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed)) return parsed
      } catch (e) {}
    }
  }

  return []
}

export async function saveDailyTransactionsBatch(
  companyId: string,
  transactions: DailyTransaction[]
): Promise<boolean> {
  const targetCompany = companyId || getActiveDailyCompany()?.id || "default"
  const localKey = getLocalTransactionsKey(targetCompany)

  if (typeof window !== "undefined") {
    localStorage.setItem(localKey, JSON.stringify(transactions))
  }

  // Attempt saving to app_settings
  try {
    const supabase = createClient()
    const { error } = await supabase
      .from("app_settings")
      .upsert({
        id: `daily_transactions_${targetCompany}`,
        value: transactions,
      })

    if (!error) return true
  } catch (e) {
    console.warn("Failed saving transactions to app_settings:", e)
  }

  return true
}

export async function upsertDailyTransaction(
  item: Omit<DailyTransaction, "id" | "created_at"> & { id?: string }
): Promise<DailyTransaction> {
  const targetCompany = item.company_id || getActiveDailyCompany()?.id || "default"
  const existingList = await getDailyTransactions(targetCompany)

  const isNew = !item.id
  const now = new Date().toISOString()
  const recordId = item.id || `dt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`

  // Calculate next Sr No if not provided or 0
  let calculatedSrNo = item.sr_no
  if (!calculatedSrNo || calculatedSrNo <= 0) {
    const highestSrNo = existingList.reduce((max, t) => Math.max(max, t.sr_no || 0), 0)
    calculatedSrNo = highestSrNo + 1
  }

  const transactionRecord: DailyTransaction = {
    ...item,
    id: recordId,
    company_id: targetCompany,
    sr_no: calculatedSrNo,
    created_at: isNew ? now : (existingList.find(t => t.id === recordId)?.created_at || now),
    updated_at: now,
  }

  // 1. Try native table
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from("daily_transactions")
      .upsert(transactionRecord)
      .select()
      .single()

    if (!error && data) {
      const updatedList = isNew
        ? [data as DailyTransaction, ...existingList]
        : existingList.map(t => (t.id === recordId ? (data as DailyTransaction) : t))
      await saveDailyTransactionsBatch(targetCompany, updatedList)
      return data as DailyTransaction
    }
  } catch (e) {}

  // 2. Fallback to array storage
  const updatedList = isNew
    ? [transactionRecord, ...existingList]
    : existingList.map(t => (t.id === recordId ? transactionRecord : t))

  await saveDailyTransactionsBatch(targetCompany, updatedList)
  return transactionRecord
}

export async function deleteDailyTransaction(id: string, companyId?: string): Promise<boolean> {
  const targetCompany = companyId || getActiveDailyCompany()?.id || "default"
  const existingList = await getDailyTransactions(targetCompany)
  const filtered = existingList.filter(t => t.id !== id)

  // Try native table
  try {
    const supabase = createClient()
    await supabase.from("daily_transactions").delete().eq("id", id)
  } catch (e) {}

  await saveDailyTransactionsBatch(targetCompany, filtered)
  return true
}

export async function bulkDeleteDailyTransactions(ids: string[], companyId?: string): Promise<boolean> {
  const targetCompany = companyId || getActiveDailyCompany()?.id || "default"
  const idSet = new Set(ids)
  const existingList = await getDailyTransactions(targetCompany)
  const filtered = existingList.filter(t => !idSet.has(t.id))

  // Try native table
  try {
    const supabase = createClient()
    await supabase.from("daily_transactions").delete().in("id", ids)
  } catch (e) {}

  await saveDailyTransactionsBatch(targetCompany, filtered)
  return true
}

// ----------------- Timeframe Filtering & Totals -----------------

export function filterTransactionsByTimeframe(
  transactions: DailyTransaction[],
  timeframe: TimeframeFilter,
  customStart?: string,
  customEnd?: string
): DailyTransaction[] {
  if (timeframe === "Lifetime") return transactions

  const now = new Date()
  const todayStr = now.toISOString().split("T")[0]

  if (timeframe === "Today") {
    return transactions.filter(t => {
      if (!t.date) return false
      const dStr = t.date.split("T")[0]
      return dStr === todayStr
    })
  }

  if (timeframe === "Week") {
    const sevenDaysAgo = new Date(now)
    sevenDaysAgo.setDate(now.getDate() - 6)
    sevenDaysAgo.setHours(0, 0, 0, 0)
    const sevenDaysAgoStr = sevenDaysAgo.toISOString().split("T")[0]

    return transactions.filter(t => {
      if (!t.date) return false
      const dStr = t.date.split("T")[0]
      return dStr >= sevenDaysAgoStr && dStr <= todayStr
    })
  }

  if (timeframe === "Month") {
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth() + 1
    const monthPrefix = `${currentYear}-${String(currentMonth).padStart(2, "0")}`

    return transactions.filter(t => {
      if (!t.date) return false
      return t.date.startsWith(monthPrefix)
    })
  }

  if (timeframe === "Custom") {
    return transactions.filter(t => {
      if (!t.date) return false
      const dStr = t.date.split("T")[0]
      if (customStart && dStr < customStart) return false
      if (customEnd && dStr > customEnd) return false
      return true
    })
  }

  return transactions
}

export function calculateTimeframeTotals(
  transactions: DailyTransaction[],
  openingBalance: number = 0
): {
  credit: number
  debit: number
  balance: number
} {
  let credit = 0
  let debit = 0

  transactions.forEach(t => {
    credit += Number(t.credit_amount) || 0
    debit += Number(t.debit_amount) || 0
  })

  return {
    credit,
    debit,
    balance: (Number(openingBalance) || 0) + credit - debit,
  }
}
