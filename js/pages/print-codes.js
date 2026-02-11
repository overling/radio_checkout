/**
 * Print Codes Page - Generate and print QR codes and barcodes for assets
 */
UI.registerPage('print-codes', async (container) => {
    const radios = await DB.getAll('radios');
    const batteries = await DB.getAll('batteries');
    const tools = await DB.getAll('tools');
    const allAssets = [
        ...radios.map(r => ({ ...r, assetType: 'radio', displayName: `Radio: ${r.id}` })),
        ...batteries.map(b => ({ ...b, assetType: 'battery', displayName: `Battery: ${b.id}` })),
        ...tools.map(t => ({ ...t, assetType: 'tool', displayName: `Tool: ${t.id}` }))
    ];

    container.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:0.5rem;margin-bottom:0.25rem;">
            <h2 class="page-title" style="margin-bottom:0;">🏷️ Print Codes</h2>
            <button class="btn btn-outline" id="goto-assets-from-print">📦 Manage Assets</button>
        </div>

        <div class="card">
            <div class="card-header">
                <h3>Generate Labels</h3>
            </div>

            <div class="form-row">
                <div class="form-group">
                    <label for="pc-code-type">Code Type</label>
                    <select id="pc-code-type">
                        <option value="qr">QR Code</option>
                        <option value="barcode">Code 128 Barcode</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="pc-mode">Mode</label>
                    <select id="pc-mode">
                        <option value="single">Single Label</option>
                        <option value="batch">Batch (All Selected)</option>
                    </select>
                </div>
            </div>

            <div id="pc-single-section">
                <div class="form-group">
                    <label for="pc-asset-select">Select Asset</label>
                    <select id="pc-asset-select">
                        <option value="">-- Choose an asset --</option>
                        <optgroup label="Radios">
                            ${radios.map(r => `<option value="${r.id}" data-type="radio">${r.id} — ${r.model || 'No model'}</option>`).join('')}
                        </optgroup>
                        <optgroup label="Batteries">
                            ${batteries.map(b => `<option value="${b.id}" data-type="battery">${b.id} — ${b.model || 'No model'}</option>`).join('')}
                        </optgroup>
                        <optgroup label="Tools">
                            ${tools.map(t => `<option value="${t.id}" data-type="tool">${t.id} — ${t.name || t.model || 'No name'}</option>`).join('')}
                        </optgroup>
                    </select>
                </div>
                <div class="form-group">
                    <label for="pc-custom-text">Or enter custom text</label>
                    <input type="text" id="pc-custom-text" placeholder="Custom ID or text to encode">
                </div>
            </div>

            <div id="pc-batch-section" style="display:none;">
                <div class="form-group">
                    <label>Select Assets for Batch Print</label>
                    <div class="filter-bar" style="margin-bottom:0.5rem;">
                        <button class="btn btn-sm btn-outline" id="pc-select-all-radios">All Radios</button>
                        <button class="btn btn-sm btn-outline" id="pc-select-all-batteries">All Batteries</button>
                        <button class="btn btn-sm btn-outline" id="pc-select-all-tools">All Tools</button>
                        <button class="btn btn-sm btn-outline" id="pc-select-none">Clear</button>
                    </div>
                    <div id="pc-batch-list" style="max-height:200px; overflow-y:auto; border:1px solid var(--gray-200); border-radius:var(--radius); padding:0.5rem;">
                        ${allAssets.map(a => `
                            <label style="display:block; padding:0.25rem 0; cursor:pointer;">
                                <input type="checkbox" class="pc-batch-check" value="${a.id}" data-type="${a.assetType}">
                                ${a.displayName} ${a.model ? '(' + a.model + ')' : ''}
                            </label>
                        `).join('')}
                    </div>
                </div>
            </div>

            <div class="btn-group" style="margin-top:1rem;">
                <button class="btn btn-primary" id="pc-generate">Generate</button>
                <button class="btn btn-outline" id="pc-print" style="display:none;">🖨️ Print Labels</button>
            </div>
        </div>

        <div id="pc-preview" class="card" style="display:none;">
            <div class="card-header">
                <h3>Label Preview</h3>
            </div>
            <div id="pc-labels" class="labels-grid"></div>
        </div>
    `;

    // Navigation shortcut
    document.getElementById('goto-assets-from-print').addEventListener('click', () => UI.navigateTo('assets'));

    // Mode toggle
    document.getElementById('pc-mode').addEventListener('change', (e) => {
        document.getElementById('pc-single-section').style.display = e.target.value === 'single' ? 'block' : 'none';
        document.getElementById('pc-batch-section').style.display = e.target.value === 'batch' ? 'block' : 'none';
    });

    // Batch select helpers
    document.getElementById('pc-select-all-radios').addEventListener('click', () => {
        document.querySelectorAll('.pc-batch-check[data-type="radio"]').forEach(cb => cb.checked = true);
    });
    document.getElementById('pc-select-all-batteries').addEventListener('click', () => {
        document.querySelectorAll('.pc-batch-check[data-type="battery"]').forEach(cb => cb.checked = true);
    });
    document.getElementById('pc-select-all-tools').addEventListener('click', () => {
        document.querySelectorAll('.pc-batch-check[data-type="tool"]').forEach(cb => cb.checked = true);
    });
    document.getElementById('pc-select-none').addEventListener('click', () => {
        document.querySelectorAll('.pc-batch-check').forEach(cb => cb.checked = false);
    });

    // Generate
    document.getElementById('pc-generate').addEventListener('click', async () => {
        const codeType = document.getElementById('pc-code-type').value;
        const mode = document.getElementById('pc-mode').value;
        const labelsContainer = document.getElementById('pc-labels');
        labelsContainer.innerHTML = '';

        let items = [];

        if (mode === 'single') {
            const assetSelect = document.getElementById('pc-asset-select');
            const customText = document.getElementById('pc-custom-text').value.trim();

            if (assetSelect.value) {
                const asset = allAssets.find(a => a.id === assetSelect.value);
                items.push({ id: assetSelect.value, label: asset ? asset.displayName : assetSelect.value });
            } else if (customText) {
                items.push({ id: customText, label: customText });
            } else {
                UI.toast('Select an asset or enter custom text', 'warning');
                return;
            }
        } else {
            const checked = document.querySelectorAll('.pc-batch-check:checked');
            if (checked.length === 0) {
                UI.toast('Select at least one asset', 'warning');
                return;
            }
            checked.forEach(cb => {
                const asset = allAssets.find(a => a.id === cb.value);
                items.push({ id: cb.value, label: asset ? asset.displayName : cb.value });
            });
        }

        // Generate labels
        for (const item of items) {
            const labelDiv = document.createElement('div');
            labelDiv.className = 'label-preview';

            if (codeType === 'qr') {
                const canvas = document.createElement('canvas');
                await Scanner.generateQRToCanvas(canvas, item.id, 160);
                labelDiv.appendChild(canvas);
            } else {
                const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
                svg.setAttribute('class', 'barcode-svg');
                labelDiv.appendChild(svg);
                Scanner.generateBarcode(svg, item.id);
            }

            const textEl = document.createElement('div');
            textEl.className = 'label-text';
            textEl.textContent = item.label;
            labelDiv.appendChild(textEl);

            labelsContainer.appendChild(labelDiv);
        }

        document.getElementById('pc-preview').style.display = 'block';
        document.getElementById('pc-print').style.display = 'inline-flex';
    });

    // Print
    document.getElementById('pc-print').addEventListener('click', () => {
        window.print();
    });
});
