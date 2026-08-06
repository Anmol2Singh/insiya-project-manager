"use client"

import React, { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import { Settings2, Plus, Trash2, ChevronUp, ChevronDown } from "lucide-react"
import type { SwhChecklistItem } from "@/lib/types"

interface AddChecklistItemDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  nextSrNo: number
  item?: SwhChecklistItem | null
  onSuccess: () => void
}

const DEFAULT_ITEMS = [
  "Heat Pump",
  "Circulation Pump",
  "Heat Pump Stand",
  "Downtake",
  "Inlet",
  "Outlet",
  "Wiring",
  "Controller",
  "Storage Tank",
  "Expansion Tank",
]

export function AddChecklistItemDialog({ open, onOpenChange, projectId, nextSrNo, item, onSuccess }: AddChecklistItemDialogProps) {
  const [loading, setLoading] = useState(false)
  const [manageOpen, setManageOpen] = useState(false)
  const [newItemInput, setNewItemInput] = useState("")

  const [itemsList, setItemsList] = useState<string[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("checklist_dropdown_items")
      if (saved) {
        try {
          return JSON.parse(saved)
        } catch (e) {
          console.error(e)
        }
      }
    }
    return DEFAULT_ITEMS
  })

  const [formData, setFormData] = useState({
    item_name: "",
    custom_item: "",
    req_qty: "",
    customer_scope: false,
    our_scope_flag: false,
    dispatch_qty: "",
    dispatch_yes_no: false,
    installed_qty: "",
    installation_yes_no: false,
    remark: "",
  })

  useEffect(() => {
    if (item) {
      const isKnown = itemsList.includes(item.item_name)
      setFormData({
        item_name: isKnown ? item.item_name : "custom",
        custom_item: isKnown ? "" : item.item_name,
        req_qty: item.req_qty?.toString() || "",
        customer_scope: item.customer_scope ?? false,
        our_scope_flag: item.our_scope ?? false,
        dispatch_qty: item.dispatch_qty?.toString() || "",
        dispatch_yes_no: item.dispatch_yes_no ?? false,
        installed_qty: item.installed_qty?.toString() || "",
        installation_yes_no: item.installation_yes_no ?? false,
        remark: item.remark || "",
      })
    } else {
      setFormData({
        item_name: "",
        custom_item: "",
        req_qty: "",
        customer_scope: false,
        our_scope_flag: false,
        dispatch_qty: "",
        dispatch_yes_no: false,
        installed_qty: "",
        installation_yes_no: false,
        remark: "",
      })
    }
  }, [item, open, itemsList])

  const saveItemsList = (newList: string[]) => {
    setItemsList(newList)
    if (typeof window !== "undefined") {
      localStorage.setItem("checklist_dropdown_items", JSON.stringify(newList))
    }
  }

  const handleAddItem = () => {
    if (!newItemInput.trim()) return
    const trimmed = newItemInput.trim()
    if (itemsList.includes(trimmed)) {
      toast.error("Item already exists")
      return
    }
    const updated = [...itemsList, trimmed]
    saveItemsList(updated)
    setNewItemInput("")
    toast.success("Dropdown item added")
  }

  const handleDeleteItem = (itemToDelete: string) => {
    const updated = itemsList.filter((i) => i !== itemToDelete)
    saveItemsList(updated)
    toast.success("Dropdown item removed")
  }

  const handleMoveUp = (index: number) => {
    if (index === 0) return
    const updated = [...itemsList]
    const temp = updated[index - 1]
    updated[index - 1] = updated[index]
    updated[index] = temp
    saveItemsList(updated)
  }

  const handleMoveDown = (index: number) => {
    if (index === itemsList.length - 1) return
    const updated = [...itemsList]
    const temp = updated[index + 1]
    updated[index + 1] = updated[index]
    updated[index] = temp
    saveItemsList(updated)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const supabase = createClient()
      const itemName = formData.item_name === "custom" ? formData.custom_item : formData.item_name

      const payload = {
        project_id: projectId,
        sr_no: item ? item.sr_no : nextSrNo,
        item_name: itemName,
        req_qty: formData.req_qty ? parseFloat(formData.req_qty) : null,
        customer_scope: formData.customer_scope,
        our_scope: formData.our_scope_flag,
        dispatch_qty: formData.dispatch_qty ? parseFloat(formData.dispatch_qty) : null,
        dispatch_yes_no: formData.dispatch_yes_no,
        installed_qty: formData.installed_qty ? parseFloat(formData.installed_qty) : null,
        installation_yes_no: formData.installation_yes_no,
        remark: formData.remark || null,
      }

      if (item) {
        const { error } = await supabase
          .from("swh_checklist")
          .update(payload)
          .eq("id", item.id)

        if (error) throw error
        toast.success("Checklist item updated successfully")
      } else {
        const { error } = await supabase
          .from("swh_checklist")
          .insert(payload)

        if (error) throw error
        toast.success("Checklist item added successfully")
      }

      onSuccess()
      onOpenChange(false)
    } catch (error: any) {
      console.error("Error saving checklist item:", error)
      toast.error(error.message || "Failed to save checklist item")
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{item ? "Edit Checklist Item" : "Add Checklist Item"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-1">
                <Label htmlFor="item_name">Item Name</Label>
                <button
                  type="button"
                  onClick={() => setManageOpen(true)}
                  className="text-xs text-primary hover:underline font-semibold flex items-center gap-1"
                >
                  <Settings2 className="h-3 w-3" /> Edit Dropdown List
                </button>
              </div>
              <Select
                value={formData.item_name}
                onValueChange={(value) => setFormData({ ...formData, item_name: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select item" />
                </SelectTrigger>
                <SelectContent>
                  {itemsList.filter(Boolean).map((itemVal, idx) => (
                    <SelectItem key={`dropdown-item-${idx}-${itemVal}`} value={itemVal}>{itemVal}</SelectItem>
                  ))}
                  <SelectItem value="custom">Custom Item...</SelectItem>
                </SelectContent>
              </Select>
            </div>

          {formData.item_name === "custom" && (
            <div>
              <Label htmlFor="custom_item">Custom Item Name</Label>
              <Input
                id="custom_item"
                value={formData.custom_item}
                onChange={(e) => setFormData({ ...formData, custom_item: e.target.value })}
                placeholder="Enter item name"
                required
              />
            </div>
          )}

          <div>
            <Label htmlFor="req_qty">Required Qty</Label>
            <Input
              id="req_qty"
              type="number"
              value={formData.req_qty}
              onChange={(e) => setFormData({ ...formData, req_qty: e.target.value })}
            />
          </div>

          <div>
            <Label className="text-sm font-medium mb-3 block">Scope (Select One)</Label>
            <div className="flex items-center gap-6 p-3 bg-muted/40 rounded-lg border">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="customer_scope"
                  checked={formData.customer_scope}
                  onCheckedChange={(checked) => setFormData({ 
                    ...formData, 
                    customer_scope: checked === true,
                    our_scope_flag: checked === true ? false : formData.our_scope_flag
                  })}
                />
                <Label htmlFor="customer_scope" className="text-sm font-medium cursor-pointer">Customer Scope</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="our_scope_flag"
                  checked={formData.our_scope_flag}
                  onCheckedChange={(checked) => setFormData({ 
                    ...formData, 
                    our_scope_flag: checked === true,
                    customer_scope: checked === true ? false : formData.customer_scope
                  })}
                />
                <Label htmlFor="our_scope_flag" className="text-sm font-medium cursor-pointer">Our Scope</Label>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="dispatch_qty">Dispatch Qty</Label>
              <Input
                id="dispatch_qty"
                type="number"
                value={formData.dispatch_qty}
                onChange={(e) => setFormData({ ...formData, dispatch_qty: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="installed_qty">Installed Qty</Label>
              <Input
                id="installed_qty"
                type="number"
                value={formData.installed_qty}
                onChange={(e) => setFormData({ ...formData, installed_qty: e.target.value })}
              />
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Checkbox
                id="dispatch_yes_no"
                checked={formData.dispatch_yes_no}
                onCheckedChange={(checked) => setFormData({ ...formData, dispatch_yes_no: checked === true })}
              />
              <Label htmlFor="dispatch_yes_no" className="text-sm">Dispatched</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="installation_yes_no"
                checked={formData.installation_yes_no}
                onCheckedChange={(checked) => setFormData({ ...formData, installation_yes_no: checked === true })}
              />
              <Label htmlFor="installation_yes_no" className="text-sm">Installed</Label>
            </div>
          </div>

          <div>
            <Label htmlFor="remark">Remark</Label>
            <Textarea
              id="remark"
              value={formData.remark}
              onChange={(e) => setFormData({ ...formData, remark: e.target.value })}
              placeholder="Add a remark"
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || (!formData.item_name || (formData.item_name === "custom" && !formData.custom_item))}
              className="bg-primary text-primary-foreground font-bold"
            >
              {loading ? (item ? "Saving..." : "Adding...") : (item ? "Save Changes" : "Add Item")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>

    {/* Manage Dropdown Items Modal */}
    <Dialog open={manageOpen} onOpenChange={setManageOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">Manage Dropdown Items</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="flex gap-2">
            <Input
              placeholder="New Item Name..."
              value={newItemInput}
              onChange={(e) => setNewItemInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  handleAddItem()
                }
              }}
              className="rounded-xl"
            />
            <Button type="button" onClick={handleAddItem} className="rounded-xl font-bold">
              <Plus className="h-4 w-4 mr-1" /> Add
            </Button>
          </div>

          <div className="space-y-2 max-h-72 overflow-y-auto border rounded-2xl p-3 bg-muted/20">
            {itemsList.filter(Boolean).map((itemVal, idx) => (
              <div key={`manage-item-${idx}-${itemVal}`} className="flex justify-between items-center bg-card p-2.5 rounded-xl border border-border/80 shadow-sm">
                <span className="text-sm font-semibold truncate max-w-[180px]">{itemVal}</span>
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
                    disabled={idx === itemsList.length - 1}
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
                    onClick={() => handleDeleteItem(itemVal)}
                    className="h-7 w-7 rounded-lg text-destructive hover:bg-destructive/10"
                    title="Delete Item"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
            {itemsList.length === 0 && (
              <p className="text-center py-6 text-xs text-muted-foreground italic">No items. Add one above!</p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
    </>
  )
}
