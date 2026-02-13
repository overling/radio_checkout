/**
 * Quick Scan Page — Unified fast check-in/check-out station.
 *
 * Modes:
 *   AUTO   — Scan radio: if Available → checkout flow (scan badge next).
 *                         if Checked Out → auto-return with 5s cooldown.
 *   OUT    — Force checkout mode (spacebar or button toggle).
 *   IN     — Force check-in mode (spacebar or button toggle).
 *
 * Features:
 *   • Spacebar toggles between OUT / IN / AUTO modes
 *   • Self-service camera mode (stays open, scans continuously)
 *   • USB scanner support (just scan into the focused input)
 *   • 5-second cooldown before a just-checked-out radio can be returned
 *   • Activity log on screen for shift-change visibility
 */
UI.registerPage('quick-scan', async (container) => {
    const MODES = ['AUTO', 'OUT', 'IN'];
    const MODE_LABELS = { AUTO: '🔄 AUTO DETECT', OUT: '📤 CHECK OUT', IN: '📥 CHECK IN' };
    const MODE_COLORS = { AUTO: 'var(--primary)', OUT: 'var(--warning)', IN: 'var(--success)' };
    let currentMode = 'AUTO';
    let scanPhase = 'radio'; // 'radio', 'badge', or 'radio-after-badge'
    let pendingRadioId = null;
    let pendingRadio = null;
    let pendingBadgeId = null;
    let processing = false;    // true only during async DB writes
    let displayTimer = null;   // timer for success/error display reset
    let cooldownTimers = {}; // radioId -> expiry timestamp
    let selfServiceCamera = false;
    let pageActive = true;
    const promptNameSaved = await DB.getSetting('promptNewTechName', true);

    container.innerHTML = `
        <div class="qs-layout">
            <div class="qs-main">
                <!-- Mode toggle -->
                <div class="qs-mode-bar">
                    <button class="qs-mode-btn" data-mode="OUT" title="Force Check Out mode">
                        📤 CHECK OUT
                    </button>
                    <button class="qs-mode-btn qs-mode-active" data-mode="AUTO" title="Auto-detect check in or out">
                        🔄 AUTO
                    </button>
                    <button class="qs-mode-btn" data-mode="IN" title="Force Check In mode">
                        📥 CHECK IN
                    </button>
                </div>
                <div class="qs-mode-hint" style="display:flex; align-items:center; justify-content:center; flex-wrap:wrap; gap:0.5rem;">
                    <span>Press <kbd>Space</kbd> to cycle modes &nbsp;|&nbsp; Current: <strong id="qs-mode-label">🔄 AUTO DETECT</strong></span>
                    <label style="display:flex; align-items:center; gap:0.3rem; cursor:pointer; font-size:0.8rem; color:var(--text-secondary); margin-left:1rem;">
                        <input type="checkbox" id="qs-prompt-name" ${promptNameSaved ? 'checked' : ''}
                               style="width:14px; height:14px; accent-color:var(--primary); cursor:pointer;">
                        🪪 Prompt names
                    </label>
                </div>

                <!-- Status banner -->
                <div id="qs-status" class="qs-status qs-status-ready">
                    <div id="qs-status-icon" class="qs-status-icon">📻</div>
                    <div class="qs-status-body">
                        <div id="qs-status-text" class="qs-status-text">Ready — Scan a radio</div>
                        <div id="qs-status-sub" class="qs-status-sub"></div>
                    </div>
                </div>

                <!-- Countdown timer display -->
                <div id="qs-countdown" class="qs-countdown" style="display:none;">
                    <div id="qs-countdown-bar" class="qs-countdown-bar"></div>
                    <div id="qs-countdown-text" class="qs-countdown-text"></div>
                </div>

                <!-- Scan input -->
                <div class="qs-scan-area">
                    <div class="scan-input-group" style="max-width:500px; margin:0 auto;">
                        <input type="text" id="qs-input" class="scan-input-lg scan-target"
                               placeholder="Scan radio or badge here..." autofocus autocomplete="off">
                        <button class="btn btn-outline" id="qs-camera-btn" title="Toggle self-service camera">📷</button>
                    </div>
                </div>

                <!-- Inline camera (self-service mode) -->
                <div id="qs-camera-container" style="display:none;">
                    <div class="qs-camera-wrapper">
                        <div id="qs-inline-camera"></div>
                        <button class="btn btn-sm btn-danger" id="qs-camera-stop" style="margin-top:0.5rem;">Stop Camera</button>
                    </div>
                </div>
            </div>

            <!-- Activity sidebar -->
            <div class="qs-sidebar">
                <h3 class="qs-sidebar-title">Session Activity</h3>
                <div id="qs-activity-log" class="qs-activity-log">
                    <div class="qs-activity-empty">No activity yet. Start scanning!</div>
                </div>
            </div>
        </div>
    `;

    // Persist prompt-for-name preference (shared across all scan pages)
    document.getElementById('qs-prompt-name').addEventListener('change', async (e) => {
        await DB.setSetting('promptNewTechName', e.target.checked);
    });

    const input = document.getElementById('qs-input');
    const statusEl = document.getElementById('qs-status');
    const statusIcon = document.getElementById('qs-status-icon');
    const statusText = document.getElementById('qs-status-text');
    const statusSub = document.getElementById('qs-status-sub');
    const activityLog = document.getElementById('qs-activity-log');
    const countdownEl = document.getElementById('qs-countdown');
    const countdownBar = document.getElementById('qs-countdown-bar');
    const countdownText = document.getElementById('qs-countdown-text');
    let activityEntries = [];

    // ===== MODE MANAGEMENT =====
    function setMode(mode) {
        currentMode = mode;
        document.querySelectorAll('.qs-mode-btn').forEach(b => {
            b.classList.toggle('qs-mode-active', b.dataset.mode === mode);
        });
        document.getElementById('qs-mode-label').innerHTML = MODE_LABELS[mode];
        statusEl.style.borderLeftColor = MODE_COLORS[mode];
        resetState();
    }

    function cycleMode() {
        const idx = MODES.indexOf(currentMode);
        setMode(MODES[(idx + 1) % MODES.length]);
    }

    container.querySelectorAll('.qs-mode-btn').forEach(btn => {
        btn.addEventListener('click', () => setMode(btn.dataset.mode));
    });

    // ===== STATE MANAGEMENT =====
    function resetState() {
        scanPhase = 'radio';
        pendingRadioId = null;
        pendingRadio = null;
        pendingBadgeId = null;
        processing = false;
        if (displayTimer) { clearTimeout(displayTimer); displayTimer = null; }
        setStatus('ready', '📻', 'Ready — Scan a radio', '');
        input.value = '';
        input.placeholder = 'Scan radio or badge here...';
        input.focus();
    }

    function setStatus(type, icon, text, sub) {
        statusEl.className = 'qs-status qs-status-' + type;
        statusIcon.textContent = icon;
        statusText.textContent = text;
        statusSub.innerHTML = sub || '';
    }

    // ===== COOLDOWN MANAGEMENT =====
    function startCooldown(radioId, seconds) {
        const expiry = Date.now() + (seconds * 1000);
        cooldownTimers[radioId] = expiry;

        countdownEl.style.display = 'block';
        const total = seconds * 1000;
        const tick = () => {
            const remaining = cooldownTimers[radioId] - Date.now();
            if (remaining <= 0 || !pageActive) {
                delete cooldownTimers[radioId];
                countdownEl.style.display = 'none';
                return;
            }
            const pct = (remaining / total) * 100;
            countdownBar.style.width = pct + '%';
            countdownText.textContent = `⏳ ${radioId} cooldown: ${Math.ceil(remaining / 1000)}s before it can be checked back in`;
            requestAnimationFrame(tick);
        };
        tick();
    }

    function isOnCooldown(radioId) {
        if (!cooldownTimers[radioId]) return false;
        if (Date.now() >= cooldownTimers[radioId]) {
            delete cooldownTimers[radioId];
            return false;
        }
        return true;
    }

    // ===== ACTIVITY LOG =====
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

        // If we're in badge-scan phase (checkout flow), treat this as a badge
        if (scanPhase === 'badge') {
            await handleBadgeScan(value);
            return;
        }

        // If badge was scanned first and now we're waiting for a radio
        if (scanPhase === 'radio-after-badge') {
            await handleRadioAfterBadge(value);
            return;
        }

        // Smart detect using configurable prefixes
        const scanResult = await AssetPrefixes.identify(value);

        if (scanResult.type === 'radio') {
            await handleRadioScan(value);
        } else if (scanResult.type === 'badge') {
            if (currentMode === 'IN') {
                setStatus('error', '🪪', 'Badge not needed for check-in', 'Just scan the radio to return it.');
                setTimeout(resetState, 2500);
                return;
            }
            await handleBadgeFirst(value);
        } else {
            // battery, tool, or other asset — show info
            setStatus('info', '📦', `Asset detected: ${scanResult.type}`, `ID: ${value} (${scanResult.source} match)`);
            addActivity('📦', `Scanned ${scanResult.type}: ${value}`, scanResult.source);
            displayTimer = setTimeout(resetState, 3000);
        }
    }

    // Badge scanned first (before a radio) — park it and wait for radio
    async function handleBadgeFirst(value) {
        const tech = await DB.get('technicians', value);
        const displayName = tech ? (tech.name || tech.badgeId) : value;
        pendingBadgeId = value;
        scanPhase = 'radio-after-badge';
        setStatus('pending', '🪪', `${displayName} — Now scan radio`, 'Badge scanned first. Scan the radio to check out.');
        input.placeholder = 'Scan radio to complete checkout...';
        input.focus();
    }

    // Radio scanned after badge was already parked — complete checkout directly
    async function handleRadioAfterBadge(value) {
        const radio = await DB.get('radios', value);

        if (!radio) {
            setStatus('error', '❌', `Radio "${value}" not found`, 'Add it in Asset Management first.');
            addActivity('❌', `Unknown radio: ${value}`, 'Not found in system');
            setTimeout(resetState, 3000);
            return;
        }

        if (radio.status !== 'Available') {
            setStatus('error', '⚠️', `${radio.id} is ${radio.status}`, 'Only Available radios can be checked out.');
            addActivity('⚠️', `${radio.id}: ${radio.status}`, 'Cannot check out');
            setTimeout(resetState, 3000);
            return;
        }

        // We have badge + available radio — checkout immediately
        pendingRadioId = radio.id;
        await handleBadgeScan(pendingBadgeId);
    }

    async function handleRadioScan(value) {
        const radio = await DB.get('radios', value);

        if (!radio) {
            setStatus('error', '❌', `Radio "${value}" not found`, 'Add it in Asset Management first.');
            addActivity('❌', `Unknown radio: ${value}`, 'Not found in system');
            setTimeout(resetState, 3000);
            return;
        }

        // Determine action based on mode and radio status
        if (currentMode === 'AUTO') {
            if (radio.status === 'Available') {
                await startCheckoutFlow(radio);
            } else if (radio.status === 'Checked Out') {
                await autoReturn(radio);
            } else {
                setStatus('error', '⚠️', `${radio.id} is ${radio.status}`, 'Cannot check in or out.');
                addActivity('⚠️', `${radio.id}: ${radio.status}`, 'No action taken');
                setTimeout(resetState, 3000);
            }
        } else if (currentMode === 'OUT') {
            if (radio.status !== 'Available') {
                setStatus('error', '⚠️', `${radio.id} is ${radio.status}`, 'Only Available radios can be checked out.');
                addActivity('⚠️', `${radio.id}: ${radio.status}`, 'Cannot check out');
                setTimeout(resetState, 3000);
                return;
            }
            await startCheckoutFlow(radio);
        } else if (currentMode === 'IN') {
            if (radio.status !== 'Checked Out') {
                setStatus('error', '⚠️', `${radio.id} is ${radio.status}`, 'Only Checked Out radios can be returned.');
                addActivity('⚠️', `${radio.id}: ${radio.status}`, 'Cannot check in');
                setTimeout(resetState, 3000);
                return;
            }
            await autoReturn(radio);
        }
    }

    // ===== CHECKOUT FLOW =====
    async function startCheckoutFlow(radio) {
        pendingRadioId = radio.id;
        pendingRadio = radio;
        scanPhase = 'badge';
        setStatus('pending', '📤', `${radio.id} — Now scan technician badge`, radio.model ? `Model: ${radio.model}` : '');
        input.placeholder = 'Scan badge to complete checkout...';
        input.focus();
    }

    async function handleBadgeScan(badgeId) {
        if (!pendingRadioId) { resetState(); return; }

        processing = true;
        setStatus('processing', '⏳', 'Processing checkout...', '');

        try {
            const result = await Models.checkoutRadio(pendingRadioId, badgeId, UI.getClerkName());
            const techName = result.technician.name || badgeId;

            setStatus('success', '✅', `${pendingRadioId} → ${techName}`, 'Checked out successfully');
            addActivity('📤', `${pendingRadioId} → ${techName}`, `Clerk: ${UI.getClerkName()}`);
            UI.toast(`Checked out: ${pendingRadioId} → ${techName}`, 'success');
            Scanner.speak('Checked out');

            // Start cooldown so this radio can't be instantly returned
            startCooldown(pendingRadioId, 5);

            // Unlock scanning
            processing = false;

            // Prompt for name if new technician, then auto-reset
            if (result.techIsNew) {
                await UI.promptNewTechName(badgeId);
            }
            displayTimer = setTimeout(resetState, 2000);
        } catch (err) {
            setStatus('error', '❌', 'Checkout failed', err.message);
            addActivity('❌', `Checkout failed: ${pendingRadioId}`, err.message);
            UI.toast(err.message, 'error', 5000);
            processing = false;
            displayTimer = setTimeout(resetState, 4000);
        }
    }

    // ===== AUTO RETURN =====
    async function autoReturn(radio) {
        // Check cooldown
        if (isOnCooldown(radio.id)) {
            const remaining = Math.ceil((cooldownTimers[radio.id] - Date.now()) / 1000);
            setStatus('error', '⏳', `${radio.id} — Cooldown active`, `Wait ${remaining}s before checking this radio back in.`);
            input.focus();
            displayTimer = setTimeout(resetState, 2000);
            return;
        }

        processing = true;

        // Get checkout info BEFORE the return so we know who had it
        const checkoutInfo = await Models.getRadioCheckoutInfo(radio.id);
        const techName = checkoutInfo ? (checkoutInfo.technicianName || checkoutInfo.technicianId) : '';

        setStatus('processing', '⏳', `Returning ${radio.id}...`, techName ? `From: ${techName}` : '');

        try {
            const result = await Models.returnRadio(radio.id, 'Good', UI.getClerkName(), '');

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
            displayTimer = setTimeout(resetState, 2000);
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

    // ===== KEYBOARD SCANNER =====
    Scanner.startKeyboardListener((scanned) => {
        handleScan(scanned);
    });

    // ===== SPACEBAR MODE TOGGLE =====
    // Remove any previous handler from a prior visit to this page
    if (window._qsKeyDownHandler) {
        document.removeEventListener('keydown', window._qsKeyDownHandler);
    }
    function handleKeyDown(e) {
        if (!pageActive) return;
        // Only toggle if not typing in an input
        if (e.key === ' ' && document.activeElement !== input) {
            e.preventDefault();
            cycleMode();
        }
        // Also allow spacebar toggle when input is empty
        if (e.key === ' ' && document.activeElement === input && input.value === '') {
            e.preventDefault();
            cycleMode();
        }
    }
    window._qsKeyDownHandler = handleKeyDown;
    document.addEventListener('keydown', handleKeyDown);

    // ===== SELF-SERVICE CAMERA =====
    const cameraContainer = document.getElementById('qs-camera-container');

    document.getElementById('qs-camera-btn').addEventListener('click', async () => {
        if (selfServiceCamera) {
            await stopSelfServiceCamera();
        } else {
            await startSelfServiceCamera();
        }
    });

    document.getElementById('qs-camera-stop').addEventListener('click', async () => {
        await stopSelfServiceCamera();
    });

    async function startSelfServiceCamera() {
        cameraContainer.style.display = 'block';
        selfServiceCamera = true;
        try {
            await Scanner.startInlineCamera('qs-inline-camera', (scanned) => {
                handleScan(scanned);
            }, 2000);
        } catch (err) {
            UI.toast('Camera error: ' + err.message, 'error');
            cameraContainer.style.display = 'none';
            selfServiceCamera = false;
        }
    }

    async function stopSelfServiceCamera() {
        await Scanner.stopInlineCamera();
        cameraContainer.style.display = 'none';
        selfServiceCamera = false;
        input.focus();
    }

    // ===== CLEANUP on page leave =====
    function cleanup() {
        if (!pageActive) return;
        pageActive = false;
        document.removeEventListener('keydown', handleKeyDown);
        Scanner.stopInlineCamera();
    }
    // Hook into navigation to clean up when leaving this page
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            if (btn.dataset.page !== 'quick-scan') cleanup();
        });
    });

    input.focus();
});
