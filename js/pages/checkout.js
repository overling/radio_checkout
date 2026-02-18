/**
 * Radio Checkout Page - Step-by-step workflow
 * Supports auto-checkout mode for fast line processing.
 */
UI.registerPage('checkout', async (container) => {
    const autoCheckoutSaved = await DB.getSetting('autoCheckout', false);
    const promptNameSaved = await DB.getSetting('promptNewTechName', true);

    container.innerHTML = `
        <h2 class="page-title">📤 Check Out Radio</h2>
        <div class="workflow-panel">
            <div class="checkout-options card" style="margin-bottom:1rem; padding:0.75rem 1rem;">
                <label style="display:flex; align-items:center; gap:0.5rem; cursor:pointer; font-weight:600; font-size:0.95rem;">
                    <input type="checkbox" id="co-auto-checkout" ${autoCheckoutSaved ? 'checked' : ''}
                           style="width:20px; height:20px; accent-color:var(--primary); cursor:pointer;">
                    ⚡ Auto-checkout (skip confirmation step)
                </label>
                <div style="font-size:0.8rem; color:var(--text-muted); margin-top:0.25rem; margin-left:1.65rem;">
                    Scan radio → Scan badge → Done. Automatically processes the next technician.
                </div>
                <label style="display:flex; align-items:center; gap:0.5rem; cursor:pointer; font-weight:600; font-size:0.95rem; margin-top:0.75rem;">
                    <input type="checkbox" id="co-prompt-name" ${promptNameSaved ? 'checked' : ''}
                           style="width:20px; height:20px; accent-color:var(--primary); cursor:pointer;">
                    🪪 Prompt for name on new badges
                </label>
                <div style="font-size:0.8rem; color:var(--text-muted); margin-top:0.25rem; margin-left:1.65rem;">
                    When off, new badges are silently registered — add names later in Assets.
                </div>
            </div>

            <div class="card" id="co-help-tip" style="margin-bottom:1rem; padding:0.6rem 0.9rem; background:var(--info-light, #e8f4fd); border:1px solid var(--info, #2196F3); border-radius:var(--radius); font-size:0.85rem; line-height:1.5;">
                <strong>How this works:</strong> Scan the <strong>radio</strong> first, then scan the technician's <strong>badge</strong>.
                <span style="color:var(--text-muted);">If you scan the wrong thing, click <em>"Wrong radio? Re-scan"</em> to start over. If the radio is broken after checkout, click <em>"Radio Faulty — Swap It"</em> to instantly exchange it.</span>
            </div>

            <div id="co-step1" class="workflow-step active-step">
                <div class="step-title"><span class="step-number">1</span> Scan Radio</div>
                <div class="scan-input-group">
                    <input type="text" id="co-radio-input" class="scan-input-lg scan-target"
                           placeholder="Scan or type Radio ID" autofocus autocomplete="off">
                    <button class="btn btn-outline" id="co-radio-camera" title="Use Camera">📷</button>
                </div>
                <div id="co-radio-result" class="step-result" style="display:none"></div>
            </div>

            <div id="co-step2" class="workflow-step" style="opacity:0.5; pointer-events:none;">
                <div class="step-title"><span class="step-number">2</span> Scan Technician Badge</div>
                <div class="scan-input-group">
                    <input type="text" id="co-tech-input" class="scan-input-lg scan-target"
                           placeholder="Scan or type Badge ID" autocomplete="off">
                    <button class="btn btn-outline" id="co-tech-camera" title="Use Camera">📷</button>
                </div>
                <div id="co-tech-result" class="step-result" style="display:none"></div>
                <div style="margin-top:0.6rem; display:flex; align-items:center; gap:0.75rem; flex-wrap:wrap;">
                    <button class="btn btn-outline btn-sm" id="co-wrong-radio-btn" style="font-size:0.82rem; color:var(--text-muted);">
                        ↩ Wrong radio? Re-scan
                    </button>
                    <span style="font-size:0.78rem; color:var(--text-muted);">Goes back to Step 1 — nothing is saved yet.</span>
                </div>
            </div>

            <div id="co-step3" class="workflow-step" style="opacity:0.5; pointer-events:none;">
                <div class="step-title"><span class="step-number">3</span> Confirm Checkout</div>
                <div id="co-summary"></div>
                <button class="btn btn-primary btn-lg" id="co-confirm-btn" style="margin-top:1rem; width:100%;">
                    ✅ Confirm Checkout
                </button>
            </div>

            <div id="co-done" class="workflow-step" style="display:none;">
                <div class="step-result success" style="font-size:1.1rem; text-align:center; padding:1.5rem;">
                    ✅ <span id="co-done-msg"></span>
                </div>
                <div id="co-done-countdown" style="text-align:center; margin-top:0.5rem; color:var(--text-muted); font-size:0.9rem;"></div>
                <button class="btn btn-primary btn-lg" id="co-another-btn" style="margin-top:1rem; width:100%;">
                    Check Out Another Radio
                </button>
                <button class="btn btn-outline btn-lg" id="co-swap-btn" style="margin-top:0.5rem; width:100%; color:var(--warning, #b45309);">
                    🔄 Radio Faulty — Swap It
                </button>
                <div style="text-align:center; margin-top:0.4rem; font-size:0.78rem; color:var(--text-muted); line-height:1.4;">
                    Radio doesn't work? This will <strong>return it as broken</strong> and let you scan a <strong>replacement</strong> for the same tech. One scan and done.
                </div>
            </div>
        </div>
    `;

    let radioId = null;
    let techId = null;
    let techName = null;
    let autoResetTimer = null;

    const radioInput = document.getElementById('co-radio-input');
    const techInput = document.getElementById('co-tech-input');
    const autoCheckbox = document.getElementById('co-auto-checkout');

    // Persist auto-checkout preference
    autoCheckbox.addEventListener('change', async () => {
        await DB.setSetting('autoCheckout', autoCheckbox.checked);
    });

    // Persist prompt-for-name preference (shared across all scan pages)
    const promptNameCheckbox = document.getElementById('co-prompt-name');
    promptNameCheckbox.addEventListener('change', async () => {
        await DB.setSetting('promptNewTechName', promptNameCheckbox.checked);
    });

    function isAutoCheckout() {
        return autoCheckbox.checked;
    }

    // Reset back to step 1 so clerk can re-scan a different radio
    function resetToStep1() {
        radioId = null;
        techId = null;
        techName = null;
        radioInput.value = '';
        techInput.value = '';
        document.getElementById('co-radio-result').style.display = 'none';
        document.getElementById('co-tech-result').style.display = 'none';

        const step1 = document.getElementById('co-step1');
        step1.classList.remove('completed-step');
        step1.classList.add('active-step');

        const step2 = document.getElementById('co-step2');
        step2.classList.remove('active-step', 'completed-step');
        step2.style.opacity = '0.5';
        step2.style.pointerEvents = 'none';

        const step3 = document.getElementById('co-step3');
        step3.classList.remove('active-step', 'completed-step');
        step3.style.opacity = '0.5';
        step3.style.pointerEvents = 'none';

        radioInput.focus();
    }

    // Step 1: Radio scan
    function handleRadioScan(value) {
        value = value.trim();
        if (!value) return;
        radioId = value;
        radioInput.value = value;

        DB.get('radios', value).then(radio => {
            const resultEl = document.getElementById('co-radio-result');
            resultEl.style.display = 'block';

            if (!radio) {
                resultEl.className = 'step-result error';
                resultEl.innerHTML = `Radio "${value}" not found. <a href="#" style="color:var(--primary);text-decoration:underline;" onclick="UI.navigateTo('assets');return false;">Add it in Asset Management</a>`;
                radioId = null;
                return;
            }
            if (radio.status !== 'Available') {
                resultEl.className = 'step-result error';
                resultEl.textContent = `Radio "${value}" is ${radio.status}. Only Available radios can be checked out.`;
                radioId = null;
                return;
            }

            resultEl.className = 'step-result success';
            resultEl.textContent = `✓ ${radio.id} — ${radio.model || 'No model'} (S/N: ${radio.serialNumber || 'N/A'})`;

            // Activate step 2 and auto-focus badge input
            document.getElementById('co-step1').classList.remove('active-step');
            document.getElementById('co-step1').classList.add('completed-step');
            const step2 = document.getElementById('co-step2');
            step2.style.opacity = '1';
            step2.style.pointerEvents = 'auto';
            step2.classList.add('active-step');
            techInput.value = '';
            techInput.focus();

            // If a swap is pending, auto-fill the tech and complete checkout
            if (window._swapPendingTechId) {
                const pendingTech = window._swapPendingTechId;
                window._swapPendingTechId = null;
                setTimeout(() => handleTechScan(pendingTech), 100);
            }
        });
    }

    radioInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleRadioScan(radioInput.value);
        }
    });

    document.getElementById('co-radio-camera').addEventListener('click', () => {
        Scanner.startCamera(handleRadioScan).catch(err => UI.toast(err.message, 'error'));
    });

    // Step 2: Technician scan
    async function handleTechScan(value) {
        value = value.trim();
        if (!value) return;
        techId = value;
        techInput.value = value;

        const resultEl = document.getElementById('co-tech-result');
        resultEl.style.display = 'block';

        const tech = await DB.get('technicians', value);
        techName = tech ? (tech.name || tech.badgeId) : value;
        if (tech) {
            resultEl.className = 'step-result success';
            resultEl.textContent = `✓ ${tech.name || tech.badgeId} ${tech.department ? '(' + tech.department + ')' : ''}`;
        } else {
            resultEl.className = 'step-result';
            resultEl.innerHTML = `New badge ID: <strong>${value}</strong> — will be auto-registered.`;
        }

        // If auto-checkout, skip confirmation and process immediately
        if (isAutoCheckout()) {
            await performCheckout();
            return;
        }

        // Activate step 3 (manual confirmation)
        document.getElementById('co-step2').classList.remove('active-step');
        document.getElementById('co-step2').classList.add('completed-step');
        const step3 = document.getElementById('co-step3');
        step3.style.opacity = '1';
        step3.style.pointerEvents = 'auto';
        step3.classList.add('active-step');

        document.getElementById('co-summary').innerHTML = `
            <div style="font-size:1rem; line-height:1.8;">
                <strong>Radio:</strong> ${radioId}<br>
                <strong>Technician:</strong> ${tech ? (tech.name || tech.badgeId) : value}<br>
                <strong>Clerk:</strong> ${UI.getClerkName()}<br>
                <strong>Time:</strong> ${new Date().toLocaleString()}
            </div>
        `;
    }

    techInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleTechScan(techInput.value);
        }
    });

    document.getElementById('co-tech-camera').addEventListener('click', () => {
        Scanner.startCamera(handleTechScan).catch(err => UI.toast(err.message, 'error'));
    });

    // Perform the actual checkout
    async function performCheckout() {
        if (!radioId || !techId) return;
        try {
            const result = await Models.checkoutRadio(radioId, techId, UI.getClerkName());
            // Show done
            document.getElementById('co-step1').style.display = 'none';
            document.getElementById('co-step2').style.display = 'none';
            document.getElementById('co-step3').style.display = 'none';
            const doneEl = document.getElementById('co-done');
            doneEl.style.display = 'block';
            document.getElementById('co-done-msg').textContent =
                `Radio ${radioId} checked out to ${result.technician.name || techId}`;
            UI.toast('Checkout successful!', 'success');
            Scanner.speak('Checked out');

            // Prompt for name if new technician
            if (result.techIsNew) {
                await UI.promptNewTechName(techId);
            }

            // Auto-reset for next technician in line
            startAutoReset();
        } catch (err) {
            UI.toast(err.message, 'error', 5000);
        }
    }

    // Auto-reset countdown for next checkout
    function startAutoReset() {
        let seconds = 3;
        const countdownEl = document.getElementById('co-done-countdown');
        countdownEl.textContent = `Next checkout in ${seconds}s...`;
        autoResetTimer = setInterval(() => {
            seconds--;
            if (seconds <= 0) {
                clearInterval(autoResetTimer);
                UI.navigateTo('checkout');
            } else {
                countdownEl.textContent = `Next checkout in ${seconds}s...`;
            }
        }, 1000);
    }

    // Step 3: Manual confirm
    document.getElementById('co-confirm-btn').addEventListener('click', () => performCheckout());

    // Wrong radio — go back to step 1
    document.getElementById('co-wrong-radio-btn').addEventListener('click', () => {
        resetToStep1();
    });

    // Another checkout (also clears timer)
    document.getElementById('co-another-btn').addEventListener('click', () => {
        if (autoResetTimer) clearInterval(autoResetTimer);
        UI.navigateTo('checkout');
    });

    // Swap: return the faulty radio and immediately start checkout for same tech
    document.getElementById('co-swap-btn').addEventListener('click', async () => {
        if (autoResetTimer) clearInterval(autoResetTimer);
        const badRadio = radioId;
        const swapTechId = techId;
        const swapTechName = techName;
        if (!badRadio || !swapTechId) { UI.navigateTo('checkout'); return; }

        try {
            await Models.returnRadio(badRadio, 'Needs Repair', UI.getClerkName(),
                'Returned during swap — radio faulty at checkout');
            UI.toast(`Radio ${badRadio} returned. Now scan a replacement for ${swapTechName || swapTechId}.`, 'info', 4000);
        } catch (e) {
            UI.toast(`Could not return ${badRadio}: ${e.message}`, 'warning', 4000);
        }

        // Pre-fill the tech badge so clerk only needs to scan the new radio
        UI.navigateTo('checkout');
        // Small delay to let the page re-render, then inject the tech badge
        setTimeout(() => {
            const techEl = document.getElementById('co-tech-input');
            if (techEl) {
                // Show a prominent banner so clerk knows what to do
                const panel = document.querySelector('.workflow-panel');
                if (panel) {
                    const banner = document.createElement('div');
                    banner.className = 'alert alert-warning';
                    banner.style.cssText = 'margin-bottom:1rem; font-weight:600; font-size:0.95rem;';
                    banner.innerHTML = `🔄 Swap in progress — scan a replacement radio for <strong>${swapTechName || swapTechId}</strong>`;
                    panel.prepend(banner);
                }
                // Store the tech ID so it auto-fills after radio scan
                window._swapPendingTechId = swapTechId;
            }
        }, 150);
    });

    // Setup keyboard scanner listener
    Scanner.startKeyboardListener((scanned) => {
        // If on done screen and timer running, clear it and start fresh
        if (autoResetTimer) {
            clearInterval(autoResetTimer);
            UI.navigateTo('checkout');
            return;
        }
        const active = document.activeElement;
        if (active === radioInput) {
            handleRadioScan(scanned);
        } else if (active === techInput) {
            handleTechScan(scanned);
        }
    });

    radioInput.focus();
});
