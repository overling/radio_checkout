/**
 * Radio Checkout Page - Step-by-step workflow
 */
UI.registerPage('checkout', async (container) => {
    container.innerHTML = `
        <h2 class="page-title">📤 Check Out Radio</h2>
        <div class="workflow-panel">
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
                <button class="btn btn-primary btn-lg" id="co-another-btn" style="margin-top:1rem; width:100%;">
                    Check Out Another Radio
                </button>
            </div>
        </div>
    `;

    let radioId = null;
    let techId = null;

    const radioInput = document.getElementById('co-radio-input');
    const techInput = document.getElementById('co-tech-input');

    // Step 1: Radio scan
    function handleRadioScan(value) {
        value = value.trim();
        if (!value) return;
        radioId = value;
        radioInput.value = value;

        // Validate radio exists and is available
        DB.get('radios', value).then(radio => {
            const resultEl = document.getElementById('co-radio-result');
            resultEl.style.display = 'block';

            if (!radio) {
                resultEl.className = 'step-result error';
                resultEl.textContent = `Radio "${value}" not found. Please add it in Asset Management first.`;
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

            // Activate step 2
            document.getElementById('co-step1').classList.remove('active-step');
            document.getElementById('co-step1').classList.add('completed-step');
            const step2 = document.getElementById('co-step2');
            step2.style.opacity = '1';
            step2.style.pointerEvents = 'auto';
            step2.classList.add('active-step');
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
    function handleTechScan(value) {
        value = value.trim();
        if (!value) return;
        techId = value;
        techInput.value = value;

        const resultEl = document.getElementById('co-tech-result');
        resultEl.style.display = 'block';

        DB.get('technicians', value).then(tech => {
            if (tech) {
                resultEl.className = 'step-result success';
                resultEl.textContent = `✓ ${tech.name || tech.badgeId} ${tech.department ? '(' + tech.department + ')' : ''}`;
            } else {
                resultEl.className = 'step-result';
                resultEl.innerHTML = `New badge ID: <strong>${value}</strong> — will be auto-registered.`;
            }

            // Activate step 3
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
        });
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

    // Step 3: Confirm
    document.getElementById('co-confirm-btn').addEventListener('click', async () => {
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
        } catch (err) {
            UI.toast(err.message, 'error', 5000);
        }
    });

    // Another checkout
    document.getElementById('co-another-btn').addEventListener('click', () => {
        UI.navigateTo('checkout');
    });

    // Setup keyboard scanner listener
    Scanner.startKeyboardListener((scanned) => {
        const active = document.activeElement;
        if (active === radioInput) {
            handleRadioScan(scanned);
        } else if (active === techInput) {
            handleTechScan(scanned);
        }
    });

    radioInput.focus();
});
