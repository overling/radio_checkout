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

    // Size presets (in inches → pixels at 96 DPI)
    const QR_SIZES = {
        '0.5':  { label: '½″ × ½″',   px: 48 },
        '0.75': { label: '¾″ × ¾″',   px: 72 },
        '1':    { label: '1″ × 1″',    px: 96 }
    };
    const BC_SIZES = {
        '0.25': { label: '¼″ tall',  height: 24, width: 1.2, fontSize: 8 },
        '0.375':{ label: '⅜″ tall',  height: 36, width: 1.5, fontSize: 10 },
        '0.5':  { label: '½″ tall',  height: 48, width: 2,   fontSize: 12 }
    };

    container.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:0.5rem;margin-bottom:0.25rem;">
            <h2 class="page-title" style="margin-bottom:0;">🏷️ Print Codes</h2>
            <button class="btn btn-outline" id="goto-assets-from-print">📦 Manage Assets</button>
        </div>

        <div class="card no-print">
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
                <div class="form-group">
                    <label for="pc-label-size">Label Size</label>
                    <select id="pc-label-size">
                        <option value="0.5" selected>½″ × ½″ (default)</option>
                        <option value="0.75">¾″ × ¾″</option>
                        <option value="1">1″ × 1″</option>
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
            <div class="card-header no-print">
                <h3>Label Preview</h3>
            </div>
            <div id="pc-labels" class="labels-grid"></div>
        </div>
    `;

    // Update size dropdown options when code type changes
    function _updateSizeOptions() {
        const codeType = document.getElementById('pc-code-type').value;
        const sizeSelect = document.getElementById('pc-label-size');
        sizeSelect.innerHTML = '';
        if (codeType === 'qr') {
            sizeSelect.innerHTML = `
                <option value="0.5" selected>½″ × ½″ (default)</option>
                <option value="0.75">¾″ × ¾″</option>
                <option value="1">1″ × 1″</option>
            `;
        } else {
            sizeSelect.innerHTML = `
                <option value="0.25" selected>¼″ tall (default)</option>
                <option value="0.375">⅜″ tall</option>
                <option value="0.5">½″ tall</option>
            `;
        }
    }

    // Navigation shortcut
    document.getElementById('goto-assets-from-print').addEventListener('click', () => UI.navigateTo('assets'));

    // Code type change — update size options and auto-regenerate
    document.getElementById('pc-code-type').addEventListener('change', () => {
        _updateSizeOptions();
        _autoGenerate();
    });

    // Size change — auto-regenerate
    document.getElementById('pc-label-size').addEventListener('change', _autoGenerate);

    // Asset select change — auto-generate
    document.getElementById('pc-asset-select').addEventListener('change', _autoGenerate);

    // Custom text — auto-generate after typing stops
    let _customDebounce = null;
    document.getElementById('pc-custom-text').addEventListener('input', () => {
        clearTimeout(_customDebounce);
        _customDebounce = setTimeout(_autoGenerate, 400);
    });

    // Mode toggle
    document.getElementById('pc-mode').addEventListener('change', (e) => {
        document.getElementById('pc-single-section').style.display = e.target.value === 'single' ? 'block' : 'none';
        document.getElementById('pc-batch-section').style.display = e.target.value === 'batch' ? 'block' : 'none';
        _autoGenerate();
    });

    // Batch select helpers — auto-regenerate after selection
    document.getElementById('pc-select-all-radios').addEventListener('click', () => {
        document.querySelectorAll('.pc-batch-check[data-type="radio"]').forEach(cb => cb.checked = true);
        _autoGenerate();
    });
    document.getElementById('pc-select-all-batteries').addEventListener('click', () => {
        document.querySelectorAll('.pc-batch-check[data-type="battery"]').forEach(cb => cb.checked = true);
        _autoGenerate();
    });
    document.getElementById('pc-select-all-tools').addEventListener('click', () => {
        document.querySelectorAll('.pc-batch-check[data-type="tool"]').forEach(cb => cb.checked = true);
        _autoGenerate();
    });
    document.getElementById('pc-select-none').addEventListener('click', () => {
        document.querySelectorAll('.pc-batch-check').forEach(cb => cb.checked = false);
        _autoGenerate();
    });
    // Individual batch checkbox toggles
    document.getElementById('pc-batch-list').addEventListener('change', _autoGenerate);

    // Auto-generate: silently regenerates if there's something selected (no toast on empty)
    async function _autoGenerate() {
        await _generateLabels(true);
    }

    // Generate button (manual click — shows toast if nothing selected)
    document.getElementById('pc-generate').addEventListener('click', () => _generateLabels(false));

    // Core generate function
    async function _generateLabels(silent) {
        const codeType = document.getElementById('pc-code-type').value;
        const mode = document.getElementById('pc-mode').value;
        const sizeKey = document.getElementById('pc-label-size').value;
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
                if (!silent) UI.toast('Select an asset or enter custom text', 'warning');
                document.getElementById('pc-preview').style.display = 'none';
                document.getElementById('pc-print').style.display = 'none';
                return;
            }
        } else {
            const checked = document.querySelectorAll('.pc-batch-check:checked');
            if (checked.length === 0) {
                if (!silent) UI.toast('Select at least one asset', 'warning');
                document.getElementById('pc-preview').style.display = 'none';
                document.getElementById('pc-print').style.display = 'none';
                return;
            }
            checked.forEach(cb => {
                const asset = allAssets.find(a => a.id === cb.value);
                items.push({ id: cb.value, label: asset ? asset.displayName : cb.value });
            });
        }

        // Generate labels at the selected size
        for (const item of items) {
            const labelDiv = document.createElement('div');
            labelDiv.className = 'label-preview';

            if (codeType === 'qr') {
                const sz = QR_SIZES[sizeKey] || QR_SIZES['0.5'];
                const canvas = document.createElement('canvas');
                // Generate at 2× for sharpness, display at target size
                await Scanner.generateQRToCanvas(canvas, item.id, sz.px * 2);
                canvas.style.width = sz.px + 'px';
                canvas.style.height = sz.px + 'px';
                labelDiv.appendChild(canvas);
                // Scale label text with size
                const textEl = document.createElement('div');
                textEl.className = 'label-text';
                textEl.style.fontSize = (sz.px <= 48 ? 7 : sz.px <= 72 ? 9 : 11) + 'px';
                textEl.textContent = item.label;
                labelDiv.appendChild(textEl);
            } else {
                const sz = BC_SIZES[sizeKey] || BC_SIZES['0.25'];
                const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
                svg.setAttribute('class', 'barcode-svg');
                labelDiv.appendChild(svg);
                Scanner.generateBarcode(svg, item.id, {
                    height: sz.height,
                    width: sz.width,
                    fontSize: sz.fontSize,
                    displayValue: false,
                    margin: 2
                });
                const textEl = document.createElement('div');
                textEl.className = 'label-text';
                textEl.style.fontSize = sz.fontSize + 'px';
                textEl.textContent = item.label;
                labelDiv.appendChild(textEl);
            }

            // Compact padding for print
            labelDiv.style.padding = '0.25rem';
            labelDiv.style.minWidth = 'auto';
            labelsContainer.appendChild(labelDiv);
        }

        document.getElementById('pc-preview').style.display = 'block';
        document.getElementById('pc-print').style.display = 'inline-flex';
    }

    // Print
    document.getElementById('pc-print').addEventListener('click', () => {
        window.print();
    });
});
