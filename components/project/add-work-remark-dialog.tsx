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
import type { WorkRemark } from "@/lib/types"

interface AddWorkRemarkDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  nextSrNo: number
  remark?: WorkRemark | null
  onSuccess: () => void
}

export function AddWorkRemarkDialog({ open, onOpenChange, projectId, nextSrNo, remark, onSuccess }: AddWorkRemarkDialogProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split("T")[0],
    remark: "",
  })

  useEffect(() => {
    if (remark) {
      setFormData({
        date: remark.date ? remark.date.split("T")[0] : new Date().toISOString().split("T")[0],
        remark: remark.remark || "",
      })
    } else {
      setFormData({
        date: new Date().toISOString().split("T")[0],
        remark: "",
      })
    }
  }, [remark, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const supabase = createClient()
      const payload = {
        project_id: projectId,
        sr_no: remark ? remark.sr_no : nextSrNo,
        date: formData.date,
        remark: formData.remark || null,
      }

      if (remark) {
        const { error } = await supabase
          .from("work_remarks")
          .update(payload)
          .eq("id", remark.id)

        if (error) throw error
        toast.success("Work remark updated successfully")
      } else {
        const { error } = await supabase
          .from("work_remarks")
          .insert(payload)

        if (error) throw error
        toast.success("Work remark added successfully")
      }

      onSuccess()
      onOpenChange(false)
    } catch (error: any) {
      console.error("Error saving work remark:", error)
      toast.error(error.message || "Failed to save work remark")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{remark ? "Edit Work Remark" : "Add Work Remark"}</DialogTitle>
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
            <Label htmlFor="remark">Remark</Label>
            <Textarea
              id="remark"
              value={formData.remark}
              onChange={(e) => setFormData({ ...formData, remark: e.target.value })}
              placeholder="Enter work remark"
              rows={4}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="bg-primary text-primary-foreground font-bold">
              {loading ? (remark ? "Saving..." : "Adding...") : (remark ? "Save Changes" : "Add Remark")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
