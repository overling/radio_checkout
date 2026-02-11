/**
 * UI Framework - Navigation, Modals, Toasts, Utilities
 */
const UI = (() => {
    const pages = {};
    let currentPage = 'home';

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
            pages[pageName](content);
        }
    }

    function initNav() {
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', () => navigateTo(btn.dataset.page));
        });
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
        debounce,
        get currentPage() { return currentPage; }
    };
})();
