import { createLogger } from "@logger";
import type { AssetRecord, MarketProvider } from "./types";

const log = createLogger("provider-nasdaqtrader");

const NASDAQ_LISTED_URL =
  "https://www.nasdaqtrader.com/dynamic/symdir/nasdaqlisted.txt";
const OTHER_LISTED_URL =
  "https://www.nasdaqtrader.com/dynamic/symdir/otherlisted.txt";

interface RawRow {
  symbol: string;
  name: string;
  testIssue: string;
}

function parsePipeFile(
  text: string,
  symbolField: string,
  nameField: string,
  testField: string,
): RawRow[] {
  const lines = text.split("\n").filter((l) => l.trim().length > 0);
  if (lines.length === 0) return [];

  const header = lines[0]!.split("|");
  const symbolIdx = header.indexOf(symbolField);
  const nameIdx = header.indexOf(nameField);
  const testIdx = header.indexOf(testField);

  if (symbolIdx === -1 || nameIdx === -1 || testIdx === -1) {
    log.warn(
      { symbolField, nameField, testField, header },
      "nasdaqtrader file missing expected columns",
    );
    return [];
  }

  const out: RawRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]!;
    // Skip footer like: "File Creation Time: ..."
    if (line.startsWith("File Creation Time")) continue;
    const cols = line.split("|");
    const symbol = cols[symbolIdx]?.trim() ?? "";
    const name = cols[nameIdx]?.trim() ?? "";
    const testIssue = cols[testIdx]?.trim() ?? "";
    if (!symbol || !name) continue;
    out.push({ symbol, name, testIssue });
  }
  return out;
}

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0" },
  });
  if (!res.ok) {
    throw new Error(`nasdaqtrader fetch failed ${res.status} for ${url}`);
  }
  return res.text();
}

export const nasdaqtraderProvider: MarketProvider = {
  name: "nasdaqtrader",
  description:
    "Official NASDAQ/NYSE/AMEX/Arca symbol files from nasdaqtrader.com (nasdaqlisted.txt + otherlisted.txt)",
  async fetch(): Promise<AssetRecord[]> {
    log.info("Fetching nasdaqlisted.txt and otherlisted.txt");
    const [nasdaqText, otherText] = await Promise.all([
      fetchText(NASDAQ_LISTED_URL),
      fetchText(OTHER_LISTED_URL),
    ]);

    const nasdaqRows = parsePipeFile(
      nasdaqText,
      "Symbol",
      "Security Name",
      "Test Issue",
    );
    const otherRows = parsePipeFile(
      otherText,
      "ACT Symbol",
      "Security Name",
      "Test Issue",
    );

    log.info(
      { nasdaqRows: nasdaqRows.length, otherRows: otherRows.length },
      "Parsed pipe-delimited symbol files",
    );

    // Dedupe across the two files, preferring nasdaqlisted.txt rows on conflict.
    const seen = new Map<string, AssetRecord>();
    const consume = (rows: RawRow[]) => {
      for (const row of rows) {
        if (row.testIssue === "Y") continue;
        // Skip preferred-share rows like "AAIC$B" — Yahoo uses a different
        // suffix (`-PB`) which would require resolution we don't do here.
        if (row.symbol.includes("$")) continue;
        if (seen.has(row.symbol)) continue;
        seen.set(row.symbol, {
          symbol: row.symbol,
          name: row.name,
          asset_type: "invest",
          api_id: row.symbol,
        });
      }
    };

    consume(nasdaqRows); // first → wins on conflict
    consume(otherRows);

    const records = Array.from(seen.values());
    log.info(
      { total: records.length },
      "nasdaqtrader provider produced asset records",
    );
    return records;
  },
};
