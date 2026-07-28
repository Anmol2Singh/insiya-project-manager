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
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { syncProjectTotals } from "@/lib/project-utils"
import { toast } from "sonner"

import { Edit2 } from "lucide-react"

interface AddLedgerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  nextSrNo: number
  onSuccess: () => void
  entry?: {
    id: string
    date: string
    payment_type: string | null
    reference_number: string | null
    invoice_no: string | null
    particulars: string | null
    bill_submitted: boolean
    sales_m_value: number
    m_outward_value: number
    order_value: number
    extra_work_value: number
    payment_received: number
  } | null
}

export function AddLedgerDialog({ open, onOpenChange, projectId, nextSrNo, onSuccess, entry }: AddLedgerDialogProps) {
  const [loading, setLoading] = useState(false)
  const isEdit = !!entry
  
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split("T")[0],
    payment_type: "",
    reference_number: "",
    invoice_no: "",
    particulars: "",
    bill_submitted: false,
    sales_m_value: 0,
    m_outward_value: 0,
    order_value: 0,
    extra_work_value: 0,
    payment_received: 0,
  })

  // Update form data when entry changes (for edit mode)
  useEffect(() => {
    if (entry) {
      setFormData({
        date: entry.date || new Date().toISOString().split("T")[0],
        payment_type: entry.payment_type || "",
        reference_number: entry.reference_number || "",
        invoice_no: entry.invoice_no || "",
        particulars: entry.particulars || "",
        bill_submitted: entry.bill_submitted || false,
        sales_m_value: entry.sales_m_value || 0,
        m_outward_value: entry.m_outward_value || 0,
        order_value: entry.order_value || 0,
        extra_work_value: entry.extra_work_value || 0,
        payment_received: entry.payment_received || 0,
      })
    } else {
      // Reset form for new entry
      setFormData({
        date: new Date().toISOString().split("T")[0],
        payment_type: "",
        reference_number: "",
        invoice_no: "",
        particulars: "",
        bill_submitted: false,
        sales_m_value: 0,
        m_outward_value: 0,
        order_value: 0,
        extra_work_value: 0,
        payment_received: 0,
      })
    }
  }, [entry, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const supabase = createClient()

      if (isEdit && entry) {
        // Update existing entry
        const { error: updateError } = await supabase
          .from("ledger_entries")
          .update(formData)
          .eq("id", entry.id)

        if (updateError) throw updateError
        toast.success("Ledger entry updated")
      } else {
        // Create new entry
        const { error: insertError } = await supabase.from("ledger_entries").insert({
          project_id: projectId,
          sr_no: nextSrNo,
          ...formData,
        })

        if (insertError) throw insertError
        toast.success("Ledger entry added")
      }

      // Sync project totals
      await syncProjectTotals(projectId)

      // Reset form
      setFormData({
        date: new Date().toISOString().split("T")[0],
        payment_type: "",
        reference_number: "",
        invoice_no: "",
        particulars: "",
        bill_submitted: false,
        sales_m_value: 0,
        m_outward_value: 0,
        order_value: 0,
        extra_work_value: 0,
        payment_received: 0,
      })

      onSuccess()
      onOpenChange(false)
    } catch (error: any) {
      console.error("Error saving ledger entry:", error)
      toast.error(error.message || "Failed to save ledger entry")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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
              <Label htmlFor="payment_type">Payment Type</Label>
              <Input
                id="payment_type"
                value={formData.payment_type}
                onChange={(e) => setFormData({ ...formData, payment_type: e.target.value })}
                placeholder="e.g., Advance, Cash, NEFT"
                required
              />
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
            <Label htmlFor="particulars">Particulars</Label>
            <Textarea
              id="particulars"
              value={formData.particulars}
              onChange={(e) => setFormData({ ...formData, particulars: e.target.value })}
              placeholder="Description of the entry"
              rows={2}
              required
            />
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="bill_submitted"
              checked={formData.bill_submitted}
              onCheckedChange={(checked) => setFormData({ ...formData, bill_submitted: checked === true })}
            />
            <Label htmlFor="bill_submitted" className="text-sm">Bill Submitted</Label>
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
                  value={formData.sales_m_value}
                  onChange={(e) => setFormData({ ...formData, sales_m_value: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div>
                <Label htmlFor="m_outward_value">M Outward Value</Label>
                <Input
                  id="m_outward_value"
                  type="number"
                  step="0.01"
                  value={formData.m_outward_value}
                  onChange={(e) => setFormData({ ...formData, m_outward_value: parseFloat(e.target.value) || 0 })}
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
                  value={formData.order_value}
                  onChange={(e) => setFormData({ ...formData, order_value: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div>
                <Label htmlFor="extra_work_value">Extra Work Value</Label>
                <Input
                  id="extra_work_value"
                  type="number"
                  step="0.01"
                  value={formData.extra_work_value}
                  onChange={(e) => setFormData({ ...formData, extra_work_value: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div>
                <Label htmlFor="payment_received">Payment Received</Label>
                <Input
                  id="payment_received"
                  type="number"
                  step="0.01"
                  value={formData.payment_received}
                  onChange={(e) => setFormData({ ...formData, payment_received: parseFloat(e.target.value) || 0 })}
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
  )
}
