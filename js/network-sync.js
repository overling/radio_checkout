/**
 * Network Sync Module
 * Periodically pushes the IndexedDB database as JSON to local dual backups (A/B) + network folder.
 * On startup, attempts to load from network first; falls back to newest valid local backup.
 *
 * Architecture:
 *   Browser  →  POST /api/sync  →  PowerShell server  →  writes to local A/B + network
 *   Browser  ←  GET  /api/sync  ←  PowerShell server  ←  reads from network → fallback local
 *
 * Features:
 *   - Dual local backups (A/B alternation) for crash safety
 *   - Retry on failure: up to 3 retries at 2-minute intervals
 *   - Integrity check: validates local files periodically (every 8 hours)
 *   - Status tracking: last push time, success/fail, file health
 *
 * Settings stored in IndexedDB under 'networkSync':
 *   { enabled, networkPath, intervalHours, lastPush, lastPushStatus,
 *     lastIntegrityCheck, retryCount }
 */
const NetworkSync = (() => {
    let syncTimer = null;
    let retryTimer = null;
    let integrityTimer = null;

    const DEFAULTS = {
        enabled: false,
        networkPath: '',
        intervalHours: 8,         // push interval in hours: 1, 4, 8, 16
        lastPush: null,
        lastPushStatus: null,     // 'success' | 'error: ...'
        lastNetworkOk: null,      // true/false — did network write succeed last time?
        lastIntegrityCheck: null,
        integrityOk: null,        // true/false/null — are local files clean?
        retryCount: 0
    };

    const MAX_RETRIES = 3;
    const RETRY_INTERVAL_MS = 2 * 60 * 1000;      // 2 minutes
    const INTEGRITY_INTERVAL_MS = 8 * 60 * 60 * 1000; // 8 hours

    async function getSettings() {
        const saved = await DB.getSetting('networkSync', null);
        if (!saved) return { ...DEFAULTS };
        return { ...DEFAULTS, ...saved };
    }

    async function saveSettings(settings) {
        await DB.setSetting('networkSync', settings);
    }

    // Push local DB to server (dual local A/B + network)
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
            settings.lastNetworkOk = result.networkOk;
            settings.retryCount = 0;
            await saveSettings(settings);
            cancelRetry();
            console.log(`Sync push OK → local slot ${result.localSlot}, network=${result.networkOk}`);

            // If local succeeded but network failed, schedule retry
            if (!result.networkOk && result.networkError) {
                console.warn('Network write failed, scheduling retry:', result.networkError);
                scheduleRetry();
                return { ok: true, result, networkFailed: true };
            }

            return { ok: true, result };
        } catch (e) {
            settings.lastPushStatus = 'error: ' + e.message;
            settings.lastNetworkOk = false;
            settings.retryCount = (settings.retryCount || 0) + 1;
            await saveSettings(settings);
            console.error('Sync push failed:', e.message);

            // Schedule retry if under limit
            if (settings.retryCount < MAX_RETRIES) {
                scheduleRetry();
            }

            return { ok: false, error: e.message };
        }
    }

    // Retry logic
    function scheduleRetry() {
        cancelRetry();
        retryTimer = setTimeout(async () => {
            const settings = await getSettings();
            if (settings.retryCount >= MAX_RETRIES) {
                console.warn(`Sync retry limit reached (${MAX_RETRIES}). Giving up until next scheduled push.`);
                return;
            }
            console.log(`Sync retry attempt ${settings.retryCount + 1}/${MAX_RETRIES}...`);
            await pushToNetwork();
        }, RETRY_INTERVAL_MS);
        console.log(`Retry scheduled in ${RETRY_INTERVAL_MS / 60000} minutes`);
    }

    function cancelRetry() {
        if (retryTimer) { clearTimeout(retryTimer); retryTimer = null; }
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
            console.warn('Sync pull failed:', e.message);
            return null;
        }
    }

    // Check integrity of local backup files via server
    async function checkIntegrity() {
        try {
            const resp = await fetch('/api/sync/status');
            if (!resp.ok) throw new Error('HTTP ' + resp.status);
            const status = await resp.json();

            const aOk = status.slotA && status.slotA.ok;
            const bOk = status.slotB && status.slotB.ok;
            const allOk = aOk || bOk; // At least one valid backup

            const settings = await getSettings();
            settings.lastIntegrityCheck = new Date().toISOString();
            settings.integrityOk = allOk;
            await saveSettings(settings);

            console.log(`Integrity check: A=${aOk ? 'OK' : 'BAD'}, B=${bOk ? 'OK' : 'BAD'} → ${allOk ? 'CLEAN' : 'WARNING'}`);
            return { ok: allOk, slotA: status.slotA, slotB: status.slotB, network: status.network };
        } catch (e) {
            console.error('Integrity check failed:', e.message);
            return { ok: false, error: e.message };
        }
    }

    // Get full status (for UI display)
    async function getStatus() {
        try {
            const resp = await fetch('/api/sync/status');
            if (!resp.ok) throw new Error('HTTP ' + resp.status);
            return await resp.json();
        } catch (e) {
            return { error: e.message };
        }
    }

    // Open the local data folder in Windows Explorer
    async function openLocalFolder() {
        try {
            const status = await getStatus();
            const dir = status.dataDir;
            if (dir) {
                await fetch('/api/open-folder?path=' + encodeURIComponent(dir));
            }
        } catch (e) {
            console.error('Could not open folder:', e.message);
        }
    }

    // On startup: try network first, fall back to newest valid local
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

            const localTimestamp = await DB.getSetting('lastModified', null);
            const networkTimestamp = networkData.timestamp;

            if (localTimestamp && networkTimestamp && new Date(localTimestamp) >= new Date(networkTimestamp)) {
                console.log('Local DB is same or newer than network — keeping local');
                return { source: 'local', reason: 'local is newer' };
            }

            await DB.importAll(networkData.data);
            console.log('Loaded database from network backup (timestamp: ' + networkTimestamp + ')');
            return { source: 'network', timestamp: networkTimestamp };
        } catch (e) {
            console.error('Failed to load from network, using local:', e);
            return { source: 'local', reason: 'error: ' + e.message };
        }
    }

    // Start periodic sync + integrity check timers
    function start() {
        stop();
        getSettings().then(settings => {
            if (!settings.enabled || !settings.networkPath) return;

            const hours = settings.intervalHours || 8;
            const ms = hours * 60 * 60 * 1000;
            syncTimer = setInterval(async () => {
                console.log('Periodic sync push...');
                await pushToNetwork();
            }, ms);

            // Integrity check every 8 hours
            integrityTimer = setInterval(async () => {
                console.log('Periodic integrity check...');
                await checkIntegrity();
            }, INTEGRITY_INTERVAL_MS);

            console.log(`Network sync started: every ${hours}h → ${settings.networkPath}`);
        });
    }

    function stop() {
        if (syncTimer) { clearInterval(syncTimer); syncTimer = null; }
        if (integrityTimer) { clearInterval(integrityTimer); integrityTimer = null; }
        cancelRetry();
    }

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
        checkIntegrity,
        getStatus,
        openLocalFolder,
        start,
        stop,
        restart,
        DEFAULTS,
        MAX_RETRIES
    };
})();
