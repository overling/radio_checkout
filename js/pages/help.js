/**
 * Help / Instruction Manual — simple, visual guide for all features.
 */
UI.registerPage('help', async (container) => {
    container.innerHTML = `
        <div style="max-width:900px;margin:0 auto;">
            <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:0.5rem;margin-bottom:1rem;">
                <h2 class="page-title" style="margin-bottom:0;">📖 Instruction Manual</h2>
                <button class="btn btn-outline" onclick="UI.navigateTo('home')">← Back to Home</button>
            </div>

            <div style="background:var(--primary-light);padding:1rem 1.25rem;border-radius:var(--radius);margin-bottom:1.5rem;font-size:0.95rem;">
                <strong>Welcome to the USPS Asset Tracker!</strong><br>
                This app tracks radios, batteries, and tools. You can check equipment in and out,
                print labels, get alerts for overdue items, and export reports — all from your browser.
                <br><br>
                <strong>Version:</strong> 1.0 &nbsp;|&nbsp; <strong>Author:</strong> WB &nbsp;|&nbsp; <strong>Date:</strong> 2.13.2026
            </div>

            <!-- TABLE OF CONTENTS -->
            <div class="card" style="margin-bottom:1.5rem;">
                <div class="card-header"><h3>📋 Table of Contents</h3></div>
                <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:0.5rem;font-size:0.95rem;">
                    <a href="#help-home" class="help-toc-link">🏠 Home Dashboard</a>
                    <a href="#help-clerk" class="help-toc-link">🖥️ Clerk Station</a>
                    <a href="#help-quick" class="help-toc-link">⚡ Quick Scan</a>
                    <a href="#help-checkout" class="help-toc-link">📤 Check Out</a>
                    <a href="#help-return" class="help-toc-link">📥 Return</a>
                    <a href="#help-assets" class="help-toc-link">📦 Assets</a>
                    <a href="#help-batteries" class="help-toc-link">🔋 Batteries</a>
                    <a href="#help-supervisor" class="help-toc-link">📊 Supervisor</a>
                    <a href="#help-print" class="help-toc-link">🏷️ Print Codes</a>
                    <a href="#help-export" class="help-toc-link">💾 Export</a>
                    <a href="#help-scanner" class="help-toc-link">📷 Scanner Prefixes</a>
                    <a href="#help-tips" class="help-toc-link">💡 Tips & Tricks</a>
                </div>
            </div>

            <!-- HOME -->
            <div class="card help-section" id="help-home">
                <div class="card-header"><h3>🏠 Home Dashboard</h3></div>
                <p><strong>What it does:</strong> Shows you everything at a glance — how many radios are available, checked out, overdue, or broken.</p>
                <div class="help-steps">
                    <div class="help-step">
                        <div class="help-step-icon">📊</div>
                        <div>
                            <strong>Stat Cards</strong> — The colored boxes at the top show counts:
                            <ul>
                                <li><span style="color:var(--success);">🟢 Green</span> = Available radios</li>
                                <li><span style="color:var(--warning);">🟡 Orange</span> = Checked out</li>
                                <li><span style="color:var(--danger);">🔴 Red</span> = Overdue (not returned on time)</li>
                                <li><span style="color:var(--info);">🔵 Blue</span> = In maintenance</li>
                            </ul>
                        </div>
                    </div>
                    <div class="help-step">
                        <div class="help-step-icon">📻</div>
                        <div>
                            <strong>Radio Fleet Grid</strong> — Every radio is shown as a small colored box.
                            <ul>
                                <li><strong>Hover</strong> over a box to see a quick summary</li>
                                <li><strong>Click</strong> a box to open a large popup with all the details</li>
                                <li>The color legend above the grid explains what each color means</li>
                            </ul>
                        </div>
                    </div>
                    <div class="help-step">
                        <div class="help-step-icon">⚠️</div>
                        <div>
                            <strong>Alerts</strong> — Yellow boxes warn you about problems like overdue radios or equipment needing repair.
                        </div>
                    </div>
                    <div class="help-step">
                        <div class="help-step-icon">🕐</div>
                        <div>
                            <strong>Recent Activity</strong> — The table at the bottom shows the latest checkouts and returns.
                        </div>
                    </div>
                </div>
            </div>

            <!-- CLERK STATION -->
            <div class="card help-section" id="help-clerk">
                <div class="card-header"><h3>🖥️ Clerk Station</h3></div>
                <p><strong>What it does:</strong> This is the main page for clerks to check radios in and out using a scanner or keyboard.</p>
                <div class="help-steps">
                    <div class="help-step">
                        <div class="help-step-icon">1️⃣</div>
                        <div>
                            <strong>To CHECK OUT a radio:</strong>
                            <ol>
                                <li>Scan or type the <strong>radio ID</strong> (e.g. WV-001)</li>
                                <li>Then scan or type the <strong>technician's badge</strong></li>
                                <li>The system will automatically check it out ✅</li>
                            </ol>
                        </div>
                    </div>
                    <div class="help-step">
                        <div class="help-step-icon">2️⃣</div>
                        <div>
                            <strong>To CHECK IN (return) a radio:</strong>
                            <ol>
                                <li>Just scan the <strong>radio ID</strong></li>
                                <li>If it's currently checked out, it will be returned automatically ✅</li>
                            </ol>
                        </div>
                    </div>
                    <div class="help-step">
                        <div class="help-step-icon">💡</div>
                        <div>
                            <strong>The screen shows two boxes:</strong> a blue one for the radio and a purple one for the badge.
                            They fill in as you scan. The big status area tells you what happened.
                        </div>
                    </div>
                </div>
            </div>

            <!-- QUICK SCAN -->
            <div class="card help-section" id="help-quick">
                <div class="card-header"><h3>⚡ Quick Scan</h3></div>
                <p><strong>What it does:</strong> A faster, simpler scan page. Good for self-service or rapid scanning.</p>
                <div class="help-steps">
                    <div class="help-step">
                        <div class="help-step-icon">🔄</div>
                        <div>
                            <strong>Two modes at the top:</strong>
                            <ul>
                                <li><strong>CHECK OUT</strong> — Scan badge first, then radio</li>
                                <li><strong>CHECK IN</strong> — Just scan the radio to return it</li>
                            </ul>
                            Click the mode button to switch between them.
                        </div>
                    </div>
                    <div class="help-step">
                        <div class="help-step-icon">📷</div>
                        <div>
                            <strong>Camera scan:</strong> Click the camera button to use your device's camera to scan barcodes or QR codes.
                        </div>
                    </div>
                </div>
            </div>

            <!-- CHECKOUT -->
            <div class="card help-section" id="help-checkout">
                <div class="card-header"><h3>📤 Check Out (Manual)</h3></div>
                <p><strong>What it does:</strong> Check out a radio without a scanner. Use dropdown menus to pick the radio and technician.</p>
                <div class="help-steps">
                    <div class="help-step">
                        <div class="help-step-icon">👆</div>
                        <div>
                            <ol>
                                <li>Pick the <strong>radio</strong> from the dropdown (only shows available ones)</li>
                                <li>Enter or pick the <strong>technician's badge ID</strong></li>
                                <li>Click <strong>Check Out</strong></li>
                            </ol>
                            This is the same as scanning, just done by hand.
                        </div>
                    </div>
                </div>
            </div>

            <!-- RETURN -->
            <div class="card help-section" id="help-return">
                <div class="card-header"><h3>📥 Return (Manual)</h3></div>
                <p><strong>What it does:</strong> Return a radio without a scanner.</p>
                <div class="help-steps">
                    <div class="help-step">
                        <div class="help-step-icon">👆</div>
                        <div>
                            <ol>
                                <li>Pick the <strong>radio</strong> from the dropdown (only shows checked-out ones)</li>
                                <li>Select the <strong>condition</strong>: Good, Fair, or Damaged</li>
                                <li>If damaged, you can add a note about what's wrong</li>
                                <li>Click <strong>Return</strong></li>
                            </ol>
                            ⚠️ <strong>Damaged items</strong> are automatically flagged for supervisor review and moved to Maintenance.
                        </div>
                    </div>
                </div>
            </div>

            <!-- ASSETS -->
            <div class="card help-section" id="help-assets">
                <div class="card-header"><h3>📦 Assets</h3></div>
                <p><strong>What it does:</strong> Add new equipment, edit existing items, or change their status.</p>
                <div class="help-steps">
                    <div class="help-step">
                        <div class="help-step-icon">➕</div>
                        <div>
                            <strong>Add a Radio:</strong> Click <strong>"+ Add Radio"</strong>, fill in the ID, model, and serial number.
                            <ul>
                                <li>Use the <strong>Quick Label Generator</strong> to build an ID like WV_MAINT_01</li>
                                <li>IDs starting with <strong>WV</strong> are auto-detected by the scanner (recommended)</li>
                                <li>Click <strong>🖨️ Save & Print Label</strong> to save AND print a barcode/QR in one step</li>
                            </ul>
                        </div>
                    </div>
                    <div class="help-step">
                        <div class="help-step-icon">✏️</div>
                        <div>
                            <strong>Edit:</strong> Click the <strong>Edit</strong> button on any row to change model, serial number, notes, or status.
                        </div>
                    </div>
                    <div class="help-step">
                        <div class="help-step-icon">🔀</div>
                        <div>
                            <strong>Change Status:</strong> You can set a radio to Available, Maintenance, Retired, or Lost.
                        </div>
                    </div>
                    <div class="help-step">
                        <div class="help-step-icon">🔍</div>
                        <div>
                            <strong>Search & Filter:</strong> Use the search box to find any asset. Use the status filter to show only certain types.
                        </div>
                    </div>
                </div>
            </div>

            <!-- BATTERIES -->
            <div class="card help-section" id="help-batteries">
                <div class="card-header"><h3>🔋 Batteries</h3></div>
                <p><strong>What it does:</strong> Track battery inventory separately — new batteries, legacy batteries, and retired ones.</p>
                <div class="help-steps">
                    <div class="help-step">
                        <div class="help-step-icon">📊</div>
                        <div>
                            The dashboard shows battery health stats at the top, followed by a table of all batteries.
                            You can add, edit, and retire batteries from here.
                        </div>
                    </div>
                </div>
            </div>

            <!-- SUPERVISOR -->
            <div class="card help-section" id="help-supervisor">
                <div class="card-header"><h3>📊 Supervisor Dashboard</h3></div>
                <p><strong>What it does:</strong> Admin-only area with alerts, settings, and advanced features. <strong>Password protected.</strong></p>
                <div class="help-steps">
                    <div class="help-step">
                        <div class="help-step-icon">🔒</div>
                        <div>
                            <strong>Password:</strong> The first time you open it, there's no password.
                            Set one inside the dashboard under "Dashboard Password." After that, you'll need to enter it every time.
                        </div>
                    </div>
                    <div class="help-step">
                        <div class="help-step-icon">⏰</div>
                        <div>
                            <strong>Overdue Threshold:</strong> Set how many hours before a radio is considered overdue (default: 15 hours).
                        </div>
                    </div>
                    <div class="help-step">
                        <div class="help-step-icon">📧</div>
                        <div>
                            <strong>Email Alerts:</strong> Add email contacts and a message template. Click "Send Alert" to open your email app
                            with a pre-filled email listing all overdue radios.
                        </div>
                    </div>
                    <div class="help-step">
                        <div class="help-step-icon">🔄</div>
                        <div>
                            <strong>Network Sync:</strong> Back up your database to a shared network folder automatically.
                            <ul>
                                <li>Set the network path (e.g. \\\\server\\share\\backup)</li>
                                <li>Choose how often to push (1, 4, 8, or 16 hours)</li>
                                <li>Uses dual backup files (A/B) for safety</li>
                                <li>Green/red dots show if local and network backups are healthy</li>
                            </ul>
                        </div>
                    </div>
                    <div class="help-step">
                        <div class="help-step-icon">🏷️</div>
                        <div>
                            <strong>Scanner Prefixes:</strong> Configure what ID prefixes mean what type of asset.
                            Default: WV = Radio, BAT = Battery, T = Tool. You can add your own!
                        </div>
                    </div>
                    <div class="help-step">
                        <div class="help-step-icon">🧪</div>
                        <div>
                            <strong>Test Harness:</strong> The 🧪 Test button (top-right of supervisor page) runs a full simulation
                            and test suite to verify everything works. Great for demos.
                        </div>
                    </div>
                </div>
            </div>

            <!-- PRINT CODES -->
            <div class="card help-section" id="help-print">
                <div class="card-header"><h3>🏷️ Print Codes</h3></div>
                <p><strong>What it does:</strong> Generate QR codes or barcodes for any asset and print them as labels.</p>
                <div class="help-steps">
                    <div class="help-step">
                        <div class="help-step-icon">1️⃣</div>
                        <div>
                            <strong>Choose code type:</strong> QR Code or Barcode (Code 128).
                        </div>
                    </div>
                    <div class="help-step">
                        <div class="help-step-icon">2️⃣</div>
                        <div>
                            <strong>Single or Batch:</strong>
                            <ul>
                                <li><strong>Single</strong> — Pick one asset or type custom text</li>
                                <li><strong>Batch</strong> — Select multiple assets and print all at once</li>
                            </ul>
                        </div>
                    </div>
                    <div class="help-step">
                        <div class="help-step-icon">3️⃣</div>
                        <div>
                            Click <strong>Generate</strong> to preview, then <strong>🖨️ Print Labels</strong> to print.
                        </div>
                    </div>
                </div>
            </div>

            <!-- EXPORT -->
            <div class="card help-section" id="help-export">
                <div class="card-header"><h3>💾 Export</h3></div>
                <p><strong>What it does:</strong> Save your data, load data from a file, or clear everything.</p>
                <div class="help-steps">
                    <div class="help-step">
                        <div class="help-step-icon">📥</div>
                        <div>
                            <strong>Export:</strong> Download your data as an Excel (.xlsx) or JSON file. Great for reports or backups.
                        </div>
                    </div>
                    <div class="help-step">
                        <div class="help-step-icon">📤</div>
                        <div>
                            <strong>Import:</strong> Load data from a previously exported JSON file.
                        </div>
                    </div>
                    <div class="help-step">
                        <div class="help-step-icon">🗑️</div>
                        <div>
                            <strong>Clear All Data:</strong> ⚠️ Deletes everything! You must type <strong>DELETE</strong> to confirm.
                            Always export a backup first!
                        </div>
                    </div>
                </div>
            </div>

            <!-- SCANNER PREFIXES -->
            <div class="card help-section" id="help-scanner">
                <div class="card-header"><h3>📷 How the Scanner Works</h3></div>
                <p><strong>The scanner automatically figures out what you scanned based on the first characters:</strong></p>
                <div class="help-steps">
                    <div class="help-step">
                        <div class="help-step-icon">📻</div>
                        <div>
                            <strong>Starts with WV</strong> → It's a <strong>Radio</strong> (e.g. WV-001, WV_MAINT_01)
                        </div>
                    </div>
                    <div class="help-step">
                        <div class="help-step-icon">🔋</div>
                        <div>
                            <strong>Starts with BAT</strong> → It's a <strong>Battery</strong> (e.g. BAT-05)
                        </div>
                    </div>
                    <div class="help-step">
                        <div class="help-step-icon">🔧</div>
                        <div>
                            <strong>Starts with T</strong> → It's a <strong>Tool</strong> (e.g. T-010)
                        </div>
                    </div>
                    <div class="help-step">
                        <div class="help-step-icon">🪪</div>
                        <div>
                            <strong>Starts with a number</strong> → It's a <strong>Badge</strong> (e.g. 12345, 99887)
                        </div>
                    </div>
                    <div class="help-step">
                        <div class="help-step-icon">⚙️</div>
                        <div>
                            You can <strong>change these prefixes</strong> or add new ones in the Supervisor Dashboard under "Scanner Prefixes."
                        </div>
                    </div>
                </div>
            </div>

            <!-- TIPS -->
            <div class="card help-section" id="help-tips">
                <div class="card-header"><h3>💡 Tips & Tricks</h3></div>
                <div class="help-steps">
                    <div class="help-step">
                        <div class="help-step-icon">🎨</div>
                        <div>
                            <strong>Change the theme:</strong> Use the dropdown in the top-right corner. There are 7 themes including USPS branded ones and a dark mode.
                        </div>
                    </div>
                    <div class="help-step">
                        <div class="help-step-icon">👤</div>
                        <div>
                            <strong>Change clerk name:</strong> Click your name in the top-right corner. This name is attached to every transaction you make.
                        </div>
                    </div>
                    <div class="help-step">
                        <div class="help-step-icon">💾</div>
                        <div>
                            <strong>Data is saved locally:</strong> All data lives in your browser (IndexedDB). No internet needed.
                            But make sure to export backups regularly!
                        </div>
                    </div>
                    <div class="help-step">
                        <div class="help-step-icon">🔊</div>
                        <div>
                            <strong>Sound feedback:</strong> The scanner pages play beep sounds and speak the result out loud
                            (if your browser supports speech). Great for hands-free scanning.
                        </div>
                    </div>
                    <div class="help-step">
                        <div class="help-step-icon">⌨️</div>
                        <div>
                            <strong>No scanner? No problem:</strong> You can always type an ID manually and press Enter.
                            The scanner input box is always focused and ready.
                        </div>
                    </div>
                    <div class="help-step">
                        <div class="help-step-icon">📱</div>
                        <div>
                            <strong>Works on tablets:</strong> The layout is responsive and works on tablets and large phones too.
                        </div>
                    </div>
                </div>
            </div>

            <div style="text-align:center;padding:1.5rem;color:var(--text-muted);font-size:0.85rem;">
                📻 USPS Asset Tracker v1.0 — Author: WB — 2.13.2026
            </div>
        </div>
    `;

    // Smooth scroll for TOC links
    container.querySelectorAll('.help-toc-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const target = document.querySelector(link.getAttribute('href'));
            if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    });
});
