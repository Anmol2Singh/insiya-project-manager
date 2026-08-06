"use client"

import { useState } from "react"
import { Plus, Edit2, Trash2 } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { WorkRemark } from "@/lib/types"
import { AddWorkRemarkDialog } from "./add-work-remark-dialog"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"

interface WorkRemarksTabProps {
  remarks: WorkRemark[]
  projectId: string
  onRefresh: () => void
}

export function WorkRemarksTab({ remarks, projectId, onRefresh }: WorkRemarksTabProps) {
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [editingRemark, setEditingRemark] = useState<WorkRemark | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
  }

  const handleDelete = async (remarkId: string) => {
    if (!confirm("Are you sure you want to delete this work remark?")) return

    setDeletingId(remarkId)
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from("work_remarks")
        .delete()
        .eq("id", remarkId)

      if (error) throw error

      toast.success("Work remark deleted successfully")
      onRefresh()
    } catch (error: any) {
      console.error("Error deleting work remark:", error)
      toast.error(error.message || "Failed to delete work remark")
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <>
      <Card className="border-0 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-lg font-semibold">Work Remarks</CardTitle>
          <Button size="sm" onClick={() => { setEditingRemark(null); setShowAddDialog(true) }} className="bg-primary text-primary-foreground font-bold">
            <Plus className="h-4 w-4 mr-2" />
            Add Remark
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {/* Desktop Table */}
          <div className="hidden lg:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-foreground hover:bg-foreground">
                  <TableHead className="font-semibold text-background w-16">Sr No</TableHead>
                  <TableHead className="font-semibold text-background w-32">Date</TableHead>
                  <TableHead className="font-semibold text-background">Remark</TableHead>
                  <TableHead className="font-semibold text-background text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {remarks.map((remark) => (
                  <TableRow key={remark.id} className="hover:bg-muted/30 group">
                    <TableCell>{remark.sr_no}</TableCell>
                    <TableCell>{formatDate(remark.date)}</TableCell>
                    <TableCell>{remark.remark || "-"}</TableCell>
                    <TableCell className="text-right pr-2">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-primary hover:bg-primary/10"
                          onClick={() => setEditingRemark(remark)}
                          title="Edit remark"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:bg-destructive/10"
                          onClick={() => handleDelete(remark.id)}
                          disabled={deletingId === remark.id}
                          title="Delete remark"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {remarks.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      No work remarks yet
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Cards */}
          <div className="lg:hidden divide-y divide-border">
            {remarks.map((remark) => (
              <div key={remark.id} className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-muted-foreground">#{remark.sr_no}</span>
                    <span className="text-sm">{formatDate(remark.date)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-primary"
                      onClick={() => setEditingRemark(remark)}
                      title="Edit remark"
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive"
                      onClick={() => handleDelete(remark.id)}
                      disabled={deletingId === remark.id}
                      title="Delete remark"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <p className="text-foreground">{remark.remark || "No remark"}</p>
              </div>
            ))}
            {remarks.length === 0 && (
              <div className="p-8 text-center text-muted-foreground">
                No work remarks yet
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <AddWorkRemarkDialog
        open={showAddDialog || !!editingRemark}
        onOpenChange={(open) => {
          if (!open) setEditingRemark(null)
          setShowAddDialog(open && !editingRemark)
        }}
        projectId={projectId}
        nextSrNo={remarks.length + 1}
        remark={editingRemark}
        onSuccess={onRefresh}
      />
    </>
  )
}
