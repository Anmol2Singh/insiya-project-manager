"use client"

import React, { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { syncProjectTotals } from "@/lib/project-utils"
import { toast } from "sonner"
import { Settings2, Plus, Trash2, ChevronUp, ChevronDown, Edit2, Check, X } from "lucide-react"
import type { LedgerEntry } from "@/lib/types"

const DEFAULT_INVENTORY_TYPES = ["Cash", "Online"]
const DEFAULT_PARTICULARS_OPTIONS = ["Bill", "Receipt", "Order Value"]

interface AddLedgerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  nextSrNo: number
  onSuccess: () => void
  entry?: LedgerEntry | null
}

export function AddLedgerDialog({ open, onOpenChange, projectId, nextSrNo, onSuccess, entry }: AddLedgerDialogProps) {
  const [loading, setLoading] = useState(false)
  const isEdit = !!entry

  const [inventoryTypes, setInventoryTypes] = useState<string[]>(DEFAULT_INVENTORY_TYPES)
  const [particularsOptions, setParticularsOptions] = useState<string[]>(DEFAULT_PARTICULARS_OPTIONS)

  const [manageTarget, setManageTarget] = useState<"inventory" | "particulars" | null>(null)
  const [newOptionName, setNewOptionName] = useState("")
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [editingText, setEditingText] = useState("")

  const [formData, setFormData] = useState<any>({
    date: new Date().toISOString().split("T")[0],
    payment_type: DEFAULT_INVENTORY_TYPES[0],
    reference_number: "",
    invoice_no: "",
    particulars: DEFAULT_PARTICULARS_OPTIONS[0],
    bill_submitted: false,
    payment_receipt: false,
    sales_m_value: "",
    m_outward_value: "",
    order_value: "",
    extra_work_value: "",
    payment_received: "",
  })

  // Load stored options
  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedInv = localStorage.getItem("inventory_type_options")
      if (storedInv) {
        try {
          const parsed = JSON.parse(storedInv)
          if (Array.isArray(parsed) && parsed.length > 0) {
            setInventoryTypes(parsed)
          }
        } catch (e) {
          console.error("Failed to parse stored inventory_type_options:", e)
        }
      }

      const storedPart = localStorage.getItem("particulars_type_options")
      if (storedPart) {
        try {
          const parsed = JSON.parse(storedPart)
          if (Array.isArray(parsed) && parsed.length > 0) {
            setParticularsOptions(parsed)
          }
        } catch (e) {
          console.error("Failed to parse stored particulars_type_options:", e)
        }
      }
    }
  }, [])

  const saveInventoryTypes = (newTypes: string[]) => {
    setInventoryTypes(newTypes)
    if (typeof window !== "undefined") {
      localStorage.setItem("inventory_type_options", JSON.stringify(newTypes))
    }
  }

  const saveParticularsOptions = (newOpts: string[]) => {
    setParticularsOptions(newOpts)
    if (typeof window !== "undefined") {
      localStorage.setItem("particulars_type_options", JSON.stringify(newOpts))
    }
  }

  // Generic List Management Handlers
  const currentList = manageTarget === "inventory" ? inventoryTypes : particularsOptions
  const saveCurrentList = (updated: string[]) => {
    if (manageTarget === "inventory") {
      saveInventoryTypes(updated)
    } else if (manageTarget === "particulars") {
      saveParticularsOptions(updated)
    }
  }

  const handleAddOption = () => {
    const trimmed = newOptionName.trim()
    if (!trimmed) return
    if (currentList.includes(trimmed)) {
      toast.error("Item already exists in list")
      return
    }
    const updated = [...currentList, trimmed]
    saveCurrentList(updated)
    setNewOptionName("")
    toast.success(`Added "${trimmed}"`)
  }

  const handleRemoveOption = (name: string) => {
    if (currentList.length <= 1) {
      toast.error("At least one item is required in the list")
      return
    }
    const updated = currentList.filter((item) => item !== name)
    saveCurrentList(updated)
    toast.success(`Removed "${name}"`)
  }

  const handleStartEdit = (idx: number, currentText: string) => {
    setEditingIndex(idx)
    setEditingText(currentText)
  }

  const handleSaveEdit = (idx: number) => {
    const trimmed = editingText.trim()
    if (!trimmed) return
    const updated = [...currentList]
    updated[idx] = trimmed
    saveCurrentList(updated)
    setEditingIndex(null)
    setEditingText("")
    toast.success("Option updated")
  }

  const handleMoveUp = (idx: number) => {
    if (idx === 0) return
    const updated = [...currentList]
    const temp = updated[idx - 1]
    updated[idx - 1] = updated[idx]
    updated[idx] = temp
    saveCurrentList(updated)
  }

  const handleMoveDown = (idx: number) => {
    if (idx === currentList.length - 1) return
    const updated = [...currentList]
    const temp = updated[idx + 1]
    updated[idx + 1] = updated[idx]
    updated[idx] = temp
    saveCurrentList(updated)
  }

  // Update form data when entry changes (for edit mode)
  useEffect(() => {
    if (entry) {
      setFormData({
        date: entry.date || new Date().toISOString().split("T")[0],
        payment_type: entry.payment_type || (inventoryTypes[0] || "Cash"),
        reference_number: entry.reference_number || "",
        invoice_no: entry.invoice_no || "",
        particulars: entry.particulars || (particularsOptions[0] || "Bill"),
        bill_submitted: entry.bill_submitted || false,
        payment_receipt: entry.payment_receipt || false,
        sales_m_value: entry.sales_m_value || "",
        m_outward_value: entry.m_outward_value || "",
        order_value: entry.order_value || "",
        extra_work_value: entry.extra_work_value || "",
        payment_received: entry.payment_received || "",
      })
    } else {
      setFormData({
        date: new Date().toISOString().split("T")[0],
        payment_type: inventoryTypes[0] || "Cash",
        reference_number: "",
        invoice_no: "",
        particulars: particularsOptions[0] || "Bill",
        bill_submitted: false,
        payment_receipt: false,
        sales_m_value: "",
        m_outward_value: "",
        order_value: "",
        extra_work_value: "",
        payment_received: "",
      })
    }
  }, [entry, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const supabase = createClient()

      const payload = {
        date: formData.date,
        payment_type: formData.payment_type || null,
        reference_number: formData.reference_number || null,
        invoice_no: formData.invoice_no || null,
        particulars: formData.particulars,
        bill_submitted: formData.bill_submitted,
        payment_receipt: formData.payment_receipt,
        sales_m_value: formData.sales_m_value ? parseFloat(formData.sales_m_value) : 0,
        m_outward_value: formData.m_outward_value ? parseFloat(formData.m_outward_value) : 0,
        order_value: formData.order_value ? parseFloat(formData.order_value) : 0,
        extra_work_value: formData.extra_work_value ? parseFloat(formData.extra_work_value) : 0,
        payment_received: formData.payment_received ? parseFloat(formData.payment_received) : 0,
      }

      if (isEdit && entry) {
        const { error } = await supabase
          .from("ledger_entries")
          .update(payload)
          .eq("id", entry.id)

        if (error) throw error
        toast.success("Ledger entry updated successfully")
      } else {
        const { error } = await supabase
          .from("ledger_entries")
          .insert({
            ...payload,
            project_id: projectId,
            sr_no: nextSrNo,
          })

        if (error) throw error
        toast.success("Ledger entry added successfully")
      }

      await syncProjectTotals(projectId)
      onSuccess()
      onOpenChange(false)
    } catch (error: any) {
      console.error("Error saving ledger entry:", error)
      toast.error(error.message || "Failed to save ledger entry")
    } finally {
      setLoading(false)
    }
  }

  // Ensure current value is included in list options for display
  const displayInventoryTypes = formData.payment_type && !inventoryTypes.includes(formData.payment_type)
    ? [formData.payment_type, ...inventoryTypes]
    : inventoryTypes

  const displayParticularsOptions = formData.particulars && !particularsOptions.includes(formData.particulars)
    ? [formData.particulars, ...particularsOptions]
    : particularsOptions

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isEdit ? "Edit Ledger Entry" : "Add Ledger Entry"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  required
                />
              </div>
              <div>
                <div className="flex justify-between items-center mb-1">
                  <Label htmlFor="payment_type">Payment Type</Label>
                  <button
                    type="button"
                    onClick={() => {
                      setManageTarget("inventory")
                      setEditingIndex(null)
                      setNewOptionName("")
                    }}
                    className="text-xs text-primary hover:underline font-semibold flex items-center gap-1"
                  >
                    <Settings2 className="h-3 w-3" /> Edit Dropdown List
                  </button>
                </div>
                <Select
                  value={formData.payment_type}
                  onValueChange={(val) => setFormData({ ...formData, payment_type: val })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select Payment Type" />
                  </SelectTrigger>
                  <SelectContent>
                    {displayInventoryTypes.filter(Boolean).map((t, idx) => (
                      <SelectItem key={`inv-type-${idx}-${t}`} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="reference_number">Reference Number</Label>
                <Input
                  id="reference_number"
                  value={formData.reference_number}
                  onChange={(e) => setFormData({ ...formData, reference_number: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="invoice_no">Invoice No</Label>
                <Input
                  id="invoice_no"
                  value={formData.invoice_no}
                  onChange={(e) => setFormData({ ...formData, invoice_no: e.target.value })}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <Label htmlFor="particulars">Particulars</Label>
                <button
                  type="button"
                  onClick={() => {
                    setManageTarget("particulars")
                    setEditingIndex(null)
                    setNewOptionName("")
                  }}
                  className="text-xs text-primary hover:underline font-semibold flex items-center gap-1"
                >
                  <Settings2 className="h-3 w-3" /> Edit Dropdown List
                </button>
              </div>
              <Select
                value={formData.particulars}
                onValueChange={(val) => setFormData({ ...formData, particulars: val })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select Particulars" />
                </SelectTrigger>
                <SelectContent>
                  {displayParticularsOptions.filter(Boolean).map((p, idx) => (
                    <SelectItem key={`part-opt-${idx}-${p}`} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="bill_submitted"
                  checked={formData.bill_submitted}
                  onCheckedChange={(checked) =>
                    setFormData({
                      ...formData,
                      bill_submitted: checked === true,
                      payment_receipt: checked === true ? false : formData.payment_receipt,
                    })
                  }
                />
                <Label htmlFor="bill_submitted" className="text-sm cursor-pointer">Bill Submitted</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="payment_receipt"
                  checked={formData.payment_receipt}
                  onCheckedChange={(checked) =>
                    setFormData({
                      ...formData,
                      payment_receipt: checked === true,
                      bill_submitted: checked === true ? false : formData.bill_submitted,
                    })
                  }
                />
                <Label htmlFor="payment_receipt" className="text-sm cursor-pointer">Payment Receipt</Label>
              </div>
            </div>

            <div className="border-t pt-4">
              <h4 className="font-medium mb-3 text-warning-foreground">Material Section</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="sales_m_value">Sales M Value</Label>
                  <Input
                    id="sales_m_value"
                    type="number"
                    step="0.01"
                    placeholder=""
                    value={formData.sales_m_value === 0 || formData.sales_m_value === "0" ? "" : formData.sales_m_value}
                    onChange={(e) => setFormData({ ...formData, sales_m_value: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="m_outward_value">M Outward Value</Label>
                  <Input
                    id="m_outward_value"
                    type="number"
                    step="0.01"
                    placeholder=""
                    value={formData.m_outward_value === 0 || formData.m_outward_value === "0" ? "" : formData.m_outward_value}
                    onChange={(e) => setFormData({ ...formData, m_outward_value: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className="border-t pt-4">
              <h4 className="font-medium mb-3 text-info">Account Section</h4>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="order_value">Order Value</Label>
                  <Input
                    id="order_value"
                    type="number"
                    step="0.01"
                    placeholder=""
                    value={formData.order_value === 0 || formData.order_value === "0" ? "" : formData.order_value}
                    onChange={(e) => setFormData({ ...formData, order_value: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="extra_work_value">Extra Work Value</Label>
                  <Input
                    id="extra_work_value"
                    type="number"
                    step="0.01"
                    placeholder=""
                    value={formData.extra_work_value === 0 || formData.extra_work_value === "0" ? "" : formData.extra_work_value}
                    onChange={(e) => setFormData({ ...formData, extra_work_value: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="payment_received">Payment Received</Label>
                  <Input
                    id="payment_received"
                    type="number"
                    step="0.01"
                    placeholder=""
                    value={formData.payment_received === 0 || formData.payment_received === "0" ? "" : formData.payment_received}
                    onChange={(e) => setFormData({ ...formData, payment_received: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading} className="bg-primary text-primary-foreground">
                {loading ? (isEdit ? "Updating..." : "Adding...") : (isEdit ? "Update Entry" : "Add Entry")}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Manage Dropdown Options Dialog */}
      <Dialog open={manageTarget !== null} onOpenChange={(open) => !open && setManageTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings2 className="h-5 w-5 text-primary" />
              {manageTarget === "inventory" ? "Manage Payment Types" : "Manage Particulars List"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="flex gap-2">
              <Input
                placeholder={`New ${manageTarget === "inventory" ? "payment type" : "particulars option"}...`}
                value={newOptionName}
                onChange={(e) => setNewOptionName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddOption())}
                className="rounded-xl"
              />
              <Button type="button" onClick={handleAddOption} className="rounded-xl font-bold">
                <Plus className="h-4 w-4 mr-1" /> Add
              </Button>
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto border rounded-2xl p-3 bg-muted/20">
              {currentList.filter(Boolean).map((itemName, idx) => (
                <div
                  key={`manage-opt-${idx}-${itemName}`}
                  className="flex justify-between items-center bg-card p-2.5 rounded-xl border border-border/80 shadow-sm"
                >
                  {editingIndex === idx ? (
                    <div className="flex items-center gap-2 flex-1 mr-2">
                      <Input
                        value={editingText}
                        onChange={(e) => setEditingText(e.target.value)}
                        className="h-8 text-sm"
                        autoFocus
                      />
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={() => handleSaveEdit(idx)}
                        className="h-7 w-7 text-success"
                        title="Save"
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={() => setEditingIndex(null)}
                        className="h-7 w-7 text-muted-foreground"
                        title="Cancel"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <span className="text-sm font-semibold truncate max-w-[180px]">{itemName}</span>
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          disabled={idx === 0}
                          onClick={() => handleMoveUp(idx)}
                          className="h-7 w-7 rounded-lg"
                          title="Move Up"
                        >
                          <ChevronUp className="h-4 w-4 text-muted-foreground" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          disabled={idx === currentList.length - 1}
                          onClick={() => handleMoveDown(idx)}
                          className="h-7 w-7 rounded-lg"
                          title="Move Down"
                        >
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleStartEdit(idx, itemName)}
                          className="h-7 w-7 rounded-lg text-primary hover:bg-primary/10"
                          title="Edit Name"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveOption(itemName)}
                          className="h-7 w-7 rounded-lg text-destructive hover:bg-destructive/10"
                          title="Delete Item"
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
                onClick={() => setManageTarget(null)}
                className="rounded-xl font-bold"
              >
                Done
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
