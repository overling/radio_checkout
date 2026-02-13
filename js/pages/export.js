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

    // Load auto-backup settings and stored backups
    const abSettings = await AutoBackup.getSettings();
    const storedBackups = await AutoBackup.getBackups();

    function formatBytes(bytes) {
        if (bytes < 1024) return bytes + ' B';
        return (bytes / 1024).toFixed(1) + ' KB';
    }

    const backupListHtml = storedBackups.length === 0
        ? '<p style="color:var(--gray-400);font-size:0.9rem;padding:0.5rem 0;">No backups stored yet. Backups will be created automatically at scheduled times.</p>'
        : storedBackups.map((b, i) => `
            <div style="display:flex;align-items:center;justify-content:space-between;padding:0.6rem 0.75rem;background:var(--surface-alt);border-radius:var(--radius);margin-bottom:0.4rem;">
                <div>
                    <span style="font-weight:600;font-size:0.9rem;">${b.label}</span>
                    <span style="color:var(--gray-400);font-size:0.8rem;margin-left:0.5rem;">(${formatBytes(b.size)})</span>
                </div>
                <button class="btn btn-outline btn-sm backup-download-btn" data-idx="${i}" style="font-size:0.8rem;">📥 Download</button>
            </div>
        `).join('');

    container.innerHTML = `
        <h2 class="page-title">💾 Export & Backup</h2>

        <div class="card">
            <div class="card-header">
                <h3>⏰ Auto-Backup Schedule</h3>
            </div>
            <p style="margin-bottom:1rem; color:var(--gray-600);">
                Automatically saves a backup at the end of each shift. Backups are stored in the browser and can be downloaded anytime.
                The oldest backup is automatically deleted when the limit is reached.
            </p>
            <div style="display:grid;grid-template-columns:auto 1fr;gap:0.75rem 1.25rem;align-items:center;margin-bottom:1.25rem;">
                <label style="font-weight:600;">Enabled:</label>
                <label style="display:flex;align-items:center;gap:0.5rem;cursor:pointer;">
                    <input type="checkbox" id="ab-enabled" ${abSettings.enabled ? 'checked' : ''} style="width:18px;height:18px;">
                    <span id="ab-enabled-label" style="font-size:0.9rem;color:var(--text-muted);">${abSettings.enabled ? 'Auto-backup is ON' : 'Auto-backup is OFF'}</span>
                </label>

                <label style="font-weight:600;">Keep last:</label>
                <div style="display:flex;align-items:center;gap:0.5rem;">
                    <select id="ab-max-backups" style="padding:0.4rem 0.6rem;border-radius:var(--radius);border:1px solid var(--border);font-size:0.95rem;">
                        <option value="2" ${abSettings.maxBackups === 2 ? 'selected' : ''}>2 backups</option>
                        <option value="3" ${abSettings.maxBackups === 3 ? 'selected' : ''}>3 backups</option>
                        <option value="5" ${abSettings.maxBackups === 5 ? 'selected' : ''}>5 backups</option>
                        <option value="7" ${abSettings.maxBackups === 7 ? 'selected' : ''}>7 backups</option>
                        <option value="10" ${abSettings.maxBackups === 10 ? 'selected' : ''}>10 backups</option>
                    </select>
                    <span style="font-size:0.85rem;color:var(--text-muted);">(rolling — oldest auto-deleted)</span>
                </div>

                <label style="font-weight:600;">Backup times:</label>
                <div id="ab-times-container">
                    ${abSettings.times.map((t, i) => `
                        <div style="display:inline-flex;align-items:center;gap:0.35rem;margin-right:0.75rem;margin-bottom:0.4rem;">
                            <input type="time" class="ab-time-input" value="${t}" style="padding:0.35rem 0.5rem;border-radius:var(--radius);border:1px solid var(--border);font-size:0.95rem;">
                            <button class="ab-remove-time" data-idx="${i}" style="background:none;border:none;color:var(--danger);cursor:pointer;font-size:1.1rem;padding:0 0.25rem;" title="Remove this time">✕</button>
                        </div>
                    `).join('')}
                    <button id="ab-add-time" style="background:none;border:1px dashed var(--border);border-radius:var(--radius);padding:0.35rem 0.75rem;cursor:pointer;color:var(--primary);font-size:0.85rem;font-weight:600;">+ Add time</button>
                </div>
            </div>
            <div style="display:flex;gap:0.75rem;flex-wrap:wrap;">
                <button class="btn btn-primary" id="ab-save-btn">💾 Save Settings</button>
                <button class="btn btn-outline" id="ab-backup-now-btn">⚡ Backup Now</button>
            </div>
        </div>

        <div class="card">
            <div class="card-header">
                <h3>📦 Stored Backups (${storedBackups.length})</h3>
            </div>
            <div id="backup-list">
                ${backupListHtml}
            </div>
        </div>

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
                <h3>📥 Import from Excel (.xlsx)</h3>
            </div>
            <p style="margin-bottom:0.75rem; color:var(--gray-600);">
                Restore data from a previously exported Excel file. The import reads sheet names
                (Radios, Batteries, Tools, Technicians, Transactions) and maps columns back to the database.
            </p>
            <p style="margin-bottom:1rem; color:var(--gray-500); font-size:0.85rem;">
                ⚠️ Existing records with the same ID will be overwritten. New records will be added.
            </p>
            <button class="btn btn-primary btn-lg" id="import-xlsx-btn">
                📥 Import from Excel
            </button>
            <input type="file" id="import-xlsx-input" accept=".xlsx,.xls" style="display:none;">
            <div id="import-xlsx-status" style="margin-top:1rem;display:none;"></div>
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

    // === Auto-Backup Settings Handlers ===

    // Toggle enabled label
    document.getElementById('ab-enabled').addEventListener('change', (e) => {
        document.getElementById('ab-enabled-label').textContent = e.target.checked ? 'Auto-backup is ON' : 'Auto-backup is OFF';
    });

    // Add time slot
    document.getElementById('ab-add-time').addEventListener('click', () => {
        const container = document.getElementById('ab-times-container');
        const addBtn = document.getElementById('ab-add-time');
        const idx = container.querySelectorAll('.ab-time-input').length;
        const wrapper = document.createElement('div');
        wrapper.style.cssText = 'display:inline-flex;align-items:center;gap:0.35rem;margin-right:0.75rem;margin-bottom:0.4rem;';
        wrapper.innerHTML = `
            <input type="time" class="ab-time-input" value="12:00" style="padding:0.35rem 0.5rem;border-radius:var(--radius);border:1px solid var(--border);font-size:0.95rem;">
            <button class="ab-remove-time" style="background:none;border:none;color:var(--danger);cursor:pointer;font-size:1.1rem;padding:0 0.25rem;" title="Remove this time">✕</button>
        `;
        container.insertBefore(wrapper, addBtn);
        wrapper.querySelector('.ab-remove-time').addEventListener('click', () => wrapper.remove());
    });

    // Remove time slot (for initial buttons)
    document.querySelectorAll('.ab-remove-time').forEach(btn => {
        btn.addEventListener('click', () => btn.parentElement.remove());
    });

    // Save settings
    document.getElementById('ab-save-btn').addEventListener('click', async () => {
        const enabled = document.getElementById('ab-enabled').checked;
        const maxBackups = parseInt(document.getElementById('ab-max-backups').value) || 3;
        const timeInputs = document.querySelectorAll('.ab-time-input');
        const times = [];
        timeInputs.forEach(input => {
            if (input.value) times.push(input.value);
        });

        if (times.length === 0 && enabled) {
            UI.toast('Add at least one backup time', 'warning');
            return;
        }

        await AutoBackup.saveSettings({ enabled, maxBackups, times });

        // Restart scheduler with new settings
        AutoBackup.stop();
        if (enabled) AutoBackup.start();

        UI.toast('Auto-backup settings saved', 'success');
    });

    // Backup Now
    document.getElementById('ab-backup-now-btn').addEventListener('click', async () => {
        const btn = document.getElementById('ab-backup-now-btn');
        btn.disabled = true;
        btn.textContent = '⏳ Backing up...';
        try {
            const backup = await AutoBackup.runNow();
            if (backup) {
                UI.toast(`Backup saved (${(backup.size / 1024).toFixed(1)} KB)`, 'success');
                // Refresh page to show new backup in list
                setTimeout(() => UI.navigateTo('export'), 500);
            } else {
                UI.toast('Backup failed — XLSX library not loaded', 'error');
            }
        } catch (e) {
            UI.toast('Backup failed: ' + e.message, 'error');
        }
        btn.disabled = false;
        btn.textContent = '⚡ Backup Now';
    });

    // Download stored backup buttons
    document.querySelectorAll('.backup-download-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const idx = parseInt(btn.dataset.idx);
            if (storedBackups[idx]) {
                AutoBackup.downloadBackup(storedBackups[idx]);
                UI.toast(`Downloading ${storedBackups[idx].filename}`, 'success');
            }
        });
    });

    // Import from Excel
    document.getElementById('import-xlsx-btn').addEventListener('click', () => {
        document.getElementById('import-xlsx-input').click();
    });

    document.getElementById('import-xlsx-input').addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        e.target.value = '';

        if (typeof XLSX === 'undefined') {
            UI.toast('SheetJS library not loaded.', 'error');
            return;
        }

        if (!UI.confirm('This will import data from the Excel file.\nExisting records with the same ID will be overwritten.\n\nContinue?')) return;

        const statusEl = document.getElementById('import-xlsx-status');
        statusEl.style.display = 'block';
        statusEl.innerHTML = '<p style="color:var(--info);font-weight:600;">⏳ Reading file...</p>';

        try {
            const arrayBuffer = await file.arrayBuffer();
            const wb = XLSX.read(arrayBuffer, { type: 'array' });
            const results = [];
            let totalRecords = 0;

            // Helper: parse sheet to array of objects
            function readSheet(name) {
                const ws = wb.Sheets[name];
                if (!ws) return null;
                return XLSX.utils.sheet_to_json(ws, { defval: '' });
            }

            // --- Radios ---
            const radioRows = readSheet('Radios');
            if (radioRows && radioRows.length > 0) {
                const radios = radioRows.map(r => ({
                    id: r['ID'] || '',
                    serialNumber: r['Serial Number'] || '',
                    model: r['Model'] || '',
                    assetType: 'radio',
                    status: r['Status'] || 'Available',
                    inServiceDate: r['In Service Date'] ? new Date(r['In Service Date']).toISOString() : new Date().toISOString(),
                    outOfServiceDate: r['Out of Service Date'] ? new Date(r['Out of Service Date']).toISOString() : null,
                    checkoutCount: parseInt(r['Checkout Count']) || 0,
                    repairCount: parseInt(r['Repair Count']) || 0,
                    maintenanceHistory: [],
                    notes: r['Notes'] || '',
                    createdAt: r['Created'] ? new Date(r['Created']).toISOString() : new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                })).filter(r => r.id);
                if (radios.length > 0) {
                    await DB.bulkPut('radios', radios);
                    results.push(`📻 ${radios.length} radios`);
                    totalRecords += radios.length;
                }
            }

            // --- Batteries ---
            const batteryRows = readSheet('Batteries');
            if (batteryRows && batteryRows.length > 0) {
                const batteries = batteryRows.map(b => ({
                    id: b['ID'] || '',
                    model: b['Model'] || '',
                    assetType: 'battery',
                    type: b['Type'] || 'new',
                    dateReceived: b['Date Received'] ? new Date(b['Date Received']).toISOString() : null,
                    inServiceDate: b['In Service Date'] ? new Date(b['In Service Date']).toISOString() : null,
                    entryDate: b['Entry Date'] ? new Date(b['Entry Date']).toISOString() : new Date().toISOString(),
                    retirementDate: b['Retirement Date'] ? new Date(b['Retirement Date']).toISOString() : null,
                    retirementReason: b['Retirement Reason'] || null,
                    estimatedAge: b['Estimated Age'] || null,
                    status: b['Status'] || 'In Inventory',
                    notes: b['Notes'] || '',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                })).filter(b => b.id);
                if (batteries.length > 0) {
                    await DB.bulkPut('batteries', batteries);
                    results.push(`🔋 ${batteries.length} batteries`);
                    totalRecords += batteries.length;
                }
            }

            // --- Tools ---
            const toolRows = readSheet('Tools');
            if (toolRows && toolRows.length > 0) {
                const tools = toolRows.map(t => ({
                    id: t['ID'] || '',
                    name: t['Name'] || '',
                    serialNumber: t['Serial Number'] || '',
                    model: t['Model'] || '',
                    category: t['Category'] || '',
                    assetType: 'tool',
                    inServiceDate: new Date().toISOString(),
                    outOfServiceDate: null,
                    status: t['Status'] || 'Available',
                    notes: t['Notes'] || '',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                })).filter(t => t.id);
                if (tools.length > 0) {
                    await DB.bulkPut('tools', tools);
                    results.push(`🔧 ${tools.length} tools`);
                    totalRecords += tools.length;
                }
            }

            // --- Technicians ---
            const techRows = readSheet('Technicians');
            if (techRows && techRows.length > 0) {
                const techs = techRows.map(t => ({
                    id: t['Badge ID'] || '',
                    badgeId: t['Badge ID'] || '',
                    name: t['Name'] || '',
                    department: t['Department'] || '',
                    createdAt: t['Created'] ? new Date(t['Created']).toISOString() : new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                })).filter(t => t.id);
                if (techs.length > 0) {
                    await DB.bulkPut('technicians', techs);
                    results.push(`👤 ${techs.length} technicians`);
                    totalRecords += techs.length;
                }
            }

            // --- Transactions ---
            const txRows = readSheet('Transactions');
            if (txRows && txRows.length > 0) {
                const txs = txRows.map(t => ({
                    id: Models.generateId ? Models.generateId() : (Date.now().toString(36) + Math.random().toString(36).substr(2, 9)),
                    assetId: t['Asset ID'] || '',
                    assetType: t['Asset Type'] || 'radio',
                    technicianId: t['Technician ID'] || null,
                    technicianName: t['Technician Name'] || '',
                    type: t['Type'] || '',
                    condition: t['Condition'] || null,
                    clerkName: t['Clerk'] || '',
                    notes: t['Notes'] || '',
                    timestamp: t['Timestamp'] ? new Date(t['Timestamp']).toISOString() : new Date().toISOString()
                })).filter(t => t.assetId && t.type);
                if (txs.length > 0) {
                    await DB.bulkPut('transactions', txs);
                    results.push(`📋 ${txs.length} transactions`);
                    totalRecords += txs.length;
                }
            }

            if (totalRecords === 0) {
                statusEl.innerHTML = `<p style="color:var(--warning);font-weight:600;">⚠️ No data found. Make sure the Excel file has sheets named: Radios, Batteries, Tools, Technicians, or Transactions.</p>`;
            } else {
                statusEl.innerHTML = `
                    <div style="background:var(--success-light);border:1px solid var(--success);border-radius:var(--radius);padding:1rem;">
                        <p style="color:var(--success);font-weight:700;margin-bottom:0.5rem;">✅ Import complete — ${totalRecords} records imported</p>
                        <p style="color:var(--text-secondary);font-size:0.9rem;">${results.join(' &nbsp;•&nbsp; ')}</p>
                    </div>
                `;
                UI.toast(`Imported ${totalRecords} records from Excel`, 'success');
                // Refresh the data summary counts
                setTimeout(() => UI.navigateTo('export'), 2000);
            }
        } catch (err) {
            console.error('Excel import error:', err);
            statusEl.innerHTML = `<p style="color:var(--danger);font-weight:600;">❌ Import failed: ${err.message}</p>`;
            UI.toast('Import failed: ' + err.message, 'error');
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

    // Clear all data — requires typing DELETE to confirm
    document.getElementById('clear-data-btn').addEventListener('click', async () => {
        UI.showModal('⚠️ Clear All Data', `
            <div style="text-align:center;">
                <p style="color:var(--danger);font-weight:700;font-size:1.1rem;margin-bottom:0.5rem;">
                    This will permanently delete ALL data!
                </p>
                <p style="color:var(--text-secondary);margin-bottom:0.75rem;">
                    All radios, batteries, technicians, transactions, and audit logs will be erased.<br>
                    <strong>This cannot be undone.</strong> Export a backup first if needed.
                </p>
                <p style="margin-bottom:0.5rem;font-size:0.85rem;">Type <strong style="color:var(--danger);">DELETE</strong> to confirm:</p>
                <input type="text" id="clear-confirm-input" placeholder="Type DELETE here" autocomplete="off"
                    style="width:100%;max-width:260px;padding:0.6rem;border:2px solid var(--danger);border-radius:var(--radius);font-size:1rem;text-align:center;background:var(--input-bg);color:var(--text);">
            </div>
        `, `
            <button class="btn btn-outline" id="clear-cancel-btn">Cancel</button>
            <button class="btn btn-danger" id="clear-confirm-btn" disabled>🗑️ Clear Everything</button>
        `);

        const confirmInput = document.getElementById('clear-confirm-input');
        const confirmBtn = document.getElementById('clear-confirm-btn');
        const cancelBtn = document.getElementById('clear-cancel-btn');

        confirmInput.addEventListener('input', () => {
            confirmBtn.disabled = confirmInput.value.trim() !== 'DELETE';
        });

        cancelBtn.addEventListener('click', () => UI.closeModal());

        confirmBtn.addEventListener('click', async () => {
            if (confirmInput.value.trim() !== 'DELETE') return;
            UI.closeModal();
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

        setTimeout(() => confirmInput.focus(), 100);
    });
});
