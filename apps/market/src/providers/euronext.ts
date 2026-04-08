import { createLogger } from "@logger";
import type { AssetRecord, MarketProvider } from "./types";

const log = createLogger("provider-euronext");

// Euronext MIC → Yahoo Finance suffix mapping.
const MIC_TO_YAHOO: Record<string, string> = {
  XPAR: ".PA",
  XAMS: ".AS",
  XBRU: ".BR",
  XLIS: ".LS",
  XMIL: ".MI",
  XOSL: ".OL",
  XDUB: ".IR",
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface EuronextRow {
  symbol: string;
  name: string;
  isin: string | null;
}

// Match a 12-char ISIN (2 letters + 9 alphanum + 1 check digit) anywhere in a string.
const ISIN_RE = /\b([A-Z]{2}[A-Z0-9]{9}[0-9])\b/;

function extractIsin(row: string[]): string | null {
  // Euronext's row order varies; scan all string fields for an ISIN match.
  for (const field of row) {
    if (typeof field !== "string") continue;
    const m = field.match(ISIN_RE);
    if (m) return m[1]!;
  }
  return null;
}

async function fetchEuronextPage(
  start: number,
  length = 100,
): Promise<EuronextRow[]> {
  const url =
    "https://live.euronext.com/en/pd/data/stocks?mics=XAMS,XBRU,XLIS,XPAR,XMIL,XOSL,XDUB&display_datapoints=dp_stocks&display_filters=df_stocks";
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: `draw=1&start=${start}&length=${length}&iDisplayLength=${length}&iDisplayStart=${start}`,
  });
  if (!res.ok) {
    log.warn({ status: res.status, start }, "Euronext page failed");
    return [];
  }
  const data = await res.json();
  const rows: string[][] = data?.aaData ?? [];

  return rows
    .map((row): EuronextRow | null => {
      // Field 0: HTML with data-order='NAME'
      const nameMatch = row[0]?.match(/data-order='([^']+)'/);
      // Field 2: ticker
      const ticker = row[2]?.trim();
      // Field 3: HTML with MIC code like >XPAR</div>
      const micMatch = row[3]?.match(/>(\w+)<\/div>/);
      const mic = micMatch?.[1] ?? "";
      const suffix = MIC_TO_YAHOO[mic] ?? "";

      if (!ticker || !nameMatch?.[1] || !suffix) return null;

      const yahooSymbol = `${ticker}${suffix}`;
      return {
        symbol: yahooSymbol,
        name: nameMatch[1],
        isin: extractIsin(row),
      };
    })
    .filter((r): r is EuronextRow => r !== null);
}

async function fetchAllEuronextStocks(): Promise<EuronextRow[]> {
  const pageSize = 100;
  const all: EuronextRow[] = [];
  let start = 0;

  while (true) {
    log.info({ start, fetched: all.length }, "Fetching Euronext stocks page");
    const rows = await fetchEuronextPage(start, pageSize);
    if (rows.length === 0) break;
    all.push(...rows);
    if (rows.length < pageSize) break;
    start += pageSize;
    await sleep(500);
  }

  log.info({ total: all.length }, "All Euronext stocks fetched");
  return all;
}

export const euronextProvider: MarketProvider = {
  name: "euronext",
  description:
    "Live Euronext stock list (Paris, Amsterdam, Brussels, Lisbon, Milan, Oslo, Dublin)",
  async fetch(): Promise<AssetRecord[]> {
    const rows = await fetchAllEuronextStocks();
    return rows.map((r) => ({
      symbol: r.symbol,
      name: r.name,
      asset_type: "invest" as const,
      api_id: r.symbol,
      isin: r.isin,
    }));
  },
};
