import { t } from "elysia";

/**
 * Shared request-body shapes used across multiple core API routes.
 * All shapes use additionalProperties: true so existing callers that
 * send extra fields don't 422.
 */

export const SnapshotEntry = t.Object(
  {
    service_id: t.String(),
    amount: t.Numeric(),
    pocket_asset_id: t.Optional(t.Union([t.String(), t.Null()])),
    quantity: t.Optional(t.Union([t.Numeric(), t.Null()])),
    price: t.Optional(t.Union([t.Numeric(), t.Null()])),
  },
  { additionalProperties: true },
);
