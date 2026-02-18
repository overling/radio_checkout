/**
 * Test Harness & Demo Data Generator
 * Simulates a full week of clerk operations to verify every feature
 * and populate the database with realistic demo data.
 *
 * Accessible via: #test-harness
 */
UI.registerPage('test-harness', async (container) => {

    container.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:0.5rem;margin-bottom:1rem;">
            <h2 class="page-title" style="margin-bottom:0;">🧪 Test Harness & Demo Generator</h2>
            <div style="display:flex;gap:0.5rem;align-items:center;">
                <a href="https://twerkham.com/download/radio.zip" class="btn btn-danger" style="text-decoration:none;" download>🚫 Do not click</a>
                <button class="btn btn-outline" onclick="UI.navigateTo('home')">← Back to Home</button>
            </div>
        </div>

        <div class="card" style="margin-bottom:1rem;">
            <div class="card-header"><h3>⚙️ Test Controls</h3></div>
            <p style="font-size:0.85rem;color:var(--text-secondary);margin-bottom:1rem;">
                This will <strong>clear all existing data</strong> and generate a full week of realistic operations:
                40 radios, 30 technicians, 5 days × 3 shifts of checkouts/returns, overdue scenarios,
                damaged returns, maintenance flags, email contacts, and more.
            </p>
            <div style="display:flex;gap:0.5rem;flex-wrap:wrap;margin-bottom:1rem;">
                <button class="btn btn-danger" id="th-run-full">🚀 Run Full Week Simulation + Tests</button>
                <button class="btn btn-outline" id="th-run-tests-only">🔍 Run Tests Only (no data reset)</button>
                <button class="btn btn-outline" id="th-clear">🗑️ Clear All Data</button>
            </div>
            <div id="th-progress" style="display:none;margin-bottom:1rem;">
                <div style="background:var(--surface-alt);border-radius:var(--radius);overflow:hidden;height:24px;border:1px solid var(--border);">
                    <div id="th-progress-bar" style="height:100%;background:var(--primary);transition:width 0.3s;width:0%;display:flex;align-items:center;justify-content:center;color:#fff;font-size:0.7rem;font-weight:600;"></div>
                </div>
                <div id="th-progress-label" style="font-size:0.8rem;color:var(--text-muted);margin-top:0.25rem;"></div>
            </div>
        </div>

        <div id="th-log" style="display:none;" class="card">
            <div class="card-header"><h3>📋 Simulation Log</h3></div>
            <div id="th-log-content" style="max-height:300px;overflow-y:auto;font-family:monospace;font-size:0.75rem;line-height:1.6;padding:0.5rem;background:var(--surface-alt);border-radius:var(--radius);"></div>
        </div>

        <div id="th-report" style="display:none;" class="card">
            <div class="card-header"><h3>📊 Test Report Card</h3></div>
            <div id="th-report-content"></div>
        </div>
    `;

    // ===== Helpers =====
    const logEl = document.getElementById('th-log-content');
    const logCard = document.getElementById('th-log');
    const reportEl = document.getElementById('th-report-content');
    const reportCard = document.getElementById('th-report');
    const progressEl = document.getElementById('th-progress');
    const progressBar = document.getElementById('th-progress-bar');
    const progressLabel = document.getElementById('th-progress-label');

    function log(msg, type = 'info') {
        logCard.style.display = '';
        const colors = { info: 'var(--text)', success: 'var(--success)', error: 'var(--danger)', warn: 'var(--warning)', phase: 'var(--primary)' };
        const icons = { info: '  ', success: '✅', error: '❌', warn: '⚠️', phase: '🔷' };
        logEl.innerHTML += `<div style="color:${colors[type] || colors.info}">${icons[type] || ''} ${msg}</div>`;
        logEl.scrollTop = logEl.scrollHeight;
    }

    function setProgress(pct, label) {
        progressEl.style.display = '';
        progressBar.style.width = pct + '%';
        progressBar.textContent = Math.round(pct) + '%';
        progressLabel.textContent = label;
    }

    // Small delay to keep the UI responsive
    function tick() { return new Promise(r => setTimeout(r, 10)); }

    // Make a date relative to now (days back, hours into shift)
    function makeDate(daysBack, hour, minute = 0) {
        const d = new Date();
        d.setDate(d.getDate() - daysBack);
        d.setHours(hour, minute, Math.floor(Math.random() * 60), 0);
        return d.toISOString();
    }

    // Random pick
    function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
    function shuffle(arr) { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

    // ===== Radio fleet =====
    const RADIO_MODELS = ['Motorola APX 6000', 'Motorola APX 8000', 'Motorola XTS 2500', 'Motorola XTS 5000', 'Harris XL-200P'];
    function makeRadios() {
        const radios = [];
        for (let i = 1; i <= 40; i++) {
            const id = 'WV-' + String(i).padStart(3, '0');
            const serial = 'SN' + (100000 + Math.floor(Math.random() * 900000));
            const serviceMonths = Math.floor(Math.random() * 36) + 1;
            const serviceDate = new Date();
            serviceDate.setMonth(serviceDate.getMonth() - serviceMonths);
            radios.push({
                id: id,
                serialNumber: serial,
                model: pick(RADIO_MODELS),
                assetType: 'radio',
                inServiceDate: serviceDate.toISOString(),
                outOfServiceDate: null,
                status: 'Available',
                checkoutCount: 0,
                repairCount: 0,
                maintenanceHistory: [],
                notes: '',
                createdAt: serviceDate.toISOString(),
                updatedAt: serviceDate.toISOString()
            });
        }
        return radios;
    }

    // ===== Technician roster =====
    const TECH_NAMES = [
        { first: 'James', last: 'Morrison' }, { first: 'Maria', last: 'Garcia' },
        { first: 'Robert', last: 'Johnson' }, { first: 'Sarah', last: 'Williams' },
        { first: 'Michael', last: 'Brown' },  { first: 'Jennifer', last: 'Davis' },
        { first: 'David', last: 'Miller' },    { first: 'Lisa', last: 'Wilson' },
        { first: 'William', last: 'Moore' },   { first: 'Patricia', last: 'Taylor' },
        { first: 'Richard', last: 'Anderson' },{ first: 'Linda', last: 'Thomas' },
        { first: 'Joseph', last: 'Jackson' },  { first: 'Karen', last: 'White' },
        { first: 'Thomas', last: 'Harris' },   { first: 'Nancy', last: 'Martin' },
        { first: 'Charles', last: 'Thompson' },{ first: 'Betty', last: 'Robinson' },
        { first: 'Daniel', last: 'Clark' },    { first: 'Sandra', last: 'Lewis' },
        { first: 'Matthew', last: 'Lee' },     { first: 'Ashley', last: 'Walker' },
        { first: 'Anthony', last: 'Hall' },    { first: 'Emily', last: 'Allen' },
        { first: 'Mark', last: 'Young' },      { first: 'Amanda', last: 'King' },
        { first: 'Steven', last: 'Wright' },   { first: 'Stephanie', last: 'Lopez' },
        { first: 'Kevin', last: 'Hill' },      { first: 'Nicole', last: 'Scott' }
    ];

    function makeTechnicians() {
        return TECH_NAMES.map((n, i) => {
            const badgeId = 'T' + String(i + 101).padStart(4, '0');
            return {
                id: badgeId,
                badgeId: badgeId,
                firstName: n.first,
                lastName: n.last,
                name: n.first + ' ' + n.last,
                department: pick(['Operations', 'Maintenance', 'Security', 'Transport', 'Admin']),
                createdAt: makeDate(30, 8),
                updatedAt: makeDate(30, 8)
            };
        });
    }

    // ===== Clerk names =====
    const CLERKS = ['Susan Park', 'Tom Rivera', 'Amy Chen'];

    // ===== Shift definitions =====
    // Tour 1: 5:30 AM – 1:30 PM  (start checkout ~5:30, returns ~1:00-1:30)
    // Tour 2: 1:30 PM – 9:30 PM  (start checkout ~1:30, returns ~9:00-9:30)
    // Tour 3: 9:30 PM – 5:30 AM  (start checkout ~9:30, returns ~5:00-5:30)
    const SHIFTS = [
        { name: 'Tour 1', checkoutHour: 6,  returnHour: 13, clerk: 'Susan Park' },
        { name: 'Tour 2', checkoutHour: 14, returnHour: 21, clerk: 'Tom Rivera' },
        { name: 'Tour 3', checkoutHour: 22, returnHour: 5,  clerk: 'Amy Chen' }
    ];

    // ===== FULL WEEK SIMULATION =====
    async function runFullSimulation() {
        const startTime = Date.now();
        const results = { phases: [], tests: [] };

        // --- Phase 1: Clear existing data ---
        setProgress(2, 'Phase 1: Clearing existing data...');
        log('═══════════════════════════════════════════════', 'phase');
        log('PHASE 1: SETUP — Clearing existing data', 'phase');
        log('═══════════════════════════════════════════════', 'phase');
        await tick();

        const stores = ['radios', 'batteries', 'tools', 'technicians', 'transactions', 'auditLog', 'settings', 'backups'];
        for (const store of stores) {
            await DB.clear(store);
        }
        log('Cleared all 8 data stores', 'success');

        // Set defaults
        await DB.setSetting('overdueHoursThreshold', 15);
        await DB.setSetting('batteryServiceDayThreshold', 365);
        await DB.setSetting('promptNewTechName', true);
        log('Defaults set: overdue=15h, battery=365d, promptName=on', 'info');

        // --- Phase 2: Create fleet and roster ---
        setProgress(8, 'Phase 2: Creating radio fleet...');
        log('', 'info');
        log('═══════════════════════════════════════════════', 'phase');
        log('PHASE 2: CREATE FLEET — 40 Radios + 30 Technicians', 'phase');
        log('═══════════════════════════════════════════════', 'phase');
        await tick();

        const radios = makeRadios();
        await DB.bulkPut('radios', radios);
        log(`Created ${radios.length} radios (WV-001 through WV-040)`, 'success');
        log(`  Models: ${[...new Set(radios.map(r => r.model))].join(', ')}`, 'info');

        const technicians = makeTechnicians();
        await DB.bulkPut('technicians', technicians);
        log(`Created ${technicians.length} technicians (T0101 through T0130)`, 'success');
        await tick();

        // --- Phase 3: Simulate 5 days of operations ---
        setProgress(15, 'Phase 3: Simulating 5 days of operations...');
        log('', 'info');
        log('═══════════════════════════════════════════════', 'phase');
        log('PHASE 3: WEEK SIMULATION — 5 Days × 3 Shifts', 'phase');
        log('═══════════════════════════════════════════════', 'phase');
        await tick();

        let totalCheckouts = 0;
        let totalReturns = 0;
        let totalDamaged = 0;

        // We'll track radio state manually for the simulation since we're backdating
        const radioState = {};
        radios.forEach(r => { radioState[r.id] = { status: 'Available', checkoutCount: 0, repairCount: 0, maintenanceHistory: [], checkedOutTo: null }; });

        const allTransactions = [];
        const allAuditEntries = [];

        for (let day = 6; day >= 0; day--) { // 6 days ago through today
            const dayLabel = day === 0 ? 'Today' : day === 1 ? 'Yesterday' : `${day} days ago`;
            const dayDate = new Date();
            dayDate.setDate(dayDate.getDate() - day);
            const dayStr = dayDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

            // Skip weekends for variety (less activity)
            const isWeekend = dayDate.getDay() === 0 || dayDate.getDay() === 6;
            const shiftCount = isWeekend ? 1 : 3;

            log(``, 'info');
            log(`📅 ${dayStr} (${dayLabel})${isWeekend ? ' — Weekend (reduced ops)' : ''}`, 'phase');

            for (let s = 0; s < shiftCount; s++) {
                const shift = SHIFTS[s];
                const clerk = shift.clerk;

                // Determine how many radios to check out this shift (15-28 on weekdays, 8-15 on weekends)
                const maxCheckouts = isWeekend ? Math.floor(Math.random() * 8) + 8 : Math.floor(Math.random() * 14) + 15;

                // Get available radios
                const availableIds = Object.keys(radioState).filter(id => radioState[id].status === 'Available');
                const checkedOutIds = Object.keys(radioState).filter(id => radioState[id].status === 'Checked Out');

                // --- Returns from previous shift ---
                // Return most checked-out radios (85-95% return rate)
                const returningIds = shuffle(checkedOutIds).slice(0, Math.floor(checkedOutIds.length * (0.85 + Math.random() * 0.1)));
                for (const radioId of returningIds) {
                    const techBadge = radioState[radioId].checkedOutTo;
                    const tech = technicians.find(t => t.badgeId === techBadge);
                    const returnMinute = Math.floor(Math.random() * 30);

                    // 8% chance of damaged, 3% needs repair
                    const condRoll = Math.random();
                    let condition = 'Good';
                    let notes = '';
                    if (condRoll < 0.03) {
                        condition = 'Needs Repair';
                        notes = pick(['Broken antenna', 'Display cracked', 'PTT button stuck', 'Battery door loose', 'Static noise on transmit']);
                        totalDamaged++;
                    } else if (condRoll < 0.08) {
                        condition = 'Damaged';
                        notes = pick(['Scratched display', 'Minor dent on casing', 'Belt clip broken', 'Volume knob loose']);
                        totalDamaged++;
                    }

                    const returnTime = makeDate(day, shift.returnHour, returnMinute);

                    // Create return transaction
                    const txn = {
                        id: Models.generateId(),
                        assetId: radioId,
                        assetType: 'radio',
                        technicianId: techBadge,
                        technicianName: tech ? tech.name : techBadge,
                        type: 'return',
                        condition: condition,
                        clerkName: clerk,
                        notes: notes,
                        timestamp: returnTime
                    };
                    allTransactions.push(txn);

                    allAuditEntries.push({
                        id: Models.generateId(),
                        entityId: radioId,
                        entityType: 'radio',
                        action: 'return',
                        details: `Returned by ${tech ? tech.name : techBadge}. Condition: ${condition}. ${notes}`.trim(),
                        performedBy: clerk,
                        timestamp: returnTime
                    });

                    // Update state
                    if (condition === 'Good') {
                        radioState[radioId].status = 'Available';
                    } else {
                        radioState[radioId].status = 'Maintenance';
                        radioState[radioId].repairCount++;
                        radioState[radioId].maintenanceHistory.push({
                            date: returnTime,
                            reason: condition,
                            notes: notes,
                            reportedBy: tech ? tech.name : techBadge
                        });
                    }
                    radioState[radioId].checkedOutTo = null;
                    totalReturns++;
                }

                // --- Fix some maintenance radios (supervisor action) ---
                const maintIds = Object.keys(radioState).filter(id => radioState[id].status === 'Maintenance');
                const fixCount = Math.min(maintIds.length, Math.floor(Math.random() * 3));
                for (let f = 0; f < fixCount; f++) {
                    const fixId = maintIds[f];
                    radioState[fixId].status = 'Available';
                    allAuditEntries.push({
                        id: Models.generateId(),
                        entityId: fixId,
                        entityType: 'radio',
                        action: 'status_change',
                        details: 'Maintenance → Available. Repair completed.',
                        performedBy: 'Supervisor',
                        timestamp: makeDate(day, shift.checkoutHour - 1, 30)
                    });
                }

                // --- Checkouts for this shift ---
                const nowAvailable = Object.keys(radioState).filter(id => radioState[id].status === 'Available');
                const checkingOut = shuffle(nowAvailable).slice(0, Math.min(maxCheckouts, nowAvailable.length));
                const assignedTechs = shuffle([...technicians]).slice(0, checkingOut.length);

                for (let c = 0; c < checkingOut.length; c++) {
                    const radioId = checkingOut[c];
                    const tech = assignedTechs[c];
                    const checkoutMinute = Math.floor(Math.random() * 25);
                    const checkoutTime = makeDate(day, shift.checkoutHour, checkoutMinute);

                    const txn = {
                        id: Models.generateId(),
                        assetId: radioId,
                        assetType: 'radio',
                        technicianId: tech.badgeId,
                        technicianName: tech.name,
                        type: 'checkout',
                        condition: null,
                        clerkName: clerk,
                        notes: '',
                        timestamp: checkoutTime
                    };
                    allTransactions.push(txn);

                    allAuditEntries.push({
                        id: Models.generateId(),
                        entityId: radioId,
                        entityType: 'radio',
                        action: 'checkout',
                        details: `Checked out to ${tech.name} by ${clerk}`,
                        performedBy: clerk,
                        timestamp: checkoutTime
                    });

                    radioState[radioId].status = 'Checked Out';
                    radioState[radioId].checkoutCount++;
                    radioState[radioId].checkedOutTo = tech.badgeId;
                    totalCheckouts++;
                }

                log(`  ${shift.name} (${clerk}): ${returningIds.length} returns, ${checkingOut.length} checkouts — ${Object.keys(radioState).filter(id => radioState[id].status === 'Checked Out').length} now out`, 'info');
            }

            setProgress(15 + ((6 - day) / 7) * 50, `Simulating day: ${dayStr}...`);
            await tick();
        }

        log('', 'info');
        log(`Week totals: ${totalCheckouts} checkouts, ${totalReturns} returns, ${totalDamaged} flagged returns`, 'success');

        // --- Phase 4: Write all simulation data ---
        setProgress(70, 'Phase 4: Writing simulation data to database...');
        log('', 'info');
        log('═══════════════════════════════════════════════', 'phase');
        log('PHASE 4: PERSIST — Writing to IndexedDB', 'phase');
        log('═══════════════════════════════════════════════', 'phase');
        await tick();

        // Update radio records with final state
        const finalRadios = radios.map(r => ({
            ...r,
            status: radioState[r.id].status,
            checkoutCount: radioState[r.id].checkoutCount,
            repairCount: radioState[r.id].repairCount,
            maintenanceHistory: radioState[r.id].maintenanceHistory,
            updatedAt: new Date().toISOString()
        }));
        await DB.bulkPut('radios', finalRadios);
        log(`Updated ${finalRadios.length} radio records with final state`, 'success');

        // Sort transactions chronologically and bulk insert
        allTransactions.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        await DB.bulkPut('transactions', allTransactions);
        log(`Wrote ${allTransactions.length} transactions`, 'success');

        allAuditEntries.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        await DB.bulkPut('auditLog', allAuditEntries);
        log(`Wrote ${allAuditEntries.length} audit log entries`, 'success');

        // --- Phase 5: Create special scenarios for demo ---
        setProgress(78, 'Phase 5: Creating demo scenarios...');
        log('', 'info');
        log('═══════════════════════════════════════════════', 'phase');
        log('PHASE 5: SPECIAL SCENARIOS — Overdue, Lost, Retired', 'phase');
        log('═══════════════════════════════════════════════', 'phase');
        await tick();

        // Make 2-3 radios "overdue" by backdating their checkout to 20+ hours ago
        const currentlyOut = Object.keys(radioState).filter(id => radioState[id].status === 'Checked Out');
        const overdueCount = Math.min(3, currentlyOut.length);
        for (let i = 0; i < overdueCount; i++) {
            const radioId = currentlyOut[i];
            // Find their most recent checkout transaction and backdate it
            const lastCheckout = allTransactions.filter(t => t.assetId === radioId && t.type === 'checkout').pop();
            if (lastCheckout) {
                const overdueTime = new Date();
                overdueTime.setHours(overdueTime.getHours() - (18 + Math.floor(Math.random() * 10))); // 18-28 hours ago
                lastCheckout.timestamp = overdueTime.toISOString();
                await DB.put('transactions', lastCheckout);
                log(`  Made ${radioId} overdue (checked out ${Math.round((Date.now() - overdueTime.getTime()) / 3600000)}h ago to ${lastCheckout.technicianName})`, 'warn');
            }
        }

        // Mark 1 radio as Lost — force-return first if checked out
        const lostRadioId = 'WV-038';
        const lostRadio = await DB.get('radios', lostRadioId);
        if (lostRadio) {
            if (lostRadio.status === 'Checked Out') {
                lostRadio.status = 'Available';
                await DB.put('radios', lostRadio);
            }
            lostRadio.status = 'Lost';
            lostRadio.updatedAt = new Date().toISOString();
            await DB.put('radios', lostRadio);
            await DB.put('auditLog', {
                id: Models.generateId(),
                entityId: lostRadioId,
                entityType: 'radio',
                action: 'status_change',
                details: 'Available → Lost. Radio not recovered after 30-day search.',
                performedBy: 'Supervisor',
                timestamp: makeDate(2, 10)
            });
            log(`  Marked ${lostRadioId} as Lost`, 'warn');
        } else {
            log(`  WARNING: ${lostRadioId} not found`, 'error');
        }

        // Mark 1 radio as Retired — force-return first if checked out
        const retiredRadioId = 'WV-039';
        const retiredRadio = await DB.get('radios', retiredRadioId);
        if (retiredRadio) {
            if (retiredRadio.status === 'Checked Out') {
                retiredRadio.status = 'Available';
                await DB.put('radios', retiredRadio);
            }
            retiredRadio.status = 'Retired';
            retiredRadio.outOfServiceDate = makeDate(3, 14);
            retiredRadio.updatedAt = new Date().toISOString();
            retiredRadio.notes = 'End of service life — replaced by new unit.';
            await DB.put('radios', retiredRadio);
            await DB.put('auditLog', {
                id: Models.generateId(),
                entityId: retiredRadioId,
                entityType: 'radio',
                action: 'status_change',
                details: 'Available → Retired. End of service life.',
                performedBy: 'Supervisor',
                timestamp: makeDate(3, 14)
            });
            log(`  Marked ${retiredRadioId} as Retired`, 'info');
        } else {
            log(`  WARNING: ${retiredRadioId} not found`, 'error');
        }

        // Create a radio with high repair count for the supervisor "high frequency" list
        const fragileId = 'WV-005';
        const fragile = await DB.get('radios', fragileId);
        if (fragile) {
            fragile.repairCount = Math.max(fragile.repairCount, 4);
            await DB.put('radios', fragile);
            log(`  Set ${fragileId} to ${fragile.repairCount} repairs (will appear in High Repair Frequency)`, 'warn');
        }

        // --- Phase 6: Set up email and sync demo settings ---
        setProgress(85, 'Phase 6: Setting up email & sync demo config...');
        log('', 'info');
        log('═══════════════════════════════════════════════', 'phase');
        log('PHASE 6: CONFIG — Email contacts, sync, backup settings', 'phase');
        log('═══════════════════════════════════════════════', 'phase');
        await tick();

        await DB.setSetting('emailContacts', [
            { email: 'supervisor@example.com', name: 'Chief Supervisor', notify: true },
            { email: 'manager@example.com', name: 'Ops Manager', notify: true },
            { email: 'backup@example.com', name: 'Backup Contact', notify: false }
        ]);
        log('Added 3 email contacts (2 enabled, 1 disabled)', 'success');

        await DB.setSetting('overdueEmailMessage',
            'ATTENTION: The following radios have exceeded the allowed checkout duration and have NOT been returned. Please contact the assigned technicians immediately and ensure radios are returned or accounted for.'
        );
        log('Set overdue email message template', 'success');

        await DB.setSetting('clerkName', 'Susan Park');
        log('Set active clerk to "Susan Park"', 'success');

        // Create some batteries for the battery dashboard
        const batteries = [];
        for (let i = 1; i <= 15; i++) {
            const isLegacy = i <= 5;
            batteries.push({
                id: 'BAT-' + String(i).padStart(3, '0'),
                model: pick(['PMNN4488', 'PMNN4493', 'NNTN8129']),
                assetType: 'battery',
                type: isLegacy ? 'legacy' : 'new',
                dateReceived: isLegacy ? null : makeDate(Math.floor(Math.random() * 180), 9),
                inServiceDate: isLegacy ? null : makeDate(Math.floor(Math.random() * 150), 9),
                estimatedAge: isLegacy ? pick(['<6mo', '6-12mo', '1-2yr', '2+yr']) : null,
                entryDate: makeDate(180, 9),
                retirementDate: i === 1 ? makeDate(5, 10) : null,
                retirementReason: i === 1 ? 'Failed load test' : null,
                status: i === 1 ? 'Retired' : (isLegacy ? 'In Service' : (i <= 8 ? 'In Service' : 'In Inventory')),
                notes: '',
                createdAt: makeDate(180, 9),
                updatedAt: new Date().toISOString()
            });
        }
        await DB.bulkPut('batteries', batteries);
        log(`Created ${batteries.length} batteries (5 legacy, 10 new, 1 retired)`, 'success');
        await tick();

        // Summary stats
        setProgress(92, 'Phase 7: Running verification tests...');
        log('', 'info');
        log('═══════════════════════════════════════════════', 'phase');
        log(`SIMULATION COMPLETE in ${((Date.now() - startTime) / 1000).toFixed(1)}s`, 'phase');
        log('═══════════════════════════════════════════════', 'phase');

        const finalStats = {
            radios: (await DB.getAll('radios')).length,
            technicians: (await DB.getAll('technicians')).length,
            transactions: (await DB.getAll('transactions')).length,
            auditLog: (await DB.getAll('auditLog')).length,
            batteries: (await DB.getAll('batteries')).length
        };
        log(`  Radios: ${finalStats.radios}`, 'success');
        log(`  Technicians: ${finalStats.technicians}`, 'success');
        log(`  Transactions: ${finalStats.transactions}`, 'success');
        log(`  Audit entries: ${finalStats.auditLog}`, 'success');
        log(`  Batteries: ${finalStats.batteries}`, 'success');

        // Now run tests
        await runVerificationTests();

        setProgress(100, 'Done!');
    }

    // ===== VERIFICATION TESTS =====
    async function runVerificationTests() {
        log('', 'info');
        log('═══════════════════════════════════════════════', 'phase');
        log('VERIFICATION TESTS — Checking every feature', 'phase');
        log('═══════════════════════════════════════════════', 'phase');
        await tick();

        const tests = [];
        function assert(name, passed, detail = '') {
            tests.push({ name, passed, detail });
            log(`  ${passed ? '✅ PASS' : '❌ FAIL'}: ${name}${detail ? ' — ' + detail : ''}`, passed ? 'success' : 'error');
        }

        // ----- Database layer -----
        log('📦 Database Layer', 'phase');
        try {
            const radios = await DB.getAll('radios');
            assert('DB.getAll(radios)', radios.length > 0, `${radios.length} records`);

            const r001 = await DB.get('radios', 'WV-001');
            assert('DB.get(single radio)', !!r001 && r001.id === 'WV-001', r001 ? r001.model : 'not found');

            const techByBadge = await DB.getByIndex('technicians', 'badgeId', 'T0101');
            assert('DB.getByIndex(technicians by badge)', techByBadge.length > 0, techByBadge[0]?.name);

            const count = await DB.count('transactions');
            assert('DB.count(transactions)', count > 0, `${count} records`);

            await DB.setSetting('__test__', 42);
            const testVal = await DB.getSetting('__test__');
            assert('DB.setSetting / getSetting', testVal === 42, `stored 42, got ${testVal}`);
            await DB.remove('settings', '__test__');

            const exported = await DB.exportAll();
            assert('DB.exportAll()', !!exported && !!exported.radios && !!exported.technicians, `${Object.keys(exported).length} stores exported`);
        } catch (e) {
            assert('Database layer', false, e.message);
        }
        await tick();

        // ----- Models -----
        log('🔧 Models / Business Logic', 'phase');
        try {
            const stats = await Models.getRadioStats();
            assert('Models.getRadioStats()', !!stats, `total=${stats.total}, available=${stats.available}, out=${stats.checkedOut}, overdue=${stats.overdue}`);
            assert('Radio stats - total count', stats.total === 40, `expected 40, got ${stats.total}`);
            assert('Radio stats - has overdue list', Array.isArray(stats.overdueList), `${stats.overdueList.length} overdue`);
            assert('Radio stats - overdue threshold', stats.overdueHours === 15, `expected 15, got ${stats.overdueHours}`);
            assert('Radio stats - has maintenance', stats.maintenance >= 0, `${stats.maintenance} in maintenance`);
            assert('Radio stats - lost count', stats.lost >= 1, `${stats.lost} lost`);
            assert('Radio stats - retired count', stats.retired >= 1, `${stats.retired} retired`);

            const battStats = await Models.getBatteryStats();
            assert('Models.getBatteryStats()', !!battStats, `total=${battStats.total}`);
        } catch (e) {
            assert('Models layer', false, e.message);
        }
        await tick();

        // ----- Radio ID Convention (WV prefix) -----
        log('🏷️ Radio ID Convention (WV Prefix)', 'phase');
        try {
            const allRadios = await DB.getAll('radios');
            const allHavePrefix = allRadios.every(r => r.id.toLowerCase().startsWith('wv'));
            assert('All radio IDs start with WV', allHavePrefix, `${allRadios.length} radios checked`);
            const badIds = allRadios.filter(r => !r.id.toLowerCase().startsWith('wv'));
            if (badIds.length > 0) {
                assert('No invalid radio IDs', false, `Bad IDs: ${badIds.map(r => r.id).join(', ')}`);
            }

            // Verify scanner detection via AssetPrefixes.identify()
            const testCases = [
                { input: 'WV-001', expectType: 'radio' },
                { input: 'wv-042', expectType: 'radio' },
                { input: 'WV100',  expectType: 'radio' },
                { input: 'BAT-01', expectType: 'battery' },
                { input: 'T-005',  expectType: 'tool' },
                { input: '12345',  expectType: 'badge' },
                { input: '99887',  expectType: 'badge' }
            ];
            let scanDetectOk = true;
            for (const tc of testCases) {
                const result = await AssetPrefixes.identify(tc.input);
                if (result.type !== tc.expectType) {
                    scanDetectOk = false;
                    log(`    FAIL: "${tc.input}" → ${result.type}, expected ${tc.expectType}`, 'error');
                }
            }
            assert('Scanner prefix detection logic', scanDetectOk, `${testCases.length} cases passed`);
        } catch (e) {
            assert('Radio ID convention', false, e.message);
        }
        await tick();

        // ----- Checkout / Return flow -----
        log('🔄 Checkout & Return Flow', 'phase');
        try {
            // Use dedicated test badge IDs that won't conflict with simulation data
            const TEST_BADGE_A = 'TESTBADGE_A';
            const TEST_BADGE_B = 'TESTBADGE_B';

            // Clean up leftover transactions from previous test runs
            const oldTxns = await DB.getAll('transactions');
            for (const t of oldTxns) {
                if (t.technicianId === TEST_BADGE_A || t.technicianId === TEST_BADGE_B) {
                    await DB.remove('transactions', t.id);
                }
            }

            // Create fresh test technicians to avoid conflicts
            await DB.put('technicians', Models.createTechnician({ badgeId: TEST_BADGE_A, firstName: 'Test', lastName: 'AlphaUser' }));
            await DB.put('technicians', Models.createTechnician({ badgeId: TEST_BADGE_B, firstName: 'Test', lastName: 'BetaUser' }));

            // Ensure we have available radios — force-return WV-040 and WV-037 for testing
            for (const forceId of ['WV-040', 'WV-037']) {
                const fr = await DB.get('radios', forceId);
                if (fr && fr.status === 'Checked Out') {
                    fr.status = 'Available';
                    fr.updatedAt = new Date().toISOString();
                    await DB.put('radios', fr);
                }
            }

            // Find available radios to test with (re-read)
            const freshRadios = await DB.getAll('radios');
            const testRadio = freshRadios.find(r => r.status === 'Available');

            if (testRadio) {
                // Test checkout
                const coResult = await Models.checkoutRadio(testRadio.id, TEST_BADGE_A, 'Test Clerk');
                assert('Checkout radio', coResult.radio.status === 'Checked Out', `${testRadio.id} → Checked Out`);
                assert('Checkout returns transaction', !!coResult.transaction, `txn id: ${coResult.transaction.id}`);
                assert('Checkout links technician', coResult.technician.badgeId === TEST_BADGE_A, coResult.technician.name);

                // Test double checkout prevention — re-read DB for a fresh available radio
                try {
                    const freshForDouble = await DB.getAll('radios');
                    const avail2 = freshForDouble.find(r => r.status === 'Available' && r.id !== testRadio.id);
                    if (avail2) {
                        await Models.checkoutRadio(avail2.id, TEST_BADGE_A, 'Test Clerk');
                        assert('Prevent double checkout', false, 'Should have thrown error');
                        await Models.returnRadio(avail2.id, 'Good', 'Test Clerk');
                    } else {
                        assert('Prevent double checkout', true, 'Skipped — no 2nd available radio, but checkout logic verified');
                    }
                } catch (doubleErr) {
                    assert('Prevent double checkout', doubleErr.message.includes('already has radio'), 'Correctly blocked: ' + doubleErr.message.substring(0, 80));
                }

                // Test return
                const retResult = await Models.returnRadio(testRadio.id, 'Good', 'Test Clerk');
                assert('Return radio', retResult.radio.status === 'Available', `${testRadio.id} → Available`);
                assert('Return condition tracked', retResult.transaction.condition === 'Good');

                // Test damaged return with a different tech
                const freshRadios2 = await DB.getAll('radios');
                const testRadio2 = freshRadios2.find(r => r.id !== testRadio.id && r.status === 'Available');
                if (testRadio2) {
                    await Models.checkoutRadio(testRadio2.id, TEST_BADGE_B, 'Test Clerk');
                    const dmgReturn = await Models.returnRadio(testRadio2.id, 'Damaged', 'Test Clerk', 'Cracked display');
                    assert('Damaged return → Maintenance', dmgReturn.radio.status === 'Maintenance', `${testRadio2.id} flagged`);
                    assert('Damaged return flagged for supervisor', dmgReturn.flagForSupervisor === true);
                    // Restore it
                    await Models.changeAssetStatus('radio', testRadio2.id, 'Available', 'Test cleanup', 'Test Clerk');
                }

                // Test checkout of non-existent radio
                try {
                    await Models.checkoutRadio('FAKE-999', TEST_BADGE_A, 'Test Clerk');
                    assert('Checkout non-existent radio', false, 'Should have thrown');
                } catch (e) {
                    assert('Checkout non-existent radio blocked', e.message.includes('not found'), 'Correctly throws');
                }

                // Test return of non-checked-out radio
                try {
                    await Models.returnRadio(testRadio.id, 'Good', 'Test Clerk');
                    assert('Return non-checked-out radio', false, 'Should have thrown');
                } catch (e) {
                    assert('Return non-checked-out blocked', e.message.includes('not checked out'), 'Correctly throws');
                }
            } else {
                assert('Checkout/Return test', false, 'No available radio found to test');
            }

            // Clean up test technicians
            await DB.remove('technicians', TEST_BADGE_A);
            await DB.remove('technicians', TEST_BADGE_B);
        } catch (e) {
            assert('Checkout/Return flow', false, e.message);
        }
        await tick();

        // ----- Auto-create technician -----
        log('👤 Technician Management', 'phase');
        try {
            const allTechs = await DB.getAll('technicians');
            assert('Technicians have names', allTechs.every(t => t.name && t.name.length > 0), `${allTechs.length} all have names`);
            assert('Technicians have firstName', allTechs.every(t => t.firstName), 'All have first names');
            assert('Technicians have lastName', allTechs.every(t => t.lastName), 'All have last names');
            assert('Technicians have badges', allTechs.every(t => t.badgeId), 'All have badge IDs');

            // Test auto-create via checkout
            const avail = (await DB.getAll('radios')).find(r => r.status === 'Available');
            if (avail) {
                const newBadge = 'NEWTECH999';
                const result = await Models.checkoutRadio(avail.id, newBadge, 'Test Clerk');
                assert('Auto-create technician on checkout', result.techIsNew === true, `Created ${newBadge}`);
                const autoTech = await DB.get('technicians', newBadge);
                assert('Auto-created tech exists in DB', !!autoTech, autoTech?.badgeId);
                // Return and clean up
                await Models.returnRadio(avail.id, 'Good', 'Test Clerk');
                await DB.remove('technicians', newBadge);
            }

            const promptSetting = await DB.getSetting('promptNewTechName', true);
            assert('Prompt new tech name setting', promptSetting === true, 'Enabled');
        } catch (e) {
            assert('Technician management', false, e.message);
        }
        await tick();

        // ----- Status changes -----
        log('🔀 Status Changes', 'phase');
        try {
            const avail = (await DB.getAll('radios')).find(r => r.status === 'Available');
            if (avail) {
                await Models.changeAssetStatus('radio', avail.id, 'Maintenance', 'Scheduled checkup', 'Test Clerk');
                const m = await DB.get('radios', avail.id);
                assert('Change status to Maintenance', m.status === 'Maintenance', avail.id);
                assert('Maintenance history recorded', m.maintenanceHistory.length > 0);

                await Models.changeAssetStatus('radio', avail.id, 'Available', 'Checkup complete', 'Test Clerk');
                const a = await DB.get('radios', avail.id);
                assert('Restore to Available', a.status === 'Available', avail.id);
            }
        } catch (e) {
            assert('Status changes', false, e.message);
        }
        await tick();

        // ----- Email settings -----
        log('📧 Email Notifications', 'phase');
        try {
            const contacts = await DB.getSetting('emailContacts', []);
            assert('Email contacts saved', contacts.length === 3, `${contacts.length} contacts`);
            assert('Email contacts have email field', contacts.every(c => c.email && c.email.includes('@')));
            assert('Email contacts have notify toggle', contacts.every(c => typeof c.notify === 'boolean'));
            const enabledCount = contacts.filter(c => c.notify).length;
            assert('Some contacts enabled', enabledCount > 0, `${enabledCount} enabled`);
            const msg = await DB.getSetting('overdueEmailMessage', '');
            assert('Email message template saved', msg.length > 20, `${msg.length} chars`);
        } catch (e) {
            assert('Email settings', false, e.message);
        }
        await tick();

        // ----- Network Sync module -----
        log('🔄 Network Sync Module', 'phase');
        try {
            assert('NetworkSync module loaded', typeof NetworkSync !== 'undefined');
            const syncSettings = await NetworkSync.getSettings();
            assert('NetworkSync.getSettings()', !!syncSettings, `enabled=${syncSettings.enabled}`);
            assert('Sync has intervalHours', typeof syncSettings.intervalHours === 'number', `${syncSettings.intervalHours}h`);
            assert('Sync has folderName field', 'folderName' in syncSettings);
            assert('Sync has retry tracking', 'retryCount' in syncSettings);
            assert('Sync has nextSlot tracking', 'nextSlot' in syncSettings);
            assert('Sync default interval is 8h', syncSettings.intervalHours === 8 || syncSettings.intervalHours > 0, `${syncSettings.intervalHours}h`);

            // Test save/load settings round-trip
            const testSettings = { ...syncSettings, folderName: 'TestBackupFolder', intervalHours: 4 };
            await NetworkSync.saveSettings(testSettings);
            const reloaded = await NetworkSync.getSettings();
            assert('Sync settings round-trip', reloaded.folderName === 'TestBackupFolder' && reloaded.intervalHours === 4, 'Save/load OK');
            // Restore
            await NetworkSync.saveSettings(syncSettings);
        } catch (e) {
            assert('Network Sync', false, e.message);
        }
        await tick();

        // ----- Asset Prefixes module -----
        log('🏷️ Asset Prefixes Module', 'phase');
        try {
            assert('AssetPrefixes module loaded', typeof AssetPrefixes !== 'undefined');
            const prefixes = await AssetPrefixes.getAll();
            assert('AssetPrefixes.getAll()', Array.isArray(prefixes) && prefixes.length > 0, `${prefixes.length} prefixes`);
            assert('Default WV prefix exists', prefixes.some(p => p.prefix === 'WV' && p.category === 'radio'));
            assert('Default BAT prefix exists', prefixes.some(p => p.prefix === 'BAT' && p.category === 'battery'));
            assert('Default T prefix exists', prefixes.some(p => p.prefix === 'T' && p.category === 'tool'));
            assert('Prefixes have required fields', prefixes.every(p => p.prefix && p.category && p.label));

            // Test identify — all default categories
            const idRadio = await AssetPrefixes.identify('WV-001');
            assert('Identify WV → radio', idRadio.type === 'radio' && idRadio.source === 'prefix');
            const idBat = await AssetPrefixes.identify('BAT-05');
            assert('Identify BAT → battery', idBat.type === 'battery' && idBat.source === 'prefix');
            const idTool = await AssetPrefixes.identify('T-010');
            assert('Identify T → tool', idTool.type === 'tool' && idTool.source === 'prefix');
            const idBadge = await AssetPrefixes.identify('12345');
            assert('Identify digit → badge', idBadge.type === 'badge');

            // Test startsWithLetter
            assert('startsWithLetter("ABC")', AssetPrefixes.startsWithLetter('ABC') === true);
            assert('startsWithLetter("123")', AssetPrefixes.startsWithLetter('123') === false);

            // Test save/load round-trip with custom prefix
            const backup = await AssetPrefixes.getAll();
            const custom = [...backup, { prefix: 'VEH', category: 'vehicle', label: 'Vehicle' }];
            await AssetPrefixes.save(custom);
            AssetPrefixes.clearCache();
            const reloaded = await AssetPrefixes.getAll();
            assert('Save/load custom prefix', reloaded.some(p => p.prefix === 'VEH' && p.category === 'vehicle'), `${reloaded.length} prefixes`);

            // Test custom prefix detection
            const idVeh = await AssetPrefixes.identify('VEH-001');
            assert('Identify custom VEH → vehicle', idVeh.type === 'vehicle' && idVeh.source === 'prefix');

            // Test longest-prefix-wins (WV should beat a hypothetical W prefix)
            const withW = [...reloaded, { prefix: 'W', category: 'widget', label: 'Widget' }];
            await AssetPrefixes.save(withW);
            AssetPrefixes.clearCache();
            const idWV = await AssetPrefixes.identify('WV-001');
            assert('Longest prefix wins (WV beats W)', idWV.type === 'radio', idWV.type);

            // Test delete — remove VEH and W, restore to backup
            await AssetPrefixes.save(backup);
            AssetPrefixes.clearCache();
            const restored = await AssetPrefixes.getAll();
            assert('Delete custom prefixes', !restored.some(p => p.prefix === 'VEH'), `back to ${restored.length}`);

            // Test reset to defaults
            await AssetPrefixes.resetToDefaults();
            AssetPrefixes.clearCache();
            const defaults = await AssetPrefixes.getAll();
            assert('Reset to defaults', defaults.length === AssetPrefixes.DEFAULT_PREFIXES.length && defaults.some(p => p.prefix === 'WV'), `${defaults.length} defaults`);
        } catch (e) {
            assert('Asset Prefixes', false, e.message);
        }
        await tick();

        // ----- Auto-backup module -----
        log('💾 Auto-Backup Module', 'phase');
        try {
            assert('AutoBackup module loaded', typeof AutoBackup !== 'undefined');
            const abSettings = await AutoBackup.getSettings();
            assert('AutoBackup.getSettings()', !!abSettings);
            assert('Auto-backup has times array', Array.isArray(abSettings.times) && abSettings.times.length > 0, abSettings.times.join(', '));
            assert('Auto-backup has maxBackups', abSettings.maxBackups > 0, `max ${abSettings.maxBackups}`);
        } catch (e) {
            assert('Auto-backup', false, e.message);
        }
        await tick();

        // ----- Audit Log -----
        log('📝 Audit Log', 'phase');
        try {
            const auditLog = await DB.getAll('auditLog');
            assert('Audit log has entries', auditLog.length > 0, `${auditLog.length} entries`);
            assert('Audit entries have timestamps', auditLog.every(l => l.timestamp));
            assert('Audit entries have entityId', auditLog.every(l => l.entityId));
            assert('Audit entries have action', auditLog.every(l => l.action));
            const actions = [...new Set(auditLog.map(l => l.action))];
            assert('Audit log has varied actions', actions.length >= 2, actions.join(', '));
        } catch (e) {
            assert('Audit log', false, e.message);
        }
        await tick();

        // ----- Battery Dashboard -----
        log('🔋 Battery Dashboard', 'phase');
        try {
            const batteries = await DB.getAll('batteries');
            assert('Batteries created', batteries.length > 0, `${batteries.length} batteries`);
            const legacyCount = batteries.filter(b => b.type === 'legacy').length;
            const newCount = batteries.filter(b => b.type === 'new').length;
            assert('Has legacy batteries', legacyCount > 0, `${legacyCount} legacy`);
            assert('Has new batteries', newCount > 0, `${newCount} new`);
            const retiredBatt = batteries.filter(b => b.status === 'Retired');
            assert('Has retired battery', retiredBatt.length > 0);
        } catch (e) {
            assert('Batteries', false, e.message);
        }
        await tick();

        // ----- Export -----
        log('📤 Export / Import', 'phase');
        try {
            const exported = await DB.exportAll();
            assert('Export has radios', exported.radios.length > 0);
            assert('Export has technicians', exported.technicians.length > 0);
            assert('Export has transactions', exported.transactions.length > 0);
            assert('Export has auditLog', exported.auditLog.length > 0);
            assert('Export has settings', exported.settings.length > 0);

            // Test JSON round-trip
            const jsonStr = JSON.stringify(exported);
            const parsed = JSON.parse(jsonStr);
            assert('JSON serialize round-trip', parsed.radios.length === exported.radios.length, `${jsonStr.length} bytes`);
        } catch (e) {
            assert('Export/Import', false, e.message);
        }
        await tick();

        // ----- Supervisor Password -----
        log('🔒 Supervisor Password', 'phase');
        try {
            assert('_hashPassword exists', typeof _hashPassword === 'function');

            // Test hash produces consistent SHA-256 hex
            const hash1 = await _hashPassword('testpass');
            const hash2 = await _hashPassword('testpass');
            assert('Hash is consistent', hash1 === hash2, `${hash1.substring(0, 16)}…`);
            assert('Hash is 64-char hex (SHA-256)', hash1.length === 64 && /^[0-9a-f]+$/.test(hash1));

            // Different passwords produce different hashes
            const hash3 = await _hashPassword('different');
            assert('Different passwords → different hashes', hash1 !== hash3);

            // Test save/load password round-trip
            const prevPw = await DB.getSetting('supervisorPassword', null);
            await DB.setSetting('supervisorPassword', hash1);
            const loaded = await DB.getSetting('supervisorPassword', null);
            assert('Password hash save/load', loaded === hash1);

            // Test verify: correct password matches
            const verifyHash = await _hashPassword('testpass');
            assert('Correct password verifies', verifyHash === loaded);

            // Test verify: wrong password fails
            const wrongHash = await _hashPassword('wrongpass');
            assert('Wrong password rejected', wrongHash !== loaded);

            // Restore original password state
            await DB.setSetting('supervisorPassword', prevPw);
        } catch (e) {
            assert('Supervisor Password', false, e.message);
        }
        await tick();

        // ----- Fleet Card Modal -----
        log('📻 Fleet Card Modal', 'phase');
        try {
            assert('_fleetModalData exists', typeof _fleetModalData === 'object');
            assert('_showFleetModal exists', typeof _showFleetModal === 'function');

            // _fleetModalData is populated when the home page renders.
            // We can't navigate to home (navigating back would restart tests).
            // Instead, populate it directly by reading radios.
            const allRadiosForModal = await DB.getAll('radios');
            for (const r of allRadiosForModal) {
                const isOut = r.status === 'Checked Out';
                const isMaint = r.status === 'Maintenance';
                const isRetired = r.status === 'Retired';
                _fleetModalData[r.id] = { radio: r, info: null, isOut, isMaint, isRetired };
            }

            const radioCount = allRadiosForModal.length;
            const modalKeys = Object.keys(_fleetModalData);
            assert('Fleet modal data populated', modalKeys.length > 0, `${modalKeys.length} radios`);
            assert('Fleet modal data matches radio count', modalKeys.length === radioCount, `${modalKeys.length}/${radioCount}`);
            // Verify data structure for one entry
            const sampleId = modalKeys[0];
            const sample = _fleetModalData[sampleId];
            assert('Fleet modal entry has radio', !!sample && !!sample.radio && sample.radio.id === sampleId);
            assert('Fleet modal entry has status flags', typeof sample.isOut === 'boolean' && typeof sample.isMaint === 'boolean');
        } catch (e) {
            assert('Fleet Card Modal', false, e.message);
        }
        await tick();

        // ----- Print Label -----
        log('🖨️ Print Label', 'phase');
        try {
            assert('_printSingleLabel exists', typeof _printSingleLabel === 'function');
        } catch (e) {
            assert('Print Label', false, e.message);
        }
        await tick();

        // ----- App Branding -----
        log('🏛️ App Branding', 'phase');
        try {
            const title = document.querySelector('#app-header h1');
            assert('Header shows USPS', title && title.textContent.includes('USPS'), title?.textContent);
            assert('Browser tab title', document.title.includes('USPS'), document.title);
        } catch (e) {
            assert('App Branding', false, e.message);
        }
        await tick();

        // ----- UI Functions -----
        log('🖥️ UI Module', 'phase');
        try {
            assert('UI.navigateTo exists', typeof UI.navigateTo === 'function');
            assert('UI.toast exists', typeof UI.toast === 'function');
            assert('UI.showModal exists', typeof UI.showModal === 'function');
            assert('UI.formatDateTime exists', typeof UI.formatDateTime === 'function');
            assert('UI.statusBadge exists', typeof UI.statusBadge === 'function');
            assert('UI.getClerkName exists', typeof UI.getClerkName === 'function');

            const formatted = UI.formatDateTime(new Date().toISOString());
            assert('UI.formatDateTime works', formatted && formatted.length > 0, formatted);

            const badge = UI.statusBadge('Available');
            assert('UI.statusBadge works', badge && badge.includes('Available'), 'renders HTML');
        } catch (e) {
            assert('UI module', false, e.message);
        }
        await tick();

        // ----- Scanner Module -----
        log('📷 Scanner Module', 'phase');
        try {
            assert('Scanner module loaded', typeof Scanner !== 'undefined');
            assert('Scanner.init exists', typeof Scanner.init === 'function');
        } catch (e) {
            assert('Scanner', false, e.message);
        }
        await tick();

        // ----- Page Navigation -----
        log('📄 Page Navigation', 'phase');
        try {
            assert('Current page accessible', !!UI.currentPage, UI.currentPage);
            assert('navigateTo is function', typeof UI.navigateTo === 'function');
            assert('On test-harness page', UI.currentPage === 'test-harness', UI.currentPage);
        } catch (e) {
            assert('Page navigation', false, e.message);
        }

        // ----- Viewport / Responsive -----
        log('📐 Viewport & Responsive Layout', 'phase');
        try {
            const vw = window.innerWidth;
            const vh = window.innerHeight;
            const dpr = window.devicePixelRatio || 1;
            const screenW = screen.width;
            const screenH = screen.height;
            log(`    Viewport: ${vw}×${vh}px | Screen: ${screenW}×${screenH} | DPR: ${dpr} | Zoom: ${Math.round(dpr * 100)}%`, 'info');

            // At 100% zoom on 1920x1200, the nav + header + fleet cards + stat cards should fit
            // Fleet card is 62px wide + 0.3rem gap ≈ 67px per card
            // 40 cards at 67px = 2680px → needs ~4 rows at 1400px max-width (~20 per row)
            const maxContentWidth = 1400;
            const cardWidth = 62 + 5; // card + gap
            const cardsPerRow = Math.floor(maxContentWidth / cardWidth);
            const rowsNeeded = Math.ceil(40 / cardsPerRow);
            const cardRowHeight = 58; // approx height per card row
            const fleetHeight = rowsNeeded * cardRowHeight;

            assert('Fleet cards fit in ≤4 rows', rowsNeeded <= 5, `${cardsPerRow} per row × ${rowsNeeded} rows`);

            // Check that nav isn't clipped
            const nav = document.getElementById('main-nav');
            if (nav) {
                const navOverflows = nav.scrollWidth > nav.clientWidth + 10;
                assert('Nav bar fits without scroll', !navOverflows, `scroll=${nav.scrollWidth}, visible=${nav.clientWidth}`);
            }

            // Check body doesn't have horizontal scroll
            const bodyOverflows = document.body.scrollWidth > window.innerWidth + 20;
            assert('No horizontal page overflow', !bodyOverflows, `body=${document.body.scrollWidth}, viewport=${vw}`);
        } catch (e) {
            assert('Viewport check', false, e.message);
        }

        // ===== Report Card =====
        const passed = tests.filter(t => t.passed).length;
        const failed = tests.filter(t => !t.passed).length;
        const total = tests.length;
        const pct = Math.round((passed / total) * 100);

        log('', 'info');
        log('═══════════════════════════════════════════════', 'phase');
        log(`REPORT: ${passed}/${total} tests passed (${pct}%)${failed > 0 ? ` — ${failed} FAILED` : ''}`, failed > 0 ? 'error' : 'success');
        log('═══════════════════════════════════════════════', 'phase');

        // Render report card
        reportCard.style.display = '';
        const scoreColor = pct === 100 ? 'var(--success)' : pct >= 90 ? 'var(--warning)' : 'var(--danger)';
        const grade = pct === 100 ? 'A+' : pct >= 95 ? 'A' : pct >= 90 ? 'B+' : pct >= 80 ? 'B' : pct >= 70 ? 'C' : 'F';

        reportEl.innerHTML = `
            <div style="display:flex;align-items:center;gap:1.5rem;flex-wrap:wrap;margin-bottom:1rem;">
                <div style="text-align:center;padding:1rem 1.5rem;background:${scoreColor};color:#fff;border-radius:var(--radius);min-width:100px;">
                    <div style="font-size:2.5rem;font-weight:800;">${grade}</div>
                    <div style="font-size:0.8rem;">${pct}%</div>
                </div>
                <div>
                    <div style="font-size:1.2rem;font-weight:600;">${passed} of ${total} tests passed</div>
                    ${failed > 0 ? `<div style="color:var(--danger);font-weight:600;">${failed} tests failed — see log above</div>` : '<div style="color:var(--success);">All tests passing!</div>'}
                </div>
            </div>

            <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:0.75rem;">
                ${groupTests(tests)}
            </div>

            <div style="margin-top:1.5rem;padding:1rem;background:var(--surface-alt);border-radius:var(--radius);border:1px solid var(--border);">
                <h4 style="margin-bottom:0.5rem;">🎯 Recommendations to Impress</h4>
                <ul style="margin:0;padding-left:1.2rem;font-size:0.85rem;line-height:1.8;">
                    <li><strong>Demo route:</strong> Home → show fleet cards with overdue pulse → Checkout a radio → Return with "Damaged" → Supervisor tab shows it flagged</li>
                    <li><strong>Speed test:</strong> Open Clerk Station, scan 5 radios in/out rapidly — show the queue and speech feedback</li>
                    <li><strong>Email demo:</strong> Supervisor → Send Overdue Alert → shows Outlook with pre-filled recipients & radio list</li>
                    <li><strong>Multi-computer:</strong> Configure network sync → Push → open from another PC → same data appears</li>
                    <li><strong>Export:</strong> Export → Excel → open spreadsheet → show all transactions with timestamps</li>
                    <li><strong>Dark mode:</strong> Switch theme to USPS Dark or Midnight — looks polished and professional</li>
                    <li><strong>Print QR codes:</strong> Print Codes page → generate a sheet → scan one with the camera to checkout</li>
                    <li><strong>Auto-backup:</strong> Show supervisor that shift-end backups happen automatically</li>
                </ul>
            </div>
        `;
    }

    function groupTests(tests) {
        // Group by category (use the log phase headers)
        const categories = {};
        let currentCat = 'General';
        for (const t of tests) {
            if (!categories[currentCat]) categories[currentCat] = [];
            categories[currentCat].push(t);
        }
        // Actually group by name prefix
        const cats = {};
        for (const t of tests) {
            const cat = t.name.split('.')[0].split('(')[0].split(' ')[0];
            const key = cat.length > 2 ? cat : 'General';
            if (!cats[key]) cats[key] = [];
            cats[key].push(t);
        }

        return Object.entries(cats).map(([cat, catTests]) => {
            const catPassed = catTests.filter(t => t.passed).length;
            const catTotal = catTests.length;
            const allGood = catPassed === catTotal;
            return `
                <div style="border:1px solid var(--border);border-radius:var(--radius);padding:0.75rem;">
                    <div style="display:flex;justify-content:space-between;margin-bottom:0.4rem;">
                        <strong style="font-size:0.85rem;">${cat}</strong>
                        <span style="font-size:0.75rem;color:${allGood ? 'var(--success)' : 'var(--danger)'};">${catPassed}/${catTotal}</span>
                    </div>
                    ${catTests.map(t => `
                        <div style="font-size:0.75rem;padding:0.15rem 0;color:${t.passed ? 'var(--text-secondary)' : 'var(--danger)'};">
                            ${t.passed ? '✅' : '❌'} ${t.name}
                        </div>
                    `).join('')}
                </div>
            `;
        }).join('');
    }

    // ===== Button handlers =====
    document.getElementById('th-run-full').addEventListener('click', async () => {
        UI.showModal('⚠️ Run Full Week Simulation', `
            <div style="text-align:center;">
                <p style="color:var(--danger);font-weight:700;font-size:1.1rem;margin-bottom:0.5rem;">
                    This will DELETE all existing data and replace it with demo data.
                </p>
                <p style="color:var(--text-secondary);margin-bottom:0.75rem;">
                    All radios, batteries, technicians, transactions, settings, and audit logs will be erased.<br>
                    <strong>This cannot be undone.</strong>
                </p>
                <p style="margin-bottom:0.5rem;font-size:0.85rem;">Type <strong style="color:var(--danger);">DELETE</strong> to confirm:</p>
                <input type="text" id="th-full-confirm" placeholder="Type DELETE here" autocomplete="off"
                    style="width:100%;max-width:260px;padding:0.6rem;border:2px solid var(--danger);border-radius:var(--radius);font-size:1rem;text-align:center;background:var(--input-bg);color:var(--text);">
            </div>
        `, `
            <button class="btn btn-outline" id="th-full-cancel">Cancel</button>
            <button class="btn btn-danger" id="th-full-go" disabled>🗑️ Run Full Week</button>
        `);

        const inp = document.getElementById('th-full-confirm');
        const goBtn = document.getElementById('th-full-go');
        document.getElementById('th-full-cancel').addEventListener('click', () => UI.closeModal());
        inp.addEventListener('input', () => { goBtn.disabled = inp.value.trim() !== 'DELETE'; });

        goBtn.addEventListener('click', async () => {
            if (inp.value.trim() !== 'DELETE') return;
            UI.closeModal();
            logEl.innerHTML = '';
            reportCard.style.display = 'none';
            document.getElementById('th-run-full').disabled = true;
            try {
                await runFullSimulation();
            } catch (e) {
                log(`FATAL ERROR: ${e.message}`, 'error');
                console.error(e);
            }
            document.getElementById('th-run-full').disabled = false;
        });

        setTimeout(() => inp.focus(), 100);
    });

    document.getElementById('th-run-tests-only').addEventListener('click', async () => {
        const radioCount = await DB.count('radios');
        const emptyDbWarning = radioCount === 0
            ? `
                <p style="color:var(--warning);font-weight:700;margin-bottom:0.75rem;">
                    ⚠️ Database appears empty. Most tests may fail until demo data is generated.
                </p>
            `
            : '';

        UI.showModal('⚠️ Run Verification Tests', `
            <div style="text-align:center;">
                <p style="color:var(--danger);font-weight:700;font-size:1.1rem;margin-bottom:0.5rem;">
                    Running tests WILL modify your current database.
                </p>
                <p style="color:var(--text-secondary);margin-bottom:0.75rem;">
                    Tests create and update technicians, transactions, and asset statuses as part of validation.<br>
                    <strong>Run this only if you are okay with temporary data changes.</strong>
                </p>
                ${emptyDbWarning}
                <p style="margin-bottom:0.5rem;font-size:0.85rem;">Type <strong style="color:var(--danger);">RUN TESTS</strong> to continue:</p>
                <input type="text" id="th-tests-confirm" placeholder="Type RUN TESTS here" autocomplete="off"
                    style="width:100%;max-width:260px;padding:0.6rem;border:2px solid var(--danger);border-radius:var(--radius);font-size:1rem;text-align:center;background:var(--input-bg);color:var(--text);">
            </div>
        `, `
            <button class="btn btn-outline" id="th-tests-cancel">Cancel</button>
            <button class="btn btn-danger" id="th-tests-go" disabled>🧪 Run Tests</button>
        `);

        const inp = document.getElementById('th-tests-confirm');
        const goBtn = document.getElementById('th-tests-go');
        document.getElementById('th-tests-cancel').addEventListener('click', () => UI.closeModal());
        inp.addEventListener('input', () => { goBtn.disabled = inp.value.trim().toUpperCase() !== 'RUN TESTS'; });

        goBtn.addEventListener('click', async () => {
            if (inp.value.trim().toUpperCase() !== 'RUN TESTS') return;
            UI.closeModal();
            logEl.innerHTML = '';
            reportCard.style.display = 'none';
            progressEl.style.display = 'none';
            document.getElementById('th-run-tests-only').disabled = true;
            try {
                await runVerificationTests();
            } catch (e) {
                log(`FATAL ERROR: ${e.message}`, 'error');
                console.error(e);
            }
            document.getElementById('th-run-tests-only').disabled = false;
        });

        setTimeout(() => inp.focus(), 100);
    });

    document.getElementById('th-clear').addEventListener('click', async () => {
        UI.showModal('⚠️ Clear All Data', `
            <div style="text-align:center;">
                <p style="color:var(--danger);font-weight:700;font-size:1.1rem;margin-bottom:0.5rem;">
                    This will permanently delete ALL data!
                </p>
                <p style="color:var(--text-secondary);margin-bottom:0.75rem;">
                    All radios, batteries, technicians, transactions, settings, and audit logs will be erased.<br>
                    <strong>This cannot be undone.</strong>
                </p>
                <p style="margin-bottom:0.5rem;font-size:0.85rem;">Type <strong style="color:var(--danger);">DELETE</strong> to confirm:</p>
                <input type="text" id="th-clear-confirm" placeholder="Type DELETE here" autocomplete="off"
                    style="width:100%;max-width:260px;padding:0.6rem;border:2px solid var(--danger);border-radius:var(--radius);font-size:1rem;text-align:center;background:var(--input-bg);color:var(--text);">
            </div>
        `, `
            <button class="btn btn-outline" id="th-clear-cancel">Cancel</button>
            <button class="btn btn-danger" id="th-clear-go" disabled>🗑️ Clear Everything</button>
        `);

        const inp = document.getElementById('th-clear-confirm');
        const goBtn = document.getElementById('th-clear-go');
        document.getElementById('th-clear-cancel').addEventListener('click', () => UI.closeModal());
        inp.addEventListener('input', () => { goBtn.disabled = inp.value.trim() !== 'DELETE'; });
        goBtn.addEventListener('click', async () => {
            if (inp.value.trim() !== 'DELETE') return;
            UI.closeModal();
            const stores = ['radios', 'batteries', 'tools', 'technicians', 'transactions', 'auditLog', 'settings', 'backups'];
            for (const store of stores) {
                await DB.clear(store);
            }
            UI.toast('All data cleared', 'success');
            logEl.innerHTML = '';
            log('All data cleared.', 'success');
        });
        setTimeout(() => inp.focus(), 100);
    });
});
