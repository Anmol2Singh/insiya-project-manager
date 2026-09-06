"use client"

import React, { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import {
  DailyTransaction,
  TimeframeFilter,
  DailyTransactionFilterState,
  INITIAL_FILTER_STATE,
  EntryNature,
} from "@/lib/daily-transaction-types"
import {
  getDailyTransactions,
  filterTransactionsByTimeframe,
  calculateTimeframeTotals,
  deleteDailyTransaction,
  bulkDeleteDailyTransactions,
} from "@/lib/daily-transaction-store"
import {
  getDailyCompanies,
  getActiveDailyCompany,
  setActiveDailyCompany,
  addDailyCompany,
  DailyCompany,
} from "@/lib/daily-company-store"
import { EntryDialog } from "@/components/daily-transactions/entry-dialog"
import { FilterDialog } from "@/components/daily-transactions/filter-dialog"
import { DailySettingsDialog } from "@/components/daily-transactions/settings-dialog"
import { PdfPreviewDialog } from "@/components/daily-transactions/pdf-preview-dialog"
import { DailyImportDialog } from "@/components/daily-transactions/import-dialog"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  ArrowLeft,
  Plus,
  Settings,
  Filter,
  FileText,
  FileSpreadsheet,
  Upload,
  Trash2,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Edit2,
  TrendingUp,
  TrendingDown,
  Wallet,
  ShoppingBag,
  Receipt,
  Calendar,
  Building2,
  RotateCcw,
  Sparkles,
} from "lucide-react"
import { exportDailyTransactionsToExcel } from "@/lib/daily-excel-export"
import { toast } from "sonner"

type SortField =
  | "sr_no"
  | "date"
  | "party_name"
  | "payment_mode"
  | "transaction_name"
  | "entry_nature"
  | "remark"
  | "debit_amount"
  | "credit_amount"

type SortDirection = "asc" | "desc"

