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
            <div class="card-header"><h3>🔄 Database Sync & Backup</h3></div>
            <p style="font-size:0.8rem;color:var(--text-secondary);margin-bottom:0.75rem;">
                Dual local backups (A/B alternation) for crash safety, plus optional push to a shared network folder.
                Retries automatically on failure. Integrity checked every 8 hours.
            </p>

            <!-- Status indicators -->
            <div id="sv-sync-indicators" style="display:flex;gap:0.75rem;flex-wrap:wrap;margin-bottom:0.75rem;">
                <div id="sv-ind-local" style="display:flex;align-items:center;gap:0.3rem;padding:0.3rem 0.6rem;border-radius:4px;font-size:0.75rem;font-weight:600;background:var(--surface-alt);border:1px solid var(--border);">
                    <span id="sv-ind-local-dot" style="width:8px;height:8px;border-radius:50%;background:var(--gray-400);"></span>
                    <span id="sv-ind-local-text">Local: checking...</span>
                </div>
                <div id="sv-ind-network" style="display:flex;align-items:center;gap:0.3rem;padding:0.3rem 0.6rem;border-radius:4px;font-size:0.75rem;font-weight:600;background:var(--surface-alt);border:1px solid var(--border);">
                    <span id="sv-ind-net-dot" style="width:8px;height:8px;border-radius:50%;background:var(--gray-400);"></span>
                    <span id="sv-ind-net-text">Network: —</span>
                </div>
                <div id="sv-ind-integrity" style="display:flex;align-items:center;gap:0.3rem;padding:0.3rem 0.6rem;border-radius:4px;font-size:0.75rem;font-weight:600;background:var(--surface-alt);border:1px solid var(--border);">
                    <span id="sv-ind-int-dot" style="width:8px;height:8px;border-radius:50%;background:var(--gray-400);"></span>
                    <span id="sv-ind-int-text">Integrity: —</span>
                </div>
            </div>

            <div style="margin-bottom:0.75rem;">
                <label style="display:inline-flex;align-items:center;gap:0.4rem;cursor:pointer;font-size:0.85rem;font-weight:600;color:var(--text-secondary);">
                    <input type="checkbox" id="sv-sync-enabled" ${syncSettings.enabled ? 'checked' : ''}>
                    Enable Network Sync
                </label>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label for="sv-sync-path">Network Folder Path</label>
                    <div style="display:flex;gap:0.5rem;align-items:center;">
                        <input type="text" id="sv-sync-path" value="${syncSettings.networkPath || ''}" placeholder="\\\\server\\share\\radio_backup" autocomplete="off" style="flex:1;">
                        <button class="btn btn-outline" id="sv-sync-browse" title="Browse for folder">📂 Browse</button>
                    </div>
                    <small style="color:var(--text-muted);">UNC path to a shared folder all computers can access</small>
                </div>
                <div class="form-group">
                    <label for="sv-sync-interval">Push Interval</label>
                    <select id="sv-sync-interval">
                        <option value="1" ${syncSettings.intervalHours === 1 ? 'selected' : ''}>Every 1 hour</option>
                        <option value="4" ${syncSettings.intervalHours === 4 ? 'selected' : ''}>Every 4 hours</option>
                        <option value="8" ${syncSettings.intervalHours === 8 || !syncSettings.intervalHours ? 'selected' : ''}>Every 8 hours</option>
                        <option value="16" ${syncSettings.intervalHours === 16 ? 'selected' : ''}>Every 16 hours</option>
                    </select>
                </div>
            </div>
            <div style="display:flex;gap:0.5rem;flex-wrap:wrap;margin-bottom:0.75rem;">
                <button class="btn btn-primary" id="sv-sync-save">💾 Save Settings</button>
                <button class="btn btn-outline" id="sv-sync-push">⬆️ Push Now</button>
                <button class="btn btn-outline" id="sv-sync-pull">⬇️ Pull from Network</button>
                <button class="btn btn-outline" id="sv-sync-integrity">🩺 Check Integrity</button>
            </div>

            <!-- Local backup files info -->
            <div id="sv-sync-files" style="font-size:0.75rem;background:var(--surface-alt);padding:0.5rem 0.75rem;border-radius:var(--radius);border:1px solid var(--border);margin-bottom:0.5rem;">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.3rem;">
                    <strong>Local Backup Files</strong>
                    <button class="btn btn-outline" id="sv-sync-open-folder" style="font-size:0.7rem;padding:0.15rem 0.5rem;">📁 Open Folder</button>
                </div>
                <div id="sv-sync-file-list" style="color:var(--text-muted);">Loading...</div>
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

    // Helper: update status indicator dots and file list
    async function refreshSyncIndicators() {
        const settings = await NetworkSync.getSettings();

        // Local indicator — based on last push
        const localDot = document.getElementById('sv-ind-local-dot');
        const localText = document.getElementById('sv-ind-local-text');
        if (settings.lastPush && settings.lastPushStatus === 'success') {
            localDot.style.background = 'var(--success)';
            localText.textContent = 'Local: saved ' + new Date(settings.lastPush).toLocaleTimeString();
        } else if (settings.lastPushStatus && settings.lastPushStatus.startsWith('error')) {
            localDot.style.background = 'var(--danger)';
            localText.textContent = 'Local: error';
        } else {
            localDot.style.background = 'var(--gray-400)';
            localText.textContent = 'Local: no saves yet';
        }

        // Network indicator
        const netDot = document.getElementById('sv-ind-net-dot');
        const netText = document.getElementById('sv-ind-net-text');
        if (settings.lastNetworkOk === true) {
            netDot.style.background = 'var(--success)';
            netText.textContent = 'Network: saved';
        } else if (settings.lastNetworkOk === false && settings.lastPush) {
            netDot.style.background = 'var(--danger)';
            netText.textContent = settings.retryCount > 0 ? `Network: retrying (${settings.retryCount}/${NetworkSync.MAX_RETRIES})` : 'Network: failed';
        } else {
            netDot.style.background = 'var(--gray-400)';
            netText.textContent = settings.enabled ? 'Network: —' : 'Network: disabled';
        }

        // Integrity indicator
        const intDot = document.getElementById('sv-ind-int-dot');
        const intText = document.getElementById('sv-ind-int-text');
        if (settings.integrityOk === true) {
            intDot.style.background = 'var(--success)';
            intText.textContent = 'Integrity: clean';
        } else if (settings.integrityOk === false) {
            intDot.style.background = 'var(--danger)';
            intText.textContent = 'Integrity: WARNING';
        } else {
            intDot.style.background = 'var(--gray-400)';
            intText.textContent = 'Integrity: not checked';
        }

        // File list — try to load from server
        try {
            const status = await NetworkSync.getStatus();
            if (status.error) throw new Error(status.error);
            const fileListEl = document.getElementById('sv-sync-file-list');
            const fmtSlot = (s) => {
                if (!s.exists) return `<span style="color:var(--text-muted);">Not created yet</span>`;
                const kb = (s.size / 1024).toFixed(1);
                const time = new Date(s.modified).toLocaleString();
                const icon = s.ok ? '<span style="color:var(--success);">●</span>' : '<span style="color:var(--danger);">●</span>';
                const label = s.ok ? 'valid' : '<span style="color:var(--danger);">CORRUPT</span>';
                return `${icon} ${kb} KB — ${time} — ${label}`;
            };
            fileListEl.innerHTML = `
                <div>Slot A: ${status.slotA ? fmtSlot(status.slotA) : '—'}</div>
                <div>Slot B: ${status.slotB ? fmtSlot(status.slotB) : '—'}</div>
                <div style="margin-top:0.2rem;color:var(--text-muted);">Next write → Slot ${status.nextSlot || '?'}</div>
                ${status.network && status.network.exists ? `<div style="margin-top:0.2rem;">Network: ${fmtSlot(status.network)}</div>` : ''}
            `;

            // Update indicators from live file check
            const aOk = status.slotA && status.slotA.ok;
            const bOk = status.slotB && status.slotB.ok;
            if (aOk || bOk) {
                localDot.style.background = 'var(--success)';
                if (settings.lastPush) localText.textContent = 'Local: saved ' + new Date(settings.lastPush).toLocaleTimeString();
            }
            if (status.network && status.network.ok) {
                netDot.style.background = 'var(--success)';
                netText.textContent = 'Network: saved';
            }
        } catch (e) {
            document.getElementById('sv-sync-file-list').innerHTML = `<span style="color:var(--text-muted);">Server not running — start with start.bat to see file status</span>`;
        }
    }

    // Load indicators on page load
    refreshSyncIndicators();

    // Browse button
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
            UI.toast('Could not open folder picker: ' + e.message, 'error');
        } finally {
            btn.disabled = false;
            btn.textContent = '📂 Browse';
        }
    });

    // Open local backup folder in Explorer
    document.getElementById('sv-sync-open-folder').addEventListener('click', async () => {
        try {
            await NetworkSync.openLocalFolder();
        } catch (e) {
            UI.toast('Could not open folder', 'error');
        }
    });

    // Save settings
    document.getElementById('sv-sync-save').addEventListener('click', async () => {
        const enabled = document.getElementById('sv-sync-enabled').checked;
        const networkPath = document.getElementById('sv-sync-path').value.trim();
        const intervalHours = parseInt(document.getElementById('sv-sync-interval').value);

        if (enabled && !networkPath) {
            UI.toast('Enter a network folder path', 'error');
            return;
        }

        const settings = await NetworkSync.getSettings();
        settings.enabled = enabled;
        settings.networkPath = networkPath;
        settings.intervalHours = intervalHours;
        await NetworkSync.saveSettings(settings);
        NetworkSync.restart();
        UI.toast('Sync settings saved' + (enabled ? ` — pushing every ${intervalHours}h` : ' — sync disabled'), 'success');
    });

    // Push Now
    document.getElementById('sv-sync-push').addEventListener('click', async () => {
        const btn = document.getElementById('sv-sync-push');
        btn.disabled = true;
        btn.textContent = '⏳ Pushing...';
        UI.toast('Pushing database...', 'info');
        const result = await NetworkSync.pushToNetwork();
        if (result.ok) {
            const info = [];
            info.push('Local slot ' + (result.result.localSlot || '?') + ' ✓');
            if (result.result.networkOk) info.push('Network ✓');
            else if (result.result.networkError) info.push('Network ✗ — will retry');
            UI.toast('Saved: ' + info.join(', '), result.result.networkOk ? 'success' : 'warning');
        } else {
            UI.toast('Push failed: ' + result.error, 'error');
        }
        btn.disabled = false;
        btn.textContent = '⬆️ Push Now';
        refreshSyncIndicators();
    });

    // Pull from Network
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

    // Check Integrity
    document.getElementById('sv-sync-integrity').addEventListener('click', async () => {
        const btn = document.getElementById('sv-sync-integrity');
        btn.disabled = true;
        btn.textContent = '⏳ Checking...';
        const result = await NetworkSync.checkIntegrity();
        if (result.ok) {
            UI.toast('Integrity check passed — local backups are clean', 'success');
        } else if (result.error) {
            UI.toast('Integrity check failed: ' + result.error, 'error');
        } else {
            UI.toast('WARNING: Both local backup files may be corrupt!', 'error');
        }
        btn.disabled = false;
        btn.textContent = '🩺 Check Integrity';
        refreshSyncIndicators();
    });

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
