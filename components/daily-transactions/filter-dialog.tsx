"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  DailyTransactionFilterState,
  INITIAL_FILTER_STATE,
} from "@/lib/daily-transaction-types"
import { getDailyDropdownOptions } from "@/lib/daily-transaction-store"
import { getDailyCompanies } from "@/lib/daily-company-store"
import { SearchableSelect } from "./searchable-select"
import { Filter, RotateCcw, Calendar, Check } from "lucide-react"

interface FilterDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentFilters: DailyTransactionFilterState
  onApply: (filters: DailyTransactionFilterState) => void
}

export function FilterDialog({
  open,
  onOpenChange,
  currentFilters,
  onApply,
}: FilterDialogProps) {
  const [filters, setFilters] = useState<DailyTransactionFilterState>(currentFilters)
  const [firmOptions, setFirmOptions] = useState<string[]>([])
  const [partyOptions, setPartyOptions] = useState<string[]>([])
  const [paymentOptions, setPaymentOptions] = useState<string[]>([])
  const [transactionOptions, setTransactionOptions] = useState<string[]>([])

  useEffect(() => {
    if (!open) return
    setFilters(currentFilters)

    const loadOptions = async () => {
      // 1. Load firms from daily company store
      const comps = getDailyCompanies()
      const firmNames = comps.map((c) => c.name)
      setFirmOptions(firmNames)

      // 2. Load dropdowns
      const [cp, dp, pm, ct, dt] = await Promise.all([
        getDailyDropdownOptions("parties_credit"),
        getDailyDropdownOptions("parties_debit"),
        getDailyDropdownOptions("payment_modes"),
        getDailyDropdownOptions("transactions_credit"),
        getDailyDropdownOptions("transactions_debit"),
      ])
      const uniqueParties = Array.from(new Set([...cp, ...dp]))
      const uniqueTransactions = Array.from(new Set([...ct, ...dt]))

      setPartyOptions(uniqueParties)
      setPaymentOptions(pm)
      setTransactionOptions(uniqueTransactions)
    }
    loadOptions()
  }, [open, currentFilters])

  const handleReset = () => {
    setFilters(INITIAL_FILTER_STATE)
    onApply(INITIAL_FILTER_STATE)
    onOpenChange(false)
  }

  const handleApply = () => {
    onApply(filters)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl rounded-3xl p-6 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold flex items-center gap-2">
            <span className="p-2 rounded-xl bg-primary/10 text-primary">
              <Filter className="h-5 w-5" />
            </span>
            Filter Transactions
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Date Range */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
            <div className="space-y-1 w-full">
              <Label className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3" /> From Date
              </Label>
              <Input
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                className="rounded-xl h-10 w-full"
              />
            </div>
            <div className="space-y-1 w-full">
              <Label className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3" /> To Date
              </Label>
              <Input
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                className="rounded-xl h-10 w-full"
              />
            </div>
          </div>

          {/* Payment Flow: All, Credit, Debit */}
          <div className="space-y-1.5 w-full">
            <Label className="text-xs font-semibold text-muted-foreground">
              Payment Flow
            </Label>
            <div className="grid grid-cols-3 gap-2 w-full">
              {[
                { id: "ALL", label: "All" },
                { id: "credit", label: "Credit Only" },
                { id: "debit", label: "Debit Only" },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setFilters({ ...filters, flowType: item.id })}
                  className={`p-2.5 rounded-xl border text-xs font-bold transition-all ${
                    filters.flowType === item.id
                      ? "bg-primary text-primary-foreground border-primary shadow-sm"
                      : "bg-card border-border text-muted-foreground hover:border-primary/40"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Entry Nature: All, Purchase, Expense, Sale */}
          <div className="space-y-1.5 w-full">
            <Label className="text-xs font-semibold text-muted-foreground">
              Entry Nature
            </Label>
            <div className="grid grid-cols-4 gap-2 w-full">
              {[
                { id: "ALL", label: "All" },
                { id: "Purchase", label: "Purchase" },
                { id: "Expense", label: "Expense" },
                { id: "Sale", label: "Sale" },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setFilters({ ...filters, entryNature: item.id })}
                  className={`p-2 rounded-xl border text-xs font-bold transition-all ${
                    filters.entryNature === item.id
                      ? "bg-primary text-primary-foreground border-primary shadow-sm"
                      : "bg-card border-border text-muted-foreground hover:border-primary/40"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Firm Name & Payment Mode (Searchable, in single horizontal line) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
            {/* Firm Name */}
            <div className="space-y-1 w-full">
              <Label className="text-xs font-semibold text-muted-foreground">Firm Name</Label>
              <SearchableSelect
                value={filters.firmName}
                onValueChange={(val) => setFilters({ ...filters, firmName: val })}
                options={firmOptions}
                placeholder="All Firms"
                allOptionLabel="All Firms"
                allOptionValue="ALL"
                searchPlaceholder="Search firm..."
              />
            </div>

            {/* Payment Mode */}
            <div className="space-y-1 w-full">
              <Label className="text-xs font-semibold text-muted-foreground">Payment Mode</Label>
              <SearchableSelect
                value={filters.paymentMode}
                onValueChange={(val) => setFilters({ ...filters, paymentMode: val })}
                options={paymentOptions}
                placeholder="All Payment Modes"
                allOptionLabel="All Payment Modes"
                allOptionValue="ALL"
                searchPlaceholder="Search payment mode..."
              />
            </div>
          </div>

          {/* Party Name (Searchable, entirely single line, full width) */}
          <div className="space-y-1 w-full">
            <Label className="text-xs font-semibold text-muted-foreground">Party Name</Label>
            <SearchableSelect
              value={filters.partyName}
              onValueChange={(val) => setFilters({ ...filters, partyName: val })}
              options={partyOptions}
              placeholder="All Parties"
              allOptionLabel="All Parties"
              allOptionValue="ALL"
              searchPlaceholder="Search party..."
            />
          </div>

          {/* Transaction Type (Searchable, entirely single line, full width) */}
          <div className="space-y-1 w-full">
            <Label className="text-xs font-semibold text-muted-foreground">Transaction Type</Label>
            <SearchableSelect
              value={filters.transactionName}
              onValueChange={(val) => setFilters({ ...filters, transactionName: val })}
              options={transactionOptions}
              placeholder="All Transaction Types"
              allOptionLabel="All Transaction Types"
              allOptionValue="ALL"
              searchPlaceholder="Search transaction type..."
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0 pt-2 flex flex-row items-center justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={handleReset}
            className="rounded-xl font-bold gap-1 text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="h-4 w-4" /> Reset Filters
          </Button>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="rounded-xl font-bold"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleApply}
              className="rounded-xl font-bold bg-primary text-primary-foreground gap-1"
            >
              <Check className="h-4 w-4" /> Apply Filters
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
