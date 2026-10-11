"use client"

import { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Search,
  Plus,
  Menu,
  X,
  LayoutDashboard,
  Database,
  Download,
  UploadCloud,
  FolderOpen,
  Building2,
  ChevronDown,
  PlusCircle,
  Settings,
  Trash2,
  ReceiptText,
  TrendingUp,
  ShoppingBag,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import {
  getCompanies,
  saveCompanies,
  getActiveCompany,
  setActiveCompanyId,
  deleteCompany,
  syncCompaniesFromDB,
  type Company,
} from "@/lib/company-store"
import { clearSession, isAdmin, hasEditPermission } from "@/lib/auth-store"
import { useRecordMode } from "@/lib/record-mode-store"
import { ChangeCredentialsDialog } from "@/components/auth/change-credentials-dialog"
import { ManageUsersDialog } from "@/components/auth/manage-users-dialog"
import { PdfColumnsDialog } from "@/components/dashboard/pdf-columns-dialog"
import { toast } from "sonner"

interface DashboardHeaderProps {
  searchQuery: string
  onSearchChange: (query: string) => void
  onDatabaseImport?: () => void
}

export function DashboardHeader({ searchQuery, onSearchChange, onDatabaseImport }: DashboardHeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [saveFolder, setSaveFolder] = useState<string>("")
  const [companies, setCompaniesList] = useState<Company[]>([])
  const [activeCompany, setActiveComp] = useState<Company>({ id: "insiya-solar", name: "Insiya Solar Industry" })

  const { mode, setMode, isPurchase } = useRecordMode()

  const [settingsOpen, setSettingsOpen] = useState(false)
  const [addCompanyOpen, setAddCompanyOpen] = useState(false)
  const [changeCredsOpen, setChangeCredsOpen] = useState(false)
  const [manageUsersOpen, setManageUsersOpen] = useState(false)
  const [pdfColumnsOpen, setPdfColumnsOpen] = useState(false)
  const [newCompanyName, setNewCompanyName] = useState("")
  const [newCompanyTagline, setNewCompanyTagline] = useState("")
  const [mounted, setMounted] = useState(false)
  const [isAdminUser, setIsAdminUser] = useState(false)
  const [canEdit, setCanEdit] = useState(false)

  const fileInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    setMounted(true)
    setIsAdminUser(isAdmin())
    setCanEdit(hasEditPermission())
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("custom_save_location")
      if (stored) setSaveFolder(stored)

      setCompaniesList(getCompanies())
      setActiveComp(getActiveCompany())
      syncCompaniesFromDB().then((comps) => {
        if (comps && comps.length > 0) {
          setCompaniesList(comps)
        }
      })
    }
  }, [])

  const handleSelectCompany = (comp: Company) => {
    setActiveCompanyId(comp.id)
    setActiveComp(comp)
    toast.success(`Switched active database to: ${comp.name}`)
    if (onDatabaseImport) onDatabaseImport()
    window.location.reload()
  }

  const handleAddCompanySubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmedName = newCompanyName.trim()
    if (!trimmedName) return

    const newId = `company-${Date.now()}`
    const newCompanyObj: Company = {
      id: newId,
      name: trimmedName,
      tagline: newCompanyTagline.trim() || "Project Manager",
    }

    const updated = [...companies, newCompanyObj]
    await saveCompanies(updated)
    setCompaniesList(updated)
    setActiveCompanyId(newId)
    setActiveComp(newCompanyObj)

    setNewCompanyName("")
    setNewCompanyTagline("")
    setAddCompanyOpen(false)

    toast.success(`New company database "${trimmedName}" created and activated!`)
    if (onDatabaseImport) onDatabaseImport()
    window.location.reload()
  }

  const handleSetSaveFolder = async () => {
    try {
      let chosenPath: string | null = null
      if (typeof window !== "undefined" && (window as any).require) {
        try {
          const { ipcRenderer } = (window as any).require("electron")
          chosenPath = await ipcRenderer.invoke("dialog:selectFolder")
        } catch (err) {
          console.warn("IPC invoke failed, fallback to prompt:", err)
        }
      }

      if (!chosenPath) {
        chosenPath = prompt(
          "Enter your preferred PC folder path to save all PDFs, Excels & Backup files:\n(e.g., D:\\Solar Reports)",
          saveFolder || "D:\\Solar Reports"
        )
      }

      if (chosenPath && chosenPath.trim()) {
        const cleanPath = chosenPath.trim()
        setSaveFolder(cleanPath)
        localStorage.setItem("custom_save_location", cleanPath)
        toast.success(`Save location updated to:\n${cleanPath}`)
      }
    } catch (e: any) {
      console.error("Set save folder error:", e)
      toast.error("Could not set save folder location")
    }
  }

  const handleLogout = () => {
    if (confirm("Are you sure you want to logout?")) {
      clearSession()
      window.location.href = "/login"
    }
  }

  const handleExportDatabase = async () => {
    try {
      const toastId = toast.loading("Exporting database from Supabase...")
      const supabase = createClient()
      const companyId = activeCompany.id

      // Fetch all projects for this company
      const { data: projects } = await supabase
        .from("projects")
        .select("*")
        .eq("company_id", companyId)
        .order("id_no", { ascending: true })
      const projectsList: any[] = projects || []
      const projectIds = projectsList.map((p: any) => p.id)

      // Fetch all child records for these projects
      let ledgerEntries: any[] = []
      let paymentTerms: any[] = []
      let expenses: any[] = []
      let callingRecords: any[] = []
      let swhChecklist: any[] = []
      let workRemarks: any[] = []

      if (projectIds.length > 0) {
        const [le, pt, ex, cr, sc, wr] = await Promise.all([
          supabase.from("ledger_entries").select("*").in("project_id", projectIds),
          supabase.from("payment_terms").select("*").in("project_id", projectIds),
          supabase.from("expenses").select("*").in("project_id", projectIds),
          supabase.from("calling_records").select("*").in("project_id", projectIds),
          supabase.from("swh_checklist").select("*").in("project_id", projectIds),
          supabase.from("work_remarks").select("*").in("project_id", projectIds),
        ])
        ledgerEntries = le.data || []
        paymentTerms = pt.data || []
        expenses = ex.data || []
        callingRecords = cr.data || []
        swhChecklist = sc.data || []
        workRemarks = wr.data || []
      }

      // Fetch all purchases for this company
      let purchasesList: any[] = []
      let purchaseLedgerEntries: any[] = []
      let purchaseCallingRecords: any[] = []
      try {
        const { data: purData } = await supabase
          .from("purchases")
          .select("*")
          .eq("company_id", companyId)
          .order("id_no", { ascending: true })
        purchasesList = purData || []
        const purchaseIds = purchasesList.map((p: any) => p.id)
        if (purchaseIds.length > 0) {
          const [ple, pcr] = await Promise.all([
            supabase.from("purchase_ledger_entries").select("*").in("purchase_id", purchaseIds),
            supabase.from("purchase_calling_records").select("*").in("purchase_id", purchaseIds),
          ])
          purchaseLedgerEntries = ple.data || []
          purchaseCallingRecords = pcr.data || []
        }
      } catch (purErr) {
        console.warn("Purchases not exported:", purErr)
      }

      const data = {
        projects: projectsList,
        payment_terms: paymentTerms,
        ledger_entries: ledgerEntries,
        expenses: expenses,
        calling_records: callingRecords,
        swh_checklist: swhChecklist,
        work_remarks: workRemarks,
        purchases: purchasesList,
        purchase_ledger_entries: purchaseLedgerEntries,
        purchase_calling_records: purchaseCallingRecords,
      }

      const jsonStr = JSON.stringify(data, null, 2)
      const blob = new Blob([jsonStr], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      const cleanCompName = activeCompany.name.replace(/[^a-zA-Z0-9]/g, "_")
      a.download = `${cleanCompName}_Database_Backup_${new Date().toISOString().slice(0, 10)}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      toast.dismiss(toastId)
      const saveMsg = saveFolder ? ` (Folder: ${saveFolder})` : ""
      toast.success(
        `Database exported for ${activeCompany.name}!${saveMsg}\n` +
        `${projectsList.length} projects, ${purchasesList.length} purchases, ` +
        `${ledgerEntries.length} sales ledger, ${purchaseLedgerEntries.length} purchase ledger entries.`
      )
    } catch (e: any) {
      console.error("Export database error:", e)
      toast.error("Failed to export database backup")
    }
  }

  const handleImportDatabase = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = async (evt) => {
      try {
        const content = evt.target?.result as string
        const parsed = JSON.parse(content)
        if (!parsed || (!parsed.projects && !parsed.payment_terms)) {
          toast.error("Invalid database backup file format.")
          return
        }

        const toastId = toast.loading("Importing database backup to Supabase...")

        const supabase = createClient()
        const companyId = activeCompany.id

        // -- Step 1: Import projects and build old-id -> new-id map --
        const projectIdMap: Record<string, string> = {} // oldId -> newId
        const projects: any[] = parsed.projects || []

        // Fetch existing projects for this company to avoid duplicates
        const { data: existingProjects } = await supabase
          .from("projects")
          .select("id, id_no, site_name")
          .eq("company_id", companyId)
        const existingList: any[] = existingProjects || []

        let projectsInserted = 0
        let projectsUpdated = 0

        for (const proj of projects) {
          const oldId = proj.id

          // Try to match existing project by id_no or site_name
          let existing = null
          if (proj.id_no) {
            existing = existingList.find((p: any) => p.id_no === proj.id_no)
          }
          if (!existing && proj.site_name) {
            existing = existingList.find(
              (p: any) => p.site_name && p.site_name.trim().toLowerCase() === proj.site_name.trim().toLowerCase()
            )
          }

          if (existing) {
            // Map old ID to existing project ID
            projectIdMap[oldId] = existing.id

            // Update existing project with backup data
            const { id: _id, created_at: _ca, ...updatePayload } = proj
            updatePayload.company_id = companyId
            updatePayload.updated_at = new Date().toISOString()
            await supabase.from("projects").update(updatePayload).eq("id", existing.id)
            projectsUpdated++
          } else {
            // Insert new project
            const { id: _oldId, ...insertPayload } = proj
            insertPayload.company_id = companyId
            const { data: newProj } = await supabase
              .from("projects")
              .insert(insertPayload)
              .select("id")
              .single()
            const newId = (newProj as any)?.id
            if (newId) {
              projectIdMap[oldId] = newId
            }
            projectsInserted++
          }
        }

        // -- Step 2: Import child tables with remapped project_ids --
        const childTables = [
          { key: "ledger_entries", table: "ledger_entries" },
          { key: "payment_terms", table: "payment_terms" },
          { key: "expenses", table: "expenses" },
          { key: "calling_records", table: "calling_records" },
          { key: "swh_checklist", table: "swh_checklist" },
          { key: "work_remarks", table: "work_remarks" },
        ]

        let childInserted = 0
        let childSkipped = 0

        for (const { key, table } of childTables) {
          const entries: any[] = parsed[key] || []
          if (entries.length === 0) continue

          for (const entry of entries) {
            const oldProjectId = entry.project_id
            const newProjectId = projectIdMap[oldProjectId]

            if (!newProjectId) {
              childSkipped++
              continue
            }

            // Remove old id and timestamps, let Supabase generate new ones
            const { id: _oldEntryId, ...insertPayload } = entry
            insertPayload.project_id = newProjectId

            const { error: insertErr } = await supabase.from(table).insert(insertPayload)
            if (insertErr) {
              console.warn(`Failed to insert ${table} entry:`, insertErr.message)
              childSkipped++
            } else {
              childInserted++
            }
          }
        }

        // -- Step 3: Import purchases if present in backup --
        const purchasesInBackup: any[] = parsed.purchases || []
        const purchaseIdMap: Record<string, string> = {}
        let purchasesImported = 0

        for (const pur of purchasesInBackup) {
          const oldPurId = pur.id
          const { id: _purId, created_at: _ca, updated_at: _ua, ...insertPayload } = pur
          insertPayload.company_id = activeCompany.id
          try {
            const { data: newPur } = await supabase.from("purchases").insert(insertPayload).select("id").single()
            if (newPur && (newPur as any).id) {
              purchaseIdMap[oldPurId] = (newPur as any).id
              purchasesImported++
            }
          } catch (e) {
            console.warn("Could not insert purchase backup record:", e)
          }
        }

        if (parsed.purchase_ledger_entries) {
          for (const ple of parsed.purchase_ledger_entries) {
            const newPurId = purchaseIdMap[ple.purchase_id]
            if (!newPurId) continue
            const { id: _pleId, ...insertPayload } = ple
            insertPayload.purchase_id = newPurId
            insertPayload.project_id = newPurId
            try {
              await supabase.from("purchase_ledger_entries").insert(insertPayload)
            } catch (e) {
              console.warn("Could not insert purchase ledger entry:", e)
            }
          }
        }

        if (parsed.purchase_calling_records) {
          for (const pcr of parsed.purchase_calling_records) {
            const newPurId = purchaseIdMap[pcr.purchase_id]
            if (!newPurId) continue
            const { id: _pcrId, ...insertPayload } = pcr
            insertPayload.purchase_id = newPurId
            try {
              await supabase.from("purchase_calling_records").insert(insertPayload)
            } catch (e) {
              console.warn("Could not insert purchase calling record:", e)
            }
          }
        }

        toast.dismiss(toastId)
        toast.success(
          `Database restored for ${activeCompany.name}!\n` +
          `Projects: ${projectsInserted} added, ${projectsUpdated} updated.\n` +
          (purchasesImported > 0 ? `Purchases: ${purchasesImported} imported.\n` : "") +
          `Related records: ${childInserted} imported` +
          (childSkipped > 0 ? `, ${childSkipped} skipped.` : ".")
        )

        if (onDatabaseImport) onDatabaseImport()
        window.location.reload()
      } catch (err) {
        console.error("Failed to import database backup:", err)
        toast.error("Error importing JSON database backup file.")
      }
    }
    reader.readAsText(file)
  }

  return (
    <header className="sticky top-0 z-50 bg-card/80 backdrop-blur-xl border-b border-border/50 shadow-sm">
      <div className="flex items-center justify-between px-4 py-4 lg:px-8 max-w-[1600px] mx-auto gap-4">
        <div className="flex items-center gap-3 lg:gap-6 shrink-0">
          <button
            type="button"
            className="lg:hidden p-2 rounded-xl hover:bg-muted transition-colors"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          {/* Company Switcher Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-[3.25rem] px-2 pl-1 font-bold hover:bg-muted/50 rounded-2xl gap-3 active:scale-95 transition-all w-fit flex items-center">
                <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center shrink-0 shadow-sm">
                  <Building2 className="h-5 w-5 text-primary-foreground" />
                </div>
                <div className="flex flex-col items-start gap-0.5 max-w-[160px] sm:max-w-[340px] md:max-w-[420px] min-w-0">
                  <span className="text-base sm:text-lg font-extrabold truncate w-full leading-tight text-foreground">
                    {mounted ? activeCompany.name : "Loading..."}
                  </span>
                  <span className="text-[9px] sm:text-[10px] uppercase tracking-wider text-primary font-bold truncate w-full leading-tight">
                    {mounted && activeCompany.tagline ? activeCompany.tagline : "SOLAR & HEAT PUMP PROJECT MANAGER"}
                  </span>
                </div>
                <ChevronDown className="h-4 w-4 text-muted-foreground opacity-50 shrink-0 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-64 rounded-2xl p-2 shadow-xl border-border/50 bg-card/95 backdrop-blur-xl">
              <DropdownMenuLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-2 py-1.5">Switch Database</DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-border/50" />
              {mounted && companies.map((comp, idx) => (
                <DropdownMenuItem
                  key={comp.id || `menu-comp-${idx}`}
                  onClick={() => handleSelectCompany(comp)}
                  className={`rounded-xl cursor-pointer p-2 mb-1 ${activeCompany.id === comp.id ? 'bg-primary/10 text-primary focus:bg-primary/15' : 'hover:bg-muted focus:bg-muted'}`}
                >
                  <div className="flex flex-col gap-0.5">
                    <span className="font-bold">{comp.name}</span>
                    <span className="text-[10px] opacity-70 leading-none">{comp.tagline || 'Project Manager'}</span>
                  </div>
                </DropdownMenuItem>
              ))}
              {isAdminUser && (
                <>
                  <DropdownMenuSeparator className="bg-border/50" />
                  <DropdownMenuItem
                    onClick={() => setAddCompanyOpen(true)}
                    className="rounded-xl cursor-pointer p-2 text-primary focus:text-primary focus:bg-primary/10"
                  >
                    <PlusCircle className="mr-2 h-4 w-4" />
                    <span className="font-bold text-sm">Add New Company</span>
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Mode Switcher Toggle Button (Sales vs Purchase) */}
          <div className="flex items-center p-1 bg-muted/70 backdrop-blur-md rounded-2xl border border-border/60 shadow-inner">
            <button
              type="button"
              onClick={() => {
                setMode("sales")
                toast.success("Switched to Sales Mode")
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all duration-200 ${
                mode === "sales"
                  ? "bg-primary text-primary-foreground shadow-sm scale-100"
                  : "text-muted-foreground hover:text-foreground hover:bg-background/40"
              }`}
              title="Switch to Sales Records"
            >
              <TrendingUp className="h-3.5 w-3.5" />
              <span>Sales</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("purchase")
                toast.success("Switched to Purchase Mode")
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all duration-200 ${
                mode === "purchase"
                  ? "bg-emerald-600 text-white shadow-sm scale-100 dark:bg-emerald-500"
                  : "text-muted-foreground hover:text-foreground hover:bg-background/40"
              }`}
              title="Switch to Purchase Records"
            >
              <ShoppingBag className="h-3.5 w-3.5" />
              <span>Purchase</span>
            </button>
          </div>
        </div>

        {/* Search bar + Folder Save Location + Clear (X) + Database Export/Import */}
        <div className="hidden lg:flex items-center gap-3 flex-1 max-w-2xl mx-6">
          <div className="relative flex-1 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input
              type="text"
              placeholder={isPurchase ? `Search ${activeCompany.name} (vendor, phone, address, ID)...` : `Search ${activeCompany.name} (name, phone, address, ID)...`}
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-11 pr-10 bg-muted/50 border-border/50 focus:bg-background focus:ring-primary/20 transition-all rounded-2xl h-11 text-sm"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchChange("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                title="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Daily Transaction Entry Button */}
          <Link href="/daily-transactions">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="bg-primary/10 text-primary hover:bg-primary/20 font-bold text-xs h-11 px-4 rounded-2xl border-primary/20 shadow-sm shrink-0 flex items-center gap-2 transition-all hover:scale-105 active:scale-95"
              title="Open Daily Transaction Entry"
            >
              <ReceiptText className="h-4 w-4" />
              <span>Daily Transaction Entry</span>
            </Button>
          </Link>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          <Link href={isPurchase ? "/projects/new?mode=purchase" : "/projects/new"}>
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20 rounded-2xl h-11 px-3 sm:px-6 font-bold">
              <Plus className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">{isPurchase ? "Add Vendor" : "Add Customer"}</span>
            </Button>
          </Link>

          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => setSettingsOpen(true)}
            className="rounded-2xl h-11 w-11 border-border/80 bg-card hover:bg-muted shadow-sm"
            title="App Settings & Company Management"
          >
            <Settings className="h-5 w-5 text-foreground" />
          </Button>
        </div>
      </div>

      {/* Settings Dialog */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="max-w-lg rounded-3xl p-6 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Settings className="h-5 w-5 text-primary" />
              App Settings & Company Management
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-2">
            {/* Backup & Save Location Section */}
            {canEdit && (
              <div className="bg-muted/30 p-4 rounded-2xl border border-border/50 space-y-4">
                <h4 className="font-bold text-sm flex items-center gap-2">
                  <Database className="h-4 w-4 text-primary" />
                  Database Backup & Storage
                </h4>

                {/* PC Save Location */}
                <div className="flex items-center justify-between gap-3 pt-2 border-t border-border/40">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-foreground">PC Save Folder Location</p>
                    <p className="text-[11px] text-muted-foreground truncate" title={saveFolder || "Not configured"}>
                      {saveFolder || "Default: D:\\Solar Reports"}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleSetSaveFolder}
                    className="rounded-xl font-bold text-xs h-9 px-3 shrink-0"
                  >
                    <FolderOpen className="h-3.5 w-3.5 mr-1.5 text-amber-500" />
                    Set Location
                  </Button>
                </div>

                {/* Backup Download */}
                <div className="flex items-center justify-between gap-3 pt-2 border-t border-border/40">
                  <div>
                    <p className="text-xs font-semibold text-foreground">Download Backup (.json)</p>
                    <p className="text-[11px] text-muted-foreground">Full JSON data for {activeCompany.name}</p>
                  </div>
                  <Button
                    type="button"
                    onClick={handleExportDatabase}
                    className="rounded-xl font-bold bg-primary text-primary-foreground text-xs h-9 px-3 shrink-0"
                  >
                    <Download className="h-3.5 w-3.5 mr-1.5" />
                    Backup
                  </Button>
                </div>

                {/* Restore Database */}
                <div className="flex items-center justify-between gap-3 pt-2 border-t border-border/40">
                  <div>
                    <p className="text-xs font-semibold text-foreground">Restore Database (.json)</p>
                    <p className="text-[11px] text-muted-foreground">Upload previously exported backup</p>
                  </div>
                  <div>
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept=".json"
                      onChange={handleImportDatabase}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      className="rounded-xl font-bold text-xs h-9 px-3 shrink-0"
                    >
                      <UploadCloud className="h-3.5 w-3.5 mr-1.5 text-primary" />
                      Restore
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Authentication Settings */}
            <div className="bg-muted/30 p-4 rounded-2xl border border-border/50 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-sm">Account Settings</h4>
                  <p className="text-xs text-muted-foreground">Manage your credentials {isAdminUser && "or system users"}</p>
                </div>
                <div className="flex gap-2">
                  {isAdminUser && (
                    <Button
                      type="button"
                      onClick={() => setManageUsersOpen(true)}
                      variant="outline"
                      className="rounded-xl font-bold text-xs h-9 px-3 border-primary/20 text-primary hover:bg-primary/5"
                    >
                      Users
                    </Button>
                  )}
                  <Button
                    type="button"
                    onClick={() => setChangeCredsOpen(true)}
                    variant="outline"
                    className="rounded-xl font-bold text-xs h-9 px-3"
                  >
                    Change
                  </Button>
                </div>
              </div>
              <div className="pt-2 border-t border-border/50">
                <Button
                  type="button"
                  onClick={handleLogout}
                  variant="ghost"
                  className="w-full text-destructive hover:bg-destructive/10 rounded-xl font-bold text-xs h-9"
                >
                  Logout
                </Button>
              </div>
            </div>

            {/* PDF Export Settings */}
            <div className="bg-muted/30 p-4 rounded-2xl border border-border/50 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-sm">PDF Export Columns</h4>
                  <p className="text-xs text-muted-foreground">Choose columns for Directory PDF</p>
                </div>
                <Button
                  type="button"
                  onClick={() => setPdfColumnsOpen(true)}
                  variant="outline"
                  className="rounded-xl font-bold text-xs h-9 px-3"
                >
                  Configure
                </Button>
              </div>
            </div>

            {/* Manage Created Companies */}
            <div className="space-y-3">
              <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Building2 className="h-4 w-4 text-primary" />
                Manage Created Companies
              </h4>
              <div className="space-y-2 max-h-60 overflow-y-auto border rounded-2xl p-3 bg-muted/20">
                {mounted && companies.map((comp, idx) => {
                  const isActive = comp.id === activeCompany.id
                  const canDelete = companies.length > 1

                  return (
                    <div
                      key={`settings-comp-${comp.id || idx}`}
                      className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${
                        isActive ? "bg-primary/5 border-primary/20" : "bg-card border-border/80"
                      } shadow-sm`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm">{comp.name}</span>
                          {isActive && (
                            <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px] font-bold">
                              Active
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">{comp.tagline || "Project Manager"}</p>
                      </div>

                      {canDelete && isAdminUser && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={async () => {
                            if (confirm(`Are you sure you want to delete company database "${comp.name}"? This action cannot be undone.`)) {
                              await deleteCompany(comp.id)
                              const updated = getCompanies()
                              setCompaniesList(updated)
                              const newActive = getActiveCompany()
                              setActiveComp(newActive)
                              toast.success(`Deleted company "${comp.name}"`)
                              window.location.reload()
                            }
                          }}
                          className="text-destructive hover:bg-destructive/10 rounded-xl h-8 text-xs font-bold px-2.5"
                          title="Delete Company Database"
                        >
                          <Trash2 className="h-3.5 w-3.5 mr-1" />
                          Delete
                        </Button>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t">
              <Button type="button" variant="outline" onClick={() => setSettingsOpen(false)} className="rounded-xl font-bold">
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <ChangeCredentialsDialog open={changeCredsOpen} onOpenChange={setChangeCredsOpen} />
      <ManageUsersDialog open={manageUsersOpen} onOpenChange={setManageUsersOpen} />
      <PdfColumnsDialog open={pdfColumnsOpen} onOpenChange={setPdfColumnsOpen} />

      {/* Add Company Dialog */}
      <Dialog open={addCompanyOpen} onOpenChange={setAddCompanyOpen}>
        <DialogContent className="max-w-md rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              Create New Company Database
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddCompanySubmit} className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Company Name</label>
              <Input
                placeholder="e.g., Insiya Trading Corporation"
                value={newCompanyName}
                onChange={(e) => setNewCompanyName(e.target.value)}
                className="rounded-xl h-12"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Tagline / Subtitle</label>
              <Input
                placeholder="e.g., Trading & Electrical Supplies"
                value={newCompanyTagline}
                onChange={(e) => setNewCompanyTagline(e.target.value)}
                className="rounded-xl h-12"
              />
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="ghost" onClick={() => setAddCompanyOpen(false)} className="rounded-xl font-bold">
                Cancel
              </Button>
              <Button type="submit" className="rounded-xl font-bold bg-primary text-primary-foreground">
                Create & Switch Company
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Mobile search bar */}
      <div className="lg:hidden px-4 pb-4 space-y-2">
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder={`Search ${activeCompany.name}...`}
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-11 pr-10 bg-muted/50 border-border/50 rounded-2xl h-11"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full text-muted-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <div className="flex gap-2">
          <Link href="/daily-transactions" className="flex-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full bg-primary/10 text-primary hover:bg-primary/20 font-bold text-xs h-10 rounded-xl border-primary/20 shadow-sm flex items-center justify-center gap-2"
            >
              <ReceiptText className="h-4 w-4" />
              <span>Daily Transaction Entry</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Mobile menu overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.nav
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="lg:hidden border-t border-border/50 bg-card/95 backdrop-blur-md overflow-hidden shadow-xl"
          >
            <div className="px-4 py-6 space-y-3">
              {/* Mobile Mode Switcher */}
              <div className="flex items-center justify-between p-1.5 bg-muted/70 rounded-2xl border border-border/60 mb-2">
                <button
                  type="button"
                  onClick={() => {
                    setMode("sales")
                    toast.success("Switched to Sales Mode")
                  }}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all ${
                    mode === "sales" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground"
                  }`}
                >
                  <TrendingUp className="h-4 w-4" />
                  <span>Sales</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode("purchase")
                    toast.success("Switched to Purchase Mode")
                  }}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all ${
                    mode === "purchase" ? "bg-emerald-600 text-white shadow-sm dark:bg-emerald-500" : "text-muted-foreground"
                  }`}
                >
                  <ShoppingBag className="h-4 w-4" />
                  <span>Purchase</span>
                </button>
              </div>

              <Link
                href="/"
                className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-primary/10 text-primary font-bold transition-all"
                onClick={() => setMobileMenuOpen(false)}
              >
                <LayoutDashboard className="h-5 w-5" />
                Dashboard Overview ({activeCompany.name})
              </Link>
              <Link
                href="/daily-transactions"
                className="flex items-center gap-3 px-4 py-3 rounded-2xl hover:bg-muted text-foreground font-semibold transition-all"
                onClick={() => setMobileMenuOpen(false)}
              >
                <ReceiptText className="h-5 w-5 text-primary" />
                Daily Transaction Entry
              </Link>
              <Link
                href={isPurchase ? "/projects/new?mode=purchase" : "/projects/new"}
                className="flex items-center gap-3 px-4 py-3 rounded-2xl hover:bg-muted text-foreground font-semibold transition-all"
                onClick={() => setMobileMenuOpen(false)}
              >
                <Plus className="h-5 w-5" />
                {isPurchase ? "Add New Vendor" : "Add New Customer"}
              </Link>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  )
}
