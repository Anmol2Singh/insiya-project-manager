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
import { Label } from "@/components/ui/label"
import { Upload, CheckCircle2, Download, AlertTriangle, ArrowRight } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { createClient } from "@/lib/supabase/client"
import { getActiveCompany } from "@/lib/company-store"
import { toast } from "sonner"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Checkbox } from "@/components/ui/checkbox"

interface UpdateExcelDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

type MatchKey = "id" | "site_name"

const AVAILABLE_COLUMNS = [
  { label: "ID Number", field: "id_no" },
  { label: "Item Group", field: "order_type" },
  { label: "Item Name", field: "hp_type" },
  { label: "Item Qty", field: "hp_qty" },
  { label: "Tank Type", field: "tank_type" },
  { label: "Tank Qty", field: "tank_qty" },
  { label: "Sales Man Name", field: "salesman_name" },
  { label: "Customer / Site Name", field: "site_name" },
  { label: "Firm Name", field: "firm_name" },
  { label: "Party Print Name", field: "party_print_name" },
  { label: "Mobile Number", field: "mobile_number" },
  { label: "Address", field: "address" },
  { label: "Order Value (Rs)", field: "order_value" },
  { label: "Extra Work Value (Rs)", field: "extra_work_value" },
  { label: "Payment Received (Rs)", field: "payment_received" },
  { label: "Last Work Remark", field: "work_remark" },
]

