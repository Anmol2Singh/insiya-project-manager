"use client"

import React, { useState } from "react"
import * as XLSX from "xlsx"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Upload, FileSpreadsheet, CheckCircle2, Download } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { createClient } from "@/lib/supabase/client"
import { getActiveCompany, getCompanies } from "@/lib/company-store"
import { toast } from "sonner"

interface ImportExcelDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function ImportExcelDialog({ open, onOpenChange, onSuccess }: ImportExcelDialogProps) {
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [importProgress, setImportProgress] = useState(0)
  const [parsedData, setParsedData] = useState<any[] | null>(null)

  const handleDownloadTemplate = () => {
    const templateData = [
      {
        "ID Number": 1001,
        "Site Name": "Sample Customer Site 1",
        "Mobile Number": "+91 9876543210",
        "Address": "Pune, Maharashtra",
        "Firm Name": "Playlab Ventures",
        "Party Print Name": "Playlab Ventures",
        "Sales Man Name": "John Doe",
        "Item Group": "Heat Pump",
        "Order Value": 50000,
        "Item Name": "50KW",
        "Item Qty": 2,
        "Tank Type": "GI Pressurized",
        "Tank Qty": 1,
        "Remark": "Initial material dispatched",
      },
      {
        "ID Number": 1002,
        "Site Name": "Sample Customer Site 2",
        "Mobile Number": "+91 9123456789",
        "Address": "Mumbai, Maharashtra",
        "Firm Name": "Insiya Trading",
        "Party Print Name": "Insiya Trading Corp",
        "Sales Man Name": "Jane Smith",
        "Item Group": "Solar Water Heater",
        "Order Value": 75000,
        "Item Name": "6HP",
        "Item Qty": 1,
        "Tank Type": "Stainless Steel",
        "Tank Qty": 2,
        "Remark": "Installation in progress",
      },
    ]

    const worksheet = XLSX.utils.json_to_sheet(templateData)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, "Template")
    XLSX.writeFile(workbook, "Customer_Import_Template.xlsx")
    toast.success("Excel template downloaded!")
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return
    setFile(selectedFile)

