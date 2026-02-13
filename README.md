# Radio & Asset Inventory Management System

A fully browser-based inventory and lifecycle management system for tracking Motorola radios, batteries, and tool assets. Designed for use in a clerk station environment where technicians check out and return radios at shift changes.

## Quick Start

### Option 1: Local Server (Recommended)
Double-click **`start.bat`** — this launches a PowerShell HTTP server on `http://localhost:8000` and opens the browser automatically. Required for:
- Camera scanning (QR/barcode via webcam)
- Network database sync (multi-computer access)
- Folder browse dialog for network path selection

### Option 2: Direct File
Open `index.html` directly in Chrome or Edge. USB barcode scanners work, but camera and network sync features are unavailable.

---

## Conventions & Rules

### Radio IDs Must Start With "WV"
All radio identifiers **must** begin with `WV` or `wv` (case-insensitive). This prefix is how the scanner distinguishes a radio scan from a technician badge scan.

- **Valid**: `WV-001`, `WV1234`, `wv-042`, `WVUNIT55`
- **Invalid**: `R-001`, `12345`, `RADIO1`

The scanner logic (`clerk-station.js` and `quick-scan.js`) uses `value.toLowerCase().startsWith('wv')` to detect radios. Anything that does not start with `wv` is treated as a technician badge ID.

### Technician Badge IDs
Badge IDs can be any format that does **not** start with `WV`. Common formats: `T0101`, `EMP12345`, numeric barcodes, etc. Technicians are auto-created on first scan and can be named later.

### Shift Schedule
Three tours per day — auto-backup runs at the end of each:
| Tour | Hours | Auto-Backup |
|------|-------|-------------|
| Tour 1 | 5:30 AM – 1:30 PM | 5:30 AM |
| Tour 2 | 1:30 PM – 9:30 PM | 1:30 PM |
| Tour 3 | 9:30 PM – 5:30 AM | 9:30 PM |

### Overdue Threshold
Default: **15 hours**. Configurable in Supervisor Dashboard → Settings. Radios checked out longer than this threshold appear as overdue (pulsing red on the fleet grid, listed in Supervisor tab).

---

## Features

### Radio Checkout/Return
- **Clerk Station**: Primary workflow — scan radio, scan badge, auto-detects checkout or return
- **Quick Scan**: Self-service mode with AUTO/IN/OUT toggle
- **Checkout page**: Manual form-based checkout
- **Return page**: Manual return with condition selection (Good / Damaged / Needs Repair)
- Prevents double-checkout (one radio per technician at a time)
- Damaged/repair returns auto-flag for supervisor and move radio to Maintenance

### Technician Management
- Auto-created when a new badge is scanned during checkout
- Optional name prompt on first scan (toggle in Settings)
- First name, last name, department fields
- Excel import with column mapping for bulk loading

### Asset Management
- Add/edit radios, batteries, and tools
- Status tracking: Available, Checked Out, Maintenance, Retired, Lost
- Full audit history — every action logged, no hard deletes
- Maintenance history tracked per radio (dates, reasons, who reported)

### Battery Lifecycle
- **New batteries**: Track from receipt → in-service → retirement
- **Legacy batteries**: Estimated age tracking for pre-existing stock
- Automatic lifespan calculations and service-day threshold alerts
- Configurable alert threshold (default: 365 days)

### Fleet Visualization (Home Page)
- Compact card grid showing all radios at a glance
- Color-coded by status: green=Available, yellow=Checked Out, red=Overdue, blue=Maintenance, gray=Retired
- Overdue radios pulse red with animation
- Hover tooltip shows radio details, technician name, checkout time
- Sorted: overdue first, then checked out, then available

### Barcode/QR Support
- QR Code and Code 128 barcode generation
- Single or batch label printing (Print Codes page)
- Webcam scanning via HTML5 Camera API (localhost only)
- USB handheld scanner support (keyboard emulation — works everywhere)

### Supervisor Dashboard
- **Stats overview**: Available, Checked Out, Maintenance, Overdue, Retired, Lost counts
- **Overdue radio table**: Radio ID, model, technician, checkout time, hours out
- **Maintenance queue**: Radios in maintenance with reason and action to mark available
- **High repair frequency**: Radios with 3+ repairs flagged for review
- **Currently checked out**: Full list with technician and time
- **Flagged returns**: Damaged/needs-repair returns from last 7 days
- **Recent audit log**: Last 20 system actions

### Email Notifications (Supervisor Tab)
- Add/remove email recipients with `+` button and `✕` remove
- Toggle switch per contact to enable/disable overdue alerts
- Editable message template saved persistently
- **Send Overdue Alert** button opens default email client (Outlook, etc.) via `mailto:` with:
  - All enabled recipients in the To field
  - Subject line with overdue count and threshold
  - Body with message template + detailed list of each overdue radio

