/**
 * Home Page - Dashboard overview with quick action buttons and radio fleet strip
 */
UI.registerPage('home', async (container) => {
    container.innerHTML = `
        <div class="home-grid">
            <button class="home-btn primary-action" data-nav="clerk-station" style="grid-column: span 2;">
                <span class="icon">🖥️</span>
                Clerk Station
            </button>
            <button class="home-btn primary-action" data-nav="quick-scan">
                <span class="icon">⚡</span>
                Quick Scan (Self-Service)
            </button>
            <button class="home-btn primary-action" data-nav="checkout">
                <span class="icon">📤</span>
                Check Out Radio
            </button>
            <button class="home-btn primary-action" data-nav="return">
                <span class="icon">📥</span>
                Return Radio
            </button>
            <button class="home-btn" data-nav="assets">
                <span class="icon">📦</span>
                Add / Manage Assets
            </button>
            <button class="home-btn" data-nav="battery-dashboard">
                <span class="icon">🔋</span>
                Battery Dashboard
            </button>
            <button class="home-btn" data-nav="supervisor">
                <span class="icon">📊</span>
                Supervisor Dashboard
            </button>
            <button class="home-btn" data-nav="print-codes">
                <span class="icon">🏷️</span>
                Print Codes
            </button>
            <button class="home-btn" data-nav="export">
                <span class="icon">💾</span>
                Export Data
            </button>
        </div>

        <div id="home-stats-radios"></div>
        <div id="home-alerts"></div>
        <div id="home-radio-fleet"></div>
        <div id="home-recent"></div>
    `;

    // Wire up nav buttons
    container.querySelectorAll('.home-btn[data-nav]').forEach(btn => {
        btn.addEventListener('click', () => UI.navigateTo(btn.dataset.nav));
    });

    // Load stats
    try {
        const radioStats = await Models.getRadioStats();
        const batteryStats = await Models.getBatteryStats();

        document.getElementById('home-stats-radios').innerHTML = `
            <h3 class="page-subtitle">Radio Overview</h3>
            <div class="stats-row">
                <div class="stat-card success">
                    <div class="stat-value">${radioStats.available}</div>
                    <div class="stat-label">Available</div>
                </div>
                <div class="stat-card warning">
                    <div class="stat-value">${radioStats.checkedOut}</div>
                    <div class="stat-label">Checked Out</div>
                </div>
                <div class="stat-card info">
                    <div class="stat-value">${radioStats.maintenance}</div>
                    <div class="stat-label">In Maintenance</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${radioStats.total}</div>
                    <div class="stat-label">Total Radios</div>
                </div>
                <div class="stat-card danger">
                    <div class="stat-value">${radioStats.overdue}</div>
                    <div class="stat-label">Overdue (${radioStats.overdueHours}h+)</div>
                </div>
            </div>

            <h3 class="page-subtitle">Battery Overview</h3>
            <div class="stats-row">
                <div class="stat-card success">
                    <div class="stat-value">${batteryStats.inService}</div>
                    <div class="stat-label">In Service</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${batteryStats.inInventory}</div>
                    <div class="stat-label">In Inventory</div>
                </div>
                <div class="stat-card warning">
                    <div class="stat-value">${batteryStats.overThreshold}</div>
                    <div class="stat-label">Over ${batteryStats.threshold} Days</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${batteryStats.total}</div>
                    <div class="stat-label">Total Batteries</div>
                </div>
            </div>
        `;

        // Alerts
        const alerts = [];
        if (radioStats.overdue > 0) {
            alerts.push(`<div class="alert alert-danger">⚠️ ${radioStats.overdue} radio(s) overdue (checked out over ${radioStats.overdueHours} hours)</div>`);
        }
        if (radioStats.highRepair > 0) {
            alerts.push(`<div class="alert alert-warning">🔧 ${radioStats.highRepair} radio(s) with high repair frequency (3+ repairs)</div>`);
        }
        if (batteryStats.overThreshold > 0) {
            alerts.push(`<div class="alert alert-warning">🔋 ${batteryStats.overThreshold} battery(ies) over ${batteryStats.threshold}-day service threshold</div>`);
        }
        if (alerts.length > 0) {
            document.getElementById('home-alerts').innerHTML = `<h3 class="page-subtitle">Alerts</h3>` + alerts.join('');
        }

        // Radio Fleet Visual Strip
        await renderRadioFleetStrip();

        // Recent transactions
        const transactions = await DB.getAll('transactions');
        const recent = transactions.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 8);

        if (recent.length > 0) {
            let rows = recent.map(t => `
                <tr>
                    <td>${UI.formatDateTime(t.timestamp)}</td>
                    <td><strong>${t.assetId}</strong></td>
                    <td>${t.type === 'checkout' ? '📤 Checkout' : '📥 Return'}</td>
                    <td>${t.technicianName || t.technicianId || '—'}</td>
                    <td>${t.clerkName || '—'}</td>
                    <td>${t.condition ? UI.statusBadge(t.condition) : '—'}</td>
                </tr>
            `).join('');

            document.getElementById('home-recent').innerHTML = `
                <h3 class="page-subtitle">Recent Activity</h3>
                <div class="card">
                    <div class="table-wrapper">
                        <table>
                            <thead>
                                <tr>
                                    <th>Time</th>
                                    <th>Asset</th>
                                    <th>Action</th>
                                    <th>Technician</th>
                                    <th>Clerk</th>
                                    <th>Condition</th>
                                </tr>
                            </thead>
                            <tbody>${rows}</tbody>
                        </table>
                    </div>
                </div>
            `;
        }
    } catch (e) {
        console.error('Home stats error:', e);
    }
});

