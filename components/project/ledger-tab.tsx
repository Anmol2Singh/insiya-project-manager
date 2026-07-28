"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Plus, Trash2, Edit2, Calendar, CreditCard, FileText } from "lucide-react"
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
import { Badge } from "@/components/ui/badge"
import type { LedgerEntry } from "@/lib/types"
import { AddLedgerDialog } from "./add-ledger-dialog"
import { createClient } from "@/lib/supabase/client"
import { syncProjectTotals } from "@/lib/project-utils"
import { toast } from "sonner"

interface LedgerTabProps {
  entries: LedgerEntry[]
  projectId: string
  onRefresh: () => void
}

export function LedgerTab({ entries, projectId, onRefresh }: LedgerTabProps) {
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [editingEntry, setEditingEntry] = useState<LedgerEntry | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value)
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
  }

  const handleDelete = async (entryId: string) => {
    if (!confirm("Are you sure you want to delete this entry?")) return

    setDeletingId(entryId)
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from("ledger_entries")
        .delete()
        .eq("id", entryId)

      if (error) throw error

      await syncProjectTotals(projectId)
      toast.success("Entry deleted successfully")
      onRefresh()
    } catch (error: any) {
      console.error("Error deleting entry:", error)
      toast.error("Failed to delete entry")
    } finally {
      setDeletingId(null)
    }
  }

  // Calculate totals
  const totals = entries.reduce(
    (acc, entry) => ({
      salesMValue: acc.salesMValue + entry.sales_m_value,
      mOutwardValue: acc.mOutwardValue + entry.m_outward_value,
      orderValue: acc.orderValue + entry.order_value,
      extraWorkValue: acc.extraWorkValue + entry.extra_work_value,
      paymentReceived: acc.paymentReceived + entry.payment_received,
    }),
    { salesMValue: 0, mOutwardValue: 0, orderValue: 0, extraWorkValue: 0, paymentReceived: 0 }
  )

  const finalBalance = totals.orderValue + totals.extraWorkValue - totals.paymentReceived
  const finalMBalance = totals.salesMValue - totals.mOutwardValue

  return (
    <>
      <Card className="border-0 shadow-lg bg-card/50 backdrop-blur-sm overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between border-b bg-muted/30 pb-4">
          <div>
            <CardTitle className="text-xl font-bold tracking-tight">Ledger Records</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">Detailed financial history for this project</p>
          </div>
          <Button size="sm" onClick={() => setShowAddDialog(true)} className="bg-primary text-primary-foreground shadow-md hover:scale-105 transition-transform">
            <Plus className="h-4 w-4 mr-2" />
            Add New Entry
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {/* Desktop Table */}
          <div className="hidden lg:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50 border-b">
                  <TableHead className="font-bold text-foreground w-12 text-center uppercase text-[10px] tracking-widest">Sr</TableHead>
                  <TableHead className="font-bold text-foreground uppercase text-[10px] tracking-widest">Date</TableHead>
                  <TableHead className="font-bold text-foreground uppercase text-[10px] tracking-widest">Type</TableHead>
                  <TableHead className="font-bold text-foreground uppercase text-[10px] tracking-widest">Particulars</TableHead>
                  <TableHead className="font-bold text-foreground text-center uppercase text-[10px] tracking-widest">Bill</TableHead>
                  <TableHead className="font-bold text-foreground text-right bg-warning/10 uppercase text-[10px] tracking-widest">Sales M</TableHead>
                  <TableHead className="font-bold text-foreground text-right bg-warning/10 uppercase text-[10px] tracking-widest">M Outward</TableHead>
                  <TableHead className="font-bold text-foreground text-right bg-info/10 uppercase text-[10px] tracking-widest">Order Val</TableHead>
                  <TableHead className="font-bold text-foreground text-right bg-info/10 uppercase text-[10px] tracking-widest">Extra Wrk</TableHead>
                  <TableHead className="font-bold text-foreground text-right bg-success/10 uppercase text-[10px] tracking-widest">Received</TableHead>
                  <TableHead className="font-bold text-foreground text-right uppercase text-[10px] tracking-widest">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <AnimatePresence mode="popLayout">
                  {entries.map((entry, index) => (
                    <motion.tr
                      key={entry.id || `entry-${index}`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.2, delay: index * 0.03 }}
                      className="hover:bg-muted/40 group border-b"
                    >
                      <TableCell className="text-center font-medium text-muted-foreground">{entry.sr_no}</TableCell>
                      <TableCell className="whitespace-nowrap font-medium">{formatDate(entry.date)}</TableCell>
                      <TableCell>
                        {entry.payment_type && (
                          <Badge variant="secondary" className="text-[10px] uppercase font-bold py-0 h-5 px-2 bg-secondary/50 text-secondary-foreground border-secondary">
                            {entry.payment_type}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate font-medium">{entry.particulars}</TableCell>
                      <TableCell className="text-center">
                        {entry.bill_submitted ? (
                          <div className="flex justify-center">
                            <Badge className="bg-success text-success-foreground text-[10px] h-5 py-0 px-2 font-bold uppercase rounded-full">Submitted</Badge>
                          </div>
                        ) : (
                          <div className="flex justify-center">
                            <Badge variant="outline" className="text-[10px] h-5 py-0 px-2 font-bold uppercase rounded-full border-muted-foreground/30 text-muted-foreground">Pending</Badge>
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right bg-warning/5 font-mono text-xs">{formatCurrency(entry.sales_m_value)}</TableCell>
                      <TableCell className="text-right bg-warning/5 font-mono text-xs">{formatCurrency(entry.m_outward_value)}</TableCell>
                      <TableCell className="text-right bg-info/5 font-mono text-xs">{formatCurrency(entry.order_value)}</TableCell>
                      <TableCell className="text-right bg-info/5 font-mono text-xs">{formatCurrency(entry.extra_work_value)}</TableCell>
                      <TableCell className="text-right bg-success/5 font-mono text-xs text-success font-semibold">{formatCurrency(entry.payment_received)}</TableCell>
                      <TableCell className="text-right pr-2 w-20">
                        <div className="flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-primary hover:bg-primary/10"
                            onClick={() => setEditingEntry(entry)}
                            title="Edit entry"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:bg-destructive/10"
                            onClick={() => handleDelete(entry.id)}
                            disabled={deletingId === entry.id}
                            title="Delete entry"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </motion.tr>
                  ))}
                </AnimatePresence>
                {entries.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center py-16 text-muted-foreground italic">
                      No ledger entries recorded for this project yet.
                    </TableCell>
                  </TableRow>
                )}
                {/* Totals Row */}
                {entries.length > 0 && (
                  <TableRow className="bg-muted/50 font-bold border-t-2">
                    <TableCell colSpan={5} className="text-right uppercase text-[10px] tracking-widest">Net Totals:</TableCell>
                    <TableCell className="text-right bg-warning/10 font-mono">{formatCurrency(totals.salesMValue)}</TableCell>
                    <TableCell className="text-right bg-warning/10 font-mono">{formatCurrency(totals.mOutwardValue)}</TableCell>
                    <TableCell className="text-right bg-info/10 font-mono">{formatCurrency(totals.orderValue)}</TableCell>
                    <TableCell className="text-right bg-info/10 font-mono">{formatCurrency(totals.extraWorkValue)}</TableCell>
                    <TableCell className="text-right bg-success/10 font-mono text-success">{formatCurrency(totals.paymentReceived)}</TableCell>
                    <TableCell className="bg-muted/50"></TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Cards */}
          <div className="lg:hidden divide-y divide-border">
            <AnimatePresence>
              {entries.map((entry, index) => (
                <motion.div
                  key={entry.id || `m-entry-${index}`}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ delay: index * 0.05 }}
                  className="p-4 space-y-4 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="h-6 w-6 rounded-full p-0 flex items-center justify-center font-bold text-[10px]">{entry.sr_no}</Badge>
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {formatDate(entry.date)}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {entry.payment_type && (
                        <Badge variant="secondary" className="text-[10px] font-bold uppercase px-1.5 h-5">{entry.payment_type}</Badge>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-primary"
                        onClick={() => setEditingEntry(entry)}
                        title="Edit entry"
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive"
                        onClick={() => handleDelete(entry.id)}
                        disabled={deletingId === entry.id}
                        title="Delete entry"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="bg-muted/40 p-3 rounded-lg border border-border/50">
                    <p className="text-sm font-medium leading-relaxed">{entry.particulars || "No particulars"}</p>
                    {entry.bill_submitted && (
                      <div className="mt-2 flex items-center gap-1 text-[10px] font-bold text-success uppercase">
                        <FileText className="h-3 w-3" />
                        Bill Submitted
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1 bg-warning/10 p-2 rounded-md border border-warning/20">
                      <p className="text-[9px] font-bold text-warning-foreground uppercase tracking-wider">Material</p>
                      <div className="flex justify-between items-baseline">
                        <span className="text-[10px] text-muted-foreground">S: {formatCurrency(entry.sales_m_value)}</span>
                        <span className="text-[10px] text-muted-foreground">O: {formatCurrency(entry.m_outward_value)}</span>
                      </div>
                    </div>
                    <div className="space-y-1 bg-info/10 p-2 rounded-md border border-info/20">
                      <p className="text-[9px] font-bold text-info-foreground uppercase tracking-wider">Order</p>
                      <p className="text-xs font-bold">{formatCurrency(entry.order_value + entry.extra_work_value)}</p>
                    </div>
                    <div className="space-y-1 bg-success/10 p-2 rounded-md border border-success/20">
                      <p className="text-[9px] font-bold text-success-foreground uppercase tracking-wider">Received</p>
                      <p className="text-xs font-bold text-success">{formatCurrency(entry.payment_received)}</p>
                    </div>
                    <div className="space-y-1 bg-muted p-2 rounded-md border">
                      <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Ref No</p>
                      <p className="text-[10px] font-medium truncate">{entry.reference_number || "-"}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            {entries.length === 0 && (
              <div className="p-12 text-center text-muted-foreground italic text-sm">
                No ledger entries yet
              </div>
            )}
          </div>
        </CardContent>
        {entries.length > 0 && (
          <div className="bg-primary/5 p-4 border-t flex items-center justify-between">
            <div className="flex gap-4">
              <div className="text-xs">
                <span className="text-muted-foreground font-medium uppercase tracking-tighter">Total Balance: </span>
                <span className={`font-bold ${finalBalance > 0 ? "text-success" : "text-destructive"}`}>{formatCurrency(finalBalance)}</span>
              </div>
              <div className="text-xs">
                <span className="text-muted-foreground font-medium uppercase tracking-tighter">Material Balance: </span>
                <span className="font-bold text-warning-foreground">{formatCurrency(finalMBalance)}</span>
              </div>
            </div>
          </div>
        )}
      </Card>

      <AddLedgerDialog
        open={showAddDialog || !!editingEntry}
        onOpenChange={(open) => {
          if (!open) {
            setEditingEntry(null)
          }
          setShowAddDialog(open && !editingEntry)
        }}
        projectId={projectId}
        nextSrNo={entries.length > 0 ? Math.max(...entries.map(e => e.sr_no)) + 1 : 1}
        entry={editingEntry}
        onSuccess={onRefresh}
      />
    </>
  )
}
