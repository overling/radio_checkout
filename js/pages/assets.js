/**
 * Asset Management Page - Add/Edit Radios, Batteries, Tools
 */
UI.registerPage('assets', async (container) => {
    container.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:0.5rem;margin-bottom:0.25rem;">
            <h2 class="page-title" style="margin-bottom:0;">📦 Asset Management</h2>
            <div style="display:flex;gap:0.5rem;">
                <button class="btn btn-outline" id="goto-print-codes">🏷️ Print Codes</button>
                <button class="btn btn-outline" id="goto-export">💾 Export</button>
            </div>
        </div>
        <div class="tabs">
            <button class="tab-btn active" data-tab="radios-tab">Radios</button>
            <button class="tab-btn" data-tab="batteries-tab">Batteries</button>
            <button class="tab-btn" data-tab="tools-tab">Tools</button>
            <button class="tab-btn" data-tab="technicians-tab">Technicians</button>
        </div>

        <div id="radios-tab" class="tab-content active"></div>
        <div id="batteries-tab" class="tab-content"></div>
        <div id="tools-tab" class="tab-content"></div>
        <div id="technicians-tab" class="tab-content"></div>
    `;

    // Tab switching
    container.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            container.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            container.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById(btn.dataset.tab).classList.add('active');
        });
    });

    // Shortcut navigation buttons
    document.getElementById('goto-print-codes').addEventListener('click', () => UI.navigateTo('print-codes'));
    document.getElementById('goto-export').addEventListener('click', () => UI.navigateTo('export'));

    await renderRadiosTab();
    await renderBatteriesTab();
    await renderToolsTab();
    await renderTechniciansTab();
});

async function renderRadiosTab() {
    const radios = await DB.getAll('radios');
    const tab = document.getElementById('radios-tab');

    tab.innerHTML = `
        <div class="filter-bar">
            <input type="text" id="radio-search" placeholder="Search radios...">
            <select id="radio-status-filter">
                <option value="">All Statuses</option>
                <option value="Available">Available</option>
                <option value="Checked Out">Checked Out</option>
                <option value="Maintenance">Maintenance</option>
                <option value="Retired">Retired</option>
                <option value="Lost">Lost</option>
            </select>
            <button class="btn btn-primary" id="add-radio-btn">+ Add Radio</button>
        </div>
        <div class="table-wrapper">
            <table>
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Serial #</th>
                        <th>Model</th>
                        <th>Status</th>
                        <th>In Service</th>
                        <th>Checkouts</th>
                        <th>Repairs</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody id="radios-tbody"></tbody>
            </table>
        </div>
    `;

    function renderRows(filter = '', statusFilter = '') {
        const filtered = radios.filter(r => {
            const matchText = !filter ||
                r.id.toLowerCase().includes(filter) ||
                (r.serialNumber || '').toLowerCase().includes(filter) ||
                (r.model || '').toLowerCase().includes(filter);
            const matchStatus = !statusFilter || r.status === statusFilter;
            return matchText && matchStatus;
        });

        document.getElementById('radios-tbody').innerHTML = filtered.length === 0
            ? '<tr><td colspan="8" class="empty-state">No radios found</td></tr>'
            : filtered.map(r => `
                <tr>
                    <td><strong>${r.id}</strong></td>
                    <td>${r.serialNumber || '—'}</td>
                    <td>${r.model || '—'}</td>
                    <td>${UI.statusBadge(r.status)}</td>
                    <td>${UI.formatDate(r.inServiceDate)}</td>
                    <td>${r.checkoutCount || 0}</td>
                    <td>${r.repairCount || 0}</td>
                    <td>
                        <div class="btn-group">
                            <button class="btn btn-sm btn-outline edit-radio" data-id="${r.id}">Edit</button>
                            <button class="btn btn-sm btn-outline status-radio" data-id="${r.id}">Status</button>
                            <button class="btn btn-sm btn-outline history-radio" data-id="${r.id}">History</button>
                        </div>
                    </td>
                </tr>
            `).join('');

        // Wire edit buttons
        document.querySelectorAll('.edit-radio').forEach(btn => {
            btn.addEventListener('click', () => showEditRadioModal(btn.dataset.id));
        });
        document.querySelectorAll('.status-radio').forEach(btn => {
            btn.addEventListener('click', () => showStatusChangeModal('radio', btn.dataset.id));
        });
        document.querySelectorAll('.history-radio').forEach(btn => {
            btn.addEventListener('click', () => showAssetHistory('radio', btn.dataset.id));
        });
    }

    renderRows();

    document.getElementById('radio-search').addEventListener('input', UI.debounce((e) => {
        renderRows(e.target.value.toLowerCase(), document.getElementById('radio-status-filter').value);
    }));
    document.getElementById('radio-status-filter').addEventListener('change', (e) => {
        renderRows(document.getElementById('radio-search').value.toLowerCase(), e.target.value);
    });

    document.getElementById('add-radio-btn').addEventListener('click', () => showAddRadioModal());
}

function showAddRadioModal() {
    UI.showModal('Add Radio', `
        <div class="card" style="padding:0.75rem 1rem; margin-bottom:1rem; background:var(--primary-light);">
            <div style="font-weight:600; font-size:0.9rem; margin-bottom:0.5rem;">📋 Quick Label Generator</div>
            <div style="font-size:0.8rem; color:var(--text-muted); margin-bottom:0.5rem;">
                Format: <code>[LOCATION]_[DEPT]_[NUMBER]</code> — e.g. WV_MAINT_01
            </div>
            <div style="display:flex; gap:0.5rem; align-items:end; flex-wrap:wrap;">
                <div class="form-group" style="margin-bottom:0; flex:1; min-width:100px;">
                    <label for="ar-loc" style="font-size:0.75rem;">Location</label>
                    <input type="text" id="ar-loc" placeholder="WV" style="text-transform:uppercase; font-size:0.85rem; padding:0.4rem;">
                </div>
                <div class="form-group" style="margin-bottom:0; flex:1; min-width:100px;">
                    <label for="ar-dept" style="font-size:0.75rem;">Department</label>
                    <input type="text" id="ar-dept" placeholder="MAINT" style="text-transform:uppercase; font-size:0.85rem; padding:0.4rem;">
                </div>
                <div class="form-group" style="margin-bottom:0; width:70px;">
                    <label for="ar-num" style="font-size:0.75rem;">Number</label>
                    <input type="text" id="ar-num" placeholder="01" style="font-size:0.85rem; padding:0.4rem;">
                </div>
                <button class="btn btn-sm btn-primary" id="ar-gen-btn" style="height:32px;">Generate</button>
            </div>
        </div>
        <div class="form-group">
            <label for="ar-id">Radio ID *</label>
            <input type="text" id="ar-id" placeholder="e.g. WV_MAINT_01 or R-001" required>
        </div>
        <div class="form-row">
            <div class="form-group">
                <label for="ar-serial">Serial Number</label>
                <input type="text" id="ar-serial" placeholder="Serial number">
            </div>
            <div class="form-group">
                <label for="ar-model">Model</label>
                <input type="text" id="ar-model" placeholder="e.g. XPR 7550e">
            </div>
        </div>
        <div class="form-group">
            <label for="ar-date">In-Service Date</label>
            <input type="date" id="ar-date" value="${new Date().toISOString().split('T')[0]}">
        </div>
        <div class="form-group">
            <label for="ar-notes">Notes</label>
            <textarea id="ar-notes" rows="2"></textarea>
        </div>
    `, `
        <button class="btn btn-outline" onclick="UI.closeModal()">Cancel</button>
        <button class="btn btn-primary" id="ar-save-btn">Save Radio</button>
    `);

    // Label generator
    document.getElementById('ar-gen-btn').addEventListener('click', () => {
        const loc = document.getElementById('ar-loc').value.trim().toUpperCase();
        const dept = document.getElementById('ar-dept').value.trim().toUpperCase();
        const num = document.getElementById('ar-num').value.trim().padStart(2, '0');
        if (!loc || !dept || !num) {
            UI.toast('Fill in Location, Department, and Number', 'warning');
            return;
        }
        const label = `${loc}_${dept}_${num}`;
        document.getElementById('ar-id').value = label;
        UI.toast(`Label generated: ${label}`, 'info');
    });

    document.getElementById('ar-save-btn').addEventListener('click', async () => {
        const id = document.getElementById('ar-id').value.trim();
        if (!id) { UI.toast('Radio ID is required', 'error'); return; }

        const existing = await DB.get('radios', id);
        if (existing) { UI.toast('A radio with this ID already exists', 'error'); return; }

        const radio = Models.createRadio({
            uniqueId: id,
            serialNumber: document.getElementById('ar-serial').value.trim(),
            model: document.getElementById('ar-model').value.trim(),
            inServiceDate: document.getElementById('ar-date').value || new Date().toISOString(),
            notes: document.getElementById('ar-notes').value.trim()
        });

        await DB.put('radios', radio);
        await DB.put('auditLog', Models.createAuditEntry({
            entityId: id, entityType: 'radio', action: 'created',
            details: `Radio added: ${radio.model || 'N/A'}`, performedBy: UI.getClerkName()
        }));

        UI.closeModal();
        UI.toast('Radio added successfully', 'success');
        // Offer to print label for the new radio
        if (window.confirm(`Radio "${id}" added.\n\nGo to Print Codes to print a label for it?`)) {
            UI.navigateTo('print-codes');
        } else {
            UI.navigateTo('assets');
        }
    });
}

function showEditRadioModal(radioId) {
    DB.get('radios', radioId).then(radio => {
        if (!radio) return;
        UI.showModal('Edit Radio: ' + radioId, `
            <div class="form-group">
                <label>Radio ID</label>
                <input type="text" value="${radio.id}" disabled>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label for="er-serial">Serial Number</label>
                    <input type="text" id="er-serial" value="${radio.serialNumber || ''}">
                </div>
                <div class="form-group">
                    <label for="er-model">Model</label>
                    <input type="text" id="er-model" value="${radio.model || ''}">
                </div>
            </div>
            <div class="form-group">
                <label for="er-date">In-Service Date</label>
                <input type="date" id="er-date" value="${radio.inServiceDate ? radio.inServiceDate.split('T')[0] : ''}">
            </div>
            <div class="form-group">
                <label for="er-notes">Notes</label>
                <textarea id="er-notes" rows="2">${radio.notes || ''}</textarea>
            </div>
        `, `
            <button class="btn btn-outline" onclick="UI.closeModal()">Cancel</button>
            <button class="btn btn-primary" id="er-save-btn">Save Changes</button>
        `);

        document.getElementById('er-save-btn').addEventListener('click', async () => {
            radio.serialNumber = document.getElementById('er-serial').value.trim();
            radio.model = document.getElementById('er-model').value.trim();
            radio.inServiceDate = document.getElementById('er-date').value || radio.inServiceDate;
            radio.notes = document.getElementById('er-notes').value.trim();
            radio.updatedAt = Models.now();

            await DB.put('radios', radio);
            await DB.put('auditLog', Models.createAuditEntry({
                entityId: radioId, entityType: 'radio', action: 'updated',
                details: 'Radio details updated', performedBy: UI.getClerkName()
            }));

            UI.closeModal();
            UI.toast('Radio updated', 'success');
            UI.navigateTo('assets');
        });
    });
}

function showStatusChangeModal(assetType, assetId) {
    const statuses = assetType === 'radio'
        ? ['Available', 'Maintenance', 'Retired', 'Lost']
        : assetType === 'battery'
        ? ['In Inventory', 'In Service', 'Retired', 'Failed']
        : ['Available', 'Maintenance', 'Retired', 'Lost'];

    UI.showModal(`Change Status: ${assetId}`, `
        <div class="form-group">
            <label for="sc-status">New Status</label>
            <select id="sc-status">
                ${statuses.map(s => `<option value="${s}">${s}</option>`).join('')}
            </select>
        </div>
        <div class="form-group">
            <label for="sc-reason">Reason *</label>
            <textarea id="sc-reason" rows="2" placeholder="Reason for status change..." required></textarea>
        </div>
    `, `
        <button class="btn btn-outline" onclick="UI.closeModal()">Cancel</button>
        <button class="btn btn-primary" id="sc-save-btn">Update Status</button>
    `);

    document.getElementById('sc-save-btn').addEventListener('click', async () => {
        const newStatus = document.getElementById('sc-status').value;
        const reason = document.getElementById('sc-reason').value.trim();
        if (!reason) { UI.toast('Reason is required', 'error'); return; }

        try {
            await Models.changeAssetStatus(assetType, assetId, newStatus, reason, UI.getClerkName());
            UI.closeModal();
            UI.toast(`Status changed to ${newStatus}`, 'success');
            UI.navigateTo('assets');
        } catch (err) {
            UI.toast(err.message, 'error');
        }
    });
}

async function showAssetHistory(assetType, assetId) {
    const logs = await DB.getAll('auditLog');
    const history = logs
        .filter(l => l.entityId === assetId && l.entityType === assetType)
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    const html = history.length === 0
        ? '<p class="empty-state">No history found</p>'
        : history.map(l => `
            <div class="audit-entry">
                <span class="audit-time">${UI.formatDateTime(l.timestamp)}</span><br>
                <span class="audit-action">${l.action}</span>: ${l.details || ''}
                ${l.performedBy ? `<br><small>By: ${l.performedBy}</small>` : ''}
            </div>
        `).join('');

    UI.showModal(`History: ${assetId}`, html, `
        <button class="btn btn-outline" onclick="UI.closeModal()">Close</button>
    `);
}

// ===== BATTERIES TAB =====
async function renderBatteriesTab() {
    const batteries = await DB.getAll('batteries');
    const tab = document.getElementById('batteries-tab');

    tab.innerHTML = `
        <div class="filter-bar">
            <input type="text" id="battery-search" placeholder="Search batteries...">
            <select id="battery-status-filter">
                <option value="">All Statuses</option>
                <option value="In Inventory">In Inventory</option>
                <option value="In Service">In Service</option>
                <option value="Retired">Retired</option>
                <option value="Failed">Failed</option>
            </select>
            <button class="btn btn-primary" id="add-battery-btn">+ Add Battery</button>
        </div>
        <div class="table-wrapper">
            <table>
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Model</th>
                        <th>Type</th>
                        <th>Status</th>
                        <th>In Service</th>
                        <th>Days Active</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody id="batteries-tbody"></tbody>
            </table>
        </div>
    `;

    function renderRows(filter = '', statusFilter = '') {
        const filtered = batteries.filter(b => {
            const matchText = !filter ||
                b.id.toLowerCase().includes(filter) ||
                (b.model || '').toLowerCase().includes(filter);
            const matchStatus = !statusFilter || b.status === statusFilter;
            return matchText && matchStatus;
        });

        document.getElementById('batteries-tbody').innerHTML = filtered.length === 0
            ? '<tr><td colspan="7" class="empty-state">No batteries found</td></tr>'
            : filtered.map(b => {
                const days = (b.status === 'In Service' || b.status === 'Retired' || b.status === 'Failed')
                    ? Models.getBatteryDaysInService(b) : '—';
                return `
                    <tr>
                        <td><strong>${b.id}</strong></td>
                        <td>${b.model || '—'}</td>
                        <td>${b.type === 'legacy' ? 'Legacy' : 'New'}</td>
                        <td>${UI.statusBadge(b.status)}</td>
                        <td>${b.inServiceDate ? UI.formatDate(b.inServiceDate) : (b.type === 'legacy' ? 'Unknown' : '—')}</td>
                        <td>${days}</td>
                        <td>
                            <div class="btn-group">
                                <button class="btn btn-sm btn-outline edit-battery" data-id="${b.id}">Edit</button>
                                <button class="btn btn-sm btn-outline status-battery" data-id="${b.id}">Status</button>
                                <button class="btn btn-sm btn-outline history-battery" data-id="${b.id}">History</button>
                            </div>
                        </td>
                    </tr>
                `;
            }).join('');

        document.querySelectorAll('.edit-battery').forEach(btn => {
            btn.addEventListener('click', () => showEditBatteryModal(btn.dataset.id));
        });
        document.querySelectorAll('.status-battery').forEach(btn => {
            btn.addEventListener('click', () => showStatusChangeModal('battery', btn.dataset.id));
        });
        document.querySelectorAll('.history-battery').forEach(btn => {
            btn.addEventListener('click', () => showAssetHistory('battery', btn.dataset.id));
        });
    }

    renderRows();

    document.getElementById('battery-search').addEventListener('input', UI.debounce((e) => {
        renderRows(e.target.value.toLowerCase(), document.getElementById('battery-status-filter').value);
    }));
    document.getElementById('battery-status-filter').addEventListener('change', (e) => {
        renderRows(document.getElementById('battery-search').value.toLowerCase(), e.target.value);
    });

    document.getElementById('add-battery-btn').addEventListener('click', () => showAddBatteryModal());
}

function showAddBatteryModal() {
    UI.showModal('Add Battery', `
        <div class="form-group">
            <label for="ab-type">Battery Type</label>
            <select id="ab-type">
                <option value="new">New Battery</option>
                <option value="legacy">Legacy Battery (Unknown Age)</option>
            </select>
        </div>
        <div class="form-group">
            <label for="ab-id">Battery ID *</label>
            <input type="text" id="ab-id" placeholder="e.g. BAT-001" required>
        </div>
        <div class="form-group">
            <label for="ab-model">Model</label>
            <input type="text" id="ab-model" placeholder="e.g. PMNN4544">
        </div>
        <div id="ab-new-fields">
            <div class="form-row">
                <div class="form-group">
                    <label for="ab-received">Date Received</label>
                    <input type="date" id="ab-received" value="${new Date().toISOString().split('T')[0]}">
                </div>
                <div class="form-group">
                    <label for="ab-inservice">Date In Service</label>
                    <input type="date" id="ab-inservice">
                </div>
            </div>
        </div>
        <div id="ab-legacy-fields" style="display:none;">
            <div class="form-group">
                <label for="ab-age">Estimated Age</label>
                <select id="ab-age">
                    <option value="">Unknown</option>
                    <option value="<6mo">Less than 6 months</option>
                    <option value="6-12mo">6–12 months</option>
                    <option value="1-2yr">1–2 years</option>
                    <option value="2+yr">2+ years</option>
                </select>
            </div>
        </div>
        <div class="form-group">
            <label for="ab-notes">Notes</label>
            <textarea id="ab-notes" rows="2"></textarea>
        </div>
    `, `
        <button class="btn btn-outline" onclick="UI.closeModal()">Cancel</button>
        <button class="btn btn-primary" id="ab-save-btn">Save Battery</button>
    `);

    document.getElementById('ab-type').addEventListener('change', (e) => {
        const isLegacy = e.target.value === 'legacy';
        document.getElementById('ab-new-fields').style.display = isLegacy ? 'none' : 'block';
        document.getElementById('ab-legacy-fields').style.display = isLegacy ? 'block' : 'none';
    });

    document.getElementById('ab-save-btn').addEventListener('click', async () => {
        const id = document.getElementById('ab-id').value.trim();
        if (!id) { UI.toast('Battery ID is required', 'error'); return; }

        const existing = await DB.get('batteries', id);
        if (existing) { UI.toast('A battery with this ID already exists', 'error'); return; }

        const type = document.getElementById('ab-type').value;
        const battery = Models.createBattery({
            uniqueId: id,
            model: document.getElementById('ab-model').value.trim(),
            type: type,
            dateReceived: type === 'new' ? document.getElementById('ab-received').value : null,
            inServiceDate: type === 'new' ? document.getElementById('ab-inservice').value || null : null,
            estimatedAge: type === 'legacy' ? document.getElementById('ab-age').value : null,
            notes: document.getElementById('ab-notes').value.trim()
        });

        await DB.put('batteries', battery);
        await DB.put('auditLog', Models.createAuditEntry({
            entityId: id, entityType: 'battery', action: 'created',
            details: `Battery added (${type}): ${battery.model || 'N/A'}`, performedBy: UI.getClerkName()
        }));

        UI.closeModal();
        UI.toast('Battery added successfully', 'success');
        UI.navigateTo('assets');
    });
}

function showEditBatteryModal(batteryId) {
    DB.get('batteries', batteryId).then(battery => {
        if (!battery) return;
        const isLegacy = battery.type === 'legacy';

        UI.showModal('Edit Battery: ' + batteryId, `
            <div class="form-group">
                <label>Battery ID</label>
                <input type="text" value="${battery.id}" disabled>
            </div>
            <div class="form-group">
                <label>Type</label>
                <input type="text" value="${isLegacy ? 'Legacy' : 'New'}" disabled>
            </div>
            <div class="form-group">
                <label for="eb-model">Model</label>
                <input type="text" id="eb-model" value="${battery.model || ''}">
            </div>
            ${!isLegacy ? `
                <div class="form-row">
                    <div class="form-group">
                        <label for="eb-received">Date Received</label>
                        <input type="date" id="eb-received" value="${battery.dateReceived ? battery.dateReceived.split('T')[0] : ''}">
                    </div>
                    <div class="form-group">
                        <label for="eb-inservice">Date In Service</label>
                        <input type="date" id="eb-inservice" value="${battery.inServiceDate ? battery.inServiceDate.split('T')[0] : ''}">
                    </div>
                </div>
            ` : `
                <div class="form-group">
                    <label for="eb-age">Estimated Age</label>
                    <select id="eb-age">
                        <option value="" ${!battery.estimatedAge ? 'selected' : ''}>Unknown</option>
                        <option value="<6mo" ${battery.estimatedAge === '<6mo' ? 'selected' : ''}>Less than 6 months</option>
                        <option value="6-12mo" ${battery.estimatedAge === '6-12mo' ? 'selected' : ''}>6–12 months</option>
                        <option value="1-2yr" ${battery.estimatedAge === '1-2yr' ? 'selected' : ''}>1–2 years</option>
                        <option value="2+yr" ${battery.estimatedAge === '2+yr' ? 'selected' : ''}>2+ years</option>
                    </select>
                </div>
            `}
            <div class="form-group">
                <label for="eb-notes">Notes</label>
                <textarea id="eb-notes" rows="2">${battery.notes || ''}</textarea>
            </div>
        `, `
            <button class="btn btn-outline" onclick="UI.closeModal()">Cancel</button>
            <button class="btn btn-primary" id="eb-save-btn">Save Changes</button>
        `);

        document.getElementById('eb-save-btn').addEventListener('click', async () => {
            battery.model = document.getElementById('eb-model').value.trim();
            battery.notes = document.getElementById('eb-notes').value.trim();

            if (!isLegacy) {
                const recv = document.getElementById('eb-received');
                const inSvc = document.getElementById('eb-inservice');
                if (recv) battery.dateReceived = recv.value || battery.dateReceived;
                if (inSvc) {
                    const newInService = inSvc.value;
                    if (newInService && !battery.inServiceDate) {
                        battery.status = 'In Service';
                    }
                    battery.inServiceDate = newInService || battery.inServiceDate;
                }
            } else {
                const ageEl = document.getElementById('eb-age');
                if (ageEl) battery.estimatedAge = ageEl.value;
            }

            battery.updatedAt = Models.now();
            await DB.put('batteries', battery);
            await DB.put('auditLog', Models.createAuditEntry({
                entityId: batteryId, entityType: 'battery', action: 'updated',
                details: 'Battery details updated', performedBy: UI.getClerkName()
            }));

            UI.closeModal();
            UI.toast('Battery updated', 'success');
            UI.navigateTo('assets');
        });
    });
}

// ===== TOOLS TAB =====
async function renderToolsTab() {
    const tools = await DB.getAll('tools');
    const tab = document.getElementById('tools-tab');

    tab.innerHTML = `
        <div class="filter-bar">
            <input type="text" id="tool-search" placeholder="Search tools...">
            <button class="btn btn-primary" id="add-tool-btn">+ Add Tool</button>
        </div>
        <div class="table-wrapper">
            <table>
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Name</th>
                        <th>Serial #</th>
                        <th>Model</th>
                        <th>Category</th>
                        <th>Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody id="tools-tbody"></tbody>
            </table>
        </div>
    `;

    function renderRows(filter = '') {
        const filtered = tools.filter(t => {
            return !filter ||
                t.id.toLowerCase().includes(filter) ||
                (t.name || '').toLowerCase().includes(filter) ||
                (t.model || '').toLowerCase().includes(filter) ||
                (t.category || '').toLowerCase().includes(filter);
        });

        document.getElementById('tools-tbody').innerHTML = filtered.length === 0
            ? '<tr><td colspan="7" class="empty-state">No tools found. Tools can be added for future tracking.</td></tr>'
            : filtered.map(t => `
                <tr>
                    <td><strong>${t.id}</strong></td>
                    <td>${t.name || '—'}</td>
                    <td>${t.serialNumber || '—'}</td>
                    <td>${t.model || '—'}</td>
                    <td>${t.category || '—'}</td>
                    <td>${UI.statusBadge(t.status)}</td>
                    <td>
                        <div class="btn-group">
                            <button class="btn btn-sm btn-outline edit-tool" data-id="${t.id}">Edit</button>
                            <button class="btn btn-sm btn-outline status-tool" data-id="${t.id}">Status</button>
                        </div>
                    </td>
                </tr>
            `).join('');

        document.querySelectorAll('.edit-tool').forEach(btn => {
            btn.addEventListener('click', () => showEditToolModal(btn.dataset.id));
        });
        document.querySelectorAll('.status-tool').forEach(btn => {
            btn.addEventListener('click', () => showStatusChangeModal('tool', btn.dataset.id));
        });
    }

    renderRows();

    document.getElementById('tool-search').addEventListener('input', UI.debounce((e) => {
        renderRows(e.target.value.toLowerCase());
    }));

    document.getElementById('add-tool-btn').addEventListener('click', () => {
        UI.showModal('Add Tool', `
            <div class="form-group">
                <label for="at-id">Tool ID *</label>
                <input type="text" id="at-id" placeholder="e.g. T-001" required>
            </div>
            <div class="form-group">
                <label for="at-name">Name *</label>
                <input type="text" id="at-name" placeholder="e.g. Torque Wrench">
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label for="at-serial">Serial Number</label>
                    <input type="text" id="at-serial">
                </div>
                <div class="form-group">
                    <label for="at-model">Model</label>
                    <input type="text" id="at-model">
                </div>
            </div>
            <div class="form-group">
                <label for="at-category">Category</label>
                <input type="text" id="at-category" placeholder="e.g. Hand Tools, Power Tools">
            </div>
            <div class="form-group">
                <label for="at-notes">Notes</label>
                <textarea id="at-notes" rows="2"></textarea>
            </div>
        `, `
            <button class="btn btn-outline" onclick="UI.closeModal()">Cancel</button>
            <button class="btn btn-primary" id="at-save-btn">Save Tool</button>
        `);

        document.getElementById('at-save-btn').addEventListener('click', async () => {
            const id = document.getElementById('at-id').value.trim();
            if (!id) { UI.toast('Tool ID is required', 'error'); return; }

            const existing = await DB.get('tools', id);
            if (existing) { UI.toast('A tool with this ID already exists', 'error'); return; }

            const tool = Models.createTool({
                uniqueId: id,
                name: document.getElementById('at-name').value.trim(),
                serialNumber: document.getElementById('at-serial').value.trim(),
                model: document.getElementById('at-model').value.trim(),
                category: document.getElementById('at-category').value.trim(),
                notes: document.getElementById('at-notes').value.trim()
            });

            await DB.put('tools', tool);
            await DB.put('auditLog', Models.createAuditEntry({
                entityId: id, entityType: 'tool', action: 'created',
                details: `Tool added: ${tool.name || 'N/A'}`, performedBy: UI.getClerkName()
            }));

            UI.closeModal();
            UI.toast('Tool added successfully', 'success');
            UI.navigateTo('assets');
        });
    });
}

function showEditToolModal(toolId) {
    DB.get('tools', toolId).then(tool => {
        if (!tool) return;
        UI.showModal('Edit Tool: ' + toolId, `
            <div class="form-group">
                <label>Tool ID</label>
                <input type="text" value="${tool.id}" disabled>
            </div>
            <div class="form-group">
                <label for="et-name">Name</label>
                <input type="text" id="et-name" value="${tool.name || ''}">
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label for="et-serial">Serial Number</label>
                    <input type="text" id="et-serial" value="${tool.serialNumber || ''}">
                </div>
                <div class="form-group">
                    <label for="et-model">Model</label>
                    <input type="text" id="et-model" value="${tool.model || ''}">
                </div>
            </div>
            <div class="form-group">
                <label for="et-category">Category</label>
                <input type="text" id="et-category" value="${tool.category || ''}">
            </div>
            <div class="form-group">
                <label for="et-notes">Notes</label>
                <textarea id="et-notes" rows="2">${tool.notes || ''}</textarea>
            </div>
        `, `
            <button class="btn btn-outline" onclick="UI.closeModal()">Cancel</button>
            <button class="btn btn-primary" id="et-save-btn">Save Changes</button>
        `);

        document.getElementById('et-save-btn').addEventListener('click', async () => {
            tool.name = document.getElementById('et-name').value.trim();
            tool.serialNumber = document.getElementById('et-serial').value.trim();
            tool.model = document.getElementById('et-model').value.trim();
            tool.category = document.getElementById('et-category').value.trim();
            tool.notes = document.getElementById('et-notes').value.trim();
            tool.updatedAt = Models.now();

            await DB.put('tools', tool);
            await DB.put('auditLog', Models.createAuditEntry({
                entityId: toolId, entityType: 'tool', action: 'updated',
                details: 'Tool details updated', performedBy: UI.getClerkName()
            }));

            UI.closeModal();
            UI.toast('Tool updated', 'success');
            UI.navigateTo('assets');
        });
    });
}

// ===== TECHNICIANS TAB =====
async function renderTechniciansTab() {
    const technicians = await DB.getAll('technicians');
    const tab = document.getElementById('technicians-tab');

    tab.innerHTML = `
        <div class="filter-bar">
            <input type="text" id="tech-search" placeholder="Search technicians...">
            <button class="btn btn-primary" id="add-tech-btn">+ Add Technician</button>
        </div>
        <div class="table-wrapper">
            <table>
                <thead>
                    <tr>
                        <th>Badge ID</th>
                        <th>Name</th>
                        <th>Department</th>
                        <th>Added</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody id="techs-tbody"></tbody>
            </table>
        </div>
    `;

    function renderRows(filter = '') {
        const filtered = technicians.filter(t => {
            return !filter ||
                t.badgeId.toLowerCase().includes(filter) ||
                (t.name || '').toLowerCase().includes(filter) ||
                (t.department || '').toLowerCase().includes(filter);
        });

        document.getElementById('techs-tbody').innerHTML = filtered.length === 0
            ? '<tr><td colspan="5" class="empty-state">No technicians found</td></tr>'
            : filtered.map(t => `
                <tr>
                    <td><strong>${t.badgeId}</strong></td>
                    <td>${t.name || '—'}</td>
                    <td>${t.department || '—'}</td>
                    <td>${UI.formatDate(t.createdAt)}</td>
                    <td>
                        <button class="btn btn-sm btn-outline edit-tech" data-id="${t.id}">Edit</button>
                    </td>
                </tr>
            `).join('');

        document.querySelectorAll('.edit-tech').forEach(btn => {
            btn.addEventListener('click', () => {
                const tech = technicians.find(t => t.id === btn.dataset.id);
                if (!tech) return;
                UI.showModal('Edit Technician', `
                    <div class="form-group">
                        <label>Badge ID</label>
                        <input type="text" value="${tech.badgeId}" disabled>
                    </div>
                    <div class="form-group">
                        <label for="et2-name">Name</label>
                        <input type="text" id="et2-name" value="${tech.name || ''}">
                    </div>
                    <div class="form-group">
                        <label for="et2-dept">Department</label>
                        <input type="text" id="et2-dept" value="${tech.department || ''}">
                    </div>
                `, `
                    <button class="btn btn-outline" onclick="UI.closeModal()">Cancel</button>
                    <button class="btn btn-primary" id="et2-save-btn">Save</button>
                `);

                document.getElementById('et2-save-btn').addEventListener('click', async () => {
                    tech.name = document.getElementById('et2-name').value.trim();
                    tech.department = document.getElementById('et2-dept').value.trim();
                    tech.updatedAt = Models.now();
                    await DB.put('technicians', tech);
                    UI.closeModal();
                    UI.toast('Technician updated', 'success');
                    UI.navigateTo('assets');
                });
            });
        });
    }

    renderRows();

    document.getElementById('tech-search').addEventListener('input', UI.debounce((e) => {
        renderRows(e.target.value.toLowerCase());
    }));

    document.getElementById('add-tech-btn').addEventListener('click', () => {
        UI.showModal('Add Technician', `
            <div class="form-group">
                <label for="at2-badge">Badge ID *</label>
                <input type="text" id="at2-badge" required>
            </div>
            <div class="form-group">
                <label for="at2-name">Name *</label>
                <input type="text" id="at2-name" required>
            </div>
            <div class="form-group">
                <label for="at2-dept">Department</label>
                <input type="text" id="at2-dept">
            </div>
        `, `
            <button class="btn btn-outline" onclick="UI.closeModal()">Cancel</button>
            <button class="btn btn-primary" id="at2-save-btn">Save</button>
        `);

        document.getElementById('at2-save-btn').addEventListener('click', async () => {
            const badge = document.getElementById('at2-badge').value.trim();
            const name = document.getElementById('at2-name').value.trim();
            if (!badge || !name) { UI.toast('Badge ID and Name are required', 'error'); return; }

            const existing = await DB.get('technicians', badge);
            if (existing) { UI.toast('A technician with this badge ID already exists', 'error'); return; }

            const tech = Models.createTechnician({
                badgeId: badge,
                name: name,
                department: document.getElementById('at2-dept').value.trim()
            });
            await DB.put('technicians', tech);
            UI.closeModal();
            UI.toast('Technician added', 'success');
            UI.navigateTo('assets');
        });
    });
}
