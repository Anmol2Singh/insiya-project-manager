"use client"

import { useState, useEffect, useRef } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import {
  FileText,
  Download,
  Printer,
  Loader2,
  ExternalLink,
} from "lucide-react"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import {
  DailyTransaction,
  DailyPdfColumnsConfig,
} from "@/lib/daily-transaction-types"
import { getDailyPdfColumnsConfig } from "@/lib/daily-transaction-store"

interface PdfPreviewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  transactions: DailyTransaction[]
  timeframeLabel: string
  firmFilterName?: string
  openingBalance?: number
}

function formatINR(val: number): string {
  return "Rs. " + new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(val || 0)
}

function formatDateDDMMYYYY(dateStr: string): string {
  if (!dateStr) return "-"
  try {
    const clean = dateStr.split("T")[0]
    const parts = clean.split("-")
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`
    }
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return dateStr
    const day = String(d.getDate()).padStart(2, "0")
    const month = String(d.getMonth() + 1).padStart(2, "0")
    const year = d.getFullYear()
    return `${day}/${month}/${year}`
  } catch (e) {
    return dateStr
  }
}

export function PdfPreviewDialog({
  open,
  onOpenChange,
  transactions,
  timeframeLabel,
  firmFilterName,
  openingBalance = 0,
}: PdfPreviewDialogProps) {
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const pdfDocRef = useRef<jsPDF | null>(null)

  // Generate clean, text-and-border only PDF document
  const generatePdfDoc = () => {
    const doc = new jsPDF("landscape", "mm", "a4")
    const pageWidth = doc.internal.pageSize.width
    const pageHeight = doc.internal.pageSize.height

    const displayFirmName =
      firmFilterName && firmFilterName !== "ALL"
        ? firmFilterName
        : (transactions[0]?.firm_name || "DAILY TRANSACTIONS")

    // --- Top Double Rule Accent ---
    doc.setDrawColor(0, 0, 0)
    doc.setLineWidth(0.5)
    doc.line(14, 10, pageWidth - 14, 10)
    doc.setLineWidth(0.2)
    doc.line(14, 11.2, pageWidth - 14, 11.2)

    // --- Header Section (Pure Text & Clean Lines, No Fill Colors) ---
    doc.setFont("helvetica", "bold")
    doc.setTextColor(0, 0, 0)
    doc.setFontSize(16)
    doc.text(displayFirmName.toUpperCase(), 14, 18)

    // Sub-title
    doc.setFont("helvetica", "normal")
    doc.setFontSize(9.5)
    doc.setTextColor(60, 60, 60)
    doc.text(`DAILY TRANSACTION REGISTER — [${timeframeLabel.toUpperCase()}]`, 14, 24)

    // Right-aligned Generation info
    const now = new Date()
    const genDay = String(now.getDate()).padStart(2, "0")
    const genMonth = String(now.getMonth() + 1).padStart(2, "0")
    const genYear = now.getFullYear()
    const todayFormatted = `${genDay}/${genMonth}/${genYear}`
    doc.setFontSize(8.5)
    doc.setTextColor(60, 60, 60)
    doc.text(`Report Date: ${todayFormatted}`, pageWidth - 14, 18, { align: "right" })
    doc.text(`Total Records: ${transactions.length}`, pageWidth - 14, 24, { align: "right" })

    // Divider line below header
    doc.setLineWidth(0.3)
    doc.setDrawColor(0, 0, 0)
    doc.line(14, 27, pageWidth - 14, 27)

    // --- Summary Metrics Box (Stroke Only, No Fill Colors) ---
    let totalCredit = 0
    let totalDebit = 0
    transactions.forEach((t) => {
      totalCredit += Number(t.credit_amount) || 0
      totalDebit += Number(t.debit_amount) || 0
    })
    const netBalance = openingBalance + totalCredit - totalDebit

    const boxY = 30
    const boxH = 10
    doc.setDrawColor(80, 80, 80)
    doc.setLineWidth(0.2)
    doc.rect(14, boxY, pageWidth - 28, boxH, "S") // "S" = Stroke only, no fill!

    // Text metrics inside box
    doc.setFontSize(8.5)
    doc.setFont("helvetica", "bold")
    doc.setTextColor(0, 0, 0)

    let currentX = 18
    doc.text(`Entries: ${transactions.length}`, currentX, boxY + 6.5)

    if (openingBalance > 0) {
      currentX += 42
      doc.setDrawColor(180, 180, 180)
      doc.line(currentX - 5, boxY, currentX - 5, boxY + boxH)
      doc.text(`Op. Bal (Cr): ${formatINR(openingBalance)}`, currentX, boxY + 6.5)
    }

    currentX += 58
    doc.setDrawColor(180, 180, 180)
    doc.line(currentX - 5, boxY, currentX - 5, boxY + boxH)
    doc.text(`Total Credit: ${formatINR(totalCredit)}`, currentX, boxY + 6.5)

    currentX += 60
    doc.setDrawColor(180, 180, 180)
    doc.line(currentX - 5, boxY, currentX - 5, boxY + boxH)
    doc.text(`Total Debit: ${formatINR(totalDebit)}`, currentX, boxY + 6.5)

    currentX += 60
    doc.setDrawColor(180, 180, 180)
    doc.line(currentX - 5, boxY, currentX - 5, boxY + boxH)
    doc.text(`Net Balance: ${formatINR(netBalance)}`, currentX, boxY + 6.5)

    // --- Table Generation (Strictly Ink-Saving: Texts & Borders Only) ---
    const config: DailyPdfColumnsConfig = getDailyPdfColumnsConfig()

    const headers: string[] = []
    if (config.sr_no) headers.push("S No")
    if (config.date) headers.push("Date")
    if (config.firm_name) headers.push("Firm Name")
    if (config.party_name) headers.push("Party Name")
    if (config.payment_mode) headers.push("Payment Mode")
    if (config.transaction_name) headers.push("Transaction")
    if (config.entry_nature) headers.push("Nature")
    if (config.remark) headers.push("Remark")
    if (config.debit) headers.push("Debit (Rs.)")
    if (config.credit) headers.push("Credit (Rs.)")

    const bodyRows = transactions.map((t) => {
      const row: string[] = []
      if (config.sr_no) row.push(String(t.sr_no || "-"))
      if (config.date) row.push(formatDateDDMMYYYY(t.date))
      if (config.firm_name) row.push(t.firm_name || "-")
      if (config.party_name) row.push(t.party_name || "-")
      if (config.payment_mode) row.push(t.payment_mode || "-")
      if (config.transaction_name) row.push(t.transaction_name || "-")
      if (config.entry_nature) row.push(t.entry_nature || "-")
      if (config.remark) row.push(t.remark || "-")
      if (config.debit) {
        row.push(t.debit_amount > 0 ? new Intl.NumberFormat("en-IN").format(t.debit_amount) : "-")
      }
      if (config.credit) {
        row.push(t.credit_amount > 0 ? new Intl.NumberFormat("en-IN").format(t.credit_amount) : "-")
      }
      return row
    })

    // Totals Row
    const totalsRow: string[] = []
    let hasAddedLabel = false
    if (config.sr_no) { totalsRow.push(""); }
    if (config.date) { totalsRow.push(""); }
    if (config.firm_name) { totalsRow.push(""); }
    if (config.party_name) { totalsRow.push("TOTAL"); hasAddedLabel = true }
    if (config.payment_mode) { totalsRow.push(hasAddedLabel ? "" : "TOTAL"); hasAddedLabel = true }
    if (config.transaction_name) { totalsRow.push("") }
    if (config.entry_nature) { totalsRow.push("") }
    if (config.remark) { totalsRow.push("") }
    if (config.debit) {
      totalsRow.push(new Intl.NumberFormat("en-IN").format(totalDebit))
    }
    if (config.credit) {
      totalsRow.push(new Intl.NumberFormat("en-IN").format(totalCredit))
    }
    bodyRows.push(totalsRow)

    autoTable(doc, {
      startY: boxY + 13,
      head: [headers],
      body: bodyRows,
      theme: "grid",
      headStyles: {
        fillColor: false, // NO background fill!
        textColor: [0, 0, 0], // Pure black
        fontStyle: "bold",
        fontSize: 8.5,
        lineWidth: 0.25,
        lineColor: [0, 0, 0],
        halign: "center",
      },
      bodyStyles: {
        fillColor: false, // NO background fill!
        textColor: [20, 20, 20],
        fontSize: 8,
        lineWidth: 0.15,
        lineColor: [160, 160, 160],
      },
      alternateRowStyles: {
        fillColor: false, // NO alternate fill!
      },
      margin: { left: 14, right: 14, bottom: 14 },
      didParseCell: (data) => {
        // Last row (TOTALS) - bold and double borders
        if (data.row.index === bodyRows.length - 1) {
          data.cell.styles.fontStyle = "bold"
          data.cell.styles.textColor = [0, 0, 0]
          data.cell.styles.lineWidth = 0.25
          data.cell.styles.lineColor = [0, 0, 0]
        }
      },
      didDrawPage: (data) => {
        // Footer page numbering
        doc.setFontSize(8)
        doc.setFont("helvetica", "normal")
        doc.setTextColor(100, 100, 100)
        doc.text(
          `Page ${data.pageNumber} of ${doc.getNumberOfPages()}`,
          pageWidth / 2,
          pageHeight - 7,
          { align: "center" }
        )
      },
    })

    return doc
  }

  useEffect(() => {
    if (!open) {
      if (pdfBlobUrl) {
        URL.revokeObjectURL(pdfBlobUrl)
        setPdfBlobUrl(null)
      }
      return
    }

    setIsGenerating(true)
    try {
      const doc = generatePdfDoc()
      pdfDocRef.current = doc
      const blob = doc.output("blob")
      const url = URL.createObjectURL(blob)
      setPdfBlobUrl(url)
    } catch (e) {
      console.error("Failed to generate PDF preview:", e)
    } finally {
      setIsGenerating(false)
    }

    return () => {
      if (pdfBlobUrl) URL.revokeObjectURL(pdfBlobUrl)
    }
  }, [open, transactions, timeframeLabel, firmFilterName, openingBalance])

  const handleDownload = () => {
    if (!pdfDocRef.current) return
    const filename = `Daily_Transactions_${new Date().toISOString().split("T")[0]}.pdf`
    pdfDocRef.current.save(filename)
  }

  const handlePrint = () => {
    if (!pdfDocRef.current) return
    pdfDocRef.current.autoPrint()
    const blob = pdfDocRef.current.output("blob")
    const url = URL.createObjectURL(blob)
    const printWindow = window.open(url)
    if (printWindow) {
      printWindow.focus()
    }
  }

  const handleOpenInNewTab = () => {
    if (pdfBlobUrl) {
      window.open(pdfBlobUrl, "_blank")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl w-[96vw] h-[94vh] rounded-3xl p-5 flex flex-col">
        <DialogHeader className="flex flex-row items-center justify-between pb-2 border-b">
          <DialogTitle className="text-base font-bold flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            <span>PDF Print &amp; Export Preview</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-muted text-muted-foreground border">
              {transactions.length} Records
            </span>
          </DialogTitle>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleOpenInNewTab}
              className="rounded-xl font-bold h-8 text-xs gap-1.5 hidden sm:flex"
              title="Open full PDF in new tab"
            >
              <ExternalLink className="h-3.5 w-3.5" /> Open in New Tab
            </Button>
          </div>
        </DialogHeader>

        {/* PDF Viewer Container - Full browser native PDF rendering with mouse wheel zoom */}
        <div className="flex-1 min-h-0 bg-muted/20 rounded-2xl border overflow-hidden relative">
          {isGenerating ? (
            <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm font-medium">Rendering PDF preview...</p>
            </div>
          ) : pdfBlobUrl ? (
            <iframe
              src={pdfBlobUrl}
              className="w-full h-full border-0 rounded-2xl bg-white"
              title="Daily Transactions PDF Preview"
            />
          ) : (
            <div className="flex items-center justify-center h-full text-destructive text-sm font-medium">
              Failed to load preview.
            </div>
          )}
        </div>

        <DialogFooter className="flex flex-row items-center justify-between pt-3 border-t">
          <p className="text-xs text-muted-foreground italic hidden sm:block">
            Ink-saving layout: Text &amp; borders only. Use mouse wheel / Ctrl+wheel to zoom.
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="rounded-xl font-bold"
            >
              Close
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handlePrint}
              className="rounded-xl font-bold gap-1.5"
            >
              <Printer className="h-4 w-4" /> Print
            </Button>
            <Button
              type="button"
              onClick={handleDownload}
              className="rounded-xl font-bold bg-primary text-primary-foreground gap-1.5 shadow-sm"
            >
              <Download className="h-4 w-4" /> Download PDF
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
