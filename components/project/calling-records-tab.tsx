"use client"

import { useState } from "react"
import { Plus, Phone } from "lucide-react"
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

interface CallingRecordsTabProps {
  records: CallingRecord[]
  projectId: string
  onRefresh: () => void
}

export function CallingRecordsTab({ records, projectId, onRefresh }: CallingRecordsTabProps) {
  const [showAddDialog, setShowAddDialog] = useState(false)

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
  }

  return (
    <>
      <Card className="border-0 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div className="flex items-center gap-2">
            <Phone className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg font-semibold">Calling Records</CardTitle>
          </div>
          <Button size="sm" onClick={() => setShowAddDialog(true)} className="bg-primary text-primary-foreground">
            <Plus className="h-4 w-4 mr-2" />
            Add Record
          </Button>
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
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((record) => (
                  <TableRow key={record.id} className="hover:bg-muted/30">
                    <TableCell>{record.sr_no}</TableCell>
                    <TableCell>{formatDate(record.date)}</TableCell>
                    <TableCell>{record.description || "-"}</TableCell>
                  </TableRow>
                ))}
                {records.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
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
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-medium text-muted-foreground">#{record.sr_no}</span>
                  <span className="text-sm">{formatDate(record.date)}</span>
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
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        projectId={projectId}
        nextSrNo={records.length + 1}
        onSuccess={onRefresh}
      />
    </>
  )
}
