export type EntryNature = 'Purchase' | 'Sale' | 'Expense'
export type TransactionFlow = 'credit' | 'debit'

export interface DailyTransaction {
  id: string
  company_id: string
  sr_no: number
  date: string // YYYY-MM-DD
  firm_name: string
  party_name: string
  payment_mode: string
  transaction_name: string
  entry_nature: EntryNature
  type: TransactionFlow // 'credit' | 'debit'
  debit_amount: number
  credit_amount: number
  remark?: string
  created_at: string
  updated_at?: string
}

export type TimeframeFilter = 'Today' | 'Week' | 'Month' | 'Lifetime' | 'Custom'

export interface DailyPdfColumnsConfig {
  sr_no: boolean
  date: boolean
  firm_name: boolean
  party_name: boolean
  payment_mode: boolean
  transaction_name: boolean
  entry_nature: boolean
  remark: boolean
  debit: boolean
  credit: boolean
}

export const DEFAULT_DAILY_PDF_COLUMNS: DailyPdfColumnsConfig = {
  sr_no: true,
  date: true,
  firm_name: true,
  party_name: true,
  payment_mode: true,
  transaction_name: true,
  entry_nature: true,
  remark: true,
  debit: true,
  credit: true,
}

export interface DailyTransactionFilterState {
  searchQuery: string
  startDate: string
  endDate: string
  firmName: string
  partyName: string
  paymentMode: string
  transactionName: string
  entryNature: string // 'ALL' | 'Purchase' | 'Sale' | 'Expense'
  flowType: string // 'ALL' | 'credit' | 'debit'
}

export const INITIAL_FILTER_STATE: DailyTransactionFilterState = {
  searchQuery: '',
  startDate: '',
  endDate: '',
  firmName: 'ALL',
  partyName: 'ALL',
  paymentMode: 'ALL',
  transactionName: 'ALL',
  entryNature: 'ALL',
  flowType: 'ALL',
}
