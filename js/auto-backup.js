/**
 * Auto-Backup System
 * Runs scheduled Excel backups at shift-end times and stores them in IndexedDB.
 * Rolling backup list — keeps the last N backups, deletes oldest automatically.
 *
 * Default schedule (end of each shift):
 *   Tour 1: 5:30 AM
 *   Tour 2: 1:30 AM
 *   Tour 3: 9:30 PM
 */
const AutoBackup = (() => {
    let timerInterval = null;

    // Default settings
    const DEFAULTS = {
        enabled: true,
        maxBackups: 3,
        // HH:MM in 24h format
        times: ['05:30', '01:30', '21:30']
    };

    // Check every 60 seconds if a backup is due
    const CHECK_INTERVAL_MS = 60 * 1000;

    async function getSettings() {
        const saved = await DB.getSetting('autoBackup', null);
        if (!saved) return { ...DEFAULTS };
        return {
            enabled: saved.enabled !== undefined ? saved.enabled : DEFAULTS.enabled,
            maxBackups: saved.maxBackups || DEFAULTS.maxBackups,
            times: saved.times && saved.times.length > 0 ? saved.times : DEFAULTS.times
        };
    }

    async function saveSettings(settings) {
        await DB.setSetting('autoBackup', settings);
    }

    // Get the last backup timestamp from settings
    async function getLastBackupTimes() {
        return await DB.getSetting('autoBackupLastRun', {});
    }

    async function setLastBackupTime(timeSlot) {
        const lastRuns = await getLastBackupTimes();
        lastRuns[timeSlot] = new Date().toISOString();
        await DB.setSetting('autoBackupLastRun', lastRuns);
    }

    // Check if a scheduled time has passed today and hasn't been backed up yet
    function isBackupDue(timeStr, lastRuns) {
        const now = new Date();
        const [hours, minutes] = timeStr.split(':').map(Number);

        // Build today's scheduled time
        const scheduled = new Date(now);
        scheduled.setHours(hours, minutes, 0, 0);

        // The backup window: scheduled time to scheduled time + 10 minutes
        const windowEnd = new Date(scheduled.getTime() + 10 * 60 * 1000);

        if (now < scheduled || now > windowEnd) return false;

        // Check if already ran today for this time slot
        const lastRun = lastRuns[timeStr];
        if (lastRun) {
            const lastDate = new Date(lastRun);
            // Same day check
            if (lastDate.toDateString() === now.toDateString()) {
                return false; // Already ran today
            }
        }

        return true;
    }

    // Generate Excel backup data as a Blob
    async function generateExcelBlob() {
        if (typeof XLSX === 'undefined') return null;

        const data = await DB.exportAll();
        const wb = XLSX.utils.book_new();

        // Radios
        if (data.radios && data.radios.length > 0) {
            const rows = data.radios.map(r => ({
                'ID': r.id,
                'Serial Number': r.serialNumber || '',
                'Model': r.model || '',
                'Status': r.status,
                'In Service Date': r.inServiceDate ? new Date(r.inServiceDate).toLocaleDateString() : '',
                'Out of Service Date': r.outOfServiceDate ? new Date(r.outOfServiceDate).toLocaleDateString() : '',
                'Checkout Count': r.checkoutCount || 0,
                'Repair Count': r.repairCount || 0,
                'Notes': r.notes || '',
                'Created': r.createdAt ? new Date(r.createdAt).toLocaleString() : '',
                'Updated': r.updatedAt ? new Date(r.updatedAt).toLocaleString() : ''
            }));
            const ws = XLSX.utils.json_to_sheet(rows);
            ws['!cols'] = Array(11).fill({ wch: 18 });
            XLSX.utils.book_append_sheet(wb, ws, 'Radios');
        }

        // Batteries
        if (data.batteries && data.batteries.length > 0) {
            const rows = data.batteries.map(b => ({
                'ID': b.id,
                'Model': b.model || '',
                'Type': b.type || '',
                'Status': b.status,
                'Date Received': b.dateReceived ? new Date(b.dateReceived).toLocaleDateString() : '',
                'In Service Date': b.inServiceDate ? new Date(b.inServiceDate).toLocaleDateString() : '',
                'Entry Date': b.entryDate ? new Date(b.entryDate).toLocaleDateString() : '',
                'Retirement Date': b.retirementDate ? new Date(b.retirementDate).toLocaleDateString() : '',
                'Retirement Reason': b.retirementReason || '',
                'Estimated Age': b.estimatedAge || '',
                'Notes': b.notes || ''
            }));
            const ws = XLSX.utils.json_to_sheet(rows);
            ws['!cols'] = Array(11).fill({ wch: 18 });
            XLSX.utils.book_append_sheet(wb, ws, 'Batteries');
        }

        // Tools
        if (data.tools && data.tools.length > 0) {
            const rows = data.tools.map(t => ({
                'ID': t.id,
                'Name': t.name || '',
                'Serial Number': t.serialNumber || '',
                'Model': t.model || '',
                'Category': t.category || '',
                'Status': t.status,
                'Notes': t.notes || ''
            }));
            const ws = XLSX.utils.json_to_sheet(rows);
            ws['!cols'] = Array(7).fill({ wch: 18 });
            XLSX.utils.book_append_sheet(wb, ws, 'Tools');
        }

        // Technicians
        if (data.technicians && data.technicians.length > 0) {
            const rows = data.technicians.map(t => ({
                'Badge ID': t.badgeId,
                'Name': t.name || '',
                'Department': t.department || '',
                'Created': t.createdAt ? new Date(t.createdAt).toLocaleString() : ''
            }));
            const ws = XLSX.utils.json_to_sheet(rows);
            ws['!cols'] = Array(4).fill({ wch: 20 });
            XLSX.utils.book_append_sheet(wb, ws, 'Technicians');
        }

        // Transactions
        if (data.transactions && data.transactions.length > 0) {
            const rows = data.transactions
                .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
                .map(t => ({
                    'Timestamp': t.timestamp ? new Date(t.timestamp).toLocaleString() : '',
                    'Type': t.type,
                    'Asset ID': t.assetId,
                    'Asset Type': t.assetType || '',
                    'Technician ID': t.technicianId || '',
                    'Technician Name': t.technicianName || '',
                    'Condition': t.condition || '',
                    'Clerk': t.clerkName || '',
                    'Notes': t.notes || ''
                }));
            const ws = XLSX.utils.json_to_sheet(rows);
            ws['!cols'] = Array(9).fill({ wch: 20 });
            XLSX.utils.book_append_sheet(wb, ws, 'Transactions');
        }

        // Audit Log
        if (data.auditLog && data.auditLog.length > 0) {
            const rows = data.auditLog
                .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
                .map(l => ({
                    'Timestamp': l.timestamp ? new Date(l.timestamp).toLocaleString() : '',
                    'Entity Type': l.entityType || '',
                    'Entity ID': l.entityId || '',
                    'Action': l.action || '',
                    'Details': l.details || '',
                    'Performed By': l.performedBy || ''
                }));
            const ws = XLSX.utils.json_to_sheet(rows);
            ws['!cols'] = Array(6).fill({ wch: 22 });
            XLSX.utils.book_append_sheet(wb, ws, 'Audit Log');
        }

        const wbOut = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
        return new Uint8Array(wbOut);
    }

    // Store backup in IndexedDB
    async function storeBackup(timeSlot) {
        const settings = await getSettings();
        const excelData = await generateExcelBlob();
        if (!excelData) return;

        const now = new Date();
        const label = `${now.toLocaleDateString()} ${now.toLocaleTimeString()} — Shift end ${timeSlot}`;
        const filename = `auto_backup_${now.toISOString().replace(/[:.]/g, '-').slice(0, 19)}.xlsx`;

        const backup = {
            id: Models.generateId(),
            timestamp: now.toISOString(),
            timeSlot: timeSlot,
            label: label,
            filename: filename,
            data: Array.from(excelData), // Store as regular array for IndexedDB
            size: excelData.byteLength
        };

        await DB.put('backups', backup);
        await setLastBackupTime(timeSlot);

        // Enforce rolling limit
        await pruneBackups(settings.maxBackups);

        console.log(`Auto-backup saved: ${label} (${(excelData.byteLength / 1024).toFixed(1)} KB)`);
        return backup;
    }

    // Remove oldest backups beyond the max count
    async function pruneBackups(maxCount) {
        const all = await DB.getAll('backups');
        if (all.length <= maxCount) return;

        // Sort oldest first
        all.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        const toDelete = all.slice(0, all.length - maxCount);
        for (const old of toDelete) {
            await DB.remove('backups', old.id);
        }
    }

    // Get all stored backups (newest first)
    async function getBackups() {
        const all = await DB.getAll('backups');
        return all.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    }

    // Download a stored backup as an Excel file
    function downloadBackup(backup) {
        const bytes = new Uint8Array(backup.data);
        const blob = new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = backup.filename;
        a.click();
        URL.revokeObjectURL(url);
    }

    // The main check loop
    async function checkSchedule() {
        try {
            const settings = await getSettings();
            if (!settings.enabled) return;

            const lastRuns = await getLastBackupTimes();

            for (const timeStr of settings.times) {
                if (isBackupDue(timeStr, lastRuns)) {
                    const backup = await storeBackup(timeStr);
                    if (backup && typeof UI !== 'undefined' && UI.toast) {
                        UI.toast(`Auto-backup saved (${timeStr} shift end)`, 'success');
                    }
                }
            }
        } catch (e) {
            console.error('Auto-backup check error:', e);
        }
    }

    // Start the background timer
    function start() {
        if (timerInterval) return;
        // Run first check after 5 seconds (let app initialize)
        setTimeout(checkSchedule, 5000);
        timerInterval = setInterval(checkSchedule, CHECK_INTERVAL_MS);
        console.log('Auto-backup scheduler started');
    }

    function stop() {
        if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
        }
    }

    // Run a manual backup now
    async function runNow() {
        const now = new Date();
        const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        return await storeBackup(timeStr);
    }

    return {
        start,
        stop,
        getSettings,
        saveSettings,
        getBackups,
        downloadBackup,
        runNow,
        pruneBackups,
        DEFAULTS
    };
})();
