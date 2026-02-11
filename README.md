# Radio & Asset Inventory Management System

A fully browser-based inventory and lifecycle management system for tracking Motorola radios, batteries, and tool assets.

## Quick Start

1. Open `index.html` in Chrome or Edge
2. Enter your clerk name when prompted
3. Start managing assets!

**No server required** — works by opening the HTML file directly, or from a network drive. For best results with all features (camera scanning, CDN libraries), serve via a local HTTP server:

```
python -m http.server 8080
```

Then open `http://localhost:8080` in your browser.

## Features

### Radio Checkout/Return
- **Morning Checkout**: Scan radio barcode/QR → Scan technician badge → Confirm
- **End of Day Return**: Scan radio → Select condition (Good/Damaged/Needs Repair) → Confirm
- Prevents double-checkout (one radio per technician)
- Damaged/repair returns flagged for supervisor

### Asset Management
- Add/edit radios, batteries, and tools
- Status tracking: Available, Checked Out, Maintenance, Retired, Lost
- Full audit history (no hard deletes)

### Battery Lifecycle
- **New batteries**: Track from receipt through in-service to retirement
- **Legacy batteries**: Track from system entry with estimated age
- Automatic lifespan calculations
- Configurable service-day threshold alerts

### Barcode/QR Support
- QR Code generation (default)
- Code 128 barcode generation
- Single or batch label printing
- Webcam scanning (HTML5 Camera API)
- USB handheld scanner support (keyboard emulation)

### Dashboards
- **Home**: Quick stats and recent activity
- **Battery Dashboard**: Lifespan analytics, threshold alerts
- **Supervisor Dashboard**: Overdue radios, maintenance queue, flagged returns, audit log

### Data Export
- **Excel (.xlsx)**: Multi-sheet workbook with date in filename (`inventory_backup_YYYY-MM-DD.xlsx`)
- **JSON backup**: Full database export/import
- Manual save to network location

## Technology Stack

- **Storage**: IndexedDB (browser-native)
- **Excel Export**: SheetJS (xlsx)
- **QR Codes**: qrcode.js
- **Barcodes**: JsBarcode
- **Camera Scanning**: ZXing (optional)
- **UI**: Vanilla HTML/CSS/JavaScript

## Data Scale

- Supports up to 500 assets
- Handles hundreds of transactions efficiently
- Fast filtering and search

## File Structure

```
radio/
├── index.html          # Main entry point
├── css/
│   └── styles.css      # All styles
├── js/
│   ├── db.js           # IndexedDB database layer
│   ├── models.js       # Data models & business logic
│   ├── scanner.js      # Barcode/QR scanning module
│   ├── ui.js           # UI framework (nav, modals, toasts)
│   ├── app.js          # Application initialization
│   └── pages/
│       ├── home.js             # Dashboard home page
│       ├── checkout.js         # Radio checkout workflow
│       ├── return.js           # Radio return workflow
│       ├── assets.js           # Asset management (CRUD)
│       ├── battery-dashboard.js # Battery lifecycle analytics
│       ├── supervisor.js       # Supervisor dashboard
│       ├── print-codes.js      # Label generation & printing
│       └── export.js           # Data export/import
└── README.md
```

## Future Migration

The codebase is structured for easy migration to a server-based system:
- `db.js` provides a clean async API that can be swapped for REST/GraphQL calls
- `models.js` contains pure business logic separate from storage
- Data models use clean, normalized structures compatible with SQL databases
