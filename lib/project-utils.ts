import { createClient } from "@/lib/supabase/client"
import type { LedgerEntry } from "@/lib/types"

export async function syncProjectTotals(projectId: string) {
    const supabase = createClient()

    // 1. Fetch all ledger entries
    const { data: entries, error: fetchError } = await supabase
        .from("ledger_entries")
        .select("*")
        .eq("project_id", projectId)
        .order("sr_no", { ascending: true })

    if (fetchError) throw fetchError

    // 1b. Fetch existing project order_value to preserve initial order_value if ledger doesn't specify one
    const { data: existingProject } = await supabase
        .from("projects")
        .select("order_value")
        .eq("id", projectId)
        .single()

    // 2. Calculate totals
    let totalSalesM = 0
    let totalMOutward = 0
    let totalOrder = 0
    let totalExtraWork = 0
    let totalPaymentReceived = 0

    entries?.forEach((entry: LedgerEntry) => {
        totalSalesM += entry.sales_m_value || 0
        totalMOutward += entry.m_outward_value || 0
        totalOrder += entry.order_value || 0
        totalExtraWork += entry.extra_work_value || 0
        totalPaymentReceived += entry.payment_received || 0
    })

    const finalOrderValue = totalOrder > 0 ? totalOrder : (existingProject?.order_value || 0)
    const mBalance = totalSalesM - totalMOutward
    const balance = finalOrderValue + totalExtraWork - totalPaymentReceived

    // 3. Update project table
    const { error: updateError } = await supabase
        .from("projects")
        .update({
            sales_m_value: totalSalesM,
            m_outward_value: totalMOutward,
            order_value: finalOrderValue,
            extra_work_value: totalExtraWork,
            payment_received: totalPaymentReceived,
            updated_at: new Date().toISOString()
        })
        .eq("id", projectId)

    if (updateError) throw updateError

    return { balance, mBalance }
}
