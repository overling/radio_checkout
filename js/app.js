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
            await DB.setSetting('overdueHoursThreshold', 15);
        }
        const batteryThreshold = await DB.getSetting('batteryServiceDayThreshold');
        if (batteryThreshold === null) {
            await DB.setSetting('batteryServiceDayThreshold', 365);
        }

        // Check if camera is available — warn only if it's actually blocked
        if (window.location.protocol === 'file:' && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                // Camera works — stop the test stream immediately
                stream.getTracks().forEach(t => t.stop());
            } catch (e) {
                // Camera blocked on file:// — show helpful banner
                const banner = document.createElement('div');
                banner.id = 'file-protocol-banner';
                banner.innerHTML = `
                    <div style="background:var(--warning);color:#000;padding:0.6rem 1rem;text-align:center;font-size:0.85rem;font-weight:600;display:flex;align-items:center;justify-content:center;gap:0.75rem;flex-wrap:wrap;">
                        <span>⚠️ Camera blocked by browser on file:// URLs.</span>
                        <span style="font-weight:400;">Double-click <code style="background:rgba(0,0,0,0.15);padding:0.15rem 0.4rem;border-radius:3px;">start.bat</code> for camera support.</span>
                        <button onclick="this.parentElement.parentElement.remove()" style="background:rgba(0,0,0,0.2);border:none;color:#000;padding:0.2rem 0.6rem;border-radius:3px;cursor:pointer;font-size:0.8rem;">✕ Dismiss</button>
                    </div>
                `;
                document.body.insertBefore(banner, document.body.firstChild);
            }
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
