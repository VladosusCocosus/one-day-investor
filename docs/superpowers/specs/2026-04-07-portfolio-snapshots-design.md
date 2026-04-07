# Portfolio Snapshots Design

## Overview

Track monthly portfolio snapshots across services (Revolut, Bybit, etc.) with 2-level hierarchy (e.g., Revolut → Invest, Crypto). Users manually create monthly snapshots with amounts per service, prefilled from the previous month for quick entry.

## Database Schema

### services

| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PK, default gen_random_uuid() |
| user_id | uuid | FK → users(id), NOT NULL |
| name | text | NOT NULL |
| parent_id | uuid | FK → services(id), nullable |
| sort_order | integer | NOT NULL, default 0 |
| created_at | timestamptz | NOT NULL, default now() |

- Top-level service: parent_id is NULL
- Sub-account: parent_id references another service
- Maximum 2 levels (enforced by application, not DB)
- Unique constraint on (user_id, name, parent_id) to prevent duplicates

### snapshots

| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PK, default gen_random_uuid() |
| user_id | uuid | FK → users(id), NOT NULL |
| month | date | NOT NULL (always first of month) |
| created_at | timestamptz | NOT NULL, default now() |

- Unique constraint on (user_id, month) — one snapshot per user per month

### snapshot_entries

| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PK, default gen_random_uuid() |
| snapshot_id | uuid | FK → snapshots(id) ON DELETE CASCADE, NOT NULL |
| service_id | uuid | FK → services(id), NOT NULL |
| amount | numeric(12,2) | NOT NULL, default 0 |

- Unique constraint on (snapshot_id, service_id) — one entry per service per snapshot

## API Endpoints

All endpoints require authentication (existing session middleware). All operate on the authenticated user's data only.

### Services

**GET /api/services**
Returns user's services as a flat list. Frontend builds tree from parent_id.
```json
[
  { "id": "...", "name": "Revolut", "parent_id": null, "sort_order": 0 },
  { "id": "...", "name": "Invest", "parent_id": "<revolut-id>", "sort_order": 0 },
  { "id": "...", "name": "Crypto", "parent_id": "<revolut-id>", "sort_order": 1 }
]
```

**POST /api/services**
Body: `{ "name": "Revolut", "parent_id": null | "<uuid>" }`
Returns created service.

**PUT /api/services/:id**
Body: `{ "name": "...", "parent_id": "..." | null, "sort_order": 0 }`
Returns updated service.

**DELETE /api/services/:id**
Deletes service and its snapshot_entries. If top-level, also deletes child services and their entries.

### Snapshots

**GET /api/snapshots**
Returns all user's snapshots ordered by month desc, with computed total.
```json
[
  { "id": "...", "month": "2026-04-01", "total": 10920, "created_at": "..." },
  { "id": "...", "month": "2026-03-01", "total": 11611, "created_at": "..." }
]
```
Total is computed as SUM(snapshot_entries.amount) for each snapshot.

**GET /api/snapshots/:id**
Returns snapshot with all entries.
```json
{
  "id": "...",
  "month": "2026-04-01",
  "entries": [
    { "id": "...", "service_id": "...", "amount": 215 },
    { "id": "...", "service_id": "...", "amount": 6699 }
  ]
}
```

**GET /api/snapshots/latest**
Returns the most recent snapshot with entries (same format as GET /:id). Used for prefilling the "new snapshot" form. Returns 404 if no snapshots exist.

**POST /api/snapshots**
Body:
```json
{
  "month": "2026-04-01",
  "entries": [
    { "service_id": "...", "amount": 215 },
    { "service_id": "...", "amount": 6699 }
  ]
}
```
Creates snapshot + entries in a transaction. Returns 409 if snapshot already exists for that month.

**PUT /api/snapshots/:id**
Body: same as POST (replaces all entries).
Deletes existing entries and creates new ones in a transaction.

## Frontend

### Dashboard (`/dashboard`)

Replace placeholder stat cards and content area with:

- **Header stat cards row**: Total (latest month), Change from previous month (absolute + percentage), Number of months tracked
- **Table**: Columns — Month (formatted like "Apr 2026"), Total (formatted as currency), Change (vs previous month, with green/red coloring). Ordered newest first. Data from `GET /api/snapshots`.

### Assets (`/assets`)

Single month view with navigation:

- **Header**: Month name (e.g., "April 2026") with prev/next arrow buttons. "Add Snapshot" or "Edit" button.
- **Total banner**: Total amount for the month, change vs previous month.
- **Grouped cards**: Each top-level service is a Card. Inside the card:
  - Service name as card title
  - If service has sub-accounts: list each sub-account with name and amount
  - If standalone service (no children): just show the amount
  - Card shows subtotal if it has children
- **Empty state**: If no snapshot exists for the displayed month, show "No snapshot for this month" with "Create Snapshot" button.

### Snapshot Form (modal or inline)

- Triggered by "Add Snapshot" or "Edit" button on Assets page
- Month picker (defaults to current month for new, locked for edit)
- For each service: input field with amount, prefilled from previous month's snapshot
- Grouped by top-level service (matching the card layout)
- Save button creates/updates snapshot via API
- Cancel returns to view mode

### Services Management

- Accessible from Assets page (gear icon or "Manage Services" link)
- Simple list with add/edit/delete
- When adding: name field + optional parent dropdown (only top-level services shown)
- Inline editing for name changes
- Delete with confirmation (warns about data loss)

## Data Flow

1. User first sets up their services (Revolut, Bybit, etc. with sub-accounts)
2. Each month, user creates a snapshot:
   - Opens "Add Snapshot" on Assets page
   - Form prefills amounts from previous month via `GET /api/snapshots/latest`
   - User adjusts numbers and saves
3. Dashboard automatically shows updated totals table
4. Assets page shows the latest month's breakdown in grouped cards
