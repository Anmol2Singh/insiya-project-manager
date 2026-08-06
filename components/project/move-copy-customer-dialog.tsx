"use client"

import React, { useState } from "react"
import { useRouter } from "next/navigation"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { getCompanies, getActiveCompany } from "@/lib/company-store"
import { createClient } from "@/lib/supabase/client"
import { getCompanyStorageKey, getStoredData, setStoredData, generateUUID } from "@/lib/local-db"
import type { Project, DBData } from "@/lib/types"
import { toast } from "sonner"
import { CopyPlus, ArrowRightLeft, Copy } from "lucide-react"

interface MoveCopyCustomerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  project: Project
}

export function MoveCopyCustomerDialog({ open, onOpenChange, project }: MoveCopyCustomerDialogProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const currentCompany = getActiveCompany()
  const otherCompanies = getCompanies().filter((c) => c && c.id !== currentCompany.id)

  const [targetCompanyId, setTargetCompanyId] = useState<string>(
    otherCompanies[0]?.id || ""
  )
  const [action, setAction] = useState<"move" | "copy">("move")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!targetCompanyId) {
      toast.error("Please select a target company")
      return
    }

    const targetCompany = getCompanies().find((c) => c.id === targetCompanyId)
    if (!targetCompany) return

    setLoading(true)

    try {
      const supabase = createClient()

      // Fetch project & all linked records
      const [
        { data: projData },
        { data: ledgerEntries },
        { data: paymentTerms },
        { data: expenses },
        { data: callingRecords },
        { data: swhChecklist },
        { data: workRemarks },
      ] = await Promise.all([
        supabase.from("projects").select("*").eq("id", project.id).single(),
        supabase.from("ledger_entries").select("*").eq("project_id", project.id),
        supabase.from("payment_terms").select("*").eq("project_id", project.id),
        supabase.from("expenses").select("*").eq("project_id", project.id),
        supabase.from("calling_records").select("*").eq("project_id", project.id),
        supabase.from("swh_checklist").select("*").eq("project_id", project.id),
        supabase.from("work_remarks").select("*").eq("project_id", project.id),
      ])

      const currentProj = projData || project

      // Check if local DB is being used by checking localStorage key
      const currentStorageKey = getCompanyStorageKey()
      const targetStorageKey = `checklist_app_local_db_${targetCompanyId}`

      if (typeof window !== "undefined" && localStorage.getItem(currentStorageKey)) {
        // Local DB Mode
        let targetRaw = localStorage.getItem(targetStorageKey)
        let targetData: DBData = {
          projects: [],
          payment_terms: [],
          ledger_entries: [],
          expenses: [],
          calling_records: [],
          swh_checklist: [],
          work_remarks: [],
        }

        if (targetRaw) {
          try {
            targetData = JSON.parse(targetRaw)
          } catch (err) {}
        }

        if (action === "move") {
          targetData.projects.push({ ...currentProj, company_id: targetCompanyId })
          targetData.ledger_entries.push(...(ledgerEntries || []))
          targetData.payment_terms.push(...(paymentTerms || []))
          targetData.expenses.push(...(expenses || []))
          targetData.calling_records.push(...(callingRecords || []))
          targetData.swh_checklist.push(...(swhChecklist || []))
          targetData.work_remarks.push(...(workRemarks || []))
          localStorage.setItem(targetStorageKey, JSON.stringify(targetData))

          // Remove from current company DB
          const currentData = getStoredData()
          currentData.projects = currentData.projects.filter((p) => p.id !== project.id)
          currentData.ledger_entries = currentData.ledger_entries.filter((e) => e.project_id !== project.id)
          currentData.payment_terms = currentData.payment_terms.filter((t) => t.project_id !== project.id)
          currentData.expenses = currentData.expenses.filter((ex) => ex.project_id !== project.id)
          currentData.calling_records = currentData.calling_records.filter((c) => c.project_id !== project.id)
          currentData.swh_checklist = currentData.swh_checklist.filter((sc) => sc.project_id !== project.id)
          currentData.work_remarks = currentData.work_remarks.filter((w) => w.project_id !== project.id)
          setStoredData(currentData)
        } else {
          // Copy mode
          const newProjectId = generateUUID()
          const nextIdNo = (targetData.projects.reduce((max, p) => Math.max(max, p.id_no || 0), 0) || 1000) + 1
          const newProject = {
            ...currentProj,
            id: newProjectId,
            id_no: nextIdNo,
            company_id: targetCompanyId,
          }
          targetData.projects.push(newProject)

          ;(ledgerEntries || []).forEach((e) => {
            targetData.ledger_entries.push({ ...e, id: generateUUID(), project_id: newProjectId })
          })
          ;(paymentTerms || []).forEach((t) => {
            targetData.payment_terms.push({ ...t, id: generateUUID(), project_id: newProjectId })
          })
          ;(expenses || []).forEach((ex) => {
            targetData.expenses.push({ ...ex, id: generateUUID(), project_id: newProjectId })
          })
          ;(callingRecords || []).forEach((c) => {
            targetData.calling_records.push({ ...c, id: generateUUID(), project_id: newProjectId })
          })
          ;(swhChecklist || []).forEach((sc) => {
            targetData.swh_checklist.push({ ...sc, id: generateUUID(), project_id: newProjectId })
          })
          ;(workRemarks || []).forEach((w) => {
            targetData.work_remarks.push({ ...w, id: generateUUID(), project_id: newProjectId })
          })

          localStorage.setItem(targetStorageKey, JSON.stringify(targetData))
        }
      } else {
        // Supabase Mode
        if (action === "move") {
          const { error: moveErr } = await supabase
            .from("projects")
            .update({ company_id: targetCompanyId })
            .eq("id", project.id)
          if (moveErr) throw moveErr
        } else {
          // Copy mode: calculate next unique ID number
          const { data: allProjs } = await supabase
            .from("projects")
            .select("id_no")
            .order("id_no", { ascending: false })
            .limit(1)

          const maxIdNo = allProjs && allProjs.length > 0 ? allProjs[0].id_no : 1000
          const nextIdNo = (maxIdNo || 1000) + 1

          const newProjectPayload = {
            ...currentProj,
            id_no: nextIdNo,
            company_id: targetCompanyId,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }
          delete (newProjectPayload as any).id

          const { data: newProj, error: insertErr } = await supabase
            .from("projects")
            .insert(newProjectPayload)
            .select()
            .single()

          if (insertErr) throw insertErr
          const newProjectId = newProj.id

          if (ledgerEntries && ledgerEntries.length > 0) {
            const rows = ledgerEntries.map(({ id, created_at, ...rest }) => ({ ...rest, project_id: newProjectId }))
            await supabase.from("ledger_entries").insert(rows)
          }
          if (paymentTerms && paymentTerms.length > 0) {
            const rows = paymentTerms.map(({ id, created_at, ...rest }) => ({ ...rest, project_id: newProjectId }))
            await supabase.from("payment_terms").insert(rows)
          }
          if (expenses && expenses.length > 0) {
            const rows = expenses.map(({ id, created_at, ...rest }) => ({ ...rest, project_id: newProjectId }))
            await supabase.from("expenses").insert(rows)
          }
          if (callingRecords && callingRecords.length > 0) {
            const rows = callingRecords.map(({ id, created_at, ...rest }) => ({ ...rest, project_id: newProjectId }))
            await supabase.from("calling_records").insert(rows)
          }
          if (swhChecklist && swhChecklist.length > 0) {
            const rows = swhChecklist.map(({ id, created_at, ...rest }) => ({ ...rest, project_id: newProjectId }))
            await supabase.from("swh_checklist").insert(rows)
          }
          if (workRemarks && workRemarks.length > 0) {
            const rows = workRemarks.map(({ id, created_at, ...rest }) => ({ ...rest, project_id: newProjectId }))
            await supabase.from("work_remarks").insert(rows)
          }
        }
      }

      if (action === "move") {
        toast.success(`Customer "${project.site_name}" moved to ${targetCompany.name}`)
        onOpenChange(false)
        router.push("/")
      } else {
        toast.success(`Customer "${project.site_name}" copied to ${targetCompany.name}`)
        onOpenChange(false)
      }
    } catch (err: any) {
      console.error("Error moving/copying customer:", err)
      toast.error(err.message || "Failed to transfer customer")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <CopyPlus className="h-5 w-5 text-primary" />
            Move / Copy Customer
          </DialogTitle>
          <DialogDescription>
            Transfer or duplicate customer <strong>{project.site_name}</strong> to another company directory.
          </DialogDescription>
        </DialogHeader>

        {otherCompanies.length === 0 ? (
          <div className="py-6 text-center text-sm text-muted-foreground italic">
            No other companies found. Please add another company from the top company switcher first.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6 py-2">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Target Company
              </Label>
              <Select value={targetCompanyId} onValueChange={setTargetCompanyId}>
                <SelectTrigger className="rounded-xl h-11 bg-muted/30">
                  <SelectValue placeholder="Select target company" />
                </SelectTrigger>
                <SelectContent>
                  {otherCompanies.map((c) => (
                    <SelectItem key={c.id} value={c.id} className="font-semibold">
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Transfer Mode
              </Label>
              <RadioGroup
                value={action}
                onValueChange={(val: any) => setAction(val)}
                className="grid grid-cols-2 gap-3"
              >
                <div
                  className={`flex items-center gap-3 p-3 rounded-2xl border cursor-pointer transition-all ${
                    action === "move"
                      ? "border-primary bg-primary/10 text-primary font-bold shadow-sm"
                      : "border-border bg-card text-foreground"
                  }`}
                  onClick={() => setAction("move")}
                >
                  <RadioGroupItem value="move" id="action-move" />
                  <Label htmlFor="action-move" className="cursor-pointer flex items-center gap-1.5 text-xs font-bold">
                    <ArrowRightLeft className="h-4 w-4" />
                    Move Customer
                  </Label>
                </div>

                <div
                  className={`flex items-center gap-3 p-3 rounded-2xl border cursor-pointer transition-all ${
                    action === "copy"
                      ? "border-primary bg-primary/10 text-primary font-bold shadow-sm"
                      : "border-border bg-card text-foreground"
                  }`}
                  onClick={() => setAction("copy")}
                >
                  <RadioGroupItem value="copy" id="action-copy" />
                  <Label htmlFor="action-copy" className="cursor-pointer flex items-center gap-1.5 text-xs font-bold">
                    <Copy className="h-4 w-4" />
                    Copy Customer
                  </Label>
                </div>
              </RadioGroup>
              <p className="text-[11px] text-muted-foreground mt-1 px-1">
                {action === "move"
                  ? "Removes the customer from current company and transfers all records to the target company."
                  : "Creates a duplicate copy of this customer and all financial records in the target company."}
              </p>
            </div>

            <DialogFooter className="pt-4 border-t gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading || !targetCompanyId} className="bg-primary text-primary-foreground font-bold">
                {loading ? "Processing..." : action === "move" ? "Move Customer" : "Copy Customer"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
