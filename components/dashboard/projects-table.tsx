"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import * as XLSX from "xlsx"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  ExternalLink,
  ChevronUp,
  ChevronDown,
  MapPin,
  FileText,
  FileSpreadsheet,
  Upload,
  Phone,
  SlidersHorizontal,
  Trash2,
  RefreshCw,
  Calendar,
} from "lucide-react"
import type { ProjectSummary, CallingRecord, WorkRemark } from "@/lib/types"
import { ImportExcelDialog } from "./import-excel-dialog"
import { UpdateExcelDialog } from "./update-excel-dialog"
import { getActiveCompany } from "@/lib/company-store"
import { extractCityName, generateDirectoryPDF } from "@/lib/pdf-generator"
import { getPdfColumnsConfig } from "@/lib/pdf-columns-store"
import { createClient } from "@/lib/supabase/client"
import { hasEditPermission } from "@/lib/auth-store"
import { toast } from "sonner"

interface ProjectsTableProps {
  projects: ProjectSummary[]
  isLoading?: boolean
  error?: any
  onMutate?: () => void
  onRefresh?: () => void
}

type SortField = "id_no" | "site_name" | "order_value" | "extra_work_value" | "balance" | "reminder_date"
type SortDirection = "asc" | "desc"

export function ProjectsTable({ projects, onRefresh }: ProjectsTableProps) {
  const [sortField, setSortField] = useState<SortField>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("projects_sort_field") as SortField
      if (saved) return saved
    }
    return "id_no"
  })

  const [sortDirection, setSortDirection] = useState<SortDirection>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("projects_sort_direction") as SortDirection
      if (saved) return saved
    }
    return "desc"
  })

  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  
  const [canEdit, setCanEdit] = useState(false)
  
  useEffect(() => {
    setCanEdit(hasEditPermission())
  }, [])

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === sortedProjects.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(sortedProjects.map(p => p.id)))
    }
  }

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return
    setDeleting(true)
    const toastId = toast.loading(`Deleting ${selectedIds.size} customer(s)...`)
    try {
      const supabase = createClient()
      for (const id of Array.from(selectedIds)) {
        // Delete all related records first
        await supabase.from("ledger_entries").delete().eq("project_id", id)
        await supabase.from("payment_terms").delete().eq("project_id", id)
        await supabase.from("expenses").delete().eq("project_id", id)
        await supabase.from("calling_records").delete().eq("project_id", id)
        await supabase.from("swh_checklist").delete().eq("project_id", id)
        await supabase.from("work_remarks").delete().eq("project_id", id)
        await supabase.from("projects").delete().eq("id", id)
      }
      const successMsg = `${selectedIds.size} customer(s) deleted successfully`
      toast.success(successMsg, { id: toastId })
      setTimeout(() => alert(successMsg), 100)
      setSelectedIds(new Set())
      setDeleteConfirmOpen(false)
      if (onRefresh) onRefresh()
    } catch (err: any) {
      toast.error(err.message || "Failed to delete customers", { id: toastId })
    } finally {
      setDeleting(false)
    }
  }

  const formatCurrency = (value: number | null | undefined, allowZero = false) => {
    if ((value === 0 || value === null || value === undefined) && !allowZero) return ""
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value || 0)
  }

  const handleSort = (field: SortField) => {
    let newDirection: SortDirection = "asc"
    if (sortField === field) {
      newDirection = sortDirection === "asc" ? "desc" : "asc"
    }
    setSortField(field)
    setSortDirection(newDirection)
    if (typeof window !== "undefined") {
      localStorage.setItem("projects_sort_field", field)
      localStorage.setItem("projects_sort_direction", newDirection)
    }
  }

  const sortedProjects = [...projects].sort((a, b) => {
    const aVal = a[sortField]
    const bVal = b[sortField]
    const multiplier = sortDirection === "asc" ? 1 : -1

    if ((aVal == null || aVal === "") && (bVal == null || bVal === "")) return 0
    if (aVal == null || aVal === "") return 1
    if (bVal == null || bVal === "") return -1

    if (typeof aVal === "string" || typeof bVal === "string") {
      return String(aVal).localeCompare(String(bVal)) * multiplier
    }
    return (Number(aVal) - Number(bVal)) * multiplier
  })

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null
    return sortDirection === "asc" ? (
      <ChevronUp className="h-4 w-4 inline ml-1 text-primary" />
    ) : (
      <ChevronDown className="h-4 w-4 inline ml-1 text-primary" />
    )
  }

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return "-"
    try {
      const clean = dateStr.split("T")[0]
      const parts = clean.split("-")
      if (parts.length === 3 && parts[0].length === 4) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`
      }
      const d = new Date(dateStr)
      if (isNaN(d.getTime())) return dateStr
      return d.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    } catch (e) {
      return dateStr
    }
  }

  const handleGeneratePDF = async () => {
    let callRemarkMap: Record<string, string> = {}
    let callDateMap: Record<string, string> = {}
    let workRemarkMap: Record<string, string> = {}
    try {
      const supabase = createClient()
      
      const [callRes, workRes] = await Promise.all([
        supabase.from("calling_records").select("*").order("date", { ascending: false }),
        supabase.from("work_remarks").select("*").order("date", { ascending: false })
      ])

      callRes.data?.forEach((rec: CallingRecord) => {
        if (!rec.project_id) return
        if (!callDateMap[rec.project_id] && rec.date) {
          callDateMap[rec.project_id] = rec.date
        } else if (rec.date && callDateMap[rec.project_id]) {
          if (new Date(rec.date).getTime() > new Date(callDateMap[rec.project_id]).getTime()) {
            callDateMap[rec.project_id] = rec.date
          }
        }
        if (!callRemarkMap[rec.project_id] && rec.description) {
          callRemarkMap[rec.project_id] = rec.description
        }
      })

      workRes.data?.forEach((rec: any) => {
        if (!workRemarkMap[rec.project_id] && rec.remark) {
          workRemarkMap[rec.project_id] = rec.remark
        }
      })
    } catch (e) {
      console.warn("Could not fetch remarks for pdf export:", e)
    }

    const columnsConfig = getPdfColumnsConfig()
    await generateDirectoryPDF(sortedProjects, "CUSTOMER DIRECTORY & SUMMARY REPORT", callRemarkMap, workRemarkMap, columnsConfig, callDateMap)
  }

  const handleExportExcel = async () => {
    const todayStr = new Date().toLocaleDateString("en-IN")
    const compName = getActiveCompany()?.name || "Insiya Solar Industry"

    let callRemarkMap: Record<string, string> = {}
    let callDateMap: Record<string, string> = {}
    let workRemarkMap: Record<string, string> = {}
    try {
      const supabase = createClient()
      const [callRes, workRes] = await Promise.all([
        supabase.from("calling_records").select("*").order("date", { ascending: false }),
        supabase.from("work_remarks").select("*").order("date", { ascending: false })
      ])

      callRes.data?.forEach((rec: CallingRecord) => {
        if (!rec.project_id) return
        if (!callDateMap[rec.project_id] && rec.date) {
          callDateMap[rec.project_id] = rec.date
        } else if (rec.date && callDateMap[rec.project_id]) {
          if (new Date(rec.date).getTime() > new Date(callDateMap[rec.project_id]).getTime()) {
            callDateMap[rec.project_id] = rec.date
          }
        }
        if (!callRemarkMap[rec.project_id] && rec.description) {
          callRemarkMap[rec.project_id] = rec.description
        }
      })

      workRes.data?.forEach((rec: any) => {
        if (!workRemarkMap[rec.project_id] && rec.remark) {
          workRemarkMap[rec.project_id] = rec.remark
        }
      })
    } catch (e) {
      console.warn("Could not fetch remarks for excel export:", e)
    }

    const exportData = sortedProjects.map((p, idx) => {
      const clearanceDate = p.balance !== 0
        ? todayStr
        : formatDate(p.updated_at || p.created_at)

      const reminderDateVal = p.reminder_date || callDateMap[p.id]

      return {
        "S No.": idx + 1,
        "Customer Creation Date": formatDate(p.created_at),
        "Account Clearance Date": clearanceDate,
        "Customer ID": p.id_no,
        "Item Group": p.order_type,
        "Item Name": p.hp_type || "-",
        "Item Qty": p.hp_qty || 0,
        "Sales Man Name": p.salesman_name || "-",
        "Customer / Site Name": p.site_name,
        "Firm Name": p.firm_name || "-",
        "Party Print Name": p.party_print_name || "-",
        "Mobile Number": p.mobile_number || "-",
        "Address": p.address,
        "Order Value (Rs)": p.order_value,
        "Extra Work Value (Rs)": p.extra_work_value || 0,
        "Payment Received (Rs)": p.payment_received,
        "Outstanding Balance (Rs)": p.balance,
        "Reminder Date": reminderDateVal ? formatDate(reminderDateVal) : "-",
        "Last Work Remark": workRemarkMap[p.id] || p.work_remark || "",
        "Last Call Remark": callRemarkMap[p.id] || (p as any).last_call_remark || "",
      }
    })

    const worksheet = XLSX.utils.json_to_sheet(exportData)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, "Customers")
    const cleanCompName = compName.replace(/[^a-zA-Z0-9]/g, "_")
    XLSX.writeFile(workbook, `${cleanCompName}_Customer_Directory_${new Date().toISOString().slice(0, 10)}.xlsx`)
  }

  return (
    <>
      {/* Bulk Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive">Delete {selectedIds.size} Customer(s)?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{selectedIds.size}</strong> customer(s) along with all their ledger entries, payment terms, expenses, call records, checklists, and work remarks. This action <strong>cannot be undone</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting}
              onClick={handleBulkDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Deleting..." : `Delete ${selectedIds.size} Customer(s)`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Card className="border-0 shadow-lg bg-card/60 backdrop-blur-md overflow-hidden transition-all duration-300">
        <CardHeader className="pb-4 bg-muted/30 border-b">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-xl font-bold tracking-tight">Project Directory</CardTitle>
              <p className="text-sm text-muted-foreground mt-0.5">Manage and track all installation sites</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 px-3 py-1.5 font-bold text-xs mr-1">
                {projects.length} Total
              </Badge>
              {canEdit && (
                <Button
                  variant="destructive"
                  size="sm"
                  className={`font-bold h-10 px-4 rounded-xl shadow-lg transition-all ${
                    selectedIds.size > 0 
                      ? "opacity-100 translate-y-0" 
                      : "opacity-0 translate-y-2 pointer-events-none absolute"
                  }`}
                  onClick={() => setDeleteConfirmOpen(true)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Selected ({selectedIds.size})
                </Button>
              )}
              <Link href="/filter">
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-card text-foreground hover:bg-primary/10 hover:text-primary font-bold text-xs h-9 rounded-xl border-border/80 shadow-sm"
                  title="Filter by category, balance range, pending balance"
                >
                  <SlidersHorizontal className="h-3.5 w-3.5 mr-1.5 text-primary" />
                  Filter
                </Button>
              </Link>
              <Button
                variant="outline"
                size="sm"
                onClick={handleGeneratePDF}
                className="bg-card text-foreground hover:bg-primary/10 hover:text-primary font-bold text-xs h-9 rounded-xl border-border/80 shadow-sm"
              >
                <FileText className="h-3.5 w-3.5 mr-1.5 text-destructive" />
                Generate PDF
              </Button>
              {canEdit && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExportExcel}
                    className="bg-card text-foreground hover:bg-success/10 hover:text-success font-bold text-xs h-9 rounded-xl border-border/80 shadow-sm"
                  >
                    <FileSpreadsheet className="h-3.5 w-3.5 mr-1.5 text-success" />
                    Export to Excel
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setUpdateDialogOpen(true)}
                    className="bg-indigo-50 text-indigo-600 hover:bg-indigo-100 font-bold text-xs h-9 rounded-xl border-indigo-200 shadow-sm dark:bg-indigo-500/10 dark:text-indigo-400 dark:hover:bg-indigo-500/20 dark:border-indigo-500/20"
                  >
                    <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                    Update via Excel
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setImportDialogOpen(true)}
                    className="bg-primary/10 text-primary hover:bg-primary/20 font-bold text-xs h-9 rounded-xl border-primary/20 shadow-sm"
                  >
                    <Upload className="h-3.5 w-3.5 mr-1.5" />
                    Import Excel
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {/* Desktop Table */}
          <div className="hidden lg:block overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/50 sticky top-0 backdrop-blur-xl z-10 shadow-sm">
                <TableRow className="border-b-border/50 hover:bg-transparent">
                  {canEdit && (
                    <TableHead className="w-[40px] pl-6 rounded-tl-xl">
                      <Checkbox
                        checked={selectedIds.size === sortedProjects.length && sortedProjects.length > 0}
                        onCheckedChange={toggleSelectAll}
                        className="border-primary/50 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground transition-all rounded-md"
                      />
                    </TableHead>
                  )}
                  <TableHead className={`whitespace-nowrap font-bold text-xs uppercase tracking-wider text-muted-foreground ${!canEdit ? 'pl-6 rounded-tl-xl' : ''}`}>ID</TableHead>
                  <TableHead className="font-bold text-foreground uppercase text-[10px] tracking-widest py-4">Type</TableHead>
                  <TableHead
                    className="cursor-pointer font-bold text-foreground uppercase text-[10px] tracking-widest py-4"
                    onClick={() => handleSort("site_name")}
                  >
                    Customer / Site Name <SortIcon field="site_name" />
                  </TableHead>
                  <TableHead className="w-[140px] font-bold text-foreground uppercase text-[10px] tracking-widest py-4">Party Print Name</TableHead>
                  <TableHead className="font-bold text-foreground uppercase text-[10px] tracking-widest py-4 whitespace-nowrap">Mobile No.</TableHead>
                  <TableHead className="font-bold text-foreground uppercase text-[10px] tracking-widest py-4">Address</TableHead>
                  <TableHead
                    className="text-right cursor-pointer font-bold text-foreground bg-info/5 uppercase text-[10px] tracking-widest py-4 whitespace-nowrap"
                    onClick={() => handleSort("order_value")}
                  >
                    Order Value <SortIcon field="order_value" />
                  </TableHead>
                  <TableHead
                    className="text-right cursor-pointer font-bold text-foreground bg-warning/5 uppercase text-[10px] tracking-widest py-4 whitespace-nowrap"
                    onClick={() => handleSort("extra_work_value")}
                  >
                    Extra Work <SortIcon field="extra_work_value" />
                  </TableHead>
                  <TableHead className="text-right font-bold text-foreground bg-success/5 uppercase text-[10px] tracking-widest py-4 whitespace-nowrap">
                    Payment Recd
                  </TableHead>
                  <TableHead
                    className="text-right cursor-pointer font-bold text-foreground uppercase text-[10px] tracking-widest py-4 whitespace-nowrap"
                    onClick={() => handleSort("balance")}
                  >
                    Balance <SortIcon field="balance" />
                  </TableHead>
                  <TableHead
                    className="text-center cursor-pointer font-bold text-foreground uppercase text-[10px] tracking-widest py-4 whitespace-nowrap px-3 hover:text-primary transition-colors"
                    onClick={() => handleSort("reminder_date")}
                  >
                    Reminder Date <SortIcon field="reminder_date" />
                  </TableHead>
                  <TableHead className="text-center font-bold text-foreground uppercase text-[10px] tracking-widest py-4">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <AnimatePresence mode="popLayout">
                  {sortedProjects.map((project, index) => (
                    <motion.tr
                      key={project.id || `proj-${index}`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                      className="group border-b-border/50 hover:bg-muted/40 transition-colors data-[state=selected]:bg-primary/5 cursor-pointer"
                    >
                      {canEdit && (
                        <TableCell className="pl-6" onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={selectedIds.has(project.id)}
                            onCheckedChange={() => toggleSelect(project.id)}
                            className="border-primary/30 data-[state=checked]:bg-primary transition-all rounded-md"
                          />
                        </TableCell>
                      )}
                      <TableCell className={`font-bold text-muted-foreground ${!canEdit ? 'pl-6' : ''}`}>{project.id_no}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="bg-secondary/50 text-secondary-foreground font-bold text-[10px] uppercase px-2 h-5 whitespace-nowrap">
                          {project.order_type}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[180px] truncate font-bold text-foreground" title={project.site_name}>
                        {project.site_name}
                      </TableCell>
                      <TableCell className="max-w-[140px] truncate font-semibold text-muted-foreground text-xs" title={project.party_print_name || undefined}>
                        {project.party_print_name || "-"}
                      </TableCell>
                      <TableCell className="text-xs font-semibold text-muted-foreground whitespace-nowrap">
                        {project.mobile_number || "-"}
                      </TableCell>
                      <TableCell className="max-w-[180px] truncate text-muted-foreground text-xs" title={project.address}>
                        {project.address}
                      </TableCell>
                      <TableCell className="text-right bg-info/5 font-mono text-xs whitespace-nowrap">
                        {formatCurrency(project.order_value)}
                      </TableCell>
                      <TableCell className="text-right bg-warning/5 font-mono text-xs font-semibold whitespace-nowrap">
                        {formatCurrency(project.extra_work_value || 0)}
                      </TableCell>
                      <TableCell className="text-right bg-success/5 font-mono text-xs text-success font-semibold whitespace-nowrap">
                        {formatCurrency(project.payment_received)}
                      </TableCell>
                      <TableCell className={`text-right font-mono text-xs font-bold whitespace-nowrap ${project.balance > 0 ? "text-success" : project.balance < 0 ? "text-destructive" : ""
                        }`}>
                        {formatCurrency(project.balance)}
                      </TableCell>
                      <TableCell className="text-center whitespace-nowrap text-xs px-3">
                        {project.reminder_date ? (
                          <span
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-muted/60 text-foreground text-[11px] font-medium border border-border/50 shadow-2xs"
                            title={project.last_call_remark ? `Last Call: ${project.last_call_remark}` : `Reminder Date: ${formatDate(project.reminder_date)}`}
                          >
                            <Calendar className="h-3 w-3 text-primary shrink-0" />
                            {formatDate(project.reminder_date)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground/40 font-mono">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <Link href={`/projects/${project.id}`}>
                          <Button variant="ghost" size="sm" className="text-primary hover:text-primary hover:bg-primary/10 rounded-full font-bold text-xs">
                            <ExternalLink className="h-3 w-3 mr-1.5" />
                            Ledger
                          </Button>
                        </Link>
                      </TableCell>
                    </motion.tr>
                  ))}
                </AnimatePresence>
                {sortedProjects.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={canEdit ? 13 : 12} className="text-center py-20 text-muted-foreground italic">
                      No projects match your search criteria.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Cards */}
          <div className="lg:hidden divide-y divide-border">
            <AnimatePresence>
              {sortedProjects.map((project, index) => (
                <motion.div
                  key={project.id || `m-proj-${index}`}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="p-5 space-y-4 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">#{project.id_no}</span>
                        <Badge variant="secondary" className="bg-secondary/50 text-secondary-foreground text-[9px] font-bold uppercase h-4 px-1">
                          {project.order_type}
                        </Badge>
                      </div>
                      <h3 className="font-bold text-foreground text-lg leading-tight">{project.site_name}</h3>
                      {project.mobile_number && (
                        <div className="flex items-center gap-1.5 text-primary text-xs font-semibold">
                          <Phone className="h-3 w-3" />
                          <span>{project.mobile_number}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1.5 text-muted-foreground text-[10px] font-medium">
                        <MapPin className="h-3 w-3" />
                        <span className="truncate max-w-[200px]">{project.address}</span>
                      </div>
                      {project.reminder_date && (
                        <div className="flex items-center gap-1.5 text-primary text-xs font-medium pt-0.5">
                          <Calendar className="h-3 w-3 shrink-0" />
                          <span>Reminder: {formatDate(project.reminder_date)}</span>
                        </div>
                      )}
                    </div>
                    <Link href={`/projects/${project.id}`}>
                      <Button variant="outline" size="icon" className="h-10 w-10 rounded-full border-primary/20 text-primary hover:bg-primary/10 shadow-sm">
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </Link>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-info/10 rounded-xl p-3 border border-info/20">
                      <p className="text-info-foreground/70 text-[9px] font-bold uppercase tracking-widest mb-1">Contract</p>
                      <p className="font-bold text-sm">{formatCurrency(project.order_value)}</p>
                    </div>
                    <div className="bg-warning/10 rounded-xl p-3 border border-warning/20">
                      <p className="text-warning-foreground/70 text-[9px] font-bold uppercase tracking-widest mb-1">Extra Work</p>
                      <p className="font-bold text-sm text-warning-foreground">{formatCurrency(project.extra_work_value || 0)}</p>
                    </div>
                    <div className="bg-success/10 rounded-xl p-3 border border-success/20">
                      <p className="text-success-foreground/70 text-[9px] font-bold uppercase tracking-widest mb-1">Collection</p>
                      <p className="font-bold text-sm text-success">{formatCurrency(project.payment_received)}</p>
                    </div>
                    <div className={`rounded-xl p-3 border shadow-inner ${project.balance > 0 ? "bg-success/5 border-success/20" : "bg-destructive/5 border-destructive/20"
                      }`}>
                      <p className="text-muted-foreground text-[9px] font-bold uppercase tracking-widest mb-1">Outstanding</p>
                      <p className={`font-bold text-sm ${project.balance > 0 ? "text-success" : "text-destructive"}`}>
                        {formatCurrency(project.balance)}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            {sortedProjects.length === 0 && (
              <div className="p-16 text-center text-muted-foreground italic text-sm">
                No projects found.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <ImportExcelDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        onSuccess={() => onRefresh && onRefresh()}
      />
      <UpdateExcelDialog
        open={updateDialogOpen}
        onOpenChange={setUpdateDialogOpen}
        onSuccess={() => onRefresh && onRefresh()}
      />
    </>
  )
}
