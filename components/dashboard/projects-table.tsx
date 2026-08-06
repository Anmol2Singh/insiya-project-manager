"use client"

import { useState } from "react"
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
} from "lucide-react"
import type { ProjectSummary, CallingRecord } from "@/lib/types"
import { ImportExcelDialog } from "./import-excel-dialog"
import { getActiveCompany } from "@/lib/company-store"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"

interface ProjectsTableProps {
  projects: ProjectSummary[]
  isLoading?: boolean
  error?: any
  onMutate?: () => void
  onRefresh?: () => void
}

type SortField = "id_no" | "site_name" | "order_value" | "extra_work_value" | "balance"
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
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

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
      toast.success(`${selectedIds.size} customer(s) deleted successfully`)
      setSelectedIds(new Set())
      setDeleteConfirmOpen(false)
      onRefresh && onRefresh()
    } catch (err: any) {
      toast.error(err.message || "Failed to delete customers")
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

    if (aVal == null && bVal == null) return 0
    if (aVal == null) return 1 * multiplier
    if (bVal == null) return -1 * multiplier

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

  const formatPdfCurrency = (value: number) => {
    return "Rs. " + new Intl.NumberFormat("en-IN", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return "-"
    try {
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

  const extractCityName = (address: string | null | undefined): string => {
    if (!address || !address.trim()) return "-"
    
    let cleaned = address
      .replace(/-\s*\d{5,6}|\b\d{5,6}\b/g, "")
      .replace(/\b(India|IN)\b/gi, "")
      .trim()

    if (!cleaned) return address.trim()

    const fillerRegex = /\b(Opp|Opposite|Near|Behind|Beside|Telephone|Exchange|Road|Street|Flat|Plot|Bldg|Building|Villa|Society|Phase|Sector|LTD|Pvt)\b/gi

    if (cleaned.includes(",")) {
      const parts = cleaned.split(",").map((p) => p.trim()).filter(Boolean)
      if (parts.length > 0) {
        let candidate = parts[parts.length - 1]
        const stateRegex = /\b(Maharashtra|Gujarat|Karnataka|Goa|Delhi|Haryana|Tamil Nadu|Telangana|Uttar Pradesh|Madhya Pradesh|Rajasthan|UP|MP|AP)\b/i
        if (parts.length > 1 && stateRegex.test(candidate)) {
          candidate = parts[parts.length - 2]
        }
        candidate = candidate.replace(fillerRegex, "").trim()
        if (candidate) {
          const words = candidate.split(/\s+/).filter(Boolean)
          return words.slice(-2).join(" ")
        }
      }
    }

    const words = cleaned.replace(fillerRegex, "").split(/\s+/).filter(Boolean)
    if (words.length <= 2) return words.join(" ")
    
    const stateRegex = /^(Maharashtra|Gujarat|Karnataka|Goa|Delhi|Haryana|TamilNadu|Telangana|UP|MP|Rajasthan)$/i
    if (words.length > 2 && stateRegex.test(words[words.length - 1])) {
      return words.slice(-2, -1).join(" ")
    }

    return words.slice(-2).join(" ")
  }

  const handleGeneratePDF = () => {
    const doc = new jsPDF("landscape")
    const pageWidth = doc.internal.pageSize.width
    const compName = getActiveCompany()?.name || "Insiya Solar Industry"

    // B&W Crisp Print Header
    doc.setTextColor(0, 0, 0)
    doc.setFontSize(18)
    doc.setFont("helvetica", "bold")
    doc.text(compName, 14, 15)

    doc.setFontSize(9)
    doc.setFont("helvetica", "bold")
    doc.text("CUSTOMER DIRECTORY & SUMMARY REPORT", pageWidth - 14, 15, { align: "right" })

    // Double Line Separator
    doc.setLineWidth(0.8)
    doc.setDrawColor(0, 0, 0)
    doc.line(14, 18.5, pageWidth - 14, 18.5)
    doc.setLineWidth(0.2)
    doc.line(14, 19.5, pageWidth - 14, 19.5)

    doc.setFontSize(8)
    doc.setFont("helvetica", "normal")
    doc.text(`Generated Date: ${new Date().toLocaleDateString("en-IN")}`, 14, 25)

    const tableHeaders = ["S No.", "Customer Name", "Mobile No.", "ID", "Type", "Sales Man", "City / Locality", "Order Value", "Extra Work", "Payment Recd", "Balance", "Remark"]
    const tableRows = sortedProjects.map((p, idx) => [
      idx + 1,
      p.site_name,
      p.mobile_number || "-",
      p.id_no,
      p.order_type,
      p.salesman_name || "-",
      extractCityName(p.address),
      formatPdfCurrency(p.order_value),
      formatPdfCurrency(p.extra_work_value || 0),
      formatPdfCurrency(p.payment_received),
      formatPdfCurrency(p.balance),
      p.work_remark || "-",
    ])

    autoTable(doc, {
      head: [tableHeaders],
      body: tableRows,
      startY: 28,
      theme: "grid",
      headStyles: {
        fillColor: [240, 240, 240],
        textColor: [0, 0, 0],
        fontSize: 8.5,
        fontStyle: "bold",
        lineWidth: 0.2,
        lineColor: [120, 120, 120],
      },
      styles: {
        fontSize: 8,
        cellPadding: 3,
        textColor: [0, 0, 0],
        lineWidth: 0.2,
        lineColor: [120, 120, 120],
      },
      columnStyles: {
        0: { cellWidth: 10, halign: "center" },
        1: { cellWidth: 50, fontStyle: "bold", fontSize: 8.5, textColor: [0, 0, 0] }, // Customer Name
        2: { cellWidth: 22, halign: "center" }, // Mobile No.
        3: { cellWidth: 11, halign: "center" },
        4: { cellWidth: 20 },
        5: { cellWidth: 20 }, // Sales Man
        6: { cellWidth: 22 },
        7: { cellWidth: 21, halign: "right" },
        8: { cellWidth: 18, halign: "right" },
        9: { cellWidth: 21, halign: "right" },
        10: { cellWidth: 21, halign: "right", fontStyle: "bold" },
        11: { cellWidth: "auto" },
      },
    })

    const cleanCompName = compName.replace(/[^a-zA-Z0-9]/g, "_")
    doc.save(`${cleanCompName}_Directory_${new Date().toISOString().slice(0, 10)}.pdf`)
  }

  const handleExportExcel = async () => {
    const todayStr = new Date().toLocaleDateString("en-IN")
    const compName = getActiveCompany()?.name || "Insiya Solar Industry"

    let callRemarkMap: Record<string, string> = {}
    try {
      const supabase = createClient()
      const { data: callRecords } = await supabase
        .from("calling_records")
        .select("*")
        .order("created_at", { ascending: false })

      callRecords?.forEach((rec: CallingRecord) => {
        if (!callRemarkMap[rec.project_id] && rec.description) {
          callRemarkMap[rec.project_id] = rec.description
        }
      })
    } catch (e) {
      console.warn("Could not fetch calling records for excel export:", e)
    }

    const exportData = sortedProjects.map((p, idx) => {
      const clearanceDate = p.balance !== 0
        ? todayStr
        : formatDate(p.updated_at || p.created_at)

      return {
        "S No.": idx + 1,
        "Customer Creation Date": formatDate(p.created_at),
        "Account Clearance Date": clearanceDate,
        "Customer ID": p.id_no,
        "Order Type": p.order_type,
        "Sales Man Name": p.salesman_name || "-",
        "Customer / Site Name": p.site_name,
        "Mobile Number": p.mobile_number || "-",
        "Address": p.address,
        "Order Value (Rs)": p.order_value,
        "Extra Work Value (Rs)": p.extra_work_value || 0,
        "Payment Received (Rs)": p.payment_received,
        "Outstanding Balance (Rs)": p.balance,
        "Last Work Remark": p.work_remark || "",
        "Last Call Remark": callRemarkMap[p.id] || "",
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
              {selectedIds.size > 0 && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setDeleteConfirmOpen(true)}
                  className="font-bold text-xs h-9 rounded-xl shadow-sm animate-pulse"
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                  Delete {selectedIds.size} Selected
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
                onClick={() => setImportDialogOpen(true)}
                className="bg-primary/10 text-primary hover:bg-primary/20 font-bold text-xs h-9 rounded-xl border-primary/20 shadow-sm"
              >
                <Upload className="h-3.5 w-3.5 mr-1.5" />
                Import Excel
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {/* Desktop Table */}
          <div className="hidden lg:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50 border-b">
                  <TableHead
                    className="cursor-pointer font-bold text-foreground uppercase text-[10px] tracking-widest py-4"
                    onClick={() => handleSort("id_no")}
                  >
                    ID <SortIcon field="id_no" />
                  </TableHead>
                  <TableHead className="font-bold text-foreground uppercase text-[10px] tracking-widest py-4">Type</TableHead>
                  <TableHead
                    className="cursor-pointer font-bold text-foreground uppercase text-[10px] tracking-widest py-4"
                    onClick={() => handleSort("site_name")}
                  >
                    Customer / Site Name <SortIcon field="site_name" />
                  </TableHead>
                  <TableHead className="font-bold text-foreground uppercase text-[10px] tracking-widest py-4">Mobile No.</TableHead>
                  <TableHead className="font-bold text-foreground uppercase text-[10px] tracking-widest py-4">Address</TableHead>
                  <TableHead
                    className="text-right cursor-pointer font-bold text-foreground bg-info/5 uppercase text-[10px] tracking-widest py-4"
                    onClick={() => handleSort("order_value")}
                  >
                    Order Value <SortIcon field="order_value" />
                  </TableHead>
                  <TableHead
                    className="text-right cursor-pointer font-bold text-foreground bg-warning/5 uppercase text-[10px] tracking-widest py-4"
                    onClick={() => handleSort("extra_work_value")}
                  >
                    Extra Work <SortIcon field="extra_work_value" />
                  </TableHead>
                  <TableHead className="text-right font-bold text-foreground bg-success/5 uppercase text-[10px] tracking-widest py-4">
                    Payment Recd
                  </TableHead>
                  <TableHead
                    className="text-right cursor-pointer font-bold text-foreground uppercase text-[10px] tracking-widest py-4"
                    onClick={() => handleSort("balance")}
                  >
                    Balance <SortIcon field="balance" />
                  </TableHead>
                  <TableHead className="w-10 py-4">
                <Checkbox
                  checked={sortedProjects.length > 0 && selectedIds.size === sortedProjects.length}
                  onCheckedChange={toggleSelectAll}
                  aria-label="Select all customers"
                />
              </TableHead>
              <TableHead className="text-center font-bold text-foreground uppercase text-[10px] tracking-widest py-4">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <AnimatePresence mode="popLayout">
                  {sortedProjects.map((project, index) => (
                    <tr
                      key={project.id || `proj-${index}`}
                      className="hover:bg-muted/40 group border-b last:border-0 transition-colors"
                    >
                      <TableCell className="font-bold text-muted-foreground">{project.id_no}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="bg-secondary/50 text-secondary-foreground font-bold text-[10px] uppercase px-2 h-5">
                          {project.order_type}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate font-bold text-foreground">
                        {project.site_name}
                      </TableCell>
                      <TableCell className="text-xs font-semibold text-muted-foreground">
                        {project.mobile_number || "-"}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate text-muted-foreground text-xs">
                        {project.address}
                      </TableCell>
                      <TableCell className="text-right bg-info/5 font-mono text-xs">
                        {formatCurrency(project.order_value)}
                      </TableCell>
                      <TableCell className="text-right bg-warning/5 font-mono text-xs font-semibold">
                        {formatCurrency(project.extra_work_value || 0)}
                      </TableCell>
                      <TableCell className="text-right bg-success/5 font-mono text-xs text-success font-semibold">
                        {formatCurrency(project.payment_received)}
                      </TableCell>
                      <TableCell className={`text-right font-mono text-xs font-bold ${project.balance > 0 ? "text-success" : project.balance < 0 ? "text-destructive" : ""
                        }`}>
                        {formatCurrency(project.balance)}
                      </TableCell>
                      <TableCell className="w-10">
                        <Checkbox
                          checked={selectedIds.has(project.id)}
                          onCheckedChange={() => toggleSelect(project.id)}
                          aria-label={`Select ${project.site_name}`}
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <Link href={`/projects/${project.id}`}>
                          <Button variant="ghost" size="sm" className="text-primary hover:text-primary hover:bg-primary/10 rounded-full font-bold text-xs">
                            <ExternalLink className="h-3 w-3 mr-1.5" />
                            Ledger
                          </Button>
                        </Link>
                      </TableCell>
                    </tr>
                  ))}
                </AnimatePresence>
                {sortedProjects.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-20 text-muted-foreground italic">
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
    </>
  )
}
