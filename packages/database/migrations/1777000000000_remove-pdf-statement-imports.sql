-- Revert the PDF statement import feature. The pdf_statement_imports table
-- is dropped wholesale; the integration_type column stays because it's still
-- used to distinguish 'api' exchange adapters from 'manual' services.
DROP TABLE IF EXISTS pdf_statement_imports;

-- Demote Revolut Savings/Invest back to manual so the column no longer
-- carries the retired 'pdf-upload' value. The catalog rows themselves stay —
-- existing users' linked services keep working as plain manual entries.
UPDATE catalog_services
    SET integration_type = 'manual'
    WHERE integration_type = 'pdf-upload';
