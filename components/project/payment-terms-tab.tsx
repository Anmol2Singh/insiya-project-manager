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
import { Progress } from "@/components/ui/progress"
import type { PaymentTerm } from "@/lib/types"
import { AddPaymentTermDialog } from "./add-payment-term-dialog"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"

interface PaymentTermsTabProps {
  terms: PaymentTerm[]
  projectId: string
  orderValue: number
  onRefresh: () => void
}

export function PaymentTermsTab({ terms, projectId, orderValue, onRefresh }: PaymentTermsTabProps) {
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [editingTerm, setEditingTerm] = useState<PaymentTerm | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const formatCurrency = (value: number | null) => {
    if (value === null) return "-"
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  const handleDelete = async (termId: string) => {
    if (!confirm("Are you sure you want to delete this payment term?")) return

    setDeletingId(termId)
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from("payment_terms")
        .delete()
        .eq("id", termId)

      if (error) throw error

      toast.success("Payment term deleted successfully")
      onRefresh()
    } catch (error: any) {
      console.error("Error deleting payment term:", error)
      toast.error(error.message || "Failed to delete payment term")
    } finally {
      setDeletingId(null)
    }
  }

  // Calculate totals
  const totals = terms.reduce(
    (acc, term) => ({
      percentage: acc.percentage + (term.term_percentage || 0),
      amount: acc.amount + (term.amount || 0),
      received: acc.received + (term.received_amount || 0),
      pending: acc.pending + (term.pending_amount || 0),
    }),
    { percentage: 0, amount: 0, received: 0, pending: 0 }
  )

  const receivedPercentage = totals.amount > 0 ? (totals.received / totals.amount) * 100 : 0

  return (
    <>
      <Card className="border-0 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-lg font-semibold">Payment Terms</CardTitle>
            <div className="flex items-center gap-4 mt-2">
              <div className="flex-1 max-w-xs">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-muted-foreground">Collection Progress</span>
                  <span className="font-medium">{receivedPercentage.toFixed(0)}%</span>
                </div>
                <Progress value={receivedPercentage} className="h-2" />
              </div>
            </div>
          </div>
          <Button size="sm" onClick={() => { setEditingTerm(null); setShowAddDialog(true) }} className="bg-primary text-primary-foreground font-bold">
            <Plus className="h-4 w-4 mr-2" />
            Add Term
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {/* Desktop Table */}
          <div className="hidden lg:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-warning/30 hover:bg-warning/30">
                  <TableHead className="font-semibold text-foreground">Payment Term</TableHead>
                  <TableHead className="font-semibold text-foreground text-right">Term %</TableHead>
                  <TableHead className="font-semibold text-foreground text-right">Amount</TableHead>
                  <TableHead className="font-semibold text-foreground text-right">Received</TableHead>
                  <TableHead className="font-semibold text-foreground text-right">Pending</TableHead>
                  <TableHead className="font-semibold text-foreground">Remark</TableHead>
                  <TableHead className="font-semibold text-foreground text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {terms.map((term, index) => {
                  return (
                    <TableRow key={term.id || `term-${index}`} className="hover:bg-muted/30 group">
                      <TableCell className="font-medium">{term.payment_term}</TableCell>
                      <TableCell className="text-right">
                        {term.term_percentage ? `${term.term_percentage}%` : "-"}
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(term.amount)}</TableCell>
                      <TableCell className="text-right text-success font-medium">
                        {formatCurrency(term.received_amount)}
                      </TableCell>
                      <TableCell className={`text-right ${(term.pending_amount || 0) > 0 ? "text-destructive font-medium" : ""}`}>
                        {formatCurrency(term.pending_amount)}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate text-muted-foreground">
                        {term.remark || "-"}
                      </TableCell>
                      <TableCell className="text-right pr-2">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-primary hover:bg-primary/10"
                            onClick={() => setEditingTerm(term)}
                            title="Edit term"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:bg-destructive/10"
                            onClick={() => handleDelete(term.id)}
                            disabled={deletingId === term.id}
                            title="Delete term"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
                {terms.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No payment terms defined
                    </TableCell>
                  </TableRow>
                )}
                {/* Totals Row */}
                {terms.length > 0 && (
                  <TableRow className="bg-warning/20 font-semibold hover:bg-warning/20">
                    <TableCell>Total</TableCell>
                    <TableCell className="text-right">{totals.percentage}%</TableCell>
                    <TableCell className="text-right">{formatCurrency(totals.amount)}</TableCell>
                    <TableCell className="text-right text-success">{formatCurrency(totals.received)}</TableCell>
                    <TableCell className={`text-right ${totals.pending > 0 ? "text-destructive" : ""}`}>
                      {formatCurrency(totals.pending)}
                    </TableCell>
                    <TableCell></TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Cards */}
          <div className="lg:hidden divide-y divide-border">
            {terms.map((term, index) => {
              const progressPct = term.amount && term.received_amount
                ? (term.received_amount / term.amount) * 100
                : 0
              return (
                <div key={term.id || `m-term-${index}`} className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-foreground">{term.payment_term}</h4>
                    <div className="flex items-center gap-2">
                      {term.term_percentage && (
                        <span className="text-sm text-muted-foreground">{term.term_percentage}%</span>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-primary"
                        onClick={() => setEditingTerm(term)}
                        title="Edit term"
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive"
                        onClick={() => handleDelete(term.id)}
                        disabled={deletingId === term.id}
                        title="Delete term"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <Progress value={progressPct} className="h-2" />
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">Amount</p>
                      <p className="font-medium">{formatCurrency(term.amount)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Received</p>
                      <p className="font-medium text-success">{formatCurrency(term.received_amount)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Pending</p>
                      <p className={`font-medium ${(term.pending_amount || 0) > 0 ? "text-destructive" : ""}`}>
                        {formatCurrency(term.pending_amount)}
                      </p>
                    </div>
                  </div>
                  {term.remark && (
                    <p className="text-sm text-muted-foreground">{term.remark}</p>
                  )}
                </div>
              )
            })}
            {terms.length === 0 && (
              <div className="p-8 text-center text-muted-foreground">
                No payment terms defined
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <AddPaymentTermDialog
        open={showAddDialog || !!editingTerm}
        onOpenChange={(open) => {
          if (!open) setEditingTerm(null)
          setShowAddDialog(open && !editingTerm)
        }}
        projectId={projectId}
        orderValue={orderValue}
        existingTerms={terms}
        term={editingTerm}
        onSuccess={onRefresh}
      />
    </>
  )
}
