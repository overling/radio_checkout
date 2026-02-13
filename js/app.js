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

        // Auto-restore from snapshot if DB is empty
        try {
            const snapResult = await Snapshot.autoRestore();
            if (snapResult.restored) {
                console.log(`Database restored from snapshot: ${snapResult.radioCount} radios, ${snapResult.techCount} techs`);
            }
        } catch (e) {
            console.warn('Snapshot auto-restore skipped:', e.message);
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

        // Network sync: try loading from network on startup, then start periodic push
        if (typeof NetworkSync !== 'undefined') {
            try {
                const syncResult = await NetworkSync.loadOnStartup();
                if (syncResult.source === 'network') {
                    console.log('Database loaded from network backup');
                }
                NetworkSync.start();
            } catch (e) {
                console.warn('Network sync startup error:', e);
            }
        }

        // Save snapshot button
        document.getElementById('header-save-btn').addEventListener('click', async () => {
            const btn = document.getElementById('header-save-btn');
            btn.textContent = '⏳ Saving...';
            btn.disabled = true;
            try {
                const result = await Snapshot.save();
                if (result.ok) {
                    const kb = (result.size / 1024).toFixed(1);
                    UI.toast(`Snapshot saved (${kb} KB) — copy db-snapshot.json with your app folder`, 'success');
                    btn.innerHTML = '💾 Saved ✓';
                    setTimeout(() => { btn.innerHTML = '💾 Save'; }, 3000);
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

        // Auto-save silently after major DB operations (if file handle is set)
        const _origPut = DB.put.bind(DB);
        let _saveTimer = null;
        DB.put = async function(storeName, data) {
            const result = await _origPut(storeName, data);
            // Debounce: save snapshot 5 seconds after last DB write
            if (Snapshot.hasFileHandle()) {
                clearTimeout(_saveTimer);
                _saveTimer = setTimeout(() => Snapshot.silentSave(), 5000);
            }
            return result;
        };

        // Warn before closing if there are unsaved changes
        window.addEventListener('beforeunload', (e) => {
            if (!Snapshot.hasFileHandle()) {
                // Only warn if they haven't saved at all this session
                // (don't annoy users who already saved)
            }
        });

        // Info button (?) — version/author popup with integrity check
        document.getElementById('header-info-btn').addEventListener('click', async () => {
            const info = await _AP.getInfo();
            const badge = info.valid
                ? '<span style="color:var(--success);font-weight:700;">✅ Verified Original</span>'
                : '<span style="color:var(--danger);font-weight:700;">⚠️ TAMPERED — This is not the original software</span>';
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
                </div>
            `);
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
