/**
 * Supervisor Dashboard - Overview of all alerts, overdue radios, flagged items
 */
UI.registerPage('supervisor', async (container) => {
    const radioStats = await Models.getRadioStats();
    const batteryStats = await Models.getBatteryStats();
    const transactions = await DB.getAll('transactions');
    const radios = await DB.getAll('radios');
    const auditLog = await DB.getAll('auditLog');

    container.innerHTML = `
        <h2 class="page-title">📊 Supervisor Dashboard</h2>

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
            <div class="card-header"><h3>Settings</h3></div>
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

        <div id="sv-overdue"></div>
        <div id="sv-maintenance"></div>
        <div id="sv-high-repair"></div>
        <div id="sv-checked-out"></div>
        <div id="sv-flagged"></div>
        <div id="sv-audit"></div>
    `;

    // Save overdue threshold
    document.getElementById('sv-save-hours').addEventListener('click', async () => {
        const val = parseInt(document.getElementById('sv-overdue-hours').value);
        if (val > 0) {
            await DB.setSetting('overdueHoursThreshold', val);
            UI.toast('Overdue threshold updated', 'success');
            UI.navigateTo('supervisor');
        }
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