async function renderRadioFleetStrip() {
    const radios = await DB.getAll('radios');
    if (radios.length === 0) {
        document.getElementById('home-radio-fleet').innerHTML = '';
        return;
    }

    const transactions = await DB.getAll('transactions');
    const technicians = await DB.getAll('technicians');
    const overdueHours = await DB.getSetting('overdueHoursThreshold', 15);

    // Build tech lookup by badgeId
    const techLookup = {};
    for (const t of technicians) {
        techLookup[t.badgeId || t.id] = t;
    }

    // Build lookup: radioId -> checkout details
    const radioCheckoutInfo = {};
    for (const radio of radios) {
        if (radio.status === 'Checked Out') {
            const lastCheckout = transactions
                .filter(t => t.assetId === radio.id && t.type === 'checkout')
                .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];
            if (lastCheckout) {
                const tech = techLookup[lastCheckout.technicianId];
                const techName = tech ? (tech.name || tech.badgeId) : (lastCheckout.technicianName || lastCheckout.technicianId || '?');
                const hoursOut = (Date.now() - new Date(lastCheckout.timestamp).getTime()) / (1000 * 60 * 60);
                radioCheckoutInfo[radio.id] = {
                    techName,
                    techBadge: lastCheckout.technicianId || '',
                    clerk: lastCheckout.clerkName || '',
                    checkoutTime: lastCheckout.timestamp,
                    hoursOut: Math.round(hoursOut * 10) / 10,
                    isOverdue: hoursOut > overdueHours
                };
            }
        }
    }

    // Sort: overdue first, then checked out, then available, then others
    const sorted = [...radios].sort((a, b) => {
        const aInfo = radioCheckoutInfo[a.id];
        const bInfo = radioCheckoutInfo[b.id];
        const aOverdue = aInfo && aInfo.isOverdue ? -1 : 0;
        const bOverdue = bInfo && bInfo.isOverdue ? -1 : 0;
        if (aOverdue !== bOverdue) return aOverdue - bOverdue;
        const statusOrder = { 'Checked Out': 0, 'Available': 1, 'Maintenance': 2, 'Retired': 3, 'Lost': 4 };
        return (statusOrder[a.status] ?? 5) - (statusOrder[b.status] ?? 5);
    });

    const cards = sorted.map(r => {
        const isOut = r.status === 'Checked Out';
        const isMaint = r.status === 'Maintenance';
        const isRetired = r.status === 'Retired' || r.status === 'Lost';
        const info = radioCheckoutInfo[r.id];

        let statusClass = 'fleet-available';
        if (isOut && info && info.isOverdue) statusClass = 'fleet-overdue';
        else if (isOut) statusClass = 'fleet-checked-out';
        else if (isMaint) statusClass = 'fleet-maintenance';
        else if (isRetired) statusClass = 'fleet-retired';

        // Short display name for the card face
        let shortName = '';
        if (isOut && info) {
            const parts = info.techName.split(' ');
            shortName = parts.length > 1
                ? parts[0][0] + '.' + parts[parts.length - 1]
                : info.techName;
            if (shortName.length > 10) shortName = shortName.substring(0, 9) + '…';
        }

        // Build tooltip content
        let tooltipLines = [`<strong>${r.id}</strong>`];
        if (r.model) tooltipLines.push(`Model: ${r.model}`);
        if (r.serialNumber) tooltipLines.push(`S/N: ${r.serialNumber}`);
        tooltipLines.push(`Status: ${r.status}`);
        if (isOut && info) {
            tooltipLines.push(`Tech: ${info.techName}`);
            if (info.techBadge && info.techBadge !== info.techName) tooltipLines.push(`Badge: ${info.techBadge}`);
            tooltipLines.push(`Clerk: ${info.clerk}`);
            tooltipLines.push(`Out: ${UI.formatDateTime(info.checkoutTime)}`);
            tooltipLines.push(`Hours: ${info.hoursOut}h${info.isOverdue ? ' ⚠️ OVERDUE' : ''}`);
        }
        if (isMaint && r.maintenanceHistory && r.maintenanceHistory.length > 0) {
            const last = r.maintenanceHistory[r.maintenanceHistory.length - 1];
            tooltipLines.push(`Reason: ${last.reason}`);
        }
        if (r.checkoutCount) tooltipLines.push(`Total checkouts: ${r.checkoutCount}`);
        const tooltip = tooltipLines.join('<br>');

        return `
            <div class="fleet-card ${statusClass}">
                <div class="fleet-tooltip">${tooltip}</div>
                <div class="fleet-icon">📻</div>
                <div class="fleet-label">${r.id}</div>
                ${isOut ? `<div class="fleet-assignee">${shortName}</div>` : `<div class="fleet-status">${r.status}</div>`}
            </div>
        `;
    }).join('');

    document.getElementById('home-radio-fleet').innerHTML = `
        <h3 class="page-subtitle">Radio Fleet <span style="font-size:0.75rem; font-weight:400; color:var(--text-muted);">(${radios.length} radios — hover for details)</span></h3>
        <div style="display:flex;gap:0.75rem;flex-wrap:wrap;margin-bottom:0.4rem;font-size:0.65rem;font-weight:600;color:var(--text-muted);">
            <span style="display:flex;align-items:center;gap:0.25rem;"><span style="width:10px;height:10px;border-radius:2px;background:var(--success-light);border:2px solid var(--success);display:inline-block;"></span> Available</span>
            <span style="display:flex;align-items:center;gap:0.25rem;"><span style="width:10px;height:10px;border-radius:2px;background:var(--warning-light);border:2px solid var(--warning);display:inline-block;"></span> Checked Out</span>
            <span style="display:flex;align-items:center;gap:0.25rem;"><span style="width:10px;height:10px;border-radius:2px;background:var(--danger-light);border:2px solid var(--danger);display:inline-block;"></span> Overdue</span>
            <span style="display:flex;align-items:center;gap:0.25rem;"><span style="width:10px;height:10px;border-radius:2px;background:var(--info-light);border:2px solid var(--info);display:inline-block;"></span> Maintenance</span>
            <span style="display:flex;align-items:center;gap:0.25rem;"><span style="width:10px;height:10px;border-radius:2px;background:var(--gray-100);border:2px solid var(--gray-300);display:inline-block;opacity:0.5;"></span> Retired / Lost</span>
        </div>
        <div class="fleet-strip">${cards}</div>
    `;
}
