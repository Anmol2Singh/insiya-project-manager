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
import type { Expense } from "@/lib/types"
import { AddExpenseDialog } from "./add-expense-dialog"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { hasEditPermission } from "@/lib/auth-store"

interface ExpensesTabProps {
  expenses: Expense[]
  projectId: string
  onRefresh: () => void
}

export function ExpensesTab({ expenses, projectId, onRefresh }: ExpensesTabProps) {
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [canEdit, setCanEdit] = useState(false)

  useState(() => {
    setCanEdit(hasEditPermission())
  })

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
  }

  const handleDelete = async (expenseId: string) => {
    if (!confirm("Are you sure you want to delete this expense?")) return

    setDeletingId(expenseId)
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from("expenses")
        .delete()
        .eq("id", expenseId)

      if (error) throw error

      toast.success("Expense deleted successfully")
      onRefresh()
    } catch (error: any) {
      console.error("Error deleting expense:", error)
      toast.error(error.message || "Failed to delete expense")
    } finally {
      setDeletingId(null)
    }
  }

  const totalExpense = expenses.reduce((sum, exp) => sum + exp.expense, 0)

  return (
    <>
      <Card className="border-0 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-lg font-semibold">Expenses</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Total: <span className="font-semibold text-foreground">{formatCurrency(totalExpense)}</span>
            </p>
          </div>
          {canEdit && (
            <Button size="sm" onClick={() => { setEditingExpense(null); setShowAddDialog(true) }} className="bg-primary text-primary-foreground font-bold">
              <Plus className="h-4 w-4 mr-2" />
              Add Expense
            </Button>
          )}
        </CardHeader>
        <CardContent className="p-0">
          {/* Desktop Table */}
          <div className="hidden lg:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-warning/30 hover:bg-warning/30">
                  <TableHead className="font-semibold text-foreground w-16">Sr. No</TableHead>
                  <TableHead className="font-semibold text-foreground">Date</TableHead>
                  <TableHead className="font-semibold text-foreground">Particular</TableHead>
                  <TableHead className="font-semibold text-foreground text-right">Expense</TableHead>
                  {canEdit && <TableHead className="font-semibold text-foreground text-right">Action</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenses.map((expense) => (
                  <TableRow key={expense.id} className="hover:bg-muted/30 group">
                    <TableCell>{expense.sr_no}</TableCell>
                    <TableCell>{formatDate(expense.date)}</TableCell>
                    <TableCell>{expense.particular || "-"}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(expense.expense)}</TableCell>
                    {canEdit && (
                      <TableCell className="text-right pr-2">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-primary hover:bg-primary/10"
                            onClick={() => setEditingExpense(expense)}
                            title="Edit expense"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:bg-destructive/10"
                            onClick={() => handleDelete(expense.id)}
                            disabled={deletingId === expense.id}
                            title="Delete expense"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
                {expenses.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      No expenses recorded
                    </TableCell>
                  </TableRow>
                )}
                {/* Totals Row */}
                {expenses.length > 0 && (
                  <TableRow className="bg-warning/20 font-semibold hover:bg-warning/20">
                    <TableCell colSpan={3} className="text-right">Total:</TableCell>
                    <TableCell className="text-right">{formatCurrency(totalExpense)}</TableCell>
                    {canEdit && <TableCell></TableCell>}
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Cards */}
          <div className="lg:hidden divide-y divide-border">
            {expenses.map((expense) => (
              <div key={expense.id} className="p-4 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">#{expense.sr_no}</span>
                    <span className="text-sm">{formatDate(expense.date)}</span>
                  </div>
                  <p className="font-medium text-foreground mt-1">{expense.particular || "No description"}</p>
                </div>
                <div className="flex items-center gap-3">
                  <p className="font-semibold text-foreground">{formatCurrency(expense.expense)}</p>
                  {canEdit && (
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-primary"
                        onClick={() => setEditingExpense(expense)}
                        title="Edit expense"
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive"
                        onClick={() => handleDelete(expense.id)}
                        disabled={deletingId === expense.id}
                        title="Delete expense"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {expenses.length === 0 && (
              <div className="p-8 text-center text-muted-foreground">
                No expenses recorded
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <AddExpenseDialog
        open={showAddDialog || !!editingExpense}
        onOpenChange={(open) => {
          if (!open) setEditingExpense(null)
          setShowAddDialog(open && !editingExpense)
        }}
        projectId={projectId}
        nextSrNo={expenses.length + 1}
        expense={editingExpense}
        onSuccess={onRefresh}
      />
    </>
  )
}
