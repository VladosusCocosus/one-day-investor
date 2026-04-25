import { t } from "elysia";

/**
 * Shared request-body shapes used across multiple market API routes.
 * All shapes use additionalProperties: true so existing callers that
 * send extra fields don't 422.
 */

export const PriceQueryAsset = t.Object(
  {
    api_id: t.String(),
    symbol: t.Optional(t.String()),
    asset_type: t.String(),
  },
  { additionalProperties: true },
);
