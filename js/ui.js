/**
 * UI Framework - Navigation, Modals, Toasts, Utilities
 */
const UI = (() => {
    const pages = {};
    let currentPage = 'home';
    let tooltipObserver = null;

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

        const text = _normalizeTooltipText(button.textContent);
        if (text === '×' || text === '✕') return 'Close';
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
