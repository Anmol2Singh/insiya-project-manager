"use client"

import { useState, useEffect } from "react"
import useSWR from "swr"
import { motion } from "framer-motion"
import { createClient } from "@/lib/supabase/client"
import { DashboardHeader } from "@/components/dashboard/header"
import { SummaryCards } from "@/components/dashboard/summary-cards"
import { ProjectsTable } from "@/components/dashboard/projects-table"
import type { ProjectSummary } from "@/lib/types"

const fetcher = async (): Promise<ProjectSummary[]> => {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("projects")
    .select("*") // Temp select all to see what's available
    .order("id_no", { ascending: false })

  if (error) {
    console.error("Supabase projects fetch error:", error)
    throw error
  }

  const projects = (data || []).map(project => ({
    ...project,
    balance: (project.order_value || 0) + (project.extra_work_value || 0) - (project.payment_received || 0)
  }))

  return projects as ProjectSummary[]
}

export default function DashboardPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const { data: projects = [], error, isLoading } = useSWR("projects", fetcher)

  useEffect(() => {
    async function diagnostic() {
      try {
        const supabase = createClient()
        const { data, error } = await supabase.from("projects").select("count").single()
        console.log("Supabase diagnostic (projects count):", data, error)
      } catch (e) {
        console.error("Supabase diagnostic failure:", e)
      }
    }
    diagnostic()
  }, [])

  const filteredProjects = projects.filter((project) => {
    const query = searchQuery.toLowerCase()
    return (
      project.site_name.toLowerCase().includes(query) ||
      project.address.toLowerCase().includes(query) ||
      project.order_type.toLowerCase().includes(query) ||
      project.id_no.toString().includes(query)
    )
  })

  if (error) {
    console.error("Dashboard SWR error:", error)
    return (
      <div className="min-h-screen bg-background text-foreground">
        <DashboardHeader searchQuery={searchQuery} onSearchChange={setSearchQuery} />
        <main className="p-4 lg:p-8">
          <div className="max-w-[1600px] mx-auto">
            <div className="bg-destructive/10 border border-destructive/20 rounded-2xl p-6 text-destructive flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-destructive/20 flex items-center justify-center font-bold">!</div>
              <div>
                <h3 className="font-bold">Error loading projects</h3>
                <p className="text-sm opacity-80">
                  {error.message || "Please check your connection and try again later."}
                </p>
              </div>
            </div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader searchQuery={searchQuery} onSearchChange={setSearchQuery} />

      <main className="p-4 lg:p-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-[1600px] mx-auto space-y-8"
        >
          {isLoading ? (
            <div className="space-y-8">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-32 bg-card rounded-2xl animate-pulse shadow-sm" />
                ))}
              </div>
              <div className="h-[600px] bg-card rounded-2xl animate-pulse shadow-sm" />
            </div>
          ) : (
            <>
              <SummaryCards projects={filteredProjects} />
              <ProjectsTable projects={filteredProjects} />
            </>
          )}
        </motion.div>
      </main>
    </div>
  )
}
