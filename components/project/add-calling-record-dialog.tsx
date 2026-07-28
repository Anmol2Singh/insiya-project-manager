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

interface AddCallingRecordDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  nextSrNo: number
  onSuccess: () => void
}

export function AddCallingRecordDialog({ open, onOpenChange, projectId, nextSrNo, onSuccess }: AddCallingRecordDialogProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split("T")[0],
    description: "",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const supabase = createClient()

      const { error } = await supabase.from("calling_records").insert({
        project_id: projectId,
        sr_no: nextSrNo,
        date: formData.date,
        description: formData.description || null,
      })

      if (error) throw error

      setFormData({
        date: new Date().toISOString().split("T")[0],
        description: "",
      })

      onSuccess()
      onOpenChange(false)
    } catch (error: any) {
      console.error("Error adding calling record:", error)
      toast.error(error.message || "Failed to add calling record")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Calling Record</DialogTitle>
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
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Enter call details"
              rows={4}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="bg-primary text-primary-foreground">
              {loading ? "Adding..." : "Add Record"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
