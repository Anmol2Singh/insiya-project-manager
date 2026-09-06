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
  DailyTransaction,
  EntryNature,
  TransactionFlow,
} from "@/lib/daily-transaction-types"
import {
  getDailyDropdownOptions,
  saveDailyDropdownOptions,
  upsertDailyTransaction,
  DailyDropdownKey,
} from "@/lib/daily-transaction-store"
import { DropdownManagerDialog } from "./dropdown-manager-dialog"
import { SearchableSelect } from "./searchable-select"
import {
  Calendar,
  IndianRupee,
  Settings2,
  CheckCircle2,
  ArrowDownLeft,
  ArrowUpRight,
  Hash,
  ShoppingBag,
  TrendingUp,
  Receipt,
  MessageSquare,
} from "lucide-react"
import { toast } from "sonner"

interface EntryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  transaction: DailyTransaction | null
  companyId: string
  companyName: string
  nextSrNo: number
  onSuccess: () => void
}

// Indian currency comma formatter helper
function formatIndianCurrency(val: string | number): string {
  if (val === "" || val === undefined || val === null) return ""
  const cleanStr = String(val).replace(/[^0-9.]/g, "")
  if (!cleanStr) return ""

  const parts = cleanStr.split(".")
  let integerPart = parts[0]
  const decimalPart = parts.length > 1 ? "." + parts[1].slice(0, 2) : ""

  if (!integerPart) return decimalPart ? "0" + decimalPart : ""

  // Indian format: last 3 digits, then groups of 2 digits
  let lastThree = integerPart.substring(integerPart.length - 3)
  const otherNumbers = integerPart.substring(0, integerPart.length - 3)
  if (otherNumbers !== "") {
    lastThree = "," + lastThree
  }
  const formattedInt =
    otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + lastThree

  return formattedInt + decimalPart
}

function parseFormattedNumber(val: string): number {
  if (!val) return 0
  const clean = val.replace(/,/g, "").trim()
  const num = parseFloat(clean)
  return isNaN(num) ? 0 : num
}

