# ▶️ SmartHostel BTP — How To Run

## Run in 4 commands

```bash
# 1. Go into the project folder
cd smarthostel-run

# 2. Install all dependencies
npm install

# 3. Install node-cron (background job scheduler)
npm install node-cron

# 4. Start the CAP server
cds watch
```

## You will see this in terminal:

```
[cds] - model loaded from 1 file(s): db/schema.cds
[cds] - connect to db > sqlite { url: 'db/hostel.db' }
[cds] - seeding DB from 7 CSV files in ./db/data
[cds] - serving HostelService { path: '/odata/v4/HostelService' }
[cds] - server listening on { url: 'http://localhost:4004' }
{"level":"INFO","module":"Scheduler","message":"✓ All jobs running"}
```

## Open the app

- **Full Fiori UI:**     http://localhost:4004/webapp/index.html
- **OData Explorer:**   http://localhost:4004
- **Students JSON:**    http://localhost:4004/odata/v4/HostelService/Students
- **Rooms JSON:**       http://localhost:4004/odata/v4/HostelService/Rooms
- **OData Metadata:**  http://localhost:4004/odata/v4/HostelService/$metadata

## Test Custom Actions (curl)

```bash
# Smart room allocation
curl -X POST http://localhost:4004/odata/v4/HostelService/allocateRoom \
  -H "Content-Type: application/json" \
  -d '{"studentID":"S-1001","roomType":"NonAC_Double","floorPref":1}'

# Auto-classify complaint
curl -X POST http://localhost:4004/odata/v4/HostelService/classifyComplaintPriority \
  -H "Content-Type: application/json" \
  -d '{"category":"Electricity"}'

# Dashboard KPIs
curl http://localhost:4004/odata/v4/HostelService/getDashboardKPIs()

# Generate invoices
curl -X POST http://localhost:4004/odata/v4/HostelService/generateMonthlyInvoices \
  -H "Content-Type: application/json" \
  -d '{"month":4,"year":2025}'
```

## Project structure

```
smarthostel-run/
├── package.json            ← npm config + cds config
├── HOWTORUN.md             ← this file
│
├── config/
│   └── index.js            ← all constants (SLA hours, scores, late fees)
│
├── db/
│   ├── schema.cds          ← CDS data model (8 entities)
│   └── data/               ← CSV seed files (auto-loaded)
│       ├── smarthostel-Students.csv      (10 students)
│       ├── smarthostel-Rooms.csv         (15 rooms)
│       ├── smarthostel-Payments.csv      (10 payments)
│       ├── smarthostel-Complaints.csv    (7 complaints)
│       ├── smarthostel-Vendors.csv       (5 vendors)
│       ├── smarthostel-PurchaseOrders.csv (4 POs)
│       └── smarthostel-Visitors.csv      (4 entries)
│
├── srv/
│   ├── hostel-service.cds  ← OData V4 service + actions + functions
│   ├── hostel-service.js   ← main entry: wires handlers + actions + scheduler
│   │
│   ├── handlers/           ← thin CAP event handlers
│   │   ├── studentHandler.js      (BEFORE/AFTER hooks, H2R)
│   │   ├── paymentHandler.js      (invoice auto-gen, O2C)
│   │   ├── complaintHandler.js    (SLA auto-classify)
│   │   └── procurementHandler.js  (PO auto-number, 3WM)
│   │
│   ├── services/           ← all business logic (pure JS)
│   │   ├── roomService.js         (scoring engine, occupancy)
│   │   ├── paymentService.js      (late fee, receipt, invoice builder)
│   │   └── analyticsService.js    (KPIs, trend, R2R report)
│   │
│   ├── utils/              ← shared tools
│   │   ├── logger.js              (SAP BTP structured JSON logger)
│   │   ├── errorHandler.js        (wrap(), assert(), custom errors)
│   │   └── slaEngine.js           (SLA calc, breach detect, escalation)
│   │
│   └── jobs/               ← background automation
│       ├── scheduler.js           (node-cron master scheduler)
│       ├── slaJob.js              (every 10min: breach scan + escalation)
│       └── invoiceJob.js          (1st of month: bulk invoice generation)
│
└── app/webapp/
    └── index.html          ← Complete Fiori UI (connected + demo fallback)
```
