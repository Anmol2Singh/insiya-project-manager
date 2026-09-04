"use client"

import { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { getActiveCompany } from "@/lib/company-store"
import { getDropdownCategories, DEFAULT_ORDER_TYPES } from "@/lib/dropdown-store"
import { hasEditPermission } from "@/lib/auth-store"
import { extractCityName, generateDirectoryPDF } from "@/lib/pdf-generator"
import { getPdfColumnsConfig } from "@/lib/pdf-columns-store"
import type { Project, CallingRecord } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ArrowLeft, SlidersHorizontal, Download, FileSpreadsheet, ExternalLink, RotateCcw, Search, Calendar } from "lucide-react"
import { jsPDF } from "jspdf"
import autoTable from "jspdf-autotable"
import * as XLSX from "xlsx"
import { toast } from "sonner"


export default function FilterProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [categories, setCategories] = useState<string[]>(DEFAULT_ORDER_TYPES)
  const [canEdit, setCanEdit] = useState(false)

  // Filter state
  const [selectedType, setSelectedType] = useState<string>("ALL")
  const [minBalance, setMinBalance] = useState<string>("")
  const [maxBalance, setMaxBalance] = useState<string>("")
  const [onlyPending, setOnlyPending] = useState<boolean>(false)
  const [searchQuery, setSearchQuery] = useState<string>("")

  type SortField = "id_no" | "order_type" | "site_name" | "party_print_name" | "mobile_number" | "address" | "order_value" | "extra_work_value" | "payment_received" | "balance" | "reminder_date"
  type SortDirection = "asc" | "desc"
  const [sortField, setSortField] = useState<SortField>("id_no")
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc")

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortDirection("asc")
    }
  }

  // Fetch projects and categories
  useEffect(() => {
    setCanEdit(hasEditPermission())
    async function loadData() {
      try {
        const activeComp = getActiveCompany()
        const supabase = createClient()
        const { data, error } = await supabase
          .from("projects")
          .select("*")
          .eq("company_id", activeComp.id)
          .order("id_no", { ascending: false })

        if (error) throw error

        const projectIds = (data || []).map((p: any) => p.id)
        const callDateMap: Record<string, string> = {}
        const callRemarkMap: Record<string, string> = {}

        if (projectIds.length > 0) {
          try {
            const { data: callData } = await supabase
              .from("calling_records")
              .select("project_id, date, description, created_at, sr_no")
              .in("project_id", projectIds)
              .order("date", { ascending: false })

            if (callData) {
              callData.forEach((rec: any) => {
                if (!rec.project_id || !rec.date) return
                if (!callDateMap[rec.project_id]) {
                  callDateMap[rec.project_id] = rec.date
                } else if (new Date(rec.date).getTime() > new Date(callDateMap[rec.project_id]).getTime()) {
                  callDateMap[rec.project_id] = rec.date
                }
                if (!callRemarkMap[rec.project_id] && rec.description) {
                  callRemarkMap[rec.project_id] = rec.description
                }
              })
            }
          } catch (callErr) {
            console.warn("Could not fetch calling records for filter:", callErr)
          }
        }

        const computedProjects = (data || []).map((p: any) => ({
          ...p,
          reminder_date: callDateMap[p.id] || null,
          last_call_remark: callRemarkMap[p.id] || null,
          balance: (p.order_value || 0) + (p.extra_work_value || 0) - (p.payment_received || 0),
        }))
        setProjects(computedProjects)
      } catch (err) {
        console.error("Failed to load projects for filtering:", err)
        toast.error("Error loading projects data")
      } finally {
        setLoading(false)
      }

      try {
        const cats = await getDropdownCategories()
        setCategories(cats)
      } catch (e) {
        console.error("Error loading categories from DB:", e)
      }
    }
    loadData()
  }, [])

  // Filter logic
  const filteredProjects = useMemo(() => {
    const filtered = projects.filter((p) => {
      // 1. Order Type
      if (selectedType !== "ALL" && p.order_type.toLowerCase() !== selectedType.toLowerCase()) {
        return false
      }

      // 2. Pending Balance checkbox
      if (onlyPending && p.balance <= 0) {
        return false
      }

      // 3. Min Balance
      if (minBalance !== "" && !isNaN(Number(minBalance))) {
        if (p.balance < Number(minBalance)) return false
      }

      // 4. Max Balance
      if (maxBalance !== "" && !isNaN(Number(maxBalance))) {
        if (p.balance > Number(maxBalance)) return false
      }

      // 5. Search query
      if (searchQuery.trim() !== "") {
        const q = searchQuery.toLowerCase()
        const name = (p.site_name || "").toLowerCase()
        const mobile = (p.mobile_number || "").toLowerCase()
        const addr = (p.address || "").toLowerCase()
        const idNo = String(p.id_no || "")
        const partyName = (p.party_print_name || "").toLowerCase()
        if (!name.includes(q) && !mobile.includes(q) && !addr.includes(q) && !idNo.includes(q) && !partyName.includes(q)) {
          return false
        }
      }

      return true
    })

    return filtered.sort((a: any, b: any) => {
      let aVal = a[sortField]
      let bVal = b[sortField]

      if (typeof aVal === "string") aVal = aVal.toLowerCase()
      if (typeof bVal === "string") bVal = bVal.toLowerCase()

      if (aVal === undefined || aVal === null) aVal = ""
      if (bVal === undefined || bVal === null) bVal = ""

      if (aVal < bVal) return sortDirection === "asc" ? -1 : 1
      if (aVal > bVal) return sortDirection === "asc" ? 1 : -1
      return 0
    })
  }, [projects, selectedType, minBalance, maxBalance, onlyPending, searchQuery, sortField, sortDirection])

  const handleReset = () => {
    setSelectedType("ALL")
    setMinBalance("")
    setMaxBalance("")
    setOnlyPending(false)
    setSearchQuery("")
  }

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(val || 0)
  }

  const formatPdfCurrency = (val: number) => {
    return `Rs. ${(val || 0).toLocaleString("en-IN")}`
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
    } catch {
      return dateStr
    }
  }

  // Filtered PDF Export
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
    await generateDirectoryPDF(filteredProjects, "FILTERED CUSTOMER DIRECTORY REPORT", callRemarkMap, workRemarkMap, columnsConfig, callDateMap)
  }

  // Filtered Excel Export
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

    const exportData = filteredProjects.map((p: any, idx: number) => {
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
    XLSX.utils.book_append_sheet(workbook, worksheet, "Filtered Customers")
    const cleanCompName = compName.replace(/[^a-zA-Z0-9]/g, "_")
    XLSX.writeFile(workbook, `${cleanCompName}_Filtered_Customers_${new Date().toISOString().slice(0, 10)}.xlsx`)
  }

  return (
    <div className="min-h-screen bg-background pb-12">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card/80 backdrop-blur-xl border-b border-border/50 shadow-sm">
        <div className="flex items-center justify-between px-4 py-4 lg:px-8 max-w-[1600px] mx-auto gap-4">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" className="rounded-2xl font-bold flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Dashboard
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="h-5 w-5 text-primary" />
              <h1 className="text-xl font-extrabold tracking-tight">Advanced Customer Filter</h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleGeneratePDF}
              className="bg-card font-bold text-xs h-10 rounded-xl shadow-sm"
            >
              <Download className="h-4 w-4 mr-1.5 text-primary" />
              Export Filtered PDF
            </Button>
            {canEdit && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportExcel}
                className="bg-card font-bold text-xs h-10 rounded-xl shadow-sm"
              >
                <FileSpreadsheet className="h-4 w-4 mr-1.5 text-success" />
                Export Filtered Excel
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="p-4 lg:p-8 max-w-[1600px] mx-auto space-y-6">
        {/* Filter Controls Panel */}
        <Card className="border-0 shadow-lg bg-card/60 backdrop-blur-md">
          <CardHeader className="pb-3 border-b">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4 text-primary" />
                Filter Controls
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleReset}
                className="text-xs font-bold text-muted-foreground hover:text-foreground"
              >
                <RotateCcw className="h-3.5 w-3.5 mr-1" />
                Reset Filters
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Filter by Category / Type */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Order Category / Type
                </Label>
                <Select value={selectedType} onValueChange={setSelectedType}>
                  <SelectTrigger className="rounded-xl h-11 bg-muted/30">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="ALL">All Categories</SelectItem>
                    {categories.filter(Boolean).map((cat, idx) => (
                      <SelectItem key={`filter-cat-${idx}-${cat}`} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Min Balance */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Min Balance (₹)
                </Label>
                <Input
                  type="number"
                  placeholder="e.g., 1"
                  value={minBalance}
                  onChange={(e) => setMinBalance(e.target.value)}
                  className="rounded-xl h-11 bg-muted/30"
                />
              </div>

              {/* Max Balance */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Max Balance (₹)
                </Label>
                <Input
                  type="number"
                  placeholder="e.g., 500"
                  value={maxBalance}
                  onChange={(e) => setMaxBalance(e.target.value)}
                  className="rounded-xl h-11 bg-muted/30"
                />
              </div>

              {/* Search text */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Search Keywords
                </Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Name, mobile, address, ID..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 rounded-xl h-11 bg-muted/30"
                  />
                </div>
              </div>
            </div>

            {/* Checkbox for Only Pending Balance */}
            <div className="flex items-center gap-2 pt-2 border-t border-border/40">
              <Checkbox
                id="only_pending"
                checked={onlyPending}
                onCheckedChange={(c) => setOnlyPending(c === true)}
              />
              <Label htmlFor="only_pending" className="text-sm font-semibold cursor-pointer">
                Filter only customers with pending balance (Balance &gt; 0)
              </Label>
            </div>
          </CardContent>
        </Card>

        {/* Results Counter & Table */}
        <Card className="border-0 shadow-lg bg-card/60 backdrop-blur-md overflow-hidden">
          <CardHeader className="pb-3 bg-muted/30 border-b flex flex-row items-center justify-between">
            <CardTitle className="text-base font-bold">Filtered Results</CardTitle>
            <Badge variant="secondary" className="bg-primary/10 text-primary font-bold px-3 py-1 text-xs">
              {filteredProjects.length} Matching Customers
            </Badge>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-12 text-center text-muted-foreground font-semibold">Loading customers data...</div>
            ) : filteredProjects.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground italic">No customers match the specified filter criteria.</div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50 border-b">
                      <TableHead className="font-bold uppercase text-[10px] py-4 cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => handleSort("id_no")}>
                        ID {sortField === "id_no" ? (sortDirection === "asc" ? "↑" : "↓") : ""}
                      </TableHead>
                      <TableHead className="font-bold uppercase text-[10px] py-4 cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => handleSort("order_type")}>
                        Type {sortField === "order_type" ? (sortDirection === "asc" ? "↑" : "↓") : ""}
                      </TableHead>
                      <TableHead className="w-[150px] font-bold uppercase text-[10px] py-4 cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => handleSort("site_name")}>
                        Customer Name {sortField === "site_name" ? (sortDirection === "asc" ? "↑" : "↓") : ""}
                      </TableHead>
                      <TableHead className="w-[120px] font-bold uppercase text-[10px] py-4 cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => handleSort("party_print_name")}>
                        Party Print Name {sortField === "party_print_name" ? (sortDirection === "asc" ? "↑" : "↓") : ""}
                      </TableHead>
                      <TableHead className="font-bold uppercase text-[10px] py-4 cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => handleSort("mobile_number")}>
                        Mobile No. {sortField === "mobile_number" ? (sortDirection === "asc" ? "↑" : "↓") : ""}
                      </TableHead>
                      <TableHead className="font-bold uppercase text-[10px] py-4 cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => handleSort("address")}>
                        Address {sortField === "address" ? (sortDirection === "asc" ? "↑" : "↓") : ""}
                      </TableHead>
                      <TableHead className="text-right font-bold uppercase text-[10px] py-4 cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => handleSort("order_value")}>
                        Order Value {sortField === "order_value" ? (sortDirection === "asc" ? "↑" : "↓") : ""}
                      </TableHead>
                      <TableHead className="text-right font-bold uppercase text-[10px] py-4 cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => handleSort("extra_work_value")}>
                        Extra Work {sortField === "extra_work_value" ? (sortDirection === "asc" ? "↑" : "↓") : ""}
                      </TableHead>
                      <TableHead className="text-right font-bold uppercase text-[10px] py-4 cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => handleSort("payment_received")}>
                        Payment Recd {sortField === "payment_received" ? (sortDirection === "asc" ? "↑" : "↓") : ""}
                      </TableHead>
                      <TableHead className="text-right font-bold uppercase text-[10px] py-4 cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => handleSort("balance")}>
                        Balance {sortField === "balance" ? (sortDirection === "asc" ? "↑" : "↓") : ""}
                      </TableHead>
                      <TableHead className="text-center font-bold uppercase text-[10px] py-4 cursor-pointer hover:bg-muted/50 transition-colors whitespace-nowrap px-3" onClick={() => handleSort("reminder_date")}>
                        Reminder Date {sortField === "reminder_date" ? (sortDirection === "asc" ? "↑" : "↓") : ""}
                      </TableHead>
                      <TableHead className="text-center font-bold uppercase text-[10px] py-4">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProjects.map((project: any, idx: number) => (
                      <TableRow key={project.id ? `f-proj-${project.id}` : `f-idx-${idx}`} className="hover:bg-muted/40 border-b">
                        <TableCell className="font-bold text-muted-foreground">{project.id_no}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="font-bold text-[10px] uppercase px-2 h-5">
                            {project.order_type}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-bold text-foreground max-w-[150px] truncate">
                          {project.site_name}
                        </TableCell>
                        <TableCell className="font-semibold text-muted-foreground text-xs max-w-[120px] truncate">
                          {project.party_print_name || "-"}
                        </TableCell>
                        <TableCell className="text-xs font-semibold text-muted-foreground">{project.mobile_number || "-"}</TableCell>
                        <TableCell className="max-w-[150px] truncate text-muted-foreground text-xs">{project.address}</TableCell>
                        <TableCell className="text-right font-mono text-xs">
                          {formatCurrency(project.order_value)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs font-semibold">
                          {formatCurrency(project.extra_work_value || 0)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs text-success font-semibold">
                          {formatCurrency(project.payment_received)}
                        </TableCell>
                        <TableCell className={`text-right font-mono text-xs font-bold ${project.balance > 0 ? "text-success" : project.balance < 0 ? "text-destructive" : ""}`}>
                          {formatCurrency(project.balance)}
                        </TableCell>
                        <TableCell className="text-center whitespace-nowrap text-xs px-3">
                          {project.reminder_date ? (
                            <span
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-muted/60 text-foreground text-[11px] font-medium border border-border/50"
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
                            <Button variant="ghost" size="sm" className="text-primary hover:bg-primary/10 rounded-full font-bold text-xs">
                              <ExternalLink className="h-3 w-3 mr-1" />
                              Ledger
                            </Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
