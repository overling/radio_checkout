/**
 * Supervisor Dashboard - Overview of all alerts, overdue radios, flagged items,
 * email notifications, and network sync settings
 */
UI.registerPage('supervisor', async (container) => {
    const radioStats = await Models.getRadioStats();
    const batteryStats = await Models.getBatteryStats();
    const transactions = await DB.getAll('transactions');
    const radios = await DB.getAll('radios');
    const auditLog = await DB.getAll('auditLog');

    // Load email and sync settings
    const emailContacts = await DB.getSetting('emailContacts', []);
    const emailMessage = await DB.getSetting('overdueEmailMessage', 'The following radios are overdue and have not been returned within the allowed time. Please follow up with the assigned technicians.');
    const syncSettings = typeof NetworkSync !== 'undefined' ? await NetworkSync.getSettings() : { enabled: false, networkPath: '', intervalMinutes: 15 };

    container.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:0.5rem;margin-bottom:0.25rem;">
            <h2 class="page-title" style="margin-bottom:0;">📊 Supervisor Dashboard</h2>
            <div style="display:flex;gap:0.5rem;">
                <button class="btn btn-outline" onclick="UI.navigateTo('assets')">📦 Assets</button>
                <button class="btn btn-outline" onclick="UI.navigateTo('export')">💾 Export</button>
            </div>
        </div>

        <div class="stats-row">
            <div class="stat-card success">
                <div class="stat-value">${radioStats.available}</div>
                <div class="stat-label">Radios Available</div>
            </div>
            <div class="stat-card warning">
                <div class="stat-value">${radioStats.checkedOut}</div>
                <div class="stat-label">Checked Out</div>
            </div>
            <div class="stat-card info">
                <div class="stat-value">${radioStats.maintenance}</div>
                <div class="stat-label">In Maintenance</div>
            </div>
            <div class="stat-card danger">
                <div class="stat-value">${radioStats.overdue}</div>
                <div class="stat-label">Overdue</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${radioStats.retired}</div>
                <div class="stat-label">Retired</div>
            </div>
            <div class="stat-card danger">
                <div class="stat-value">${radioStats.lost}</div>
                <div class="stat-label">Lost</div>
            </div>
        </div>

        <div id="sv-settings" class="card no-print">
            <div class="card-header"><h3>⚙️ Settings</h3></div>
            <div class="form-row">
                <div class="form-group">
                    <label for="sv-overdue-hours">Overdue Threshold (hours)</label>
                    <div class="scan-input-group">
                        <input type="number" id="sv-overdue-hours" value="${radioStats.overdueHours}" min="1">
                        <button class="btn btn-primary" id="sv-save-hours">Save</button>
                    </div>
                </div>
            </div>
        </div>

        <!-- Email Notifications -->
        <div id="sv-email" class="card no-print">
            <div class="card-header"><h3>📧 Email Notifications</h3></div>
            <p style="font-size:0.85rem;color:var(--text-secondary);margin-bottom:0.75rem;">
                Manage recipients for overdue radio alerts. Toggle each contact on/off. Click <strong>Send Overdue Alert</strong> to email all enabled contacts.
            </p>
            <div id="sv-email-list" style="margin-bottom:0.75rem;"></div>
            <div style="display:flex;gap:0.5rem;align-items:center;margin-bottom:1rem;flex-wrap:wrap;">
                <input type="email" id="sv-email-input" placeholder="email@example.com" style="flex:1;min-width:200px;" autocomplete="off">
                <input type="text" id="sv-email-name" placeholder="Name (optional)" style="width:150px;" autocomplete="off">
                <button class="btn btn-primary" id="sv-email-add">+ Add</button>
            </div>
            <div class="form-group" style="margin-bottom:0.75rem;">
                <label for="sv-email-msg">Overdue Alert Message Template</label>
                <textarea id="sv-email-msg" rows="3" style="width:100%;resize:vertical;font-family:inherit;font-size:0.85rem;padding:0.5rem;border:1px solid var(--border);border-radius:var(--radius);background:var(--surface);color:var(--text);">${emailMessage}</textarea>
            </div>
            <div style="display:flex;gap:0.5rem;flex-wrap:wrap;">
                <button class="btn btn-primary" id="sv-email-save-msg">💾 Save Message</button>
                <button class="btn btn-danger" id="sv-email-send" ${radioStats.overdue === 0 ? 'disabled title="No overdue radios"' : ''}>
                    📤 Send Overdue Alert${radioStats.overdue > 0 ? ' (' + radioStats.overdue + ' overdue)' : ''}
                </button>
            </div>
        </div>

        <!-- Network Sync -->
        <div id="sv-sync" class="card no-print">
            <div class="card-header"><h3>🔄 Database Sync</h3></div>
            <p style="font-size:0.85rem;color:var(--text-secondary);margin-bottom:0.75rem;">
                Saves the database locally and pushes a copy to a shared network folder so other computers can access the same data.
            </p>
            <div class="form-row">
                <div class="form-group">
                    <label>
                        <input type="checkbox" id="sv-sync-enabled" ${syncSettings.enabled ? 'checked' : ''}>
                        Enable Network Sync
                    </label>
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label for="sv-sync-path">Network Folder Path</label>
                    <div style="display:flex;gap:0.5rem;align-items:center;">
                        <input type="text" id="sv-sync-path" value="${syncSettings.networkPath || ''}" placeholder="\\\\server\\share\\radio_backup" autocomplete="off" style="flex:1;">
                        <button class="btn btn-outline" id="sv-sync-browse" title="Browse for folder">📂 Browse</button>
                    </div>
                    <small style="color:var(--text-muted);">UNC path to a shared folder all computers can access, or click Browse to pick one</small>
                </div>
                <div class="form-group">
                    <label for="sv-sync-interval">Push Interval</label>
                    <select id="sv-sync-interval">
                        <option value="5" ${syncSettings.intervalMinutes === 5 ? 'selected' : ''}>Every 5 minutes</option>
                        <option value="10" ${syncSettings.intervalMinutes === 10 ? 'selected' : ''}>Every 10 minutes</option>
                        <option value="15" ${syncSettings.intervalMinutes === 15 ? 'selected' : ''}>Every 15 minutes</option>
                        <option value="30" ${syncSettings.intervalMinutes === 30 ? 'selected' : ''}>Every 30 minutes</option>
                        <option value="60" ${syncSettings.intervalMinutes === 60 ? 'selected' : ''}>Every 60 minutes</option>
                    </select>
                </div>
            </div>
            <div style="display:flex;gap:0.5rem;flex-wrap:wrap;margin-bottom:0.75rem;">
                <button class="btn btn-primary" id="sv-sync-save">💾 Save Sync Settings</button>
                <button class="btn btn-outline" id="sv-sync-push">⬆️ Push Now</button>
                <button class="btn btn-outline" id="sv-sync-pull">⬇️ Pull from Network</button>
                <button class="btn btn-outline" id="sv-sync-status">ℹ️ Check Status</button>
            </div>
            <div id="sv-sync-info" style="font-size:0.8rem;color:var(--text-muted);"></div>
        </div>

        <div id="sv-overdue"></div>
        <div id="sv-maintenance"></div>
        <div id="sv-high-repair"></div>
        <div id="sv-checked-out"></div>
        <div id="sv-flagged"></div>
        <div id="sv-audit"></div>
    `;

    // ===== Save overdue threshold =====
    document.getElementById('sv-save-hours').addEventListener('click', async () => {
        const val = parseInt(document.getElementById('sv-overdue-hours').value);
        if (val > 0) {
            await DB.setSetting('overdueHoursThreshold', val);
            UI.toast('Overdue threshold updated', 'success');
            UI.navigateTo('supervisor');
        }
    });

    // ===== Email contacts management =====
    function renderEmailList() {
        const listEl = document.getElementById('sv-email-list');
        if (emailContacts.length === 0) {
            listEl.innerHTML = '<div style="color:var(--text-muted);font-size:0.85rem;padding:0.5rem 0;">No email contacts added yet.</div>';
            return;
        }
        listEl.innerHTML = emailContacts.map((c, i) => `
            <div style="display:flex;align-items:center;gap:0.5rem;padding:0.4rem 0.5rem;border-bottom:1px solid var(--border);${i === 0 ? 'border-top:1px solid var(--border);' : ''}">
                <label style="display:flex;align-items:center;gap:0.4rem;cursor:pointer;flex-shrink:0;" title="Toggle overdue notifications">
                    <input type="checkbox" class="sv-email-toggle" data-idx="${i}" ${c.notify ? 'checked' : ''}>
                </label>
                <span style="flex:1;font-size:0.85rem;">
                    <strong>${c.email}</strong>${c.name ? ' <span style="color:var(--text-muted);">(' + c.name + ')</span>' : ''}
                </span>
                <span style="font-size:0.7rem;color:${c.notify ? 'var(--success)' : 'var(--text-muted)'};">${c.notify ? '● Notify' : '○ Off'}</span>
                <button class="btn btn-sm btn-danger sv-email-remove" data-idx="${i}" title="Remove" style="padding:0.15rem 0.4rem;font-size:0.75rem;">✕</button>
            </div>
        `).join('');

        // Toggle handlers
        listEl.querySelectorAll('.sv-email-toggle').forEach(cb => {
            cb.addEventListener('change', async () => {
                const idx = parseInt(cb.dataset.idx);
                emailContacts[idx].notify = cb.checked;
                await DB.setSetting('emailContacts', emailContacts);
                renderEmailList();
            });
        });

        // Remove handlers
        listEl.querySelectorAll('.sv-email-remove').forEach(btn => {
            btn.addEventListener('click', async () => {
                const idx = parseInt(btn.dataset.idx);
                const removed = emailContacts.splice(idx, 1)[0];
                await DB.setSetting('emailContacts', emailContacts);
                UI.toast(`Removed ${removed.email}`, 'info');
                renderEmailList();
            });
        });
    }
    renderEmailList();

    // Add email
    document.getElementById('sv-email-add').addEventListener('click', async () => {
        const emailInput = document.getElementById('sv-email-input');
        const nameInput = document.getElementById('sv-email-name');
        const email = emailInput.value.trim();
        const name = nameInput.value.trim();

        if (!email || !email.includes('@')) {
            UI.toast('Enter a valid email address', 'error');
            emailInput.focus();
            return;
        }
        if (emailContacts.some(c => c.email.toLowerCase() === email.toLowerCase())) {
            UI.toast('Email already in the list', 'error');
            return;
        }

        emailContacts.push({ email, name, notify: true });
        await DB.setSetting('emailContacts', emailContacts);
        emailInput.value = '';
        nameInput.value = '';
        renderEmailList();
        UI.toast(`Added ${email}`, 'success');
    });

    // Save message template
    document.getElementById('sv-email-save-msg').addEventListener('click', async () => {
        const msg = document.getElementById('sv-email-msg').value.trim();
        await DB.setSetting('overdueEmailMessage', msg);
        UI.toast('Message template saved', 'success');
    });

    // Send overdue alert via mailto:
    document.getElementById('sv-email-send').addEventListener('click', async () => {
        const enabledContacts = emailContacts.filter(c => c.notify);
        if (enabledContacts.length === 0) {
            UI.toast('No contacts enabled for notifications', 'error');
            return;
        }
        if (radioStats.overdueList.length === 0) {
            UI.toast('No overdue radios to report', 'info');
            return;
        }

        const msgTemplate = document.getElementById('sv-email-msg').value.trim();
        const toList = enabledContacts.map(c => c.email).join(';');
        const subject = `Overdue Radio Alert — ${radioStats.overdue} radio(s) past ${radioStats.overdueHours}h threshold`;

        // Build body with overdue details
        let body = msgTemplate + '\n\n';
        body += '=== OVERDUE RADIOS ===\n\n';
        for (const r of radioStats.overdueList) {
            body += `Radio: ${r.id}\n`;
            if (r.model) body += `  Model: ${r.model}\n`;
            body += `  Checked Out To: ${r.checkedOutTo || 'Unknown'}\n`;
            body += `  Checkout Time: ${r.checkoutTime ? new Date(r.checkoutTime).toLocaleString() : 'Unknown'}\n`;
            body += `  Hours Out: ${r.hoursOut}h\n\n`;
        }
        body += `Generated: ${new Date().toLocaleString()}\n`;
        body += `Overdue Threshold: ${radioStats.overdueHours} hours`;

        const mailtoUrl = `mailto:${encodeURIComponent(toList)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        window.open(mailtoUrl, '_blank');
        UI.toast(`Opening email client for ${enabledContacts.length} recipient(s)`, 'success');
    });

    // ===== Network Sync controls =====
    // Browse button — opens native Windows folder picker via server API
    document.getElementById('sv-sync-browse').addEventListener('click', async () => {
        const btn = document.getElementById('sv-sync-browse');
        btn.disabled = true;
        btn.textContent = '⏳ Waiting...';
        try {
            const resp = await fetch('/api/browse-folder');
            if (!resp.ok) throw new Error('Server returned ' + resp.status);
            const result = await resp.json();
            if (result.path) {
                document.getElementById('sv-sync-path').value = result.path;
                UI.toast('Folder selected: ' + result.path, 'success');
            } else {
                UI.toast('No folder selected', 'info');
            }
        } catch (e) {
            UI.toast('Could not open folder picker: ' + e.message + '. Is the server running via start.bat?', 'error');
        } finally {
            btn.disabled = false;
            btn.textContent = '📂 Browse';
        }
    });

    document.getElementById('sv-sync-save').addEventListener('click', async () => {
        const enabled = document.getElementById('sv-sync-enabled').checked;
        const networkPath = document.getElementById('sv-sync-path').value.trim();
        const intervalMinutes = parseInt(document.getElementById('sv-sync-interval').value);

        if (enabled && !networkPath) {
            UI.toast('Enter a network folder path', 'error');
            return;
        }

        const settings = await NetworkSync.getSettings();
        settings.enabled = enabled;
        settings.networkPath = networkPath;
        settings.intervalMinutes = intervalMinutes;
        await NetworkSync.saveSettings(settings);
        NetworkSync.restart();
        UI.toast('Sync settings saved' + (enabled ? ` — pushing every ${intervalMinutes} min` : ' — sync disabled'), 'success');
    });

    document.getElementById('sv-sync-push').addEventListener('click', async () => {
        UI.toast('Pushing database to network...', 'info');
        const result = await NetworkSync.pushToNetwork();
        if (result.ok) {
            const info = [];
            if (result.result.localOk) info.push('Local ✓');
            if (result.result.networkOk) info.push('Network ✓');
            else if (result.result.networkError) info.push('Network ✗: ' + result.result.networkError);
            UI.toast('Sync complete: ' + info.join(', '), result.result.networkOk ? 'success' : 'warning');
        } else {
            UI.toast('Sync failed: ' + result.error, 'error');
        }
    });

    document.getElementById('sv-sync-pull').addEventListener('click', async () => {
        UI.toast('Pulling database from network...', 'info');
        const payload = await NetworkSync.pullFromNetwork();
        if (payload && payload.data) {
            await DB.importAll(payload.data);
            UI.toast('Database loaded from network backup (' + new Date(payload.timestamp).toLocaleString() + ')', 'success');
            setTimeout(() => UI.navigateTo('supervisor'), 500);
        } else {
            UI.toast('No network backup found or pull failed', 'error');
        }
    });

    document.getElementById('sv-sync-status').addEventListener('click', async () => {
        try {
            const resp = await fetch('/api/sync/status');
            if (!resp.ok) throw new Error('Server returned ' + resp.status);
            const status = await resp.json();
            const infoEl = document.getElementById('sv-sync-info');
            infoEl.innerHTML = `
                <div style="background:var(--surface-alt);padding:0.5rem 0.75rem;border-radius:var(--radius);border:1px solid var(--border);margin-top:0.5rem;">
                    <strong>Local Backup:</strong> ${status.localExists ? '✅ ' + (status.localSize / 1024).toFixed(1) + ' KB — ' + new Date(status.localModified).toLocaleString() : '❌ Not found'}<br>
                    <strong>Network Backup:</strong> ${status.networkExists ? '✅ ' + (status.networkSize / 1024).toFixed(1) + ' KB — ' + new Date(status.networkModified).toLocaleString() : status.networkPath ? '❌ Not found at ' + status.networkPath : '⚠️ No network path configured'}
                </div>
            `;
        } catch (e) {
            document.getElementById('sv-sync-info').innerHTML = `<span style="color:var(--danger);">Could not check status: ${e.message}. Is the server running via start.bat?</span>`;
        }
    });

    // Show last sync info if available
    if (syncSettings.lastPush) {
        document.getElementById('sv-sync-info').innerHTML = `Last push: ${new Date(syncSettings.lastPush).toLocaleString()} — ${syncSettings.lastPushStatus || ''}`;
    }

    // Overdue radios
    if (radioStats.overdueList.length > 0) {
        const rows = radioStats.overdueList.map(r => `
            <tr>
                <td><strong>${r.id}</strong></td>
                <td>${r.model || '—'}</td>
                <td>${r.checkedOutTo || '—'}</td>
                <td>${UI.formatDateTime(r.checkoutTime)}</td>
                <td><strong style="color:var(--danger)">${r.hoursOut}h</strong></td>
            </tr>
        `).join('');

        document.getElementById('sv-overdue').innerHTML = `
            <div class="card">
                <div class="card-header"><h3>🚨 Overdue Radios (${radioStats.overdueHours}h+ threshold)</h3></div>
                <div class="table-wrapper">
                    <table>
                        <thead><tr><th>Radio</th><th>Model</th><th>Checked Out To</th><th>Checkout Time</th><th>Hours Out</th></tr></thead>
                        <tbody>${rows}</tbody>
                    </table>
                </div>
            </div>
        `;
    }

    // Maintenance radios
    const maintenanceRadios = radios.filter(r => r.status === 'Maintenance');
    if (maintenanceRadios.length > 0) {
        const rows = maintenanceRadios.map(r => {
            const lastMaint = r.maintenanceHistory && r.maintenanceHistory.length > 0
                ? r.maintenanceHistory[r.maintenanceHistory.length - 1] : null;
            return `
                <tr>
                    <td><strong>${r.id}</strong></td>
                    <td>${r.model || '—'}</td>
                    <td>${lastMaint ? lastMaint.reason : '—'}</td>
                    <td>${lastMaint ? UI.formatDateTime(lastMaint.date) : '—'}</td>
                    <td>${lastMaint ? (lastMaint.reportedBy || '—') : '—'}</td>
                    <td>
                        <button class="btn btn-sm btn-success resolve-maint" data-id="${r.id}">Mark Available</button>
                    </td>
                </tr>
            `;
        }).join('');

        document.getElementById('sv-maintenance').innerHTML = `
            <div class="card">
                <div class="card-header"><h3>🔧 Radios in Maintenance</h3></div>
                <div class="table-wrapper">
                    <table>
                        <thead><tr><th>Radio</th><th>Model</th><th>Reason</th><th>Date</th><th>Reported By</th><th>Action</th></tr></thead>
                        <tbody>${rows}</tbody>
                    </table>
                </div>
            </div>
        `;

        document.querySelectorAll('.resolve-maint').forEach(btn => {
            btn.addEventListener('click', async () => {
                if (UI.confirm(`Mark radio ${btn.dataset.id} as Available?`)) {
                    await Models.changeAssetStatus('radio', btn.dataset.id, 'Available', 'Maintenance resolved', UI.getClerkName());
                    UI.toast('Radio marked as Available', 'success');
                    UI.navigateTo('supervisor');
                }
            });
        });
    }

    // High repair frequency
    if (radioStats.highRepairList.length > 0) {
        const rows = radioStats.highRepairList.map(r => `
            <tr>
                <td><strong>${r.id}</strong></td>
                <td>${r.model || '—'}</td>
                <td>${UI.statusBadge(r.status)}</td>
                <td><strong style="color:var(--warning)">${r.repairCount}</strong></td>
                <td>${r.checkoutCount || 0}</td>
            </tr>
        `).join('');

        document.getElementById('sv-high-repair').innerHTML = `
            <div class="card">
                <div class="card-header"><h3>⚠️ High Repair Frequency (3+ repairs)</h3></div>
                <div class="table-wrapper">
                    <table>
                        <thead><tr><th>Radio</th><th>Model</th><th>Status</th><th>Repairs</th><th>Checkouts</th></tr></thead>
                        <tbody>${rows}</tbody>
                    </table>
                </div>
            </div>
        `;
    }

    // Currently checked out
    const checkedOut = radios.filter(r => r.status === 'Checked Out');
    if (checkedOut.length > 0) {
        const rowsPromises = checkedOut.map(async r => {
            const info = await Models.getRadioCheckoutInfo(r.id);
            const hoursOut = info ? ((Date.now() - new Date(info.timestamp).getTime()) / (1000 * 60 * 60)).toFixed(1) : '?';
            return `
                <tr>
                    <td><strong>${r.id}</strong></td>
                    <td>${r.model || '—'}</td>
                    <td>${info ? (info.technicianName || info.technicianId) : '—'}</td>
                    <td>${info ? UI.formatDateTime(info.timestamp) : '—'}</td>
                    <td>${hoursOut}h</td>
                </tr>
            `;
        });
        const rows = (await Promise.all(rowsPromises)).join('');

        document.getElementById('sv-checked-out').innerHTML = `
            <div class="card">
                <div class="card-header"><h3>📤 Currently Checked Out (${checkedOut.length})</h3></div>
                <div class="table-wrapper">
                    <table>
                        <thead><tr><th>Radio</th><th>Model</th><th>Technician</th><th>Checkout Time</th><th>Hours Out</th></tr></thead>
                        <tbody>${rows}</tbody>
                    </table>
                </div>
            </div>
        `;
    }

    // Flagged returns (damaged/needs repair in last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const flaggedReturns = transactions.filter(t =>
        t.type === 'return' &&
        t.condition && t.condition !== 'Good' &&
        t.timestamp > sevenDaysAgo
    ).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    if (flaggedReturns.length > 0) {
        const rows = flaggedReturns.map(t => `
            <tr>
                <td>${UI.formatDateTime(t.timestamp)}</td>
                <td><strong>${t.assetId}</strong></td>
                <td>${t.technicianName || t.technicianId || '—'}</td>
                <td>${UI.statusBadge(t.condition)}</td>
                <td>${t.notes || '—'}</td>
                <td>${t.clerkName || '—'}</td>
            </tr>
        `).join('');

        document.getElementById('sv-flagged').innerHTML = `
            <div class="card">
                <div class="card-header"><h3>🚩 Flagged Returns (Last 7 Days)</h3></div>
                <div class="table-wrapper">
                    <table>
                        <thead><tr><th>Time</th><th>Radio</th><th>Technician</th><th>Condition</th><th>Notes</th><th>Clerk</th></tr></thead>
                        <tbody>${rows}</tbody>
                    </table>
                </div>
            </div>
        `;
    }

    // Recent audit log
    const recentAudit = auditLog
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, 20);

    if (recentAudit.length > 0) {
        document.getElementById('sv-audit').innerHTML = `
            <div class="card">
                <div class="card-header"><h3>📝 Recent Audit Log</h3></div>
                <div style="max-height:400px; overflow-y:auto;">
                    ${recentAudit.map(l => `
                        <div class="audit-entry">
                            <span class="audit-time">${UI.formatDateTime(l.timestamp)}</span>
                            <span class="audit-action">[${l.entityType}:${l.entityId}]</span>
                            ${l.action}: ${l.details || ''}
                            ${l.performedBy ? `<small style="color:var(--gray-500)"> — ${l.performedBy}</small>` : ''}
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }
});
