/**
 * Home Page - Dashboard overview with quick action buttons
 */
UI.registerPage('home', async (container) => {
    container.innerHTML = `
        <h2 class="page-title">Dashboard</h2>
        <div class="home-grid">
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
