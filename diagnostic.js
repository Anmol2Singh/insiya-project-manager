const fs = require('fs');
const apiKey = 'sb_publishable_fPy4CnaEg7pqyaNE9tNTNQ_BYgAKjvS';
const baseUrl = 'https://gewitdgjzuzgdktxupjz.supabase.co/rest/v1/';

async function diagnostic() {
    const logFile = 'diag-results.txt';
    fs.writeFileSync(logFile, '');

    function log(msg) {
        console.log(msg);
        fs.appendFileSync(logFile, msg + '\n');
    }

    // 1. Fetch valid project ID
    const projectsUrl = `${baseUrl}projects?select=id&limit=1`;
    const projectsResponse = await fetch(projectsUrl, {
        headers: { 'apikey': apiKey, 'Authorization': `Bearer ${apiKey}` }
    });
    const projects = await projectsResponse.json();
    if (projects.length === 0) {
        log('No projects found.');
        return;
    }
    const projectId = projects[0].id;
    log(`Using Project ID: ${projectId}`);

    const tables = ['swh_checklist', 'payment_terms'];

    for (const table of tables) {
        log(`--- Testing Table: ${table} ---`);
        // Check columns
        const schemaUrl = `${baseUrl}${table}?select=*&limit=1`;
        const schemaRes = await fetch(schemaUrl, {
            headers: { 'apikey': apiKey, 'Authorization': `Bearer ${apiKey}` }
        });
        const schemaData = await schemaRes.json();
        if (schemaData.length > 0) {
            log(`Columns found: ${Object.keys(schemaData[0]).join(', ')}`);
        } else {
            log(`Table is empty.`);
        }

        // Try dummy insert with all expected columns
        const testData = table === 'swh_checklist'
            ? { project_id: projectId, sr_no: 9992, item_name: 'Diag Test' }
            : { project_id: projectId, payment_term: 'Diag Test' };

        const insertRes = await fetch(`${baseUrl}${table}`, {
            method: 'POST',
            headers: {
                'apikey': apiKey,
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
            },
            body: JSON.stringify(testData)
        });

        log(`Insert Status: ${insertRes.status} ${insertRes.statusText}`);
        const body = await insertRes.text();
        log(`Insert Body: ${body}`);

        if (insertRes.status === 201) {
            // Cleanup
            const created = JSON.parse(body);
            await fetch(`${baseUrl}${table}?id=eq.${created[0].id}`, {
                method: 'DELETE',
                headers: { 'apikey': apiKey, 'Authorization': `Bearer ${apiKey}` }
            });
            log('Cleanup successful.');
        }
    }
}

diagnostic();
