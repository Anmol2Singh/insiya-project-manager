"use client"

import React, { useState } from "react"
import * as XLSX from "xlsx"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import {
  Upload,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  AlertTriangle,
  FileText,
} from "lucide-react"
import {
  getDailyTransactions,
  saveDailyTransactionsBatch,
  getDailyDropdownOptions,
  saveDailyDropdownOptions,
} from "@/lib/daily-transaction-store"
import { DailyTransaction, EntryNature } from "@/lib/daily-transaction-types"
import { toast } from "sonner"

interface ImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  companyId: string
  onSuccess: () => void
}

interface ParsedRowValidation {
  rowNum: number
  date: string
  partyName: string
  paymentMode: string
  transactionName: string
  nature: string
  debit: number
  credit: number
  remark: string
  missingFields: string[]
}

export function DailyImportDialog({
  open,
  onOpenChange,
  companyId,
  onSuccess,
}: ImportDialogProps) {
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [validatedRows, setValidatedRows] = useState<ParsedRowValidation[]>([])

  const handleDownloadTemplate = () => {
    const sampleData = [
      {
        "S No": 1,
        "Date": "06/09/2026",
        "Firm Name": "Insiya Solar Industry",
        "Party Name": "HDFC Bank",
        "Payment Mode": "Bank Transfer / NEFT",
        "Transaction": "Advance Received",
        "Nature": "Sale",
        "Debit": 0,
        "Credit": 150000,
        "Remark": "Customer advance received for solar installation",
      },
      {
        "S No": 2,
        "Date": "06/09/2026",
        "Firm Name": "Insiya Trading Corporation",
        "Party Name": "Material Supplier",
        "Payment Mode": "RTGS",
        "Transaction": "Material Purchase",
        "Nature": "Purchase",
        "Debit": 85000,
        "Credit": 0,
        "Remark": "50KW Heat Pump compressor purchase",
      },
      {
        "S No": 3,
        "Date": "06/09/2026",
        "Firm Name": "Insiya Solar Industry",
        "Party Name": "Self / Cash",
        "Payment Mode": "Cash",
        "Transaction": "Office Expense",
        "Nature": "Expense",
        "Debit": 2500,
        "Credit": 0,
        "Remark": "Office cleaning and pantry supplies",
      },
    ]

    const worksheet = XLSX.utils.json_to_sheet(sampleData)
    // Auto column widths
    worksheet["!cols"] = [
      { wch: 8 },
      { wch: 14 },
      { wch: 26 },
      { wch: 22 },
      { wch: 22 },
      { wch: 24 },
      { wch: 12 },
      { wch: 14 },
      { wch: 14 },
      { wch: 35 },
    ]

    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, "Daily Transactions")
    XLSX.writeFile(workbook, "Daily_Transactions_Template.xlsx")
    toast.success("Excel template downloaded!")
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0]
    if (!selected) return

    setFile(selected)
    const reader = new FileReader()
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result
        const workbook = XLSX.read(bstr, { type: "binary", cellDates: true })
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]
        const rawJson: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: "" })

        // Validate each row for missing / empty columns
        const parsedList: ParsedRowValidation[] = []

        for (let i = 0; i < rawJson.length; i++) {
          const row = rawJson[i]
          const findVal = (...keys: string[]) => {
            for (const k of keys) {
              for (const rowKey of Object.keys(row)) {
                if (rowKey.toLowerCase().replace(/[^a-z0-9]/g, "") === k.toLowerCase().replace(/[^a-z0-9]/g, "")) {
                  return row[rowKey]
                }
              }
            }
            return ""
          }

          const missing: string[] = []

          // Date
          const rawDate = findVal("date", "txndate", "entrydate")
          let dateStr = ""
          if (!rawDate) {
            missing.push("Date")
          } else if (rawDate instanceof Date && !isNaN(rawDate.getTime())) {
            dateStr = rawDate.toISOString().split("T")[0]
          } else {
            const parsedD = new Date(String(rawDate))
            if (!isNaN(parsedD.getTime())) {
              dateStr = parsedD.toISOString().split("T")[0]
            } else {
              dateStr = String(rawDate)
            }
          }

          // Party Name
          const partyVal = String(findVal("partyname", "party")).trim()
          if (!partyVal) missing.push("Party Name")

          // Payment Mode
          const paymentModeVal = String(findVal("paymentmode", "paymenttype", "mode")).trim()
          if (!paymentModeVal) missing.push("Payment Mode")

          // Transaction
          const transVal = String(findVal("transaction", "transactionname", "type")).trim()
          if (!transVal) missing.push("Transaction")

          // Nature
          const rawNature = String(findVal("nature", "category", "entrynature", "entrytype")).trim()
          if (!rawNature) missing.push("Nature")

          // Amounts
          const debitRaw = parseFloat(String(findVal("debit", "debitamount", "paid")).replace(/[^0-9.]/g, "")) || 0
          const creditRaw = parseFloat(String(findVal("credit", "creditamount", "received")).replace(/[^0-9.]/g, "")) || 0
          if (debitRaw === 0 && creditRaw === 0) {
            missing.push("Amount (Debit or Credit)")
          }

          // Remark
          const remarkVal = String(findVal("remark", "remarks", "note", "notes")).trim()

          parsedList.push({
            rowNum: i + 1,
            date: dateStr,
            partyName: partyVal,
            paymentMode: paymentModeVal,
            transactionName: transVal,
            nature: rawNature,
            debit: debitRaw,
            credit: creditRaw,
            remark: remarkVal,
            missingFields: missing,
          })
        }

        setValidatedRows(parsedList)
      } catch (err) {
        console.error("Error reading file:", err)
        toast.error("Failed to parse Excel file.")
      }
    }
    reader.readAsBinaryString(selected)
  }

  const handleImport = async () => {
    if (!validatedRows || validatedRows.length === 0) {
      toast.error("No valid data rows found in uploaded file.")
      return
    }

    setLoading(true)
    setProgress(15)

    try {
      // 1. Fetch current dropdown lists to check for new entries
      const [paymentModes, creditParties, debitParties, creditTrans, debitTrans] = await Promise.all([
        getDailyDropdownOptions("payment_modes"),
        getDailyDropdownOptions("parties_credit"),
        getDailyDropdownOptions("parties_debit"),
        getDailyDropdownOptions("transactions_credit"),
        getDailyDropdownOptions("transactions_debit"),
      ])

      const updatedPaymentModes = new Set(paymentModes)
      const updatedCreditParties = new Set(creditParties)
      const updatedDebitParties = new Set(debitParties)
      const updatedCreditTrans = new Set(creditTrans)
      const updatedDebitTrans = new Set(debitTrans)

      // 2. Fetch existing transactions
      const existing = await getDailyTransactions(companyId)
      let highestSr = existing.reduce((max, t) => Math.max(max, t.sr_no || 0), 0)

      setProgress(40)

      const newTransactions: DailyTransaction[] = []
      const now = new Date().toISOString()

      for (let i = 0; i < validatedRows.length; i++) {
        const item = validatedRows[i]
        const isCredit = item.credit > 0
        const flowType = isCredit ? "credit" : "debit"

        // Auto-add new party to Credit or Debit party list
        if (item.partyName) {
          if (flowType === "credit" && !updatedCreditParties.has(item.partyName)) {
            updatedCreditParties.add(item.partyName)
          } else if (flowType === "debit" && !updatedDebitParties.has(item.partyName)) {
            updatedDebitParties.add(item.partyName)
          }
        }

        // Auto-add new transaction to Credit or Debit transaction list
        if (item.transactionName) {
          if (flowType === "credit" && !updatedCreditTrans.has(item.transactionName)) {
            updatedCreditTrans.add(item.transactionName)
          } else if (flowType === "debit" && !updatedDebitTrans.has(item.transactionName)) {
            updatedDebitTrans.add(item.transactionName)
          }
        }

        // Auto-add new payment mode
        if (item.paymentMode && !updatedPaymentModes.has(item.paymentMode)) {
          updatedPaymentModes.add(item.paymentMode)
        }

        // Format nature
        let natureVal: EntryNature = "Expense"
        const lowerNature = item.nature.toLowerCase()
        if (lowerNature.includes("sale") || lowerNature.includes("sell")) {
          natureVal = "Sale"
        } else if (lowerNature.includes("pur")) {
          natureVal = "Purchase"
        }

        highestSr += 1

        newTransactions.push({
          id: `dt-import-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 6)}`,
          company_id: companyId,
          sr_no: highestSr,
          date: item.date || new Date().toISOString().split("T")[0],
          firm_name: "", // Will be assigned to active company
          party_name: item.partyName || "General Party",
          payment_mode: item.paymentMode || "Cash",
          transaction_name: item.transactionName || "General",
          entry_nature: natureVal,
          type: flowType,
          credit_amount: item.credit,
          debit_amount: item.debit,
          remark: item.remark || "",
          created_at: now,
          updated_at: now,
        })
      }

      setProgress(70)

      // 3. Save newly discovered options back to lists
      await Promise.all([
        saveDailyDropdownOptions("payment_modes", Array.from(updatedPaymentModes)),
        saveDailyDropdownOptions("parties_credit", Array.from(updatedCreditParties)),
        saveDailyDropdownOptions("parties_debit", Array.from(updatedDebitParties)),
        saveDailyDropdownOptions("transactions_credit", Array.from(updatedCreditTrans)),
        saveDailyDropdownOptions("transactions_debit", Array.from(updatedDebitTrans)),
      ])

      setProgress(85)

      // 4. Save merged transactions
      const merged = [...newTransactions, ...existing]
      await saveDailyTransactionsBatch(companyId, merged)

      setProgress(100)
      toast.success(`Successfully imported ${newTransactions.length} daily transactions & synced lists!`)
      onSuccess()
      onOpenChange(false)
    } catch (err) {
      console.error("Import failed:", err)
      toast.error("Failed to import transactions.")
    } finally {
      setLoading(false)
      setProgress(0)
    }
  }

  const rowsWithMissing = validatedRows.filter((r) => r.missingFields.length > 0)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl rounded-3xl p-6 max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <span className="p-2 rounded-xl bg-primary/10 text-primary">
              <FileSpreadsheet className="h-5 w-5" />
            </span>
            Import Daily Transactions
          </DialogTitle>
          <DialogDescription>
            Upload Excel (.xlsx, .xls) or CSV. New Parties &amp; Transactions will be added to your lists automatically.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Download Template Banner */}
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-muted/40 border">
            <div>
              <p className="text-sm font-bold">Standard Excel Format</p>
              <p className="text-xs text-muted-foreground">
                Download the formatted template with all column headers including Remark.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDownloadTemplate}
              className="rounded-xl font-bold gap-1.5 shrink-0"
            >
              <Download className="h-4 w-4" /> Template
            </Button>
          </div>

          {/* Upload Input */}
          <div className="space-y-2">
            <Input
              type="file"
              accept=".xlsx, .xls, .csv"
              onChange={handleFileChange}
              disabled={loading}
              className="rounded-xl file:rounded-lg file:font-semibold file:bg-primary/10 file:text-primary file:border-0"
            />
          </div>

          {/* Preview & Validation Report */}
          {validatedRows.length > 0 && (
            <div className="space-y-3">
              {/* Summary Stats */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400">Total Rows Found</p>
                    <p className="text-lg font-black text-emerald-700 dark:text-emerald-400">{validatedRows.length}</p>
                  </div>
                </div>

                <div
                  className={`p-3 rounded-2xl border flex items-center gap-2 ${
                    rowsWithMissing.length > 0
                      ? "bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-400"
                      : "bg-muted/40 border-border text-muted-foreground"
                  }`}
                >
                  <AlertTriangle className="h-5 w-5 shrink-0" />
                  <div>
                    <p className="text-xs font-bold">Rows with Empty Fields</p>
                    <p className="text-lg font-black">{rowsWithMissing.length}</p>
                  </div>
                </div>
              </div>

              {/* Rows with Missing Fields Highlight (If any) */}
              {rowsWithMissing.length > 0 && (
                <div className="p-3 bg-amber-500/5 border border-amber-500/30 rounded-2xl space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-700 dark:text-amber-400">
                    <AlertTriangle className="h-4 w-4" />
                    <span>Empty Columns Detected ({rowsWithMissing.length} rows):</span>
                  </div>
                  <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1 text-xs">
                    {rowsWithMissing.map((r) => (
                      <div
                        key={r.rowNum}
                        className="p-2 rounded-xl bg-card border flex items-start justify-between gap-2"
                      >
                        <span className="font-bold text-muted-foreground">Row #{r.rowNum}</span>
                        <div className="flex flex-wrap gap-1 justify-end">
                          {r.missingFields.map((field) => (
                            <span
                              key={field}
                              className="px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-700 dark:text-amber-400 text-[10px] font-bold border border-amber-500/20"
                            >
                              Empty: {field}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="text-[11px] text-muted-foreground italic">
                    Empty fields will receive default fallback values upon import.
                  </p>
                </div>
              )}
            </div>
          )}

          {loading && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-semibold">
                <span>Importing records and updating dropdowns...</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="h-2 rounded-full" />
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
            className="rounded-xl font-bold"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleImport}
            disabled={loading || validatedRows.length === 0}
            className="rounded-xl font-bold bg-primary text-primary-foreground gap-2"
          >
            <Upload className="h-4 w-4" />
            {loading ? "Importing..." : `Import ${validatedRows.length} Records`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
