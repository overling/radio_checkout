/**
 * IndexedDB Database Layer
 * Provides a clean async API over IndexedDB for asset management.
 * Designed to be replaceable with a server-based backend later.
 */
const DB = (() => {
    const DB_NAME = 'AssetTrackerDB';
    const DB_VERSION = 1;
    let db = null;

    const STORES = {
        radios: { keyPath: 'id', indexes: ['serialNumber', 'status', 'model'] },
        batteries: { keyPath: 'id', indexes: ['status', 'model', 'type'] },
        tools: { keyPath: 'id', indexes: ['status', 'model'] },
        technicians: { keyPath: 'id', indexes: ['badgeId', 'name'] },
        transactions: { keyPath: 'id', indexes: ['assetId', 'technicianId', 'type', 'timestamp'] },
        auditLog: { keyPath: 'id', indexes: ['entityId', 'entityType', 'timestamp', 'action'] },
        settings: { keyPath: 'key' }
    };

    function open() {
        return new Promise((resolve, reject) => {
            if (db) { resolve(db); return; }
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onupgradeneeded = (e) => {
                const database = e.target.result;
                for (const [storeName, config] of Object.entries(STORES)) {
                    if (!database.objectStoreNames.contains(storeName)) {
                        const store = database.createObjectStore(storeName, { keyPath: config.keyPath });
                        if (config.indexes) {
                            config.indexes.forEach(idx => {
                                store.createIndex(idx, idx, { unique: false });
                            });
                        }
                    }
                }
            };

            request.onsuccess = (e) => {
                db = e.target.result;
                resolve(db);
            };

            request.onerror = (e) => {
                reject(new Error('Failed to open database: ' + e.target.error));
            };
        });
    }

    function getStore(storeName, mode = 'readonly') {
        const tx = db.transaction(storeName, mode);
        return tx.objectStore(storeName);
    }

    function promisifyRequest(request) {
        return new Promise((resolve, reject) => {
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async function put(storeName, data) {
        await open();
        const store = getStore(storeName, 'readwrite');
        return promisifyRequest(store.put(data));
    }

    async function get(storeName, id) {
        await open();
        const store = getStore(storeName, 'readonly');
        return promisifyRequest(store.get(id));
    }

    async function getAll(storeName) {
        await open();
        const store = getStore(storeName, 'readonly');
        return promisifyRequest(store.getAll());
    }

    async function getByIndex(storeName, indexName, value) {
        await open();
        const store = getStore(storeName, 'readonly');
        const index = store.index(indexName);
        return promisifyRequest(index.getAll(value));
    }

    async function remove(storeName, id) {
        await open();
        const store = getStore(storeName, 'readwrite');
        return promisifyRequest(store.delete(id));
    }

    async function count(storeName) {
        await open();
        const store = getStore(storeName, 'readonly');
        return promisifyRequest(store.count());
    }

    async function clear(storeName) {
        await open();
        const store = getStore(storeName, 'readwrite');
        return promisifyRequest(store.clear());
    }

    // Bulk put for imports
    async function bulkPut(storeName, items) {
        await open();
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        for (const item of items) {
            store.put(item);
        }
        return new Promise((resolve, reject) => {
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    }

    // Settings helpers
    async function getSetting(key, defaultValue = null) {
        const result = await get('settings', key);
        return result ? result.value : defaultValue;
    }

    async function setSetting(key, value) {
        return put('settings', { key, value });
    }

    // Export all data for backup
    async function exportAll() {
        await open();
        const data = {};
        for (const storeName of Object.keys(STORES)) {
            data[storeName] = await getAll(storeName);
        }
        return data;
    }

    // Import data (merge)
    async function importAll(data) {
        await open();
        for (const [storeName, items] of Object.entries(data)) {
            if (STORES[storeName] && Array.isArray(items)) {
                await bulkPut(storeName, items);
            }
        }
    }

    return {
        open,
        put,
        get,
        getAll,
        getByIndex,
        remove,
        count,
        clear,
        bulkPut,
        getSetting,
        setSetting,
        exportAll,
        importAll
    };
})();
