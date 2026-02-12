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

        // Show a hint banner if opened via file:// (camera won't work without a server)
        if (window.location.protocol === 'file:') {
            const banner = document.createElement('div');
            banner.id = 'file-protocol-banner';
            banner.innerHTML = `
                <div style="background:var(--warning);color:#000;padding:0.6rem 1rem;text-align:center;font-size:0.85rem;font-weight:600;display:flex;align-items:center;justify-content:center;gap:0.75rem;flex-wrap:wrap;">
                    <span>⚠️ Camera scanning unavailable on file:// URLs.</span>
                    <span style="font-weight:400;">Double-click <code style="background:rgba(0,0,0,0.15);padding:0.15rem 0.4rem;border-radius:3px;">start.bat</code> for camera support. USB scanners work either way.</span>
                    <button onclick="this.parentElement.parentElement.remove()" style="background:rgba(0,0,0,0.2);border:none;color:#000;padding:0.2rem 0.6rem;border-radius:3px;cursor:pointer;font-size:0.8rem;">✕ Dismiss</button>
                </div>
            `;
            document.body.insertBefore(banner, document.body.firstChild);
        }

        // Start auto-backup scheduler
        AutoBackup.start();

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
