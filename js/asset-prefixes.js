/**
 * Asset Prefix Detection — configurable prefix→category mapping.
 * Stored in IndexedDB under 'assetPrefixes'.
 *
 * Default prefixes: WV → radio, BAT → battery, T → tool
 * Rule: if a scanned value starts with a letter → asset lookup by prefix.
 *        if it starts with a digit → badge.
 */
const AssetPrefixes = (() => {
    const DEFAULT_PREFIXES = [
        { prefix: 'WV',  category: 'radio',   label: 'Radio' },
        { prefix: 'BAT', category: 'battery', label: 'Battery' },
        { prefix: 'T',   category: 'tool',    label: 'Tool' }
    ];

    // Cache to avoid repeated DB reads during a session
    let _cache = null;

    async function getAll() {
        if (_cache) return _cache;
        const stored = await DB.getSetting('assetPrefixes', null);
        _cache = stored || [...DEFAULT_PREFIXES];
        return _cache;
    }

    async function save(prefixes) {
        _cache = prefixes;
        await DB.setSetting('assetPrefixes', prefixes);
    }

    function clearCache() {
        _cache = null;
    }

    /**
     * Detect asset category from a scanned value.
     * Returns { category, prefix, label } or null if no prefix match.
     * Checks longest prefix first to avoid ambiguity (e.g. "WV" vs "W").
     */
    async function detect(value) {
        const prefixes = await getAll();
        const upper = value.toUpperCase();
        // Sort by prefix length descending — longest match wins
        const sorted = [...prefixes].sort((a, b) => b.prefix.length - a.prefix.length);
        for (const entry of sorted) {
            if (upper.startsWith(entry.prefix.toUpperCase())) {
                return entry;
            }
        }
        return null;
    }

    /**
     * Quick check: does the value start with a letter (potential asset)?
     * If it starts with a digit, it's almost certainly a badge.
     */
    function startsWithLetter(value) {
        return /^[A-Za-z]/.test(value);
    }

    /**
     * Full smart detection for scanner pages:
     * 1. If starts with a digit → badge
     * 2. If prefix matches → return that category
     * 3. If starts with letter but no prefix match → check all asset DBs
     * 4. If found in DB → return category
     * 5. Otherwise → badge (fallback)
     *
     * Returns: { type: 'radio'|'battery'|'tool'|'badge', source: 'prefix'|'db'|'fallback' }
     */
    async function identify(value) {
        value = value.trim();
        if (!value) return { type: 'badge', source: 'fallback' };

        // Digit-first → badge
        if (!startsWithLetter(value)) {
            return { type: 'badge', source: 'fallback' };
        }

        // Check prefix match
        const match = await detect(value);
        if (match) {
            return { type: match.category, source: 'prefix' };
        }

        // No prefix match but starts with letter — check asset DBs
        const radio = await DB.get('radios', value);
        if (radio) return { type: 'radio', source: 'db' };

        const battery = await DB.get('batteries', value);
        if (battery) return { type: 'battery', source: 'db' };

        const tool = await DB.get('tools', value);
        if (tool) return { type: 'tool', source: 'db' };

        // Starts with letter, no match anywhere — treat as badge fallback
        return { type: 'badge', source: 'fallback' };
    }

    async function resetToDefaults() {
        await save([...DEFAULT_PREFIXES]);
    }

    return {
        getAll,
        save,
        clearCache,
        detect,
        identify,
        startsWithLetter,
        resetToDefaults,
        DEFAULT_PREFIXES
    };
})();
