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
import type { Expense } from "@/lib/types"
import { AddExpenseDialog } from "./add-expense-dialog"

interface ExpensesTabProps {
  expenses: Expense[]
  projectId: string
  onRefresh: () => void
}

export function ExpensesTab({ expenses, projectId, onRefresh }: ExpensesTabProps) {
  const [showAddDialog, setShowAddDialog] = useState(false)

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
          <Button size="sm" onClick={() => setShowAddDialog(true)} className="bg-primary text-primary-foreground">
            <Plus className="h-4 w-4 mr-2" />
            Add Expense
          </Button>
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
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenses.map((expense) => (
                  <TableRow key={expense.id} className="hover:bg-muted/30">
                    <TableCell>{expense.sr_no}</TableCell>
                    <TableCell>{formatDate(expense.date)}</TableCell>
                    <TableCell>{expense.particular || "-"}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(expense.expense)}</TableCell>
                  </TableRow>
                ))}
                {expenses.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      No expenses recorded
                    </TableCell>
                  </TableRow>
                )}
                {/* Totals Row */}
                {expenses.length > 0 && (
                  <TableRow className="bg-warning/20 font-semibold hover:bg-warning/20">
                    <TableCell colSpan={3} className="text-right">Total:</TableCell>
                    <TableCell className="text-right">{formatCurrency(totalExpense)}</TableCell>
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
                <p className="font-semibold text-foreground">{formatCurrency(expense.expense)}</p>
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
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        projectId={projectId}
        nextSrNo={expenses.length + 1}
        onSuccess={onRefresh}
      />
    </>
  )
}