// Date formatter helper for "dd/mm/yyyy"
function formatDateDDMMYYYY(dateStr: string): string {
  if (!dateStr) return "-"
  try {
    const clean = dateStr.split("T")[0]
    const parts = clean.split("-")
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`
    }
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return dateStr
    const day = String(d.getDate()).padStart(2, "0")
    const month = String(d.getMonth() + 1).padStart(2, "0")
    const year = d.getFullYear()
    return `${day}/${month}/${year}`
  } catch (e) {
    return dateStr
  }
}

export default function DailyTransactionsPage() {
  // Company state (Independent for Daily Transactions)
  const [companies, setCompanies] = useState<DailyCompany[]>([])
  const [activeCompany, setActiveCompanyState] = useState<DailyCompany | null>(null)
  const [isAddCompanyOpen, setIsAddCompanyOpen] = useState(false)
  const [newCompanyName, setNewCompanyName] = useState("")
  const [newCompanyBalance, setNewCompanyBalance] = useState("")

  // Transactions state
  const [transactions, setTransactions] = useState<DailyTransaction[]>([])
  const [loading, setLoading] = useState(true)

  // Timeframe filter for summary cards
  const [cardTimeframe, setCardTimeframe] = useState<TimeframeFilter>("Today")
  const [customStartDate, setCustomStartDate] = useState<string>(() => new Date().toISOString().split("T")[0])
  const [customEndDate, setCustomEndDate] = useState<string>(() => new Date().toISOString().split("T")[0])
  const [isCustomDateModalOpen, setIsCustomDateModalOpen] = useState(false)

  // Search & advanced filters for the table
  const [searchQuery, setSearchQuery] = useState("")
  const [filters, setFilters] = useState<DailyTransactionFilterState>(INITIAL_FILTER_STATE)
  const [isFilterOpen, setIsFilterOpen] = useState(false)

  // Modals
  const [isEntryOpen, setIsEntryOpen] = useState(false)
  const [editingTransaction, setEditingTransaction] = useState<DailyTransaction | null>(null)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isPdfOpen, setIsPdfOpen] = useState(false)
  const [isImportOpen, setIsImportOpen] = useState(false)

  // Single delete confirmation modal
  const [deleteTarget, setDeleteTarget] = useState<DailyTransaction | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Selection & Bulk delete
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false)

  // Sorting
  const [sortField, setSortField] = useState<SortField>("sr_no")
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc")

  // Load companies & transactions
  const loadData = async () => {
    setLoading(true)
    const comps = getDailyCompanies()
    setCompanies(comps)
    const currentActive = getActiveDailyCompany()
    setActiveCompanyState(currentActive)

    const list = await getDailyTransactions(currentActive?.id)
    setTransactions(list)
    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [])

  // Switch active company
  const handleSelectCompany = async (companyId: string) => {
    if (companyId === "ADD_NEW") {
      setIsAddCompanyOpen(true)
      return
    }
    const updated = setActiveDailyCompany(companyId)
    setActiveCompanyState(updated)
    setLoading(true)
    const list = await getDailyTransactions(updated.id)
    setTransactions(list)
    setSelectedIds(new Set())
    setLoading(false)
  }

  // Add new company from top-left
  const handleCreateCompany = async () => {
    const trimmed = newCompanyName.trim()
    if (!trimmed) {
      toast.error("Please enter a company name")
      return
    }
    const bal = parseFloat(newCompanyBalance.replace(/,/g, "")) || 0
    const created = await addDailyCompany(trimmed, bal)
    setCompanies(getDailyCompanies())
    setActiveCompanyState(created)
    setIsAddCompanyOpen(false)
    setNewCompanyName("")
    setNewCompanyBalance("")
    toast.success(`Company "${trimmed}" created and selected`)
    loadData()
  }

  // Calculate next Sr No
  const nextSrNo = useMemo(() => {
    return transactions.reduce((max, t) => Math.max(max, t.sr_no || 0), 0) + 1
  }, [transactions])

  // Card totals calculation based on selected chip + Opening Balance
  const openingBalance = activeCompany?.opening_balance || 0

  const cardTotals = useMemo(() => {
    const subset = filterTransactionsByTimeframe(
      transactions,
      cardTimeframe,
      customStartDate,
      customEndDate
    )
    return calculateTimeframeTotals(subset, openingBalance)
  }, [transactions, cardTimeframe, customStartDate, customEndDate, openingBalance])

  // Active filter count
  const activeFilterCount = useMemo(() => {
    let count = 0
    if (filters.startDate) count++
    if (filters.endDate) count++
    if (filters.firmName !== "ALL") count++
    if (filters.partyName !== "ALL") count++
    if (filters.paymentMode !== "ALL") count++
    if (filters.transactionName !== "ALL") count++
    if (filters.entryNature !== "ALL") count++
    if (filters.flowType !== "ALL") count++
    return count
  }, [filters])

  // Table filtering
  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      // 1. Text Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const matchParty = t.party_name?.toLowerCase().includes(q)
        const matchTrans = t.transaction_name?.toLowerCase().includes(q)
        const matchMode = t.payment_mode?.toLowerCase().includes(q)
        const matchNature = t.entry_nature?.toLowerCase().includes(q)
        const matchRemark = t.remark?.toLowerCase().includes(q)
        const matchSr = String(t.sr_no).includes(q)
        const dateFormatted = formatDateDDMMYYYY(t.date).toLowerCase()
        const matchDate = dateFormatted.includes(q) || t.date?.includes(q)
        if (!matchParty && !matchTrans && !matchMode && !matchNature && !matchRemark && !matchSr && !matchDate) {
          return false
        }
      }

      // 2. Advanced Filters
      if (filters.startDate) {
        if (!t.date || t.date < filters.startDate) return false
      }
      if (filters.endDate) {
        if (!t.date || t.date > filters.endDate) return false
      }
      if (filters.partyName !== "ALL" && t.party_name !== filters.partyName) {
        return false
      }
      if (filters.paymentMode !== "ALL" && t.payment_mode !== filters.paymentMode) {
        return false
      }
      if (filters.transactionName !== "ALL" && t.transaction_name !== filters.transactionName) {
        return false
      }
      if (filters.entryNature !== "ALL" && t.entry_nature !== filters.entryNature) {
        return false
      }
      if (filters.flowType !== "ALL") {
        if (filters.flowType === "credit" && (Number(t.credit_amount) || 0) <= 0) return false
        if (filters.flowType === "debit" && (Number(t.debit_amount) || 0) <= 0) return false
      }

      return true
    })
  }, [transactions, searchQuery, filters])

  // Table Sorting
  const sortedTransactions = useMemo(() => {
    return [...filteredTransactions].sort((a, b) => {
      let aVal: any = a[sortField]
      let bVal: any = b[sortField]

      if (sortField === "debit_amount" || sortField === "credit_amount" || sortField === "sr_no") {
        aVal = Number(aVal) || 0
        bVal = Number(bVal) || 0
      } else {
        aVal = (aVal || "").toString().toLowerCase()
        bVal = (bVal || "").toString().toLowerCase()
      }

      if (aVal < bVal) return sortDirection === "asc" ? -1 : 1
      if (aVal > bVal) return sortDirection === "asc" ? 1 : -1
      return 0
    })
  }, [filteredTransactions, sortField, sortDirection])

  const handleHeaderClick = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"))
    } else {
      setSortField(field)
      setSortDirection("asc")
    }
  }

  // Selection handlers
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(sortedTransactions.map((t) => t.id)))
    } else {
      setSelectedIds(new Set())
    }
  }

  const handleToggleSelect = (id: string) => {
    const updated = new Set(selectedIds)
    if (updated.has(id)) {
      updated.delete(id)
    } else {
      updated.add(id)
    }
    setSelectedIds(updated)
  }

  // Delete handlers
  const handleConfirmSingleDelete = async () => {
    if (!deleteTarget) return
    setIsDeleting(true)
    try {
      await deleteDailyTransaction(deleteTarget.id, activeCompany?.id)
      toast.success("Transaction deleted successfully")
      setDeleteTarget(null)
      loadData()
    } catch (err) {
      toast.error("Failed to delete transaction")
    } finally {
      setIsDeleting(false)
    }
  }

  const handleConfirmBulkDelete = async () => {
    if (selectedIds.size === 0) return
    setIsDeleting(true)
    try {
      const ids = Array.from(selectedIds)
      await bulkDeleteDailyTransactions(ids, activeCompany?.id)
      toast.success(`Deleted ${ids.length} transactions`)
      setSelectedIds(new Set())
      setIsBulkDeleteOpen(false)
      loadData()
    } catch (err) {
      toast.error("Failed to delete transactions")
    } finally {
      setIsDeleting(false)
    }
  }

  // Edit handler - directly opens form WITHOUT confirmation prompt
  const handleOpenEdit = (t: DailyTransaction) => {
    setEditingTransaction(t)
    setIsEntryOpen(true)
  }

  const handleOpenAddNew = () => {
    setEditingTransaction(null)
    setIsEntryOpen(true)
  }

  // Export to Excel with professional layout, borders, column auto-fit, and totals at bottom
  const handleExportExcel = async () => {
    if (sortedTransactions.length === 0) {
      toast.error("No transactions to export")
      return
    }

    try {
      await exportDailyTransactionsToExcel(
        sortedTransactions,
        activeCompany?.name || "Daily Transactions",
        openingBalance
      )
      toast.success("Transactions exported to Excel!")
    } catch (err) {
      console.error("Failed to export Excel:", err)
      toast.error("Failed to export Excel file")
    }
  }

  // Formatted date for Header
  const formattedToday = useMemo(() => {
    return new Date().toLocaleDateString("en-IN", {
      weekday: "long",
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
  }, [])

  const formatCurrencyINR = (num: number) => {
    return "₹" + new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(num || 0)
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* ================= TOP HEADER ================= */}
      <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-md border-b shadow-sm px-4 sm:px-8 py-3">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center justify-between gap-3">
          {/* Left: Back Button & Company / Firm Name Selector */}
          <div className="flex items-center gap-2.5 w-full lg:w-auto justify-between lg:justify-start">
            <Link href="/" passHref>
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl font-bold gap-1.5 h-10 px-3 border-border hover:bg-muted"
              >
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Back</span>
              </Button>
            </Link>

            {/* Company Selector Dropdown (Daily Transactions specific) */}
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-primary/10 text-primary shrink-0">
                <Building2 className="h-4 w-4" />
              </div>
              <div className="min-w-[170px] sm:min-w-[220px]">
                <Select
                  value={activeCompany?.id || ""}
                  onValueChange={handleSelectCompany}
                >
                  <SelectTrigger className="rounded-xl h-9 text-xs font-black uppercase tracking-wide bg-background border-border">
                    <SelectValue placeholder="Select Firm / Company" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl max-h-64">
                    {companies.map((c) => (
                      <SelectItem key={c.id} value={c.id} className="font-bold text-xs">
                        {c.name}
                      </SelectItem>
                    ))}
                    <div className="p-1 border-t mt-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsAddCompanyOpen(true)}
                        className="w-full text-xs font-black text-primary hover:bg-primary/10 rounded-lg justify-start gap-1.5 h-8"
                      >
                        <Plus className="h-3.5 w-3.5" /> + Add New Company
                      </Button>
                    </div>
                  </SelectContent>
                </Select>
              </div>

              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setIsAddCompanyOpen(true)}
                className="rounded-xl h-9 w-9 shrink-0 border-border text-primary hover:bg-primary/10"
                title="Add New Firm / Company"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Center: Daily Transaction Title & Today Date Chip */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 text-center">
            <h1 className="text-lg sm:text-2xl font-black tracking-tight bg-gradient-to-r from-primary via-primary/90 to-primary/70 bg-clip-text text-transparent">
              Daily Transaction
            </h1>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-primary/10 text-primary border border-primary/20 shadow-xs">
              <Calendar className="h-3.5 w-3.5" />
              <span>Today: {formattedToday}</span>
            </span>
          </div>

          {/* Right: + Add new Entry & Settings Buttons */}
          <div className="flex items-center gap-2.5 w-full lg:w-auto justify-end">
            <Button
              onClick={handleOpenAddNew}
              className="rounded-xl font-bold h-10 px-4 bg-primary text-primary-foreground shadow-md hover:shadow-lg transition-all gap-1.5"
            >
              <Plus className="h-4 w-4" />
              <span>Add new Entry</span>
            </Button>

            <Button
              variant="outline"
              size="icon"
              onClick={() => setIsSettingsOpen(true)}
              className="rounded-xl h-10 w-10 border-border hover:bg-muted text-muted-foreground hover:text-foreground"
              title="Daily Transaction Settings"
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* ================= MAIN CONTENT ================= */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-5">
        {/* Chips & Summary Cards Section */}
        <div className="space-y-3">
          {/* Filter Chips Bar (with new Custom chip) */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-1.5 bg-muted/60 p-1 rounded-2xl border flex-wrap">
              {(["Today", "Week", "Month", "Lifetime", "Custom"] as TimeframeFilter[]).map((chip) => {
                const isActive = cardTimeframe === chip
                return (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => {
                      setCardTimeframe(chip)
                      if (chip === "Custom") {
                        setIsCustomDateModalOpen(true)
                      }
                    }}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1 ${
                      isActive
                        ? "bg-card text-foreground shadow-sm border border-border"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {chip === "Custom" && <Calendar className="h-3 w-3" />}
                    <span>{chip}</span>
                    {chip === "Custom" && isActive && customStartDate && (
                      <span className="text-[10px] font-medium text-primary">
                        ({formatDateDDMMYYYY(customStartDate)} - {formatDateDDMMYYYY(customEndDate)})
                      </span>
                    )}
                  </button>
                )
              })}
            </div>

            {/* Opening Balance indicator */}
            {openingBalance > 0 && (
              <div className="text-xs font-semibold px-3 py-1 rounded-xl bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20 flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5" />
                <span>Opening Balance (Credit): <strong>{formatCurrencyINR(openingBalance)}</strong></span>
              </div>
            )}
          </div>

          {/* 3 Metric Cards: # Credit, # Debit, # Balance */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Card 1: Credit */}
            <Card className="rounded-3xl border border-emerald-500/30 bg-emerald-500/5 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                    {cardTimeframe} Credit
                  </p>
                  <h3 className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                    {formatCurrencyINR(cardTotals.credit)}
                  </h3>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Money Received / Inflow
                  </p>
                </div>
                <div className="p-3.5 rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                  <TrendingUp className="h-6 w-6" />
                </div>
              </CardContent>
            </Card>

            {/* Card 2: Debit */}
            <Card className="rounded-3xl border border-rose-500/30 bg-rose-500/5 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
                    {cardTimeframe} Debit
                  </p>
                  <h3 className="text-2xl sm:text-3xl font-black text-rose-600 dark:text-rose-400 mt-1">
                    {formatCurrencyINR(cardTotals.debit)}
                  </h3>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Money Paid / Outflow
                  </p>
                </div>
                <div className="p-3.5 rounded-2xl bg-rose-500/15 text-rose-600 dark:text-rose-400">
                  <TrendingDown className="h-6 w-6" />
                </div>
              </CardContent>
            </Card>

            {/* Card 3: Balance */}
            <Card className="rounded-3xl border border-primary/30 bg-primary/5 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-primary">
                    {cardTimeframe} Balance
                  </p>
                  <h3
                    className={`text-2xl sm:text-3xl font-black mt-1 ${
                      cardTotals.balance >= 0
                        ? "text-primary"
                        : "text-rose-600 dark:text-rose-400"
                    }`}
                  >
                    {formatCurrencyINR(cardTotals.balance)}
                  </h3>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Net Position {openingBalance > 0 ? `(Incl. Op. Bal ${formatCurrencyINR(openingBalance)})` : ""}
                  </p>
                </div>
                <div className="p-3.5 rounded-2xl bg-primary/15 text-primary">
                  <Wallet className="h-6 w-6" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* ================= TABLE & ACTIONS TOOLBAR ================= */}
        <div className="space-y-4">
          {/* Action Toolbar */}
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-card p-3 rounded-2xl border shadow-sm">
            {/* Left: Total badge & Search */}
            <div className="flex items-center gap-3 flex-1">
              <span className="text-xs font-extrabold px-3 py-1.5 rounded-xl bg-muted text-muted-foreground border shrink-0">
                Total: {sortedTransactions.length} Entries
              </span>

              <div className="relative flex-1 max-w-sm">
                <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search party, date, nature, S No..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="rounded-xl pl-9 h-9 text-xs"
                />
              </div>

              {/* Active Filter Count or Reset */}
              {activeFilterCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setFilters(INITIAL_FILTER_STATE)}
                  className="h-9 px-2 text-xs font-bold text-destructive hover:bg-destructive/10 rounded-xl gap-1 shrink-0"
                  title="Clear active filters"
                >
                  <RotateCcw className="h-3.5 w-3.5" /> Clear ({activeFilterCount})
                </Button>
              )}
            </div>

            {/* Right: Actions (Filter, PDF, Export, Import, Bulk Delete) */}
            <div className="flex items-center gap-2 flex-wrap justify-end">
              {/* Bulk Delete button (shows when >= 1 item selected) */}
              {selectedIds.size > 0 && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setIsBulkDeleteOpen(true)}
                  className="rounded-xl font-bold h-9 px-3 gap-1.5 shadow-sm"
                >
                  <Trash2 className="h-4 w-4" />
                  <span>Delete ({selectedIds.size})</span>
                </Button>
              )}

              {/* Filter Button */}
              <Button
                variant={activeFilterCount > 0 ? "default" : "outline"}
                size="sm"
                onClick={() => setIsFilterOpen(true)}
                className="rounded-xl font-bold h-9 px-3 gap-1.5"
              >
                <Filter className="h-4 w-4" />
                <span>Filter</span>
                {activeFilterCount > 0 && (
                  <span className="h-4 w-4 rounded-full bg-primary-foreground text-primary text-[10px] flex items-center justify-center font-bold">
                    {activeFilterCount}
                  </span>
                )}
              </Button>

              {/* Generate PDF Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsPdfOpen(true)}
                className="rounded-xl font-bold h-9 px-3 gap-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20 border-red-200 dark:border-red-900/40"
              >
                <FileText className="h-4 w-4" />
                <span>PDF Print</span>
              </Button>

              {/* Export Excel Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportExcel}
                className="rounded-xl font-bold h-9 px-3 gap-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/40"
              >
                <FileSpreadsheet className="h-4 w-4" />
                <span>Export Excel</span>
              </Button>

              {/* Import Excel Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsImportOpen(true)}
                className="rounded-xl font-bold h-9 px-3 gap-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/20 border-blue-200 dark:border-blue-900/40"
              >
                <Upload className="h-4 w-4" />
                <span>Import Excel</span>
              </Button>
            </div>
          </div>

          {/* Table Card */}
          <div className="bg-card border rounded-3xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow className="hover:bg-transparent">
                    {/* Checkbox */}
                    <TableHead className="w-[45px] text-center">
                      <Checkbox
                        checked={
                          sortedTransactions.length > 0 &&
                          selectedIds.size === sortedTransactions.length
                        }
                        onCheckedChange={(c) => handleSelectAll(!!c)}
                        aria-label="Select all"
                      />
                    </TableHead>

                    {/* S No */}
                    <TableHead
                      onClick={() => handleHeaderClick("sr_no")}
                      className="cursor-pointer select-none font-bold text-xs"
                    >
                      <div className="flex items-center gap-1">
                        <span>S No</span>
                        {sortField === "sr_no" ? (
                          sortDirection === "asc" ? (
                            <ArrowUp className="h-3 w-3 text-primary" />
                          ) : (
                            <ArrowDown className="h-3 w-3 text-primary" />
                          )
                        ) : (
                          <ArrowUpDown className="h-3 w-3 opacity-40" />
                        )}
                      </div>
                    </TableHead>

                    {/* Date (Formatted as dd/mm/yyyy) */}
                    <TableHead
                      onClick={() => handleHeaderClick("date")}
                      className="cursor-pointer select-none font-bold text-xs"
                    >
                      <div className="flex items-center gap-1">
                        <span>Date</span>
                        {sortField === "date" ? (
                          sortDirection === "asc" ? (
                            <ArrowUp className="h-3 w-3 text-primary" />
                          ) : (
                            <ArrowDown className="h-3 w-3 text-primary" />
                          )
                        ) : (
                          <ArrowUpDown className="h-3 w-3 opacity-40" />
                        )}
                      </div>
                    </TableHead>

                    {/* Party Name */}
                    <TableHead
                      onClick={() => handleHeaderClick("party_name")}
                      className="cursor-pointer select-none font-bold text-xs"
                    >
                      <div className="flex items-center gap-1">
                        <span>Party Name</span>
                        {sortField === "party_name" ? (
                          sortDirection === "asc" ? (
                            <ArrowUp className="h-3 w-3 text-primary" />
                          ) : (
                            <ArrowDown className="h-3 w-3 text-primary" />
                          )
                        ) : (
                          <ArrowUpDown className="h-3 w-3 opacity-40" />
                        )}
                      </div>
                    </TableHead>

                    {/* Payment Type */}
                    <TableHead
                      onClick={() => handleHeaderClick("payment_mode")}
                      className="cursor-pointer select-none font-bold text-xs"
                    >
                      <div className="flex items-center gap-1">
                        <span>Payment Type</span>
                        {sortField === "payment_mode" ? (
                          sortDirection === "asc" ? (
                            <ArrowUp className="h-3 w-3 text-primary" />
                          ) : (
                            <ArrowDown className="h-3 w-3 text-primary" />
                          )
                        ) : (
                          <ArrowUpDown className="h-3 w-3 opacity-40" />
                        )}
                      </div>
                    </TableHead>

                    {/* Transaction */}
                    <TableHead
                      onClick={() => handleHeaderClick("transaction_name")}
                      className="cursor-pointer select-none font-bold text-xs"
                    >
                      <div className="flex items-center gap-1">
                        <span>Transaction</span>
                        {sortField === "transaction_name" ? (
                          sortDirection === "asc" ? (
                            <ArrowUp className="h-3 w-3 text-primary" />
                          ) : (
                            <ArrowDown className="h-3 w-3 text-primary" />
                          )
                        ) : (
                          <ArrowUpDown className="h-3 w-3 opacity-40" />
                        )}
                      </div>
                    </TableHead>

                    {/* Nature / Category */}
                    <TableHead
                      onClick={() => handleHeaderClick("entry_nature")}
                      className="cursor-pointer select-none font-bold text-xs"
                    >
                      <div className="flex items-center gap-1">
                        <span>Nature</span>
                        {sortField === "entry_nature" ? (
                          sortDirection === "asc" ? (
                            <ArrowUp className="h-3 w-3 text-primary" />
                          ) : (
                            <ArrowDown className="h-3 w-3 text-primary" />
                          )
                        ) : (
                          <ArrowUpDown className="h-3 w-3 opacity-40" />
                        )}
                      </div>
                    </TableHead>

                    {/* Remark */}
                    <TableHead
                      onClick={() => handleHeaderClick("remark")}
                      className="cursor-pointer select-none font-bold text-xs"
                    >
                      <div className="flex items-center gap-1">
                        <span>Remark</span>
                        {sortField === "remark" ? (
                          sortDirection === "asc" ? (
                            <ArrowUp className="h-3 w-3 text-primary" />
                          ) : (
                            <ArrowDown className="h-3 w-3 text-primary" />
                          )
                        ) : (
                          <ArrowUpDown className="h-3 w-3 opacity-40" />
                        )}
                      </div>
                    </TableHead>

                    {/* Debit */}
                    <TableHead
                      onClick={() => handleHeaderClick("debit_amount")}
                      className="cursor-pointer select-none font-bold text-xs text-right"
                    >
                      <div className="flex items-center justify-end gap-1">
                        <span>Debit</span>
                        {sortField === "debit_amount" ? (
                          sortDirection === "asc" ? (
                            <ArrowUp className="h-3 w-3 text-primary" />
                          ) : (
                            <ArrowDown className="h-3 w-3 text-primary" />
                          )
                        ) : (
                          <ArrowUpDown className="h-3 w-3 opacity-40" />
                        )}
                      </div>
                    </TableHead>

                    {/* Credit */}
                    <TableHead
                      onClick={() => handleHeaderClick("credit_amount")}
                      className="cursor-pointer select-none font-bold text-xs text-right"
                    >
                      <div className="flex items-center justify-end gap-1">
                        <span>Credit</span>
                        {sortField === "credit_amount" ? (
                          sortDirection === "asc" ? (
                            <ArrowUp className="h-3 w-3 text-primary" />
                          ) : (
                            <ArrowDown className="h-3 w-3 text-primary" />
                          )
                        ) : (
                          <ArrowUpDown className="h-3 w-3 opacity-40" />
                        )}
                      </div>
                    </TableHead>

                    {/* Action */}
                    <TableHead className="font-bold text-xs text-center w-[90px]">
                      Action
                    </TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={11} className="text-center py-12 text-sm text-muted-foreground font-medium">
                        Loading daily transactions...
                      </TableCell>
                    </TableRow>
                  ) : sortedTransactions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={11} className="text-center py-16 text-muted-foreground space-y-2">
                        <p className="text-base font-semibold">No daily transactions found for {activeCompany?.name}.</p>
                        <p className="text-xs">Click &quot;+ Add new Entry&quot; to record today&apos;s transactions.</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    sortedTransactions.map((t) => {
                      const isSelected = selectedIds.has(t.id)

                      return (
                        <TableRow
                          key={t.id}
                          className={`transition-colors ${
                            isSelected ? "bg-primary/5" : "hover:bg-muted/30"
                          }`}
                        >
                          {/* Selection Checkbox */}
                          <TableCell className="text-center">
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => handleToggleSelect(t.id)}
                              aria-label={`Select row ${t.sr_no}`}
                            />
                          </TableCell>

                          {/* S No */}
                          <TableCell className="font-bold text-xs text-muted-foreground">
                            #{t.sr_no}
                          </TableCell>

                          {/* Date formatted as dd/mm/yyyy */}
                          <TableCell className="text-xs font-semibold whitespace-nowrap">
                            {formatDateDDMMYYYY(t.date)}
                          </TableCell>

                          {/* Party Name */}
                          <TableCell className="text-xs font-bold">
                            <div>{t.party_name}</div>
                          </TableCell>

                          {/* Payment Type */}
                          <TableCell className="text-xs font-medium text-muted-foreground">
                            {t.payment_mode || "Cash"}
                          </TableCell>

                          {/* Transaction */}
                          <TableCell className="text-xs font-medium">
                            {t.transaction_name || "General"}
                          </TableCell>

                          {/* Nature Badge */}
                          <TableCell>
                            <span
                              className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                                t.entry_nature === "Purchase"
                                  ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                                  : t.entry_nature === "Sale"
                                  ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
                                  : "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20"
                              }`}
                            >
                              {t.entry_nature === "Purchase" ? (
                                <ShoppingBag className="h-3 w-3" />
                              ) : t.entry_nature === "Sale" ? (
                                <TrendingUp className="h-3 w-3" />
                              ) : (
                                <Receipt className="h-3 w-3" />
                              )}
                              {t.entry_nature}
                            </span>
                          </TableCell>

                          {/* Remark */}
                          <TableCell className="text-xs text-muted-foreground max-w-[180px] truncate" title={t.remark || ""}>
                            {t.remark || "-"}
                          </TableCell>

                          {/* Debit */}
                          <TableCell className="text-xs font-bold text-right text-rose-600 dark:text-rose-400 whitespace-nowrap">
                            {t.debit_amount > 0 ? formatCurrencyINR(t.debit_amount) : "-"}
                          </TableCell>

                          {/* Credit */}
                          <TableCell className="text-xs font-bold text-right text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                            {t.credit_amount > 0 ? formatCurrencyINR(t.credit_amount) : "-"}
                          </TableCell>

                          {/* Action (Edit directly WITHOUT confirmation, Delete asks confirmation) */}
                          <TableCell className="text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => handleOpenEdit(t)}
                                className="h-8 w-8 rounded-lg text-primary hover:bg-primary/10"
                                title="Edit Entry (Direct, no prompt)"
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </Button>

                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => setDeleteTarget(t)}
                                className="h-8 w-8 rounded-lg text-destructive hover:bg-destructive/10"
                                title="Delete Entry"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </main>

      {/* ================= MODALS ================= */}

      {/* 1. Add / Edit Entry Modal */}
      {isEntryOpen && activeCompany && (
        <EntryDialog
          open={isEntryOpen}
          onOpenChange={setIsEntryOpen}
          transaction={editingTransaction}
          companyId={activeCompany.id}
          companyName={activeCompany.name}
          nextSrNo={nextSrNo}
          onSuccess={loadData}
        />
      )}

      {/* 2. Custom Date Filter Modal for Cards */}
      <Dialog open={isCustomDateModalOpen} onOpenChange={setIsCustomDateModalOpen}>
        <DialogContent className="max-w-sm rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              Custom Date Range for Cards
            </DialogTitle>
            <DialogDescription className="text-xs">
              Cards will calculate Credit, Debit, and Balance for this period.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label className="text-xs font-bold text-muted-foreground">From Date</Label>
              <Input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="rounded-xl h-10"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-bold text-muted-foreground">To Date</Label>
              <Input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="rounded-xl h-10"
              />
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              onClick={() => setIsCustomDateModalOpen(false)}
              className="rounded-xl font-bold bg-primary text-primary-foreground w-full"
            >
              Apply Date Range
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 3. Add New Company Modal (from top-left) */}
      <Dialog open={isAddCompanyOpen} onOpenChange={setIsAddCompanyOpen}>
        <DialogContent className="max-w-md rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Building2 className="h-4 w-4 text-primary" />
              Add New Daily Transaction Company
            </DialogTitle>
            <DialogDescription className="text-xs">
              This company will be specific to Daily Transactions (independent of Project Manager).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label className="text-xs font-bold text-muted-foreground">Company / Firm Name</Label>
              <Input
                placeholder="e.g. Insiya Solar Industry"
                value={newCompanyName}
                onChange={(e) => setNewCompanyName(e.target.value)}
                className="rounded-xl h-10 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-bold text-muted-foreground">Opening Balance (₹, Always Credit)</Label>
              <Input
                placeholder="0"
                value={newCompanyBalance}
                onChange={(e) => setNewCompanyBalance(e.target.value.replace(/[^0-9.]/g, ""))}
                className="rounded-xl h-10 text-xs font-bold"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsAddCompanyOpen(false)}
              className="rounded-xl font-bold"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleCreateCompany}
              className="rounded-xl font-bold bg-primary text-primary-foreground"
            >
              Create Company
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 4. Filter Modal */}
      {isFilterOpen && (
        <FilterDialog
          open={isFilterOpen}
          onOpenChange={setIsFilterOpen}
          currentFilters={filters}
          onApply={setFilters}
        />
      )}

      {/* 5. Settings Modal (Companies, Dropdowns, PDF Columns) */}
      {isSettingsOpen && (
        <DailySettingsDialog
          open={isSettingsOpen}
          onOpenChange={setIsSettingsOpen}
          onCompaniesChanged={loadData}
        />
      )}

      {/* 6. PDF Preview Modal */}
      {isPdfOpen && (
        <PdfPreviewDialog
          open={isPdfOpen}
          onOpenChange={setIsPdfOpen}
          transactions={sortedTransactions}
          timeframeLabel={filters.startDate || filters.endDate ? "Filtered Period" : cardTimeframe}
          firmFilterName={activeCompany?.name}
          openingBalance={openingBalance}
        />
      )}

      {/* 7. Import Excel Modal */}
      {isImportOpen && (
        <DailyImportDialog
          open={isImportOpen}
          onOpenChange={setIsImportOpen}
          companyId={activeCompany?.id || "default"}
          onSuccess={loadData}
        />
      )}

      {/* 8. Single Delete Confirmation Modal */}
      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <DialogContent className="max-w-md rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-destructive flex items-center gap-2">
              <Trash2 className="h-5 w-5" />
              Delete Daily Transaction?
            </DialogTitle>
            <DialogDescription className="pt-2">
              Are you sure you want to delete transaction <strong>#{deleteTarget?.sr_no}</strong> for <strong>{deleteTarget?.party_name}</strong> (Amount: {formatCurrencyINR(deleteTarget?.credit_amount || deleteTarget?.debit_amount || 0)})? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0 pt-4">
            <Button
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              disabled={isDeleting}
              className="rounded-xl font-bold"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmSingleDelete}
              disabled={isDeleting}
              className="rounded-xl font-bold"
            >
              {isDeleting ? "Deleting..." : "Confirm Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 9. Bulk Delete Confirmation Modal */}
      <Dialog
        open={isBulkDeleteOpen}
        onOpenChange={setIsBulkDeleteOpen}
      >
        <DialogContent className="max-w-md rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-destructive flex items-center gap-2">
              <Trash2 className="h-5 w-5" />
              Bulk Delete Transactions?
            </DialogTitle>
            <DialogDescription className="pt-2">
              You have selected <strong>{selectedIds.size} transactions</strong>. Are you sure you want to permanently delete all of them?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0 pt-4">
            <Button
              variant="outline"
              onClick={() => setIsBulkDeleteOpen(false)}
              disabled={isDeleting}
              className="rounded-xl font-bold"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmBulkDelete}
              disabled={isDeleting}
              className="rounded-xl font-bold"
            >
              {isDeleting ? "Deleting..." : `Delete ${selectedIds.size} Records`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
