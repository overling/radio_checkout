/**
 * Network Sync Module
 * Periodically saves the IndexedDB database as JSON to a user-chosen folder
 * (local or network share) using the File System Access API (Chrome/Edge 86+).
 *
 * How it works:
 *   1. User clicks "Choose Folder" in Supervisor → picks a folder (local or \\server\share)
 *   2. Browser gets a directory handle with write permission
 *   3. On a timer (1/4/8/16 hours), the DB is exported and written to that folder
 *   4. Uses dual A/B backup files for crash safety
 *   5. On startup, if local DB is empty, tries to load from the sync folder
 *
 * No server required — the browser writes files directly.
 *
 * Settings stored in IndexedDB under 'networkSync':
 *   { enabled, folderName, intervalHours, lastPush, lastPushStatus, nextSlot }
 */
const NetworkSync = (() => {
    let syncTimer = null;
    let _dirHandle = null; // File System Access API directory handle

    const FILE_A = 'asset-tracker-backup-A.json';
    const FILE_B = 'asset-tracker-backup-B.json';

    const DEFAULTS = {
        enabled: false,
        folderName: '',           // display name of chosen folder
        intervalHours: 8,
        lastPush: null,
        lastPushStatus: null,     // 'success' | 'error: ...'
        nextSlot: 'A',            // alternates A/B
        retryCount: 0
    };

    const MAX_RETRIES = 3;

    async function getSettings() {
        const saved = await DB.getSetting('networkSync', null);
        if (!saved) return { ...DEFAULTS };
        return { ...DEFAULTS, ...saved };
    }

    async function saveSettings(settings) {
        await DB.setSetting('networkSync', settings);
    }

    /**
     * Check if File System Access API is available.
     */
    function isSupported() {
        return 'showDirectoryPicker' in window;
    }

    /**
     * Prompt user to pick a folder. Returns true if successful.
     * The handle is kept in memory for the session. After a page reload
     * the user must re-pick (browser security requirement).
     */
    async function chooseFolder() {
        if (!isSupported()) {
            return { ok: false, error: 'File System Access API not supported. Use Chrome or Edge.' };
        }
        try {
            _dirHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
            const settings = await getSettings();
            settings.enabled = true;
            settings.folderName = _dirHandle.name;
            await saveSettings(settings);
            return { ok: true, name: _dirHandle.name };
        } catch (e) {
            if (e.name === 'AbortError') return { ok: false, error: 'Cancelled' };
            return { ok: false, error: e.message };
        }
    }

    /**
     * Check if we have an active folder handle this session.
     */
    function hasHandle() {
        return !!_dirHandle;
    }

    /**
     * Write a JSON string to a file in the chosen directory.
     */
    async function _writeFile(fileName, jsonStr) {
        if (!_dirHandle) throw new Error('No folder selected — click "Choose Folder" first');
        const fileHandle = await _dirHandle.getFileHandle(fileName, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(jsonStr);
        await writable.close();
    }

    /**
     * Read a JSON file from the chosen directory. Returns parsed object or null.
     */
    async function _readFile(fileName) {
        if (!_dirHandle) return null;
        try {
            const fileHandle = await _dirHandle.getFileHandle(fileName);
            const file = await fileHandle.getFile();
            const text = await file.text();
            return JSON.parse(text);
        } catch (e) {
            return null; // file doesn't exist or is invalid
        }
    }

    /**
     * Push database to the chosen folder (dual A/B backup).
     * Will NOT overwrite a backup file that has a newer timestamp than our local DB.
     */
    async function pushToNetwork(force = false) {
        const settings = await getSettings();
        if (!settings.enabled) return { ok: false, error: 'Sync not enabled' };
        if (!_dirHandle) return { ok: false, error: 'No folder handle — re-select folder in Supervisor' };

        try {
            const localModified = await DB.getLastModified();
            const now = new Date().toISOString();

            // Check if either backup file is newer than our local data
            if (!force && localModified) {
                const newest = await _getNewestBackupTimestamp();
                if (newest && new Date(newest) > new Date(localModified)) {
                    console.log(`Sync skip: backup file is newer (${newest}) than local DB (${localModified})`);
                    if (typeof UI !== 'undefined' && UI.toast) {
                        UI.toast('Backup folder has newer data — save skipped to protect it', 'info', 4000);
                    }
                    return { ok: false, skipped: true, error: 'Backup is newer than local — not overwriting' };
                }
            }

            const data = await DB.exportAll();
            const payload = {
                _sync: {
                    timestamp: localModified || now,
                    slot: settings.nextSlot || 'A',
                    source: location.hostname || 'local'
                },
                ...data
            };
            const json = JSON.stringify(payload, null, 2);
            const fileName = settings.nextSlot === 'B' ? FILE_B : FILE_A;

            await _writeFile(fileName, json);

            // Update settings
            settings.lastPush = now;
            settings.lastPushStatus = 'success';
            settings.nextSlot = settings.nextSlot === 'A' ? 'B' : 'A';
            settings.retryCount = 0;
            await saveSettings(settings);

            const kb = (json.length / 1024).toFixed(1);
            console.log(`Sync push OK → ${fileName} (${kb} KB)`);
            return { ok: true, file: fileName, size: json.length };
        } catch (e) {
            settings.lastPushStatus = 'error: ' + e.message;
            settings.retryCount = (settings.retryCount || 0) + 1;
            await saveSettings(settings);
            console.error('Sync push failed:', e.message);
            return { ok: false, error: e.message };
        }
    }

    /**
     * Get the timestamp of the newest backup file in the folder.
     */
    async function _getNewestBackupTimestamp() {
        const a = await _readFile(FILE_A);
        const b = await _readFile(FILE_B);
        const tsA = a?._sync?.timestamp ? new Date(a._sync.timestamp) : null;
        const tsB = b?._sync?.timestamp ? new Date(b._sync.timestamp) : null;
        if (tsA && tsB) return (tsA > tsB ? tsA : tsB).toISOString();
        if (tsA) return tsA.toISOString();
        if (tsB) return tsB.toISOString();
        return null;
    }

    /**
     * Read the newest valid backup from the chosen folder.
     * Returns { data, timestamp, file } or null.
     */
    async function pullFromFolder() {
        if (!_dirHandle) return null;

        const a = await _readFile(FILE_A);
        const b = await _readFile(FILE_B);

        if (!a && !b) return null;

        // Pick the newest
        const tsA = a?._sync?.timestamp ? new Date(a._sync.timestamp) : new Date(0);
        const tsB = b?._sync?.timestamp ? new Date(b._sync.timestamp) : new Date(0);

        if (a && (!b || tsA >= tsB)) {
            return { data: a, timestamp: a._sync?.timestamp, file: FILE_A };
        }
        return { data: b, timestamp: b._sync?.timestamp, file: FILE_B };
    }

    /**
     * On startup: if DB is empty and sync is enabled, try to load from folder.
     * User must re-pick the folder each session (browser security), so this
     * only works if chooseFolder() was called first.
     */
    async function loadOnStartup() {
        const settings = await getSettings();
        if (!settings.enabled) {
            return { source: 'local', reason: 'sync disabled' };
        }
        if (!_dirHandle) {
            return { source: 'local', reason: 'no folder handle this session' };
        }

        try {
            const backup = await pullFromFolder();
            if (!backup || !backup.data) {
                return { source: 'local', reason: 'no backup files found' };
            }

            const localRadios = await DB.count('radios');
            if (localRadios > 0) {
                return { source: 'local', reason: 'local DB has data' };
            }

            // DB is empty, restore from backup
            const { _sync, ...importData } = backup.data;
            await DB.importAll(importData);
            console.log(`Loaded database from sync folder: ${backup.file} (${backup.timestamp})`);
            return { source: 'folder', timestamp: backup.timestamp, file: backup.file };
        } catch (e) {
            console.error('Failed to load from sync folder:', e);
            return { source: 'local', reason: 'error: ' + e.message };
        }
    }

    /**
     * Get status info for UI display.
     */
    async function getStatus() {
        const settings = await getSettings();
        let slotA = null, slotB = null;

        if (_dirHandle) {
            const a = await _readFile(FILE_A);
            const b = await _readFile(FILE_B);
            slotA = a ? { ok: true, timestamp: a._sync?.timestamp } : { ok: false };
            slotB = b ? { ok: true, timestamp: b._sync?.timestamp } : { ok: false };
        }

        return {
            enabled: settings.enabled,
            folderName: settings.folderName,
            hasHandle: !!_dirHandle,
            intervalHours: settings.intervalHours,
            lastPush: settings.lastPush,
            lastPushStatus: settings.lastPushStatus,
            nextSlot: settings.nextSlot,
            slotA,
            slotB
        };
    }

    /**
     * Start periodic sync timer.
     */
    function start() {
        stop();
        getSettings().then(settings => {
            if (!settings.enabled || !_dirHandle) return;

            const hours = settings.intervalHours || 8;
            const ms = hours * 60 * 60 * 1000;
            syncTimer = setInterval(async () => {
                console.log('Periodic sync push...');
                const result = await pushToNetwork();
                if (!result.ok && result.error) {
                    console.warn('Periodic sync failed:', result.error);
                }
            }, ms);

            console.log(`Folder sync started: every ${hours}h → "${settings.folderName}"`);
        });
    }

    function stop() {
        if (syncTimer) { clearInterval(syncTimer); syncTimer = null; }
    }

    function restart() {
        stop();
        start();
    }

    /**
     * Disable sync entirely.
     */
    async function disable() {
        stop();
        _dirHandle = null;
        const settings = await getSettings();
        settings.enabled = false;
        settings.folderName = '';
        await saveSettings(settings);
    }

    return {
        getSettings,
        saveSettings,
        isSupported,
        chooseFolder,
        hasHandle,
        pushToNetwork,
        pullFromFolder,
        loadOnStartup,
        getStatus,
        start,
        stop,
        restart,
        disable,
        DEFAULTS,
        MAX_RETRIES
    };
})();
