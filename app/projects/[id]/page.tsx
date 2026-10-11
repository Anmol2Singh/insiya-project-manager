"use client"

import { use } from "react"
import { useSearchParams } from "next/navigation"
import useSWR from "swr"
import { createClient } from "@/lib/supabase/client"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { motion, AnimatePresence } from "framer-motion"
import { useRecordMode } from "@/lib/record-mode-store"
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

const fetchProjectData = async (id: string, isPurchase: boolean): Promise<ProjectData> => {
  const supabase = createClient()

  if (isPurchase) {
    const [
      { data: project, error: projectError },
      { data: ledgerEntries, error: ledgerError },
      { data: callingRecords, error: callingError },
    ] = await Promise.all([
      supabase.from("purchases").select("*").eq("id", id).single(),
      supabase.from("purchase_ledger_entries").select("*").eq("purchase_id", id).order("sr_no", { ascending: true }),
      supabase.from("purchase_calling_records").select("*").eq("purchase_id", id).order("sr_no", { ascending: true }),
    ])

    if (projectError) throw projectError

    const qVal = project!.quotation_value ?? project!.order_value ?? 0
    const pPaid = project!.payment_paid ?? project!.payment_received ?? 0

    return {
      project: {
        ...project!,
        quotation_value: qVal,
        order_value: qVal,
        payment_paid: pPaid,
        payment_received: pPaid,
        extra_work_value: 0,
        balance: qVal - pPaid,
      },
      ledgerEntries: (ledgerEntries || []).map((e: any) => ({
        ...e,
        project_id: e.purchase_id || id,
        quotation_value: e.quotation_value ?? e.order_value ?? 0,
        order_value: e.quotation_value ?? e.order_value ?? 0,
        payment_paid: e.payment_paid ?? e.payment_received ?? 0,
        payment_received: e.payment_paid ?? e.payment_received ?? 0,
        extra_work_value: 0,
      })),
      paymentTerms: [],
      expenses: [],
      callingRecords: (callingRecords || []).map((c: any) => ({
        ...c,
        project_id: c.purchase_id || id,
      })),
      swhChecklist: [],
      workRemarks: [],
    }
  }

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
  const searchParams = useSearchParams()
  const { isPurchase: isGlobalPurchase } = useRecordMode()
  const isPurchase = searchParams?.get("mode") === "purchase" || isGlobalPurchase

  const { data, error, isLoading, mutate } = useSWR<ProjectData>(
    `project-${id}-${isPurchase ? 'purchase' : 'sales'}`,
    () => fetchProjectData(id, isPurchase)
  )

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="bg-destructive/10 border border-destructive/20 rounded-2xl p-8 text-destructive max-w-md text-center shadow-xl backdrop-blur-md">
          <div className="h-12 w-12 rounded-full bg-destructive/20 flex items-center justify-center mx-auto mb-4 font-bold">!</div>
          <h2 className="font-bold text-xl mb-2">Error Loading {isPurchase ? "Vendor" : "Project"}</h2>
          <p className="text-sm opacity-80">Unable to load details. Please check your connection and try again.</p>
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

  const visibleTabs = isPurchase
    ? [
        { value: "ledger", label: "Financial Ledger" },
        { value: "calls", label: "Call Records" },
      ]
    : [
        { value: "ledger", label: "Financial Ledger" },
        { value: "payments", label: "Payment Terms" },
        { value: "expenses", label: "Project Expenses" },
        { value: "calls", label: "Call Records" },
        { value: "checklist", label: "Checklist" },
        { value: "remarks", label: "Work Remarks" },
      ]

  return (
    <div className="min-h-screen bg-background pb-12">
      <ProjectHeader project={project} isPurchase={isPurchase} />

      <main className="p-4 lg:p-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-[1600px] mx-auto"
        >
          <Tabs defaultValue="ledger" className="space-y-6">
            <div className="overflow-x-auto w-full max-w-full pb-2 -mb-2 no-scrollbar">
              <TabsList className="inline-flex h-auto gap-2 bg-muted/50 p-1.5 min-w-max rounded-2xl border border-border/50 shadow-sm">
                {visibleTabs.map((tab) => (
                  <TabsTrigger
                    key={tab.value}
                    value={tab.value}
                    className="whitespace-nowrap shrink-0 text-xs font-bold uppercase tracking-wider px-5 py-2.5 rounded-xl data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-md transition-all"
                  >
                    {tab.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

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
                    isPurchase={isPurchase}
                  />
                </motion.div>
              </TabsContent>

              {!isPurchase && (
                <>
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
                </>
              )}

              <TabsContent value="calls" className="mt-0">
                <CallingRecordsTab
                  records={callingRecords}
                  projectId={id}
                  onRefresh={() => mutate()}
                  isPurchase={isPurchase}
                />
              </TabsContent>

              {!isPurchase && (
                <>
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
                </>
              )}
            </AnimatePresence>
          </Tabs>
        </motion.div>
      </main>
    </div>
  )
}
