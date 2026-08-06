import initialData from "../supabase_data_backup.json"
import { getActiveCompany } from "./company-store"

type TableName =
  | "projects"
  | "payment_terms"
  | "ledger_entries"
  | "expenses"
  | "calling_records"
  | "swh_checklist"
  | "work_remarks"

interface DBData {
  projects: any[]
  payment_terms: any[]
  ledger_entries: any[]
  expenses: any[]
  calling_records: any[]
  swh_checklist: any[]
  work_remarks: any[]
}

const EMPTY_DB: DBData = {
  projects: [],
  payment_terms: [],
  ledger_entries: [],
  expenses: [],
  calling_records: [],
  swh_checklist: [],
  work_remarks: [],
}

export function getCompanyStorageKey(): string {
  if (typeof window === "undefined") return "checklist_app_local_db_v1"
  const activeComp = getActiveCompany()
  const compId = (activeComp && activeComp.id) || "insiya-solar"
  return `checklist_app_local_db_${compId}`
}

export function getStoredData(): DBData {
  if (typeof window === "undefined") {
    return initialData as DBData
  }

  const key = getCompanyStorageKey()
  let raw = localStorage.getItem(key)

  // Migration logic for initial "insiya-solar" company
  if (!raw) {
    if (key.includes("insiya-solar")) {
      const oldRaw = localStorage.getItem("checklist_app_local_db_v1")
      if (oldRaw) {
        raw = oldRaw
        localStorage.setItem(key, oldRaw)
      } else {
        localStorage.setItem(key, JSON.stringify(initialData))
        return initialData as DBData
      }
    } else {
      localStorage.setItem(key, JSON.stringify(EMPTY_DB))
      return EMPTY_DB
    }
  }

  try {
    const parsed = JSON.parse(raw)

    // If insiya-solar projects list is empty or missing, auto-restore from initialData
    if (key.includes("insiya-solar") && (!parsed.projects || parsed.projects.length === 0)) {
      localStorage.setItem(key, JSON.stringify(initialData))
      return initialData as DBData
    }

    const fullData: DBData = {
      projects: parsed.projects || [],
      payment_terms: parsed.payment_terms || [],
      ledger_entries: parsed.ledger_entries || [],
      expenses: parsed.expenses || [],
      calling_records: parsed.calling_records || [],
      swh_checklist: parsed.swh_checklist || [],
      work_remarks: parsed.work_remarks || [],
    }
    return fullData
  } catch (e) {
    if (key.includes("insiya-solar")) {
      localStorage.setItem(key, JSON.stringify(initialData))
      return initialData as DBData
    }
    return EMPTY_DB
  }
}

export function setStoredData(data: DBData) {
  if (typeof window !== "undefined") {
    const key = getCompanyStorageKey()
    localStorage.setItem(key, JSON.stringify(data))
  }
}

export function generateUUID(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === "x" ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

class QueryBuilder {
  private table: TableName
  private filters: Array<{ column: string; value: any }> = []
  private orderConfig: { column: string; ascending: boolean } | null = null
  private isSingle = false
  private action: "select" | "insert" | "update" | "delete" = "select"
  private payload: any = null

  constructor(table: TableName) {
    this.table = table
  }

  select(query: string = "*") {
    return this
  }

  insert(payload: any) {
    this.action = "insert"
    this.payload = payload
    return this
  }

  update(payload: any) {
    this.action = "update"
    this.payload = payload
    return this
  }

  delete() {
    this.action = "delete"
    return this
  }

  eq(column: string, value: any) {
    this.filters.push({ column, value })
    return this
  }

  order(column: string, options: { ascending?: boolean } = { ascending: true }) {
    this.orderConfig = { column, ascending: options.ascending !== false }
    return this
  }

  limit(n: number) {
    return this
  }

  single() {
    this.isSingle = true
    return this
  }

  async then(resolve: (res: { data: any; error: any }) => void) {
    try {
      const db = getStoredData()
      const rows = [...(db[this.table] || [])]

      if (this.action === "insert") {
        const items = Array.isArray(this.payload) ? this.payload : [this.payload]
        const created: any[] = []

        for (const item of items) {
          const now = new Date().toISOString()
          let idNo = item.id_no
          if (this.table === "projects" && !idNo) {
            const maxIdNo = rows.reduce((max, r) => Math.max(max, r.id_no || 0), 1000)
            idNo = maxIdNo + 1
          }

          const newItem = {
            id: item.id || generateUUID(),
            created_at: now,
            updated_at: now,
            ...(this.table === "projects" ? { id_no: idNo } : {}),
            ...item,
          }
          rows.push(newItem)
          created.push(newItem)
        }

        db[this.table] = rows
        setStoredData(db)

        const resultData = this.isSingle ? created[0] : created
        resolve({ data: resultData, error: null })
        return
      }

      if (this.action === "update") {
        const updatedItems: any[] = []
        db[this.table] = rows.map((row) => {
          const matches = this.filters.every((f) => String(row[f.column]) === String(f.value))
          if (matches) {
            const updatedRow = {
              ...row,
              ...this.payload,
              updated_at: new Date().toISOString(),
            }
            updatedItems.push(updatedRow)
            return updatedRow
          }
          return row
        })

        setStoredData(db)
        const resultData = this.isSingle ? updatedItems[0] || null : updatedItems
        resolve({ data: resultData, error: null })
        return
      }

      if (this.action === "delete") {
        const deleted: any[] = []
        db[this.table] = rows.filter((row) => {
          const matches = this.filters.every((f) => String(row[f.column]) === String(f.value))
          if (matches) {
            deleted.push(row)
            return false
          }
          return true
        })

        setStoredData(db)
        resolve({ data: deleted, error: null })
        return
      }

      // SELECT ACTION
      let filtered = rows.filter((row) => {
        return this.filters.every((f) => String(row[f.column]) === String(f.value))
      })

      if (this.orderConfig) {
        const { column, ascending } = this.orderConfig
        filtered.sort((a, b) => {
          const valA = a[column]
          const valB = b[column]
          if (valA < valB) return ascending ? -1 : 1
          if (valA > valB) return ascending ? 1 : -1
          return 0
        })
      }

      if (this.isSingle) {
        resolve({ data: filtered[0] || null, error: filtered.length === 0 ? { message: "Row not found" } : null })
      } else {
        resolve({ data: filtered, error: null })
      }
    } catch (e: any) {
      resolve({ data: null, error: e })
    }
  }
}

export function createLocalClient() {
  return {
    from: (table: TableName) => new QueryBuilder(table),
  }
}
