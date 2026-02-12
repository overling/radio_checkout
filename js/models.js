/**
 * Data Models and Business Logic
 * Clean data structures that can migrate to any backend.
 */
const Models = (() => {

    function generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
    }

    function now() {
        return new Date().toISOString();
    }

    // ===== RADIO =====
    function createRadio({ uniqueId, serialNumber, model, inServiceDate, notes = '' }) {
        return {
            id: uniqueId || generateId(),
            serialNumber: serialNumber || '',
            model: model || '',
            assetType: 'radio',
            inServiceDate: inServiceDate || now(),
            outOfServiceDate: null,
            status: 'Available', // Available, Checked Out, Maintenance, Retired, Lost
            checkoutCount: 0,
            repairCount: 0,
            maintenanceHistory: [],
            notes: notes,
            createdAt: now(),
            updatedAt: now()
        };
    }

    // ===== BATTERY =====
    function createBattery({ uniqueId, model, type, dateReceived, inServiceDate, estimatedAge, notes = '' }) {
        const isLegacy = type === 'legacy';
        return {
            id: uniqueId || generateId(),
            model: model || '',
            assetType: 'battery',
            type: isLegacy ? 'legacy' : 'new', // legacy or new
            dateReceived: isLegacy ? null : (dateReceived || now()),
            inServiceDate: isLegacy ? null : (inServiceDate || null),
            estimatedAge: isLegacy ? (estimatedAge || null) : null, // <6mo, 6-12mo, 1-2yr, 2+yr
            entryDate: now(), // when entered into system
            retirementDate: null,
            retirementReason: null,
            status: isLegacy ? 'In Service' : 'In Inventory', // In Inventory, In Service, Retired, Failed
            notes: notes,
            createdAt: now(),
            updatedAt: now()
        };
    }

    // ===== TOOL =====
    function createTool({ uniqueId, name, serialNumber, model, category, notes = '' }) {
        return {
            id: uniqueId || generateId(),
            name: name || '',
            serialNumber: serialNumber || '',
            model: model || '',
            category: category || '',
            assetType: 'tool',
            inServiceDate: now(),
            outOfServiceDate: null,
            status: 'Available',
            notes: notes,
            createdAt: now(),
            updatedAt: now()
        };
    }

    // ===== TECHNICIAN =====
    function createTechnician({ badgeId, firstName = '', lastName = '', name, department = '' }) {
        const fullName = (firstName || lastName)
            ? `${firstName} ${lastName}`.trim()
            : (name || '');
        return {
            id: badgeId || generateId(),
            badgeId: badgeId || '',
            firstName: firstName || '',
            lastName: lastName || '',
            name: fullName,
            department: department,
            createdAt: now(),
            updatedAt: now()
        };
    }

    // ===== TRANSACTION =====
    function createTransaction({ assetId, assetType, technicianId, technicianName, type, condition, clerkName, notes = '' }) {
        return {
            id: generateId(),
            assetId: assetId,
            assetType: assetType || 'radio',
            technicianId: technicianId || null,
            technicianName: technicianName || '',
            type: type, // checkout, return
            condition: condition || null, // Good, Damaged, Needs Repair
            clerkName: clerkName || '',
            notes: notes,
            timestamp: now()
        };
    }

    // ===== AUDIT LOG =====
    function createAuditEntry({ entityId, entityType, action, details, performedBy }) {
        return {
            id: generateId(),
            entityId: entityId,
            entityType: entityType, // radio, battery, tool, technician
            action: action, // created, updated, status_change, checkout, return, retired, etc.
            details: details || '',
            performedBy: performedBy || '',
            timestamp: now()
        };
    }

    // ===== BUSINESS LOGIC =====

    async function checkoutRadio(radioId, technicianBadgeId, clerkName) {
        // Get the radio
        const radio = await DB.get('radios', radioId);
        if (!radio) {
            throw new Error(`Radio "${radioId}" not found. Please add it first.`);
        }
        if (radio.status !== 'Available') {
            throw new Error(`Radio "${radioId}" is not available. Current status: ${radio.status}`);
        }

        // Get or create technician
        let technician = await DB.get('technicians', technicianBadgeId);
        let techIsNew = false;
        if (!technician) {
            // Auto-create technician with badge ID as name placeholder
            technician = createTechnician({ badgeId: technicianBadgeId, name: technicianBadgeId });
            await DB.put('technicians', technician);
            await DB.put('auditLog', createAuditEntry({
                entityId: technician.id,
                entityType: 'technician',
                action: 'created',
                details: `Auto-created from badge scan: ${technicianBadgeId}`,
                performedBy: clerkName
            }));
            techIsNew = true;
        }

        // Check if technician already has a radio checked out
        const allTransactions = await DB.getAll('transactions');
        const activeCheckouts = allTransactions.filter(t =>
            t.technicianId === technicianBadgeId &&
            t.type === 'checkout' &&
            t.assetType === 'radio'
        );
        // Check if any of those checkouts don't have a corresponding return
        for (const checkout of activeCheckouts) {
            const hasReturn = allTransactions.some(t =>
                t.assetId === checkout.assetId &&
                t.type === 'return' &&
                new Date(t.timestamp) > new Date(checkout.timestamp)
            );
            if (!hasReturn) {
                throw new Error(`Technician "${technician.name || technicianBadgeId}" already has radio "${checkout.assetId}" checked out. Return it first.`);
            }
        }

        // Perform checkout
        radio.status = 'Checked Out';
        radio.checkoutCount = (radio.checkoutCount || 0) + 1;
        radio.updatedAt = now();
        await DB.put('radios', radio);

        // Log transaction
        const transaction = createTransaction({
            assetId: radioId,
            assetType: 'radio',
            technicianId: technicianBadgeId,
            technicianName: technician.name,
            type: 'checkout',
            clerkName: clerkName
        });
        await DB.put('transactions', transaction);

        // Audit log
        await DB.put('auditLog', createAuditEntry({
            entityId: radioId,
            entityType: 'radio',
            action: 'checkout',
            details: `Checked out to ${technician.name || technicianBadgeId} by ${clerkName}`,
            performedBy: clerkName
        }));

        return { radio, technician, transaction, techIsNew };
    }

    async function returnRadio(radioId, condition, clerkName, notes = '') {
        const radio = await DB.get('radios', radioId);
        if (!radio) {
            throw new Error(`Radio "${radioId}" not found.`);
        }
        if (radio.status !== 'Checked Out') {
            throw new Error(`Radio "${radioId}" is not checked out. Current status: ${radio.status}`);
        }

        // Find the active checkout transaction
        const allTransactions = await DB.getAll('transactions');
        const activeCheckout = allTransactions
            .filter(t => t.assetId === radioId && t.type === 'checkout')
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];

        const techId = activeCheckout ? activeCheckout.technicianId : null;
        const techName = activeCheckout ? activeCheckout.technicianName : '';

        // Update radio status based on condition
        if (condition === 'Good') {
            radio.status = 'Available';
        } else if (condition === 'Damaged' || condition === 'Needs Repair') {
            radio.status = 'Maintenance';
            radio.repairCount = (radio.repairCount || 0) + 1;
            radio.maintenanceHistory.push({
                date: now(),
                reason: condition,
                notes: notes,
                reportedBy: techName || techId
            });
        }
        radio.updatedAt = now();
        await DB.put('radios', radio);

        // Log return transaction
        const transaction = createTransaction({
            assetId: radioId,
            assetType: 'radio',
            technicianId: techId,
            technicianName: techName,
            type: 'return',
            condition: condition,
            clerkName: clerkName,
            notes: notes
        });
        await DB.put('transactions', transaction);

        // Audit log
        await DB.put('auditLog', createAuditEntry({
            entityId: radioId,
            entityType: 'radio',
            action: 'return',
            details: `Returned by ${techName || techId}. Condition: ${condition}. ${notes}`.trim(),
            performedBy: clerkName
        }));

        return { radio, transaction, flagForSupervisor: condition !== 'Good' };
    }

    async function changeAssetStatus(assetType, assetId, newStatus, reason, performedBy) {
        const storeName = assetType === 'radio' ? 'radios' : assetType === 'battery' ? 'batteries' : 'tools';
        const asset = await DB.get(storeName, assetId);
        if (!asset) throw new Error(`${assetType} "${assetId}" not found.`);

        const oldStatus = asset.status;
        asset.status = newStatus;
        asset.updatedAt = now();

        if (newStatus === 'Retired') {
            if (assetType === 'radio') {
                asset.outOfServiceDate = now();
            } else if (assetType === 'battery') {
                asset.retirementDate = now();
                asset.retirementReason = reason || '';
            }
        }

        if (assetType === 'radio' && (newStatus === 'Maintenance')) {
            asset.maintenanceHistory = asset.maintenanceHistory || [];
            asset.maintenanceHistory.push({
                date: now(),
                reason: reason || 'Manual status change',
                notes: '',
                reportedBy: performedBy
            });
        }

        await DB.put(storeName, asset);

        await DB.put('auditLog', createAuditEntry({
            entityId: assetId,
            entityType: assetType,
            action: 'status_change',
            details: `Status changed from ${oldStatus} to ${newStatus}. Reason: ${reason || 'N/A'}`,
            performedBy: performedBy
        }));

        return asset;
    }

    // Battery lifespan calculations
    function getBatteryDaysInService(battery) {
        if (!battery.inServiceDate) {
            // Legacy: calculate from entry date
            const start = new Date(battery.entryDate);
            const end = battery.retirementDate ? new Date(battery.retirementDate) : new Date();
            return Math.floor((end - start) / (1000 * 60 * 60 * 24));
        }
        const start = new Date(battery.inServiceDate);
        const end = battery.retirementDate ? new Date(battery.retirementDate) : new Date();
        return Math.floor((end - start) / (1000 * 60 * 60 * 24));
    }

    function getBatteryLifespan(battery) {
        if (!battery.retirementDate) return null;
        if (battery.type === 'legacy') {
            // Tracked lifespan from entry to retirement
            const start = new Date(battery.entryDate);
            const end = new Date(battery.retirementDate);
            return Math.floor((end - start) / (1000 * 60 * 60 * 24));
        }
        if (!battery.inServiceDate) return null;
        const start = new Date(battery.inServiceDate);
        const end = new Date(battery.retirementDate);
        return Math.floor((end - start) / (1000 * 60 * 60 * 24));
    }

    async function getBatteryStats() {
        const batteries = await DB.getAll('batteries');
        const retired = batteries.filter(b => b.status === 'Retired' || b.status === 'Failed');
        const lifespans = retired.map(b => getBatteryLifespan(b)).filter(l => l !== null && l > 0);

        const threshold = await DB.getSetting('batteryServiceDayThreshold', 365);

        const inService = batteries.filter(b => b.status === 'In Service');
        const overThreshold = inService.filter(b => getBatteryDaysInService(b) > threshold);
        const nearingEnd = inService.filter(b => getBatteryDaysInService(b) > threshold * 0.85);

        return {
            total: batteries.length,
            inInventory: batteries.filter(b => b.status === 'In Inventory').length,
            inService: inService.length,
            retired: retired.length,
            avgLifespan: lifespans.length ? Math.round(lifespans.reduce((a, b) => a + b, 0) / lifespans.length) : 0,
            shortestLifespan: lifespans.length ? Math.min(...lifespans) : 0,
            longestLifespan: lifespans.length ? Math.max(...lifespans) : 0,
            overThreshold: overThreshold.length,
            nearingEnd: nearingEnd.length,
            threshold: threshold,
            overThresholdList: overThreshold,
            nearingEndList: nearingEnd
        };
    }

    async function getRadioStats() {
        const radios = await DB.getAll('radios');
        const transactions = await DB.getAll('transactions');
        const overdueHours = await DB.getSetting('overdueHoursThreshold', 15);

        // Find currently checked out radios with their checkout time
        const checkedOut = radios.filter(r => r.status === 'Checked Out');
        const overdueRadios = [];

        for (const radio of checkedOut) {
            const lastCheckout = transactions
                .filter(t => t.assetId === radio.id && t.type === 'checkout')
                .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];
            if (lastCheckout) {
                const hoursOut = (Date.now() - new Date(lastCheckout.timestamp).getTime()) / (1000 * 60 * 60);
                if (hoursOut > overdueHours) {
                    overdueRadios.push({
                        ...radio,
                        checkedOutTo: lastCheckout.technicianName || lastCheckout.technicianId,
                        checkoutTime: lastCheckout.timestamp,
                        hoursOut: Math.round(hoursOut * 10) / 10
                    });
                }
            }
        }

        // High repair frequency (3+ repairs)
        const highRepair = radios.filter(r => (r.repairCount || 0) >= 3);

        return {
            total: radios.length,
            available: radios.filter(r => r.status === 'Available').length,
            checkedOut: checkedOut.length,
            maintenance: radios.filter(r => r.status === 'Maintenance').length,
            retired: radios.filter(r => r.status === 'Retired').length,
            lost: radios.filter(r => r.status === 'Lost').length,
            overdue: overdueRadios.length,
            overdueList: overdueRadios,
            highRepair: highRepair.length,
            highRepairList: highRepair,
            overdueHours: overdueHours
        };
    }

    // Get checkout info for a checked-out radio
    async function getRadioCheckoutInfo(radioId) {
        const transactions = await DB.getAll('transactions');
        const lastCheckout = transactions
            .filter(t => t.assetId === radioId && t.type === 'checkout')
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];
        return lastCheckout || null;
    }

    return {
        generateId,
        now,
        createRadio,
        createBattery,
        createTool,
        createTechnician,
        createTransaction,
        createAuditEntry,
        checkoutRadio,
        returnRadio,
        changeAssetStatus,
        getBatteryDaysInService,
        getBatteryLifespan,
        getBatteryStats,
        getRadioStats,
        getRadioCheckoutInfo
    };
})();
