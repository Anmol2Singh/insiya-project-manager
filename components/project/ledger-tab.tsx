"use client"

import { useState, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Plus, Trash2, Edit2, Calendar, CreditCard, FileText, Download, FileSpreadsheet, UploadCloud } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { LedgerEntry, Project, PaymentTerm, Expense, CallingRecord, SwhChecklistItem, WorkRemark } from "@/lib/types"
import { AddLedgerDialog } from "./add-ledger-dialog"
import { createClient } from "@/lib/supabase/client"
import { syncProjectTotals, syncPurchaseTotals } from "@/lib/project-utils"
import { generateProjectLedgerPDF } from "@/lib/pdf-generator"
import { exportCustomerLedgerToExcel, importCustomerLedgerFromExcel } from "@/lib/customer-excel-utils"
import { toast } from "sonner"
import { hasEditPermission } from "@/lib/auth-store"

interface LedgerTabProps {
  entries: LedgerEntry[] | any[]
  projectId: string
  project?: Project | any
  paymentTerms?: PaymentTerm[]
  expenses?: Expense[]
  callingRecords?: CallingRecord[]
  swhChecklist?: SwhChecklistItem[]
  workRemarks?: WorkRemark[]
  onRefresh: () => void
  isPurchase?: boolean
}

export function LedgerTab({
  entries,
  projectId,
  project: initialProject,
  paymentTerms = [],
  expenses = [],
  callingRecords = [],
  swhChecklist = [],
  workRemarks = [],
  onRefresh,
  isPurchase = false,
}: LedgerTabProps) {
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [editingEntry, setEditingEntry] = useState<LedgerEntry | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [exportingPDF, setExportingPDF] = useState(false)
  const [importingExcel, setImportingExcel] = useState(false)
  const [canEdit, setCanEdit] = useState(false)

  const excelInputRef = useRef<HTMLInputElement | null>(null)

  useState(() => {
    setCanEdit(hasEditPermission())
  })

  const formatCurrency = (value: number | null | undefined, allowZero = false) => {
    if ((value === 0 || value === null || value === undefined) && !allowZero) return ""
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value || 0)
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
  }

  const handleDelete = async (entryId: string) => {
    if (!confirm("Are you sure you want to delete this entry?")) return

    setDeletingId(entryId)
    try {
      const supabase = createClient()
      const tableName = isPurchase ? "purchase_ledger_entries" : "ledger_entries"
      const { error } = await supabase
        .from(tableName)
        .delete()
        .eq("id", entryId)

      if (error) throw error

      if (isPurchase) {
        await syncPurchaseTotals(projectId)
      } else {
        await syncProjectTotals(projectId)
      }
      toast.success("Entry deleted successfully")
      onRefresh()
    } catch (error: any) {
      console.error("Error deleting entry:", error)
      toast.error("Failed to delete entry")
    } finally {
      setDeletingId(null)
    }
  }

  const handleExportPDF = async () => {
    setExportingPDF(true)
    try {
      let targetProject = initialProject
      let targetTerms = paymentTerms
      let targetExpenses = expenses
      let targetCalls = callingRecords
      let targetChecklist = swhChecklist
      let targetRemarks = workRemarks

      const supabase = createClient()

      if (!targetProject) {
        const table = isPurchase ? "purchases" : "projects"
        const { data } = await supabase.from(table).select("*").eq("id", projectId).single()
        if (data) targetProject = data
      }

      if (!isPurchase) {
        if (!targetTerms || targetTerms.length === 0) {
          const { data } = await supabase.from("payment_terms").select("*").eq("project_id", projectId)
          if (data) targetTerms = data
        }

        if (!targetExpenses || targetExpenses.length === 0) {
          const { data } = await supabase.from("expenses").select("*").eq("project_id", projectId)
          if (data) targetExpenses = data
        }
      }

      if (!targetCalls || targetCalls.length === 0) {
        const callTable = isPurchase ? "purchase_calling_records" : "calling_records"
        const foreignKey = isPurchase ? "purchase_id" : "project_id"
        const { data } = await supabase.from(callTable).select("*").eq(foreignKey, projectId)
        if (data) targetCalls = data
      }

      if (!isPurchase) {
        if (!targetChecklist || targetChecklist.length === 0) {
          const { data } = await supabase.from("swh_checklist").select("*").eq("project_id", projectId)
          if (data) targetChecklist = data
        }

        if (!targetRemarks || targetRemarks.length === 0) {
          const { data } = await supabase.from("work_remarks").select("*").eq("project_id", projectId)
          if (data) targetRemarks = data
        }
      }

      if (!targetProject) {
        toast.error(isPurchase ? "Vendor details not found" : "Project details not found")
        return
      }

      generateProjectLedgerPDF(
        targetProject,
        entries,
        isPurchase ? [] : targetTerms,
        isPurchase ? [] : targetExpenses,
        targetCalls,
        isPurchase ? [] : targetChecklist,
        isPurchase ? [] : targetRemarks,
        isPurchase
      )
      toast.success(isPurchase ? "Purchase PDF report exported successfully!" : "Project PDF report exported successfully!")
    } catch (e: any) {
      console.error("Error exporting PDF:", e)
      toast.error("Failed to export PDF")
    } finally {
      setExportingPDF(false)
    }
  }

  const handleExportCustomerExcel = () => {
    if (!initialProject) {
      toast.error(isPurchase ? "Vendor details missing for Excel export" : "Project details missing for Excel export")
      return
    }
    try {
      exportCustomerLedgerToExcel(
        initialProject,
        entries,
        paymentTerms,
        expenses,
        callingRecords,
        swhChecklist,
        workRemarks,
        isPurchase
      )
      toast.success(`Exported Excel ledger for ${initialProject.vendor_name || initialProject.site_name}!`)
    } catch (e: any) {
      console.error("Error exporting Customer Excel:", e)
      toast.error("Failed to export Excel ledger")
    }
  }

  const handleImportCustomerExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      setImportingExcel(true)
      const res = await importCustomerLedgerFromExcel(projectId, file, isPurchase)
      if (res.success) {
        toast.success(res.message)
        onRefresh()
      } else {
        toast.error(res.message)
      }
    } catch (err: any) {
      console.error("Failed to import Customer Ledger Excel:", err)
      toast.error("Error importing Customer Ledger Excel")
    } finally {
      setImportingExcel(false)
      if (excelInputRef.current) excelInputRef.current.value = ""
    }
  }

  // Calculate totals
  const totals = entries.reduce(
    (acc, entry: any) => ({
      salesMValue: acc.salesMValue + (entry.sales_m_value || 0),
      mOutwardValue: acc.mOutwardValue + (entry.m_outward_value || 0),
      orderValue: acc.orderValue + (entry.quotation_value || entry.order_value || 0),
      extraWorkValue: acc.extraWorkValue + (isPurchase ? 0 : (entry.extra_work_value || 0)),
      paymentReceived: acc.paymentReceived + (entry.payment_paid !== undefined && entry.payment_paid !== null ? entry.payment_paid : (entry.payment_received || 0)),
    }),
    { salesMValue: 0, mOutwardValue: 0, orderValue: 0, extraWorkValue: 0, paymentReceived: 0 }
  )

  const finalBalance = isPurchase
    ? totals.orderValue - totals.paymentReceived
    : totals.orderValue + totals.extraWorkValue - totals.paymentReceived
  const finalMBalance = totals.salesMValue - totals.mOutwardValue

  return (
    <>
      <Card className="border-0 shadow-lg bg-card/50 backdrop-blur-sm overflow-hidden">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between border-b bg-muted/30 pb-4 gap-4">
          <div>
            <CardTitle className="text-xl font-bold tracking-tight">
              {isPurchase ? "Purchase Ledger Records" : "Ledger Records"}
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {isPurchase ? "Detailed financial history for this vendor" : "Detailed financial history for this project"}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              size="sm"
              variant="outline"
              onClick={handleExportPDF}
              disabled={exportingPDF}
              className="bg-card text-foreground hover:bg-primary/10 font-bold border-border shadow-sm"
            >
              <Download className="h-4 w-4 mr-2 text-primary" />
              {exportingPDF ? "Generating PDF..." : "Export PDF"}
            </Button>

            {canEdit && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleExportCustomerExcel}
                  className="bg-card text-foreground hover:bg-success/10 font-bold border-border shadow-sm"
                  title={isPurchase ? "Export purchase ledger into Excel" : "Export all 6 tabs into a multi-sheet Excel file"}
                >
                  <FileSpreadsheet className="h-4 w-4 mr-2 text-success" />
                  Export Excel
                </Button>

                <input
                  type="file"
                  ref={excelInputRef}
                  accept=".xlsx, .xls"
                  onChange={handleImportCustomerExcel}
                  className="hidden"
                />

                <Button
                  size="sm"
                  variant="outline"
                  disabled={importingExcel}
                  onClick={() => excelInputRef.current?.click()}
                  className="bg-card text-foreground hover:bg-primary/10 font-bold border-border shadow-sm"
                  title={isPurchase ? "Import Purchase Ledger data from Excel" : "Import Customer Ledger data from Excel"}
                >
                  <UploadCloud className="h-4 w-4 mr-2 text-primary" />
                  {importingExcel ? "Importing..." : "Import Excel"}
                </Button>
              </>
            )}

            {canEdit && (
              <Button size="sm" onClick={() => setShowAddDialog(true)} className="bg-primary text-primary-foreground shadow-md hover:scale-105 transition-transform font-bold">
                <Plus className="h-4 w-4 mr-2" />
                {isPurchase ? "Add Purchase Entry" : "Add New Entry"}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {/* Desktop Table */}
          <div className="hidden lg:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50 border-b">
                  <TableHead className="font-bold text-foreground w-12 text-center uppercase text-[10px] tracking-widest">Sr</TableHead>
                  <TableHead className="font-bold text-foreground uppercase text-[10px] tracking-widest">Date</TableHead>
                  <TableHead className="font-bold text-foreground uppercase text-[10px] tracking-widest">Payment Type</TableHead>
                  <TableHead className="font-bold text-foreground uppercase text-[10px] tracking-widest">Particulars</TableHead>
                  <TableHead className="font-bold text-foreground text-center uppercase text-[10px] tracking-widest">Bill</TableHead>
                  {!isPurchase && <TableHead className="font-bold text-foreground text-right bg-warning/10 uppercase text-[10px] tracking-widest">Sales M</TableHead>}
                  {!isPurchase && <TableHead className="font-bold text-foreground text-right bg-warning/10 uppercase text-[10px] tracking-widest">M Outward</TableHead>}
                  <TableHead className="font-bold text-foreground text-right bg-info/10 uppercase text-[10px] tracking-widest">
                    {isPurchase ? "Quotation Val" : "Order Val"}
                  </TableHead>
                  {!isPurchase && <TableHead className="font-bold text-foreground text-right bg-info/10 uppercase text-[10px] tracking-widest">Extra Wrk</TableHead>}
                  <TableHead className="font-bold text-foreground text-right bg-success/10 uppercase text-[10px] tracking-widest">
                    {isPurchase ? "Paid" : "Received"}
                  </TableHead>
                  {canEdit && <TableHead className="font-bold text-foreground text-right uppercase text-[10px] tracking-widest">Action</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                <AnimatePresence mode="popLayout">
                  {entries.map((entry, index) => (
                    <motion.tr
                      key={entry.id ? `ledger-${entry.id}` : `ledger-idx-${index}`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.2, delay: index * 0.03 }}
                      className="hover:bg-muted/40 group border-b"
                    >
                      <TableCell className="text-center font-medium text-muted-foreground">{entry.sr_no}</TableCell>
                      <TableCell className="whitespace-nowrap font-medium">{formatDate(entry.date)}</TableCell>
                      <TableCell>
                        {entry.payment_type && (
                          <Badge variant="secondary" className="text-[10px] uppercase font-bold py-0 h-5 px-2 bg-secondary/50 text-secondary-foreground border-secondary">
                            {entry.payment_type}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate font-medium">{entry.particulars}</TableCell>
                      <TableCell className="text-center">
                        <div className="flex justify-center">
                          {isPurchase ? (
                            entry.payment_bill || entry.payment_receipt ? (
                              <Badge className="bg-info text-info-foreground text-[10px] h-5 py-0 px-2 font-bold uppercase rounded-full">Payment Bill</Badge>
                            ) : entry.bill_received || entry.bill_submitted ? (
                              <Badge className="bg-success text-success-foreground text-[10px] h-5 py-0 px-2 font-bold uppercase rounded-full">Bill Received</Badge>
                            ) : (
                              <Badge variant="outline" className="text-[10px] h-5 py-0 px-2 font-bold uppercase rounded-full border-muted-foreground/30 text-muted-foreground">Pending</Badge>
                            )
                          ) : (
                            entry.payment_receipt ? (
                              <Badge className="bg-info text-info-foreground text-[10px] h-5 py-0 px-2 font-bold uppercase rounded-full">Receipt</Badge>
                            ) : entry.bill_submitted ? (
                              <Badge className="bg-success text-success-foreground text-[10px] h-5 py-0 px-2 font-bold uppercase rounded-full">Submitted</Badge>
                            ) : (
                              <Badge variant="outline" className="text-[10px] h-5 py-0 px-2 font-bold uppercase rounded-full border-muted-foreground/30 text-muted-foreground">Pending</Badge>
                            )
                          )}
                        </div>
                      </TableCell>
                      {!isPurchase && <TableCell className="text-right bg-warning/5 font-mono text-xs">{formatCurrency(entry.sales_m_value)}</TableCell>}
                      {!isPurchase && <TableCell className="text-right bg-warning/5 font-mono text-xs">{formatCurrency(entry.m_outward_value)}</TableCell>}
                      <TableCell className="text-right bg-info/5 font-mono text-xs">
                        {formatCurrency(entry.quotation_value || entry.order_value)}
                      </TableCell>
                      {!isPurchase && <TableCell className="text-right bg-info/5 font-mono text-xs">{formatCurrency(entry.extra_work_value)}</TableCell>}
                      <TableCell className="text-right bg-success/5 font-mono text-xs text-success font-semibold">
                        {formatCurrency(entry.payment_paid !== undefined && entry.payment_paid !== null ? entry.payment_paid : entry.payment_received)}
                      </TableCell>
                      {canEdit && (
                        <TableCell className="text-right pr-2 w-20">
                          <div className="flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-primary hover:bg-primary/10"
                              onClick={() => setEditingEntry(entry)}
                              title="Edit entry"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:bg-destructive/10"
                              onClick={() => handleDelete(entry.id)}
                              disabled={deletingId === entry.id}
                              title="Delete entry"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </motion.tr>
                  ))}
                </AnimatePresence>
                {entries.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={isPurchase ? 8 : 11} className="text-center py-16 text-muted-foreground italic">
                      {isPurchase ? "No purchase entries recorded for this vendor yet." : "No ledger entries recorded for this project yet."}
                    </TableCell>
                  </TableRow>
                )}
                {/* Totals Row */}
                {entries.length > 0 && (
                  <TableRow className="bg-muted/50 font-bold border-t-2">
                    <TableCell colSpan={5} className="text-right uppercase text-[10px] tracking-widest">Net Totals:</TableCell>
                    {!isPurchase && <TableCell className="text-right bg-warning/10 font-mono">{formatCurrency(totals.salesMValue, true)}</TableCell>}
                    {!isPurchase && <TableCell className="text-right bg-warning/10 font-mono">{formatCurrency(totals.mOutwardValue, true)}</TableCell>}
                    <TableCell className="text-right bg-info/10 font-mono">{formatCurrency(totals.orderValue, true)}</TableCell>
                    {!isPurchase && <TableCell className="text-right bg-info/10 font-mono">{formatCurrency(totals.extraWorkValue, true)}</TableCell>}
                    <TableCell className="text-right bg-success/10 font-mono text-success">{formatCurrency(totals.paymentReceived, true)}</TableCell>
                    {canEdit && <TableCell className="bg-muted/50"></TableCell>}
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Cards */}
          <div className="lg:hidden divide-y divide-border">
            <AnimatePresence>
              {entries.map((entry: any, index) => (
                <motion.div
                  key={entry.id ? `m-ledger-${entry.id}` : `m-ledger-idx-${index}`}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ delay: index * 0.05 }}
                  className="p-4 space-y-4 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="h-6 w-6 rounded-full p-0 flex items-center justify-center font-bold text-[10px]">{entry.sr_no}</Badge>
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {formatDate(entry.date)}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {entry.payment_type && (
                        <Badge variant="secondary" className="text-[10px] font-bold uppercase px-1.5 h-5">{entry.payment_type}</Badge>
                      )}
                      {canEdit && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-primary"
                            onClick={() => setEditingEntry(entry)}
                            title="Edit entry"
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive"
                            onClick={() => handleDelete(entry.id)}
                            disabled={deletingId === entry.id}
                            title="Delete entry"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="bg-muted/40 p-3 rounded-lg border border-border/50">
                    <p className="text-sm font-medium leading-relaxed">{entry.particulars || "No particulars"}</p>
                    {isPurchase ? (
                      (entry.bill_received || entry.bill_submitted) && (
                        <div className="mt-2 flex items-center gap-1 text-[10px] font-bold text-success uppercase">
                          <FileText className="h-3 w-3" />
                          Bill Received
                        </div>
                      )
                    ) : (
                      entry.bill_submitted && (
                        <div className="mt-2 flex items-center gap-1 text-[10px] font-bold text-success uppercase">
                          <FileText className="h-3 w-3" />
                          Bill Submitted
                        </div>
                      )
                    )}
                  </div>

                  {isPurchase ? (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1 bg-info/10 p-2 rounded-md border border-info/20">
                        <p className="text-[9px] font-bold text-info-foreground uppercase tracking-wider">Quotation</p>
                        <p className="text-xs font-bold">{formatCurrency(entry.quotation_value || entry.order_value || 0)}</p>
                      </div>
                      <div className="space-y-1 bg-success/10 p-2 rounded-md border border-success/20">
                        <p className="text-[9px] font-bold text-success-foreground uppercase tracking-wider">Paid</p>
                        <p className="text-xs font-bold text-success">{formatCurrency(entry.payment_paid !== undefined && entry.payment_paid !== null ? entry.payment_paid : (entry.payment_received || 0))}</p>
                      </div>
                      <div className="space-y-1 bg-muted p-2 rounded-md border col-span-2">
                        <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Ref No</p>
                        <p className="text-[10px] font-medium truncate">{entry.reference_number || "-"}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1 bg-warning/10 p-2 rounded-md border border-warning/20">
                        <p className="text-[9px] font-bold text-warning-foreground uppercase tracking-wider">Material</p>
                        <div className="flex justify-between items-baseline">
                          <span className="text-[10px] text-muted-foreground">S: {formatCurrency(entry.sales_m_value || 0)}</span>
                          <span className="text-[10px] text-muted-foreground">O: {formatCurrency(entry.m_outward_value || 0)}</span>
                        </div>
                      </div>
                      <div className="space-y-1 bg-info/10 p-2 rounded-md border border-info/20">
                        <p className="text-[9px] font-bold text-info-foreground uppercase tracking-wider">Order</p>
                        <p className="text-xs font-bold">{formatCurrency((entry.order_value || 0) + (entry.extra_work_value || 0))}</p>
                      </div>
                      <div className="space-y-1 bg-success/10 p-2 rounded-md border border-success/20">
                        <p className="text-[9px] font-bold text-success-foreground uppercase tracking-wider">Received</p>
                        <p className="text-xs font-bold text-success">{formatCurrency(entry.payment_received || 0)}</p>
                      </div>
                      <div className="space-y-1 bg-muted p-2 rounded-md border">
                        <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Ref No</p>
                        <p className="text-[10px] font-medium truncate">{entry.reference_number || "-"}</p>
                      </div>
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
            {entries.length === 0 && (
              <div className="p-12 text-center text-muted-foreground italic text-sm">
                No ledger entries yet
              </div>
            )}
          </div>
        </CardContent>
        {entries.length > 0 && (
          <div className="bg-primary/5 p-4 border-t flex items-center justify-between">
            <div className="flex gap-4">
              <div className="text-xs">
                <span className="text-muted-foreground font-medium uppercase tracking-tighter">Total Balance: </span>
                <span className={`font-bold ${finalBalance > 0 ? "text-success" : "text-destructive"}`}>{formatCurrency(finalBalance)}</span>
              </div>
              {!isPurchase && (
                <div className="text-xs">
                  <span className="text-muted-foreground font-medium uppercase tracking-tighter">Material Balance: </span>
                  <span className="font-bold text-warning-foreground">{formatCurrency(finalMBalance)}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </Card>

      <AddLedgerDialog
        open={showAddDialog || !!editingEntry}
        onOpenChange={(open) => {
          if (!open) {
            setEditingEntry(null)
          }
          setShowAddDialog(open && !editingEntry)
        }}
        projectId={projectId}
        nextSrNo={entries.length > 0 ? Math.max(...entries.map(e => e.sr_no)) + 1 : 1}
        entry={editingEntry}
        onSuccess={onRefresh}
        isPurchase={isPurchase}
      />
    </>
  )
}
