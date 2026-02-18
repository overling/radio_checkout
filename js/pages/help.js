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
                This app tracks radios, batteries, and tools at your facility. You can check equipment in and out,
                print labels, get alerts for overdue items, and export reports — all from your browser. <strong>No internet required.</strong>
                <br><br>
                <strong>Version:</strong> ${_info.version} &nbsp;|&nbsp; <strong>Author:</strong> ${_info.author} &nbsp;|&nbsp; <strong>Date:</strong> ${_info.date}
            </div>

            <!-- SEARCH -->
            <div class="card" style="margin-bottom:1rem;">
                <div style="display:flex;align-items:center;gap:0.5rem;">
                    <span style="font-size:1.2rem;">🔍</span>
                    <input type="text" id="help-search" placeholder="Search the manual... (e.g. swap, overdue, scan, broken, password)" autocomplete="off"
                        style="flex:1;padding:0.6rem 0.8rem;font-size:1rem;border:1px solid var(--border);border-radius:var(--radius);background:var(--input-bg);color:var(--text);">
                    <button class="btn btn-sm btn-outline" id="help-search-clear" style="display:none;">✕ Clear</button>
                </div>
                <div id="help-search-info" style="font-size:0.8rem;color:var(--text-muted);margin-top:0.4rem;display:none;"></div>
            </div>

            <!-- TABLE OF CONTENTS -->
            <div class="card" style="margin-bottom:1.5rem;" id="help-toc-card">
                <div class="card-header"><h3>📋 Table of Contents</h3></div>
                <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:0.5rem;font-size:0.95rem;">
                    <a href="#help-home" class="help-toc-link">🏠 Home Dashboard</a>
                    <a href="#help-clerk" class="help-toc-link">🖥️ Clerk Station</a>
                    <a href="#help-quick" class="help-toc-link">⚡ Quick Scan</a>
                    <a href="#help-checkout" class="help-toc-link">📤 Check Out Radio</a>
                    <a href="#help-return" class="help-toc-link">📥 Return Radio</a>
                    <a href="#help-swap" class="help-toc-link">🔄 Swap a Faulty Radio</a>
                    <a href="#help-mistakes" class="help-toc-link">🚫 Fixing Mistakes</a>
                    <a href="#help-assets" class="help-toc-link">📦 Assets & Technicians</a>
                    <a href="#help-batteries" class="help-toc-link">🔋 Batteries</a>
                    <a href="#help-supervisor" class="help-toc-link">📊 Supervisor Dashboard</a>
                    <a href="#help-print" class="help-toc-link">🏷️ Print Codes</a>
                    <a href="#help-export" class="help-toc-link">💾 Export / Import</a>
                    <a href="#help-scanner" class="help-toc-link">📷 How the Scanner Works</a>
                    <a href="#help-backup" class="help-toc-link">💾 Backup & Sync</a>
                    <a href="#help-tips" class="help-toc-link">💡 Tips & Tricks</a>
                </div>
            </div>

            <!-- ═══════════ HOME ═══════════ -->
            <div class="card help-section" id="help-home">
                <div class="card-header"><h3>🏠 Home Dashboard</h3></div>
                <p>Your at-a-glance overview. Open the app and this is what you see.</p>
                <div class="help-steps">
                    <div class="help-step">
                        <div class="help-step-icon">📊</div>
                        <div>
                            <strong>Stat Cards</strong> — The colored boxes at the top show counts:
                            <ul>
                                <li><span style="color:var(--success);">🟢 Green</span> = Available radios (ready to hand out)</li>
                                <li><span style="color:var(--warning);">🟡 Orange</span> = Checked out (someone has them)</li>
                                <li><span style="color:var(--danger);">🔴 Red</span> = Overdue (not returned on time!)</li>
                                <li><span style="color:var(--info);">🔵 Blue</span> = In maintenance (broken or being repaired)</li>
                            </ul>
                        </div>
                    </div>
                    <div class="help-step">
                        <div class="help-step-icon">📻</div>
                        <div>
                            <strong>Radio Fleet Grid</strong> — Every radio is a small colored box.
                            <ul>
                                <li><strong>Hover</strong> over a box to see who has it</li>
                                <li><strong>Click</strong> a box to open a detailed popup with full history</li>
                                <li>The color legend above the grid explains each color</li>
                            </ul>
                        </div>
                    </div>
                    <div class="help-step">
                        <div class="help-step-icon">⚠️</div>
                        <div><strong>Alerts</strong> — Yellow warning boxes appear for overdue radios or equipment flagged for review.</div>
                    </div>
                    <div class="help-step">
                        <div class="help-step-icon">🕐</div>
                        <div><strong>Recent Activity</strong> — The table at the bottom shows the latest checkouts and returns.</div>
                    </div>
                </div>
            </div>

            <!-- ═══════════ CLERK STATION ═══════════ -->
            <div class="card help-section" id="help-clerk">
                <div class="card-header"><h3>🖥️ Clerk Station</h3></div>
                <p><strong>The fastest way to check radios in and out.</strong> One scan box — the system figures out what you scanned automatically.</p>

                <div style="background:var(--primary-light);border-radius:var(--radius);padding:0.75rem 1rem;margin-bottom:1rem;font-size:0.9rem;">
                    <strong>Best for:</strong> Processing a line of technicians quickly. Just keep scanning — the system handles everything.
                </div>

                <div class="help-steps">
                    <div class="help-step">
                        <div class="help-step-icon">📤</div>
                        <div>
                            <strong>To CHECK OUT a radio:</strong>
                            <ol>
                                <li>Scan the <strong>radio barcode</strong> (e.g. WV-001)</li>
                                <li>Then scan the <strong>technician's badge</strong></li>
                                <li>You hear "Checked out" and it's done ✅</li>
                            </ol>
                        </div>
                    </div>
                    <div class="help-step">
                        <div class="help-step-icon">📥</div>
                        <div>
                            <strong>To RETURN a radio:</strong>
                            <ol>
                                <li>Just scan the <strong>radio barcode</strong></li>
                                <li>If it's checked out, it returns automatically ✅</li>
                            </ol>
                            <em>You don't need to scan a badge for returns — just the radio.</em>
                        </div>
                    </div>
                    <div class="help-step">
                        <div class="help-step-icon">💡</div>
                        <div>
                            <strong>The two colored boxes</strong> (blue = radio, purple = badge) fill in as you scan.
                            The big status area tells you what happened. It resets automatically so you can scan the next person.
                        </div>
                    </div>
                </div>
            </div>

            <!-- ═══════════ QUICK SCAN ═══════════ -->
            <div class="card help-section" id="help-quick">
                <div class="card-header"><h3>⚡ Quick Scan</h3></div>
                <p>A simplified scan page with two clear modes. Good for self-service or when you want a cleaner interface.</p>
                <div class="help-steps">
                    <div class="help-step">
                        <div class="help-step-icon">🔄</div>
                        <div>
                            <strong>Two modes — click to switch:</strong>
                            <ul>
                                <li><strong>CHECK OUT</strong> — Scan badge first, then radio</li>
                                <li><strong>CHECK IN</strong> — Just scan the radio to return it</li>
                            </ul>
                        </div>
                    </div>
                    <div class="help-step">
                        <div class="help-step-icon">📷</div>
                        <div><strong>Camera scan:</strong> Click the 📷 button to use your device's camera to scan barcodes or QR codes.</div>
                    </div>
                </div>
            </div>

            <!-- ═══════════ CHECKOUT ═══════════ -->
            <div class="card help-section" id="help-checkout">
                <div class="card-header"><h3>📤 Check Out Radio</h3></div>
                <p><strong>The step-by-step checkout page.</strong> Guides you through each step with clear prompts.</p>

                <div style="background:var(--success-light, #e8f5e9);border:1px solid var(--success, #4CAF50);border-radius:var(--radius);padding:0.75rem 1rem;margin-bottom:1rem;">
                    <strong>Normal checkout flow:</strong><br>
                    <div style="display:flex;align-items:center;gap:0.5rem;margin-top:0.4rem;font-size:1rem;flex-wrap:wrap;">
                        <span style="background:var(--primary);color:#fff;border-radius:50%;width:28px;height:28px;display:inline-flex;align-items:center;justify-content:center;font-size:0.8rem;font-weight:700;">1</span>
                        Scan <strong>radio</strong>
                        <span style="font-size:1.2rem;">→</span>
                        <span style="background:var(--primary);color:#fff;border-radius:50%;width:28px;height:28px;display:inline-flex;align-items:center;justify-content:center;font-size:0.8rem;font-weight:700;">2</span>
                        Scan <strong>badge</strong>
                        <span style="font-size:1.2rem;">→</span>
                        <span style="background:var(--success);color:#fff;border-radius:50%;width:28px;height:28px;display:inline-flex;align-items:center;justify-content:center;font-size:0.8rem;font-weight:700;">✓</span>
                        <strong>Done!</strong>
                    </div>
                </div>

                <div class="help-steps">
                    <div class="help-step">
                        <div class="help-step-icon">⚡</div>
                        <div>
                            <strong>⚡ Auto-checkout checkbox</strong> — When checked, the checkout completes instantly after scanning the badge. No confirmation step needed. <em>Recommended for speed — two scans and it's done.</em>
                        </div>
                    </div>
                    <div class="help-step">
                        <div class="help-step-icon">🪪</div>
                        <div>
                            <strong>🪪 New badge?</strong> If you scan a badge the system hasn't seen before, it auto-registers the person.
                            With "Prompt for name" checked, you'll be asked to type their name. With it unchecked, they're registered silently.
                        </div>
                    </div>
                    <div class="help-step">
                        <div class="help-step-icon">↩️</div>
                        <div>
                            <strong>↩ "Wrong radio? Re-scan" button</strong> — Appears in Step 2 after you've scanned the radio.
                            Click it if you grabbed the wrong radio. <strong>Nothing is saved — it just goes back to Step 1.</strong>
                        </div>
                    </div>
                    <div class="help-step">
                        <div class="help-step-icon">🔄</div>
                        <div>
                            <strong>🔄 "Radio Faulty — Swap It" button</strong> — Appears on the success screen after checkout is complete.
                            <br>The tech turns on the radio and it doesn't work? Click this:
                            <ol>
                                <li>The bad radio is <strong>automatically returned as broken</strong> (moved to Maintenance)</li>
                                <li>A yellow banner appears: "Swap in progress — scan a replacement for [name]"</li>
                                <li>You just <strong>scan the new radio</strong> — the tech's badge auto-fills</li>
                                <li>Done! The tech walks away with a working radio</li>
                            </ol>
                            <div style="background:var(--warning-light, #fff8e1);border:1px solid var(--warning, #ff9800);border-radius:6px;padding:0.4rem 0.6rem;margin-top:0.5rem;font-size:0.85rem;">
                                <strong>What happens behind the scenes:</strong> The broken radio gets a return record marked "Needs Repair" with a note. It moves to Maintenance.
                            </div>
                        </div>
                    </div>
                    <div class="help-step">
                        <div class="help-step-icon">⏱️</div>
                        <div>
                            <strong>Auto-reset timer</strong> — After checkout, the screen counts down 3 seconds then resets for the next person.
                            Click "Check Out Another Radio" to skip the wait, or just start scanning — any scan cancels the timer.
                        </div>
                    </div>
                </div>
            </div>

            <!-- ═══════════ RETURN ═══════════ -->
            <div class="card help-section" id="help-return">
                <div class="card-header"><h3>📥 Return Radio</h3></div>
                <p><strong>The step-by-step return page.</strong> Lets you record the condition of the radio when it comes back.</p>

                <div style="background:var(--success-light, #e8f5e9);border:1px solid var(--success, #4CAF50);border-radius:var(--radius);padding:0.75rem 1rem;margin-bottom:1rem;">
                    <strong>Normal return flow:</strong><br>
                    <div style="display:flex;align-items:center;gap:0.5rem;margin-top:0.4rem;font-size:1rem;flex-wrap:wrap;">
                        <span style="background:var(--primary);color:#fff;border-radius:50%;width:28px;height:28px;display:inline-flex;align-items:center;justify-content:center;font-size:0.8rem;font-weight:700;">1</span>
                        Scan <strong>radio</strong>
                        <span style="font-size:1.2rem;">→</span>
                        <span style="background:var(--primary);color:#fff;border-radius:50%;width:28px;height:28px;display:inline-flex;align-items:center;justify-content:center;font-size:0.8rem;font-weight:700;">2</span>
                        Pick <strong>condition</strong>
                        <span style="font-size:1.2rem;">→</span>
                        <span style="background:var(--primary);color:#fff;border-radius:50%;width:28px;height:28px;display:inline-flex;align-items:center;justify-content:center;font-size:0.8rem;font-weight:700;">3</span>
                        <strong>Confirm</strong>
                        <span style="font-size:1.2rem;">→</span>
                        <span style="background:var(--success);color:#fff;border-radius:50%;width:28px;height:28px;display:inline-flex;align-items:center;justify-content:center;font-size:0.8rem;font-weight:700;">✓</span>
                        <strong>Done!</strong>
                    </div>
                </div>

                <div class="help-steps">
                    <div class="help-step">
                        <div class="help-step-icon">✅</div>
                        <div><strong>✅ Good</strong> — Radio works fine. Goes back to <strong>Available</strong> for the next person. This is what you pick most of the time.</div>
                    </div>
                    <div class="help-step">
                        <div class="help-step-icon">⚠️</div>
                        <div><strong>⚠️ Damaged</strong> — Something is physically wrong (cracked, broken antenna, etc.). Goes to <strong>Maintenance</strong>. Write a note describing the damage.</div>
                    </div>
                    <div class="help-step">
                        <div class="help-step-icon">🔧</div>
                        <div><strong>🔧 Needs Repair</strong> — Radio has a problem but isn't visibly damaged (won't turn on, bad reception). Same as Damaged — goes to <strong>Maintenance</strong>.</div>
                    </div>
                    <div class="help-step">
                        <div class="help-step-icon">📋</div>
                        <div><strong>"Flag for supervisor review" toggle</strong> — Appears when you pick Damaged or Needs Repair. Default is <strong>OFF</strong>. Turn it on if you want the supervisor dashboard to highlight this radio for review. Either way, the radio goes to Maintenance.</div>
                    </div>
                    <div class="help-step">
                        <div class="help-step-icon">↩️</div>
                        <div><strong>↩ "Wrong radio? Re-scan"</strong> — Goes back to Step 1. <strong>Nothing is saved until you click Confirm.</strong></div>
                    </div>
                    <div class="help-step">
                        <div class="help-step-icon">📝</div>
                        <div><strong>Notes field</strong> — Optional. Use it to describe damage. Examples: "Screen cracked", "Won't charge", "Volume knob broken".</div>
                    </div>
                </div>
            </div>

            <!-- ═══════════ SWAP ═══════════ -->
            <div class="card help-section" id="help-swap">
                <div class="card-header"><h3>🔄 Swap a Faulty Radio</h3></div>
                <p><strong>The tech just got a radio and it doesn't work. Here's what to do:</strong></p>

                <div style="background:var(--warning-light, #fff8e1);border:1px solid var(--warning, #ff9800);border-radius:var(--radius);padding:0.75rem 1rem;margin-bottom:1rem;font-size:0.95rem;">
                    <strong>Example:</strong> You checked out WV-015 to John. John turns it on and says "This one is dead."
                    You need to give John a different radio.
                </div>

                <div class="help-steps">
                    <div class="help-step">
                        <div class="help-step-icon" style="font-size:1.8rem;">1</div>
                        <div>
                            <strong>On the success screen, click <span style="color:var(--warning, #b45309);">🔄 Radio Faulty — Swap It</span></strong>
                            <br>This is the orange button that appears right after checkout. You have about 3 seconds before the screen resets — click it before the timer runs out.
                        </div>
                    </div>
                    <div class="help-step">
                        <div class="help-step-icon" style="font-size:1.8rem;">2</div>
                        <div>
                            <strong>The bad radio is automatically returned as "Needs Repair"</strong>
                            <br>You'll see a message confirming it was returned. The radio moves to Maintenance.
                        </div>
                    </div>
                    <div class="help-step">
                        <div class="help-step-icon" style="font-size:1.8rem;">3</div>
                        <div>
                            <strong>Yellow banner: "Swap in progress — scan a replacement for John"</strong>
                            <br>Grab a different radio and <strong>scan it</strong>. The tech's badge is already remembered — you don't need to scan it again.
                        </div>
                    </div>
                    <div class="help-step">
                        <div class="help-step-icon" style="font-size:1.8rem;">✓</div>
                        <div>
                            <strong>Done!</strong> The new radio is checked out to the same tech. The dead one is in Maintenance. Everything is logged.
                        </div>
                    </div>
                </div>

                <div style="background:var(--info-light, #e8f4fd);border:1px solid var(--info, #2196F3);border-radius:6px;padding:0.6rem 0.8rem;margin-top:0.5rem;font-size:0.85rem;">
                    <strong>What if I miss the 3-second timer?</strong> No problem. Go to <strong>📥 Return</strong>, scan the bad radio, pick "Needs Repair." Then go to <strong>📤 Check Out</strong> and check out the replacement normally. A few more clicks but same result.
                </div>
            </div>

            <!-- ═══════════ MISTAKES ═══════════ -->
            <div class="card help-section" id="help-mistakes">
                <div class="card-header"><h3>🚫 Fixing Mistakes</h3></div>
                <p><strong>Things go wrong. Here's how to fix each situation:</strong></p>

                <div class="help-steps">
                    <div class="help-step">
                        <div class="help-step-icon">❌</div>
                        <div>
                            <strong>"I scanned the wrong radio"</strong>
                            <br>Click <strong>↩ Wrong radio? Re-scan</strong> in Step 2 of Checkout or Return. Goes back to Step 1. Nothing is saved.
                        </div>
                    </div>
                    <div class="help-step">
                        <div class="help-step-icon">❌</div>
                        <div>
                            <strong>"I scanned the wrong badge"</strong>
                            <br><em>Before confirming:</em> Click <strong>↩ Wrong radio? Re-scan</strong> to restart.
                            <br><em>After checkout completed:</em> Go to <strong>📥 Return</strong>, scan the radio, return as Good. Then go to <strong>📤 Check Out</strong> and check it out to the correct person.
                        </div>
                    </div>
                    <div class="help-step">
                        <div class="help-step-icon">❌</div>
                        <div>
                            <strong>"The radio I just gave out is broken"</strong>
                            <br>Click <strong>🔄 Radio Faulty — Swap It</strong> on the success screen. See <a href="#help-swap" class="help-toc-link" style="display:inline;">Swap a Faulty Radio</a> above.
                        </div>
                    </div>
                    <div class="help-step">
                        <div class="help-step-icon">❌</div>
                        <div>
                            <strong>"I picked the wrong condition on return"</strong>
                            <br>Go to <strong>📦 Assets</strong>, find the radio, click <strong>Status</strong>, and change it (e.g. back to Available if it's actually fine).
                        </div>
                    </div>
                    <div class="help-step">
                        <div class="help-step-icon">❌</div>
                        <div>
                            <strong>"System says the tech already has a radio"</strong>
                            <br>Each technician can only have <strong>one radio at a time</strong>. They must return the first one. If they lost it, go to <strong>📦 Assets</strong>, find the radio, and mark it as <strong>Lost</strong>.
                        </div>
                    </div>
                    <div class="help-step">
                        <div class="help-step-icon">❌</div>
                        <div>
                            <strong>"System says the radio is not available"</strong>
                            <br>It might be checked out, in Maintenance, Retired, or Lost. Check <strong>📦 Assets</strong> for its status. If it's fixed and ready, change status to <strong>Available</strong>.
                        </div>
                    </div>
                </div>
            </div>

            <!-- ═══════════ ASSETS ═══════════ -->
            <div class="card help-section" id="help-assets">
                <div class="card-header"><h3>📦 Assets & Technicians</h3></div>
                <p>Manage all equipment and people. Use the <strong>tabs at the top</strong> to switch between Radios, Batteries, Tools, PIT Keys, Laptops, EV Scanners, and Technicians.</p>
                <div class="help-steps">
                    <div class="help-step">
                        <div class="help-step-icon">➕</div>
                        <div>
                            <strong>"+ Add Radio" button</strong> — Opens a form to add a new radio.
                            <ul>
                                <li>Fill in the ID (e.g. WV-051), model, and serial number</li>
                                <li>Use the <strong>Quick Label Generator</strong> to build an ID automatically</li>
                                <li>IDs starting with <strong>WV</strong> are auto-detected by the scanner</li>
                                <li>Click <strong>Save & Print Label</strong> to save AND print a barcode label in one step</li>
                            </ul>
                        </div>
                    </div>
                    <div class="help-step">
                        <div class="help-step-icon">✏️</div>
                        <div><strong>Edit button</strong> — Change model, serial number, notes, or other fields on any asset.</div>
                    </div>
                    <div class="help-step">
                        <div class="help-step-icon">🔀</div>
                        <div>
                            <strong>Status button</strong> — Change a radio's status:
                            <ul>
                                <li><strong>Available</strong> — Ready to check out</li>
                                <li><strong>Maintenance</strong> — Broken, can't be checked out</li>
                                <li><strong>Retired</strong> — Permanently out of service</li>
                                <li><strong>Lost</strong> — Missing (frees up the technician)</li>
                            </ul>
                        </div>
                    </div>
                    <div class="help-step">
                        <div class="help-step-icon">📜</div>
                        <div><strong>History button</strong> — See every checkout, return, and status change for that asset.</div>
                    </div>
                    <div class="help-step">
                        <div class="help-step-icon">🔍</div>
                        <div><strong>Search & Filter</strong> — Search by ID, serial, or model. Use the status dropdown to show only Available, Checked Out, etc.</div>
                    </div>
                    <div class="help-step">
                        <div class="help-step-icon">👥</div>
                        <div><strong>Technicians tab</strong> — All registered technicians, their badge IDs, and current radio. Edit names and departments. New technicians are auto-created when their badge is first scanned.</div>
                    </div>
                </div>
            </div>

            <!-- ═══════════ BATTERIES ═══════════ -->
            <div class="card help-section" id="help-batteries">
                <div class="card-header"><h3>🔋 Batteries</h3></div>
                <p>Dedicated dashboard for battery inventory — new, legacy, and retired.</p>
                <div class="help-steps">
                    <div class="help-step">
                        <div class="help-step-icon">📊</div>
                        <div>The top shows battery health stats. The table lists every battery with its status. You can add, edit, and retire batteries from here.</div>
                    </div>
                </div>
            </div>

            <!-- ═══════════ SUPERVISOR ═══════════ -->
            <div class="card help-section" id="help-supervisor">
                <div class="card-header"><h3>📊 Supervisor Dashboard</h3></div>
                <p><strong>Admin-only area</strong> with alerts, settings, and advanced features. <strong>Password protected.</strong></p>
                <div class="help-steps">
                    <div class="help-step">
                        <div class="help-step-icon">🔒</div>
                        <div><strong>Password:</strong> First time there's no password. Set one under "Dashboard Password." After that, you need it every time.</div>
                    </div>
                    <div class="help-step">
                        <div class="help-step-icon">⏰</div>
                        <div><strong>Overdue Threshold:</strong> How many hours before a radio is overdue (default: 15 hours). Overdue radios show up in red.</div>
                    </div>
                    <div class="help-step">
                        <div class="help-step-icon">📧</div>
                        <div><strong>Email Alerts:</strong> Add contacts and a message template. Click "Send Alert" to open your email app with a pre-filled message listing all overdue radios.</div>
                    </div>
                    <div class="help-step">
                        <div class="help-step-icon">🔄</div>
                        <div>
                            <strong>Folder Sync & Backup:</strong> Automatic backups to a shared network folder.
                            <ul>
                                <li>Set the network path (e.g. <code>\\\\server\\share\\backup</code>)</li>
                                <li>Choose push interval (1, 4, 8, or 16 hours)</li>
                                <li>Dual backup files (A/B) for crash safety</li>
                                <li>Green/red dots show backup health at a glance</li>
                            </ul>
                        </div>
                    </div>
                    <div class="help-step">
                        <div class="help-step-icon">🏷️</div>
                        <div><strong>Scanner Prefixes:</strong> Configure what ID prefixes mean (WV = Radio, BAT = Battery, T = Tool). Add your own for custom categories.</div>
                    </div>
                    <div class="help-step">
                        <div class="help-step-icon">🧪</div>
                        <div><strong>Test Harness:</strong> The 🧪 button runs a full simulation to verify everything works. Great for demos or after updates.</div>
                    </div>
                </div>
            </div>

            <!-- ═══════════ PRINT ═══════════ -->
            <div class="card help-section" id="help-print">
                <div class="card-header"><h3>🏷️ Print Codes</h3></div>
                <p>Generate QR codes or barcodes for any asset and print them as labels.</p>
                <div class="help-steps">
                    <div class="help-step">
                        <div class="help-step-icon">1️⃣</div>
                        <div><strong>Choose code type:</strong> QR Code or Barcode (Code 128). Preview updates live.</div>
                    </div>
                    <div class="help-step">
                        <div class="help-step-icon">2️⃣</div>
                        <div>
                            <strong>Single or Batch:</strong>
                            <ul>
                                <li><strong>Single</strong> — Pick one asset or type custom text</li>
                                <li><strong>Batch</strong> — Select multiple assets, print all labels at once</li>
                            </ul>
                        </div>
                    </div>
                    <div class="help-step">
                        <div class="help-step-icon">3️⃣</div>
                        <div>
                            <strong>Label sizes:</strong>
                            <ul>
                                <li><strong>QR:</strong> ½″, ¾″, or 1″</li>
                                <li><strong>Barcode:</strong> ¼″, ⅜″, or ½″ tall</li>
                            </ul>
                        </div>
                    </div>
                    <div class="help-step">
                        <div class="help-step-icon">4️⃣</div>
                        <div>Click <strong>🖨️ Print Labels</strong>. A clean print window opens with only labels.</div>
                    </div>
                    <div class="help-step">
                        <div class="help-step-icon">⚙️</div>
                        <div>
                            <strong>Remove browser headers/footers from printout:</strong>
                            <ol style="margin:0.25rem 0;">
                                <li>In print dialog, click <strong>"More settings"</strong></li>
                                <li>Uncheck <strong>"Headers and footers"</strong></li>
                                <li>Set <strong>Margins</strong> to <strong>"None"</strong></li>
                            </ol>
                            <em>Browser remembers this — you only do it once.</em>
                        </div>
                    </div>
                </div>
            </div>

            <!-- ═══════════ EXPORT ═══════════ -->
            <div class="card help-section" id="help-export">
                <div class="card-header"><h3>💾 Export / Import</h3></div>
                <p>Save your data to a file, load data from a file, or clear everything.</p>
                <div class="help-steps">
                    <div class="help-step">
                        <div class="help-step-icon">📥</div>
                        <div>
                            <strong>Export:</strong> Download your data.
                            <ul>
                                <li><strong>Excel (.xlsx)</strong> — For reports, printing, sharing with others</li>
                                <li><strong>JSON</strong> — Full backup that can be imported back</li>
                            </ul>
                        </div>
                    </div>
                    <div class="help-step">
                        <div class="help-step-icon">📤</div>
                        <div><strong>Import:</strong> Load from a JSON file. This <strong>replaces all current data</strong>.</div>
                    </div>
                    <div class="help-step">
                        <div class="help-step-icon">🗑️</div>
                        <div>
                            <strong>Clear All Data:</strong> Deletes everything permanently. You must type <strong>DELETE</strong> to confirm.
                            <div style="background:var(--danger-light, #fff3f3);border:1px solid var(--danger, red);border-radius:6px;padding:0.4rem 0.6rem;margin-top:0.4rem;font-size:0.85rem;">
                                <strong>Always export a backup BEFORE clearing!</strong> There is no undo.
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- ═══════════ SCANNER ═══════════ -->
            <div class="card help-section" id="help-scanner">
                <div class="card-header"><h3>📷 How the Scanner Works</h3></div>
                <p><strong>The scanner figures out what you scanned by looking at the first characters:</strong></p>
                <div class="help-steps">
                    <div class="help-step">
                        <div class="help-step-icon">📻</div>
                        <div><strong>Starts with WV</strong> → It's a <strong>Radio</strong> (e.g. WV-001, WV_MAINT_01)</div>
                    </div>
                    <div class="help-step">
                        <div class="help-step-icon">🔋</div>
                        <div><strong>Starts with BAT</strong> → It's a <strong>Battery</strong> (e.g. BAT-05)</div>
                    </div>
                    <div class="help-step">
                        <div class="help-step-icon">🔧</div>
                        <div><strong>Starts with T</strong> → It's a <strong>Tool</strong> (e.g. T-010)</div>
                    </div>
                    <div class="help-step">
                        <div class="help-step-icon">🪪</div>
                        <div><strong>Starts with a number</strong> → It's a <strong>Badge</strong> (e.g. 12345, 99887)</div>
                    </div>
                    <div class="help-step">
                        <div class="help-step-icon">⚙️</div>
                        <div>You can <strong>change prefixes</strong> or add new ones in Supervisor → "Scanner Prefixes."</div>
                    </div>
                </div>
            </div>

            <!-- ═══════════ BACKUP ═══════════ -->
            <div class="card help-section" id="help-backup">
                <div class="card-header"><h3>💾 Database Backup & Sync</h3></div>
                <p><strong>Important:</strong> Your data lives in the browser, NOT in the app folder. Use backup features to keep it safe and share between machines.</p>
                <div class="help-steps">
                    <div class="help-step">
                        <div class="help-step-icon">💾</div>
                        <div>
                            <strong>💾 Save Button (top bar):</strong> Saves to <code>db-snapshot.json</code> in the app folder.
                            <ul>
                                <li>First time: pick your app folder</li>
                                <li>After that, it saves silently on every data change</li>
                                <li>Copy folder to another machine → data goes with it</li>
                            </ul>
                        </div>
                    </div>
                    <div class="help-step">
                        <div class="help-step-icon">🔄</div>
                        <div>
                            <strong>Folder Sync (Supervisor):</strong> Share data between machines.
                            <ul>
                                <li>Pick a shared network folder</li>
                                <li>App saves on a timer (1–16 hours)</li>
                                <li>Other machines load from the same folder</li>
                                <li>Dual backup files (A/B) for crash safety</li>
                            </ul>
                        </div>
                    </div>
                    <div class="help-step">
                        <div class="help-step-icon" style="font-size:1.5rem;">🔵</div>
                        <div>
                            <strong>Blue "Connect" Banner:</strong> Appears every time you open the app.
                            <div style="background:linear-gradient(135deg,#1565c0,#1a73e8);color:#fff;padding:0.5rem 0.75rem;border-radius:6px;margin:0.5rem 0;font-size:0.85rem;text-align:center;">
                                💾 Click the button below to connect your backup folders
                            </div>
                            <strong>Just click it once.</strong> The browser needs permission to save files. After one click, everything saves automatically.
                        </div>
                    </div>
                    <div class="help-step">
                        <div class="help-step-icon">🛡️</div>
                        <div>
                            <strong>Newer Data Always Wins:</strong> The app never overwrites newer data with older data.
                            <ul>
                                <li>If backup is newer → app loads it</li>
                                <li>If your data is newer → app saves over the backup</li>
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
                                    <td style="padding:0.3rem;">Working. No action needed.</td>
                                </tr>
                                <tr style="border-bottom:1px solid var(--border);">
                                    <td style="padding:0.3rem;">✅ <em>"Loaded newer data from backup"</em></td>
                                    <td style="padding:0.3rem;">Another machine had newer data. Screen will update.</td>
                                </tr>
                                <tr style="border-bottom:1px solid var(--border);">
                                    <td style="padding:0.3rem;">ℹ️ <em>"Backup has newer data — save skipped"</em></td>
                                    <td style="padding:0.3rem;">Your data is older. The newer backup was protected.</td>
                                </tr>
                                <tr style="border-bottom:1px solid var(--border);">
                                    <td style="padding:0.3rem;">✅ <em>"Restored from snapshot"</em></td>
                                    <td style="padding:0.3rem;">Fresh machine loaded data from db-snapshot.json.</td>
                                </tr>
                                <tr>
                                    <td style="padding:0.3rem;">❌ <em>"No backup files found"</em></td>
                                    <td style="padding:0.3rem;">Folder is empty. Save from another machine first.</td>
                                </tr>
                            </table>
                        </div>
                    </div>
                    <div class="help-step">
                        <div class="help-step-icon">🚨</div>
                        <div>
                            <strong>Emergency Backup:</strong> A silent safety net.
                            <ul>
                                <li>Auto-saves 2 minutes after last activity, plus every 8 hours</li>
                                <li>Stored in the browser — no folder connection needed</li>
                                <li>To restore: click <strong>?</strong> in top bar → <strong>🚨 Emergency Database Restoration</strong></li>
                                <li>Two confirmation prompts prevent accidental restores</li>
                            </ul>
                            <div style="background:var(--danger-light, #fff3f3);border:1px solid var(--danger, red);border-radius:6px;padding:0.4rem 0.6rem;margin-top:0.4rem;font-size:0.85rem;">
                                <strong>Last resort only:</strong> Use only if database is empty AND snapshot is missing AND network backup is unavailable.
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- ═══════════ TIPS ═══════════ -->
            <div class="card help-section" id="help-tips">
                <div class="card-header"><h3>💡 Tips & Tricks</h3></div>
                <div class="help-steps">
                    <div class="help-step">
                        <div class="help-step-icon">🎨</div>
                        <div><strong>Change the theme:</strong> Dropdown in the top-right corner. 7 themes including USPS branded and dark mode.</div>
                    </div>
                    <div class="help-step">
                        <div class="help-step-icon">👤</div>
                        <div><strong>Change clerk name:</strong> Click your name in the top-right. This name is attached to every transaction you make.</div>
                    </div>
                    <div class="help-step">
                        <div class="help-step-icon">💾</div>
                        <div><strong>Data is local:</strong> All data lives in your browser (IndexedDB). No internet needed. Use 💾 Save and Folder Sync for backups.</div>
                    </div>
                    <div class="help-step">
                        <div class="help-step-icon">🔊</div>
                        <div><strong>Sound feedback:</strong> Scanner pages play beeps and speak results out loud. Great for hands-free scanning.</div>
                    </div>
                    <div class="help-step">
                        <div class="help-step-icon">⌨️</div>
                        <div><strong>No scanner?</strong> Type the ID manually and press Enter. Works everywhere.</div>
                    </div>
                    <div class="help-step">
                        <div class="help-step-icon">📱</div>
                        <div><strong>Works on tablets:</strong> Responsive layout works on tablets and large phones.</div>
                    </div>
                    <div class="help-step">
                        <div class="help-step-icon">🔄</div>
                        <div><strong>Radio swap:</strong> If a radio doesn't work after checkout, click "🔄 Radio Faulty — Swap It" on the success screen. One scan for the replacement and the tech is on their way.</div>
                    </div>
                    <div class="help-step">
                        <div class="help-step-icon">↩️</div>
                        <div><strong>Wrong scan?</strong> Click "↩ Wrong radio? Re-scan" any time before confirming. It goes back to Step 1 — nothing is saved.</div>
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
        'broken': ['damaged', 'maintenance', 'repair', 'swap', 'faulty'],
        'repair': ['damaged', 'maintenance', 'broken', 'swap'],
        'fix': ['damaged', 'maintenance', 'repair', 'mistake', 'wrong'],
        'swap': ['faulty', 'broken', 'replace', 'exchange', 'dead'],
        'faulty': ['swap', 'broken', 'dead', 'replace'],
        'replace': ['swap', 'faulty', 'exchange'],
        'wrong': ['mistake', 'undo', 'cancel', 'rescan', 'fix'],
        'mistake': ['wrong', 'undo', 'cancel', 'rescan', 'fix'],
        'cancel': ['wrong', 'undo', 'rescan', 'back'],
        'undo': ['wrong', 'cancel', 'mistake', 'rescan'],
        'rescan': ['wrong', 'cancel', 'undo', 'back'],
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
        'help': ['manual', 'instructions', 'guide'],
        'dead': ['broken', 'faulty', 'swap']
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
