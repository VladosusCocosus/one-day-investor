# Revolut PDF Parser — Design

## Context

One Day Investor needs to import Revolut data from user-supplied PDFs to cover balances the live Revolut X adapter (`packages/exchange/src/adapters/revolut-x.ts`) can't — specifically **savings** (Flexible Cash Funds, money-market fund) and **investments** (Revolut Securities Europe UAB stocks/ETFs across USD + EUR accounts). Revolut exposes no API for either, but both issue structured, machine-generated PDF statements.

Two distinct user flows, sharing one parser library:

- **Flow A — Savings at snapshot time:** When the user creates a monthly snapshot, and the `Revolut > Savings` catalog service is on their dashboard, they can attach a *Flexible Cash Funds* PDF. Parser extracts the closing balance; it pre-fills the amount field on that snapshot entry. The PDF is the evidence and its closing balance matters.

- **Flow B — Investments as an integration:** On the Assets page, user adds `Revolut > Invest` like any other integration but uploads a PDF instead of an API key. Parser extracts the **list of holdings (symbol, ISIN, quantity per currency section)** — **nothing monetary**. Prices/values come from `enrichAssetsWithPrices` (live market data). The PDF curates *which* assets the user holds and *how many*; it does **not** dictate their value.

**Extensibility is a first-class requirement.** More brokers will follow (Interactive Brokers, Trading 212, etc.) with the same PDF-upload pattern. The design generalizes at the orchestration layer so future brokers plug in without schema or endpoint changes.

Samples reviewed (committed to repo root): `FEADBCA3-1401-4ECA-9DDD-0D74D40D18F9.pdf` (Revolut Securities, en-US, USD+EUR), `savings_statement_2026_04_01_2026_04_21_es_es_1801935896_7749c3.pdf` (Flexible Cash Funds, es-ES locale with `2.929,05` format and `abr` month token). Both are text-layer — deterministic parsing is viable.

---

## Architecture

```
 Frontend ──┐                              ┌── Existing
            │   POST /api/integrations/   │   pocket_assets / snapshots
            │         pdf-upload          │
            ▼           │                  ▼
   ┌─────────────────────────────────────────────┐
   │ apps/core/src/services/pdf-import/          │
   │  ┌─ ImporterRegistry ─┐                     │
   │  │  'revolut-invest'  │  ─► runImport()     │
   │  │  'revolut-savings' │      ├─ parse       │
   │  │  <future brokers>  │      ├─ S3 upload   │
   │  └────────────────────┘      ├─ diff vs DB  │
   │                              └─ write rows  │
   └──────────────────▲──────────────────────────┘
                      │ uses
                      ▼
   ┌─────────────────────────────────────────────┐
   │ packages/revolut-pdf (pure library)         │
   │  parseRevolutPdf(buffer) → RevolutDocument  │
   │  ├─ detect.ts    (doc-type sniff)           │
   │  ├─ locale.ts    (en/es number+date)        │
   │  └─ parsers/     (securities, savings)      │
   └─────────────────────────────────────────────┘
```

Two layers:
1. **`packages/revolut-pdf`** — Revolut-specific pure parser. No I/O, no DB. Future brokers get their own sibling package.
2. **`apps/core/src/services/pdf-import/`** — generic orchestration: registry, import runner, diff logic. Broker-agnostic.

---

## Package 1: `packages/revolut-pdf`

Pure TypeScript. Dependencies: `pdf-parse`.

**Public API:**
```ts
parseRevolutPdf(buffer: Buffer): Promise<RevolutDocument>

type RevolutDocument = SecuritiesStatement | FlexibleCashFundsStatement;
```

`SecuritiesStatement` has per-currency sections, each with positions/cash totals plus holdings (`symbol, company, isin, quantity, price, valueNative`). `FlexibleCashFundsStatement` has `closingBalance`, currency, period info, and the final fund holdings table. All decimals are strings.

Errors: `UnknownDocumentError`, `LocaleDetectionError`, `MalformedStatementError`.

Internals:
- `detect.ts` — sniff first-page text for "Flexible Cash Funds Statement" vs "Account Statement" + "Revolut Securities Europe UAB".
- `locale.ts` — detect es vs en from month tokens; parse numbers (`2.929,05` vs `5,450.41`) and dates.
- `parsers/securities.ts` — per-currency section walker.
- `parsers/savings.ts` — summary block + fund holdings table.

Testing: golden-file tests against both fixtures.

**v1 scope:** balances + holdings only. Transactions deferred.

