/**
 * Radio Return Page - Scan radio, select condition, confirm
 */
UI.registerPage('return', async (container) => {
    container.innerHTML = `
        <h2 class="page-title">📥 Return Radio</h2>
        <div class="workflow-panel">
            <div class="card" id="ret-help-tip" style="margin-bottom:1rem; padding:0.6rem 0.9rem; background:var(--info-light, #e8f4fd); border:1px solid var(--info, #2196F3); border-radius:var(--radius); font-size:0.85rem; line-height:1.5;">
                <strong>How this works:</strong> Scan the <strong>radio</strong>, pick its <strong>condition</strong>, then confirm.
                <span style="color:var(--text-muted);">If you scan the wrong radio, click <em>"Wrong radio? Re-scan"</em> to start over — nothing is saved until you confirm.</span>
            </div>

            <div id="ret-step1" class="workflow-step active-step">
                <div class="step-title"><span class="step-number">1</span> Scan Radio</div>
                <div class="scan-input-group">
                    <input type="text" id="ret-radio-input" class="scan-input-lg scan-target"
                           placeholder="Scan or type Radio ID" autofocus autocomplete="off">
                    <button class="btn btn-outline" id="ret-radio-camera" title="Use Camera">📷</button>
                </div>
                <div id="ret-radio-result" class="step-result" style="display:none"></div>
            </div>

            <div id="ret-step2" class="workflow-step" style="opacity:0.5; pointer-events:none;">
                <div class="step-title"><span class="step-number">2</span> Select Condition</div>
                <div class="condition-buttons">
                    <button class="condition-btn good" data-condition="Good">✅ Good</button>
                    <button class="condition-btn damaged" data-condition="Damaged">⚠️ Damaged</button>
                    <button class="condition-btn needs-repair" data-condition="Needs Repair">🔧 Needs Repair</button>
                </div>
                <div style="font-size:0.78rem; color:var(--text-muted); margin-top:0.4rem; line-height:1.4;">
                    <strong>✅ Good</strong> = Radio works fine → goes back to Available.<br>
                    <strong>⚠️ Damaged / 🔧 Needs Repair</strong> = Something is wrong → radio goes to <strong>Maintenance</strong>.
                </div>
                <div class="form-group" style="margin-top:0.75rem;">
                    <label for="ret-notes">Notes (optional)</label>
                    <textarea id="ret-notes" rows="2" placeholder="Describe any issues..."></textarea>
                </div>
                <div id="ret-notify-toggle-wrap" style="display:none; margin-top:0.6rem;">
                    <label style="display:flex; align-items:center; gap:0.5rem; cursor:pointer; font-size:0.85rem;">
                        <span style="position:relative; display:inline-block; width:36px; height:20px;">
                            <input type="checkbox" id="ret-notify-supervisor" style="opacity:0; width:0; height:0;">
                            <span id="ret-toggle-track" style="position:absolute; inset:0; background:var(--border); border-radius:10px; transition:background 0.2s;"></span>
                            <span id="ret-toggle-thumb" style="position:absolute; top:2px; left:2px; width:16px; height:16px; background:#fff; border-radius:50%; transition:left 0.2s; box-shadow:0 1px 3px rgba(0,0,0,0.2);"></span>
                        </span>
                        <span>📋 Flag for supervisor review</span>
                    </label>
                    <div style="font-size:0.75rem; color:var(--text-muted); margin-top:0.2rem; margin-left:2.6rem;">When on, the supervisor dashboard will highlight this radio for review.</div>
                </div>
                <div id="ret-condition-result" class="step-result" style="display:none"></div>
                <div style="margin-top:0.6rem; display:flex; align-items:center; gap:0.75rem; flex-wrap:wrap;">
                    <button class="btn btn-outline btn-sm" id="ret-wrong-radio-btn" style="font-size:0.82rem; color:var(--text-muted);">
                        ↩ Wrong radio? Re-scan
                    </button>
                    <span style="font-size:0.78rem; color:var(--text-muted);">Goes back to Step 1 — nothing is saved yet.</span>
                </div>
            </div>

            <div id="ret-step3" class="workflow-step" style="opacity:0.5; pointer-events:none;">
                <div class="step-title"><span class="step-number">3</span> Confirm Return</div>
                <div id="ret-summary"></div>
                <button class="btn btn-primary btn-lg" id="ret-confirm-btn" style="margin-top:1rem; width:100%;">
                    ✅ Confirm Return
                </button>
            </div>

            <div id="ret-done" class="workflow-step" style="display:none;"></div>
        </div>
    `;

    let radioId = null;
    let selectedCondition = null;
    let checkoutInfo = null;

    const radioInput = document.getElementById('ret-radio-input');

    // Reset back to step 1 so clerk can re-scan a different radio
    function resetToStep1() {
        radioId = null;
        selectedCondition = null;
        checkoutInfo = null;
        radioInput.value = '';
        document.getElementById('ret-radio-result').style.display = 'none';
        document.getElementById('ret-notes').value = '';
        container.querySelectorAll('.condition-btn').forEach(b => b.classList.remove('selected'));

        const step1 = document.getElementById('ret-step1');
        step1.classList.remove('completed-step');
        step1.classList.add('active-step');

        const step2 = document.getElementById('ret-step2');
        step2.classList.remove('active-step', 'completed-step');
        step2.style.opacity = '0.5';
        step2.style.pointerEvents = 'none';

        const step3 = document.getElementById('ret-step3');
        step3.classList.remove('active-step', 'completed-step');
        step3.style.opacity = '0.5';
        step3.style.pointerEvents = 'none';

        radioInput.focus();
    }

    // Step 1: Scan radio
    function handleRadioScan(value) {
        value = value.trim();
        if (!value) return;
        radioId = value;
        radioInput.value = value;

        DB.get('radios', value).then(async (radio) => {
            const resultEl = document.getElementById('ret-radio-result');
            resultEl.style.display = 'block';

            if (!radio) {
                resultEl.className = 'step-result error';
                resultEl.innerHTML = `Radio "${value}" not found. <a href="#" style="color:var(--primary);text-decoration:underline;" onclick="UI.navigateTo('assets');return false;">Add it in Asset Management</a>`;
                radioId = null;
                return;
            }
            if (radio.status !== 'Checked Out') {
                resultEl.className = 'step-result error';
                resultEl.textContent = `Radio "${value}" is not checked out. Status: ${radio.status}`;
                radioId = null;
                return;
            }

            checkoutInfo = await Models.getRadioCheckoutInfo(value);
            const techName = checkoutInfo ? (checkoutInfo.technicianName || checkoutInfo.technicianId) : 'Unknown';
            const checkoutTime = checkoutInfo ? UI.formatDateTime(checkoutInfo.timestamp) : 'Unknown';

            resultEl.className = 'step-result success';
            resultEl.innerHTML = `✓ ${radio.id} — ${radio.model || 'No model'}<br>
                <small>Checked out to: <strong>${techName}</strong> at ${checkoutTime}</small>`;

            // Activate step 2
            document.getElementById('ret-step1').classList.remove('active-step');
            document.getElementById('ret-step1').classList.add('completed-step');
            const step2 = document.getElementById('ret-step2');
            step2.style.opacity = '1';
            step2.style.pointerEvents = 'auto';
            step2.classList.add('active-step');
        });
    }

    radioInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleRadioScan(radioInput.value);
        }
    });

    document.getElementById('ret-radio-camera').addEventListener('click', () => {
        Scanner.startCamera(handleRadioScan).catch(err => UI.toast(err.message, 'error'));
    });

    // Toggle switch visual behavior
    const notifyCheckbox = document.getElementById('ret-notify-supervisor');
    const toggleTrack = document.getElementById('ret-toggle-track');
    const toggleThumb = document.getElementById('ret-toggle-thumb');
    const notifyWrap = document.getElementById('ret-notify-toggle-wrap');
    notifyCheckbox.addEventListener('change', () => {
        if (notifyCheckbox.checked) {
            toggleTrack.style.background = 'var(--warning, #ff9800)';
            toggleThumb.style.left = '18px';
        } else {
            toggleTrack.style.background = 'var(--border)';
            toggleThumb.style.left = '2px';
        }
    });

    // Step 2: Condition selection
    container.querySelectorAll('.condition-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            container.querySelectorAll('.condition-btn').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            selectedCondition = btn.dataset.condition;

            // Show/hide supervisor notify toggle
            notifyWrap.style.display = selectedCondition !== 'Good' ? 'block' : 'none';

            // Activate step 3
            document.getElementById('ret-step2').classList.remove('active-step');
            document.getElementById('ret-step2').classList.add('completed-step');
            const step3 = document.getElementById('ret-step3');
            step3.style.opacity = '1';
            step3.style.pointerEvents = 'auto';
            step3.classList.add('active-step');

            const techName = checkoutInfo ? (checkoutInfo.technicianName || checkoutInfo.technicianId) : 'Unknown';
            document.getElementById('ret-summary').innerHTML = `
                <div style="font-size:1rem; line-height:1.8;">
                    <strong>Radio:</strong> ${radioId}<br>
                    <strong>Returned by:</strong> ${techName}<br>
                    <strong>Condition:</strong> ${selectedCondition}<br>
                    <strong>Clerk:</strong> ${UI.getClerkName()}<br>
                    <strong>Time:</strong> ${new Date().toLocaleString()}
                </div>
            `;

            if (selectedCondition !== 'Good') {
                const notifyOn = document.getElementById('ret-notify-supervisor').checked;
                document.getElementById('ret-summary').innerHTML += `
                    <div class="alert alert-warning" style="margin-top:0.75rem;">
                        ⚠️ This radio will be moved to <strong>Maintenance</strong>.
                        ${notifyOn ? '<br>📋 Flagged for supervisor review.' : ''}
                    </div>
                `;
            }
        });
    });

    // Wrong radio — go back to step 1
    document.getElementById('ret-wrong-radio-btn').addEventListener('click', () => {
        resetToStep1();
    });

    // Step 3: Confirm
    document.getElementById('ret-confirm-btn').addEventListener('click', async () => {
        if (!radioId || !selectedCondition) return;
        const notes = document.getElementById('ret-notes').value.trim();
        try {
            const result = await Models.returnRadio(radioId, selectedCondition, UI.getClerkName(), notes);

            document.getElementById('ret-step1').style.display = 'none';
            document.getElementById('ret-step2').style.display = 'none';
            document.getElementById('ret-step3').style.display = 'none';

            const doneEl = document.getElementById('ret-done');
            doneEl.style.display = 'block';

            const notifyOn = document.getElementById('ret-notify-supervisor').checked;
            if (result.flagForSupervisor && notifyOn) {
                doneEl.innerHTML = `
                    <div class="step-result" style="font-size:1.1rem; text-align:center; padding:1.5rem; background:var(--warning-light); color:#7a4100;">
                        ⚠️ Radio ${radioId} returned as <strong>${selectedCondition}</strong>.<br>
                        📋 Flagged for supervisor review. Radio moved to Maintenance.
                    </div>
                    <button class="btn btn-primary btn-lg" id="ret-another-btn" style="margin-top:1rem; width:100%;">
                        Return Another Radio
                    </button>
                `;
            } else if (result.flagForSupervisor) {
                doneEl.innerHTML = `
                    <div class="step-result" style="font-size:1.1rem; text-align:center; padding:1.5rem; background:var(--warning-light); color:#7a4100;">
                        ⚠️ Radio ${radioId} returned as <strong>${selectedCondition}</strong>.<br>
                        Radio moved to Maintenance.
                    </div>
                    <button class="btn btn-primary btn-lg" id="ret-another-btn" style="margin-top:1rem; width:100%;">
                        Return Another Radio
                    </button>
                `;
            } else {
                doneEl.innerHTML = `
                    <div class="step-result success" style="font-size:1.1rem; text-align:center; padding:1.5rem;">
                        ✅ Radio ${radioId} returned successfully. Status: Available.
                    </div>
                    <button class="btn btn-primary btn-lg" id="ret-another-btn" style="margin-top:1rem; width:100%;">
                        Return Another Radio
                    </button>
                `;
            }

            document.getElementById('ret-another-btn').addEventListener('click', () => {
                UI.navigateTo('return');
            });

            const toastMsg = result.flagForSupervisor
                ? (notifyOn ? 'Radio returned — flagged for supervisor review' : 'Radio returned — moved to Maintenance')
                : 'Radio returned successfully!';
            UI.toast(toastMsg, result.flagForSupervisor ? 'warning' : 'success');
            Scanner.speak('Checked in');
        } catch (err) {
            UI.toast(err.message, 'error', 5000);
        }
    });

    // Setup keyboard scanner
    Scanner.startKeyboardListener((scanned) => {
        if (document.activeElement === radioInput) {
            handleRadioScan(scanned);
        }
    });

    radioInput.focus();
});
