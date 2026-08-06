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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { PaymentTerm } from "@/lib/types"

interface AddPaymentTermDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  orderValue: number
  existingTerms: PaymentTerm[]
  term?: PaymentTerm | null
  onSuccess: () => void
}

const PAYMENT_TERMS = [
  "Advance",
  "Material on Site",
  "Installation",
  "Testing",
  "Retention",
]

export function AddPaymentTermDialog({ 
  open, 
  onOpenChange, 
  projectId, 
  orderValue,
  existingTerms,
  term,
  onSuccess 
}: AddPaymentTermDialogProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    payment_term: "",
    term_percentage: "",
    amount: "",
    received_amount: "",
    remark: "",
  })

  useEffect(() => {
    if (term) {
      setFormData({
        payment_term: term.payment_term || "",
        term_percentage: term.term_percentage?.toString() || "",
        amount: term.amount?.toString() || "",
        received_amount: term.received_amount?.toString() || "",
        remark: term.remark || "",
      })
    } else {
      setFormData({
        payment_term: "",
        term_percentage: "",
        amount: "",
        received_amount: "",
        remark: "",
      })
    }
  }, [term, open])

  // Calculate total percentage from existing terms excluding current editing term
  const existingPercentageTotal = existingTerms
    .filter((t) => !term || t.id !== term.id)
    .reduce((sum, t) => sum + (t.term_percentage || 0), 0)

  // Calculate new total percentage if current value is entered
  const newPercentage = formData.term_percentage ? parseFloat(formData.term_percentage) : 0
  const totalPercentage = existingPercentageTotal + newPercentage

  // Check if we can add/edit terms
  const canAddMore = existingPercentageTotal < 100

  // Auto-update amount when percentage changes
  const handlePercentageChange = (value: string) => {
    setFormData((prev) => {
      if (value && orderValue) {
        const percentage = parseFloat(value)
        const calculatedAmount = (percentage / 100) * orderValue
        return {
          ...prev,
          term_percentage: value,
          amount: calculatedAmount.toString(),
        }
      }
      return { ...prev, term_percentage: value, amount: "" }
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validate that total percentage doesn't exceed 100%
    if (totalPercentage > 100) {
      toast.error(`Total percentage cannot exceed 100%. Current: ${totalPercentage}%`)
      return
    }

    setLoading(true)

    try {
      const supabase = createClient()

      const amount = parseFloat(formData.amount) || 0
      const received = parseFloat(formData.received_amount) || 0
      const pending = amount - received

      const payload = {
        project_id: projectId,
        payment_term: formData.payment_term,
        term_percentage: formData.term_percentage ? parseFloat(formData.term_percentage) : null,
        amount: amount || null,
        received_amount: received || null,
        pending_amount: pending || null,
        remark: formData.remark || null,
      }

      if (term) {
        const { error } = await supabase
          .from("payment_terms")
          .update(payload)
          .eq("id", term.id)

        if (error) throw error
        toast.success("Payment term updated successfully")
      } else {
        const { error } = await supabase
          .from("payment_terms")
          .insert(payload)

        if (error) throw error
        toast.success("Payment term added successfully")
      }

      onSuccess()
      onOpenChange(false)
    } catch (error: any) {
      console.error("Error saving payment term:", error)
      toast.error(error.message || "Failed to save payment term")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{term ? "Edit Payment Term" : "Add Payment Term"}</DialogTitle>
        </DialogHeader>
        
        {!canAddMore && (
          <div className="bg-destructive/10 border border-destructive/30 rounded-md p-3 text-sm text-destructive">
            <p className="font-medium">Cannot add more terms</p>
            <p className="text-xs opacity-90">Total term percentage has reached 100%</p>
          </div>
        )}

        {canAddMore && totalPercentage === 100 && (
          <div className="bg-warning/10 border border-warning/30 rounded-md p-3 text-sm text-warning">
            <p className="font-medium">100% Reached</p>
            <p className="text-xs opacity-90">Total term percentage will be 100% with this entry</p>
          </div>
        )}

        {canAddMore && totalPercentage > 100 && (
          <div className="bg-destructive/10 border border-destructive/30 rounded-md p-3 text-sm text-destructive">
            <p className="font-medium">Exceeds Limit</p>
            <p className="text-xs opacity-90">Total percentage ({totalPercentage.toFixed(2)}%) exceeds 100%</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="payment_term">Payment Term</Label>
            <Select
              value={formData.payment_term}
              onValueChange={(value) => setFormData({ ...formData, payment_term: value })}
              disabled={!canAddMore}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select payment term" />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_TERMS.map((termItem, idx) => (
                  <SelectItem key={`pay-term-${idx}-${termItem}`} value={termItem}>{termItem}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label htmlFor="term_percentage">Term Percentage (%)</Label>
              <span className="text-xs text-muted-foreground">
                Used: {existingPercentageTotal}% + Current: {newPercentage ? newPercentage.toFixed(2) : 0}% = {totalPercentage.toFixed(2)}%
              </span>
            </div>
            <Input
              id="term_percentage"
              type="number"
              step="0.01"
              value={formData.term_percentage}
              onChange={(e) => handlePercentageChange(e.target.value)}
              placeholder="e.g., 10"
              disabled={!canAddMore}
            />
          </div>

          <div>
            <Label htmlFor="amount">Amount (Auto-calculated)</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              value={formData.amount}
              readOnly
              placeholder="Amount will be calculated"
              className="bg-muted"
            />
            <p className="text-xs text-muted-foreground mt-1">
              {orderValue ? `Based on ${newPercentage ? newPercentage.toFixed(2) : 0}% of ₹${orderValue.toLocaleString('en-IN')}` : 'No order value available'}
            </p>
          </div>

          <div>
            <Label htmlFor="received_amount">Received Amount</Label>
            <Input
              id="received_amount"
              type="number"
              step="0.01"
              value={formData.received_amount}
              onChange={(e) => setFormData({ ...formData, received_amount: e.target.value })}
              placeholder="Enter received amount"
            />
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
              disabled={loading || !formData.payment_term || !canAddMore || totalPercentage > 100}
              className="bg-primary text-primary-foreground font-bold"
            >
              {loading ? (term ? "Saving..." : "Adding...") : (term ? "Save Changes" : "Add Term")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
