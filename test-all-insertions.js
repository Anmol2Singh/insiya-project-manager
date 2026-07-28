const apiKey = 'sb_publishable_fPy4CnaEg7pqyaNE9tNTNQ_BYgAKjvS';
const baseUrl = 'https://gewitdgjzuzgdktxupjz.supabase.co/rest/v1/';

async function testInsertions() {
    const testData = {
        payment_terms: { project_id: 'dummy', payment_term: 'Test' },
        expenses: { project_id: 'dummy', sr_no: 1, date: '2026-01-25', expense: 0 },
        calling_records: { project_id: 'dummy', sr_no: 1, date: '2026-01-25' },
        swh_checklist: { project_id: 'dummy', sr_no: 1, item_name: 'Test' },
        work_remarks: { project_id: 'dummy', sr_no: 1, date: '2026-01-25' }
    };

    for (const [table, data] of Object.entries(testData)) {
        const url = `${baseUrl}${table}`;
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'apikey': apiKey,
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=minimal'
                },
                body: JSON.stringify(data)
            });

            if (response.ok) {
                console.log(`Table: ${table} | Insertion successful (or dummy ID ignored)`);
            } else {
                const err = await response.json();
                console.error(`Table: ${table} | Failed: ${response.status} | Error: ${JSON.stringify(err)}`);
            }
        } catch (error) {
            console.error(`Table: ${table} | Error: ${error.message}`);
        }
    }
}

testInsertions();
