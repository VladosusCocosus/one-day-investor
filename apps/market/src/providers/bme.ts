import { tmpdir } from "node:os";
import { join } from "node:path";
import { createLogger } from "@logger";
import type { AssetRecord, MarketProvider } from "./types";

const log = createLogger("provider-bme");

// CNMV / ANCV (Agencia Nacional de Codificación de Valores) publishes the
// official Spanish ISIN registry as a semestral ZIP. Inside the ZIP, the
// `LVRV*.XML` file is the equities catalog (LV = Lista de Valores,
// RV = Renta Variable). The URL has a year suffix and rotates twice per
// year — when CNMV publishes a new release, bump the suffix below.
//
// Index page (lists every available release):
//   https://www.cnmv.es/Portal/Publicaciones/ANCV
const ANCV_ZIP_URL =
  "https://www.cnmv.es/DocPortal/Publicaciones/ANCV/ANCVSEMESTRAL25.zip";

interface AncvRow {
  isin: string;
  entity: string;
  cfi: string;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchAndExtractLvrvXml(): Promise<string> {
  log.info({ url: ANCV_ZIP_URL }, "Downloading ANCV semestral zip");
  const res = await fetch(ANCV_ZIP_URL);
  if (!res.ok) {
    throw new Error(
      `ANCV download failed with status ${res.status}; the URL may need bumping`,
    );
  }
  const buf = await res.arrayBuffer();
  const zipPath = join(tmpdir(), "bme-ancv.zip");
  await Bun.write(zipPath, buf);
  log.info({ bytes: buf.byteLength, zipPath }, "ANCV zip downloaded");

  // Locate the LVRV*.XML entry inside the zip
  const list = Bun.spawnSync(["unzip", "-l", zipPath]);
  if (list.exitCode !== 0) {
    throw new Error(
      `unzip -l failed: ${new TextDecoder().decode(list.stderr)}`,
    );
  }
  const listing = new TextDecoder().decode(list.stdout);
  const match = listing.match(/(\S*LVRV\S*\.XML)/);
  if (!match) {
    throw new Error("LVRV XML entry not found inside ANCV zip");
  }
  const xmlEntry = match[1]!;
  log.info({ xmlEntry }, "Found equities XML inside zip");

  const ext = Bun.spawnSync(["unzip", "-p", zipPath, xmlEntry]);
  if (ext.exitCode !== 0) {
    throw new Error(
      `unzip -p failed: ${new TextDecoder().decode(ext.stderr)}`,
    );
  }
  // ANCV files are windows-1252 encoded (per the XML declaration)
  return new TextDecoder("windows-1252").decode(ext.stdout);
}

function parseLvrv(xml: string): AncvRow[] {
  const out: AncvRow[] = [];
  const blockRe = /<EMISION_RV>([\s\S]*?)<\/EMISION_RV>/g;
  const isinRe = /<Isin>([^<]*)<\/Isin>/;
  const entRe = /<Nombre_Entidad>([^<]*)<\/Nombre_Entidad>/;
  const cfiRe = /<Cfi>([^<]*)<\/Cfi>/;

  let m: RegExpExecArray | null;
  while ((m = blockRe.exec(xml)) !== null) {
    const inner = m[1]!;
    const isin = inner.match(isinRe)?.[1]?.trim() ?? "";
    const entity = inner.match(entRe)?.[1]?.trim() ?? "";
    const cfi = inner.match(cfiRe)?.[1]?.trim() ?? "";
    if (!isin || !entity) continue;
    // CFI codes start with "E" for Equity (ISO 10962). Drop anything else
    // defensively in case ANCV ever folds non-equity rows in here.
    if (!cfi.startsWith("E")) continue;
    out.push({ isin, entity, cfi });
  }
  return out;
}

async function resolveYahooTicker(isin: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v1/finance/search?q=${isin}&quotesCount=1&newsCount=0`,
      { headers: { "User-Agent": "Mozilla/5.0" } },
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data.quotes?.[0]?.symbol ?? null;
  } catch {
    return null;
  }
}

export const bmeProvider: MarketProvider = {
  name: "bme",
  description:
    "Spanish equities from the official CNMV/ANCV ISIN registry (semestral export), resolved to Yahoo tickers via ISIN search",
  async fetch(): Promise<AssetRecord[]> {
    const xml = await fetchAndExtractLvrvXml();
    const rows = parseLvrv(xml);
    log.info({ total: rows.length }, "Parsed ANCV equity records");

    // Dedupe by ISIN — multiple share classes may share an entity name but
    // every ISIN is unique by definition.
    const seen = new Set<string>();
    const unique: AncvRow[] = [];
    for (const r of rows) {
      if (seen.has(r.isin)) continue;
      seen.add(r.isin);
      unique.push(r);
    }
    log.info(
      { unique: unique.length },
      "Resolving Yahoo tickers for unique ISINs",
    );

    const resolved: AssetRecord[] = [];
    const batchSize = 5;
    for (let i = 0; i < unique.length; i += batchSize) {
      const batch = unique.slice(i, i + batchSize);
      const results = await Promise.all(
        batch.map(async (r) => {
          const ticker = await resolveYahooTicker(r.isin);
          if (!ticker) return null;
          return {
            symbol: ticker,
            name: r.entity,
            asset_type: "invest" as const,
            api_id: ticker,
            isin: r.isin,
          };
        }),
      );
      for (const x of results) {
        if (x) resolved.push(x);
      }
      if (i % 250 === 0 && i > 0) {
        log.info(
          { resolved: resolved.length, processed: i, total: unique.length },
          "BME ticker resolution progress",
        );
      }
      await sleep(200);
    }

    log.info(
      {
        total: resolved.length,
        unresolved: unique.length - resolved.length,
      },
      "BME provider produced asset records",
    );
    return resolved;
  },
};
