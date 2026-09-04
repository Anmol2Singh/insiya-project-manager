import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import type {
  Project,
  ProjectSummary,
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
  const headerBg: [number, number, number] = [240, 240, 240] // Light gray fill for headers
  const textBlack: [number, number, number] = [0, 0, 0] // Solid Black
  const borderLine: [number, number, number] = [120, 120, 120] // Crisp line borders

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
  const salesmanText = project.salesman_name ? `Sales Man: ${project.salesman_name}` : ""
  const remarkText = project.work_remark ? `Work Remark: ${project.work_remark}` : ""
  const remarkLines = remarkText ? doc.splitTextToSize(remarkText, boxWidth - 98) : []
  const rightTotalHeight = 5 + 5 + (salesmanText ? 5 : 0) + (remarkLines.length > 0 ? remarkLines.length * 4 : 0)

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
  if (salesmanText) {
    doc.setFont("helvetica", "bold")
    doc.text(salesmanText, 115, rightY)
    doc.setFont("helvetica", "normal")
    rightY += 5
  }
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

  const ledgerHeaders = [["Sr", "Date", "Type", "Particulars", "Bill", "Ref No", "Inv No", "Sales M", "M Out", "Order Val", "Extra Wrk", "Received"]]

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
      e.reference_number || "-",
      e.invoice_no || "-",
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
      { content: "NET TOTALS", colSpan: 7, styles: { halign: "center", fontStyle: "bold", fillColor: [230, 230, 230] } },
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
      0: { cellWidth: 5, halign: "center" },
      1: { cellWidth: 16, halign: "center" },
      2: { cellWidth: 10, halign: "center" },
      3: { cellWidth: 22, halign: "left" },
      4: { cellWidth: 11, halign: "center" },
      5: { cellWidth: 16, halign: "center" },
      6: { cellWidth: 16, halign: "center" },
      7: { cellWidth: 16, halign: "right" },
      8: { cellWidth: 16, halign: "right" },
      9: { cellWidth: 18, halign: "right" },
      10: { cellWidth: 18, halign: "right" },
      11: { cellWidth: 18, halign: "right", fontStyle: "bold" },
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

export function extractCityName(address: string | null | undefined): string {
  if (!address) return "-"
  const cleaned = address.trim()
  const fillerRegex = /(?:Tal(?:uka)?|Dist(?:rict)?|City|State|Maharashtra|India|Pin|\b\d{6}\b|[:-])/gi
  const commaIndex = cleaned.lastIndexOf(",")
  if (commaIndex !== -1 && commaIndex < cleaned.length - 1) {
    let candidate = cleaned.substring(commaIndex + 1).trim()
    candidate = candidate.replace(fillerRegex, "").trim()
    if (candidate) {
      const words = candidate.split(/\s+/).filter(Boolean)
      return words.slice(-2).join(" ")
    }
  }
  const words = cleaned.replace(fillerRegex, "").split(/\s+/).filter(Boolean)
  if (words.length <= 2) return words.join(" ")
  
  const stateRegex = /^(Maharashtra|Gujarat|Karnataka|Goa|Delhi|Haryana|TamilNadu|Telangana|UP|MP|Rajasthan)$/i
  if (words.length > 2 && stateRegex.test(words[words.length - 1])) {
    return words.slice(-2, -1).join(" ")
  }

  return words.slice(-2).join(" ")
}

export function formatPdfCurrency(val: number | null | undefined): string {
  return `Rs. ${(val || 0).toLocaleString("en-IN")}`
}

export function formatPdfDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "-"
  try {
    const clean = dateStr.split("T")[0]
    const parts = clean.split("-")
    if (parts.length === 3 && parts[0].length === 4) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`
    }
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

export async function generateDirectoryPDF(
  projects: (Project | ProjectSummary)[],
  title: string,
  callRemarkMap: Record<string, string>,
  workRemarkMap: Record<string, string>,
  columnsConfig: Record<string, boolean>,
  callDateMap?: Record<string, string>
) {
  const doc = new jsPDF("landscape")
  const pageWidth = doc.internal.pageSize.width
  const compName = getActiveCompany()?.name || "Insiya Solar Industry"

  // B&W Crisp Print Header
  doc.setTextColor(0, 0, 0)
  doc.setFontSize(18)
  doc.setFont("helvetica", "bold")
  doc.text(compName, 14, 15)

  doc.setFontSize(9)
  doc.setFont("helvetica", "bold")
  doc.text(title, pageWidth - 14, 15, { align: "right" })

  // Double Line Separator
  doc.setLineWidth(0.8)
  doc.setDrawColor(0, 0, 0)
  doc.line(14, 18.5, pageWidth - 14, 18.5)
  doc.setLineWidth(0.2)
  doc.line(14, 19.5, pageWidth - 14, 19.5)

  doc.setFontSize(8)
  doc.setFont("helvetica", "normal")
  doc.text(`Generated Date: ${new Date().toLocaleDateString("en-IN")} | Total Results: ${projects.length}`, 14, 25)

  const allColumns = [
    { key: "S No.", header: "S No.", width: 8, align: "center", getVal: (p: any, idx: number) => idx + 1 },
    { key: "Customer Name", header: "Customer Name", width: 25, fontStyle: "bold", getVal: (p: any) => p.site_name },
    { key: "Mobile No.", header: "Mobile No.", width: 17, align: "center", getVal: (p: any) => p.mobile_number || "-" },
    { key: "ID", header: "ID", width: 10, align: "center", getVal: (p: any) => p.id_no },
    { key: "Type", header: "Type", width: 13, getVal: (p: any) => p.order_type },
    { key: "Firm Name", header: "Firm Name", width: 14, getVal: (p: any) => p.firm_name || "-" },
    { key: "Party Print", header: "Party Print", width: 14, getVal: (p: any) => p.party_print_name || "-" },
    { key: "Sales Man", header: "Sales Man", width: 14, getVal: (p: any) => p.salesman_name || "-" },
    { key: "City", header: "City", width: 15, getVal: (p: any) => extractCityName(p.address) },
    { key: "Order Val", header: "Order Val", width: 15, align: "right", getVal: (p: any) => formatPdfCurrency(p.order_value) },
    { key: "Extra Wrk", header: "Extra Wrk", width: 13, align: "right", getVal: (p: any) => formatPdfCurrency(p.extra_work_value || 0) },
    { key: "Received", header: "Received", width: 15, align: "right", getVal: (p: any) => formatPdfCurrency(p.payment_received) },
    { key: "Balance", header: "Balance", width: 15, align: "right", fontStyle: "bold", getVal: (p: any) => formatPdfCurrency(p.balance) },
    { key: "Reminder Date", header: "Reminder Date", width: 17, align: "center", getVal: (p: any) => formatPdfDate(p.reminder_date || (callDateMap && callDateMap[p.id])) },
    { key: "Work Rem", header: "Work Rem", width: 20, getVal: (p: any) => workRemarkMap[p.id] || p.work_remark || "-" },
    { key: "Call Rem", header: "Call Rem", width: "auto", getVal: (p: any) => callRemarkMap[p.id] || (p as any).last_call_remark || "-" },
  ];

  const activeColumns = allColumns.filter(c => columnsConfig[c.key] !== false);

  const tableHeaders = activeColumns.map(c => c.header);
  const tableRows = projects.map((p, idx) => activeColumns.map(c => c.getVal(p, idx)));

  const columnStyles: any = {};
  activeColumns.forEach((c, idx) => {
    columnStyles[idx] = {};
    if (c.align) columnStyles[idx].halign = c.align;
    if (c.fontStyle) columnStyles[idx].fontStyle = c.fontStyle;
    
    // Ensure first column header isn't bold if it wasn't specified (autoTable defaults to applying header styles, but we want our body font styles)
    if (c.fontStyle) {
        columnStyles[idx].textColor = [0, 0, 0];
    }
  });

  autoTable(doc, {
    head: [tableHeaders],
    body: tableRows,
    startY: 28,
    theme: "grid",
    headStyles: {
      fillColor: [240, 240, 240],
      textColor: [0, 0, 0],
      fontSize: 8.5,
      fontStyle: "bold",
      lineWidth: 0.2,
      lineColor: [120, 120, 120],
    },
    styles: {
      fontSize: 8,
      cellPadding: 3,
      textColor: [0, 0, 0],
      lineWidth: 0.2,
      lineColor: [120, 120, 120],
    },
    columnStyles,
  });

  doc.save(`Directory_Export_${new Date().toISOString().split("T")[0]}.pdf`);
}