export function EntryDialog({
  open,
  onOpenChange,
  transaction,
  companyId,
  companyName,
  nextSrNo,
  onSuccess,
}: EntryDialogProps) {
  const isEdit = !!transaction

  // Form states
  const [srNo, setSrNo] = useState<number>(nextSrNo)
  const [date, setDate] = useState<string>(() => new Date().toISOString().split("T")[0])
  const [flowType, setFlowType] = useState<TransactionFlow>("credit")
  const [partyName, setPartyName] = useState<string>("")
  const [paymentMode, setPaymentMode] = useState<string>("")
  const [transactionName, setTransactionName] = useState<string>("")
  const [entryNature, setEntryNature] = useState<EntryNature>("Purchase")
  const [rawAmountInput, setRawAmountInput] = useState<string>("")
  const [remark, setRemark] = useState<string>("")
  const [isSaving, setIsSaving] = useState(false)

  // Dropdown lists
  const [paymentOptions, setPaymentOptions] = useState<string[]>([])
  const [creditParties, setCreditParties] = useState<string[]>([])
  const [debitParties, setDebitParties] = useState<string[]>([])
  const [creditTransactions, setCreditTransactions] = useState<string[]>([])
  const [debitTransactions, setDebitTransactions] = useState<string[]>([])

  // Active party and transaction options based on flowType
  const currentPartyOptions = flowType === "credit" ? creditParties : debitParties
  const currentTransactionOptions = flowType === "credit" ? creditTransactions : debitTransactions

  // Inline dropdown manager modal state
  const [managerModal, setManagerModal] = useState<{
    open: boolean
    key: DailyDropdownKey
    title: string
    options: string[]
  }>({
    open: false,
    key: "payment_modes",
    title: "",
    options: [],
  })

  // Load dropdown lists on open
  useEffect(() => {
    if (!open) return
    const loadDropdowns = async () => {
      const [pm, cp, dp, ct, dt] = await Promise.all([
        getDailyDropdownOptions("payment_modes"),
        getDailyDropdownOptions("parties_credit"),
        getDailyDropdownOptions("parties_debit"),
        getDailyDropdownOptions("transactions_credit"),
        getDailyDropdownOptions("transactions_debit"),
      ])
      setPaymentOptions(pm)
      setCreditParties(cp)
      setDebitParties(dp)
      setCreditTransactions(ct)
      setDebitTransactions(dt)

      if (transaction) {
        setSrNo(transaction.sr_no)
        setDate(transaction.date ? transaction.date.split("T")[0] : new Date().toISOString().split("T")[0])
        const flow = transaction.type || (transaction.debit_amount > 0 ? "debit" : "credit")
        setFlowType(flow)
        setPartyName(transaction.party_name || "")
        setPaymentMode(transaction.payment_mode || (pm[0] || ""))
        setTransactionName(transaction.transaction_name || "")
        setEntryNature(transaction.entry_nature || "Purchase")
        setRemark(transaction.remark || "")
        const amt = flow === "debit" || transaction.debit_amount > 0
          ? transaction.debit_amount
          : transaction.credit_amount
        setRawAmountInput(amt > 0 ? formatIndianCurrency(amt) : "")
      } else {
        setSrNo(nextSrNo)
        setDate(new Date().toISOString().split("T")[0])
        setFlowType("credit")
        setPartyName(cp[0] || "")
        setPaymentMode(pm[0] || "")
        setTransactionName(ct[0] || "")
        setEntryNature("Purchase")
        setRawAmountInput("")
        setRemark("")
      }
    }
    loadDropdowns()
  }, [open, transaction, nextSrNo])

  // When switching between Credit and Debit, adjust selected party and transaction to match new list
  const handleFlowTypeChange = (newFlow: TransactionFlow) => {
    setFlowType(newFlow)
    const partyList = newFlow === "credit" ? creditParties : debitParties
    const transList = newFlow === "credit" ? creditTransactions : debitTransactions

    if (!partyList.includes(partyName)) {
      setPartyName(partyList[0] || "")
    }
    if (!transList.includes(transactionName)) {
      setTransactionName(transList[0] || "")
    }
  }

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    const cleanDigits = val.replace(/[^0-9.]/g, "")
    const parts = cleanDigits.split(".")
    let valid = parts[0]
    if (parts.length > 1) {
      valid += "." + parts[1].slice(0, 2)
    }
    setRawAmountInput(formatIndianCurrency(valid))
  }

  const handleOpenManager = (
    key: DailyDropdownKey,
    title: string,
    currentOptions: string[]
  ) => {
    setManagerModal({
      open: true,
      key,
      title,
      options: currentOptions,
    })
  }

  const handleSaveManagedOptions = async (newOpts: string[]) => {
    await saveDailyDropdownOptions(managerModal.key, newOpts)
    if (managerModal.key === "payment_modes") setPaymentOptions(newOpts)
    if (managerModal.key === "parties_credit") setCreditParties(newOpts)
    if (managerModal.key === "parties_debit") setDebitParties(newOpts)
    if (managerModal.key === "transactions_credit") setCreditTransactions(newOpts)
    if (managerModal.key === "transactions_debit") setDebitTransactions(newOpts)
    setManagerModal((prev) => ({ ...prev, options: newOpts }))
  }

  const handleSave = async () => {
    const amountVal = parseFormattedNumber(rawAmountInput)
    if (amountVal <= 0) {
      toast.error("Please enter a valid amount greater than 0")
      return
    }
    if (!partyName) {
      toast.error("Please select or specify a Party Name")
      return
    }

    setIsSaving(true)
    try {
      await upsertDailyTransaction({
        id: transaction?.id,
        company_id: companyId,
        sr_no: srNo,
        date: date,
        firm_name: companyName,
        party_name: partyName,
        payment_mode: paymentMode || "Cash",
        transaction_name: transactionName || "General",
        entry_nature: entryNature,
        type: flowType,
        credit_amount: flowType === "credit" ? amountVal : 0,
        debit_amount: flowType === "debit" ? amountVal : 0,
        remark: remark.trim(),
      })

      toast.success(isEdit ? "Transaction updated successfully" : "Transaction added successfully")
      onSuccess()
      onOpenChange(false)
    } catch (err) {
      console.error("Save transaction error:", err)
      toast.error("Failed to save transaction. Please try again.")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl rounded-3xl p-6 max-h-[92vh] overflow-y-auto">
          {/* Top Title & Gray Chip Company Name below it */}
          <DialogHeader className="pb-1">
            <DialogTitle asChild>
              <div>
                <div className="flex items-center gap-2 text-xl font-bold">
                  <span className="p-2 rounded-xl bg-primary/10 text-primary shrink-0">
                    {isEdit ? <Receipt className="h-5 w-5" /> : <TrendingUp className="h-5 w-5" />}
                  </span>
                  <span>{isEdit ? "Edit Daily Transaction" : "Add New Daily Transaction"}</span>
                </div>
                {/* Gray chip below title */}
                <div className="mt-1.5 pl-11">
                  <span className="inline-block text-[11px] font-semibold px-2.5 py-0.5 rounded-md bg-muted text-muted-foreground border">
                    {companyName}
                  </span>
                </div>
              </div>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Row 1: S No (Read Only) & Date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
                  <Hash className="h-3.5 w-3.5" /> S No
                </Label>
                <Input
                  type="text"
                  value={`#${srNo}`}
                  disabled
                  readOnly
                  className="rounded-xl h-10 font-black bg-muted/60 text-muted-foreground cursor-not-allowed select-none border-dashed"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" /> Date
                </Label>
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="rounded-xl h-10 font-medium"
                />
              </div>
            </div>

            {/* Row 2: Credit & Debit Toggle */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-muted-foreground">
                Transaction Flow
              </Label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => handleFlowTypeChange("credit")}
                  className={`flex items-center justify-center gap-2 p-3 rounded-2xl border font-black text-sm tracking-wide transition-all ${
                    flowType === "credit"
                      ? "bg-emerald-500/15 border-emerald-500 text-emerald-600 dark:text-emerald-400 shadow-sm ring-2 ring-emerald-500/20"
                      : "bg-card border-border text-muted-foreground hover:border-emerald-500/40"
                  }`}
                >
                  <div className={`p-1 rounded-full ${flowType === "credit" ? "bg-emerald-500 text-white" : "bg-muted"}`}>
                    <ArrowDownLeft className="h-4 w-4" />
                  </div>
                  Credit
                </button>

                <button
                  type="button"
                  onClick={() => handleFlowTypeChange("debit")}
                  className={`flex items-center justify-center gap-2 p-3 rounded-2xl border font-black text-sm tracking-wide transition-all ${
                    flowType === "debit"
                      ? "bg-rose-500/15 border-rose-500 text-rose-600 dark:text-rose-400 shadow-sm ring-2 ring-rose-500/20"
                      : "bg-card border-border text-muted-foreground hover:border-rose-500/40"
                  }`}
                >
                  <div className={`p-1 rounded-full ${flowType === "debit" ? "bg-rose-500 text-white" : "bg-muted"}`}>
                    <ArrowUpRight className="h-4 w-4" />
                  </div>
                  Debit
                </button>
              </div>
            </div>

            {/* Row 3: Party Name (Searchable dropdown, complete single line) */}
            <div className="space-y-1.5 w-full">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-muted-foreground">
                  Party Name ({flowType === "credit" ? "Credit Party" : "Debit Party"})
                </Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    handleOpenManager(
                      flowType === "credit" ? "parties_credit" : "parties_debit",
                      flowType === "credit" ? "Credit Parties" : "Debit Parties",
                      currentPartyOptions
                    )
                  }
                  className="h-6 px-2 text-[11px] font-bold text-primary hover:bg-primary/10 rounded-lg flex items-center gap-1"
                >
                  <Settings2 className="h-3 w-3" /> Manage
                </Button>
              </div>
              <SearchableSelect
                value={partyName}
                onValueChange={setPartyName}
                options={currentPartyOptions}
                placeholder={`Select ${flowType === "credit" ? "Credit" : "Debit"} Party...`}
                searchPlaceholder="Type to search party..."
              />
            </div>

            {/* Row 4: Payment Mode & Transaction in a SINGLE LINE (Both Searchable) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
              {/* Payment Mode */}
              <div className="space-y-1.5 w-full">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-muted-foreground">Payment Mode</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleOpenManager("payment_modes", "Payment Modes", paymentOptions)}
                    className="h-6 px-2 text-[11px] font-bold text-primary hover:bg-primary/10 rounded-lg flex items-center gap-1"
                  >
                    <Settings2 className="h-3 w-3" /> Manage
                  </Button>
                </div>
                <SearchableSelect
                  value={paymentMode}
                  onValueChange={setPaymentMode}
                  options={paymentOptions}
                  placeholder="Select Payment Mode..."
                  searchPlaceholder="Search payment mode..."
                />
              </div>

              {/* Transaction */}
              <div className="space-y-1.5 w-full">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-muted-foreground">
                    Transaction ({flowType === "credit" ? "Credit" : "Debit"})
                  </Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      handleOpenManager(
                        flowType === "credit" ? "transactions_credit" : "transactions_debit",
                        flowType === "credit" ? "Credit Transactions" : "Debit Transactions",
                        currentTransactionOptions
                      )
                    }
                    className="h-6 px-2 text-[11px] font-bold text-primary hover:bg-primary/10 rounded-lg flex items-center gap-1"
                  >
                    <Settings2 className="h-3 w-3" /> Manage
                  </Button>
                </div>
                <SearchableSelect
                  value={transactionName}
                  onValueChange={setTransactionName}
                  options={currentTransactionOptions}
                  placeholder={`Select ${flowType === "credit" ? "Credit" : "Debit"} Type...`}
                  searchPlaceholder="Search transaction type..."
                />
              </div>
            </div>

            {/* Row 5: Nature / Category (Purchase, Sale, Expense) */}
            <div className="space-y-2">
              <Label className="text-xs font-bold text-muted-foreground">
                Nature / Category (Only one can be checked)
              </Label>
              <div className="grid grid-cols-3 gap-3">
                {(["Purchase", "Expense", "Sale"] as EntryNature[]).map((nature) => {
                  const isChecked = entryNature === nature
                  const icon =
                    nature === "Purchase" ? (
                      <ShoppingBag className="h-4 w-4" />
                    ) : nature === "Expense" ? (
                      <Receipt className="h-4 w-4" />
                    ) : (
                      <TrendingUp className="h-4 w-4" />
                    )

                  return (
                    <button
                      key={nature}
                      type="button"
                      onClick={() => setEntryNature(nature)}
                      className={`flex items-center justify-center gap-2 p-3 rounded-2xl border font-bold text-sm transition-all ${
                        isChecked
                          ? "bg-primary/10 border-primary text-primary shadow-sm ring-2 ring-primary/20"
                          : "bg-card border-border text-muted-foreground hover:border-primary/40"
                      }`}
                    >
                      <div
                        className={`h-4 w-4 rounded-full flex items-center justify-center border transition-all ${
                          isChecked
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-muted-foreground/40 bg-background"
                        }`}
                      >
                        {isChecked && <CheckCircle2 className="h-3.5 w-3.5" />}
                      </div>
                      {icon}
                      <span>{nature}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Row 6: Amount (Placeholder in grey color) */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
                <IndianRupee className="h-3.5 w-3.5" /> Amount
              </Label>
              <div className="relative">
                <div
                  className={`absolute left-3.5 top-1/2 -translate-y-1/2 flex items-center pointer-events-none font-black text-lg transition-colors ${
                    flowType === "credit"
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-rose-600 dark:text-rose-400"
                  }`}
                >
                  ₹
                </div>
                <Input
                  type="text"
                  placeholder="0,00,000.00"
                  value={rawAmountInput}
                  onChange={handleAmountChange}
                  className={`rounded-xl h-12 pl-9 text-lg font-black tracking-wide border-2 transition-all placeholder:text-gray-400 placeholder:font-normal placeholder:opacity-60 dark:placeholder:text-gray-500 ${
                    flowType === "credit"
                      ? "border-emerald-500/60 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400 focus-visible:ring-emerald-500/30"
                      : "border-rose-500/60 bg-rose-500/5 text-rose-700 dark:text-rose-400 focus-visible:ring-rose-500/30"
                  }`}
                />
              </div>
            </div>

            {/* Row 7: Manual Input Text Box named Remark (Beneath Amount) */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
                <MessageSquare className="h-3.5 w-3.5" /> Remark
              </Label>
              <Input
                type="text"
                placeholder="Add remark or note (optional)..."
                value={remark}
                onChange={(e) => setRemark(e.target.value)}
                className="rounded-xl h-10 text-xs sm:text-sm font-medium"
              />
            </div>
          </div>

          {/* Footer with ample spacing between Cancel & Save */}
          <DialogFooter className="flex flex-row items-center justify-end gap-4 pt-4 border-t mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
              className="rounded-xl font-bold h-11 px-6 min-w-[100px]"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="rounded-xl font-bold h-11 px-8 bg-primary text-primary-foreground shadow-md hover:shadow-lg transition-all min-w-[140px]"
            >
              {isSaving ? "Saving..." : isEdit ? "Update Entry" : "Save Entry"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Inline Dropdown Item Manager Modal */}
      {managerModal.open && (
        <DropdownManagerDialog
          open={managerModal.open}
          onOpenChange={(val) => setManagerModal((prev) => ({ ...prev, open: val }))}
          title={managerModal.title}
          options={managerModal.options}
          onSave={handleSaveManagedOptions}
        />
      )}
    </>
  )
}
