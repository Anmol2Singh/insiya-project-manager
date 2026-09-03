"use client"

import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { getActiveCompany } from "@/lib/company-store"
import { hasEditPermission } from "@/lib/auth-store"
import {
  getDropdownCategories,
  saveDropdownCategories,
  getDropdownSalesmen,
  saveDropdownSalesmen,
  DEFAULT_ORDER_TYPES,
  DEFAULT_SALESMAN_OPTIONS,
  DEFAULT_FIRM_OPTIONS,
  getDropdownFirms,
  saveDropdownFirms,
} from "@/lib/dropdown-store"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import type { Project } from "@/lib/types"
import { toast } from "sonner"
import { LayoutGrid, Save, Plus, Trash2, Settings2, ChevronUp, ChevronDown, Edit2, Check, X } from "lucide-react"


interface ProjectFormProps {
  project?: Project
  mode: "create" | "edit"
}

export function ProjectForm({ project, mode }: ProjectFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Permissions
  const [canEdit, setCanEdit] = useState(false)
  useEffect(() => {
    setCanEdit(hasEditPermission())
  }, [])

  // Categories management state
  const [categories, setCategories] = useState<string[]>(DEFAULT_ORDER_TYPES)
  const [newCategoryName, setNewCategoryName] = useState("")
  const [manageDialogOpen, setManageDialogOpen] = useState(false)

  // Salesman management state
  const [salesmanOptions, setSalesmanOptions] = useState<string[]>(DEFAULT_SALESMAN_OPTIONS)
  const [manageSalesmanOpen, setManageSalesmanOpen] = useState(false)
  const [newSalesmanName, setNewSalesmanName] = useState("")
  const [editingSalesmanIdx, setEditingSalesmanIdx] = useState<number | null>(null)
  const [editingSalesmanText, setEditingSalesmanText] = useState("")

  // Firm management state
  const [firmOptions, setFirmOptions] = useState<string[]>(DEFAULT_FIRM_OPTIONS)
  const [manageFirmOpen, setManageFirmOpen] = useState(false)
  const [newFirmName, setNewFirmName] = useState("")
  const [editingFirmIdx, setEditingFirmIdx] = useState<number | null>(null)
  const [editingFirmText, setEditingFirmText] = useState("")

  useEffect(() => {
    async function loadDropdowns() {
      try {
        const cats = await getDropdownCategories()
        setCategories(cats)
        
        const salesmen = await getDropdownSalesmen()
        setSalesmanOptions(salesmen)
        
        const firms = await getDropdownFirms()
        setFirmOptions(firms)
      } catch (e) {
        console.error("Error loading dropdown options from DB:", e)
      }
    }
    loadDropdowns()
  }, [])

  const saveCategories = async (updated: string[]) => {
    setCategories(updated)
    await saveDropdownCategories(updated)
  }

  const handleAddCategory = async () => {
    const trimmed = newCategoryName.trim()
    if (!trimmed) return
    if (categories.includes(trimmed)) {
      toast.error("Category already exists")
      return
    }
    const updated = [...categories, trimmed]
    await saveCategories(updated)
    setNewCategoryName("")
    toast.success(`Category "${trimmed}" added!`)
  }

  const handleRemoveCategory = async (catToRemove: string) => {
    if (categories.length <= 1) {
      toast.error("Cannot remove all categories")
      return
    }
    const updated = categories.filter((c) => c !== catToRemove)
    await saveCategories(updated)
    if (formData.order_type === catToRemove) {
      setFormData((prev) => ({ ...prev, order_type: updated[0] || "" }))
    }
    toast.success(`Category "${catToRemove}" removed`)
  }

  // Salesman Management Handlers
  const saveSalesmanOptions = async (updated: string[]) => {
    setSalesmanOptions(updated)
    await saveDropdownSalesmen(updated)
  }

  const handleAddSalesman = async () => {
    const trimmed = newSalesmanName.trim()
    if (!trimmed) return
    if (salesmanOptions.includes(trimmed)) {
      toast.error("Salesman already exists in list")
      return
    }
    const updated = [...salesmanOptions, trimmed]
    await saveSalesmanOptions(updated)
    setNewSalesmanName("")
    toast.success(`Salesman "${trimmed}" added!`)
  }

  const handleRemoveSalesman = async (nameToRemove: string) => {
    if (salesmanOptions.length <= 1) {
      toast.error("Cannot remove all salesmen from list")
      return
    }
    const updated = salesmanOptions.filter((s) => s !== nameToRemove)
    await saveSalesmanOptions(updated)
    if (formData.salesman_name === nameToRemove) {
      setFormData((prev) => ({ ...prev, salesman_name: updated[0] || "" }))
    }
    toast.success(`Salesman "${nameToRemove}" removed`)
  }

  const handleStartEditSalesman = (idx: number, currentText: string) => {
    setEditingSalesmanIdx(idx)
    setEditingSalesmanText(currentText)
  }

  const handleSaveEditSalesman = async (idx: number) => {
    const trimmed = editingSalesmanText.trim()
    if (!trimmed) return
    const updated = [...salesmanOptions]
    const oldName = updated[idx]
    updated[idx] = trimmed
    await saveSalesmanOptions(updated)
    if (formData.salesman_name === oldName) {
      setFormData((prev) => ({ ...prev, salesman_name: trimmed }))
    }
    setEditingSalesmanIdx(null)
    setEditingSalesmanText("")
    toast.success("Salesman name updated")
  }

  const handleMoveUpSalesman = async (idx: number) => {
    if (idx === 0) return
    const updated = [...salesmanOptions]
    const temp = updated[idx - 1]
    updated[idx - 1] = updated[idx]
    updated[idx] = temp
    await saveSalesmanOptions(updated)
  }

  const handleMoveDownSalesman = async (idx: number) => {
    if (idx === salesmanOptions.length - 1) return
    const updated = [...salesmanOptions]
    const temp = updated[idx + 1]
    updated[idx + 1] = updated[idx]
    updated[idx] = temp
    await saveSalesmanOptions(updated)
  }

  // Firm Management Handlers
  const saveFirmOptions = async (updated: string[]) => {
    setFirmOptions(updated)
    await saveDropdownFirms(updated)
  }

  const handleAddFirm = async () => {
    const trimmed = newFirmName.trim()
    if (!trimmed) return
    if (firmOptions.includes(trimmed)) {
      toast.error("Firm already exists in list")
      return
    }
    const updated = [...firmOptions, trimmed]
    await saveFirmOptions(updated)
    setNewFirmName("")
    toast.success(`Firm "${trimmed}" added!`)
  }

  const handleRemoveFirm = async (nameToRemove: string) => {
    if (firmOptions.length <= 1) {
      toast.error("Cannot remove all firms from list")
      return
    }
    const updated = firmOptions.filter((s) => s !== nameToRemove)
    await saveFirmOptions(updated)
    if (formData.firm_name === nameToRemove) {
      setFormData((prev) => ({ ...prev, firm_name: updated[0] || "" }))
    }
    toast.success(`Firm "${nameToRemove}" removed`)
  }

  const handleStartEditFirm = (idx: number, currentText: string) => {
    setEditingFirmIdx(idx)
    setEditingFirmText(currentText)
  }

  const handleSaveEditFirm = async (idx: number) => {
    const trimmed = editingFirmText.trim()
    if (!trimmed) return
    const updated = [...firmOptions]
    const oldName = updated[idx]
    updated[idx] = trimmed
    await saveFirmOptions(updated)
    if (formData.firm_name === oldName) {
      setFormData((prev) => ({ ...prev, firm_name: trimmed }))
    }
    setEditingFirmIdx(null)
    setEditingFirmText("")
    toast.success("Firm name updated")
  }

  const handleMoveUpFirm = async (idx: number) => {
    if (idx === 0) return
    const updated = [...firmOptions]
    const temp = updated[idx - 1]
    updated[idx - 1] = updated[idx]
    updated[idx] = temp
    await saveFirmOptions(updated)
  }

  const handleMoveDownFirm = async (idx: number) => {
    if (idx === firmOptions.length - 1) return
    const updated = [...firmOptions]
    const temp = updated[idx + 1]
    updated[idx + 1] = updated[idx]
    updated[idx] = temp
    await saveFirmOptions(updated)
  }

  const [formData, setFormData] = useState({
    id_no: project?.id_no?.toString() || "",
    order_type: project?.order_type || "",
    salesman_name: project?.salesman_name || "",
    firm_name: project?.firm_name || "",
    site_name: project?.site_name || "",
    party_print_name: project?.party_print_name || "",
    mobile_number: project?.mobile_number || "",
    address: project?.address || "",
    hp_type: project?.hp_type || "",
    hp_qty: project?.hp_qty?.toString() || "",
    tank_type: project?.tank_type || "",
    tank_qty: project?.tank_qty?.toString() || "",
    order_value: project?.order_value?.toString() || "0",
    work_remark: project?.work_remark || "",
    created_at: project?.created_at ? new Date(project.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canEdit) return
    setLoading(true)
    setError(null)

    // Auto-copy site_name to party_print_name if party_print_name is blank
    const finalPartyPrintName = formData.party_print_name.trim() === "" && formData.site_name.trim() !== "" 
      ? formData.site_name.trim() 
      : formData.party_print_name;

    try {
      const supabase = createClient()

      const activeCompany = getActiveCompany()
      const projectData = {
        id_no: parseInt(formData.id_no) || 0,
        order_type: formData.order_type,
        salesman_name: formData.salesman_name || null,
        firm_name: formData.firm_name || null,
        site_name: formData.site_name,
        party_print_name: finalPartyPrintName || null,
        mobile_number: formData.mobile_number || null,
        address: formData.address,
        hp_type: formData.hp_type || null,
        hp_qty: formData.hp_qty ? parseInt(formData.hp_qty) : null,
        tank_type: formData.tank_type || null,
        tank_qty: formData.tank_qty ? parseInt(formData.tank_qty) : null,
        order_value: parseFloat(formData.order_value) || 0,
        work_remark: formData.work_remark || null,
        company_id: activeCompany.id,
        created_at: new Date(formData.created_at).toISOString(),
      }

      if (mode === "create") {
        const { data, error: insertError } = await supabase
          .from("projects")
          .insert(projectData)
          .select()
          .single()

        if (insertError) throw insertError
        toast.success("Project created successfully")
        router.push(`/projects/${data.id}`)
      } else if (project) {
        const { error: updateError } = await supabase
          .from("projects")
          .update({
            ...projectData,
            updated_at: new Date().toISOString(),
          })
          .eq("id", project.id)

        if (updateError) throw updateError
        toast.success("Project updated successfully")
        router.push(`/projects/${project.id}`)
      }
    } catch (err: any) {
      console.error("Error saving project:", err)
      setError(err.message || "Failed to save project. Please try again.")
      toast.error("Failed to save project")
    } finally {
      setLoading(false)
    }
  }

  const displaySalesmanOptions = formData.salesman_name && !salesmanOptions.includes(formData.salesman_name)
    ? [formData.salesman_name, ...salesmanOptions]
    : salesmanOptions

  return (
    <Card className="border-0 shadow-2xl bg-card/60 backdrop-blur-xl rounded-3xl overflow-hidden mb-12">
      {!canEdit && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 p-3 text-center text-amber-600 dark:text-amber-400 font-semibold text-sm">
          You are in View-Only mode. You do not have permission to make changes.
        </div>
      )}
      <CardHeader className="bg-primary/5 pb-8 border-b">
        <CardTitle className="text-xl font-bold flex items-center gap-2">
          <div className="p-1.5 bg-primary/10 rounded-lg">
            <LayoutGrid className="h-5 w-5 text-primary" />
          </div>
          {mode === "create" ? "Project Specifications" : "Rename/Update Project"}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-8">
        <form onSubmit={handleSubmit} className="space-y-10">
          {error && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-2xl p-4 text-destructive text-sm font-medium flex items-center gap-2">
              <div className="h-5 w-5 rounded-full bg-destructive flex items-center justify-center text-white text-[10px] font-extrabold font-bold">!</div>
              {error}
            </div>
          )}

          {/* Basic Info */}
          <section className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center font-bold text-xs text-muted-foreground border border-border/50">1</div>
              <h3 className="font-bold text-foreground uppercase text-xs tracking-widest">Site Information</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label htmlFor="id_no" className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Project ID</Label>
                <Input
                  id="id_no"
                  type="number"
                  value={formData.id_no}
                  onChange={(e) => setFormData({ ...formData, id_no: e.target.value })}
                  placeholder="Enter Project ID"
                  className="rounded-xl h-12 bg-muted/30 border-border/50 focus:bg-background transition-all"
                  required
                  disabled={!canEdit}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="created_at" className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Creation Date</Label>
                <Input
                  id="created_at"
                  type="date"
                  value={formData.created_at}
                  onChange={(e) => setFormData({ ...formData, created_at: e.target.value })}
                  className="rounded-xl h-12 bg-muted/30 border-border/50 focus:bg-background transition-all"
                  required
                  disabled={!canEdit}
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor="order_type" className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Item Group</Label>
                  
                  {/* Category Manager Dialog Button */}
                  {canEdit && (
                    <Dialog open={manageDialogOpen} onOpenChange={setManageDialogOpen}>
                      <DialogTrigger asChild>
                        <button
                          type="button"
                          className="text-xs text-primary hover:underline font-semibold flex items-center gap-1"
                        >
                          <Settings2 className="h-3 w-3" /> Add/Remove
                        </button>
                      </DialogTrigger>
                      <DialogContent className="max-w-md">
                        <DialogHeader>
                          <DialogTitle className="text-lg font-bold">Manage Item Groups</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-2">
                          <div className="flex gap-2">
                            <Input
                              placeholder="New Category Name..."
                              value={newCategoryName}
                              onChange={(e) => setNewCategoryName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault()
                                  handleAddCategory()
                                }
                              }}
                              className="rounded-xl"
                            />
                            <Button type="button" onClick={handleAddCategory} className="rounded-xl font-bold">
                              <Plus className="h-4 w-4 mr-1" /> Add
                            </Button>
                          </div>
                          <div className="space-y-2 max-h-60 overflow-y-auto border rounded-2xl p-3 bg-muted/30">
                            {categories.filter(Boolean).map((cat, idx) => (
                              <div key={`manage-cat-${idx}-${cat}`} className="flex justify-between items-center bg-card p-2.5 rounded-xl border border-border">
                                <span className="text-sm font-semibold">{cat}</span>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleRemoveCategory(cat)}
                                  className="text-destructive hover:bg-destructive/10 h-8 w-8 p-0 rounded-lg"
                                  title="Remove Category"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>

                <Select
                  value={formData.order_type}
                  onValueChange={(value) => setFormData({ ...formData, order_type: value })}
                  disabled={!canEdit}
                >
                  <SelectTrigger className="rounded-xl h-12 bg-muted/30 border-border/50 focus:bg-background transition-all">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-border/50 shadow-xl">
                    {categories.filter(Boolean).map((type, idx) => (
                      <SelectItem key={`order-type-${idx}-${type}`} value={type} className="rounded-lg">{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Salesman Name Field */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor="salesman_name" className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">
                    Sales Man Name
                  </Label>
                  {canEdit && (
                    <button
                      type="button"
                      onClick={() => {
                        setManageSalesmanOpen(true)
                        setEditingSalesmanIdx(null)
                        setNewSalesmanName("")
                      }}
                      className="text-xs text-primary hover:underline font-semibold flex items-center gap-1"
                    >
                      <Settings2 className="h-3 w-3" /> Edit Dropdown List
                    </button>
                  )}
                </div>

                <Select
                  value={formData.salesman_name}
                  onValueChange={(value) => setFormData({ ...formData, salesman_name: value })}
                  disabled={!canEdit}
                >
                  <SelectTrigger className="rounded-xl h-12 bg-muted/30 border-border/50 focus:bg-background transition-all">
                    <SelectValue placeholder="Select Sales Man" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-border/50 shadow-xl">
                    {displaySalesmanOptions.filter(Boolean).map((name, idx) => (
                      <SelectItem key={`salesman-${idx}-${name}`} value={name} className="rounded-lg">
                        {name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Firm Name Field */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor="firm_name" className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">
                    Firm Name
                  </Label>
                  {canEdit && (
                    <button
                      type="button"
                      onClick={() => {
                        setManageFirmOpen(true)
                        setEditingFirmIdx(null)
                        setNewFirmName("")
                      }}
                      className="text-xs text-primary hover:underline font-semibold flex items-center gap-1"
                    >
                      <Settings2 className="h-3 w-3" /> Edit Dropdown List
                    </button>
                  )}
                </div>

                <Select
                  value={formData.firm_name}
                  onValueChange={(value) => setFormData({ ...formData, firm_name: value })}
                  disabled={!canEdit}
                >
                  <SelectTrigger className="rounded-xl h-12 bg-muted/30 border-border/50 focus:bg-background transition-all">
                    <SelectValue placeholder="Select Firm" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-border/50 shadow-xl">
                    {firmOptions.filter(Boolean).map((name, idx) => (
                      <SelectItem key={`firm-${idx}-${name}`} value={name} className="rounded-lg">
                        {name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="site_name" className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Official Site Name / Customer</Label>
                <Input
                  id="site_name"
                  value={formData.site_name}
                  onChange={(e) => setFormData({ ...formData, site_name: e.target.value })}
                  placeholder="Enter Official Site Name"
                  className="rounded-xl h-12 bg-muted/30 border-border/50 focus:bg-background transition-all"
                  required
                  disabled={!canEdit}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="party_print_name" className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Party Print Name</Label>
                <Input
                  id="party_print_name"
                  value={formData.party_print_name}
                  onChange={(e) => setFormData({ ...formData, party_print_name: e.target.value })}
                  placeholder="Enter Party Print Name"
                  className="rounded-xl h-12 bg-muted/30 border-border/50 focus:bg-background transition-all"
                  disabled={!canEdit}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="mobile_number" className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Mobile Number</Label>
                <Input
                  id="mobile_number"
                  value={formData.mobile_number}
                  onChange={(e) => setFormData({ ...formData, mobile_number: e.target.value })}
                  placeholder="Enter Mobile Number"
                  className="rounded-xl h-12 bg-muted/30 border-border/50 focus:bg-background transition-all"
                  disabled={!canEdit}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address" className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Installation Address</Label>
              <Textarea
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Enter Installation Address"
                className="rounded-xl bg-muted/30 border-border/50 focus:bg-background transition-all min-h-[100px] resize-none"
                required
                disabled={!canEdit}
              />
            </div>
          </section>

          {/* Equipment Details */}
          <section className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center font-bold text-xs text-muted-foreground border border-border/50">2</div>
              <h3 className="font-bold text-foreground uppercase text-xs tracking-widest">Technical Specifications</h3>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 p-6 bg-muted/20 rounded-3xl border border-dashed border-border/50">
              <div className="space-y-2">
                <Label htmlFor="hp_type" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1">Item Name</Label>
                <Input
                  id="hp_type"
                  value={formData.hp_type}
                  onChange={(e) => setFormData({ ...formData, hp_type: e.target.value })}
                  placeholder="Enter Item Name"
                  className="rounded-xl bg-background border-border/30 h-11"
                  disabled={!canEdit}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="hp_qty" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1">Item Qty</Label>
                <Input
                  id="hp_qty"
                  type="number"
                  value={formData.hp_qty}
                  onChange={(e) => setFormData({ ...formData, hp_qty: e.target.value })}
                  placeholder="Enter Item Qty"
                  className="rounded-xl bg-background border-border/30 h-11"
                  disabled={!canEdit}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tank_type" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1">Tank Type</Label>
                <Input
                  id="tank_type"
                  type="text"
                  placeholder="Enter tank type"
                  value={formData.tank_type}
                  onChange={(e) => setFormData({ ...formData, tank_type: e.target.value })}
                  className="rounded-xl bg-background border-border/30 h-11"
                  disabled={!canEdit}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tank_qty" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1">Tank Qty</Label>
                <Input
                  id="tank_qty"
                  type="number"
                  value={formData.tank_qty}
                  onChange={(e) => setFormData({ ...formData, tank_qty: e.target.value })}
                  placeholder="Enter Tank Qty"
                  className="rounded-xl bg-background border-border/30 h-11"
                  disabled={!canEdit}
                />
              </div>
            </div>
          </section>

          {/* Work Remark */}
          <section className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center font-bold text-xs text-muted-foreground border border-border/50">3</div>
              <h3 className="font-bold text-foreground uppercase text-xs tracking-widest">Operational Remarks</h3>
            </div>

            <div className="space-y-2">
              <Label htmlFor="work_remark" className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Project Notes / Terms</Label>
              <Textarea
                id="work_remark"
                value={formData.work_remark}
                onChange={(e) => setFormData({ ...formData, work_remark: e.target.value })}
                placeholder="Enter Project Notes / Terms"
                className="rounded-xl bg-muted/30 border-border/50 focus:bg-background transition-all min-h-[100px] resize-none"
                disabled={!canEdit}
              />
            </div>
          </section>

          {/* Actions */}
          <div className="flex justify-end gap-4 pt-10 border-t items-center">
            <Button
              type="button"
              variant="ghost"
              onClick={() => router.back()}
              disabled={loading}
              className="rounded-2xl h-12 px-8 font-bold text-muted-foreground hover:bg-muted/50"
            >
              Discard Changes
            </Button>
            <Button
              type="submit"
              disabled={loading || !formData.site_name || !formData.order_type || !canEdit}
              className="bg-primary text-primary-foreground shadow-xl shadow-primary/20 rounded-2xl h-14 px-12 font-bold hover:scale-105 active:scale-95 transition-all"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Finalizing...
                </div>
              ) : (
                <div className="flex items-center gap-2 text-lg">
                  <Save className="h-5 w-5" />
                  {mode === "create" ? "Launch Project" : "Sync Changes"}
                </div>
              )}
            </Button>
          </div>
        </form>
      </CardContent>

      {/* Manage Salesmen Dialog */}
      <Dialog open={manageSalesmanOpen} onOpenChange={setManageSalesmanOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings2 className="h-5 w-5 text-primary" />
              Manage Sales Man List
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="flex gap-2">
              <Input
                placeholder="New Sales Man Name..."
                value={newSalesmanName}
                onChange={(e) => setNewSalesmanName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    handleAddSalesman()
                  }
                }}
                className="rounded-xl"
              />
              <Button type="button" onClick={handleAddSalesman} className="rounded-xl font-bold">
                <Plus className="h-4 w-4 mr-1" /> Add
              </Button>
            </div>
            <div className="space-y-2 max-h-60 overflow-y-auto border rounded-2xl p-3 bg-muted/30">
              {salesmanOptions.filter(Boolean).map((name, idx) => (
                <div key={`manage-sm-${idx}-${name}`} className="flex justify-between items-center bg-card p-2.5 rounded-xl border border-border">
                  {editingSalesmanIdx === idx ? (
                    <div className="flex items-center gap-2 flex-1 mr-2">
                      <Input
                        value={editingSalesmanText}
                        onChange={(e) => setEditingSalesmanText(e.target.value)}
                        className="h-8 text-sm"
                        autoFocus
                      />
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={() => handleSaveEditSalesman(idx)}
                        className="h-7 w-7 text-success"
                        title="Save"
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={() => setEditingSalesmanIdx(null)}
                        className="h-7 w-7 text-muted-foreground"
                        title="Cancel"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <span className="text-sm font-semibold truncate max-w-[180px]">{name}</span>
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          disabled={idx === 0}
                          onClick={() => handleMoveUpSalesman(idx)}
                          className="h-7 w-7 rounded-lg"
                          title="Move Up"
                        >
                          <ChevronUp className="h-4 w-4 text-muted-foreground" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          disabled={idx === salesmanOptions.length - 1}
                          onClick={() => handleMoveDownSalesman(idx)}
                          className="h-7 w-7 rounded-lg"
                          title="Move Down"
                        >
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleStartEditSalesman(idx, name)}
                          className="h-7 w-7 rounded-lg text-primary hover:bg-primary/10"
                          title="Edit Name"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveSalesman(name)}
                          className="h-7 w-7 rounded-lg text-destructive hover:bg-destructive/10"
                          title="Remove Salesman"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-end pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setManageSalesmanOpen(false)}
                className="rounded-xl font-bold"
              >
                Done
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Manage Firm Dialog */}
      <Dialog open={manageFirmOpen} onOpenChange={setManageFirmOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Manage Firm Names</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="flex gap-2">
              <Input
                placeholder="New Firm Name..."
                value={newFirmName}
                onChange={(e) => setNewFirmName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    handleAddFirm()
                  }
                }}
                className="rounded-xl"
              />
              <Button type="button" onClick={handleAddFirm} className="rounded-xl font-bold">
                <Plus className="h-4 w-4 mr-1" /> Add
              </Button>
            </div>
            <div className="space-y-2 max-h-60 overflow-y-auto border rounded-2xl p-3 bg-muted/30">
              {firmOptions.filter(Boolean).map((name, idx) => (
                <div key={`manage-firm-${idx}-${name}`} className="flex justify-between items-center bg-card p-2.5 rounded-xl border border-border">
                  {editingFirmIdx === idx ? (
                    <div className="flex items-center gap-2 flex-1 mr-2">
                      <Input
                        value={editingFirmText}
                        onChange={(e) => setEditingFirmText(e.target.value)}
                        className="h-8 text-sm"
                        autoFocus
                      />
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={() => handleSaveEditFirm(idx)}
                        className="h-7 w-7 text-success"
                        title="Save"
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={() => setEditingFirmIdx(null)}
                        className="h-7 w-7 text-muted-foreground"
                        title="Cancel"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <span className="text-sm font-semibold truncate max-w-[180px]">{name}</span>
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          disabled={idx === 0}
                          onClick={() => handleMoveUpFirm(idx)}
                          className="h-7 w-7 rounded-lg"
                          title="Move Up"
                        >
                          <ChevronUp className="h-4 w-4 text-muted-foreground" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          disabled={idx === firmOptions.length - 1}
                          onClick={() => handleMoveDownFirm(idx)}
                          className="h-7 w-7 rounded-lg"
                          title="Move Down"
                        >
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleStartEditFirm(idx, name)}
                          className="h-7 w-7 rounded-lg text-primary hover:bg-primary/10"
                          title="Edit Name"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveFirm(name)}
                          className="h-7 w-7 rounded-lg text-destructive hover:bg-destructive/10"
                          title="Remove Firm"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-end pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setManageFirmOpen(false)}
                className="rounded-xl font-bold"
              >
                Done
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
