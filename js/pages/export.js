/**
 * Export Page - Export data to Excel (.xlsx) and JSON backup
 */
UI.registerPage('export', async (container) => {
    const radioCount = await DB.count('radios');
    const batteryCount = await DB.count('batteries');
    const toolCount = await DB.count('tools');
    const txCount = await DB.count('transactions');
    const auditCount = await DB.count('auditLog');
    const techCount = await DB.count('technicians');

    container.innerHTML = `
        <h2 class="page-title">💾 Export Data</h2>

        <div class="card">
            <div class="card-header">
                <h3>Data Summary</h3>
            </div>
            <div class="stats-row">
                <div class="stat-card">
                    <div class="stat-value">${radioCount}</div>
                    <div class="stat-label">Radios</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${batteryCount}</div>
                    <div class="stat-label">Batteries</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${toolCount}</div>
                    <div class="stat-label">Tools</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${techCount}</div>
                    <div class="stat-label">Technicians</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${txCount}</div>
                    <div class="stat-label">Transactions</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${auditCount}</div>
                    <div class="stat-label">Audit Entries</div>
                </div>
            </div>
        </div>

        <div class="card">
            <div class="card-header">
                <h3>Export to Excel (.xlsx)</h3>
            </div>
            <p style="margin-bottom:1rem; color:var(--gray-600);">
                Exports all data into a multi-sheet Excel workbook. Save the file to your network location for backup.
            </p>
            <button class="btn btn-primary btn-lg" id="export-xlsx-btn">
                📊 Export to Excel
            </button>
        </div>

        <div class="card">
            <div class="card-header">
                <h3>JSON Backup</h3>
            </div>
            <p style="margin-bottom:1rem; color:var(--gray-600);">
                Full database backup in JSON format. Can be re-imported later.
            </p>
            <div class="btn-group">
                <button class="btn btn-outline btn-lg" id="export-json-btn">
                    📁 Export JSON Backup
                </button>
                <button class="btn btn-outline btn-lg" id="import-json-btn">
                    📂 Import JSON Backup
                </button>
            </div>
            <input type="file" id="import-file-input" accept=".json" style="display:none;">
        </div>

        <div class="card">
            <div class="card-header">
                <h3>⚠️ Danger Zone</h3>
            </div>
            <p style="margin-bottom:1rem; color:var(--gray-600);">
                Clear all data from the browser database. This cannot be undone. Export a backup first!
            </p>
            <button class="btn btn-danger" id="clear-data-btn">
                🗑️ Clear All Data
            </button>
        </div>
    `;

    // Export to Excel
    document.getElementById('export-xlsx-btn').addEventListener('click', async () => {
        try {
            if (typeof XLSX === 'undefined') {
                UI.toast('SheetJS library not loaded. Check internet connection.', 'error');
                return;
            }

            const data = await DB.exportAll();
            const wb = XLSX.utils.book_new();

            // Radios sheet
            if (data.radios && data.radios.length > 0) {
                const radioRows = data.radios.map(r => ({
                    'ID': r.id,
                    'Serial Number': r.serialNumber || '',
                    'Model': r.model || '',
                    'Status': r.status,
                    'In Service Date': r.inServiceDate ? new Date(r.inServiceDate).toLocaleDateString() : '',
                    'Out of Service Date': r.outOfServiceDate ? new Date(r.outOfServiceDate).toLocaleDateString() : '',
                    'Checkout Count': r.checkoutCount || 0,
                    'Repair Count': r.repairCount || 0,
                    'Notes': r.notes || '',
                    'Created': r.createdAt ? new Date(r.createdAt).toLocaleString() : '',
                    'Updated': r.updatedAt ? new Date(r.updatedAt).toLocaleString() : ''
                }));
                const ws = XLSX.utils.json_to_sheet(radioRows);
                ws['!cols'] = Array(11).fill({ wch: 18 });
                XLSX.utils.book_append_sheet(wb, ws, 'Radios');
            }

            // Batteries sheet
            if (data.batteries && data.batteries.length > 0) {
                const batteryRows = data.batteries.map(b => ({
                    'ID': b.id,
                    'Model': b.model || '',
                    'Type': b.type || '',
                    'Status': b.status,
                    'Date Received': b.dateReceived ? new Date(b.dateReceived).toLocaleDateString() : '',
                    'In Service Date': b.inServiceDate ? new Date(b.inServiceDate).toLocaleDateString() : '',
                    'Entry Date': b.entryDate ? new Date(b.entryDate).toLocaleDateString() : '',
                    'Retirement Date': b.retirementDate ? new Date(b.retirementDate).toLocaleDateString() : '',
                    'Retirement Reason': b.retirementReason || '',
                    'Estimated Age': b.estimatedAge || '',
                    'Days In Service': (b.status === 'In Service' || b.status === 'Retired' || b.status === 'Failed')
                        ? Models.getBatteryDaysInService(b) : '',
                    'Lifespan (days)': Models.getBatteryLifespan(b) || '',
                    'Notes': b.notes || ''
                }));
                const ws = XLSX.utils.json_to_sheet(batteryRows);
                ws['!cols'] = Array(13).fill({ wch: 18 });
                XLSX.utils.book_append_sheet(wb, ws, 'Batteries');
            }

            // Tools sheet
            if (data.tools && data.tools.length > 0) {
                const toolRows = data.tools.map(t => ({
                    'ID': t.id,
                    'Name': t.name || '',
                    'Serial Number': t.serialNumber || '',
                    'Model': t.model || '',
                    'Category': t.category || '',
                    'Status': t.status,
                    'Notes': t.notes || ''
                }));
                const ws = XLSX.utils.json_to_sheet(toolRows);
                ws['!cols'] = Array(7).fill({ wch: 18 });
                XLSX.utils.book_append_sheet(wb, ws, 'Tools');
            }

            // Technicians sheet
            if (data.technicians && data.technicians.length > 0) {
                const techRows = data.technicians.map(t => ({
                    'Badge ID': t.badgeId,
                    'Name': t.name || '',
                    'Department': t.department || '',
                    'Created': t.createdAt ? new Date(t.createdAt).toLocaleString() : ''
                }));
                const ws = XLSX.utils.json_to_sheet(techRows);
                ws['!cols'] = Array(4).fill({ wch: 20 });
                XLSX.utils.book_append_sheet(wb, ws, 'Technicians');
            }

            // Transactions sheet
            if (data.transactions && data.transactions.length > 0) {
                const txRows = data.transactions
                    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
                    .map(t => ({
                        'Timestamp': t.timestamp ? new Date(t.timestamp).toLocaleString() : '',
                        'Type': t.type,
                        'Asset ID': t.assetId,
                        'Asset Type': t.assetType || '',
                        'Technician ID': t.technicianId || '',
                        'Technician Name': t.technicianName || '',
                        'Condition': t.condition || '',
                        'Clerk': t.clerkName || '',
                        'Notes': t.notes || ''
                    }));
                const ws = XLSX.utils.json_to_sheet(txRows);
                ws['!cols'] = Array(9).fill({ wch: 20 });
                XLSX.utils.book_append_sheet(wb, ws, 'Transactions');
            }

            // Audit Log sheet
            if (data.auditLog && data.auditLog.length > 0) {
                const auditRows = data.auditLog
                    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
                    .map(l => ({
                        'Timestamp': l.timestamp ? new Date(l.timestamp).toLocaleString() : '',
                        'Entity Type': l.entityType || '',
                        'Entity ID': l.entityId || '',
                        'Action': l.action || '',
                        'Details': l.details || '',
                        'Performed By': l.performedBy || ''
                    }));
                const ws = XLSX.utils.json_to_sheet(auditRows);
                ws['!cols'] = Array(6).fill({ wch: 22 });
                XLSX.utils.book_append_sheet(wb, ws, 'Audit Log');
            }

            // Generate filename with date
            const today = new Date().toISOString().split('T')[0];
            const filename = `inventory_backup_${today}.xlsx`;

            XLSX.writeFile(wb, filename);
            UI.toast(`Exported to ${filename}`, 'success');
        } catch (e) {
            console.error('Export error:', e);
            UI.toast('Export failed: ' + e.message, 'error');
        }
    });

    // Export JSON
    document.getElementById('export-json-btn').addEventListener('click', async () => {
        try {
            const data = await DB.exportAll();
            const json = JSON.stringify(data, null, 2);
            const blob = new Blob([json], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            const today = new Date().toISOString().split('T')[0];
            a.href = url;
            a.download = `inventory_backup_${today}.json`;
            a.click();
            URL.revokeObjectURL(url);
            UI.toast('JSON backup exported', 'success');
        } catch (e) {
            UI.toast('Export failed: ' + e.message, 'error');
        }
    });

    // Import JSON
    document.getElementById('import-json-btn').addEventListener('click', () => {
        document.getElementById('import-file-input').click();
    });

    document.getElementById('import-file-input').addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (!UI.confirm('This will merge imported data with existing data. Continue?')) return;

        try {
            const text = await file.text();
            const data = JSON.parse(text);
            await DB.importAll(data);
            UI.toast('Data imported successfully', 'success');
            UI.navigateTo('export');
        } catch (err) {
            UI.toast('Import failed: ' + err.message, 'error');
        }
    });

    // Clear all data
    document.getElementById('clear-data-btn').addEventListener('click', async () => {
        if (!UI.confirm('⚠️ This will DELETE ALL DATA. This cannot be undone!\n\nAre you sure?')) return;
        if (!UI.confirm('FINAL WARNING: All radios, batteries, tools, transactions, and audit logs will be permanently deleted.\n\nType OK to confirm.')) return;

        try {
            const stores = ['radios', 'batteries', 'tools', 'technicians', 'transactions', 'auditLog'];
            for (const store of stores) {
                await DB.clear(store);
            }
            UI.toast('All data cleared', 'warning');
            UI.navigateTo('home');
        } catch (e) {
            UI.toast('Clear failed: ' + e.message, 'error');
        }
    });
});
