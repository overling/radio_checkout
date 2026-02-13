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
        // Initial check on startup
        _AP.check();

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
