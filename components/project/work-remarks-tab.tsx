"use client"

import { useState } from "react"
import { Plus } from "lucide-react"
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

interface WorkRemarksTabProps {
  remarks: WorkRemark[]
  projectId: string
  onRefresh: () => void
}

export function WorkRemarksTab({ remarks, projectId, onRefresh }: WorkRemarksTabProps) {
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
          <CardTitle className="text-lg font-semibold">Work Remarks</CardTitle>
          <Button size="sm" onClick={() => setShowAddDialog(true)} className="bg-primary text-primary-foreground">
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
                </TableRow>
              </TableHeader>
              <TableBody>
                {remarks.map((remark) => (
                  <TableRow key={remark.id} className="hover:bg-muted/30">
                    <TableCell>{remark.sr_no}</TableCell>
                    <TableCell>{formatDate(remark.date)}</TableCell>
                    <TableCell>{remark.remark || "-"}</TableCell>
                  </TableRow>
                ))}
                {remarks.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
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
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-medium text-muted-foreground">#{remark.sr_no}</span>
                  <span className="text-sm">{formatDate(remark.date)}</span>
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
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        projectId={projectId}
        nextSrNo={remarks.length + 1}
        onSuccess={onRefresh}
      />
    </>
  )
}
