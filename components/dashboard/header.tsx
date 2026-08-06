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
  type Company,
} from "@/lib/company-store"
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

  const [settingsOpen, setSettingsOpen] = useState(false)
  const [addCompanyOpen, setAddCompanyOpen] = useState(false)
  const [newCompanyName, setNewCompanyName] = useState("")
  const [newCompanyTagline, setNewCompanyTagline] = useState("")

  const fileInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("custom_save_location")
      if (stored) setSaveFolder(stored)

      setCompaniesList(getCompanies())
      setActiveComp(getActiveCompany())
    }
  }, [])

  const handleSelectCompany = (comp: Company) => {
    setActiveCompanyId(comp.id)
    setActiveComp(comp)
    toast.success(`Switched active database to: ${comp.name}`)
    if (onDatabaseImport) onDatabaseImport()
    window.location.reload()
  }

  const handleAddCompanySubmit = (e: React.FormEvent) => {
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
    saveCompanies(updated)
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

      const data = {
        projects: projectsList,
        payment_terms: paymentTerms,
        ledger_entries: ledgerEntries,
        expenses: expenses,
        calling_records: callingRecords,
        swh_checklist: swhChecklist,
        work_remarks: workRemarks,
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
        `${projectsList.length} projects, ${ledgerEntries.length} ledger entries, ` +
        `${paymentTerms.length} payment terms, ${expenses.length} expenses, ` +
        `${callingRecords.length} calling records, ${swhChecklist.length} checklist items, ` +
        `${workRemarks.length} work remarks.`
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

        toast.dismiss(toastId)
        toast.success(
          `Database restored for ${activeCompany.name}!\n` +
          `Projects: ${projectsInserted} added, ${projectsUpdated} updated.\n` +
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
        <div className="flex items-center gap-4 lg:gap-8">
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
              <button className="flex items-center gap-3 text-left group focus:outline-none p-1.5 rounded-2xl hover:bg-muted/50 transition-colors">
                <div className="h-10 w-10 bg-primary rounded-full shadow-lg shadow-primary/25 flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
                  <Building2 className="h-5 w-5 text-white" />
                </div>
                <div className="hidden sm:block">
                  <div className="flex items-center gap-1.5">
                    <h1 className="text-lg font-extrabold text-foreground tracking-tight leading-none">
                      {activeCompany.name}
                    </h1>
                    <ChevronDown className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                  <p className="text-[10px] text-primary font-bold uppercase tracking-widest mt-1">
                    {activeCompany.tagline || "Project Manager"}
                  </p>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-72 rounded-2xl p-2 shadow-2xl border-border/50">
              <DropdownMenuLabel className="text-xs uppercase tracking-wider text-muted-foreground px-3 py-2 font-bold">
                Select Company Database
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {companies.map((comp, idx) => {
                const isSelected = comp.id === activeCompany.id
                return (
                  <DropdownMenuItem
                    key={comp.id ? `company-${comp.id}` : `comp-${idx}`}
                    onClick={() => handleSelectCompany(comp)}
                    className={`rounded-xl px-3 py-2.5 cursor-pointer flex items-center justify-between font-semibold text-sm ${
                      isSelected ? "bg-primary/10 text-primary font-bold" : "hover:bg-muted"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Building2 className={`h-4 w-4 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                      <span>{comp.name}</span>
                    </div>
                    {isSelected && <span className="text-[10px] bg-primary text-primary-foreground px-2 py-0.5 rounded-full font-bold">Active</span>}
                  </DropdownMenuItem>
                )
              })}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setAddCompanyOpen(true)}
                className="rounded-xl px-3 py-2.5 cursor-pointer text-primary hover:bg-primary/10 font-bold text-sm flex items-center gap-2"
              >
                <PlusCircle className="h-4 w-4" />
                <span>Add New Company</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Search bar + Folder Save Location + Clear (X) + Database Export/Import */}
        <div className="hidden lg:flex items-center gap-3 flex-1 max-w-2xl mx-6">
          <div className="relative flex-1 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input
              type="text"
              placeholder={`Search ${activeCompany.name} (name, phone, address, ID)...`}
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

          {/* Set PC Save Location Folder Button */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleSetSaveFolder}
            className="bg-card text-foreground hover:bg-primary/10 hover:text-primary font-bold text-xs h-11 px-3 rounded-2xl border-border/80 shadow-sm shrink-0 flex items-center gap-1.5"
            title={saveFolder ? `Current PC Save Folder: ${saveFolder}` : "Set PC Save Folder location for all exported files"}
          >
            <FolderOpen className="h-4 w-4 text-amber-500" />
            <span className="hidden xl:inline text-xs truncate max-w-[110px]">
              {saveFolder ? saveFolder.split("\\").pop() || "Save Path" : "Save Location"}
            </span>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleExportDatabase}
            className="bg-card text-foreground hover:bg-primary/10 hover:text-primary font-bold text-xs h-11 px-4 rounded-2xl border-border/80 shadow-sm shrink-0"
            title={`Download ${activeCompany.name} database backup (.json)`}
          >
            <Download className="h-4 w-4 mr-1.5 text-primary" />
            Backup Database (.json)
          </Button>

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
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            className="bg-card text-foreground hover:bg-primary/10 hover:text-primary font-bold text-xs h-11 px-3 rounded-2xl border-border/80 shadow-sm shrink-0"
            title={`Restore ${activeCompany.name} database from .json backup file`}
          >
            <UploadCloud className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/projects/new">
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20 rounded-2xl h-11 px-6 font-bold">
              <Plus className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Add Customer</span>
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
        <DialogContent className="max-w-lg rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Settings className="h-5 w-5 text-primary" />
              App Settings & Company Management
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-2">
            {/* Backup Section */}
            <div className="bg-muted/30 p-4 rounded-2xl border border-border/50 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-sm">Download Database Backup</h4>
                  <p className="text-xs text-muted-foreground">Export full JSON backup for {activeCompany.name}</p>
                </div>
                <Button
                  type="button"
                  onClick={handleExportDatabase}
                  className="rounded-xl font-bold bg-primary text-primary-foreground text-xs h-9 px-3"
                >
                  <Download className="h-3.5 w-3.5 mr-1.5" />
                  Backup (.json)
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
                {companies.map((comp) => {
                  const isActive = comp.id === activeCompany.id
                  const canDelete = companies.length > 1

                  return (
                    <div
                      key={`settings-comp-${comp.id}`}
                      className="flex items-center justify-between p-3 rounded-xl bg-card border border-border/80 shadow-sm"
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

                      {canDelete && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (confirm(`Are you sure you want to delete company database "${comp.name}"? This action cannot be undone.`)) {
                              deleteCompany(comp.id)
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

      {/* Dialog for Adding New Company */}
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
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleSetSaveFolder}
            className="text-xs font-bold px-3"
            title="Set PC Save Location Folder"
          >
            <FolderOpen className="h-3.5 w-3.5 mr-1 text-amber-500" />
            Save Path
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleExportDatabase}
            className="flex-1 text-xs font-bold"
          >
            <Download className="h-3.5 w-3.5 mr-1" />
            Backup (.json)
          </Button>
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
            <div className="px-4 py-6 space-y-4">
              <Link
                href="/"
                className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-primary/10 text-primary font-bold transition-all"
                onClick={() => setMobileMenuOpen(false)}
              >
                <LayoutDashboard className="h-5 w-5" />
                Dashboard Overview ({activeCompany.name})
              </Link>
              <Link
                href="/projects/new"
                className="flex items-center gap-3 px-4 py-3 rounded-2xl hover:bg-muted text-foreground font-semibold transition-all"
                onClick={() => setMobileMenuOpen(false)}
              >
                <Plus className="h-5 w-5" />
                Add New Customer
              </Link>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  )
}
