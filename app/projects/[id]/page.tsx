"use client"

import { use } from "react"
import useSWR from "swr"
import { createClient } from "@/lib/supabase/client"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { motion, AnimatePresence } from "framer-motion"
import { ProjectHeader } from "@/components/project/project-header"
import { LedgerTab } from "@/components/project/ledger-tab"
import { PaymentTermsTab } from "@/components/project/payment-terms-tab"
import { ExpensesTab } from "@/components/project/expenses-tab"
import { CallingRecordsTab } from "@/components/project/calling-records-tab"
import { SwhChecklistTab } from "@/components/project/swh-checklist-tab"
import { WorkRemarksTab } from "@/components/project/work-remarks-tab"
import type {
  Project,
  LedgerEntry,
  PaymentTerm,
  Expense,
  CallingRecord,
  SwhChecklistItem,
  WorkRemark
} from "@/lib/types"

interface ProjectDetailPageProps {
  params: Promise<{ id: string }>
}

interface ProjectData {
  project: Project
  ledgerEntries: LedgerEntry[]
  paymentTerms: PaymentTerm[]
  expenses: Expense[]
  callingRecords: CallingRecord[]
  swhChecklist: SwhChecklistItem[]
  workRemarks: WorkRemark[]
}

const fetchProjectData = async (id: string): Promise<ProjectData> => {
  const supabase = createClient()

  const [
    { data: project, error: projectError },
    { data: ledgerEntries, error: ledgerError },
    { data: paymentTerms, error: paymentError },
    { data: expenses, error: expenseError },
    { data: callingRecords, error: callingError },
    { data: swhChecklist, error: checklistError },
    { data: workRemarks, error: remarksError },
  ] = await Promise.all([
    supabase.from("projects").select("*").eq("id", id).single(),
    supabase.from("ledger_entries").select("*").eq("project_id", id).order("sr_no", { ascending: true }),
    supabase.from("payment_terms").select("*").eq("project_id", id).order("created_at", { ascending: true }),
    supabase.from("expenses").select("*").eq("project_id", id).order("sr_no", { ascending: true }),
    supabase.from("calling_records").select("*").eq("project_id", id).order("sr_no", { ascending: true }),
    supabase.from("swh_checklist").select("*").eq("project_id", id).order("sr_no", { ascending: true }),
    supabase.from("work_remarks").select("*").eq("project_id", id).order("sr_no", { ascending: true }),
  ])

  if (projectError) throw projectError

  return {
    project: {
      ...project!,
      balance: (project!.order_value || 0) + (project!.extra_work_value || 0) - (project!.payment_received || 0)
    },
    ledgerEntries: ledgerEntries || [],
    paymentTerms: paymentTerms || [],
    expenses: expenses || [],
    callingRecords: callingRecords || [],
    swhChecklist: swhChecklist || [],
    workRemarks: workRemarks || [],
  }
}

export default function ProjectDetailPage({ params }: ProjectDetailPageProps) {
  const { id } = use(params)

  const { data, error, isLoading, mutate } = useSWR<ProjectData>(
    `project-${id}`,
    () => fetchProjectData(id)
  )

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="bg-destructive/10 border border-destructive/20 rounded-2xl p-8 text-destructive max-w-md text-center shadow-xl backdrop-blur-md">
          <div className="h-12 w-12 rounded-full bg-destructive/20 flex items-center justify-center mx-auto mb-4 font-bold">!</div>
          <h2 className="font-bold text-xl mb-2">Error Loading Project</h2>
          <p className="text-sm opacity-80">Unable to load project details. Please check your connection and try again.</p>
          <Button variant="outline" className="mt-6 border-destructive/30 hover:bg-destructive/10" onClick={() => window.location.reload()}>Retry</Button>
        </div>
      </div>
    )
  }

  if (isLoading || !data) {
    return (
      <div className="min-h-screen bg-background">
        <div className="bg-card border-b border-border px-4 py-8 lg:px-8">
          <div className="h-4 w-24 bg-muted rounded animate-pulse mb-6" />
          <div className="h-10 w-64 bg-muted rounded animate-pulse mb-3" />
          <div className="h-6 w-96 bg-muted rounded animate-pulse" />
        </div>
        <div className="p-4 lg:p-8 max-w-[1600px] mx-auto">
          <div className="h-[600px] bg-card rounded-2xl animate-pulse shadow-sm" />
        </div>
      </div>
    )
  }

  const { project, ledgerEntries, paymentTerms, expenses, callingRecords, swhChecklist, workRemarks } = data

  return (
    <div className="min-h-screen bg-background pb-12">
      <ProjectHeader project={project} />

      <main className="p-4 lg:p-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-[1600px] mx-auto"
        >
          <Tabs defaultValue="ledger" className="space-y-6">
            <TabsList className="flex flex-wrap h-auto gap-2 bg-muted/50 p-1.5 w-full lg:w-fit rounded-2xl border border-border/50 shadow-sm">
              {[
                { value: "ledger", label: "Financial Ledger" },
                { value: "payments", label: "Payment Terms" },
                { value: "expenses", label: "Project Expenses" },
                { value: "calls", label: "Call Records" },
                { value: "checklist", label: "Checklist" },
                { value: "remarks", label: "Work Remarks" },
              ].map((tab) => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="flex-1 lg:flex-none text-xs font-bold uppercase tracking-wider px-5 py-2.5 rounded-xl data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-md transition-all"
                >
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>

            <AnimatePresence mode="wait">
              <TabsContent value="ledger" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
                <motion.div
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  <LedgerTab
                    entries={ledgerEntries}
                    projectId={id}
                    project={project}
                    paymentTerms={paymentTerms}
                    expenses={expenses}
                    callingRecords={callingRecords}
                    swhChecklist={swhChecklist}
                    workRemarks={workRemarks}
                    onRefresh={() => mutate()}
                  />
                </motion.div>
              </TabsContent>

              <TabsContent value="payments" className="mt-0">
                <PaymentTermsTab
                  terms={paymentTerms}
                  projectId={id}
                  orderValue={project.order_value}
                  onRefresh={() => mutate()}
                />
              </TabsContent>

              <TabsContent value="expenses" className="mt-0">
                <ExpensesTab
                  expenses={expenses}
                  projectId={id}
                  onRefresh={() => mutate()}
                />
              </TabsContent>

              <TabsContent value="calls" className="mt-0">
                <CallingRecordsTab
                  records={callingRecords}
                  projectId={id}
                  onRefresh={() => mutate()}
                />
              </TabsContent>

              <TabsContent value="checklist" className="mt-0">
                <SwhChecklistTab
                  items={swhChecklist}
                  projectId={id}
                  onRefresh={() => mutate()}
                />
              </TabsContent>

              <TabsContent value="remarks" className="mt-0">
                <WorkRemarksTab
                  remarks={workRemarks}
                  projectId={id}
                  onRefresh={() => mutate()}
                />
              </TabsContent>
            </AnimatePresence>
          </Tabs>
        </motion.div>
      </main>
    </div>
  )
}
