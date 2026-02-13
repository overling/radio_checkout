/**
 * Supervisor Dashboard - Overview of all alerts, overdue radios, flagged items,
 * email notifications, and network sync settings.
 * Password-protected: stored in IndexedDB under 'supervisorPassword'.
 */

// Session flag — once authenticated, stay unlocked until page reload
let _supervisorUnlocked = false;

// Simple hash using SubtleCrypto (SHA-256)
async function _hashPassword(pw) {
    const data = new TextEncoder().encode(pw);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

UI.registerPage('supervisor', async (container) => {
    // ===== Password gate =====
    const storedHash = await DB.getSetting('supervisorPassword', null);

    if (!_supervisorUnlocked) {
        // If no password set yet, let them in and prompt to create one
        if (!storedHash) {
            _supervisorUnlocked = true;
            // Fall through to dashboard
        } else {
            // Show password prompt
            container.innerHTML = `
                <div style="max-width:360px;margin:3rem auto;text-align:center;">
                    <h2 class="page-title">🔒 Supervisor Dashboard</h2>
                    <p style="color:var(--text-secondary);margin-bottom:1.5rem;">Enter the supervisor password to continue.</p>
                    <input type="password" id="sv-pw-input" placeholder="Password" autocomplete="off"
                        style="width:100%;padding:0.7rem;border:1px solid var(--gray-300);border-radius:var(--radius);font-size:1rem;margin-bottom:0.75rem;background:var(--input-bg);color:var(--text);">
                    <div id="sv-pw-error" style="color:var(--danger);font-size:0.8rem;margin-bottom:0.5rem;display:none;">Incorrect password</div>
                    <button class="btn btn-primary" id="sv-pw-submit" style="width:100%;">🔓 Unlock</button>
                    <p style="color:var(--text-muted);font-size:0.7rem;margin-top:1rem;">Password can be changed inside the dashboard.</p>
                </div>
            `;
            const pwInput = document.getElementById('sv-pw-input');
            const pwError = document.getElementById('sv-pw-error');

            async function tryUnlock() {
                const entered = pwInput.value;
                const enteredHash = await _hashPassword(entered);
                if (enteredHash === storedHash) {
                    _supervisorUnlocked = true;
                    UI.navigateTo('supervisor');
                } else {
                    pwError.style.display = 'block';
                    pwInput.value = '';
                    pwInput.focus();
                }
            }

            document.getElementById('sv-pw-submit').addEventListener('click', tryUnlock);
            pwInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') tryUnlock(); });
            setTimeout(() => pwInput.focus(), 100);
            return;
        }
    }

    // ===== Dashboard content (authenticated) =====
    const radioStats = await Models.getRadioStats();
    const batteryStats = await Models.getBatteryStats();
    const transactions = await DB.getAll('transactions');
    const radios = await DB.getAll('radios');
    const auditLog = await DB.getAll('auditLog');

    const emailContacts = await DB.getSetting('emailContacts', []);
    const emailMessage = await DB.getSetting('overdueEmailMessage', 'The following radios are overdue and have not been returned within the allowed time. Please follow up with the assigned technicians.');
    const syncSettings = typeof NetworkSync !== 'undefined' ? await NetworkSync.getSettings() : { enabled: false, networkPath: '', intervalHours: 8 };
    const assetPrefixes = await AssetPrefixes.getAll();

    container.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:0.5rem;margin-bottom:0.25rem;">
            <h2 class="page-title" style="margin-bottom:0;">📊 Supervisor Dashboard</h2>
            <div style="display:flex;gap:0.5rem;">
                <button class="btn btn-outline" onclick="UI.navigateTo('assets')">📦 Assets</button>
                <button class="btn btn-outline" onclick="UI.navigateTo('export')">💾 Export</button>
                <button class="btn btn-outline" onclick="UI.navigateTo('test-harness')" style="opacity:0.7;">🧪 Test</button>
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

        <!-- Folder Sync -->
        <div id="sv-sync" class="card no-print">
            <div class="card-header"><h3>🔄 Folder Sync & Backup</h3></div>
            <p style="font-size:0.8rem;color:var(--text-secondary);margin-bottom:0.75rem;">
                Automatically saves your database to a folder you choose — local drive, USB, or network share.
                Uses dual A/B backup files for crash safety. Works with Chrome and Edge.
            </p>

            ${!NetworkSync.isSupported() ? `
            <div style="background:var(--danger-light);padding:0.5rem 0.75rem;border-radius:var(--radius);margin-bottom:0.75rem;font-size:0.85rem;color:var(--danger);">
                ⚠️ Your browser does not support the File System Access API. Please use <strong>Chrome</strong> or <strong>Edge</strong>.
            </div>
            ` : ''}

            <!-- Status -->
            <div id="sv-sync-status" style="font-size:0.85rem;margin-bottom:0.75rem;padding:0.5rem 0.75rem;background:var(--surface-alt);border-radius:var(--radius);border:1px solid var(--border);">
                ${syncSettings.enabled
                    ? (NetworkSync.hasHandle()
                        ? '🟢 <strong>Connected</strong> to folder: <code>' + syncSettings.folderName + '</code>'
                        : '🟡 <strong>Enabled</strong> but folder not connected this session — click "Choose Folder" to reconnect')
                    : '⚪ Folder sync is <strong>not enabled</strong>. Choose a folder below to start.'}
                ${syncSettings.lastPush ? '<br><span style="font-size:0.75rem;color:var(--text-muted);">Last save: ' + new Date(syncSettings.lastPush).toLocaleString() + ' — ' + syncSettings.lastPushStatus + '</span>' : ''}
            </div>

            <div style="display:flex;gap:0.5rem;flex-wrap:wrap;align-items:center;margin-bottom:0.75rem;">
                <button class="btn btn-primary" id="sv-sync-choose" ${!NetworkSync.isSupported() ? 'disabled' : ''}>📂 Choose Folder</button>
                <div class="form-group" style="margin-bottom:0;">
                    <select id="sv-sync-interval" style="font-size:0.85rem;padding:0.35rem;">
                        <option value="1" ${syncSettings.intervalHours === 1 ? 'selected' : ''}>Every 1 hour</option>
                        <option value="4" ${syncSettings.intervalHours === 4 ? 'selected' : ''}>Every 4 hours</option>
                        <option value="8" ${syncSettings.intervalHours === 8 || !syncSettings.intervalHours ? 'selected' : ''}>Every 8 hours</option>
                        <option value="16" ${syncSettings.intervalHours === 16 ? 'selected' : ''}>Every 16 hours</option>
                    </select>
                </div>
                <button class="btn btn-outline" id="sv-sync-push" ${!NetworkSync.hasHandle() ? 'disabled' : ''}>⬆️ Save Now</button>
                <button class="btn btn-outline" id="sv-sync-pull" ${!NetworkSync.hasHandle() ? 'disabled' : ''}>⬇️ Load from Folder</button>
                ${syncSettings.enabled ? '<button class="btn btn-outline" id="sv-sync-disable" style="color:var(--danger);">✕ Disable</button>' : ''}
            </div>

            <!-- Backup file status -->
            <div id="sv-sync-files" style="font-size:0.75rem;background:var(--surface-alt);padding:0.5rem 0.75rem;border-radius:var(--radius);border:1px solid var(--border);">
                <strong>Backup Files</strong>
                <div id="sv-sync-file-list" style="color:var(--text-muted);margin-top:0.25rem;">
                    ${NetworkSync.hasHandle() ? 'Checking...' : 'Connect a folder to see backup status'}
                </div>
            </div>
            <div id="sv-sync-info" style="font-size:0.75rem;color:var(--text-muted);margin-top:0.5rem;">
                💡 <strong>Tip:</strong> Pick a network share (like \\\\server\\share) so multiple machines can share the same backup.
                After a page reload, you'll need to click "Choose Folder" again to reconnect (browser security).
            </div>
        </div>

        <!-- Asset Prefix Configuration -->
        <div class="card no-print">
            <div class="card-header"><h3>🏷️ Scanner Prefixes</h3></div>
            <p style="font-size:0.8rem;color:var(--text-secondary);margin-bottom:0.75rem;">
                Configure how the scanner identifies asset types by their ID prefix.
                IDs starting with a <strong>digit</strong> are always treated as badges.
                IDs starting with a <strong>letter</strong> are matched against these prefixes.
            </p>
            <table style="width:100%;border-collapse:collapse;font-size:0.85rem;margin-bottom:0.75rem;">
                <thead>
                    <tr style="border-bottom:2px solid var(--border);text-align:left;">
                        <th style="padding:0.4rem;">Prefix</th>
                        <th style="padding:0.4rem;">Category</th>
                        <th style="padding:0.4rem;">Label</th>
                        <th style="padding:0.4rem;width:40px;"></th>
                    </tr>
                </thead>
                <tbody id="sv-prefix-list">
                    ${assetPrefixes.map((p, i) => `
                    <tr data-idx="${i}" style="border-bottom:1px solid var(--border);">
                        <td style="padding:0.4rem;"><code style="font-weight:700;font-size:0.95rem;">${p.prefix}</code></td>
                        <td style="padding:0.4rem;">${p.category}</td>
                        <td style="padding:0.4rem;">${p.label}</td>
                        <td style="padding:0.4rem;"><button class="btn btn-sm btn-outline sv-prefix-del" data-idx="${i}" style="color:var(--danger);padding:0.1rem 0.4rem;">✕</button></td>
                    </tr>
                    `).join('')}
                </tbody>
            </table>
            <div style="display:flex;gap:0.5rem;flex-wrap:wrap;align-items:end;margin-bottom:0.5rem;">
                <div class="form-group" style="margin-bottom:0;flex:0 0 100px;">
                    <label for="sv-prefix-new" style="font-size:0.75rem;">Prefix</label>
                    <input type="text" id="sv-prefix-new" placeholder="e.g. WV" style="text-transform:uppercase;font-size:0.85rem;padding:0.4rem;">
                </div>
                <div class="form-group" style="margin-bottom:0;flex:1;min-width:100px;">
                    <label for="sv-prefix-cat" style="font-size:0.75rem;">Category</label>
                    <input type="text" id="sv-prefix-cat" placeholder="e.g. radio" style="font-size:0.85rem;padding:0.4rem;">
                </div>
                <div class="form-group" style="margin-bottom:0;flex:1;min-width:100px;">
                    <label for="sv-prefix-label" style="font-size:0.75rem;">Display Label</label>
                    <input type="text" id="sv-prefix-label" placeholder="e.g. Radio" style="font-size:0.85rem;padding:0.4rem;">
                </div>
                <button class="btn btn-sm btn-primary" id="sv-prefix-add" style="height:32px;">+ Add</button>
            </div>
            <button class="btn btn-sm btn-outline" id="sv-prefix-reset" style="font-size:0.75rem;">↩ Reset to Defaults</button>
        </div>

        <!-- File Integrity -->
        <div class="card no-print">
            <div class="card-header"><h3>🛡️ File Integrity</h3></div>
            <p style="font-size:0.8rem;color:var(--text-secondary);margin-bottom:0.75rem;">
                Verifies that no code files have been modified by a virus or unauthorized person.
                The manifest stores a SHA-256 hash of every file. If anything changes, a warning appears on startup.
            </p>
            <div id="sv-integrity-status" style="font-size:0.85rem;margin-bottom:0.75rem;padding:0.5rem 0.75rem;background:var(--surface-alt);border-radius:var(--radius);border:1px solid var(--border);">
                Checking...
            </div>
            <div style="display:flex;gap:0.5rem;flex-wrap:wrap;">
                <button class="btn btn-primary" id="sv-regen-manifest">🔄 Regenerate Manifest</button>
                <button class="btn btn-outline" id="sv-verify-files">🛡️ Verify Now</button>
            </div>
            <p style="font-size:0.7rem;color:var(--text-muted);margin-top:0.5rem;">
                After updating code files, click "Regenerate Manifest" to accept the new versions as trusted.
            </p>
        </div>

        <!-- Password & Security -->
        <div class="card no-print">
            <div class="card-header"><h3>🔒 Dashboard Password</h3></div>
            <p style="font-size:0.8rem;color:var(--text-secondary);margin-bottom:0.75rem;">
                ${storedHash ? 'Password is set. Enter current password to change it.' : '⚠️ No password set — anyone can access this dashboard. Set one below.'}
            </p>
            ${storedHash ? `
            <div class="form-group">
                <label for="sv-pw-current">Current Password</label>
                <input type="password" id="sv-pw-current" placeholder="Current password" autocomplete="off">
            </div>` : ''}
            <div class="form-row">
                <div class="form-group">
                    <label for="sv-pw-new">New Password</label>
                    <input type="password" id="sv-pw-new" placeholder="New password" autocomplete="off">
                </div>
                <div class="form-group">
                    <label for="sv-pw-confirm">Confirm New Password</label>
                    <input type="password" id="sv-pw-confirm" placeholder="Confirm password" autocomplete="off">
                </div>
            </div>
            <div style="display:flex;gap:0.5rem;flex-wrap:wrap;">
                <button class="btn btn-primary" id="sv-pw-change">🔑 ${storedHash ? 'Change' : 'Set'} Password</button>
                ${storedHash ? '<button class="btn btn-outline" id="sv-pw-remove" style="color:var(--danger);">🗑️ Remove Password</button>' : ''}
            </div>
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

    // ===== Folder Sync controls =====

    // Helper: refresh backup file status display
    async function refreshSyncFileList() {
        const fileListEl = document.getElementById('sv-sync-file-list');
        if (!NetworkSync.hasHandle()) {
            fileListEl.innerHTML = 'Connect a folder to see backup status';
            return;
        }
        try {
            const status = await NetworkSync.getStatus();
            const fmtSlot = (name, s) => {
                if (!s || !s.ok) return `<div>${name}: <span style="color:var(--text-muted);">Not created yet</span></div>`;
                const time = new Date(s.timestamp).toLocaleString();
                return `<div>${name}: <span style="color:var(--success);">●</span> saved ${time}</div>`;
            };
            fileListEl.innerHTML = fmtSlot('Slot A', status.slotA) + fmtSlot('Slot B', status.slotB)
                + `<div style="margin-top:0.2rem;color:var(--text-muted);">Next write → Slot ${status.nextSlot || 'A'}</div>`;
        } catch (e) {
            fileListEl.innerHTML = `<span style="color:var(--danger);">${e.message}</span>`;
        }
    }
    refreshSyncFileList();

    // Choose Folder
    document.getElementById('sv-sync-choose').addEventListener('click', async () => {
        const btn = document.getElementById('sv-sync-choose');
        btn.disabled = true;
        btn.textContent = '⏳ Waiting...';
        const result = await NetworkSync.chooseFolder();
        btn.disabled = false;
        btn.textContent = '📂 Choose Folder';
        if (result.ok) {
            // Save interval setting
            const intervalHours = parseInt(document.getElementById('sv-sync-interval').value);
            const settings = await NetworkSync.getSettings();
            settings.intervalHours = intervalHours;
            await NetworkSync.saveSettings(settings);
            NetworkSync.restart();
            UI.toast(`Connected to folder: ${result.name} — auto-saving every ${intervalHours}h`, 'success');
            UI.navigateTo('supervisor');
        } else if (result.error !== 'Cancelled') {
            UI.toast('Error: ' + result.error, 'error');
        }
    });

    // Interval change
    document.getElementById('sv-sync-interval').addEventListener('change', async () => {
        const intervalHours = parseInt(document.getElementById('sv-sync-interval').value);
        const settings = await NetworkSync.getSettings();
        settings.intervalHours = intervalHours;
        await NetworkSync.saveSettings(settings);
        NetworkSync.restart();
        UI.toast(`Sync interval changed to every ${intervalHours} hours`, 'success');
    });

    // Save Now
    document.getElementById('sv-sync-push').addEventListener('click', async () => {
        const btn = document.getElementById('sv-sync-push');
        btn.disabled = true;
        btn.textContent = '⏳ Saving...';
        const result = await NetworkSync.pushToNetwork();
        if (result.ok) {
            const kb = (result.size / 1024).toFixed(1);
            UI.toast(`Saved to ${result.file} (${kb} KB)`, 'success');
        } else {
            UI.toast('Save failed: ' + result.error, 'error');
        }
        btn.disabled = false;
        btn.textContent = '⬆️ Save Now';
        refreshSyncFileList();
    });

    // Load from Folder
    document.getElementById('sv-sync-pull').addEventListener('click', async () => {
        if (!confirm('This will load the database from the sync folder. Your current data will be merged. Continue?')) return;
        const backup = await NetworkSync.pullFromFolder();
        if (backup && backup.data) {
            const { _sync, ...importData } = backup.data;
            await DB.importAll(importData);
            UI.toast(`Database loaded from ${backup.file} (${new Date(backup.timestamp).toLocaleString()})`, 'success');
            setTimeout(() => UI.navigateTo('supervisor'), 500);
        } else {
            UI.toast('No backup files found in the selected folder', 'error');
        }
    });

    // Disable sync
    const disableBtn = document.getElementById('sv-sync-disable');
    if (disableBtn) {
        disableBtn.addEventListener('click', async () => {
            if (!confirm('Disable folder sync? The backup files will remain in the folder.')) return;
            await NetworkSync.disable();
            UI.toast('Folder sync disabled', 'success');
            UI.navigateTo('supervisor');
        });
    }

    // ===== Asset Prefix Management =====
    document.getElementById('sv-prefix-add').addEventListener('click', async () => {
        const prefix = document.getElementById('sv-prefix-new').value.trim().toUpperCase();
        const category = document.getElementById('sv-prefix-cat').value.trim().toLowerCase();
        const label = document.getElementById('sv-prefix-label').value.trim();

        if (!prefix || !category || !label) {
            UI.toast('Fill in all three fields: Prefix, Category, and Label', 'error');
            return;
        }
        if (!/^[A-Z]+$/.test(prefix)) {
            UI.toast('Prefix must be letters only (A-Z)', 'error');
            return;
        }

        const current = await AssetPrefixes.getAll();
        const duplicate = current.find(p => p.prefix.toUpperCase() === prefix);
        if (duplicate) {
            UI.toast(`Prefix "${prefix}" already exists (→ ${duplicate.category})`, 'error');
            return;
        }

        current.push({ prefix, category, label });
        await AssetPrefixes.save(current);
        UI.toast(`Prefix "${prefix}" → ${category} added`, 'success');
        UI.navigateTo('supervisor');
    });

    document.querySelectorAll('.sv-prefix-del').forEach(btn => {
        btn.addEventListener('click', async () => {
            const idx = parseInt(btn.dataset.idx);
            const current = await AssetPrefixes.getAll();
            const removed = current.splice(idx, 1)[0];
            await AssetPrefixes.save(current);
            UI.toast(`Prefix "${removed.prefix}" removed`, 'success');
            UI.navigateTo('supervisor');
        });
    });

    document.getElementById('sv-prefix-reset').addEventListener('click', async () => {
        if (!confirm('Reset all prefixes to defaults (WV → radio, BAT → battery, T → tool)?')) return;
        await AssetPrefixes.resetToDefaults();
        UI.toast('Prefixes reset to defaults', 'success');
        UI.navigateTo('supervisor');
    });

    // ===== File Integrity =====
    async function refreshIntegrityStatus() {
        const el = document.getElementById('sv-integrity-status');
        const result = await FileIntegrity.verify();
        if (result.noManifest) {
            el.innerHTML = '⚪ No manifest stored yet. Click "Regenerate Manifest" to create one.';
        } else if (result.ok) {
            el.innerHTML = `🟢 <strong>All ${result.storedFileCount} files verified</strong> — no modifications detected.<br><span style="font-size:0.75rem;color:var(--text-muted);">Manifest generated: ${new Date(result.storedTimestamp).toLocaleString()}</span>`;
        } else {
            let msg = `🔴 <strong>INTEGRITY FAILURE</strong>`;
            if (result.mismatched.length > 0) msg += `<br>Modified: <code>${result.mismatched.join('</code>, <code>')}</code>`;
            if (result.missing.length > 0) msg += `<br>Missing: <code>${result.missing.join('</code>, <code>')}</code>`;
            msg += `<br><span style="font-size:0.75rem;color:var(--text-muted);">Manifest generated: ${new Date(result.storedTimestamp).toLocaleString()}</span>`;
            el.innerHTML = msg;
        }
    }
    refreshIntegrityStatus();

    document.getElementById('sv-regen-manifest').addEventListener('click', async () => {
        const btn = document.getElementById('sv-regen-manifest');
        btn.disabled = true;
        btn.textContent = '⏳ Hashing files...';
        const manifest = await FileIntegrity.computeManifest();
        await FileIntegrity.saveManifest(manifest);
        btn.disabled = false;
        btn.textContent = '🔄 Regenerate Manifest';
        UI.toast(`Manifest saved: ${manifest.fileCount} files hashed`, 'success');
        // Remove warning banner if present
        const banner = document.getElementById('integrity-warning');
        if (banner) banner.remove();
        refreshIntegrityStatus();
    });

    document.getElementById('sv-verify-files').addEventListener('click', async () => {
        const btn = document.getElementById('sv-verify-files');
        btn.disabled = true;
        btn.textContent = '⏳ Verifying...';
        await refreshIntegrityStatus();
        btn.disabled = false;
        btn.textContent = '🛡️ Verify Now';
        const result = await FileIntegrity.verify();
        if (result.ok) {
            UI.toast('All files verified — no tampering detected ✅', 'success');
        } else if (result.noManifest) {
            UI.toast('No manifest — generate one first', 'warning');
        } else {
            UI.toast(`WARNING: ${result.mismatched.length} modified, ${result.missing.length} missing`, 'error');
        }
    });

    // ===== Password change/set/remove =====
    document.getElementById('sv-pw-change').addEventListener('click', async () => {
        const newPw = document.getElementById('sv-pw-new').value;
        const confirmPw = document.getElementById('sv-pw-confirm').value;

        if (!newPw) { UI.toast('Enter a new password', 'error'); return; }
        if (newPw !== confirmPw) { UI.toast('Passwords do not match', 'error'); return; }
        if (newPw.length < 3) { UI.toast('Password must be at least 3 characters', 'error'); return; }

        // If changing (not first-time set), verify current password
        if (storedHash) {
            const currentPw = document.getElementById('sv-pw-current').value;
            const currentHash = await _hashPassword(currentPw);
            if (currentHash !== storedHash) {
                UI.toast('Current password is incorrect', 'error');
                return;
            }
        }

        const newHash = await _hashPassword(newPw);
        await DB.setSetting('supervisorPassword', newHash);
        UI.toast('Supervisor password saved', 'success');
        setTimeout(() => UI.navigateTo('supervisor'), 500);
    });

    if (document.getElementById('sv-pw-remove')) {
        document.getElementById('sv-pw-remove').addEventListener('click', async () => {
            const currentPw = document.getElementById('sv-pw-current').value;
            const currentHash = await _hashPassword(currentPw);
            if (currentHash !== storedHash) {
                UI.toast('Enter current password to remove it', 'error');
                return;
            }
            await DB.setSetting('supervisorPassword', null);
            _supervisorUnlocked = true;
            UI.toast('Password removed — dashboard is now open to everyone', 'success');
            setTimeout(() => UI.navigateTo('supervisor'), 500);
        });
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
