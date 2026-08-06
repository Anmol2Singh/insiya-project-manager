import * as XLSX from "xlsx"
import { createClient } from "@/lib/supabase/client"
import { syncProjectTotals } from "@/lib/project-utils"
import type {
  Project,
  LedgerEntry,
  PaymentTerm,
  Expense,
  CallingRecord,
  SwhChecklistItem,
  WorkRemark,
} from "@/lib/types"

export function exportCustomerLedgerToExcel(
  project: Project,
  entries: LedgerEntry[],
  terms: PaymentTerm[],
  expenses: Expense[],
  calls: CallingRecord[],
  checklist: SwhChecklistItem[],
  remarks: WorkRemark[]
) {
  const workbook = XLSX.utils.book_new()

  // 1. Financial Ledger Sheet
  const financialData = entries.map((e, idx) => ({
    "SR NO": e.sr_no || idx + 1,
    Date: e.date || "",
    "Payment Type": e.payment_type || "",
    "Reference Number": e.reference_number || "",
    "Invoice No": e.invoice_no || "",
    Particulars: e.particulars || "",
    "Bill Submitted": e.bill_submitted ? "Yes" : "No",
    "Payment Receipt": e.payment_receipt ? "Yes" : "No",
    "Sales M Value (Rs)": e.sales_m_value || 0,
    "M Outward Value (Rs)": e.m_outward_value || 0,
    "Order Value (Rs)": e.order_value || 0,
    "Extra Work Value (Rs)": e.extra_work_value || 0,
    "Payment Received (Rs)": e.payment_received || 0,
  }))
  const financialSheet = XLSX.utils.json_to_sheet(financialData)
  XLSX.utils.book_append_sheet(workbook, financialSheet, "Financial Ledger")

  // 2. Payment Terms Sheet
  const termsData = terms.map((t, idx) => ({
    "SR NO": idx + 1,
    "Payment Term": t.payment_term || "",
    "Term %": t.term_percentage || 0,
    "Total Amount (Rs)": t.amount || 0,
    "Received Amount (Rs)": t.received_amount || 0,
    "Pending Amount (Rs)": t.pending_amount || 0,
    Remark: t.remark || "",
  }))
  const termsSheet = XLSX.utils.json_to_sheet(termsData)
  XLSX.utils.book_append_sheet(workbook, termsSheet, "Payment Terms")

  // 3. Project Expenses Sheet
  const expensesData = expenses.map((ex, idx) => ({
    "SR NO": ex.sr_no || idx + 1,
    Date: ex.date || "",
    Particulars: ex.particular || "",
    "Expense Amount (Rs)": ex.expense || 0,
  }))
  const expensesSheet = XLSX.utils.json_to_sheet(expensesData)
  XLSX.utils.book_append_sheet(workbook, expensesSheet, "Project Expenses")

  // 4. Call Records Sheet
  const callsData = calls.map((c, idx) => ({
    "SR NO": c.sr_no || idx + 1,
    Date: c.date || "",
    "Call Description": c.description || "",
  }))
  const callsSheet = XLSX.utils.json_to_sheet(callsData)
  XLSX.utils.book_append_sheet(workbook, callsSheet, "Call Records")

  // 5. Checklist Sheet
  const checklistData = checklist.map((item, idx) => ({
    "SR NO": item.sr_no || idx + 1,
    "Item Name": item.item_name || "",
    "Req Qty": item.req_qty || 0,
    "Customer Scope": item.customer_scope ? "Yes" : "No",
    "Our Scope": item.our_scope ? "Yes" : "No",
    "Dispatch Qty": item.dispatch_qty || 0,
    "Installed Qty": item.installed_qty || 0,
    Remark: item.remark || "",
  }))
  const checklistSheet = XLSX.utils.json_to_sheet(checklistData)
  XLSX.utils.book_append_sheet(workbook, checklistSheet, "Checklist")

  // 6. Work Remarks Sheet
  const remarksData = remarks.map((r, idx) => ({
    "SR NO": r.sr_no || idx + 1,
    Date: r.date || "",
    Remark: r.remark || "",
  }))
  const remarksSheet = XLSX.utils.json_to_sheet(remarksData)
  XLSX.utils.book_append_sheet(workbook, remarksSheet, "Work Remarks")

  const cleanName = (project.site_name || "Customer").replace(/[^a-zA-Z0-9]/g, "_")
  XLSX.writeFile(workbook, `${cleanName}_Full_Ledger_${new Date().toISOString().slice(0, 10)}.xlsx`)
}

