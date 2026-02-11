/**
 * Battery Dashboard Page - Lifecycle analytics and monitoring
 */
UI.registerPage('battery-dashboard', async (container) => {
    const stats = await Models.getBatteryStats();
    const batteries = await DB.getAll('batteries');

    container.innerHTML = `
        <h2 class="page-title">🔋 Battery Dashboard</h2>

        <div class="stats-row">
            <div class="stat-card success">
                <div class="stat-value">${stats.inService}</div>
                <div class="stat-label">In Service</div>
            </div>
            <div class="stat-card info">
                <div class="stat-value">${stats.inInventory}</div>
                <div class="stat-label">In Inventory</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${stats.retired}</div>
                <div class="stat-label">Retired / Failed</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${stats.total}</div>
                <div class="stat-label">Total</div>
            </div>
        </div>

        <div class="stats-row">
            <div class="stat-card info">
                <div class="stat-value">${stats.avgLifespan} days</div>
                <div class="stat-label">Avg Lifespan (Retired)</div>
            </div>
            <div class="stat-card success">
                <div class="stat-value">${stats.longestLifespan} days</div>
                <div class="stat-label">Longest Lifespan</div>
            </div>
            <div class="stat-card warning">
                <div class="stat-value">${stats.shortestLifespan} days</div>
                <div class="stat-label">Shortest Lifespan</div>
            </div>
        </div>

        <div id="bd-settings" class="card" style="margin-bottom:1rem;">
            <div class="card-header">
                <h3>Settings</h3>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label for="bd-threshold">Service Day Threshold (days)</label>
                    <div class="scan-input-group">
                        <input type="number" id="bd-threshold" value="${stats.threshold}" min="1">
                        <button class="btn btn-primary" id="bd-save-threshold">Save</button>
                    </div>
                </div>
            </div>
        </div>

        ${stats.overThreshold > 0 ? `
            <div class="alert alert-warning">
                ⚠️ <strong>${stats.overThreshold}</strong> battery(ies) have exceeded the ${stats.threshold}-day service threshold
            </div>
        ` : ''}

        ${stats.nearingEnd > 0 ? `
            <div class="alert alert-info">
                ℹ️ <strong>${stats.nearingEnd}</strong> battery(ies) are nearing expected lifespan (85%+ of threshold)
            </div>
        ` : ''}

        <div id="bd-over-threshold"></div>
        <div id="bd-all-batteries"></div>
    `;

    // Save threshold
    document.getElementById('bd-save-threshold').addEventListener('click', async () => {
        const val = parseInt(document.getElementById('bd-threshold').value);
        if (val > 0) {
            await DB.setSetting('batteryServiceDayThreshold', val);
            UI.toast('Threshold updated', 'success');
            UI.navigateTo('battery-dashboard');
        }
    });

    // Over-threshold batteries
    if (stats.overThresholdList.length > 0) {
        const rows = stats.overThresholdList.map(b => `
            <tr>
                <td><strong>${b.id}</strong></td>
                <td>${b.model || '—'}</td>
                <td>${b.type === 'legacy' ? 'Legacy' : 'New'}</td>
                <td>${Models.getBatteryDaysInService(b)} days</td>
                <td>${b.inServiceDate ? UI.formatDate(b.inServiceDate) : 'Unknown'}</td>
                <td>${UI.statusBadge('Overdue')}</td>
            </tr>
        `).join('');

        document.getElementById('bd-over-threshold').innerHTML = `
            <div class="card">
                <div class="card-header">
                    <h3>⚠️ Batteries Over ${stats.threshold}-Day Threshold</h3>
                </div>
                <div class="table-wrapper">
                    <table>
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Model</th>
                                <th>Type</th>
                                <th>Days Active</th>
                                <th>In Service Since</th>
                                <th>Alert</th>
                            </tr>
                        </thead>
                        <tbody>${rows}</tbody>
                    </table>
                </div>
            </div>
        `;
    }

    // All batteries table
    const inService = batteries.filter(b => b.status === 'In Service')
        .sort((a, b) => Models.getBatteryDaysInService(b) - Models.getBatteryDaysInService(a));

    if (inService.length > 0) {
        const rows = inService.map(b => {
            const days = Models.getBatteryDaysInService(b);
            const pct = Math.round((days / stats.threshold) * 100);
            const barColor = pct >= 100 ? 'var(--danger)' : pct >= 85 ? 'var(--warning)' : 'var(--success)';
            return `
                <tr>
                    <td><strong>${b.id}</strong></td>
                    <td>${b.model || '—'}</td>
                    <td>${b.type === 'legacy' ? 'Legacy' : 'New'}</td>
                    <td>${days} days</td>
                    <td>
                        <div style="background:var(--gray-200); border-radius:4px; height:8px; width:100px; display:inline-block; vertical-align:middle;">
                            <div style="background:${barColor}; border-radius:4px; height:8px; width:${Math.min(pct, 100)}%;"></div>
                        </div>
                        <small>${pct}%</small>
                    </td>
                    <td>${b.estimatedAge || '—'}</td>
                </tr>
            `;
        }).join('');

        document.getElementById('bd-all-batteries').innerHTML = `
            <div class="card">
                <div class="card-header">
                    <h3>All In-Service Batteries</h3>
                </div>
                <div class="table-wrapper">
                    <table>
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Model</th>
                                <th>Type</th>
                                <th>Days Active</th>
                                <th>Lifespan Usage</th>
                                <th>Est. Age</th>
                            </tr>
                        </thead>
                        <tbody>${rows}</tbody>
                    </table>
                </div>
            </div>
        `;
    } else {
        document.getElementById('bd-all-batteries').innerHTML = `
            <div class="card">
                <div class="empty-state">
                    <div class="icon">🔋</div>
                    <p>No batteries currently in service</p>
                </div>
            </div>
        `;
    }
});
