/**
 * Network Sync Module
 * Periodically pushes the IndexedDB database as JSON to a network folder via the local server.
 * On startup, attempts to load from network first; falls back to local IndexedDB.
 *
 * Architecture:
 *   Browser  →  POST /api/sync  →  PowerShell server  →  writes JSON to network path
 *   Browser  ←  GET  /api/sync  ←  PowerShell server  ←  reads JSON from network path
 *
 * Settings stored in IndexedDB under 'networkSync':
 *   { enabled, networkPath, intervalMinutes, lastPush, lastPushStatus }
 */
const NetworkSync = (() => {
    let syncTimer = null;

    const DEFAULTS = {
        enabled: false,
        networkPath: '',          // e.g. \\\\server\\share\\radio_backup
        intervalMinutes: 15,      // push interval
        lastPush: null,
        lastPushStatus: null
    };

    async function getSettings() {
        const saved = await DB.getSetting('networkSync', null);
        if (!saved) return { ...DEFAULTS };
        return { ...DEFAULTS, ...saved };
    }

    async function saveSettings(settings) {
        await DB.setSetting('networkSync', settings);
    }

    // Push local DB to network via server API
    async function pushToNetwork() {
        const settings = await getSettings();
        if (!settings.enabled || !settings.networkPath) return { ok: false, error: 'Sync not configured' };

        try {
            const data = await DB.exportAll();
            const payload = {
                timestamp: new Date().toISOString(),
                networkPath: settings.networkPath,
                data: data
            };

            const resp = await fetch('/api/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!resp.ok) {
                const text = await resp.text();
                throw new Error(text || `HTTP ${resp.status}`);
            }

            const result = await resp.json();
            settings.lastPush = new Date().toISOString();
            settings.lastPushStatus = 'success';
            await saveSettings(settings);
            console.log('Network sync push successful:', result.localPath, result.networkPath);
            return { ok: true, result };
        } catch (e) {
            settings.lastPushStatus = 'error: ' + e.message;
            await saveSettings(settings);
            console.error('Network sync push failed:', e);
            return { ok: false, error: e.message };
        }
    }

    // Pull from network — returns the parsed data or null
    async function pullFromNetwork() {
        const settings = await getSettings();
        if (!settings.enabled || !settings.networkPath) return null;

        try {
            const resp = await fetch('/api/sync');
            if (!resp.ok) {
                const text = await resp.text();
                throw new Error(text || `HTTP ${resp.status}`);
            }

            const payload = await resp.json();
            if (!payload || !payload.data) throw new Error('Invalid backup format');
            return payload;
        } catch (e) {
            console.warn('Network sync pull failed:', e.message);
            return null;
        }
    }

    // On startup: try network first, fall back to local
    async function loadOnStartup() {
        const settings = await getSettings();
        if (!settings.enabled || !settings.networkPath) {
            console.log('Network sync disabled — using local DB only');
            return { source: 'local', reason: 'sync disabled' };
        }

        try {
            const networkData = await pullFromNetwork();
            if (!networkData || !networkData.data) {
                console.log('Network backup unavailable — using local DB');
                return { source: 'local', reason: 'network unavailable' };
            }

            // Check if network is newer than local
            const localTimestamp = await DB.getSetting('lastModified', null);
            const networkTimestamp = networkData.timestamp;

            if (localTimestamp && networkTimestamp && new Date(localTimestamp) >= new Date(networkTimestamp)) {
                console.log('Local DB is same or newer than network — keeping local');
                return { source: 'local', reason: 'local is newer' };
            }

            // Network is newer — import it
            await DB.importAll(networkData.data);
            console.log('Loaded database from network backup (timestamp: ' + networkTimestamp + ')');
            return { source: 'network', timestamp: networkTimestamp };
        } catch (e) {
            console.error('Failed to load from network, using local:', e);
            return { source: 'local', reason: 'error: ' + e.message };
        }
    }

    // Start periodic sync timer
    function start() {
        stop();
        getSettings().then(settings => {
            if (!settings.enabled || !settings.networkPath) return;

            const ms = (settings.intervalMinutes || 15) * 60 * 1000;
            syncTimer = setInterval(async () => {
                const result = await pushToNetwork();
                if (result.ok && typeof UI !== 'undefined' && UI.toast) {
                    // Silent success — only log, don't toast every sync
                    console.log('Periodic network sync completed');
                }
            }, ms);

            console.log(`Network sync started: every ${settings.intervalMinutes} minutes → ${settings.networkPath}`);
        });
    }

    function stop() {
        if (syncTimer) {
            clearInterval(syncTimer);
            syncTimer = null;
        }
    }

    // Restart timer (call after settings change)
    function restart() {
        stop();
        start();
    }

    return {
        getSettings,
        saveSettings,
        pushToNetwork,
        pullFromNetwork,
        loadOnStartup,
        start,
        stop,
        restart,
        DEFAULTS
    };
})();
