import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import type {
  Project,
  LedgerEntry,
  PaymentTerm,
  Expense,
  CallingRecord,
  SwhChecklistItem,
  WorkRemark,
} from "@/lib/types"
import { getActiveCompany } from "@/lib/company-store"

function formatCurrency(amount: number | null | undefined, allowZero = false): string {
  if ((amount === null || amount === undefined || amount === 0) && !allowZero) return ""
  const val = Math.round(amount || 0)
  return "Rs. " + new Intl.NumberFormat("en-IN").format(val)
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "-"
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return dateStr
    return d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
  } catch (e) {
    return dateStr
  }
}

export function generateProjectLedgerPDF(
  project: Project,
  entries: LedgerEntry[] = [],
  paymentTerms: PaymentTerm[] = [],
  expenses: Expense[] = [],
  callingRecords: CallingRecord[] = [],
  swhChecklist: SwhChecklistItem[] = [],
  workRemarks: WorkRemark[] = []
) {
  const doc = new jsPDF("p", "mm", "a4")
  const pageWidth = doc.internal.pageSize.width
  const pageHeight = doc.internal.pageSize.height
  const companyName = getActiveCompany().name

  // High-Contrast Black & White Print Colors (Ink Saving & Extremely Readable)
  const headerBg = [240, 240, 240] // Light gray fill for headers
  const textBlack = [0, 0, 0] // Solid Black
  const borderLine = [120, 120, 120] // Crisp line borders

  // Calculation rules: Order value display = order_value + extra_work_value
  const baseOrderValue = project.order_value || 0
  const extraWorkValue = project.extra_work_value || 0
  const totalCombinedOrderValue = baseOrderValue + extraWorkValue
  const paymentReceived = project.payment_received || 0
  const balanceDue = totalCombinedOrderValue - paymentReceived

  // ==========================================
  // PAGE 1: FINANCIAL LEDGER & STATEMENT
  // ==========================================

  // Clean Print Header (No heavy color fill)
  doc.setTextColor(0, 0, 0)
  doc.setFontSize(20)
  doc.setFont("helvetica", "bold")
  doc.text(companyName, 14, 16)

  doc.setFontSize(9)
  doc.setFont("helvetica", "bold")
  doc.text("PROJECT FINANCIAL LEDGER & STATEMENT", pageWidth - 14, 16, { align: "right" })

  // Double Line Separator under Header
  doc.setLineWidth(0.8)
  doc.setDrawColor(0, 0, 0)
  doc.line(14, 20, pageWidth - 14, 20)
  doc.setLineWidth(0.2)
  doc.line(14, 21.5, pageWidth - 14, 21.5)

  // Generation Date
  doc.setFontSize(8)
  doc.setFont("helvetica", "normal")
  doc.text(
    `Generated Date: ${new Date().toLocaleDateString("en-IN")} ${new Date().toLocaleTimeString("en-IN")}`,
    pageWidth - 14,
    27,
    { align: "right" }
  )

  // Customer & Site Information Box (Dynamic height layout)
  const boxStartY = 30
  const boxWidth = pageWidth - 28

  doc.setFontSize(14)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(0, 0, 0)
  const titleLines = doc.splitTextToSize(`Customer / Site: ${project.site_name} (ID #${project.id_no})`, boxWidth - 8)
  const titleHeight = titleLines.length * 5.5

  const colStartY = boxStartY + 7 + titleHeight

  doc.setFontSize(9)
  doc.setFont("helvetica", "normal")

  // Left Column
  let leftY = colStartY
  const leftColWidth = 90
  const addressText = `Site Address: ${project.address || "N/A"}`
  const addressLines = doc.splitTextToSize(addressText, leftColWidth)
  const leftTotalHeight = 5 + 5 + (addressLines.length * 4.5)

  // Right Column
  let rightY = colStartY
  const hpSpecs = project.hp_type ? `${project.hp_type} (${project.hp_qty || 0} Qty)` : "N/A"
  const tankSpecs = project.tank_type ? `${project.tank_type} (${project.tank_qty || 0} Qty)` : "N/A"
  const remarkText = project.work_remark ? `Work Remark: ${project.work_remark}` : ""
  const remarkLines = remarkText ? doc.splitTextToSize(remarkText, boxWidth - 98) : []
  const rightTotalHeight = 5 + 5 + (remarkLines.length > 0 ? remarkLines.length * 4 : 0)

  const contentHeight = Math.max(leftTotalHeight, rightTotalHeight)
  const boxHeight = 7 + titleHeight + contentHeight + 4

  // Draw Box
  doc.setFillColor(250, 250, 250)
  doc.setDrawColor(0, 0, 0)
  doc.roundedRect(14, boxStartY, boxWidth, boxHeight, 2, 2, "FD")

  // Render Box Text
  doc.setFontSize(14)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(0, 0, 0)
  doc.text(titleLines, 18, boxStartY + 7)

  doc.setFontSize(9)
  doc.setFont("helvetica", "normal")
  
  // Left Column Text
  leftY = colStartY
  doc.text(`Order Type: ${project.order_type || "N/A"}`, 18, leftY)
  leftY += 5
  doc.text(`Mobile No.: ${project.mobile_number || "N/A"}`, 18, leftY)
  leftY += 5
  doc.text(addressLines, 18, leftY)

  // Right Column Text
  rightY = colStartY
  doc.text(`HP Specs: ${hpSpecs}`, 115, rightY)
  rightY += 5
  doc.text(`Storage Tank: ${tankSpecs}`, 115, rightY)
  rightY += 5
  if (remarkLines.length > 0) {
    doc.setFontSize(8.5)
    doc.setFont("helvetica", "italic")
    doc.text(remarkLines, 115, rightY)
  }

  // Financial Summary Cards Box
  let currentY = boxStartY + boxHeight + 6
  doc.setFontSize(10)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(0, 0, 0)
  doc.text("FINANCIAL SUMMARY OVERVIEW", 14, currentY)

  currentY += 3

  const summaryHeaders = [["Total Order Value", "Extra Work", "Payment Received", "Outstanding Balance"]]
  const summaryBody = [[
    formatCurrency(totalCombinedOrderValue, true),
    formatCurrency(extraWorkValue, true),
    formatCurrency(paymentReceived, true),
    formatCurrency(balanceDue, true),
  ]]

  autoTable(doc, {
    head: summaryHeaders,
    body: summaryBody,
    startY: currentY,
    theme: "grid",
    headStyles: {
      fillColor: headerBg,
      textColor: textBlack,
      fontStyle: "bold",
      fontSize: 8.5,
      halign: "center",
      lineWidth: 0.2,
      lineColor: borderLine,
    },
    bodyStyles: {
      fontStyle: "bold",
      fontSize: 9,
      halign: "center",
      cellPadding: 3.5,
      textColor: textBlack,
      lineWidth: 0.2,
      lineColor: borderLine,
    },
    columnStyles: {
      0: { cellWidth: 45.5 },
      1: { cellWidth: 45.5 },
      2: { cellWidth: 45.5 },
      3: { cellWidth: 45.5 },
    },
  })

  // @ts-ignore
  currentY = doc.lastAutoTable.finalY + 8

  // TAB 1: FINANCIAL LEDGER TABLE
  doc.setFontSize(10)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(0, 0, 0)
  doc.text("1. FINANCIAL LEDGER ENTRIES", 14, currentY)

  currentY += 3

  const ledgerHeaders = [["Sr", "Date", "Type", "Particulars", "Bill", "Sales M", "M Out", "Order Val", "Extra Wrk", "Received"]]

  let salesMSum = 0
  let mOutSum = 0
  let orderSum = 0
  let extraSum = 0
  let recdSum = 0

  const ledgerBody: any[] = entries.map((e) => {
    salesMSum += e.sales_m_value || 0
    mOutSum += e.m_outward_value || 0
    orderSum += e.order_value || 0
    extraSum += e.extra_work_value || 0
    recdSum += e.payment_received || 0

    return [
      e.sr_no,
      formatDate(e.date),
      e.payment_type || "-",
      e.particulars || "-",
      e.payment_receipt ? "Receipt" : e.bill_submitted ? "Bill" : "No",
      formatCurrency(e.sales_m_value),
      formatCurrency(e.m_outward_value),
      formatCurrency(e.order_value),
      formatCurrency(e.extra_work_value),
      formatCurrency(e.payment_received),
    ]
  })

  // Merge columns 0 to 4 for NET TOTALS row
  if (entries.length > 0) {
    ledgerBody.push([
      { content: "NET TOTALS", colSpan: 5, styles: { halign: "center", fontStyle: "bold", fillColor: [230, 230, 230] } },
      formatCurrency(salesMSum),
      formatCurrency(mOutSum),
      formatCurrency(orderSum),
      formatCurrency(extraSum),
      formatCurrency(recdSum),
    ])
  }

  autoTable(doc, {
    head: ledgerHeaders,
    body: ledgerBody,
    startY: currentY,
    theme: "grid",
    headStyles: {
      fillColor: headerBg,
      textColor: textBlack,
      fontStyle: "bold",
      fontSize: 8,
      cellPadding: 2.5,
      lineWidth: 0.2,
      lineColor: borderLine,
    },
    styles: {
      fontSize: 7.5,
      cellPadding: 2,
      textColor: textBlack,
      lineWidth: 0.2,
      lineColor: borderLine,
    },
    columnStyles: {
      0: { cellWidth: 8, halign: "center" },
      1: { cellWidth: 18, halign: "center" },
      2: { cellWidth: 14, halign: "center" },
      3: { cellWidth: 36, halign: "left" },
      4: { cellWidth: 12, halign: "center" },
      5: { cellWidth: 18, halign: "right" },
      6: { cellWidth: 18, halign: "right" },
      7: { cellWidth: 21, halign: "right" },
      8: { cellWidth: 17, halign: "right" },
      9: { cellWidth: 20, halign: "right", fontStyle: "bold" },
    },
    didParseCell: (data) => {
      if (data.row.index === ledgerBody.length - 1 && entries.length > 0) {
        data.cell.styles.fontStyle = "bold"
        data.cell.styles.fillColor = [230, 230, 230]
      }
    },
  })

  // Page 1 Footer
  doc.setDrawColor(0, 0, 0)
  doc.line(14, pageHeight - 15, pageWidth - 14, pageHeight - 15)
  doc.setFontSize(8)
  doc.setFont("helvetica", "normal")
  doc.setTextColor(0, 0, 0)
  doc.text(`${companyName} - Page 1 of 2`, 14, pageHeight - 10)
  doc.text("Authorized Signatory", pageWidth - 14, pageHeight - 10, { align: "right" })

  // ==========================================
  // PAGE 2: OTHER TABS
  // ==========================================

  doc.addPage()

  // B&W Header Page 2
  doc.setTextColor(0, 0, 0)
  doc.setFontSize(11)
  doc.setFont("helvetica", "bold")
  doc.text(`${companyName} - Customer: ${project.site_name} (${project.mobile_number || "No Mobile"})`, 14, 15)
  doc.line(14, 18, pageWidth - 14, 18)

  currentY = 25

  // TAB 2: PAYMENT TERMS
  doc.setFontSize(10)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(0, 0, 0)
  doc.text("2. PAYMENT TERMS BREAKDOWN", 14, currentY)
  currentY += 3

  if (paymentTerms && paymentTerms.length > 0) {
    const termHeaders = [["Term Name", "Percentage", "Amount", "Received", "Pending", "Remark"]]
    const termBody = paymentTerms.map((t) => [
      t.payment_term,
      t.term_percentage ? `${t.term_percentage}%` : "-",
      formatCurrency(t.amount),
      formatCurrency(t.received_amount),
      formatCurrency(t.pending_amount),
      t.remark || "-",
    ])

    autoTable(doc, {
      head: termHeaders,
      body: termBody,
      startY: currentY,
      theme: "grid",
      headStyles: { fillColor: headerBg, textColor: textBlack, fontStyle: "bold", fontSize: 8, lineWidth: 0.2, lineColor: borderLine },
      styles: { fontSize: 7.5, cellPadding: 2, textColor: textBlack, lineWidth: 0.2, lineColor: borderLine },
      columnStyles: {
        0: { cellWidth: 40 },
        1: { cellWidth: 20, halign: "center" },
        2: { cellWidth: 30, halign: "right" },
        3: { cellWidth: 30, halign: "right" },
        4: { cellWidth: 30, halign: "right" },
        5: { cellWidth: "auto" },
      },
    })
    // @ts-ignore
    currentY = doc.lastAutoTable.finalY + 8
  } else {
    doc.setFontSize(8)
    doc.setFont("helvetica", "italic")
    doc.setTextColor(80, 80, 80)
    doc.text("No payment terms defined for this project.", 14, currentY + 3)
    currentY += 10
  }

  // TAB 3: PROJECT EXPENSES & TAB 4: CALL RECORDS
  if (currentY > pageHeight - 60) {
    doc.addPage()
    currentY = 25
  }

  doc.setFontSize(10)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(0, 0, 0)
  doc.text("3. PROJECT EXPENSES & CALL RECORDS", 14, currentY)
  currentY += 3

  const hasExpenses = expenses && expenses.length > 0
  const hasCalls = callingRecords && callingRecords.length > 0

  if (hasExpenses || hasCalls) {
    if (hasExpenses) {
      const expHeaders = [["Sr", "Date", "Expense Particular", "Amount"]]
      const expBody = expenses.map((e) => [
        e.sr_no,
        formatDate(e.date),
        e.particular || "-",
        formatCurrency(e.expense),
      ])

      autoTable(doc, {
        head: expHeaders,
        body: expBody,
        startY: currentY,
        theme: "grid",
        headStyles: { fillColor: headerBg, textColor: textBlack, fontStyle: "bold", fontSize: 8, lineWidth: 0.2, lineColor: borderLine },
        styles: { fontSize: 7.5, cellPadding: 2, textColor: textBlack, lineWidth: 0.2, lineColor: borderLine },
        columnStyles: {
          0: { cellWidth: 10, halign: "center" },
          1: { cellWidth: 25, halign: "center" },
          2: { cellWidth: 100 },
          3: { cellWidth: 47, halign: "right", fontStyle: "bold" },
        },
      })
      // @ts-ignore
      currentY = doc.lastAutoTable.finalY + 8
    }

    if (hasCalls) {
      if (currentY > pageHeight - 50) {
        doc.addPage()
        currentY = 25
      }
      doc.setFontSize(9)
      doc.setFont("helvetica", "bold")
      doc.setTextColor(0, 0, 0)
      doc.text("Call Records History", 14, currentY)
      currentY += 3

      const callHeaders = [["Sr", "Date", "Description / Discussion Notes"]]
      const callBody = callingRecords.map((c) => [
        c.sr_no,
        formatDate(c.date),
        c.description || "-",
      ])

      autoTable(doc, {
        head: callHeaders,
        body: callBody,
        startY: currentY,
        theme: "grid",
        headStyles: { fillColor: headerBg, textColor: textBlack, fontStyle: "bold", fontSize: 8, lineWidth: 0.2, lineColor: borderLine },
        styles: { fontSize: 7.5, cellPadding: 2, textColor: textBlack, lineWidth: 0.2, lineColor: borderLine },
        columnStyles: {
          0: { cellWidth: 10, halign: "center" },
          1: { cellWidth: 25, halign: "center" },
          2: { cellWidth: "auto" },
        },
      })
      // @ts-ignore
      currentY = doc.lastAutoTable.finalY + 8
    }
  } else {
    doc.setFontSize(8)
    doc.setFont("helvetica", "italic")
    doc.setTextColor(80, 80, 80)
    doc.text("No expenses or call records logged for this project.", 14, currentY + 3)
    currentY += 10
  }

  // TAB 5: SWH CHECKLIST
  if (currentY > pageHeight - 60) {
    doc.addPage()
    currentY = 25
  }

  doc.setFontSize(10)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(0, 0, 0)
  doc.text("4. SWH CHECKLIST SCOPE BREAKDOWN", 14, currentY)
  currentY += 3

  const customerItems = swhChecklist.filter((i) => i.customer_scope || (!i.our_scope && i.customer_scope !== false))
  const ourItems = swhChecklist.filter((i) => i.our_scope === true)

  const swhTableHeaders = [["Item Name", "Req Qty", "Dispatch Qty", "Installed Qty", "Remark"]]

  // Customer Scope Section
  doc.setFontSize(9)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(0, 0, 0)
  doc.text("Customer Scope Items:", 14, currentY)
  currentY += 3

  if (customerItems.length > 0) {
    const custBody = customerItems.map((i) => [
      i.item_name,
      i.req_qty ?? "-",
      i.dispatch_qty ?? "-",
      i.installed_qty ?? "-",
      i.remark || "-",
    ])

    autoTable(doc, {
      head: swhTableHeaders,
      body: custBody,
      startY: currentY,
      theme: "grid",
      headStyles: { fillColor: headerBg, textColor: textBlack, fontStyle: "bold", fontSize: 7.5, lineWidth: 0.2, lineColor: borderLine },
      styles: { fontSize: 7.5, cellPadding: 2, textColor: textBlack, lineWidth: 0.2, lineColor: borderLine },
      columnStyles: {
        0: { cellWidth: 50, fontStyle: "bold" },
        1: { cellWidth: 25, halign: "center" },
        2: { cellWidth: 25, halign: "center" },
        3: { cellWidth: 25, halign: "center" },
        4: { cellWidth: "auto" },
      },
    })
    // @ts-ignore
    currentY = doc.lastAutoTable.finalY + 6
  } else {
    doc.setFontSize(8)
    doc.setFont("helvetica", "italic")
    doc.setTextColor(80, 80, 80)
    doc.text("No items under customer scope.", 14, currentY + 3)
    currentY += 8
  }

  // Our Scope Section
  if (currentY > pageHeight - 40) {
    doc.addPage()
    currentY = 25
  }

  doc.setFontSize(9)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(0, 0, 0)
  doc.text("Our Scope Items:", 14, currentY)
  currentY += 3

  if (ourItems.length > 0) {
    const ourBody = ourItems.map((i) => [
      i.item_name,
      i.req_qty ?? "-",
      i.dispatch_qty ?? "-",
      i.installed_qty ?? "-",
      i.remark || "-",
    ])

    autoTable(doc, {
      head: swhTableHeaders,
      body: ourBody,
      startY: currentY,
      theme: "grid",
      headStyles: { fillColor: headerBg, textColor: textBlack, fontStyle: "bold", fontSize: 7.5, lineWidth: 0.2, lineColor: borderLine },
      styles: { fontSize: 7.5, cellPadding: 2, textColor: textBlack, lineWidth: 0.2, lineColor: borderLine },
      columnStyles: {
        0: { cellWidth: 50, fontStyle: "bold" },
        1: { cellWidth: 25, halign: "center" },
        2: { cellWidth: 25, halign: "center" },
        3: { cellWidth: 25, halign: "center" },
        4: { cellWidth: "auto" },
      },
    })
    // @ts-ignore
    currentY = doc.lastAutoTable.finalY + 8
  } else {
    doc.setFontSize(8)
    doc.setFont("helvetica", "italic")
    doc.setTextColor(80, 80, 80)
    doc.text("No items under our scope.", 14, currentY + 3)
    currentY += 10
  }

  // TAB 6: WORK REMARKS
  if (currentY > pageHeight - 35) {
    doc.addPage()
    currentY = 25
  }

  doc.setFontSize(10)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(0, 0, 0)
  doc.text("5. LATEST WORK REMARK", 14, currentY)
  currentY += 3

  const lastRemarkObj = workRemarks && workRemarks.length > 0
    ? workRemarks[workRemarks.length - 1]
    : null
  const lastRemarkText = lastRemarkObj?.remark || project.work_remark || "No work remarks recorded for this project."
  const lastRemarkDate = lastRemarkObj?.date ? formatDate(lastRemarkObj.date) : formatDate(project.updated_at)

  doc.setFillColor(250, 250, 250)
  doc.setDrawColor(0, 0, 0)
  doc.roundedRect(14, currentY, pageWidth - 28, 18, 2, 2, "FD")

  doc.setFontSize(8)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(0, 0, 0)
  doc.text(`Last Remark Date: ${lastRemarkDate}`, 18, currentY + 6)

  doc.setFontSize(8.5)
  doc.setFont("helvetica", "normal")
  doc.setTextColor(0, 0, 0)
  doc.text(lastRemarkText, 18, currentY + 12, { maxWidth: pageWidth - 36 })

  // Page 2 Footer
  doc.setDrawColor(0, 0, 0)
  doc.line(14, pageHeight - 15, pageWidth - 14, pageHeight - 15)
  doc.setFontSize(8)
  doc.setFont("helvetica", "normal")
  doc.setTextColor(0, 0, 0)
  doc.text(`${companyName} - Page 2`, 14, pageHeight - 10)
  doc.text("Authorized Signatory", pageWidth - 14, pageHeight - 10, { align: "right" })

  // Save Document
  const cleanSiteName = project.site_name.replace(/[^a-zA-Z0-9]/g, "_")
  const cleanCompName = companyName.replace(/[^a-zA-Z0-9]/g, "_")
  doc.save(`${cleanCompName}_Report_${cleanSiteName}_${project.id_no}.pdf`)
}
