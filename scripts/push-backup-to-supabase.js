const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

// --- Configuration ---
const SUPABASE_URL = "https://gewitdgjzuzgdktxupjz.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_fPy4CnaEg7pqyaNE9tNTNQ_BYgAKjvS";
const COMPANY_ID = "insiya-solar";
const BACKUP_FILE = path.join(__dirname, "..", "Insiya_Solar_Industry_Database_Backup_2026-08-05.json");

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function main() {
  console.log("📂 Reading backup file...");
  const raw = fs.readFileSync(BACKUP_FILE, "utf-8");
  const data = JSON.parse(raw);

  const projects = data.projects || [];
  const ledgerEntries = data.ledger_entries || [];
  const paymentTerms = data.payment_terms || [];
  const expenses = data.expenses || [];
  const callingRecords = data.calling_records || [];
  const swhChecklist = data.swh_checklist || [];
  const workRemarks = data.work_remarks || [];

  console.log(`\n📊 Backup contains:`);
  console.log(`   Projects:        ${projects.length}`);
  console.log(`   Ledger Entries:   ${ledgerEntries.length}`);
  console.log(`   Payment Terms:    ${paymentTerms.length}`);
  console.log(`   Expenses:         ${expenses.length}`);
  console.log(`   Calling Records:  ${callingRecords.length}`);
  console.log(`   SWH Checklist:    ${swhChecklist.length}`);
  console.log(`   Work Remarks:     ${workRemarks.length}`);

  // --- Step 1: Insert/Upsert projects ---
  console.log("\n🔄 Step 1: Importing projects...");
  
  // Fetch existing projects globally across all companies to match unique id_no constraint
  const { data: existingProjects } = await supabase
    .from("projects")
    .select("id, id_no, site_name");
  const existingList = existingProjects || [];
  console.log(`   Found ${existingList.length} total existing projects in Supabase.`);

  const projectIdMap = {}; // oldId -> newId
  let projInserted = 0;
  let projUpdated = 0;
  let projErrors = 0;

  for (const proj of projects) {
    const oldId = proj.id;

    // Match by id_no first, then site_name
    let existing = null;
    if (proj.id_no) {
      existing = existingList.find((p) => Number(p.id_no) === Number(proj.id_no));
    }
    if (!existing && proj.site_name) {
      existing = existingList.find(
        (p) => p.site_name && p.site_name.trim().toLowerCase() === proj.site_name.trim().toLowerCase()
      );
    }

    if (existing) {
      projectIdMap[oldId] = existing.id;
      const { id: _id, created_at: _ca, ...updatePayload } = proj;
      updatePayload.company_id = COMPANY_ID;
      updatePayload.updated_at = new Date().toISOString();
      const { error } = await supabase.from("projects").update(updatePayload).eq("id", existing.id);
      if (error) {
        console.error(`   ❌ Error updating project ${proj.site_name}: ${error.message}`);
        projErrors++;
      } else {
        projUpdated++;
      }
    } else {
      const { id: _oldId, ...insertPayload } = proj;
      insertPayload.company_id = COMPANY_ID;
      const { data: newProj, error } = await supabase
        .from("projects")
        .insert(insertPayload)
        .select("id")
        .single();
      if (error) {
        console.error(`   ❌ Error inserting project ${proj.site_name} (id_no ${proj.id_no}): ${error.message}`);
        projErrors++;
      } else {
        projectIdMap[oldId] = newProj.id;
        projInserted++;
      }
    }
  }

  console.log(`   ✅ Projects: ${projInserted} inserted, ${projUpdated} updated, ${projErrors} errors`);
  console.log(`   📋 Project ID mappings: ${Object.keys(projectIdMap).length}`);

  // --- Step 2: Insert child tables ---
  const childTables = [
    { name: "Ledger Entries", key: "ledger_entries", table: "ledger_entries", data: ledgerEntries },
    { name: "Payment Terms", key: "payment_terms", table: "payment_terms", data: paymentTerms },
    { name: "Expenses", key: "expenses", table: "expenses", data: expenses },
    { name: "Calling Records", key: "calling_records", table: "calling_records", data: callingRecords },
    { name: "SWH Checklist", key: "swh_checklist", table: "swh_checklist", data: swhChecklist },
    { name: "Work Remarks", key: "work_remarks", table: "work_remarks", data: workRemarks },
  ];

  for (const { name, table, data: entries } of childTables) {
    if (entries.length === 0) {
      console.log(`\n⏭️  Step: ${name} — 0 entries, skipping.`);
      continue;
    }

    console.log(`\n🔄 Importing ${name} (${entries.length} entries)...`);

    // First, delete existing entries for mapped projects to avoid duplicates
    const mappedProjectIds = [...new Set(
      entries
        .map((e) => projectIdMap[e.project_id])
        .filter(Boolean)
    )];

    if (mappedProjectIds.length > 0) {
      const { error: delErr } = await supabase
        .from(table)
        .delete()
        .in("project_id", mappedProjectIds);
      if (delErr) {
        console.warn(`   ⚠️  Could not clear existing ${name}: ${delErr.message}`);
      } else {
        console.log(`   🗑️  Cleared existing ${name} for ${mappedProjectIds.length} projects`);
      }
    }

    let inserted = 0;
    let skipped = 0;
    let errors = 0;

    // Batch insert in groups of 50
    const batch = [];
    for (const entry of entries) {
      const newProjectId = projectIdMap[entry.project_id];
      if (!newProjectId) {
        skipped++;
        continue;
      }

      const { id: _oldId, updated_at: _updatedAt, ...insertPayload } = entry;
      insertPayload.project_id = newProjectId;
      batch.push(insertPayload);

      if (batch.length >= 50) {
        const { error } = await supabase.from(table).insert([...batch]);
        if (error) {
          console.error(`   ❌ Batch insert error: ${error.message}`);
          errors += batch.length;
        } else {
          inserted += batch.length;
        }
        batch.length = 0;
      }
    }

    // Insert remaining
    if (batch.length > 0) {
      const { error } = await supabase.from(table).insert(batch);
      if (error) {
        console.error(`   ❌ Batch insert error: ${error.message}`);
        errors += batch.length;
      } else {
        inserted += batch.length;
      }
    }

    console.log(`   ✅ ${name}: ${inserted} inserted, ${skipped} skipped (no project match), ${errors} errors`);
  }

  console.log("\n" + "=".repeat(60));
  console.log("🎉 DATABASE IMPORT COMPLETE!");
  console.log("=".repeat(60));
}

main().catch((err) => {
  console.error("💥 Fatal error:", err);
  process.exit(1);
});
