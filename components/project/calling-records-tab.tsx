"use client"

import { useState } from "react"
import { Plus, Phone, Edit2, Trash2 } from "lucide-react"
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
import type { CallingRecord } from "@/lib/types"
import { AddCallingRecordDialog } from "./add-calling-record-dialog"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { hasEditPermission } from "@/lib/auth-store"

interface CallingRecordsTabProps {
  records: CallingRecord[]
  projectId: string
  onRefresh: () => void
}

export function CallingRecordsTab({ records, projectId, onRefresh }: CallingRecordsTabProps) {
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [editingRecord, setEditingRecord] = useState<CallingRecord | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [canEdit, setCanEdit] = useState(false)

  useState(() => {
    setCanEdit(hasEditPermission())
  })

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
  }

  const handleDelete = async (recordId: string) => {
    if (!confirm("Are you sure you want to delete this calling record?")) return

    setDeletingId(recordId)
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from("calling_records")
        .delete()
        .eq("id", recordId)

      if (error) throw error

      toast.success("Calling record deleted successfully")
      onRefresh()
    } catch (error: any) {
      console.error("Error deleting calling record:", error)
      toast.error(error.message || "Failed to delete calling record")
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <>
      <Card className="border-0 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div className="flex items-center gap-2">
            <Phone className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg font-semibold">Calling Records</CardTitle>
          </div>
          {canEdit && (
            <Button size="sm" onClick={() => { setEditingRecord(null); setShowAddDialog(true) }} className="bg-primary text-primary-foreground font-bold">
              <Plus className="h-4 w-4 mr-2" />
              Add Record
            </Button>
          )}
        </CardHeader>
        <CardContent className="p-0">
          {/* Desktop Table */}
          <div className="hidden lg:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-warning/30 hover:bg-warning/30">
                  <TableHead className="font-semibold text-foreground w-16">S No</TableHead>
                  <TableHead className="font-semibold text-foreground w-32">Date</TableHead>
                  <TableHead className="font-semibold text-foreground">Description</TableHead>
                  {canEdit && <TableHead className="font-semibold text-foreground text-right">Action</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((record) => (
                  <TableRow key={record.id} className="hover:bg-muted/30 group">
                    <TableCell>{record.sr_no}</TableCell>
                    <TableCell>{formatDate(record.date)}</TableCell>
                    <TableCell>{record.description || "-"}</TableCell>
                    {canEdit && (
                      <TableCell className="text-right pr-2">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-primary hover:bg-primary/10"
                            onClick={() => setEditingRecord(record)}
                            title="Edit record"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:bg-destructive/10"
                            onClick={() => handleDelete(record.id)}
                            disabled={deletingId === record.id}
                            title="Delete record"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
                {records.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      No calling records yet
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Cards */}
          <div className="lg:hidden divide-y divide-border">
            {records.map((record) => (
              <div key={record.id} className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-muted-foreground">#{record.sr_no}</span>
                    <span className="text-sm">{formatDate(record.date)}</span>
                  </div>
                  {canEdit && (
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-primary"
                        onClick={() => setEditingRecord(record)}
                        title="Edit record"
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive"
                        onClick={() => handleDelete(record.id)}
                        disabled={deletingId === record.id}
                        title="Delete record"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
                <p className="text-foreground">{record.description || "No description"}</p>
              </div>
            ))}
            {records.length === 0 && (
              <div className="p-8 text-center text-muted-foreground">
                No calling records yet
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <AddCallingRecordDialog
        open={showAddDialog || !!editingRecord}
        onOpenChange={(open) => {
          if (!open) setEditingRecord(null)
          setShowAddDialog(open && !editingRecord)
        }}
        projectId={projectId}
        nextSrNo={records.length + 1}
        record={editingRecord}
        onSuccess={onRefresh}
      />
    </>
  )
}
