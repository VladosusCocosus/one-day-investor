-- Discriminate catalog entries by how the user populates them.
-- 'manual'     : user types amounts by hand (default)
-- 'api'        : live exchange/broker adapter with credentials
-- 'pdf-upload' : user uploads a PDF statement; parser extracts balance/holdings
ALTER TABLE catalog_services
    ADD COLUMN integration_type TEXT NOT NULL DEFAULT 'manual';

-- Revolut Savings + Revolut Invest are PDF-upload services.
UPDATE catalog_services
    SET integration_type = 'pdf-upload'
    WHERE parent_id = 'a0000000-0000-0000-0000-000000000001'
      AND name IN ('Savings', 'Invest');

-- Revolut Crypto + Binance children are API-backed.
UPDATE catalog_services
    SET integration_type = 'api'
    WHERE parent_id = 'a0000000-0000-0000-0000-000000000001'
      AND name = 'Crypto';
UPDATE catalog_services
    SET integration_type = 'api'
    WHERE id = 'a0000000-0000-0000-0000-000000000003'
       OR parent_id = 'a0000000-0000-0000-0000-000000000003';

-- Audit / history table for every PDF uploaded, shared across Flow A (savings
-- attached to a snapshot) and Flow B (holdings import for an invest service).
CREATE TABLE pdf_statement_imports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider TEXT NOT NULL,                -- 'revolut-invest' | 'revolut-savings' | future
    document_type TEXT NOT NULL,           -- 'securities' | 'savings'
    snapshot_id UUID REFERENCES snapshots(id) ON DELETE SET NULL, -- Flow A
    service_id UUID REFERENCES services(id) ON DELETE CASCADE,    -- Flow B
    account_number TEXT,
    period_start DATE,
    period_end DATE,
    generated_at TIMESTAMPTZ,
    currency TEXT,
    s3_key TEXT NOT NULL,
    parsed_data JSONB NOT NULL,
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_pdf_imports_user_provider
    ON pdf_statement_imports(user_id, provider, uploaded_at DESC);
CREATE INDEX idx_pdf_imports_snapshot
    ON pdf_statement_imports(snapshot_id) WHERE snapshot_id IS NOT NULL;
CREATE INDEX idx_pdf_imports_service
    ON pdf_statement_imports(service_id) WHERE service_id IS NOT NULL;