### Network Database Sync (Supervisor Tab)
- **Dual save**: Data is stored locally in IndexedDB AND pushed to a shared network folder as JSON
- **On startup**: Loads from network first; falls back to local if network unavailable
- **Periodic push**: Configurable interval (5, 10, 15, 30, or 60 minutes)
- **Browse button**: Opens native Windows folder picker to select the network path
- **Manual controls**: Push Now, Pull from Network, Check Status
- Allows multiple computers to share the same database via a common network folder

### Auto-Backup
- Automatic Excel backups at shift-end times (configurable)
- Rolling backup list — keeps last N backups, deletes oldest
- Stored in IndexedDB, downloadable from Export page
- Manual "Backup Now" option available

### Data Export
- **Excel (.xlsx)**: Multi-sheet workbook (Radios, Batteries, Tools, Technicians, Transactions, Audit Log)
- **JSON backup**: Full database export/import for migration or recovery
- Date-stamped filenames

### Test Harness (🧪 Test tab)
- **Full Week Simulation**: Generates 40 radios (WV-001 to WV-040), 30 technicians with names, 7 days × 3 shifts of realistic checkout/return activity
- Creates overdue, damaged, lost, retired, and high-repair scenarios
- Sets up email contacts and message template for demo
- **60+ automated verification tests** covering:
  - Database layer (CRUD, settings, export/import)
  - Business logic (stats, checkout/return flow, double-checkout prevention)
  - Radio ID convention (WV prefix validation)
  - Scanner detection logic
  - Technician management (names, auto-create, badges)
  - Status changes and maintenance tracking
  - Email contacts and message template
  - Network sync module
  - Auto-backup module
  - Audit log integrity
  - Viewport and responsive layout
- **Report card** with pass/fail grade and per-category breakdown

---

## Technology Stack

| Component | Technology |
|-----------|-----------|
| Storage | IndexedDB (browser-native) |
| Local Server | PowerShell HttpListener (`server.ps1`) |
| Excel Export | SheetJS (xlsx) via CDN |
| QR Codes | qrcode.js via CDN |
| Barcodes | JsBarcode via CDN |
| Camera Scanning | Html5Qrcode via CDN |
| UI Framework | Vanilla HTML/CSS/JavaScript |
| Themes | 7 themes: Light, Dark, High Contrast, Midnight, Sepia, USPS Light, USPS Dark |

---

## File Structure

```
radio/
├── index.html              # Main entry point
├── start.bat               # Launch script (starts server + opens browser)
├── server.ps1              # PowerShell HTTP server with API endpoints
├── .gitignore
├── css/
│   └── styles.css          # All styles (responsive, themes, fleet grid)
├── js/
│   ├── db.js               # IndexedDB database layer
│   ├── models.js           # Data models & business logic
│   ├── scanner.js          # Barcode/QR scanning module
│   ├── ui.js               # UI framework (nav, modals, toasts, clock)
│   ├── auto-backup.js      # Scheduled Excel backup system
│   ├── network-sync.js     # Network folder sync module
│   ├── app.js              # Application initialization
│   └── pages/
│       ├── home.js             # Home dashboard with fleet grid
│       ├── checkout.js         # Manual radio checkout
│       ├── return.js           # Manual radio return
│       ├── clerk-station.js    # Primary clerk workflow (scan-to-action)
│       ├── quick-scan.js       # Self-service scan mode
│       ├── assets.js           # Asset CRUD management
│       ├── battery-dashboard.js # Battery lifecycle analytics
│       ├── supervisor.js       # Supervisor dashboard + email + sync UI
│       ├── print-codes.js      # QR/barcode label generation
│       ├── export.js           # Data export/import
│       └── test-harness.js     # Automated test suite + demo data generator
└── data/                       # Local database backups (git-ignored)
    └── db-backup.json
```

## Server API Endpoints

When running via `start.bat` (PowerShell server on port 8000):

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/sync` | Load database from network (fallback: local) |
| POST | `/api/sync` | Save database to local + network folder |
| GET | `/api/sync/status` | Check local and network backup file info |
| GET | `/api/browse-folder` | Open native Windows folder picker dialog |

---

## Future Migration

The codebase is structured for easy migration to a server-based system:
- `db.js` provides a clean async API that can be swapped for REST/GraphQL calls
- `models.js` contains pure business logic separate from storage
- Data models use clean, normalized structures compatible with SQL databases
- Network sync JSON format is directly importable
