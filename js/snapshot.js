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
 */
const Snapshot = (() => {
    const SNAPSHOT_FILE = 'db-snapshot.json';
    let _fileHandle = null; // Persisted handle for silent re-saves

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
     * Read the timestamp from an existing snapshot file handle.
     */
    async function _readExistingTimestamp() {
        if (!_fileHandle) return null;
        try {
            const file = await _fileHandle.getFile();
            const text = await file.text();
            const data = JSON.parse(text);
            return data?._snapshot?.timestamp || null;
        } catch (e) {
            return null;
        }
    }

    /**
     * Save snapshot using File System Access API (Chrome/Edge 86+).
     * First call shows a "Save As" dialog. Subsequent calls save silently.
     * Returns true if saved, false if cancelled/unsupported.
     */
    async function save() {
        const data = await _exportData();
        const json = JSON.stringify(data, null, 2);

        // Try File System Access API first (allows silent re-saves)
        if ('showSaveFilePicker' in window) {
            try {
                if (!_fileHandle) {
                    _fileHandle = await window.showSaveFilePicker({
                        suggestedName: SNAPSHOT_FILE,
                        types: [{
                            description: 'Database Snapshot',
                            accept: { 'application/json': ['.json'] }
                        }]
                    });
                }
                const writable = await _fileHandle.createWritable();
                await writable.write(json);
                await writable.close();
                await DB.setSetting('lastSnapshotTime', new Date().toISOString());
                return { ok: true, method: 'fileSystem', size: json.length };
            } catch (e) {
                if (e.name === 'AbortError') return { ok: false, method: 'cancelled' };
                // Fall through to download method
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
     * Silent re-save (only works if _fileHandle is already set from a previous save).
     * Will NOT overwrite the file if it contains newer data than our local DB.
     * Returns true if saved, false if skipped or no handle.
     */
    async function silentSave() {
        if (!_fileHandle) return false;
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
            const writable = await _fileHandle.createWritable();
            await writable.write(json);
            await writable.close();
            await DB.setSetting('lastSnapshotTime', new Date().toISOString());
            console.log('Snapshot auto-saved:', (json.length / 1024).toFixed(1) + ' KB');
            return true;
        } catch (e) {
            console.warn('Silent save failed:', e.message);
            return false;
        }
    }

    /**
     * Try to load db-snapshot.json from the same folder as the app.
     * Returns the parsed data or null if not found.
     */
    async function loadFromFile() {
        try {
            const resp = await fetch(SNAPSHOT_FILE + '?_v=' + Date.now(), { cache: 'no-store' });
            if (!resp.ok) return null;
            const text = await resp.text();
            if (!text || text.trim().length < 10) return null;
            const data = JSON.parse(text);
            // Basic validation
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
     * Auto-restore: if DB is empty and snapshot file exists, import it.
     * Called on startup.
     */
    async function autoRestore() {
        const empty = await isDbEmpty();
        if (!empty) return { restored: false, reason: 'db_not_empty' };

        const data = await loadFromFile();
        if (!data) return { restored: false, reason: 'no_snapshot_file' };

        await DB.importAll(data);
        const radioCount = (data.radios || []).length;
        const techCount = (data.technicians || []).length;
        const txCount = (data.transactions || []).length;
        console.log(`Snapshot restored: ${radioCount} radios, ${techCount} techs, ${txCount} transactions`);
        return {
            restored: true,
            radioCount,
            techCount,
            txCount,
            timestamp: data._snapshot?.timestamp || 'unknown'
        };
    }

    /**
     * Get info about the last snapshot.
     */
    async function getLastSaveTime() {
        return await DB.getSetting('lastSnapshotTime', null);
    }

    /**
     * Check if we have an active file handle for silent saves.
     */
    function hasFileHandle() {
        return !!_fileHandle;
    }

    return {
        save,
        silentSave,
        loadFromFile,
        isDbEmpty,
        autoRestore,
        getLastSaveTime,
        hasFileHandle,
        SNAPSHOT_FILE
    };
})();