export function UpdateExcelDialog({ open, onOpenChange, onSuccess }: UpdateExcelDialogProps) {
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [updateProgress, setUpdateProgress] = useState(0)
  const [parsedData, setParsedData] = useState<any[] | null>(null)
  
  const [matchKey, setMatchKey] = useState<MatchKey>("id")
  const [selectedColumns, setSelectedColumns] = useState<Set<string>>(new Set())

  // Reset state when dialog opens/closes
  React.useEffect(() => {
    if (open) {
      setFile(null)
      setParsedData(null)
      setUpdateProgress(0)
      setSelectedColumns(new Set())
    }
  }, [open])

  const handleDownloadTemplate = () => {
    const templateData = [
      {
        "ID Number": 1001,
        "Customer / Site Name": "Sample Customer Site 1",
        "Firm Name": "Playlab Ventures",
        "Party Print Name": "Playlab Ventures",
        "Mobile Number": "+91 9876543210",
        "Address": "Pune, Maharashtra",
        "Item Group": "Heat Pump",
        "Item Name": "50KW",
        "Item Qty": 2,
        "Tank Type": "GI Pressurized",
        "Tank Qty": 1,
        "Sales Man Name": "John Doe",
        "Order Value (Rs)": 50000,
        "Extra Work Value (Rs)": 0,
        "Payment Received (Rs)": 0,
        "Last Work Remark": "Updated via Excel",
      }
    ]

    const worksheet = XLSX.utils.json_to_sheet(templateData)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, "Template")
    XLSX.writeFile(workbook, "Update_Customer_Template.xlsx")
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
        
        if (data.length === 0) {
          toast.error("File is empty")
          setParsedData(null)
          return
        }

        // Auto-select columns that exist in the file (excluding match key equivalents)
        const headers = Object.keys(data[0] as object)
        const autoSelected = new Set<string>()
        AVAILABLE_COLUMNS.forEach(col => {
          if (headers.includes(col.label)) {
            autoSelected.add(col.field)
          }
        })
        
        setSelectedColumns(autoSelected)
        setParsedData(data)
      } catch (err) {
        console.error("Error reading excel file:", err)
        toast.error("Failed to parse Excel file. Please ensure it is a valid .xlsx or .csv file.")
        setParsedData(null)
      }
    }
    reader.readAsBinaryString(selectedFile)
  }

  const toggleColumnSelection = (field: string) => {
    setSelectedColumns(prev => {
      const next = new Set(prev)
      if (next.has(field)) next.delete(field)
      else next.add(field)
      return next
    })
  }

  const handleUpdate = async () => {
    if (!parsedData || parsedData.length === 0) {
      toast.error("No valid data found in file")
      return
    }

    if (selectedColumns.size === 0) {
      toast.error("Please select at least one column to update")
      return
    }

    setLoading(true)
    try {
      const supabase = createClient()
      const company = getActiveCompany()
      const { data: existingProjects } = await supabase.from("projects").select("*").eq("company_id", company?.id)
      const projectsList: any[] = existingProjects || []

      let updatedCount = 0
      let skippedCount = 0

      for (let i = 0; i < parsedData.length; i++) {
        const row = parsedData[i]
        setUpdateProgress(Math.round(((i + 1) / parsedData.length) * 100))

        const normalize = (s: any) => String(s || "").trim().toLowerCase()
        
        let existing = null

        // 1. Find Existing Record based on Match Key
        if (matchKey === "id") {
          const id_no_val = row["ID Number"] || row["Customer ID"] || row["ID"] || row["id_no"] || row["Id Number"]
          const id_no = id_no_val ? parseInt(id_no_val) : null
          if (id_no && !isNaN(id_no)) {
             existing = projectsList.find((p) => p.id_no === id_no)
          }
        } else {
          const site_name = row["Customer / Site Name"] || row["Site Name"] || row["Site"] || row["site_name"] || row["Name"] || ""
          const currentSiteName = normalize(site_name)
          if (currentSiteName) {
            existing = projectsList.find((p) => normalize(p.site_name) === currentSiteName)
          }
        }

        // 2. If match found, apply updates
        if (existing) {
          const updatePayload: any = {}
          let hasChanges = false

          AVAILABLE_COLUMNS.forEach(col => {
            if (selectedColumns.has(col.field)) {
               let val = row[col.label]
               // Some aliases checks just in case
               if (val === undefined && col.field === "site_name") val = row["Site Name"] || row["Site"] || row["site_name"] || row["Name"]
               if (val === undefined && col.field === "order_value") val = row["Order Value"] || row["order_value"]
               if (val === undefined && col.field === "hp_qty") val = row["HP Qty"] || row["hp_qty"]
               if (val === undefined && col.field === "tank_qty") val = row["tank_qty"]
               if (val === undefined && col.field === "work_remark") val = row["Remark"] || row["work_remark"]
               
               if (val !== undefined && val !== null) {
                  // Type conversion based on field
                  if (["hp_qty", "tank_qty", "id_no"].includes(col.field)) {
                     val = parseInt(val)
                     if (isNaN(val)) val = null
                  } else if (["order_value", "extra_work_value", "payment_received"].includes(col.field)) {
                     val = parseFloat(val)
                     if (isNaN(val)) val = 0
                  } else {
                     val = String(val).trim()
                  }
                  
                  if (val !== existing[col.field]) {
                     updatePayload[col.field] = val
                     hasChanges = true
                  }
               }
            }
          })

          if (hasChanges) {
            await supabase.from("projects").update(updatePayload).eq("id", existing.id)
            updatedCount++
          } else {
            skippedCount++ // Matched but no changes
          }
        } else {
          skippedCount++ // No match found
        }
      }

      setUpdateProgress(100)
      setTimeout(() => {
        const successMsg = `Update completed: ${updatedCount} records updated, ${skippedCount} skipped.`
        toast.success(successMsg)
        setTimeout(() => alert(successMsg), 100)
        onSuccess()
        onOpenChange(false)
        setFile(null)
        setParsedData(null)
      }, 500)
    } catch (err: any) {
      console.error("Error during bulk update:", err)
      toast.error(err.message || "An error occurred during update")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <Upload className="h-5 w-5 text-primary" />
            Bulk Update via Excel
          </DialogTitle>
          <DialogDescription>
            Update existing customer records by uploading an Excel file. New records will not be created.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-12 space-y-6">
            <div className="text-center space-y-2">
              <h3 className="text-lg font-bold">Updating Records...</h3>
              <p className="text-sm text-muted-foreground">Please do not close this window</p>
            </div>
            <Progress value={updateProgress} className="h-3" />
            <div className="text-center text-sm font-medium text-muted-foreground">
              {updateProgress}% Complete
            </div>
          </div>
        ) : !parsedData ? (
          <div className="space-y-6 py-4">
            <div className="bg-muted/50 p-4 rounded-xl space-y-3 border border-border/50">
              <h4 className="font-bold text-sm">How it works:</h4>
              <ol className="text-sm text-muted-foreground list-decimal pl-5 space-y-1">
                <li>Download the template or use your exported Excel file.</li>
                <li>Ensure the match key (ID or Customer Name) is present and correct.</li>
                <li>Upload the file, then select which columns you want to overwrite.</li>
              </ol>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadTemplate}
                className="mt-2 text-xs font-bold"
              >
                <Download className="h-3.5 w-3.5 mr-1.5" /> Download Template
              </Button>
            </div>

            <div className="space-y-4">
              <Label className="text-sm font-bold">Upload Excel/CSV File</Label>
              <div className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:bg-muted/30 transition-colors">
                <input
                  type="file"
                  id="update-excel-upload"
                  accept=".xlsx, .xls, .csv"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <label
                  htmlFor="update-excel-upload"
                  className="cursor-pointer flex flex-col items-center justify-center space-y-2"
                >
                  <Upload className="h-8 w-8 text-muted-foreground" />
                  <span className="font-medium">Click to select file</span>
                  <span className="text-xs text-muted-foreground">.xlsx, .xls, or .csv</span>
                </label>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6 py-4">
            <div className="bg-primary/5 p-4 rounded-xl flex items-center justify-between border border-primary/20">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-success" />
                <div>
                  <h4 className="font-bold text-sm">File Parsed Successfully</h4>
                  <p className="text-xs text-muted-foreground">{parsedData.length} row(s) found</p>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setParsedData(null)} className="h-8 text-xs">
                Cancel
              </Button>
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-bold flex items-center gap-2">
                Step 1: Choose Match Key <ArrowRight className="h-3 w-3 text-muted-foreground" />
              </Label>
              <RadioGroup value={matchKey} onValueChange={(val) => setMatchKey(val as MatchKey)} className="flex flex-col space-y-1 bg-muted/20 p-3 rounded-xl border border-border/50">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="id" id="r1" />
                  <Label htmlFor="r1" className="cursor-pointer">Match by ID Number (Recommended)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="site_name" id="r2" />
                  <Label htmlFor="r2" className="cursor-pointer">Match by Customer / Site Name</Label>
                </div>
              </RadioGroup>
              <p className="text-xs text-muted-foreground px-1">
                Records in the file without a matching {matchKey === "id" ? "ID" : "Customer Name"} in the database will be skipped.
              </p>
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-bold flex items-center gap-2">
                Step 2: Select Columns to Update <ArrowRight className="h-3 w-3 text-muted-foreground" />
              </Label>
              <div className="bg-muted/20 p-4 rounded-xl border border-border/50 grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[300px] overflow-y-auto">
                {AVAILABLE_COLUMNS.map((col) => {
                  // Disable if it's the match key
                  if (matchKey === "id" && col.field === "id_no") return null;
                  if (matchKey === "site_name" && col.field === "site_name") return null;

                  return (
                    <div key={col.field} className="flex items-center space-x-2">
                      <Checkbox 
                        id={`chk-${col.field}`} 
                        checked={selectedColumns.has(col.field)}
                        onCheckedChange={() => toggleColumnSelection(col.field)}
                      />
                      <Label htmlFor={`chk-${col.field}`} className="cursor-pointer text-sm">
                        {col.label}
                      </Label>
                    </div>
                  )
                })}
              </div>
              <div className="flex items-center gap-2 text-warning bg-warning/10 p-3 rounded-lg text-xs font-semibold">
                <AlertTriangle className="h-4 w-4" />
                Only checked columns will be overwritten. Unchecked columns will remain untouched.
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <Button onClick={handleUpdate} disabled={selectedColumns.size === 0} className="font-bold">
                Apply Updates
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
