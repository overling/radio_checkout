/**
 * Clerk Station — Handheld scanner page for fast check-in/check-out.
 *
 * Smart scan detection:
 *   • If scanned value starts with "wv" (case-insensitive) → it's a radio
 *   • If scanned value matches a known radio ID in the DB → it's a radio
 *   • Otherwise → it's a badge
 *
 * Flows:
 *   RETURN: Scan a checked-out radio → auto-return (one scan, done)
 *   CHECKOUT: Scan radio + badge in ANY order → auto-checkout when both present
 *
 * The clerk never has to pick a mode or click a button — just scan, scan, scan.
 */
UI.registerPage('clerk-station', async (container) => {
    let scannedRadio = null;   // { id, radio, status }
    let scannedBadge = null;   // badge ID string
    let processing = false;    // true only during async DB writes
    let displayTimer = null;   // timer for success/error display reset
    let pageActive = true;
    const promptNameSaved = await DB.getSetting('promptNewTechName', true);

    container.innerHTML = `
        <h2 class="page-title">🖥️ Clerk Station</h2>
        <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:0.5rem; margin-bottom:0.5rem;">
            <p class="cs-subtitle" style="margin:0;">Just scan — the system figures out the rest.</p>
            <label style="display:flex; align-items:center; gap:0.4rem; cursor:pointer; font-size:0.8rem; color:var(--text-secondary);">
                <input type="checkbox" id="cs-prompt-name" ${promptNameSaved ? 'checked' : ''}
                       style="width:16px; height:16px; accent-color:var(--primary); cursor:pointer;">
                🪪 Prompt for name on new badges
            </label>
        </div>

        <div class="cs-layout">
            <div class="cs-main">
                <!-- Scan input -->
                <div class="cs-scan-row">
                    <input type="text" id="cs-input" class="scan-input-lg scan-target"
                           placeholder="Scan any radio or badge..." autofocus autocomplete="off">
                </div>

                <!-- Two boxes side by side -->
                <div class="cs-boxes">
                    <div id="cs-radio-box" class="cs-box cs-box-empty">
                        <div class="cs-box-label">📻 Radio</div>
                        <div id="cs-radio-value" class="cs-box-value">—</div>
                        <div id="cs-radio-detail" class="cs-box-detail"></div>
                    </div>
                    <div id="cs-badge-box" class="cs-box cs-box-empty">
                        <div class="cs-box-label">🪪 Badge</div>
                        <div id="cs-badge-value" class="cs-box-value">—</div>
                        <div id="cs-badge-detail" class="cs-box-detail"></div>
                    </div>
                </div>

                <!-- Status banner -->
                <div id="cs-status" class="qs-status qs-status-ready">
                    <div id="cs-status-icon" class="qs-status-icon">🔍</div>
                    <div class="qs-status-body">
                        <div id="cs-status-text" class="qs-status-text">Ready — scan a radio or badge</div>
                        <div id="cs-status-sub" class="qs-status-sub"></div>
                    </div>
                </div>

                <!-- Clear / reset -->
                <div style="text-align:center; margin-top:0.75rem;">
                    <button class="btn btn-outline btn-sm" id="cs-clear-btn">Clear &amp; Reset</button>
                </div>
            </div>

            <!-- Activity sidebar -->
            <div class="qs-sidebar">
                <h3 class="qs-sidebar-title">Session Log</h3>
                <div id="cs-activity-log" class="qs-activity-log">
                    <div class="qs-activity-empty">No activity yet. Start scanning!</div>
                </div>
            </div>
        </div>
    `;

    // Persist prompt-for-name preference (shared across all scan pages)
    document.getElementById('cs-prompt-name').addEventListener('change', async (e) => {
        await DB.setSetting('promptNewTechName', e.target.checked);
    });

    const input = document.getElementById('cs-input');
    const radioBox = document.getElementById('cs-radio-box');
    const badgeBox = document.getElementById('cs-badge-box');
    const radioValue = document.getElementById('cs-radio-value');
    const badgeValue = document.getElementById('cs-badge-value');
    const radioDetail = document.getElementById('cs-radio-detail');
    const badgeDetail = document.getElementById('cs-badge-detail');
    const statusEl = document.getElementById('cs-status');
    const statusIcon = document.getElementById('cs-status-icon');
    const statusText = document.getElementById('cs-status-text');
    const statusSub = document.getElementById('cs-status-sub');
    const activityLog = document.getElementById('cs-activity-log');
    let activityEntries = [];

    // ===== HELPERS =====

    function setStatus(type, icon, text, sub) {
        statusEl.className = 'qs-status qs-status-' + type;
        statusIcon.textContent = icon;
        statusText.textContent = text;
        statusSub.innerHTML = sub || '';
    }

    function resetState() {
        scannedRadio = null;
        scannedBadge = null;
        processing = false;
        if (displayTimer) { clearTimeout(displayTimer); displayTimer = null; }
        radioBox.className = 'cs-box cs-box-empty';
        badgeBox.className = 'cs-box cs-box-empty';
        radioValue.textContent = '—';
        badgeValue.textContent = '—';
        radioDetail.textContent = '';
        badgeDetail.textContent = '';
        setStatus('ready', '🔍', 'Ready — scan a radio or badge', '');
        input.value = '';
        input.focus();
    }

    function addActivity(icon, text, detail) {
        const time = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        activityEntries.unshift({ icon, text, detail, time });
        if (activityEntries.length > 50) activityEntries.pop();
        renderActivity();
    }

    function renderActivity() {
        if (activityEntries.length === 0) {
            activityLog.innerHTML = '<div class="qs-activity-empty">No activity yet. Start scanning!</div>';
            return;
        }
        activityLog.innerHTML = activityEntries.map(e => `
            <div class="qs-activity-item">
                <span class="qs-activity-icon">${e.icon}</span>
                <div class="qs-activity-content">
                    <div class="qs-activity-text">${e.text}</div>
                    ${e.detail ? `<div class="qs-activity-detail">${e.detail}</div>` : ''}
                </div>
                <span class="qs-activity-time">${e.time}</span>
            </div>
        `).join('');
    }

    // ===== MAIN SCAN HANDLER =====
    async function handleScan(value) {
        value = value.trim();
        if (!value || processing) return;
        // If a display timer is running (success/error showing), reset immediately for the new scan
        if (displayTimer) { resetState(); }
        input.value = '';

        // Smart detect using configurable prefixes
        const scanResult = await AssetPrefixes.identify(value);

        if (scanResult.type === 'radio') {
            await handleRadioScanned(value);
        } else if (scanResult.type === 'badge') {
            await handleBadgeScanned(value);
        } else {
            // battery, tool, or other asset category — show info
            setStatus('info', '📦', `Asset detected: ${scanResult.type}`, `ID: ${value} (${scanResult.source} match)`);
            addActivity('📦', `Scanned ${scanResult.type}: ${value}`, scanResult.source);
            displayTimer = setTimeout(resetState, 3000);
        }
    }

    // ===== RADIO SCANNED =====
    async function handleRadioScanned(value) {
        const radio = await DB.get('radios', value);

        if (!radio) {
            setStatus('error', '❌', `Radio "${value}" not found`, 'Add it in Assets first.');
            addActivity('❌', `Unknown: ${value}`, 'Not in system');
            radioBox.className = 'cs-box cs-box-error';
            radioValue.textContent = value;
            radioDetail.textContent = 'Not found';
            setTimeout(resetState, 3000);
            return;
        }

        // Populate radio box
        scannedRadio = { id: radio.id, radio, status: radio.status };
        radioBox.className = 'cs-box cs-box-filled';
        radioValue.textContent = radio.id;
        radioDetail.textContent = `${radio.model || ''} — ${radio.status}`;

        // If radio is checked out → instant return
        if (radio.status === 'Checked Out') {
            await performReturn(radio);
            return;
        }

        // If radio is available → need badge too
        if (radio.status === 'Available') {
            if (scannedBadge) {
                // Badge was already scanned — complete checkout
                await performCheckout(radio.id, scannedBadge);
            } else {
                setStatus('pending', '📤', `${radio.id} ready — now scan badge`, radio.model ? `Model: ${radio.model}` : 'Waiting for technician badge...');
            }
            return;
        }

        // Other statuses (Maintenance, Retired, etc.)
        setStatus('error', '⚠️', `${radio.id} is ${radio.status}`, 'Cannot check in or out.');
        addActivity('⚠️', `${radio.id}: ${radio.status}`, 'No action');
        setTimeout(resetState, 3000);
    }

    // ===== BADGE SCANNED =====
    async function handleBadgeScanned(value) {
        scannedBadge = value;

        // Look up technician for display
        const tech = await DB.get('technicians', value);
        const displayName = tech ? (tech.name || tech.badgeId) : value;

        badgeBox.className = 'cs-box cs-box-filled';
        badgeValue.textContent = displayName;
        badgeDetail.textContent = tech ? (tech.department || 'Badge: ' + value) : 'New badge — will auto-register';

        // If radio already scanned and available → complete checkout
        if (scannedRadio && scannedRadio.status === 'Available') {
            await performCheckout(scannedRadio.id, value);
            return;
        }

        // No radio yet — waiting
        if (!scannedRadio) {
            setStatus('pending', '🪪', `${displayName} ready — now scan radio`, 'Waiting for radio scan...');
        }
    }

    // ===== PERFORM CHECKOUT =====
    async function performCheckout(radioId, badgeId) {
        processing = true;
        setStatus('processing', '⏳', 'Processing checkout...', '');

        try {
            const result = await Models.checkoutRadio(radioId, badgeId, UI.getClerkName());
            const techName = result.technician.name || badgeId;

            radioBox.className = 'cs-box cs-box-success';
            badgeBox.className = 'cs-box cs-box-success';
            radioDetail.textContent = 'Checked out';
            setStatus('success', '✅', `${radioId} → ${techName}`, 'Checked out successfully');
            addActivity('📤', `${radioId} → ${techName}`, `Clerk: ${UI.getClerkName()}`);
            UI.toast(`Checked out: ${radioId} → ${techName}`, 'success');
            Scanner.speak('Checked out');
            processing = false;

            // Prompt for name if new technician, then reset
            if (result.techIsNew) {
                const updated = await UI.promptNewTechName(badgeId);
                if (updated) {
                    badgeValue.textContent = updated.name || badgeId;
                    setStatus('success', '✅', `${radioId} → ${updated.name || badgeId}`, 'Checked out successfully');
                }
            }
            displayTimer = setTimeout(resetState, 2500);
        } catch (err) {
            setStatus('error', '❌', 'Checkout failed', err.message);
            addActivity('❌', `Checkout failed: ${radioId}`, err.message);
            UI.toast(err.message, 'error', 5000);
            processing = false;
            displayTimer = setTimeout(resetState, 4000);
        }
    }

    // ===== PERFORM RETURN =====
    async function performReturn(radio) {
        processing = true;

        // Get who had it before we return it
        const checkoutInfo = await Models.getRadioCheckoutInfo(radio.id);
        const techName = checkoutInfo ? (checkoutInfo.technicianName || checkoutInfo.technicianId) : '';

        setStatus('processing', '⏳', `Returning ${radio.id}...`, techName ? `From: ${techName}` : '');

        // Show the tech in the badge box
        if (techName) {
            badgeBox.className = 'cs-box cs-box-filled';
            badgeValue.textContent = techName;
            badgeDetail.textContent = 'Auto-detected from checkout';
        }

        try {
            const result = await Models.returnRadio(radio.id, 'Good', UI.getClerkName(), '');

            radioBox.className = 'cs-box cs-box-success';
            badgeBox.className = 'cs-box cs-box-success';
            radioDetail.textContent = 'Returned — Available';

            if (result.flagForSupervisor) {
                setStatus('warning', '⚠️', `${radio.id} returned — flagged`, 'Moved to Maintenance');
                addActivity('⚠️', `${radio.id} returned (flagged)`, techName ? `From: ${techName}` : '');
            } else {
                setStatus('success', '✅', `${radio.id} returned`, techName ? `From: ${techName}` : 'Now Available');
                addActivity('📥', `${radio.id} returned`, techName ? `From: ${techName} | Clerk: ${UI.getClerkName()}` : `Clerk: ${UI.getClerkName()}`);
            }

            UI.toast(`Returned: ${radio.id}`, 'success');
            Scanner.speak('Checked in');
            processing = false;
            displayTimer = setTimeout(resetState, 2500);
        } catch (err) {
            setStatus('error', '❌', 'Return failed', err.message);
            addActivity('❌', `Return failed: ${radio.id}`, err.message);
            UI.toast(err.message, 'error', 5000);
            processing = false;
            displayTimer = setTimeout(resetState, 4000);
        }
    }

    // ===== INPUT HANDLING =====
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleScan(input.value);
        }
    });

    // ===== USB SCANNER LISTENER =====
    Scanner.startKeyboardListener((scanned) => {
        handleScan(scanned);
    });

    // ===== CLEAR BUTTON =====
    document.getElementById('cs-clear-btn').addEventListener('click', resetState);

    // ===== KEEP FOCUS ON INPUT =====
    // If clerk clicks anywhere on the page, refocus the input so the next scan goes in
    container.addEventListener('click', (e) => {
        if (e.target.tagName !== 'BUTTON' && !processing) {
            input.focus();
        }
    });

    // ===== CLEANUP =====
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            if (btn.dataset.page !== 'clerk-station') {
                pageActive = false;
            }
        });
    });

    input.focus();
});
