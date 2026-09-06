"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Settings,
  ListFilter,
  FileText,
  Building2,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  IndianRupee,
} from "lucide-react"
import {
  DailyPdfColumnsConfig,
  DEFAULT_DAILY_PDF_COLUMNS,
} from "@/lib/daily-transaction-types"
import {
  getDailyPdfColumnsConfig,
  saveDailyPdfColumnsConfig,
  getDailyDropdownOptions,
  saveDailyDropdownOptions,
  DailyDropdownKey,
} from "@/lib/daily-transaction-store"
import {
  getDailyCompanies,
  addDailyCompany,
  updateDailyCompany,
  deleteDailyCompany,
  DailyCompany,
} from "@/lib/daily-company-store"
import { DropdownManagerDialog } from "./dropdown-manager-dialog"
import { toast } from "sonner"

interface SettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCompaniesChanged?: () => void
}

export function DailySettingsDialog({
  open,
  onOpenChange,
  onCompaniesChanged,
}: SettingsDialogProps) {
  const [activeTab, setActiveTab] = useState("companies")

  // Companies state
  const [companies, setCompanies] = useState<DailyCompany[]>([])
  const [newCompanyName, setNewCompanyName] = useState("")
  const [newCompanyBalance, setNewCompanyBalance] = useState("")
  const [editingCompId, setEditingCompId] = useState<string | null>(null)
  const [editCompName, setEditCompName] = useState("")
  const [editCompBalance, setEditCompBalance] = useState("")

  // PDF Columns configuration
  const [pdfConfig, setPdfConfig] = useState<DailyPdfColumnsConfig>(DEFAULT_DAILY_PDF_COLUMNS)

  // Dropdown Manager modal
  const [activeDropdownManager, setActiveDropdownManager] = useState<{
    open: boolean
    key: DailyDropdownKey
    title: string
    options: string[]
  }>({
    open: false,
    key: "payment_modes",
    title: "",
    options: [],
  })

  // Load state on open
  useEffect(() => {
    if (!open) return
    setCompanies(getDailyCompanies())
    setPdfConfig(getDailyPdfColumnsConfig())
    setEditingCompId(null)
  }, [open])

  // Company management handlers
  const handleAddCompany = async () => {
    const trimmed = newCompanyName.trim()
    if (!trimmed) {
      toast.error("Please enter a company name")
      return
    }
    const balanceNum = parseFloat(newCompanyBalance.replace(/,/g, "")) || 0
    await addDailyCompany(trimmed, balanceNum)
    setCompanies(getDailyCompanies())
    setNewCompanyName("")
    setNewCompanyBalance("")
    toast.success(`Company "${trimmed}" added`)
    onCompaniesChanged?.()
  }

  const handleStartEditCompany = (comp: DailyCompany) => {
    setEditingCompId(comp.id)
    setEditCompName(comp.name)
    setEditCompBalance(String(comp.opening_balance || 0))
  }

  const handleSaveEditCompany = async (id: string) => {
    const trimmed = editCompName.trim()
    if (!trimmed) {
      toast.error("Company name cannot be empty")
      return
    }
    const balanceNum = parseFloat(editCompBalance.replace(/,/g, "")) || 0
    await updateDailyCompany(id, { name: trimmed, opening_balance: balanceNum })
    setCompanies(getDailyCompanies())
    setEditingCompId(null)
    toast.success("Company updated successfully")
    onCompaniesChanged?.()
  }

  const handleDeleteCompany = async (id: string, name: string) => {
    if (companies.length <= 1) {
      toast.error("Cannot delete the only company")
      return
    }
    if (!confirm(`Are you sure you want to delete "${name}"? Transactions for this company will remain saved.`)) {
      return
    }
    try {
      await deleteDailyCompany(id)
      setCompanies(getDailyCompanies())
      toast.success(`Deleted company "${name}"`)
      onCompaniesChanged?.()
    } catch (e: any) {
      toast.error(e.message || "Failed to delete company")
    }
  }

  // PDF Column config handlers
  const handleToggleColumn = (col: keyof DailyPdfColumnsConfig) => {
    const updated = { ...pdfConfig, [col]: !pdfConfig[col] }
    setPdfConfig(updated)
    saveDailyPdfColumnsConfig(updated)
  }

  // Dropdown Manager modal opener
  const handleOpenDropdownManager = async (key: DailyDropdownKey, title: string) => {
    const opts = await getDailyDropdownOptions(key)
    setActiveDropdownManager({
      open: true,
      key,
      title,
      options: opts,
    })
  }

  const handleSaveDropdownOptions = async (newOpts: string[]) => {
    await saveDailyDropdownOptions(activeDropdownManager.key, newOpts)
    setActiveDropdownManager((prev) => ({ ...prev, options: newOpts }))
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl rounded-3xl p-6 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <span className="p-2 rounded-xl bg-primary/10 text-primary">
                <Settings className="h-5 w-5" />
              </span>
              Daily Transactions Settings
            </DialogTitle>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full mt-2">
            <TabsList className="grid grid-cols-3 p-1 rounded-2xl bg-muted/60 mb-4">
              <TabsTrigger value="companies" className="rounded-xl font-bold text-xs py-2">
                <Building2 className="h-3.5 w-3.5 mr-1.5" />
                Manage Companies
              </TabsTrigger>
              <TabsTrigger value="dropdowns" className="rounded-xl font-bold text-xs py-2">
                <ListFilter className="h-3.5 w-3.5 mr-1.5" />
                Dropdown Lists
              </TabsTrigger>
              <TabsTrigger value="pdf" className="rounded-xl font-bold text-xs py-2">
                <FileText className="h-3.5 w-3.5 mr-1.5" />
                Manage Print PDF
              </TabsTrigger>
            </TabsList>

            {/* TAB 1: MANAGE COMPANIES & OPENING BALANCE */}
            <TabsContent value="companies" className="space-y-4">
              <div className="p-3 bg-muted/30 border rounded-2xl space-y-1">
                <p className="text-xs font-bold text-foreground">Company & Firm Management</p>
                <p className="text-[11px] text-muted-foreground">
                  Manage companies specific to Daily Transactions. Set Opening Balance (always credit), which will automatically factor into net balance calculations.
                </p>
              </div>

              {/* Add Company Form */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 p-3 rounded-2xl border bg-card">
                <div className="sm:col-span-2 space-y-1">
                  <Label className="text-[11px] font-bold text-muted-foreground">Company / Firm Name</Label>
                  <Input
                    placeholder="e.g. Insiya Solar Industry"
                    value={newCompanyName}
                    onChange={(e) => setNewCompanyName(e.target.value)}
                    className="rounded-xl h-9 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] font-bold text-muted-foreground">Opening Balance (₹)</Label>
                  <div className="flex gap-1.5">
                    <Input
                      placeholder="0"
                      value={newCompanyBalance}
                      onChange={(e) => setNewCompanyBalance(e.target.value.replace(/[^0-9.]/g, ""))}
                      className="rounded-xl h-9 text-xs font-bold"
                    />
                    <Button
                      type="button"
                      onClick={handleAddCompany}
                      className="rounded-xl h-9 px-3 bg-primary text-primary-foreground font-bold shrink-0"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Company List */}
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                {companies.map((comp) => {
                  const isEditing = editingCompId === comp.id

                  return (
                    <div
                      key={comp.id}
                      className="p-3 rounded-2xl border bg-card flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5"
                    >
                      {isEditing ? (
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-1 w-full">
                          <Input
                            value={editCompName}
                            onChange={(e) => setEditCompName(e.target.value)}
                            placeholder="Company Name"
                            className="rounded-xl h-8 text-xs flex-1 font-bold"
                          />
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs text-muted-foreground font-semibold">₹</span>
                            <Input
                              value={editCompBalance}
                              onChange={(e) => setEditCompBalance(e.target.value.replace(/[^0-9.]/g, ""))}
                              placeholder="Opening Bal"
                              className="rounded-xl h-8 text-xs w-28 font-bold"
                            />
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleSaveEditCompany(comp.id)}
                              className="h-8 w-8 text-emerald-600 hover:bg-emerald-50 rounded-lg shrink-0"
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => setEditingCompId(null)}
                              className="h-8 w-8 text-muted-foreground hover:bg-muted rounded-lg shrink-0"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-extrabold truncate">{comp.name}</p>
                            <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                              <span>Opening Balance (Credit):</span>
                              <span className="font-bold text-emerald-600 dark:text-emerald-400">
                                ₹{new Intl.NumberFormat("en-IN").format(comp.opening_balance || 0)}
                              </span>
                            </p>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleStartEditCompany(comp)}
                              className="h-8 w-8 text-primary hover:bg-primary/10 rounded-lg"
                              title="Edit Company"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleDeleteCompany(comp.id, comp.name)}
                              className="h-8 w-8 text-destructive hover:bg-destructive/10 rounded-lg"
                              title="Delete Company"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </>
                      )}
                    </div>
                  )
                })}
              </div>
            </TabsContent>

            {/* TAB 2: DROPDOWN LISTS (CREDIT & DEBIT SEPARATED) */}
            <TabsContent value="dropdowns" className="space-y-4">
              <div className="p-3 bg-muted/30 border rounded-2xl">
                <p className="text-xs font-bold text-foreground">Separate Credit & Debit Lists</p>
                <p className="text-[11px] text-muted-foreground">
                  Party Names and Transactions change automatically when toggling between Credit and Debit in the entry form.
                </p>
              </div>

              <div className="space-y-3">
                {/* Payment Modes (Shared) */}
                <div className="p-3.5 rounded-2xl border bg-card flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold">Payment Modes</h4>
                    <p className="text-[11px] text-muted-foreground">
                      Cash, Bank Transfer, RTGS, Cheque, UPI, etc. (Shared for both)
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenDropdownManager("payment_modes", "Payment Modes")}
                    className="rounded-xl font-bold text-xs gap-1"
                  >
                    <Edit2 className="h-3.5 w-3.5" /> Manage
                  </Button>
                </div>

                {/* Credit Parties */}
                <div className="p-3.5 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-emerald-700 dark:text-emerald-400">Credit Parties</h4>
                    <p className="text-[11px] text-muted-foreground">
                      Parties from whom money is received (Clients, Buyers, Banks, etc.)
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenDropdownManager("parties_credit", "Credit Parties")}
                    className="rounded-xl font-bold text-xs gap-1 border-emerald-500/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10"
                  >
                    <Edit2 className="h-3.5 w-3.5" /> Manage
                  </Button>
                </div>

                {/* Debit Parties */}
                <div className="p-3.5 rounded-2xl border border-rose-500/30 bg-rose-500/5 flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-rose-700 dark:text-rose-400">Debit Parties</h4>
                    <p className="text-[11px] text-muted-foreground">
                      Parties to whom money is paid (Suppliers, Transporters, Staff, etc.)
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenDropdownManager("parties_debit", "Debit Parties")}
                    className="rounded-xl font-bold text-xs gap-1 border-rose-500/30 text-rose-700 dark:text-rose-400 hover:bg-rose-500/10"
                  >
                    <Edit2 className="h-3.5 w-3.5" /> Manage
                  </Button>
                </div>

                {/* Credit Transactions */}
                <div className="p-3.5 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-emerald-700 dark:text-emerald-400">Credit Transactions</h4>
                    <p className="text-[11px] text-muted-foreground">
                      Advance Received, Final Payment, Scrap Sale, Inward Income, etc.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenDropdownManager("transactions_credit", "Credit Transactions")}
                    className="rounded-xl font-bold text-xs gap-1 border-emerald-500/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10"
                  >
                    <Edit2 className="h-3.5 w-3.5" /> Manage
                  </Button>
                </div>

                {/* Debit Transactions */}
                <div className="p-3.5 rounded-2xl border border-rose-500/30 bg-rose-500/5 flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-rose-700 dark:text-rose-400">Debit Transactions</h4>
                    <p className="text-[11px] text-muted-foreground">
                      Material Purchase, Site Installation, Transport, Salary, GST, etc.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenDropdownManager("transactions_debit", "Debit Transactions")}
                    className="rounded-xl font-bold text-xs gap-1 border-rose-500/30 text-rose-700 dark:text-rose-400 hover:bg-rose-500/10"
                  >
                    <Edit2 className="h-3.5 w-3.5" /> Manage
                  </Button>
                </div>
              </div>
            </TabsContent>

            {/* TAB 3: MANAGE PRINT PDF */}
            <TabsContent value="pdf" className="space-y-4">
              <div className="p-3 bg-muted/30 border rounded-2xl">
                <p className="text-xs font-bold text-foreground">Customize PDF Export Columns</p>
                <p className="text-[11px] text-muted-foreground">
                  Check which columns you want to appear on the exported PDF document. Firm Name will always be prominent at the top header.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { key: "sr_no", label: "S No" },
                  { key: "date", label: "Date" },
                  { key: "firm_name", label: "Firm Name" },
                  { key: "party_name", label: "Party Name" },
                  { key: "payment_mode", label: "Payment Mode" },
                  { key: "transaction_name", label: "Transaction" },
                  { key: "entry_nature", label: "Nature / Category" },
                  { key: "remark", label: "Remark" },
                  { key: "debit", label: "Debit (Amount)" },
                  { key: "credit", label: "Credit (Amount)" },
                ].map((col) => {
                  const k = col.key as keyof DailyPdfColumnsConfig
                  const isChecked = pdfConfig[k]

                  return (
                    <label
                      key={col.key}
                      className={`flex items-center justify-between p-3 rounded-2xl border cursor-pointer transition-all ${
                        isChecked
                          ? "bg-primary/5 border-primary/40 text-foreground"
                          : "bg-card border-border text-muted-foreground"
                      }`}
                    >
                      <span className="text-xs font-bold">{col.label}</span>
                      <Checkbox
                        checked={isChecked}
                        onCheckedChange={() => handleToggleColumn(k)}
                      />
                    </label>
                  )
                })}
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Dropdown Manager Modal with Add, Edit, and Delete */}
      {activeDropdownManager.open && (
        <DropdownManagerDialog
          open={activeDropdownManager.open}
          onOpenChange={(val) =>
            setActiveDropdownManager((prev) => ({ ...prev, open: val }))
          }
          title={activeDropdownManager.title}
          options={activeDropdownManager.options}
          onSave={handleSaveDropdownOptions}
        />
      )}
    </>
  )
}