---

## Package 2: `apps/core/src/services/pdf-import/`

Generic orchestration layer. Interface:
```ts
interface PdfStatementImporter {
  provider: string;
  catalogServiceId: string;
  documentType: 'securities' | 'savings';
  parse(buffer): Promise<ParsedPayload>;
  toHoldings?(parsed): HoldingDraft[];                 // Flow B
  toAmountForSnapshot?(parsed): { amount, currency, periodEnd, generatedAt }; // Flow A
}

interface ImportDiffResult {
  created: Array<{ symbol, quantity }>;
  updated: Array<{ symbol, oldQuantity, newQuantity }>;
  missing: Array<{ id, symbol, quantity }>;  // in DB, not in PDF — user review required
  importRowId: string;
}
```

Registry pattern: Revolut registers two importers (`revolut-invest`, `revolut-savings`). Adding Interactive Brokers later = write parser, implement importer, register it, add a catalog row — zero changes to routes/DB/frontend dispatch.

Runner:
- `runInvestImport` — parse → S3 upload → diff → create + update pocket_assets; **do not auto-delete missing**; insert `pdf_statement_imports` row → return diff.
- `runSavingsPreview` — parse → S3 (preview prefix) → return `{ s3Key, parsed }`.
- `commitMissingDeletions(importRowId, pocketAssetIds[])` — Flow B step 2 user confirms deletions.

---

## Database

New migration adds:
- `catalog_services.integration_type` column: `'manual' | 'api' | 'pdf-upload'`. Revolut > Savings + Revolut > Invest → `pdf-upload`. Revolut > Crypto + Binance → `api`.
- `pdf_statement_imports` table: audit/history of every upload with parsed JSON blob.

No changes to `pocket_assets` or `snapshot_entries`.

```sql
CREATE TABLE pdf_statement_imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  document_type TEXT NOT NULL,
  snapshot_id UUID REFERENCES snapshots(id) ON DELETE SET NULL,   -- Flow A
  service_id UUID REFERENCES services(id) ON DELETE CASCADE,      -- Flow B
  account_number TEXT,
  period_start DATE,
  period_end DATE,
  generated_at TIMESTAMPTZ,
  currency TEXT,
  s3_key TEXT NOT NULL,
  parsed_data JSONB NOT NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

## HTTP API

All routes require authenticated user.

- `POST /api/integrations/pdf-upload` — Flow B; multipart `{ file, provider, service_id }`. Returns `{ created, updated, missing, importRowId, statementPeriod }`.
- `POST /api/integrations/pdf-upload/confirm-deletions` — Flow B step 2; `{ importRowId, pocketAssetIds[] }`.
- `POST /api/snapshots/pdf-preview` — Flow A; multipart `{ file, provider }`. Returns `{ s3Key, parsed }`.
- `POST /api/snapshots` (existing) — extend to accept `entries[].pdfRef = { s3Key, provider }`; on commit, move preview → permanent S3 key, insert audit row.

---

## Frontend

- **`SnapshotDrawer.tsx`** — for entries whose service has `integration_type='pdf-upload'` and `service_type='common'` (Revolut > Savings), show *Upload statement* button → preview endpoint → pre-fill amount + chip. Warn (not block) on currency/period mismatch.
- **`AssetsPage.tsx` + new `PdfIntegrationDialog.tsx`** — when "Add integration" resolves to a catalog service with `integration_type='pdf-upload'`, render a generic dialog (Upload step → Review missing symbols → Delete/Keep → confirm). Staleness banner if latest `period_end` is >45 days old.

---

## Out of scope (v1)

- Transactions extraction
- OCR fallback (both PDFs have text layers)
- Multi-file bulk upload
- Revolut crypto PDF (covered by existing `revolut-x` live adapter)
- Help-text / example-URL columns on catalog_services (hardcoded per provider)

---

## Verification

**Unit:** `bun test packages/revolut-pdf` — parses both fixtures to expected JSON.
**Flow A manual:** open SnapshotDrawer for April 2026 → upload savings PDF → amount pre-fills with `5336.01` → submit → DB has snapshot entry + `pdf_statement_imports` row.
**Flow B manual:** seed pocket_assets with GRMN qty 4.0 and TSLA qty 1.0 under Revolut > Invest service → upload securities PDF → GRMN updated to 4.26803244, TSLA in missing list, 10+ holdings created. Confirm TSLA deletion → gone.
**Typecheck:** `bun run typecheck` passes across workspaces.
