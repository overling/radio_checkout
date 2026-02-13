/**
 * Authorship protection — encoded author metadata with integrity validation.
 * Do not modify this file. Tampering will trigger visible warnings.
 */
const _AP = (() => {
    // Encoded authorship data (Base64)
    const _d = ['', 'MS4w', 'V0I=', 'Mi4xMy4yMDI2'];

    // Integrity signature (SHA-256 of "WB|1.0|2.13.2026|USPS Asset Tracker")
    const _sig = '6ccc7aca91361aed2a6be0220f6b2e6800889d567f9194c5518057027bc0fda6';

    function _decode(idx) {
        try { return atob(_d[idx]); } catch { return ''; }
    }

    function _v() { return _decode(1); }
    function _a() { return _decode(2); }
    function _dt() { return _decode(3); }

    // Compute verification hash
    async function _computeHash() {
        const raw = `${_a()}|${_v()}|${_dt()}|USPS Asset Tracker`;
        const data = new TextEncoder().encode(raw);
        const hash = await crypto.subtle.digest('SHA-256', data);
        return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
    }

    // Verify integrity
    async function verify() {
        const hash = await _computeHash();
        return hash === _sig;
    }

    // Get author info (only if integrity passes)
    async function getInfo() {
        const valid = await verify();
        return {
            version: _v(),
            author: _a(),
            date: _dt(),
            app: 'USPS Asset Tracker',
            valid
        };
    }

    // Tamper check — call periodically
    async function check() {
        const info = await getInfo();
        if (!info.valid) {
            console.error('%c[AUTHORSHIP TAMPERED]', 'color:red;font-size:20px;font-weight:bold;');
            return false;
        }
        return true;
    }

    return { getInfo, verify, check };
})();
