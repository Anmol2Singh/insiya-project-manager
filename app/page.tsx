"use client"

import { useState, useEffect } from "react"
import useSWR from "swr"
import { motion } from "framer-motion"
import { createClient } from "@/lib/supabase/client"
import { getActiveCompany } from "@/lib/company-store"
import { DashboardHeader } from "@/components/dashboard/header"
import { SummaryCards } from "@/components/dashboard/summary-cards"
import { ProjectsTable } from "@/components/dashboard/projects-table"
import type { ProjectSummary } from "@/lib/types"

const fetcher = async (companyId: string): Promise<ProjectSummary[]> => {
  const supabase = createClient()
  const targetCompany = companyId || getActiveCompany().id || "insiya-solar"

  const { data: projectsData, error } = await supabase
    .from("projects")
    .select("*")
    .eq("company_id", targetCompany)
    .order("id_no", { ascending: false })

  if (error) {
    console.error("Supabase projects fetch error:", error)
    throw error
  }

  const projectIds = (projectsData || []).map((p: any) => p.id)
  const callDateMap: Record<string, string> = {}
  const callRemarkMap: Record<string, string> = {}

  if (projectIds.length > 0) {
    try {
      const { data: callData } = await supabase
        .from("calling_records")
        .select("project_id, date, description, created_at, sr_no")
        .in("project_id", projectIds)
        .order("date", { ascending: false })

      if (callData) {
        callData.forEach((rec: any) => {
          if (!rec.project_id || !rec.date) return
          if (!callDateMap[rec.project_id]) {
            callDateMap[rec.project_id] = rec.date
          } else {
            if (new Date(rec.date).getTime() > new Date(callDateMap[rec.project_id]).getTime()) {
              callDateMap[rec.project_id] = rec.date
            }
          }
          if (!callRemarkMap[rec.project_id] && rec.description) {
            callRemarkMap[rec.project_id] = rec.description
          }
        })
      }
    } catch (callErr) {
      console.warn("Could not fetch calling records for homepage:", callErr)
    }
  }

  const projects = (projectsData || []).map((project: any) => ({
    ...project,
    reminder_date: callDateMap[project.id] || null,
    last_call_remark: callRemarkMap[project.id] || null,
    balance: (project.order_value || 0) + (project.extra_work_value || 0) - (project.payment_received || 0)
  }))

  return projects as ProjectSummary[]
}

export default function DashboardPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [activeCompanyId, setActiveCompanyId] = useState<string>("insiya-solar")

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
    ["projects", activeCompanyId],
    ([, compId]) => fetcher(compId)
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
          <SummaryCards projects={projects} isLoading={isLoading} />
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
          />
        </motion.div>
      </main>
    </div>
  )
}
