/**
 * File Integrity Verification System
 * Computes SHA-256 hashes of all core application files and compares
 * against a stored manifest. Detects unauthorized modifications.
 *
 * Normal use (database changes, settings) does NOT affect these hashes.
 * Only changes to the actual code files will trigger a warning.
 *
 * After a legitimate code update, regenerate the manifest from the
 * Supervisor Dashboard → "Regenerate Manifest" button.
 */
const FileIntegrity = (() => {
    // List of core files to verify (relative to app root)
    const CORE_FILES = [
        'index.html',
        'css/styles.css',
        'js/db.js',
        'js/models.js',
        'js/scanner.js',
        'js/ui.js',
        'js/authorship.js',
        'js/asset-prefixes.js',
        'js/integrity.js',
        'js/auto-backup.js',
        'js/network-sync.js',
        'js/app.js',
        'js/pages/home.js',
        'js/pages/checkout.js',
        'js/pages/return.js',
        'js/pages/assets.js',
        'js/pages/battery-dashboard.js',
        'js/pages/supervisor.js',
        'js/pages/print-codes.js',
        'js/pages/export.js',
        'js/pages/quick-scan.js',
        'js/pages/clerk-station.js',
        'js/pages/help.js',
        'js/pages/test-harness.js'
    ];

    const MANIFEST_KEY = 'fileIntegrityManifest';

    async function _hashText(text) {
        const data = new TextEncoder().encode(text);
        const hash = await crypto.subtle.digest('SHA-256', data);
        return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
    }

    // Compute a master signature from all individual hashes
    async function _masterSig(fileHashes) {
        const combined = Object.keys(fileHashes).sort().map(k => fileHashes[k]).join('|');
        return await _hashText(combined);
    }

    // Fetch a file and compute its hash
    // Normalize content to be resilient against CDN transformations
    // (Cloudflare auto-minify, Rocket Loader, email obfuscation, etc.)
    function _normalize(text) {
        return text
            // Remove Cloudflare-injected script blocks
            .replace(/<script[^>]*cloudflare[^>]*>[\s\S]*?<\/script>/gi, '')
            .replace(/<script[^>]*cf[-_][^>]*>[\s\S]*?<\/script>/gi, '')
            // Remove Cloudflare email obfuscation markers
            .replace(/data-cfemail="[^"]*"/g, '')
            .replace(/<a[^>]*__cf_email__[^>]*>.*?<\/a>/g, '')
            // Collapse all whitespace runs to a single space
            .replace(/\s+/g, ' ')
            .trim();
    }

    async function _hashFile(path) {
        try {
            const resp = await fetch(path + '?_v=' + Date.now(), { cache: 'no-store' });
            if (!resp.ok) return { path, hash: null, error: 'fetch_failed' };
            const text = await resp.text();
            const hash = await _hashText(_normalize(text));
            return { path, hash, error: null };
        } catch (e) {
            return { path, hash: null, error: e.message };
        }
    }

    /**
     * Compute current hashes for all core files.
     * Returns { files: { path: hash }, masterSig, timestamp }
     */
    async function computeManifest() {
        const files = {};
        const results = await Promise.all(CORE_FILES.map(f => _hashFile(f)));
        for (const r of results) {
            if (r.hash) files[r.path] = r.hash;
        }
        const sig = await _masterSig(files);
        return {
            files,
            masterSig: sig,
            timestamp: new Date().toISOString(),
            fileCount: Object.keys(files).length
        };
    }

    /**
     * Save a manifest to IndexedDB.
     */
    async function saveManifest(manifest) {
        await DB.setSetting(MANIFEST_KEY, manifest);
    }

    /**
     * Load the stored manifest from IndexedDB.
     */
    async function getManifest() {
        return await DB.getSetting(MANIFEST_KEY, null);
    }

    /**
     * Verify current files against stored manifest.
     * Returns { ok, mismatched[], missing[], added[], manifest, current }
     */
    async function verify() {
        const stored = await getManifest();
        if (!stored) {
            return { ok: null, noManifest: true, message: 'No manifest found — generate one first.' };
        }

        const current = await computeManifest();
        const mismatched = [];
        const missing = [];

        // Check each stored file
        for (const [path, expectedHash] of Object.entries(stored.files)) {
            if (!current.files[path]) {
                missing.push(path);
            } else if (current.files[path] !== expectedHash) {
                mismatched.push(path);
            }
        }

        // Check master signature
        const sigMatch = current.masterSig === stored.masterSig;

        const ok = mismatched.length === 0 && missing.length === 0 && sigMatch;

        return {
            ok,
            noManifest: false,
            mismatched,
            missing,
            sigMatch,
            storedTimestamp: stored.timestamp,
            storedFileCount: stored.fileCount,
            currentFileCount: current.fileCount,
            message: ok
                ? `All ${stored.fileCount} files verified — no modifications detected.`
                : `WARNING: ${mismatched.length} modified, ${missing.length} missing file(s).`
        };
    }

    /**
     * Quick startup check — returns true if OK, false if tampered, null if no manifest.
     */
    async function quickCheck() {
        try {
            const result = await verify();
            if (result.noManifest) return null;
            return result.ok;
        } catch (e) {
            console.warn('Integrity check error:', e);
            return null;
        }
    }

    return {
        CORE_FILES,
        computeManifest,
        saveManifest,
        getManifest,
        verify,
        quickCheck
    };
})();
