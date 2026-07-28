export interface Project {
  id: string
  id_no: number
  order_type: string
  site_name: string
  address: string
  hp_type: string | null
  hp_qty: number | null
  tank_type: string | null
  tank_qty: number | null
  sales_m_value: number
  m_outward_value: number
  m_balance: number
  order_value: number
  extra_work_value: number
  payment_received: number
  work_remark: string | null
  balance: number
  created_at: string
  updated_at: string
}

export interface PaymentTerm {
  id: string
  project_id: string
  payment_term: string
  term_percentage: number | null
  amount: number | null
  received_amount: number | null
  pending_amount: number | null
  remark: string | null
  created_at: string
}

export interface LedgerEntry {
  id: string
  project_id: string
  sr_no: number
  date: string
  payment_type: string | null
  reference_number: string | null
  invoice_no: string | null
  particulars: string | null
  bill_submitted: boolean
  sales_m_value: number
  m_outward_value: number
  order_value: number
  extra_work_value: number
  payment_received: number
  work_remark: string | null
  created_at: string
}

export interface Expense {
  id: string
  project_id: string
  sr_no: number
  date: string
  particular: string | null
  expense: number
  created_at: string
}

export interface CallingRecord {
  id: string
  project_id: string
  sr_no: number
  date: string
  description: string | null
  created_at: string
}

export interface SwhChecklistItem {
  id: string
  project_id: string
  sr_no: number
  item_name: string
  req_qty: number | null
  customer_scope: boolean
  our_scope: boolean
  dispatch_qty: number | null
  dispatch_yes_no: boolean
  installed_qty: number | null
  installation_yes_no: boolean
  dispatch_balance_qty: number | null
  remark: string | null
  created_at: string
}

export interface WorkRemark {
  id: string
  project_id: string
  sr_no: number
  date: string
  remark: string | null
  created_at: string
}

export type ProjectSummary = Pick<Project,
  'id' | 'id_no' | 'order_type' | 'site_name' | 'address' |
  'sales_m_value' | 'm_outward_value' | 'm_balance' |
  'order_value' | 'extra_work_value' | 'payment_received' |
  'work_remark' | 'balance'
>