    const reader = new FileReader()
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result
        const wb = XLSX.read(bstr, { type: "binary" })
        const wsname = wb.SheetNames[0]
        const ws = wb.Sheets[wsname]
        const data = XLSX.utils.sheet_to_json(ws)
        setParsedData(data)
      } catch (err) {
        console.error("Error reading excel file:", err)
        toast.error("Failed to parse Excel file. Please ensure it is a valid .xlsx or .csv file.")
        setParsedData(null)
      }
    }
    reader.readAsBinaryString(selectedFile)
  }

  const handleImport = async () => {
    if (!parsedData || parsedData.length === 0) {
      toast.error("No valid data found in file")
      return
    }

    setLoading(true)
    try {
      const supabase = createClient()
      const { data: existingProjects } = await supabase.from("projects").select("*")
      const projectsList: any[] = existingProjects || []

      let insertedCount = 0
      let updatedCount = 0
      let skippedCount = 0

      for (let i = 0; i < parsedData.length; i++) {
        const row = parsedData[i]
        setImportProgress(Math.round(((i + 1) / parsedData.length) * 100))

        const id_no_val = row["ID Number"] || row["Customer ID"] || row["ID"] || row["id_no"] || row["Id Number"]
        const id_no = id_no_val ? parseInt(id_no_val) : null
        const site_name = row["Site Name"] || row["Customer / Site Name"] || row["Site"] || row["site_name"] || row["Name"] || ""
        const mobile_number = row["Mobile Number"] || row["Mobile"] || row["mobile_number"] || row["Phone"] || null
        const address = row["Address"] || row["address"] || row["Location"] || "-"
        const order_type = row["Item Group"] || row["Type"] || row["Order Type"] || row["order_type"] || "Heat Pump"
        const salesman_name = row["Sales Man Name"] || row["Sales Man"] || row["Salesman"] || row["Salesman Name"] || row["salesman_name"] || null
        const firm_name = row["Firm Name"] || row["firm_name"] || null
        const party_print_name = row["Party Print Name"] || row["party_print_name"] || null
        
        const order_val_raw = row["Order Value"] ?? row["Order Value (Rs)"] ?? row["order_value"] ?? row["Order_Value"]
        const order_value = order_val_raw !== undefined && order_val_raw !== null && order_val_raw !== "" ? parseFloat(order_val_raw) : null

        const hp_type = row["Item Name"] || row["HP Type"] || row["hp_type"] || null
        const hp_qty_raw = row["Item Qty"] ?? row["HP Qty"] ?? row["hp_qty"]
        const hp_qty = hp_qty_raw !== undefined && hp_qty_raw !== null && hp_qty_raw !== "" ? parseInt(hp_qty_raw) : null

        const tank_type = row["Tank Type"] || row["tank_type"] || null
        const tank_qty_raw = row["Tank Qty"] ?? row["tank_qty"]
        const tank_qty = tank_qty_raw !== undefined && tank_qty_raw !== null && tank_qty_raw !== "" ? parseInt(tank_qty_raw) : null

        let work_remark = row["Remark"] || row["Work Remark"] || row["Last Work Remark"] || row["work_remark"] || null

        // ALWAYS preserve the original raw ID in the remark if it's provided in the CSV
        if (id_no_val && String(id_no_val).trim() !== "") {
           const legacyStr = `[Legacy ID: ${id_no_val}]`
           if (!work_remark || !work_remark.includes(legacyStr)) {
               work_remark = `${legacyStr} ` + (work_remark || "")
           }
        }

        // Match existing entry by ID Number, Site Name, and Order Type
        const normalize = (s: string | null) => (s || "").trim().toLowerCase()
        const currentSiteName = normalize(site_name)
        const currentOrderType = normalize(order_type)

        let existing = null
        if (id_no && !isNaN(id_no)) {
          const matches = projectsList.filter((p) => p.id_no === id_no)
          if (matches.length > 0) {
            const exactMatch = matches.find(p => 
              normalize(p.site_name) === currentSiteName &&
              normalize(p.order_type) === currentOrderType
            )
            if (exactMatch) {
              existing = exactMatch
            }
          }
        }
        if (!existing && site_name) {
          existing = projectsList.find(
            (p) => normalize(p.site_name) === currentSiteName && normalize(p.order_type) === currentOrderType
          )
        }

        if (existing) {
          // Update fields if provided and changed
          const updatePayload: any = {}
          if (site_name && site_name !== existing.site_name) updatePayload.site_name = site_name
          if (mobile_number && mobile_number !== existing.mobile_number) updatePayload.mobile_number = mobile_number
          if (address && address !== "-" && address !== existing.address) updatePayload.address = address
          if (order_type && order_type !== existing.order_type) updatePayload.order_type = order_type
          if (salesman_name && salesman_name !== existing.salesman_name) updatePayload.salesman_name = salesman_name
          if (firm_name && firm_name !== existing.firm_name) updatePayload.firm_name = firm_name
          if (party_print_name && party_print_name !== existing.party_print_name) updatePayload.party_print_name = party_print_name
          if (order_value !== null && !isNaN(order_value) && order_value !== existing.order_value) {
            updatePayload.order_value = order_value
          }
          if (hp_type && hp_type !== existing.hp_type) updatePayload.hp_type = hp_type
          if (hp_qty !== null && !isNaN(hp_qty) && hp_qty !== existing.hp_qty) updatePayload.hp_qty = hp_qty
          if (tank_type && tank_type !== existing.tank_type) updatePayload.tank_type = tank_type
          if (tank_qty !== null && !isNaN(tank_qty) && tank_qty !== existing.tank_qty) updatePayload.tank_qty = tank_qty
          if (work_remark && work_remark !== existing.work_remark) updatePayload.work_remark = work_remark

          if (Object.keys(updatePayload).length > 0) {
            await supabase.from("projects").update(updatePayload).eq("id", existing.id)
            updatedCount++
          } else {
            skippedCount++
          }

          // Auto-create ledger entry for Order Value if provided and no "Order Value" ledger row exists
          if (order_value !== null && !isNaN(order_value) && order_value > 0) {
            const { data: existingLedger } = await supabase
              .from("ledger_entries")
              .select("*")
              .eq("project_id", existing.id)
            // Only block if there is already a row literally named "Order Value"
            const hasOrderEntry = Array.isArray(existingLedger)
              ? existingLedger.some((e: any) => String(e.particulars).trim().toLowerCase() === "order value")
              : false
            if (!hasOrderEntry) {
              await supabase.from("ledger_entries").insert({
                project_id: existing.id,
                sr_no: 1,
                date: new Date().toISOString().split("T")[0],
                particulars: "Order Value",
                payment_type: null,
                reference_number: null,
                invoice_no: null,
                bill_submitted: false,
                payment_receipt: false,
                sales_m_value: 0,
                m_outward_value: 0,
                order_value: order_value,
                extra_work_value: 0,
                payment_received: 0,
              })
            }
          }
        } else {
          // Entry does not exist -> insert new project
          const activeCompany = getActiveCompany()
          let targetCompanyId = activeCompany.id

          let final_id_no = id_no
          if (final_id_no && projectsList.some(p => p.id_no === final_id_no)) {
            const maxId = projectsList.reduce((max, p) => (p.id_no && p.id_no > max ? p.id_no : max), 0)
            final_id_no = maxId + 1
          } else if (!final_id_no) {
            const maxId = projectsList.reduce((max, p) => (p.id_no && p.id_no > max ? p.id_no : max), 0)
            final_id_no = maxId + 1
          }

          const insertPayload: any = {
            id_no: final_id_no,
            site_name: site_name || "Imported Customer",
            mobile_number,
            address,
            order_type,
            order_value: order_value !== null && !isNaN(order_value) ? order_value : 0,
            extra_work_value: 0,
            payment_received: 0,
            hp_type,
            hp_qty: hp_qty || 0,
            tank_type,
            tank_qty: tank_qty || 0,
            salesman_name,
            firm_name,
            party_print_name,
            work_remark,
            sales_m_value: 0,
            m_outward_value: 0,
            m_balance: 0,
            company_id: targetCompanyId,
          }

          const { data: newProject, error } = await supabase.from("projects").insert(insertPayload).select().single()
          
          if (error) {
            console.error("Failed to insert project:", error)
            skippedCount++
            continue
          }

          insertedCount++
          if (newProject) {
            projectsList.push(newProject)
          }

          // Auto-create ledger entry for Order Value if provided
          const newProjectId = (newProject as any)?.id
          if (newProjectId && order_value !== null && !isNaN(order_value) && order_value > 0) {
            await supabase.from("ledger_entries").insert({
              project_id: newProjectId,
              sr_no: 1,
              date: new Date().toISOString().split("T")[0],
              particulars: "Order Value",
              payment_type: null,
              reference_number: null,
              invoice_no: null,
              bill_submitted: false,
              payment_receipt: false,
              sales_m_value: 0,
              m_outward_value: 0,
              order_value: order_value,
              extra_work_value: 0,
              payment_received: 0,
            })
          }
        }
      }

      toast.success(`Import completed: ${insertedCount} added, ${updatedCount} updated, ${skippedCount} skipped. (Parsed ${parsedData.length} rows)`)
      setFile(null)
      setParsedData(null)
      onSuccess()
      onOpenChange(false)
    } catch (error: any) {
      console.error("Error importing data:", error)
      toast.error(error.message || "Failed to import customers")
    } finally {
      setLoading(false)
      setImportProgress(0)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            Import Customers from Excel
          </DialogTitle>
          <DialogDescription>
            Upload an Excel (.xlsx or .csv) file or download a sample template to start.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="flex justify-between items-center bg-muted/40 p-3 rounded-xl border border-border">
            <div className="text-xs">
              <p className="font-bold text-foreground">Need a sample file?</p>
              <p className="text-muted-foreground">Download pre-formatted Excel template</p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDownloadTemplate}
              className="bg-card text-primary border-primary/30 font-bold text-xs hover:bg-primary/10"
            >
              <Download className="h-3.5 w-3.5 mr-1.5" />
              Download Template
            </Button>
          </div>

          <div className="border-2 border-dashed border-border hover:border-primary/50 transition-colors rounded-2xl p-6 text-center bg-muted/20">
            <Input
              id="excel-file"
              type="file"
              accept=".xlsx, .xls, .csv"
              onChange={handleFileChange}
              className="hidden"
            />
            <Label
              htmlFor="excel-file"
              className="cursor-pointer flex flex-col items-center justify-center gap-2"
            >
              <Upload className="h-8 w-8 text-muted-foreground" />
              <span className="text-sm font-semibold text-foreground">
                {file ? file.name : "Click to select Excel file (.xlsx, .csv)"}
              </span>
              <p className="text-xs text-muted-foreground mt-4 leading-relaxed bg-muted/30 p-3 rounded-xl border border-border/50 shadow-inner">
                <strong className="text-foreground">Required format:</strong> Use the template to avoid errors.<br />
                <span className="opacity-80">Columns: ID Number, Site Name, Mobile Number, Address, Sales Man Name, Firm Name, Party Print Name, Item Group, Order Value, Item Name, Item Qty, Tank Type, Tank Qty, Remark</span>
              </p>
            </Label>
          </div>

          {parsedData && (
            <div className="bg-success/10 border border-success/20 rounded-xl p-3 flex items-center gap-2 text-success text-xs font-semibold">
              <CheckCircle2 className="h-4 w-4" />
              Found {parsedData.length} customer records ready for import.
            </div>
          )}
        </div>

        {loading && (
          <div className="space-y-2 mt-4 px-2">
            <div className="flex justify-between text-xs font-semibold text-muted-foreground">
              <span>Importing records...</span>
              <span>{importProgress}%</span>
            </div>
            <Progress value={importProgress} className="h-2" />
          </div>
        )}

        <div className="flex justify-end gap-3 pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleImport}
            disabled={loading || !parsedData || parsedData.length === 0}
            className="bg-primary text-primary-foreground font-bold"
          >
            {loading ? "Importing..." : `Import ${parsedData ? parsedData.length : 0} Customers`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
