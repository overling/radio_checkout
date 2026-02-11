/**
 * Application Entry Point
 * Initializes database, UI, and scanner modules.
 */

async function initTheme() {
    const toggle = document.getElementById('theme-toggle');
    const saved = await DB.getSetting('theme', 'light');
    applyTheme(saved);

    toggle.addEventListener('click', async () => {
        const current = document.documentElement.getAttribute('data-theme');
        const next = current === 'dark' ? 'light' : 'dark';
        applyTheme(next);
        await DB.setSetting('theme', next);
    });
}

function applyTheme(theme) {
    const toggle = document.getElementById('theme-toggle');
    if (theme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
        toggle.textContent = '☀️';
        toggle.title = 'Switch to light mode';
    } else {
        document.documentElement.removeAttribute('data-theme');
        toggle.textContent = '🌙';
        toggle.title = 'Switch to dark mode';
    }
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
            await DB.setSetting('overdueHoursThreshold', 12);
        }
        const batteryThreshold = await DB.getSetting('batteryServiceDayThreshold');
        if (batteryThreshold === null) {
            await DB.setSetting('batteryServiceDayThreshold', 365);
        }

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