export async function importCustomerLedgerFromExcel(
  projectId: string,
  file: File
): Promise<{ success: boolean; message: string }> {
  const supabase = createClient()
  const buffer = await file.arrayBuffer()
  const workbook = XLSX.read(buffer, { type: "array" })

  let importedCount = 0

  // 1. Financial Ledger
  const financialSheetName = workbook.SheetNames.find(
    (n) => n.toLowerCase().includes("financial") || n.toLowerCase().includes("ledger")
  )
  if (financialSheetName) {
    const sheet = workbook.Sheets[financialSheetName]
    const rows: any[] = XLSX.utils.sheet_to_json(sheet)
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      const billSub = String(row["Bill Submitted"] || "").toLowerCase() === "yes" || row["Bill Submitted"] === true
      const payRec = String(row["Payment Receipt"] || "").toLowerCase() === "yes" || row["Payment Receipt"] === true

      await supabase.from("ledger_entries").insert({
        project_id: projectId,
        sr_no: Number(row["SR NO"] || row["Sr No"] || i + 1),
        date: row["Date"] || new Date().toISOString().split("T")[0],
        payment_type: row["Inventory Type"] || row["Payment Type"] || null,
        reference_number: row["Reference Number"] || row["Reference"] || null,
        invoice_no: row["Invoice No"] || row["Invoice"] || null,
        particulars: row["Particulars"] || "Imported Entry",
        bill_submitted: billSub,
        payment_receipt: payRec,
        sales_m_value: Number(row["Sales M Value (Rs)"] || row["Sales M Value"]) || 0,
        m_outward_value: Number(row["M Outward Value (Rs)"] || row["M Outward Value"]) || 0,
        order_value: Number(row["Order Value (Rs)"] || row["Order Value"]) || 0,
        extra_work_value: Number(row["Extra Work Value (Rs)"] || row["Extra Work Value"]) || 0,
        payment_received: Number(row["Payment Received (Rs)"] || row["Payment Received"]) || 0,
      })
      importedCount++
    }
  }

  // 2. Payment Terms
  const termsSheetName = workbook.SheetNames.find((n) => n.toLowerCase().includes("term"))
  if (termsSheetName) {
    const sheet = workbook.Sheets[termsSheetName]
    const rows: any[] = XLSX.utils.sheet_to_json(sheet)
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      await supabase.from("payment_terms").insert({
        project_id: projectId,
        payment_term: row["Payment Term"] || row["Term"] || `Term ${i + 1}`,
        term_percentage: Number(row["Term %"] || row["Percentage"]) || 0,
        amount: Number(row["Total Amount (Rs)"] || row["Total Amount"]) || 0,
        received_amount: Number(row["Received Amount (Rs)"] || row["Received Amount"]) || 0,
        pending_amount: Number(row["Pending Amount (Rs)"] || row["Pending Amount"]) || 0,
        remark: row["Remark"] || null,
      })
      importedCount++
    }
  }

  // 3. Project Expenses
  const expensesSheetName = workbook.SheetNames.find((n) => n.toLowerCase().includes("expense"))
  if (expensesSheetName) {
    const sheet = workbook.Sheets[expensesSheetName]
    const rows: any[] = XLSX.utils.sheet_to_json(sheet)
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      await supabase.from("expenses").insert({
        project_id: projectId,
        sr_no: Number(row["SR NO"] || i + 1),
        date: row["Date"] || new Date().toISOString().split("T")[0],
        particular: row["Particulars"] || row["Particular"] || "Expense",
        expense: Number(row["Expense Amount (Rs)"] || row["Expense Amount"] || row["Expense"]) || 0,
      })
      importedCount++
    }
  }

  // 4. Call Records
  const callsSheetName = workbook.SheetNames.find((n) => n.toLowerCase().includes("call"))
  if (callsSheetName) {
    const sheet = workbook.Sheets[callsSheetName]
    const rows: any[] = XLSX.utils.sheet_to_json(sheet)
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      await supabase.from("calling_records").insert({
        project_id: projectId,
        sr_no: Number(row["SR NO"] || i + 1),
        date: row["Date"] || new Date().toISOString().split("T")[0],
        description: row["Call Description"] || row["Description"] || "Call log",
      })
      importedCount++
    }
  }

  // 5. Checklist
  const checklistSheetName = workbook.SheetNames.find((n) => n.toLowerCase().includes("check"))
  if (checklistSheetName) {
    const sheet = workbook.Sheets[checklistSheetName]
    const rows: any[] = XLSX.utils.sheet_to_json(sheet)
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      const custScope = String(row["Customer Scope"] || "").toLowerCase() === "yes" || row["Customer Scope"] === true
      const ourScope = String(row["Our Scope"] || "").toLowerCase() === "yes" || row["Our Scope"] === true

      await supabase.from("swh_checklist").insert({
        project_id: projectId,
        sr_no: Number(row["SR NO"] || i + 1),
        item_name: row["Item Name"] || row["Item"] || `Item ${i + 1}`,
        req_qty: Number(row["Req Qty"]) || 1,
        customer_scope: custScope,
        our_scope: ourScope,
        dispatch_qty: Number(row["Dispatch Qty"]) || 0,
        installed_qty: Number(row["Installed Qty"]) || 0,
        remark: row["Remark"] || null,
      })
      importedCount++
    }
  }

  // 6. Work Remarks
  const remarksSheetName = workbook.SheetNames.find((n) => n.toLowerCase().includes("work") || n.toLowerCase().includes("remark"))
  if (remarksSheetName) {
    const sheet = workbook.Sheets[remarksSheetName]
    const rows: any[] = XLSX.utils.sheet_to_json(sheet)
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      await supabase.from("work_remarks").insert({
        project_id: projectId,
        sr_no: Number(row["SR NO"] || i + 1),
        date: row["Date"] || new Date().toISOString().split("T")[0],
        remark: row["Remark"] || "Work Remark",
      })
      importedCount++
    }
  }

  await syncProjectTotals(projectId)
  return {
    success: true,
    message: `Imported ${importedCount} ledger records from Excel successfully!`,
  }
}
