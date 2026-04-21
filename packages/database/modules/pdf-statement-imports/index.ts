import { pool } from "../../pool";

export interface PdfStatementImport {
  id: string;
  user_id: string;
  provider: string;
  document_type: string;
  snapshot_id: string | null;
  service_id: string | null;
  account_number: string | null;
  period_start: string | null;
  period_end: string | null;
  generated_at: Date | null;
  currency: string | null;
  s3_key: string;
  parsed_data: unknown;
  uploaded_at: Date;
}

export async function createPdfStatementImport(params: {
  user_id: string;
  provider: string;
  document_type: "securities" | "savings";
  snapshot_id?: string | null;
  service_id?: string | null;
  account_number?: string | null;
  period_start?: string | null;
  period_end?: string | null;
  generated_at?: Date | null;
  currency?: string | null;
  s3_key: string;
  parsed_data: unknown;
}): Promise<PdfStatementImport> {
  const result = await pool.query<PdfStatementImport>(
    `INSERT INTO pdf_statement_imports
       (user_id, provider, document_type, snapshot_id, service_id,
        account_number, period_start, period_end, generated_at, currency,
        s3_key, parsed_data)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::jsonb)
     RETURNING *`,
    [
      params.user_id,
      params.provider,
      params.document_type,
      params.snapshot_id ?? null,
      params.service_id ?? null,
      params.account_number ?? null,
      params.period_start ?? null,
      params.period_end ?? null,
      params.generated_at ?? null,
      params.currency ?? null,
      params.s3_key,
      JSON.stringify(params.parsed_data),
    ],
  );
  return result.rows[0]!;
}

export async function findPdfStatementImportById(
  id: string,
  userId: string,
): Promise<PdfStatementImport | null> {
  const result = await pool.query<PdfStatementImport>(
    "SELECT * FROM pdf_statement_imports WHERE id = $1 AND user_id = $2",
    [id, userId],
  );
  return result.rows[0] ?? null;
}

export async function findLatestPdfImportForService(
  serviceId: string,
): Promise<PdfStatementImport | null> {
  const result = await pool.query<PdfStatementImport>(
    `SELECT * FROM pdf_statement_imports
       WHERE service_id = $1
       ORDER BY uploaded_at DESC
       LIMIT 1`,
    [serviceId],
  );
  return result.rows[0] ?? null;
}

export async function appendImportDeletions(
  importId: string,
  deleted: Array<{ id: string; symbol: string }>,
): Promise<void> {
  await pool.query(
    `UPDATE pdf_statement_imports
       SET parsed_data = jsonb_set(
         parsed_data,
         '{deletions_confirmed}',
         COALESCE(parsed_data->'deletions_confirmed', '[]'::jsonb) || $2::jsonb,
         true
       )
     WHERE id = $1`,
    [importId, JSON.stringify(deleted)],
  );
}
