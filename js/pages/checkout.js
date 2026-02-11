/**
 * Radio Checkout Page - Step-by-step workflow
 * Supports auto-checkout mode for fast line processing.
 */
UI.registerPage('checkout', async (container) => {
    const autoCheckoutSaved = await DB.getSetting('autoCheckout', false);

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
            </div>
        </div>
    `;

    let radioId = null;
    let techId = null;
    let autoResetTimer = null;

    const radioInput = document.getElementById('co-radio-input');
    const techInput = document.getElementById('co-tech-input');
    const autoCheckbox = document.getElementById('co-auto-checkout');

    // Persist auto-checkout preference
    autoCheckbox.addEventListener('change', async () => {
        await DB.setSetting('autoCheckout', autoCheckbox.checked);
    });

    function isAutoCheckout() {
        return autoCheckbox.checked;
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

    // Another checkout (also clears timer)
    document.getElementById('co-another-btn').addEventListener('click', () => {
        if (autoResetTimer) clearInterval(autoResetTimer);
        UI.navigateTo('checkout');
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
