import { Elysia } from "elysia";
import {
  findSnapshotsByUserId,
  findSnapshotById,
  findLatestSnapshot,
  createSnapshot,
  updateSnapshot,
  deleteSnapshot,
  createPdfStatementImport,
} from "@database";
import { createLogger } from "@logger";
import { resolveAuth } from "../auth/session";
import { getImporter } from "../services/pdf-import";
import { handleSnapshotsPdfPreview } from "./pdf-import";

const log = createLogger("api:snapshots");

interface PdfRef {
  s3Key: string;
  provider: string;
  parsed?: Record<string, unknown>;
}

interface SnapshotEntryInput {
  service_id: string;
  amount: number;
  pocket_asset_id?: string | null;
  quantity?: number | null;
  price?: number | null;
  pdfRef?: PdfRef | null;
}

async function persistPdfRefs(
  userId: string,
  snapshotId: string,
  entries: SnapshotEntryInput[],
): Promise<void> {
  for (const entry of entries) {
    if (!entry.pdfRef) continue;
    const importer = getImporter(entry.pdfRef.provider);
    if (!importer) continue;
    await createPdfStatementImport({
      user_id: userId,
      provider: importer.provider,
      document_type: importer.documentType,
      snapshot_id: snapshotId,
      service_id: entry.service_id,
      s3_key: entry.pdfRef.s3Key,
      parsed_data: entry.pdfRef.parsed ?? {},
      currency:
        typeof entry.pdfRef.parsed?.currency === "string"
          ? entry.pdfRef.parsed.currency
          : null,
      period_end:
        typeof entry.pdfRef.parsed?.periodEnd === "string"
          ? entry.pdfRef.parsed.periodEnd.slice(0, 10)
          : null,
      account_number:
        typeof entry.pdfRef.parsed?.accountNumber === "string"
          ? entry.pdfRef.parsed.accountNumber
          : null,
    });
  }
}

export const snapshotsApi = new Elysia({ prefix: "/api/snapshots" })
  .derive(async ({ cookie, request }) => {
    const headers = Object.fromEntries(request.headers.entries()) as Record<
      string,
      string | undefined
    >;
    const { user, agentId } = await resolveAuth(
      cookie as Record<string, { value?: string }>,
      headers
    );
    return { user, agentId };
  })
  .get("/", async ({ user, set }) => {
    if (!user) {
      set.status = 401;
      return { error: "Unauthorized" };
    }
    return findSnapshotsByUserId(user.id);
  })
  .get("/latest", async ({ user, set }) => {
    if (!user) {
      set.status = 401;
      return { error: "Unauthorized" };
    }
    const snapshot = await findLatestSnapshot(user.id);
    if (!snapshot) {
      set.status = 404;
      return { error: "No snapshots found" };
    }
    return snapshot;
  })
  .get("/:id", async ({ user, set, params }) => {
    if (!user) {
      set.status = 401;
      return { error: "Unauthorized" };
    }
    const snapshot = await findSnapshotById(params.id, user.id);
    if (!snapshot) {
      set.status = 404;
      return { error: "Snapshot not found" };
    }
    return snapshot;
  })
  .post("/", async ({ user, set, body }) => {
    if (!user) {
      set.status = 401;
      return { error: "Unauthorized" };
    }
    const { month, entries } = body as {
      month: string;
      entries: SnapshotEntryInput[];
    };
    if (!month || !entries) {
      set.status = 400;
      return { error: "month and entries are required" };
    }
    try {
      const dbEntries = entries.map(({ pdfRef: _pdfRef, ...rest }) => rest);
      log.info(
        {
          userId: user.id,
          month,
          entryCount: dbEntries.length,
          byServiceAndPocket: dbEntries.map(
            (e) => `${e.service_id}|${e.pocket_asset_id ?? "null"}`,
          ),
        },
        "createSnapshot called",
      );
      const snapshot = await createSnapshot({
        user_id: user.id,
        month,
        entries: dbEntries,
      });
      await persistPdfRefs(user.id, snapshot.id, entries);
      return snapshot;
    } catch (err: unknown) {
      // Only the (user_id, month) collision on the snapshots table should
      // surface as "snapshot already exists". Other unique violations (e.g.
      // snapshot_entries_snapshot_service_pocket_key) indicate a duplicate
      // entry payload and need a distinct message + log.
      if (err instanceof Error && err.message.includes("snapshots_user_id_month")) {
        set.status = 409;
        return { error: "Snapshot already exists for this month" };
      }
      log.error({ err }, "createSnapshot failed");
      throw err;
    }
  })
  .put("/:id", async ({ user, set, params, body }) => {
    if (!user) {
      set.status = 401;
      return { error: "Unauthorized" };
    }
    const { entries } = body as {
      entries: SnapshotEntryInput[];
    };
    if (!entries) {
      set.status = 400;
      return { error: "entries are required" };
    }
    const dbEntries = entries.map(({ pdfRef: _pdfRef, ...rest }) => rest);
    const result = await updateSnapshot(params.id, user.id, dbEntries);
    if (result) {
      await persistPdfRefs(user.id, params.id, entries);
    }
    if (!result) {
      set.status = 404;
      return { error: "Snapshot not found" };
    }
    return result;
  })
  .delete("/:id", async ({ user, set, params }) => {
    if (!user) {
      set.status = 401;
      return { error: "Unauthorized" };
    }
    const deleted = await deleteSnapshot(params.id, user.id);
    if (!deleted) {
      set.status = 404;
      return { error: "Snapshot not found" };
    }
    return { success: true };
  })
  .post("/pdf-preview", async ({ user, set, body }) =>
    handleSnapshotsPdfPreview({ user, set, body }),
  );
