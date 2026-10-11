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

export async function syncPurchaseTotals(purchaseId: string) {
    const supabase = createClient()

    // 1. Fetch all purchase ledger entries
    const { data: entries, error: fetchError } = await supabase
        .from("purchase_ledger_entries")
        .select("*")
        .eq("purchase_id", purchaseId)
        .order("sr_no", { ascending: true })

    if (fetchError) throw fetchError

    // 1b. Fetch existing purchase quotation_value to preserve initial quotation if ledger has no entries
    const { data: existingPurchase } = await supabase
        .from("purchases")
        .select("quotation_value, order_value")
        .eq("id", purchaseId)
        .single()

    // 2. Calculate totals
    let totalQuotation = 0
    let totalPaid = 0

    entries?.forEach((entry: any) => {
        const quotVal = Number(entry.quotation_value ?? entry.order_value ?? 0)
        const paidVal = Number(entry.payment_paid ?? entry.payment_received ?? 0)
        totalQuotation += quotVal
        totalPaid += paidVal
    })

    const initialQuot = existingPurchase?.quotation_value || existingPurchase?.order_value || 0
    const finalQuotationValue = totalQuotation > 0 ? totalQuotation : initialQuot
    const balance = finalQuotationValue - totalPaid

    // 3. Update purchases table
    const { error: updateError } = await supabase
        .from("purchases")
        .update({
            quotation_value: finalQuotationValue,
            order_value: finalQuotationValue, // compat
            payment_paid: totalPaid,
            payment_received: totalPaid, // compat
            balance: balance,
            updated_at: new Date().toISOString()
        })
        .eq("id", purchaseId)

    if (updateError) throw updateError

    return { balance }
}

