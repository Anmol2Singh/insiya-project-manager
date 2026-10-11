"use client"

import { useState, useEffect } from "react"
import useSWR from "swr"
import { motion } from "framer-motion"
import { createClient } from "@/lib/supabase/client"
import { getActiveCompany } from "@/lib/company-store"
import { useRecordMode } from "@/lib/record-mode-store"
import { DashboardHeader } from "@/components/dashboard/header"
import { SummaryCards } from "@/components/dashboard/summary-cards"
import { ProjectsTable } from "@/components/dashboard/projects-table"
import type { ProjectSummary } from "@/lib/types"

const fetcher = async (companyId: string, mode: "sales" | "purchase"): Promise<ProjectSummary[]> => {
  const supabase = createClient()
  const targetCompany = companyId || getActiveCompany().id || "insiya-solar"
  const isPurchase = mode === "purchase"
  const targetTable = isPurchase ? "purchases" : "projects"
  const callsTable = isPurchase ? "purchase_calling_records" : "calling_records"
  const callForeignKey = isPurchase ? "purchase_id" : "project_id"

  const { data: recordsData, error } = await supabase
    .from(targetTable)
    .select("*")
    .eq("company_id", targetCompany)
    .order("id_no", { ascending: false })

  if (error) {
    console.error(`Supabase ${targetTable} fetch error:`, error)
    if (isPurchase && (error.code === "PGRST205" || error.message?.includes("purchases"))) {
      return []
    }
    throw error
  }

  const recordIds = (recordsData || []).map((p: any) => p.id)
  const callDateMap: Record<string, string> = {}
  const callRemarkMap: Record<string, string> = {}

  if (recordIds.length > 0) {
    try {
      const { data: callData } = await supabase
        .from(callsTable)
        .select(`${callForeignKey}, date, description, created_at, sr_no`)
        .in(callForeignKey, recordIds)
        .order("date", { ascending: false })

      if (callData) {
        callData.forEach((rec: any) => {
          const recId = rec[callForeignKey]
          if (!recId || !rec.date) return
          if (!callDateMap[recId]) {
            callDateMap[recId] = rec.date
          } else {
            if (new Date(rec.date).getTime() > new Date(callDateMap[recId]).getTime()) {
              callDateMap[recId] = rec.date
            }
          }
          if (!callRemarkMap[recId] && rec.description) {
            callRemarkMap[recId] = rec.description
          }
        })
      }
    } catch (callErr) {
      console.warn("Could not fetch calling records for homepage:", callErr)
    }
  }

  const records = (recordsData || []).map((rec: any) => {
    if (isPurchase) {
      const qVal = rec.quotation_value ?? rec.order_value ?? 0
      const pPaid = rec.payment_paid ?? rec.payment_received ?? 0
      return {
        ...rec,
        quotation_value: qVal,
        order_value: qVal,
        payment_paid: pPaid,
        payment_received: pPaid,
        extra_work_value: 0,
        reminder_date: callDateMap[rec.id] || null,
        last_call_remark: callRemarkMap[rec.id] || null,
        balance: qVal - pPaid
      }
    }
    return {
      ...rec,
      reminder_date: callDateMap[rec.id] || null,
      last_call_remark: callRemarkMap[rec.id] || null,
      balance: (rec.order_value || 0) + (rec.extra_work_value || 0) - (rec.payment_received || 0)
    }
  })

  return records as ProjectSummary[]
}

export default function DashboardPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [activeCompanyId, setActiveCompanyId] = useState<string>("insiya-solar")
  const { mode, isPurchase } = useRecordMode()

  useEffect(() => {
    setActiveCompanyId(getActiveCompany().id)
    const handleStorage = () => {
      const comp = getActiveCompany()
      if (comp.id !== activeCompanyId) {
        setActiveCompanyId(comp.id)
      }
    }
    window.addEventListener("storage", handleStorage)
    const interval = setInterval(handleStorage, 500)
    return () => {
      window.removeEventListener("storage", handleStorage)
      clearInterval(interval)
    }
  }, [activeCompanyId])

  const { data: projects = [], error, isLoading, mutate } = useSWR(
    ["records", activeCompanyId, mode],
    ([, compId, currentMode]) => fetcher(compId, currentMode as "sales" | "purchase")
  )

  const filteredProjects = projects.filter((project) => {
    if (!project) return false
    const query = (searchQuery || "").toLowerCase().trim()
    if (!query) return true

    const siteName = (project.site_name || "").toString().toLowerCase()
    const mobileNo = (project.mobile_number || "").toString().toLowerCase()
    const address = (project.address || "").toString().toLowerCase()
    const orderType = (project.order_type || "").toString().toLowerCase()
    const idNo = project.id_no != null ? String(project.id_no).toLowerCase() : ""
    const workRemark = (project.work_remark || "").toString().toLowerCase()
    const partyName = (project.party_print_name || "").toString().toLowerCase()
    const reminderDate = (project.reminder_date || "").toString().toLowerCase()

    return (
      siteName.includes(query) ||
      mobileNo.includes(query) ||
      address.includes(query) ||
      orderType.includes(query) ||
      idNo.includes(query) ||
      workRemark.includes(query) ||
      partyName.includes(query) ||
      reminderDate.includes(query)
    )
  })

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans antialiased">
      <DashboardHeader
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onDatabaseImport={() => mutate()}
      />

      <main className="flex-1 px-4 py-6 lg:px-8 max-w-[1600px] w-full mx-auto space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <SummaryCards projects={projects} isLoading={isLoading} isPurchase={isPurchase} />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <ProjectsTable
            projects={filteredProjects}
            isLoading={isLoading}
            error={error}
            onMutate={() => mutate()}
            isPurchase={isPurchase}
          />
        </motion.div>
      </main>
    </div>
  )
}
