"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Settings } from "lucide-react"
import { PDF_COLUMNS, getPdfColumnsConfig, savePdfColumnsConfig } from "@/lib/pdf-columns-store"

export function PdfColumnsDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [config, setConfig] = useState<Record<string, boolean>>({})

  useEffect(() => {
    if (open) {
      setConfig(getPdfColumnsConfig())
    }
  }, [open])

  const handleToggle = (col: string, checked: boolean) => {
    setConfig(prev => ({ ...prev, [col]: checked }))
  }

  const handleSave = () => {
    savePdfColumnsConfig(config)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-3xl p-6">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <Settings className="h-5 w-5 text-primary" />
            PDF Export Columns
          </DialogTitle>
        </DialogHeader>

        <div className="py-2 space-y-4">
          <p className="text-sm text-muted-foreground font-medium">
            Select the columns you want to include when exporting the Homepage and Filter Directory to PDF.
          </p>
          <div className="grid grid-cols-2 gap-3 max-h-[40vh] overflow-y-auto p-2 bg-muted/20 border rounded-2xl">
            {PDF_COLUMNS.map((col) => (
              <label
                key={col}
                className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-muted/50 cursor-pointer transition-colors border border-transparent hover:border-border/50"
              >
                <Checkbox
                  checked={config[col] !== false}
                  onCheckedChange={(checked) => handleToggle(col, checked === true)}
                  className="rounded-md"
                />
                <span className="text-sm font-semibold select-none">{col}</span>
              </label>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl font-bold">
            Cancel
          </Button>
          <Button type="button" onClick={handleSave} className="rounded-xl font-bold bg-primary text-primary-foreground">
            Save Config
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
