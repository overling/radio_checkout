/**
 * UI Framework - Navigation, Modals, Toasts, Utilities
 */
const UI = (() => {
    const pages = {};
    let currentPage = 'home';
    let tooltipObserver = null;

    const TOOLTIP_BY_ID = {
        'header-save-btn': 'Save a database snapshot and enable auto-save for this session',
        'header-info-btn': 'Open app info, manual, and emergency restore tools',
        'reconnect-btn': 'Reconnect backup folders so automatic saving can continue',
        'modal-close': 'Close this dialog window',
        'scanner-close': 'Close camera scanner',

        'goto-assets-from-print': 'Open Assets & Technicians to manage radios, batteries, tools, and technician badges',

        'export-xlsx-btn': 'Export all database records to one Excel workbook with sheets for Radios, Batteries, Tools, Technicians, Transactions, and Audit Log',
        'import-xlsx-btn': 'Import an Excel workbook and merge/update records by ID across Radios, Batteries, Tools, Technicians, Transactions, and Audit Log',
        'export-json-btn': 'Export a full JSON backup of every database table for archival or transfer',
        'import-json-btn': 'Import a JSON backup and merge/update records by ID in the current database',
        'clear-data-btn': 'Delete all radios, batteries, tools, technicians, transactions, settings, and logs from this database',
        'ab-save-btn': 'Save automatic backup schedule times used for background backups',
        'ab-backup-now-btn': 'Run an immediate backup now using the current backup settings',
        'ab-add-time': 'Add another scheduled daily backup time',

        'add-tech-btn': 'Create a new technician badge record',
        'import-techs-btn': 'Import technician records from an Excel spreadsheet',
        'export-techs-all-btn': 'Export every technician record (Badge ID, first/last name, department, timestamps) to Excel',
        'export-techs-filtered-btn': 'Export only technicians currently matching the search filter to Excel',

        'sv-save-hours': 'Save the overdue threshold in hours used to flag late radio returns',
        'sv-email-add': 'Add this email contact to overdue alert recipients',
        'sv-email-save-msg': 'Save the overdue alert message template used in outgoing emails',
        'sv-email-send': 'Send overdue alert email now to all enabled contacts for currently overdue radios',
        'sv-sync-choose': 'Pick the folder used for sync/backup writes and reconnect permissions for this browser session',
        'sv-sync-push': 'Write the current database to the connected sync folder now',
        'sv-sync-pull': 'Load the newest backup file from the sync folder and merge it into this database',
        'sv-sync-disable': 'Disable folder sync and stop automatic sync timer (backup files remain on disk)',
        'sv-prefix-add': 'Add a scanner prefix rule that maps a code prefix to an asset category/label',
        'sv-prefix-reset': 'Restore scanner prefix rules back to factory defaults',
        'sv-regen-manifest': 'Rebuild and save trusted file-integrity hashes after approved code updates',
        'sv-verify-files': 'Run a file-integrity scan now and report modified/missing files',
        'sv-pw-change': 'Set or change the supervisor dashboard password',
        'sv-pw-remove': 'Remove supervisor password protection from this dashboard',

        'co-radio-camera': 'Open camera scanner to capture a radio barcode/QR code for checkout',
        'co-tech-camera': 'Open camera scanner to capture a technician badge for checkout',

        'ret-radio-camera': 'Open camera scanner to capture a radio barcode/QR code for return',

        'cs-camera-toggle': 'Turn continuous camera scanning on/off for Clerk Station input',
        'cs-clear-log': 'Clear the Clerk Station activity log panel',

        'qs-mode-btn': 'Switch Quick Scan mode between AUTO, CHECK OUT, and CHECK IN',
        'qs-camera-toggle': 'Turn self-service camera scanning on/off for Quick Scan',
        'qs-clear-log': 'Clear the Quick Scan activity log panel',

        'pc-select-all-radios': 'Select all radio assets for batch label generation',
        'pc-select-all-batteries': 'Select all battery assets for batch label generation',
        'pc-select-all-tools': 'Select all tool assets for batch label generation',
        'pc-select-none': 'Clear all selected assets in the batch print list',
        'ptn-save-btn': 'Save this technician name to the scanned badge record',
        'ptn-skip-btn': 'Skip naming for now and continue',

        'th-run-full': 'Reset data, generate a full demo week, and run all tests',
        'th-run-tests-only': 'Run verification tests on current data (can modify records)',
        'th-clear': 'Permanently delete all stored data',
        'th-full-cancel': 'Cancel running the full-week simulation',
        'th-full-go': 'Run full-week simulation after DELETE confirmation',
        'th-tests-cancel': 'Cancel running verification tests',
        'th-tests-go': 'Run verification tests after RUN TESTS confirmation',
        'th-clear-cancel': 'Cancel clear-all-data operation',
        'th-clear-go': 'Permanently clear all data after DELETE confirmation',

        'pc-generate': 'Generate labels using the selected options',
        'pc-print': 'Print the currently generated labels',

        'help-open-manual-btn': 'Open the full instruction manual page',
        'help-open-quickstart-btn': 'Open the quick-start checklist for first-time setup'
    };

    const TOOLTIP_BY_TEXT = {
        'save': 'Save your changes',
        'cancel': 'Cancel and close this dialog',
        'close': 'Close this window',
        'edit': 'Edit this record',
        'remove': 'Remove this item',
        'delete': 'Delete this item',
        'clear': 'Clear the current selection',
        'add': 'Add a new record',
        'export all': 'Export all records to an Excel file',
        'export filtered': 'Export only records matching the current search',
        'export to excel': 'Export data to an Excel file (records included depend on this page)',
        'import from excel': 'Import data from an Excel file into the current database',
        'save now': 'Save a backup immediately',
        'choose folder': 'Choose the folder used for backup and sync',
        'load from folder': 'Load and merge data from the selected backup folder',
        'backup now': 'Run an immediate backup now',
        'export json backup': 'Export a full JSON backup of all database tables',
        'import json backup': 'Import a JSON backup and merge/update matching records',
        'run full week simulation + tests': 'Delete current data, generate a full demo week, then run all verification tests',
        'run tests only no data reset': 'Run verification tests against current data without clearing tables (tests can still modify records)',
        'clear all data': 'Permanently delete all stored data tables from this database',
        'send overdue alert': 'Send overdue radio alerts to enabled email contacts right now',
        'generate': 'Generate preview labels using current code type, size, and selected assets',
        'print labels': 'Print the generated labels',
        'open instruction manual': 'Open the built-in instruction manual'
    };

    function registerPage(name, renderFn) {
        pages[name] = renderFn;
    }

    function navigateTo(pageName) {
        currentPage = pageName;
        // Update nav
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.page === pageName);
        });
        // Render page
        const content = document.getElementById('app-content');
        if (pages[pageName]) {
            content.innerHTML = '';
            Promise.resolve(pages[pageName](content)).finally(() => {
                applyButtonTooltips(content);
            });
        }
    }

    function initNav() {
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', () => navigateTo(btn.dataset.page));
        });
        initButtonTooltips();
    }

    function _normalizeTooltipText(text) {
        return String(text || '').replace(/\s+/g, ' ').trim();
    }

    function _cleanButtonText(text) {
        return _normalizeTooltipText(text)
            .replace(/^[^A-Za-z0-9]+/, '')
            .replace(/\s+/g, ' ')
            .trim();
    }

    function _tooltipFromId(id) {
        const clean = _normalizeTooltipText(id);
        if (!clean) return '';
        return clean
            .replace(/[-_]+/g, ' ')
            .replace(/\b\w/g, (m) => m.toUpperCase());
    }

    function _deriveButtonTooltip(button) {
        const ariaLabel = _normalizeTooltipText(button.getAttribute('aria-label'));
        if (ariaLabel) return ariaLabel;

        const dataTooltip = _normalizeTooltipText(button.dataset.tooltip);
        if (dataTooltip) return dataTooltip;

        const idKey = _normalizeTooltipText(button.id).toLowerCase();
        if (idKey && TOOLTIP_BY_ID[idKey]) return TOOLTIP_BY_ID[idKey];

        const text = _cleanButtonText(button.textContent);
        if (text === '×' || text === '✕') return 'Close';

        const textKey = text.toLowerCase();
        if (textKey && TOOLTIP_BY_TEXT[textKey]) return TOOLTIP_BY_TEXT[textKey];

        if (/^add\s+/i.test(text)) {
            return `Add ${text.replace(/^add\s+/i, '').trim()} to the database`;
        }
        if (/^edit\s+/i.test(text)) {
            return `Edit ${text.replace(/^edit\s+/i, '').trim()}`;
        }
        if (/^save\s+/i.test(text)) {
            return `Save ${text.replace(/^save\s+/i, '').trim()}`;
        }

        if (text) return text;

        const fromId = _tooltipFromId(button.id);
        if (fromId) return fromId;

        return 'Button';
    }

    function applyButtonTooltips(root = document) {
        if (!root) return;

        const buttons = [];
        if (root.nodeType === 1 && root.matches('button')) {
            buttons.push(root);
        }
        if (root.querySelectorAll) {
            root.querySelectorAll('button').forEach(btn => buttons.push(btn));
        }

        buttons.forEach((button) => {
            const existingTitle = _normalizeTooltipText(button.getAttribute('title'));
            if (existingTitle) return;
            button.setAttribute('title', _deriveButtonTooltip(button));
        });
    }

    function initButtonTooltips() {
        applyButtonTooltips(document);

        if (tooltipObserver || typeof MutationObserver === 'undefined') return;

        tooltipObserver = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node && node.nodeType === 1) {
                        applyButtonTooltips(node);
                    }
                });
            });
        });

        tooltipObserver.observe(document.body, { childList: true, subtree: true });
    }

    // Clock
    function startClock() {
        const el = document.getElementById('header-clock');
        const update = () => {
            const now = new Date();
            el.textContent = now.toLocaleString('en-US', {
                weekday: 'short', month: 'short', day: 'numeric',
                hour: '2-digit', minute: '2-digit'
            });
        };
        update();
        setInterval(update, 30000);
    }

    // Clerk name
    async function initClerk() {
        const el = document.getElementById('header-clerk');
        let name = await DB.getSetting('clerkName', '');
        if (!name) {
            name = prompt('Enter your name (clerk):') || 'Clerk';
            await DB.setSetting('clerkName', name);
        }
        el.textContent = '👤 ' + name;
        el.addEventListener('click', async () => {
            const newName = prompt('Enter clerk name:', name);
            if (newName && newName.trim()) {
                name = newName.trim();
                await DB.setSetting('clerkName', name);
                el.textContent = '👤 ' + name;
            }
        });
    }

    function getClerkName() {
        const el = document.getElementById('header-clerk');
        return el ? el.textContent.replace('👤 ', '').trim() : 'Clerk';
    }

    // Toast notifications
    function toast(message, type = 'info', duration = 3500) {
        const container = document.getElementById('toast-container');
        const el = document.createElement('div');
        el.className = `toast ${type}`;
        el.textContent = message;
        container.appendChild(el);
        setTimeout(() => {
            el.style.opacity = '0';
            el.style.transform = 'translateX(100%)';
            el.style.transition = '0.3s ease';
            setTimeout(() => el.remove(), 300);
        }, duration);
    }

    // Modal
    function showModal(title, bodyHtml, footerHtml = '') {
        document.getElementById('modal-title').textContent = title;
        document.getElementById('modal-body').innerHTML = bodyHtml;
        document.getElementById('modal-footer').innerHTML = footerHtml;
        document.getElementById('modal-overlay').classList.remove('hidden');
        applyButtonTooltips(document.getElementById('modal-container'));
    }

    function closeModal() {
        document.getElementById('modal-overlay').classList.add('hidden');
    }

    function initModal() {
        document.getElementById('modal-close').addEventListener('click', closeModal);
        document.getElementById('modal-overlay').addEventListener('click', (e) => {
            if (e.target === document.getElementById('modal-overlay')) closeModal();
        });
    }

    // Status badge helper
    function statusBadge(status) {
        const cls = status.toLowerCase().replace(/\s+/g, '-');
        return `<span class="badge badge-${cls}">${status}</span>`;
    }

    // Format date
    function formatDate(isoStr) {
        if (!isoStr) return '—';
        const d = new Date(isoStr);
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }

    function formatDateTime(isoStr) {
        if (!isoStr) return '—';
        const d = new Date(isoStr);
        return d.toLocaleString('en-US', {
            month: 'short', day: 'numeric', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    }

    // Create element helper
    function el(tag, attrs = {}, children = []) {
        const element = document.createElement(tag);
        for (const [key, val] of Object.entries(attrs)) {
            if (key === 'className') element.className = val;
            else if (key === 'innerHTML') element.innerHTML = val;
            else if (key === 'textContent') element.textContent = val;
            else if (key.startsWith('on')) element.addEventListener(key.slice(2).toLowerCase(), val);
            else element.setAttribute(key, val);
        }
        children.forEach(child => {
            if (typeof child === 'string') element.appendChild(document.createTextNode(child));
            else if (child) element.appendChild(child);
        });
        return element;
    }

    // Confirm dialog
    function confirm(message) {
        return window.confirm(message);
    }

    // Prompt for new technician name (skippable) — returns updated tech or null if skipped
    // Respects the 'promptNewTechName' DB setting — when off, silently skips
    async function promptNewTechName(badgeId) {
        const enabled = await DB.getSetting('promptNewTechName', true);
        if (!enabled) return null;
        return new Promise((resolve) => {
            showModal('New Technician: ' + badgeId, `
                <p style="margin-bottom:1rem; color:var(--text-secondary);">
                    Badge <strong>${badgeId}</strong> was just auto-registered. Add a name now, or skip to do it later.
                </p>
                <div class="form-row">
                    <div class="form-group">
                        <label for="ptn-first">First Name</label>
                        <input type="text" id="ptn-first" placeholder="First name" autocomplete="off">
                    </div>
                    <div class="form-group">
                        <label for="ptn-last">Last Name</label>
                        <input type="text" id="ptn-last" placeholder="Last name" autocomplete="off">
                    </div>
                </div>
                <div class="form-group">
                    <label for="ptn-dept">Department</label>
                    <input type="text" id="ptn-dept" placeholder="Optional" autocomplete="off">
                </div>
            `, `
                <button class="btn btn-outline" id="ptn-skip-btn">Skip</button>
                <button class="btn btn-primary" id="ptn-save-btn">Save Name</button>
            `);

            document.getElementById('ptn-first').focus();

            document.getElementById('ptn-skip-btn').addEventListener('click', () => {
                closeModal();
                resolve(null);
            });

            document.getElementById('ptn-save-btn').addEventListener('click', async () => {
                const firstName = document.getElementById('ptn-first').value.trim();
                const lastName = document.getElementById('ptn-last').value.trim();
                const dept = document.getElementById('ptn-dept').value.trim();
                if (!firstName && !lastName) {
                    closeModal();
                    resolve(null);
                    return;
                }
                const tech = await DB.get('technicians', badgeId);
                if (tech) {
                    tech.firstName = firstName;
                    tech.lastName = lastName;
                    tech.name = `${firstName} ${lastName}`.trim();
                    if (dept) tech.department = dept;
                    tech.updatedAt = new Date().toISOString();
                    await DB.put('technicians', tech);
                }
                closeModal();
                resolve(tech);
            });
        });
    }

    // Debounce
    function debounce(fn, ms = 300) {
        let timer;
        return (...args) => {
            clearTimeout(timer);
            timer = setTimeout(() => fn(...args), ms);
        };
    }

    return {
        registerPage,
        navigateTo,
        initNav,
        startClock,
        initClerk,
        getClerkName,
        toast,
        showModal,
        closeModal,
        initModal,
        statusBadge,
        formatDate,
        formatDateTime,
        el,
        confirm,
        promptNewTechName,
        debounce,
        get currentPage() { return currentPage; }
    };
})();
