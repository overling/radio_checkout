/**
 * Application Entry Point
 * Initializes database, UI, and scanner modules.
 */

const THEMES = ['light', 'dark', 'high-contrast', 'midnight', 'sepia', 'usps-light', 'usps-dark'];

async function initTheme() {
    const select = document.getElementById('theme-select');
    const saved = await DB.getSetting('theme', 'light');
    applyTheme(saved);

    select.addEventListener('change', async () => {
        applyTheme(select.value);
        await DB.setSetting('theme', select.value);
    });
}

function applyTheme(theme) {
    const select = document.getElementById('theme-select');
    if (!THEMES.includes(theme)) theme = 'light';

    if (theme === 'light') {
        document.documentElement.removeAttribute('data-theme');
    } else {
        document.documentElement.setAttribute('data-theme', theme);
    }
    select.value = theme;
}

(async function init() {
    try {
        // Initialize database
        await DB.open();
        console.log('Database initialized');

        // Auto-restore from snapshot or emergency backup if DB is empty
        try {
            const snapResult = await Snapshot.autoRestore();
            if (snapResult.restored) {
                const src = snapResult.source === 'emergency' ? 'emergency backup (may be up to 8 hours old)' : 'snapshot file';
                console.log(`Database restored from ${src}: ${snapResult.radioCount} radios, ${snapResult.techCount} techs`);
                setTimeout(() => {
                    UI.toast(`Database loaded from ${src}: ${snapResult.radioCount} radios, ${snapResult.techCount} technicians restored ✅`, 'success', 6000);
                }, 1000);
            }
        } catch (e) {
            console.warn('Auto-restore skipped:', e.message);
        }

        // Initialize UI components
        UI.initNav();
        UI.initModal();
        UI.startClock();
        await UI.initClerk();

        // Initialize scanner
        Scanner.init();

        // Initialize dark mode
        await initTheme();

        // Set default settings if not present
        const overdueHours = await DB.getSetting('overdueHoursThreshold');
        if (overdueHours === null) {
            await DB.setSetting('overdueHoursThreshold', 15);
        }
        const batteryThreshold = await DB.getSetting('batteryServiceDayThreshold');
        if (batteryThreshold === null) {
            await DB.setSetting('batteryServiceDayThreshold', 365);
        }

        // Start auto-backup scheduler
        AutoBackup.start();

        // Start emergency backup timer (saves to IndexedDB every 8 hours — no folder needed)
        Snapshot.startEmergencyTimer();

        // ===== Auto-Save System =====
        // The browser REQUIRES one user click per session to grant file write access.
        // After that click, everything saves automatically and silently.
        //
        // On startup: if sync/snapshot was set up before, show a popup asking to reconnect.
        // The clerk just clicks one big button and everything works.

        const syncSettings = await NetworkSync.getSettings();
        const lastSnapshot = await Snapshot.getLastSaveTime();
        const needsReconnect = syncSettings.enabled || lastSnapshot;

        async function _connectAndStartAutoSave() {
            // Try to reconnect the sync folder
            if (syncSettings.enabled && NetworkSync.isSupported()) {
                const result = await NetworkSync.chooseFolder();
                if (result.ok) {
                    // Check if the sync folder has NEWER data than our local DB
                    const localModified = await DB.getLastModified();
                    const backup = await NetworkSync.pullFromFolder();
                    const backupTs = backup?.timestamp;

                    if (backupTs && localModified && new Date(backupTs) > new Date(localModified)) {
                        // Sync folder is newer — load it
                        const { _sync, ...importData } = backup.data;
                        await DB.importAll(importData);
                        UI.toast('Loaded newer data from backup folder ✅', 'success');
                        console.log(`Loaded newer backup (${backupTs}) over local (${localModified})`);
                    } else if (!localModified && backup?.data) {
                        // No local timestamp — DB might be empty, load backup
                        const localCount = await DB.count('radios');
                        if (localCount === 0) {
                            const { _sync, ...importData } = backup.data;
                            await DB.importAll(importData);
                            UI.toast('Database restored from backup folder ✅', 'success');
                        }
                    }

                    NetworkSync.start();
                    // Push our data (will be skipped if backup is still newer)
                    NetworkSync.pushToNetwork();
                }
            }

            // Also get a handle for the local snapshot file
            try {
                await Snapshot.save();
            } catch (e) {
                console.warn('Snapshot save skipped:', e.message);
            }

            // Remove the reconnect banner if it exists
            const banner = document.getElementById('reconnect-banner');
            if (banner) banner.remove();

            UI.toast('Auto-save connected ✅ Your data will save automatically.', 'success');
        }

        if (needsReconnect) {
            // Show a big, obvious, friendly banner at the top
            const banner = document.createElement('div');
            banner.id = 'reconnect-banner';
            banner.style.cssText = 'background:linear-gradient(135deg,#1565c0,#1a73e8);color:#fff;padding:1rem 1.5rem;text-align:center;position:sticky;top:0;z-index:9999;box-shadow:0 2px 8px rgba(0,0,0,0.3);';
            banner.innerHTML = `
                <div style="font-size:1.1rem;font-weight:700;margin-bottom:0.4rem;">
                    💾 Click the button below to connect your backup folders
                </div>
                <div style="font-size:0.85rem;margin-bottom:0.75rem;opacity:0.9;">
                    Your browser needs permission to save files. This only takes one click and then everything saves automatically.
                </div>
                <button id="reconnect-btn" style="background:#fff;color:#1565c0;border:none;padding:0.6rem 2rem;border-radius:8px;font-size:1.1rem;font-weight:700;cursor:pointer;box-shadow:0 2px 6px rgba(0,0,0,0.2);">
                    📂 Click Here to Connect & Continue
                </button>
                <div style="font-size:0.7rem;margin-top:0.4rem;opacity:0.7;">
                    You can also click 💾 Save in the top bar at any time
                </div>
            `;
            document.body.insertBefore(banner, document.body.firstChild);

            document.getElementById('reconnect-btn').addEventListener('click', async () => {
                const btn = document.getElementById('reconnect-btn');
                btn.textContent = '⏳ Connecting...';
                btn.disabled = true;
                await _connectAndStartAutoSave();
            });
        }

        // Save button in header — always works as manual save + reconnect
        document.getElementById('header-save-btn').addEventListener('click', async () => {
            const btn = document.getElementById('header-save-btn');
            btn.textContent = '⏳ Saving...';
            btn.disabled = true;
            try {
                const result = await Snapshot.save();
                if (result.ok) {
                    const kb = (result.size / 1024).toFixed(1);
                    UI.toast(`Saved (${kb} KB) — auto-save is now active this session ✅`, 'success');
                    btn.innerHTML = '💾 Saved ✓';
                    setTimeout(() => { btn.innerHTML = '💾 Save'; }, 3000);
                    // Remove reconnect banner if still showing
                    const banner = document.getElementById('reconnect-banner');
                    if (banner) banner.remove();
                } else {
                    UI.toast('Save cancelled', 'info');
                    btn.innerHTML = '💾 Save';
                }
            } catch (e) {
                UI.toast('Save failed: ' + e.message, 'error');
                btn.innerHTML = '💾 Save';
            }
            btn.disabled = false;
        });

        // Auto-save silently after any DB write (if file handle is active)
        const _origPut = DB.put.bind(DB);
        let _saveTimer = null;
        DB.put = async function(storeName, data) {
            const result = await _origPut(storeName, data);
            // Debounce: save 5 seconds after last DB write
            if (Snapshot.hasFileHandle() || NetworkSync.hasHandle()) {
                clearTimeout(_saveTimer);
                _saveTimer = setTimeout(async () => {
                    if (Snapshot.hasFileHandle()) Snapshot.silentSave();
                    if (NetworkSync.hasHandle()) NetworkSync.pushToNetwork();
                }, 5000);
            }
            return result;
        };

        // Info button (?) — version/author popup with integrity check
        document.getElementById('header-info-btn').addEventListener('click', async () => {
            const info = await _AP.getInfo();
            const badge = info.valid
                ? '<span style="color:var(--success);font-weight:700;">✅ Verified Original</span>'
                : '<span style="color:var(--danger);font-weight:700;">⚠️ TAMPERED — This is not the original software</span>';
            const emergTime = await Snapshot.getLastEmergencyTime();
            const emergInfo = emergTime
                ? `<div style="font-size:0.75rem;color:var(--text-muted);margin-top:0.25rem;">Last emergency backup: ${new Date(emergTime).toLocaleString()}</div>`
                : '<div style="font-size:0.75rem;color:var(--text-muted);margin-top:0.25rem;">No emergency backup yet — one will be created automatically</div>';

            UI.showModal('About USPS Asset Tracker', `
                <div style="text-align:center;line-height:2;">
                    <div style="font-size:2.5rem;margin-bottom:0.25rem;">📻</div>
                    <div style="font-size:1.3rem;font-weight:700;">${info.app}</div>
                    <div style="font-size:0.95rem;color:var(--text-secondary);margin-bottom:0.75rem;">Radio & Equipment Management System</div>
                    <hr style="border:none;border-top:1px solid var(--border);margin:0.5rem 0;">
                    <div style="font-size:1rem;"><strong>Version:</strong> ${info.version}</div>
                    <div style="font-size:1rem;"><strong>Author:</strong> ${info.author}</div>
                    <div style="font-size:1rem;"><strong>Date:</strong> ${info.date}</div>
                    <div style="font-size:0.85rem;margin-top:0.25rem;">${badge}</div>
                    <hr style="border:none;border-top:1px solid var(--border);margin:0.5rem 0;">
                    <button class="btn btn-primary" onclick="UI.closeModal(); UI.navigateTo('help');" style="margin-top:0.25rem;">📖 Open Instruction Manual</button>
                    <hr style="border:none;border-top:1px solid var(--border);margin:0.75rem 0 0.5rem;">
                    <button id="emergency-restore-btn" class="btn" style="background:var(--danger);color:#fff;margin-top:0.25rem;font-size:0.85rem;">
                        🚨 Emergency Database Restoration
                    </button>
                    <div style="font-size:0.7rem;color:var(--text-muted);margin-top:0.15rem;">Saves 2 min after last activity — use only if all else fails</div>
                    ${emergInfo}
                </div>
            `);

            // Wire up emergency restore button
            setTimeout(() => {
                const emergBtn = document.getElementById('emergency-restore-btn');
                if (emergBtn) {
                    emergBtn.addEventListener('click', async () => {
                        if (!confirm('⚠️ EMERGENCY RESTORE\n\nThis will replace your current database with the emergency backup.\n\nThis backup is saved 2 minutes after the last activity. Some very recent changes may be missing.\n\nOnly use this if:\n• Your main database is empty or corrupted\n• The snapshot file (db-snapshot.json) is missing\n• The network backup folder is unavailable\n\nAre you sure you want to continue?')) return;
                        if (!confirm('⚠️ FINAL WARNING\n\nThis will OVERWRITE your current database.\n\nClick OK to proceed with emergency restoration.')) return;

                        emergBtn.textContent = '⏳ Restoring...';
                        emergBtn.disabled = true;
                        try {
                            const result = await Snapshot.emergencyRestore();
                            if (result.restored) {
                                UI.closeModal();
                                UI.toast(`Emergency restore complete: ${result.radioCount} radios, ${result.techCount} technicians restored from ${new Date(result.timestamp).toLocaleString()}`, 'success', 8000);
                                setTimeout(() => location.reload(), 2000);
                            } else {
                                UI.toast('No emergency backup file found. Make sure you have connected your app folder at least once.', 'error', 6000);
                                emergBtn.textContent = '🚨 Emergency Database Restoration';
                                emergBtn.disabled = false;
                            }
                        } catch (e) {
                            UI.toast('Emergency restore failed: ' + e.message, 'error');
                            emergBtn.textContent = '🚨 Emergency Database Restoration';
                            emergBtn.disabled = false;
                        }
                    });
                }
            }, 100);
        });

        // Periodic authorship integrity check (every 5 min)
        setInterval(async () => {
            const ok = await _AP.check();
            if (!ok) {
                document.title = '⚠️ TAMPERED SOFTWARE';
                const h1 = document.querySelector('#app-header h1');
                if (h1 && !h1.dataset.tamperWarned) {
                    h1.dataset.tamperWarned = 'true';
                    h1.innerHTML += ' <span style="color:#ff0;font-size:0.7rem;">⚠️ MODIFIED</span>';
                }
            }
        }, 5 * 60 * 1000);
        // Initial authorship check
        _AP.check();

        // File integrity check on startup (non-blocking)
        (async () => {
            try {
                const result = await FileIntegrity.quickCheck();
                if (result === null) {
                    // No manifest yet — auto-generate one on first run
                    const manifest = await FileIntegrity.computeManifest();
                    await FileIntegrity.saveManifest(manifest);
                    console.log(`File integrity manifest created: ${manifest.fileCount} files hashed`);
                } else if (result === false) {
                    // Check if manifest was regenerated recently (CDN may still be serving stale content)
                    const stored = await FileIntegrity.getManifest();
                    const manifestAge = stored ? (Date.now() - new Date(stored.timestamp).getTime()) : Infinity;
                    if (manifestAge < 5 * 60 * 1000) {
                        // Manifest was regenerated within the last 5 minutes — likely CDN instability
                        // Auto-regenerate silently instead of alarming the user
                        const fresh = await FileIntegrity.computeManifest();
                        await FileIntegrity.saveManifest(fresh);
                        console.log('File integrity: auto-regenerated (recent manifest + CDN variance detected)');
                    } else {
                        // TAMPERED — show warning banner
                        const details = await FileIntegrity.verify();
                        console.error('%c[FILE INTEGRITY FAILURE]', 'color:red;font-size:18px;font-weight:bold;', details);
                        const banner = document.createElement('div');
                        banner.id = 'integrity-warning';
                        banner.style.cssText = 'background:#d32f2f;color:#fff;padding:0.5rem 1rem;text-align:center;font-weight:700;font-size:0.9rem;position:sticky;top:0;z-index:9999;cursor:pointer;';
                        banner.innerHTML = '⚠️ FILE INTEGRITY WARNING — ' + details.mismatched.length + ' file(s) modified'
                            + (details.missing.length ? ', ' + details.missing.length + ' missing' : '')
                            + '. Code may have been tampered with. <span style="text-decoration:underline;">Click for details</span>';
                        banner.addEventListener('click', async () => {
                            const d = await FileIntegrity.verify();
                            let body = '<div style="text-align:left;font-size:0.9rem;">';
                            body += '<p style="color:var(--danger);font-weight:700;margin-bottom:0.5rem;">The following files do not match the stored integrity manifest:</p>';
                            if (d.mismatched.length > 0) {
                                body += '<strong>Modified files:</strong><ul style="margin:0.25rem 0 0.5rem 1.2rem;">';
                                d.mismatched.forEach(f => body += '<li><code>' + f + '</code></li>');
                                body += '</ul>';
                            }
                            if (d.missing.length > 0) {
                                body += '<strong>Missing files:</strong><ul style="margin:0.25rem 0 0.5rem 1.2rem;">';
                                d.missing.forEach(f => body += '<li><code>' + f + '</code></li>');
                                body += '</ul>';
                            }
                            body += '<p style="font-size:0.8rem;color:var(--text-muted);margin-top:0.5rem;">Manifest generated: ' + (d.storedTimestamp || 'unknown') + '</p>';
                            body += '<p style="font-size:0.8rem;color:var(--text-muted);">If you just updated the code, go to <strong>Supervisor → Regenerate Manifest</strong> to clear this warning.</p>';
                            body += '</div>';
                            UI.showModal('⚠️ File Integrity Report', body);
                        });
                        document.body.insertBefore(banner, document.body.firstChild);
                    }
                } else {
                    console.log('File integrity check passed ✅');
                }
            } catch (e) {
                console.warn('File integrity check skipped:', e.message);
            }
        })();

        // Navigate to home
        UI.navigateTo('home');

        console.log('Asset Tracker initialized successfully');
    } catch (err) {
        console.error('Initialization error:', err);
        document.getElementById('app-content').innerHTML = `
            <div class="alert alert-danger" style="margin-top:2rem;">
                <strong>Initialization Error:</strong> ${err.message}<br>
                <small>Please ensure you are using a modern browser (Chrome or Edge) and that IndexedDB is available.</small>
            </div>
        `;
    }
})();
