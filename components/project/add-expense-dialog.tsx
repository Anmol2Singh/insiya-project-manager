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

interface AddExpenseDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  nextSrNo: number
  onSuccess: () => void
}

export function AddExpenseDialog({ open, onOpenChange, projectId, nextSrNo, onSuccess }: AddExpenseDialogProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split("T")[0],
    particular: "",
    expense: "",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const supabase = createClient()

      const { error } = await supabase.from("expenses").insert({
        project_id: projectId,
        sr_no: nextSrNo,
        date: formData.date,
        particular: formData.particular || null,
        expense: parseFloat(formData.expense) || 0,
      })

      if (error) throw error

      setFormData({
        date: new Date().toISOString().split("T")[0],
        particular: "",
        expense: "",
      })

      onSuccess()
      onOpenChange(false)
    } catch (error: any) {
      console.error("Error adding expense:", error)
      toast.error(error.message || "Failed to add expense")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Expense</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
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
            <Label htmlFor="particular">Particular</Label>
            <Textarea
              id="particular"
              value={formData.particular}
              onChange={(e) => setFormData({ ...formData, particular: e.target.value })}
              placeholder="Describe the expense"
              rows={2}
            />
          </div>

          <div>
            <Label htmlFor="expense">Expense Amount</Label>
            <Input
              id="expense"
              type="number"
              step="0.01"
              value={formData.expense}
              onChange={(e) => setFormData({ ...formData, expense: e.target.value })}
              placeholder="Enter amount"
              required
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !formData.expense} className="bg-primary text-primary-foreground">
              {loading ? "Adding..." : "Add Expense"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
