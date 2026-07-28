"use client"

import React from "react"

import { useState } from "react"
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

interface AddChecklistItemDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  nextSrNo: number
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

export function AddChecklistItemDialog({ open, onOpenChange, projectId, nextSrNo, onSuccess }: AddChecklistItemDialogProps) {
  const [loading, setLoading] = useState(false)
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const supabase = createClient()

      const itemName = formData.item_name === "custom" ? formData.custom_item : formData.item_name

      const { error } = await supabase.from("swh_checklist").insert({
        project_id: projectId,
        sr_no: nextSrNo,
        item_name: itemName,
        req_qty: formData.req_qty ? parseFloat(formData.req_qty) : null,
        customer_scope: formData.customer_scope,
        our_scope: formData.our_scope_flag,
        dispatch_qty: formData.dispatch_qty ? parseFloat(formData.dispatch_qty) : null,
        dispatch_yes_no: formData.dispatch_yes_no,
        installed_qty: formData.installed_qty ? parseFloat(formData.installed_qty) : null,
        installation_yes_no: formData.installation_yes_no,
        remark: formData.remark || null,
      })

      if (error) throw error

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

      onSuccess()
      onOpenChange(false)
    } catch (error: any) {
      console.error("Error adding checklist item:", error)
      toast.error(error.message || "Failed to add checklist item")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Checklist Item</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="item_name">Item Name</Label>
            <Select
              value={formData.item_name}
              onValueChange={(value) => setFormData({ ...formData, item_name: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select item" />
              </SelectTrigger>
              <SelectContent>
                {DEFAULT_ITEMS.map((item) => (
                  <SelectItem key={item} value={item}>{item}</SelectItem>
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
              className="bg-primary text-primary-foreground"
            >
              {loading ? "Adding..." : "Add Item"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
