"use client"

import { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { getActiveCompany } from "@/lib/company-store"
import type { Project, CallingRecord } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ArrowLeft, SlidersHorizontal, Download, FileSpreadsheet, ExternalLink, RotateCcw, Search } from "lucide-react"
import { jsPDF } from "jspdf"
import autoTable from "jspdf-autotable"
import * as XLSX from "xlsx"
import { toast } from "sonner"

const DEFAULT_CATEGORIES = ["Heat Pump", "SWH", "Solar Water Heater", "Solar System", "Commercial SWH"]

export default function FilterProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES)

  // Filter state
  const [selectedType, setSelectedType] = useState<string>("ALL")
  const [minBalance, setMinBalance] = useState<string>("")
  const [maxBalance, setMaxBalance] = useState<string>("")
  const [onlyPending, setOnlyPending] = useState<boolean>(false)
  const [searchQuery, setSearchQuery] = useState<string>("")

  // Fetch projects and categories
  useEffect(() => {
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
        const computedProjects = (data || []).map((p: any) => ({
          ...p,
          balance: (p.order_value || 0) + (p.extra_work_value || 0) - (p.payment_received || 0),
        }))
        setProjects(computedProjects)
      } catch (err) {
        console.error("Failed to load projects for filtering:", err)
        toast.error("Error loading projects data")
      } finally {
        setLoading(false)
      }

      if (typeof window !== "undefined") {
        const stored = localStorage.getItem("order_categories")
        if (stored) {
          try {
            const parsed = JSON.parse(stored)
            if (Array.isArray(parsed) && parsed.length > 0) {
              setCategories(parsed)
            }
          } catch (e) {
            console.error("Error parsing stored categories:", e)
          }
        }
      }
    }
    loadData()
  }, [])

  // Filter logic
  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
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
        if (!name.includes(q) && !mobile.includes(q) && !addr.includes(q) && !idNo.includes(q)) {
          return false
        }
      }

      return true
    })
  }, [projects, selectedType, minBalance, maxBalance, onlyPending, searchQuery])

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

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "-"
    try {
      return new Date(dateStr).toLocaleDateString("en-IN")
    } catch {
      return dateStr
    }
  }

  const extractCityName = (address: string): string => {
    if (!address) return "-"
    const cleaned = address.trim()
    const fillerRegex = /(?:Tal(?:uka)?|Dist(?:rict)?|City|State|Maharashtra|India|Pin|\b\d{6}\b|[:-])/gi
    const commaIndex = cleaned.lastIndexOf(",")
    if (commaIndex !== -1 && commaIndex < cleaned.length - 1) {
      let candidate = cleaned.substring(commaIndex + 1).trim()
      candidate = candidate.replace(fillerRegex, "").trim()
      if (candidate) {
        const words = candidate.split(/\s+/).filter(Boolean)
        return words.slice(-2).join(" ")
      }
    }
    const words = cleaned.replace(fillerRegex, "").split(/\s+/).filter(Boolean)
    if (words.length <= 2) return words.join(" ")
    return words.slice(-2).join(" ")
  }

  // Filtered PDF Export
  const handleGeneratePDF = () => {
    const doc = new jsPDF("landscape")
    const pageWidth = doc.internal.pageSize.width
    const compName = getActiveCompany()?.name || "Insiya Solar Industry"

    doc.setTextColor(0, 0, 0)
    doc.setFontSize(18)
    doc.setFont("helvetica", "bold")
    doc.text(compName, 14, 15)

    doc.setFontSize(9)
    doc.setFont("helvetica", "bold")
    doc.text("FILTERED CUSTOMER DIRECTORY REPORT", pageWidth - 14, 15, { align: "right" })

    doc.setLineWidth(0.8)
    doc.setDrawColor(0, 0, 0)
    doc.line(14, 18.5, pageWidth - 14, 18.5)
    doc.setLineWidth(0.2)
    doc.line(14, 19.5, pageWidth - 14, 19.5)

    doc.setFontSize(8)
    doc.setFont("helvetica", "normal")
    doc.text(`Generated Date: ${new Date().toLocaleDateString("en-IN")} | Total Results: ${filteredProjects.length}`, 14, 25)

    const tableHeaders = ["S No.", "Customer Name", "Mobile No.", "ID", "Type", "City / Locality", "Order Value", "Extra Work", "Payment Recd", "Balance", "Remark"]
    const tableRows = filteredProjects.map((p, idx) => [
      idx + 1,
      p.site_name,
      p.mobile_number || "-",
      p.id_no,
      p.order_type,
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
        1: { cellWidth: 58, fontStyle: "bold", fontSize: 8.5 },
        2: { cellWidth: 24, halign: "center" },
        3: { cellWidth: 12, halign: "center" },
        4: { cellWidth: 22 },
        5: { cellWidth: 26 },
        6: { cellWidth: 24, halign: "right" },
        7: { cellWidth: 20, halign: "right" },
        8: { cellWidth: 24, halign: "right" },
        9: { cellWidth: 24, halign: "right", fontStyle: "bold" },
        10: { cellWidth: "auto" },
      },
    })

    const cleanCompName = compName.replace(/[^a-zA-Z0-9]/g, "_")
    doc.save(`${cleanCompName}_Filtered_Report_${new Date().toISOString().slice(0, 10)}.pdf`)
  }

  // Filtered Excel Export
  const handleExportExcel = async () => {
    const todayStr = new Date().toLocaleDateString("en-IN")
    const compName = getActiveCompany().name
    const supabase = createClient()

    // Fetch latest call record per project
    const { data: callRecords } = await supabase
      .from("calling_records")
      .select("*")
      .order("created_at", { ascending: false })

    const callRemarkMap: Record<string, string> = {}
    callRecords?.forEach((rec: CallingRecord) => {
      if (!callRemarkMap[rec.project_id] && rec.description) {
        callRemarkMap[rec.project_id] = rec.description
      }
    })

    const exportData = filteredProjects.map((p, idx) => {
      const clearanceDate = p.balance !== 0
        ? todayStr
        : formatDate(p.updated_at || p.created_at)

      return {
        "S No.": idx + 1,
        "Customer Creation Date": formatDate(p.created_at),
        "Account Clearance Date": clearanceDate,
        "Customer ID": p.id_no,
        "Order Type": p.order_type,
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
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportExcel}
              className="bg-card font-bold text-xs h-10 rounded-xl shadow-sm"
            >
              <FileSpreadsheet className="h-4 w-4 mr-1.5 text-success" />
              Export Filtered Excel
            </Button>
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
                      <TableHead className="font-bold uppercase text-[10px] py-4">ID</TableHead>
                      <TableHead className="font-bold uppercase text-[10px] py-4">Type</TableHead>
                      <TableHead className="font-bold uppercase text-[10px] py-4">Customer Name</TableHead>
                      <TableHead className="font-bold uppercase text-[10px] py-4">Mobile No.</TableHead>
                      <TableHead className="font-bold uppercase text-[10px] py-4">Address</TableHead>
                      <TableHead className="text-right font-bold uppercase text-[10px] py-4">Order Value</TableHead>
                      <TableHead className="text-right font-bold uppercase text-[10px] py-4">Extra Work</TableHead>
                      <TableHead className="text-right font-bold uppercase text-[10px] py-4">Payment Recd</TableHead>
                      <TableHead className="text-right font-bold uppercase text-[10px] py-4">Balance</TableHead>
                      <TableHead className="text-center font-bold uppercase text-[10px] py-4">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProjects.map((project, idx) => (
                      <TableRow key={project.id ? `f-proj-${project.id}` : `f-idx-${idx}`} className="hover:bg-muted/40 border-b">
                        <TableCell className="font-bold text-muted-foreground">{project.id_no}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="font-bold text-[10px] uppercase px-2 h-5">
                            {project.order_type}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-bold text-foreground max-w-[200px] truncate">
                          {project.site_name}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground font-semibold">
                          {project.mobile_number || "-"}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate text-xs text-muted-foreground">
                          {project.address}
                        </TableCell>
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
