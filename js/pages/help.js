/**
 * Help / Instruction Manual — simple, visual guide for all features.
 */
UI.registerPage('help', async (container) => {
    const _info = await _AP.getInfo();
    container.innerHTML = `
        <div style="max-width:900px;margin:0 auto;">
            <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:0.5rem;margin-bottom:1rem;">
                <h2 class="page-title" style="margin-bottom:0;">📖 Instruction Manual</h2>
                <button class="btn btn-outline" onclick="UI.navigateTo('home')">← Back to Home</button>
            </div>

            <div style="background:var(--primary-light);padding:1rem 1.25rem;border-radius:var(--radius);margin-bottom:1.5rem;font-size:0.95rem;">
                <strong>Welcome to the ${_info.app}!</strong><br>
                This app tracks radios, batteries, and tools. You can check equipment in and out,
                print labels, get alerts for overdue items, and export reports — all from your browser.
                <br><br>
                <strong>Version:</strong> ${_info.version} &nbsp;|&nbsp; <strong>Author:</strong> ${_info.author} &nbsp;|&nbsp; <strong>Date:</strong> ${_info.date}
            </div>

            <!-- SEARCH -->
            <div class="card" style="margin-bottom:1rem;">
                <div style="display:flex;align-items:center;gap:0.5rem;">
                    <span style="font-size:1.2rem;">🔍</span>
                    <input type="text" id="help-search" placeholder="Search the manual... (e.g. overdue, scan, password, print)" autocomplete="off"
                        style="flex:1;padding:0.6rem 0.8rem;font-size:1rem;border:1px solid var(--border);border-radius:var(--radius);background:var(--input-bg);color:var(--text);">
                    <button class="btn btn-sm btn-outline" id="help-search-clear" style="display:none;">✕ Clear</button>
                </div>
                <div id="help-search-info" style="font-size:0.8rem;color:var(--text-muted);margin-top:0.4rem;display:none;"></div>
            </div>

            <!-- TABLE OF CONTENTS -->
            <div class="card" style="margin-bottom:1.5rem;" id="help-toc-card">
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
                    <a href="#help-backup" class="help-toc-link">💾 Database Backup & Sync</a>
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

            <!-- DATABASE BACKUP & SYNC -->
            <div class="card help-section" id="help-backup">
                <div class="card-header"><h3>💾 Database Backup & Sync</h3></div>
                <p><strong>Important:</strong> Your data lives in the browser, NOT in the app folder. If you copy the app to another computer, the data doesn't come with it — unless you use the backup features below.</p>
                <div class="help-steps">
                    <div class="help-step">
                        <div class="help-step-icon">💾</div>
                        <div>
                            <strong>Save Button (💾 Save in header):</strong> Click this to save your database to a file called <code>db-snapshot.json</code> in the app folder.
                            <ul>
                                <li>First time: it asks you where to save — pick your app folder</li>
                                <li>After that, it saves silently every time your data changes</li>
                                <li>When you copy the folder to another machine, this file goes with it</li>
                                <li>The new machine sees the file on startup and loads it automatically</li>
                            </ul>
                        </div>
                    </div>
                    <div class="help-step">
                        <div class="help-step-icon">🔄</div>
                        <div>
                            <strong>Folder Sync (Supervisor → Folder Sync & Backup):</strong> For sharing data between multiple machines.
                            <ul>
                                <li>Pick a shared network folder (like <code>\\server\share\backup</code>)</li>
                                <li>The app automatically saves your database to that folder on a timer (1, 4, 8, or 16 hours)</li>
                                <li>Other machines can load from the same folder</li>
                                <li>Uses two alternating backup files (A and B) for crash safety</li>
                            </ul>
                        </div>
                    </div>
                    <div class="help-step">
                        <div class="help-step-icon" style="font-size:1.5rem;">🔵</div>
                        <div>
                            <strong>The Blue "Connect" Banner:</strong> Every time you open the app, you'll see a blue banner at the top:
                            <div style="background:linear-gradient(135deg,#1565c0,#1a73e8);color:#fff;padding:0.5rem 0.75rem;border-radius:6px;margin:0.5rem 0;font-size:0.85rem;text-align:center;">
                                💾 Click the button below to connect your backup folders
                            </div>
                            <strong>Just click it.</strong> This is required by the browser for security — the app needs your permission to save files.
                            After one click, everything saves automatically for the rest of the session.
                        </div>
                    </div>
                    <div class="help-step">
                        <div class="help-step-icon">🛡️</div>
                        <div>
                            <strong>Newer Data Always Wins:</strong> The app will <em>never</em> overwrite a newer database with older data.
                            <ul>
                                <li>Every time data changes, the app records the exact time</li>
                                <li>Before saving to a backup file, the app checks: is the file already newer?</li>
                                <li>If the backup file is newer, the save is <strong>skipped</strong> — you'll see a message: <em>"Backup folder has newer data — save skipped to protect it"</em></li>
                                <li>When you reconnect, the app checks: is the backup folder newer than my local data? If yes, it <strong>loads the newer data automatically</strong></li>
                                <li>You'll see a message: <em>"Loaded newer data from backup folder ✅"</em></li>
                            </ul>
                        </div>
                    </div>
                    <div class="help-step">
                        <div class="help-step-icon">📋</div>
                        <div>
                            <strong>Messages you might see:</strong>
                            <table style="width:100%;font-size:0.85rem;border-collapse:collapse;margin-top:0.5rem;">
                                <tr style="border-bottom:1px solid var(--border);">
                                    <td style="padding:0.3rem;">✅ <em>"Auto-save connected"</em></td>
                                    <td style="padding:0.3rem;">Backup is working. No action needed.</td>
                                </tr>
                                <tr style="border-bottom:1px solid var(--border);">
                                    <td style="padding:0.3rem;">✅ <em>"Loaded newer data from backup folder"</em></td>
                                    <td style="padding:0.3rem;">Another machine saved newer data. Your screen will update.</td>
                                </tr>
                                <tr style="border-bottom:1px solid var(--border);">
                                    <td style="padding:0.3rem;">ℹ️ <em>"Backup folder has newer data — save skipped"</em></td>
                                    <td style="padding:0.3rem;">Your data is older. The app protected the newer backup. Normal.</td>
                                </tr>
                                <tr style="border-bottom:1px solid var(--border);">
                                    <td style="padding:0.3rem;">✅ <em>"Database restored from snapshot file"</em></td>
                                    <td style="padding:0.3rem;">Fresh machine loaded data from db-snapshot.json in the folder.</td>
                                </tr>
                                <tr>
                                    <td style="padding:0.3rem;">❌ <em>"No backup files found"</em></td>
                                    <td style="padding:0.3rem;">The folder is empty. Save data first from the other machine.</td>
                                </tr>
                            </table>
                        </div>
                    </div>
                    <div class="help-step">
                        <div class="help-step-icon">🚨</div>
                        <div>
                            <strong>Emergency Backup:</strong> A safety net that runs silently in the background.
                            <ul>
                                <li>The app saves an emergency copy of your database <strong>2 minutes after the last activity</strong> (checkout, return, adding radios, etc.)</li>
                                <li>It also saves every <strong>8 hours</strong> as a safety net even if nothing changes</li>
                                <li>This backup is stored inside the browser automatically — <strong>no folder connection needed</strong></li>
                                <li>If your folder is connected, a bonus copy is also saved as <code>db-emergency.bak</code></li>
                                <li>This file is <strong>never used for automatic restore</strong> — it's only used if everything else fails</li>
                                <li>To use it: click the <strong>?</strong> button in the top bar → click <strong>🚨 Emergency Database Restoration</strong></li>
                                <li>You'll get two warning prompts before it restores — this is intentional to prevent accidents</li>
                            </ul>
                            <div style="background:var(--danger-light, #fff3f3);border:1px solid var(--danger, red);border-radius:6px;padding:0.5rem 0.75rem;margin-top:0.5rem;font-size:0.85rem;">
                                <strong>When to use emergency restore:</strong><br>
                                Only if your database is empty/corrupted AND the snapshot file is missing AND the network backup folder is unavailable. This is the last resort.
                            </div>
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
                            Use the 💾 Save button and Folder Sync to keep backups. See the <a href="#help-backup" class="help-toc-link" style="display:inline;">Database Backup & Sync</a> section for details.
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
                📻 ${_info.app} v${_info.version} — Author: ${_info.author} — ${_info.date}
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

    // ===== Fuzzy search =====
    const searchInput = document.getElementById('help-search');
    const searchInfo = document.getElementById('help-search-info');
    const searchClear = document.getElementById('help-search-clear');
    const tocCard = document.getElementById('help-toc-card');
    const sections = container.querySelectorAll('.help-section');

    // Common synonyms / fuzzy keyword map
    const synonyms = {
        'login': ['password', 'unlock', 'supervisor', 'lock'],
        'pw': ['password'],
        'pass': ['password'],
        'scan': ['scanner', 'barcode', 'qr', 'camera', 'scan'],
        'label': ['print', 'barcode', 'qr', 'codes'],
        'barcode': ['print', 'label', 'qr', 'codes'],
        'qr': ['print', 'label', 'barcode', 'codes'],
        'backup': ['export', 'sync', 'network', 'save'],
        'save': ['export', 'backup', 'sync'],
        'delete': ['clear', 'erase', 'remove', 'wipe'],
        'erase': ['clear', 'delete', 'remove'],
        'wipe': ['clear', 'delete', 'erase'],
        'broken': ['damaged', 'maintenance', 'repair'],
        'repair': ['damaged', 'maintenance', 'broken'],
        'fix': ['damaged', 'maintenance', 'repair'],
        'late': ['overdue', 'hours', 'threshold'],
        'missing': ['overdue', 'lost'],
        'lost': ['missing', 'retired'],
        'theme': ['dark', 'light', 'color', 'usps'],
        'dark': ['theme', 'night', 'midnight'],
        'color': ['theme'],
        'tech': ['technician', 'badge'],
        'badge': ['technician', 'tech', 'scan'],
        'email': ['alert', 'notify', 'overdue', 'contact'],
        'alert': ['email', 'overdue', 'notify'],
        'notify': ['email', 'alert', 'overdue'],
        'sync': ['network', 'backup', 'push', 'pull'],
        'network': ['sync', 'backup', 'push', 'pull'],
        'add': ['create', 'new', 'assets'],
        'new': ['add', 'create'],
        'checkout': ['check out', 'scan', 'radio'],
        'checkin': ['return', 'check in', 'scan'],
        'import': ['load', 'upload', 'json'],
        'xlsx': ['excel', 'export', 'spreadsheet'],
        'excel': ['xlsx', 'export', 'spreadsheet'],
        'prefix': ['scanner', 'wv', 'bat', 'category'],
        'wv': ['prefix', 'radio', 'scanner'],
        'bat': ['prefix', 'battery', 'scanner'],
        'manual': ['help', 'instructions', 'guide'],
        'help': ['manual', 'instructions', 'guide']
    };

    function expandQuery(query) {
        const words = query.toLowerCase().split(/\s+/).filter(Boolean);
        const expanded = new Set(words);
        for (const word of words) {
            // Add synonyms
            if (synonyms[word]) {
                synonyms[word].forEach(s => expanded.add(s));
            }
            // Add partial matches from synonym keys
            for (const key of Object.keys(synonyms)) {
                if (key.includes(word) || word.includes(key)) {
                    expanded.add(key);
                    synonyms[key].forEach(s => expanded.add(s));
                }
            }
        }
        return [...expanded];
    }

    function searchSections(query) {
        if (!query.trim()) {
            // Show everything
            sections.forEach(s => {
                s.style.display = '';
                // Remove highlights
                s.querySelectorAll('.help-highlight').forEach(h => {
                    h.replaceWith(document.createTextNode(h.textContent));
                });
            });
            tocCard.style.display = '';
            searchInfo.style.display = 'none';
            searchClear.style.display = 'none';
            return;
        }

        const terms = expandQuery(query);
        let matchCount = 0;
        const matchedSections = [];

        sections.forEach(section => {
            const text = section.textContent.toLowerCase();
            const score = terms.reduce((acc, term) => acc + (text.includes(term) ? 1 : 0), 0);

            if (score > 0) {
                section.style.display = '';
                matchCount++;
                matchedSections.push({ section, score });

                // Highlight matching terms in visible text
                section.querySelectorAll('.help-highlight').forEach(h => {
                    h.replaceWith(document.createTextNode(h.textContent));
                });
                highlightTerms(section, query.toLowerCase().split(/\s+/).filter(Boolean));
            } else {
                section.style.display = 'none';
            }
        });

        // Sort matched sections to top (move DOM nodes)
        matchedSections.sort((a, b) => b.score - a.score);

        tocCard.style.display = 'none';
        searchClear.style.display = 'inline-flex';
        searchInfo.style.display = 'block';

        if (matchCount === 0) {
            searchInfo.innerHTML = `No results for "<strong>${query}</strong>". Try different keywords.`;
        } else {
            const termList = terms.slice(0, 8).join(', ');
            searchInfo.innerHTML = `Found <strong>${matchCount}</strong> section${matchCount !== 1 ? 's' : ''} matching: ${termList}${terms.length > 8 ? '…' : ''}`;
        }
    }

    function highlightTerms(section, words) {
        const walker = document.createTreeWalker(section, NodeFilter.SHOW_TEXT, null, false);
        const textNodes = [];
        while (walker.nextNode()) textNodes.push(walker.currentNode);

        for (const node of textNodes) {
            if (!node.textContent.trim()) continue;
            // Skip if parent is already a highlight or an input/script
            if (node.parentElement.classList?.contains('help-highlight')) continue;
            if (['SCRIPT', 'STYLE', 'INPUT', 'TEXTAREA'].includes(node.parentElement.tagName)) continue;

            let html = node.textContent;
            let changed = false;
            for (const word of words) {
                if (word.length < 2) continue;
                const regex = new RegExp(`(${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
                if (regex.test(html)) {
                    html = html.replace(regex, '<mark class="help-highlight" style="background:var(--warning-light);padding:0 2px;border-radius:2px;">$1</mark>');
                    changed = true;
                }
            }
            if (changed) {
                const span = document.createElement('span');
                span.innerHTML = html;
                node.replaceWith(span);
            }
        }
    }

    searchInput.addEventListener('input', UI.debounce(() => {
        searchSections(searchInput.value);
    }, 200));

    searchClear.addEventListener('click', () => {
        searchInput.value = '';
        searchSections('');
        searchInput.focus();
    });

    // Auto-focus search on page load
    setTimeout(() => searchInput.focus(), 100);
});
