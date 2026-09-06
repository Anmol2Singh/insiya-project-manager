import ExcelJS from "exceljs"
import { DailyTransaction } from "./daily-transaction-types"

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

export async function exportDailyTransactionsToExcel(
  transactions: DailyTransaction[],
  companyName: string,
  openingBalance: number = 0
) {
  const dateStamp = new Date().toISOString().split("T")[0]
  const todayFormatted = formatDateDDMMYYYY(dateStamp)

  // 1. Calculate totals
  let totalDebit = 0
  let totalCredit = 0
  transactions.forEach((t) => {
    totalDebit += Number(t.debit_amount) || 0
    totalCredit += Number(t.credit_amount) || 0
  })
  const netBalance = openingBalance + totalCredit - totalDebit

  // 2. Create Workbook and Worksheet
  const workbook = new ExcelJS.Workbook()
  workbook.creator = "Project Manager"
  workbook.created = new Date()

  const worksheet = workbook.addWorksheet("Daily Transactions", {
    views: [{ showGridLines: true }],
  })

  // Standard thin border style for all tabular cells
  const thinBorder: Partial<ExcelJS.Borders> = {
    top: { style: "thin", color: { argb: "FF9E9E9E" } },
    left: { style: "thin", color: { argb: "FF9E9E9E" } },
    bottom: { style: "thin", color: { argb: "FF9E9E9E" } },
    right: { style: "thin", color: { argb: "FF9E9E9E" } },
  }

  // Header border (slightly darker)
  const headerBorder: Partial<ExcelJS.Borders> = {
    top: { style: "medium", color: { argb: "FF424242" } },
    left: { style: "thin", color: { argb: "FF9E9E9E" } },
    bottom: { style: "medium", color: { argb: "FF424242" } },
    right: { style: "thin", color: { argb: "FF9E9E9E" } },
  }

  // Row 1: Company Name (Merged A1:J1 & Centered)
  worksheet.mergeCells("A1:J1")
  const titleCell = worksheet.getCell("A1")
  titleCell.value = companyName.toUpperCase()
  titleCell.font = { name: "Calibri", size: 15, bold: true, color: { argb: "FF111827" } }
  titleCell.alignment = { horizontal: "center", vertical: "middle" }
  worksheet.getRow(1).height = 28

  // Row 2: Register Subtitle with Date (Merged A2:J2 & Centered)
  worksheet.mergeCells("A2:J2")
  const subTitleCell = worksheet.getCell("A2")
  subTitleCell.value = `DAILY TRANSACTIONS REGISTER  |  GENERATED: ${todayFormatted}`
  subTitleCell.font = { name: "Calibri", size: 10, italic: true, color: { argb: "FF4B5563" } }
  subTitleCell.alignment = { horizontal: "center", vertical: "middle" }
  worksheet.getRow(2).height = 18

  // Row 3: Blank spacing row
  worksheet.getRow(3).height = 10

  // Row 4: Column Headers
  const headerRow = worksheet.getRow(4)
  headerRow.height = 24
  headerRow.values = [
    "S No",
    "Date",
    "Firm Name",
    "Party Name",
    "Payment Mode",
    "Transaction",
    "Nature",
    "Remark",
    "Debit (Rs.)",
    "Credit (Rs.)",
  ]
  headerRow.font = { name: "Calibri", size: 11, bold: true, color: { argb: "FF111827" } }
  headerRow.alignment = { vertical: "middle" }
  headerRow.eachCell((cell, colNumber) => {
    cell.border = headerBorder
    if (colNumber === 9 || colNumber === 10) {
      cell.alignment = { horizontal: "right", vertical: "middle" }
    } else if (colNumber === 1 || colNumber === 2 || colNumber === 7) {
      cell.alignment = { horizontal: "center", vertical: "middle" }
    } else {
      cell.alignment = { horizontal: "left", vertical: "middle" }
    }
  })

  let currentRowIdx = 5

  // Data Rows
  transactions.forEach((t) => {
    const row = worksheet.getRow(currentRowIdx)
    row.height = 20
    row.values = [
      t.sr_no,
      formatDateDDMMYYYY(t.date),
      t.firm_name || companyName,
      t.party_name || "-",
      t.payment_mode || "Cash",
      t.transaction_name || "General",
      t.entry_nature || "-",
      t.remark || "-",
      Number(t.debit_amount) || 0,
      Number(t.credit_amount) || 0,
    ]
    row.font = { name: "Calibri", size: 10 }
    row.alignment = { vertical: "middle" }

    row.eachCell((cell, colNumber) => {
      cell.border = thinBorder
      if (colNumber === 9 || colNumber === 10) {
        cell.alignment = { horizontal: "right", vertical: "middle" }
        cell.numFmt = "#,##0.00"
      } else if (colNumber === 1 || colNumber === 2 || colNumber === 7) {
        cell.alignment = { horizontal: "center", vertical: "middle" }
      } else {
        cell.alignment = { horizontal: "left", vertical: "middle" }
      }
    })

    currentRowIdx++
  })

  // Summary Rows
  if (openingBalance > 0) {
    const opRow = worksheet.getRow(currentRowIdx)
    opRow.height = 22
    for (let c = 1; c <= 7; c++) {
      opRow.getCell(c).border = thinBorder
    }
    opRow.getCell(8).value = "OPENING BALANCE (CR)"
    opRow.getCell(8).font = { name: "Calibri", size: 10, bold: true }
    opRow.getCell(8).alignment = { horizontal: "right", vertical: "middle" }
    opRow.getCell(8).border = thinBorder

    opRow.getCell(9).value = 0
    opRow.getCell(9).font = { name: "Calibri", size: 10, bold: true }
    opRow.getCell(9).border = thinBorder
    opRow.getCell(9).alignment = { horizontal: "right", vertical: "middle" }
    opRow.getCell(9).numFmt = "#,##0.00"

    opRow.getCell(10).value = openingBalance
    opRow.getCell(10).font = { name: "Calibri", size: 10, bold: true }
    opRow.getCell(10).border = thinBorder
    opRow.getCell(10).alignment = { horizontal: "right", vertical: "middle" }
    opRow.getCell(10).numFmt = "#,##0.00"
    currentRowIdx++
  }

  // TOTAL Row
  const totalRow = worksheet.getRow(currentRowIdx)
  totalRow.height = 22
  for (let c = 1; c <= 7; c++) {
    totalRow.getCell(c).border = thinBorder
  }
  totalRow.getCell(8).value = "TOTAL"
  totalRow.getCell(8).font = { name: "Calibri", size: 11, bold: true }
  totalRow.getCell(8).alignment = { horizontal: "right", vertical: "middle" }
  totalRow.getCell(8).border = thinBorder

  totalRow.getCell(9).value = totalDebit
  totalRow.getCell(9).font = { name: "Calibri", size: 11, bold: true }
  totalRow.getCell(9).border = thinBorder
  totalRow.getCell(9).alignment = { horizontal: "right", vertical: "middle" }
  totalRow.getCell(9).numFmt = "#,##0.00"

  totalRow.getCell(10).value = totalCredit
  totalRow.getCell(10).font = { name: "Calibri", size: 11, bold: true }
  totalRow.getCell(10).border = thinBorder
  totalRow.getCell(10).alignment = { horizontal: "right", vertical: "middle" }
  totalRow.getCell(10).numFmt = "#,##0.00"
  currentRowIdx++

  // NET BALANCE Row
  const netRow = worksheet.getRow(currentRowIdx)
  netRow.height = 22
  for (let c = 1; c <= 7; c++) {
    netRow.getCell(c).border = thinBorder
  }
  netRow.getCell(8).value = "NET BALANCE"
  netRow.getCell(8).font = { name: "Calibri", size: 11, bold: true }
  netRow.getCell(8).alignment = { horizontal: "right", vertical: "middle" }
  netRow.getCell(8).border = thinBorder

  netRow.getCell(9).value = netBalance < 0 ? Math.abs(netBalance) : 0
  netRow.getCell(9).font = { name: "Calibri", size: 11, bold: true }
  netRow.getCell(9).border = thinBorder
  netRow.getCell(9).alignment = { horizontal: "right", vertical: "middle" }
  netRow.getCell(9).numFmt = "#,##0.00"

  netRow.getCell(10).value = netBalance >= 0 ? netBalance : 0
  netRow.getCell(10).font = { name: "Calibri", size: 11, bold: true }
  netRow.getCell(10).border = thinBorder
  netRow.getCell(10).alignment = { horizontal: "right", vertical: "middle" }
  netRow.getCell(10).numFmt = "#,##0.00"

  // Auto-fit Column Widths
  const defaultWidths = [8, 14, 26, 26, 20, 22, 14, 28, 18, 18]
  worksheet.columns.forEach((column, colIdx) => {
    let maxLen = defaultWidths[colIdx] || 12
    column.eachCell?.({ includeEmpty: false }, (cell) => {
      // Don't count merged title rows towards column widths
      if (Number(cell.row) > 2 && cell.value) {
        const str = cell.value.toString()
        if (str.length > maxLen) {
          maxLen = str.length
        }
      }
    })
    column.width = Math.min(Math.max(maxLen + 3, defaultWidths[colIdx] || 12), 45)
  })

  // Generate buffer and trigger browser download
  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  const safeCompanyName = companyName.replace(/[^a-zA-Z0-9_-]/g, "_")
  anchor.download = `Daily_Transactions_${safeCompanyName}_${dateStamp}.xlsx`
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  URL.revokeObjectURL(url)
}
