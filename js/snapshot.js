/**
 * Database Snapshot — portable database file system.
 *
 * IndexedDB is stored inside the browser, NOT in the project folder.
 * When you copy the app to another machine, the database doesn't come with it.
 *
 * This module solves that by:
 *  1. Saving a db-snapshot.json file in the project folder (one-click or auto)
 *  2. Auto-loading from db-snapshot.json on startup if the local DB is empty
 *  3. Using the File System Access API (Chrome/Edge) for silent re-saves
 *  4. Keeping a db-emergency.bak file updated every 8 hours as a last-resort backup
 */
const Snapshot = (() => {
    const SNAPSHOT_FILE = 'db-snapshot.json';
    const EMERGENCY_FILE = 'db-emergency.bak';
    const EMERGENCY_INTERVAL_MS = 8 * 60 * 60 * 1000; // 8 hours
    let _dirHandle = null;   // Directory handle for the app folder
    let _fileHandle = null;  // File handle for db-snapshot.json (within _dirHandle)
    let _emergencyTimer = null;

    /**
     * Export the full database to a JSON object.
     * Uses the DB's lastModified timestamp so we can compare accurately.
     */
    async function _exportData() {
        const data = await DB.exportAll();
        const localModified = await DB.getLastModified();
        data._snapshot = {
            timestamp: localModified || new Date().toISOString(),
            version: '1.0',
            source: location.hostname || 'local'
        };
        return data;
    }

    /**
     * Write JSON string to a named file in the directory handle.
     */
    async function _writeToDir(fileName, json) {
        if (!_dirHandle) return false;
        const fh = await _dirHandle.getFileHandle(fileName, { create: true });
        const writable = await fh.createWritable();
        await writable.write(json);
        await writable.close();
        return true;
    }

    /**
     * Read and parse a named file from the directory handle.
     */
    async function _readFromDir(fileName) {
        if (!_dirHandle) return null;
        try {
            const fh = await _dirHandle.getFileHandle(fileName);
            const file = await fh.getFile();
            const text = await file.text();
            return JSON.parse(text);
        } catch (e) {
            return null; // file doesn't exist or parse error
        }
    }

    /**
     * Read the timestamp from the existing snapshot file.
     */
    async function _readExistingTimestamp() {
        const data = await _readFromDir(SNAPSHOT_FILE);
        return data?._snapshot?.timestamp || null;
    }

    /**
     * Save snapshot using File System Access API (Chrome/Edge 86+).
     * First call shows a folder picker. Subsequent calls save silently.
     */
    async function save() {
        const data = await _exportData();
        const json = JSON.stringify(data, null, 2);

        // Try File System Access API first (allows silent re-saves)
        if ('showDirectoryPicker' in window) {
            try {
                if (!_dirHandle) {
                    _dirHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
                }
                await _writeToDir(SNAPSHOT_FILE, json);
                await DB.setSetting('lastSnapshotTime', new Date().toISOString());
                // Start the emergency backup timer now that we have a dir handle
                _startEmergencyTimer();
                return { ok: true, method: 'fileSystem', size: json.length };
            } catch (e) {
                if (e.name === 'AbortError') return { ok: false, method: 'cancelled' };
                console.warn('File System Access failed, falling back to download:', e.message);
            }
        }

        // Fallback: trigger a download
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = SNAPSHOT_FILE;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        await DB.setSetting('lastSnapshotTime', new Date().toISOString());
        return { ok: true, method: 'download', size: json.length };
    }

    /**
     * Silent re-save (only works if _dirHandle is already set from a previous save).
     * Will NOT overwrite the file if it contains newer data than our local DB.
     */
    async function silentSave() {
        if (!_dirHandle) return false;
        try {
            // Check if existing file is newer than our local data
            const localModified = await DB.getLastModified();
            const existingTs = await _readExistingTimestamp();
            if (localModified && existingTs && new Date(existingTs) > new Date(localModified)) {
                console.log(`Snapshot skip: file is newer (${existingTs}) than local DB (${localModified})`);
                if (typeof UI !== 'undefined' && UI.toast) {
                    UI.toast('Snapshot file has newer data — local save skipped to protect it', 'info', 4000);
                }
                return false;
            }

            const data = await _exportData();
            const json = JSON.stringify(data, null, 2);
            await _writeToDir(SNAPSHOT_FILE, json);
            await DB.setSetting('lastSnapshotTime', new Date().toISOString());
            console.log('Snapshot auto-saved:', (json.length / 1024).toFixed(1) + ' KB');
            return true;
        } catch (e) {
            console.warn('Silent save failed:', e.message);
            return false;
        }
    }

    // ===== Emergency Backup (.bak) — updated every 8 hours =====

    /**
     * Write the emergency backup file. No timestamp guard — always overwrites.
     * This is the safety net; it's always up to date (within 8 hours).
     */
    async function _writeEmergencyBackup() {
        if (!_dirHandle) return false;
        try {
            const data = await _exportData();
            data._emergency = {
                timestamp: new Date().toISOString(),
                warning: 'EMERGENCY BACKUP — May be up to 8 hours old. Use only if all other restore methods fail.'
            };
            const json = JSON.stringify(data, null, 2);
            await _writeToDir(EMERGENCY_FILE, json);
            await DB.setSetting('lastEmergencyBackupTime', new Date().toISOString());
            console.log('Emergency backup saved:', (json.length / 1024).toFixed(1) + ' KB');
            return true;
        } catch (e) {
            console.warn('Emergency backup failed:', e.message);
            return false;
        }
    }

    /**
     * Start the 8-hour emergency backup timer.
     */
    function _startEmergencyTimer() {
        if (_emergencyTimer) return; // already running
        // Write one immediately on connect
        _writeEmergencyBackup();
        _emergencyTimer = setInterval(() => {
            _writeEmergencyBackup();
        }, EMERGENCY_INTERVAL_MS);
        console.log('Emergency backup timer started (every 8 hours)');
    }

    /**
     * Restore from the emergency backup file.
     * Returns { restored, radioCount, techCount, timestamp } or { restored: false }.
     */
    async function emergencyRestore() {
        // Try reading from dir handle first
        let data = await _readFromDir(EMERGENCY_FILE);

        // If no dir handle, try fetching from the app folder
        if (!data) {
            try {
                const resp = await fetch(EMERGENCY_FILE + '?_v=' + Date.now(), { cache: 'no-store' });
                if (resp.ok) {
                    const text = await resp.text();
                    if (text && text.trim().length > 10) {
                        data = JSON.parse(text);
                    }
                }
            } catch (e) { /* ignore */ }
        }

        if (!data || (!data.radios && !data.technicians)) {
            return { restored: false, reason: 'no_emergency_file' };
        }

        // Strip internal metadata before import
        const { _snapshot, _emergency, ...importData } = data;
        await DB.importAll(importData);
        const radioCount = (data.radios || []).length;
        const techCount = (data.technicians || []).length;
        const ts = data._emergency?.timestamp || data._snapshot?.timestamp || 'unknown';
        return { restored: true, radioCount, techCount, timestamp: ts };
    }

    /**
     * Get the timestamp of the last emergency backup.
     */
    async function getLastEmergencyTime() {
        return await DB.getSetting('lastEmergencyBackupTime', null);
    }

    // ===== Load / Restore =====

    /**
     * Try to load db-snapshot.json from the same folder as the app.
     * Returns the parsed data or null if not found.
     */
    async function loadFromFile() {
        // Try dir handle first
        let data = await _readFromDir(SNAPSHOT_FILE);
        if (data) return data;

        // Fallback: fetch from app folder
        try {
            const resp = await fetch(SNAPSHOT_FILE + '?_v=' + Date.now(), { cache: 'no-store' });
            if (!resp.ok) return null;
            const text = await resp.text();
            if (!text || text.trim().length < 10) return null;
            data = JSON.parse(text);
            if (!data.radios && !data.technicians && !data.settings) return null;
            return data;
        } catch (e) {
            return null;
        }
    }

    /**
     * Check if the local database is empty (no radios, no technicians).
     */
    async function isDbEmpty() {
        const radios = await DB.count('radios');
        const techs = await DB.count('technicians');
        return radios === 0 && techs === 0;
    }

    /**
     * Auto-restore: if DB is empty, try snapshot first, then emergency backup.
     * Called on startup.
     */
    async function autoRestore() {
        const empty = await isDbEmpty();
        if (!empty) return { restored: false, reason: 'db_not_empty' };

        // Try snapshot file first
        const data = await loadFromFile();
        if (data) {
            await DB.importAll(data);
            const radioCount = (data.radios || []).length;
            const techCount = (data.technicians || []).length;
            const txCount = (data.transactions || []).length;
            console.log(`Snapshot restored: ${radioCount} radios, ${techCount} techs, ${txCount} transactions`);
            return {
                restored: true,
                source: 'snapshot',
                radioCount,
                techCount,
                txCount,
                timestamp: data._snapshot?.timestamp || 'unknown'
            };
        }

        // Try emergency backup as last resort
        const emergResult = await emergencyRestore();
        if (emergResult.restored) {
            console.log(`Emergency backup restored: ${emergResult.radioCount} radios, ${emergResult.techCount} techs`);
            return {
                restored: true,
                source: 'emergency',
                radioCount: emergResult.radioCount,
                techCount: emergResult.techCount,
                txCount: 0,
                timestamp: emergResult.timestamp
            };
        }

        return { restored: false, reason: 'no_files_found' };
    }

    /**
     * Get info about the last snapshot.
     */
    async function getLastSaveTime() {
        return await DB.getSetting('lastSnapshotTime', null);
    }

    /**
     * Check if we have an active directory handle for silent saves.
     */
    function hasFileHandle() {
        return !!_dirHandle;
    }

    return {
        save,
        silentSave,
        loadFromFile,
        isDbEmpty,
        autoRestore,
        getLastSaveTime,
        hasFileHandle,
        emergencyRestore,
        getLastEmergencyTime,
        SNAPSHOT_FILE,
        EMERGENCY_FILE
    };
})();
