/**
 * CLI: refresh ticker catalog from one or more market providers.
 *
 * Usage:
 *   bun run refresh-tickers                     # all providers, in series
 *   bun run refresh-tickers nasdaqtrader        # one provider
 *   bun run refresh-tickers nasdaqtrader xetra  # multiple, in series
 *   bun run refresh-tickers --list              # list available providers
 */

import { createLogger } from "@logger";
import { pool, upsertAssets } from "@database";
import { providers } from "../providers";
import type { MarketProvider } from "../providers";

const log = createLogger("refresh-tickers");

function printList() {
  console.log("Available market providers:\n");
  for (const p of providers) {
    console.log(`  ${p.name.padEnd(16)}${p.description}`);
  }
}

function selectProviders(argv: string[]): MarketProvider[] | null {
  if (argv.length === 0) return providers;
  const byName = new Map(providers.map((p) => [p.name, p]));
  const selected: MarketProvider[] = [];
  for (const arg of argv) {
    const provider = byName.get(arg);
    if (!provider) {
      log.error(
        { unknown: arg, available: Array.from(byName.keys()) },
        "Unknown provider",
      );
      return null;
    }
    selected.push(provider);
  }
  return selected;
}

async function main() {
  // bun strips its own args; user args start at index 2.
  const argv = process.argv.slice(2);

  if (argv.includes("--list")) {
    printList();
    await pool.end();
    process.exit(0);
  }

  const selected = selectProviders(argv);
  if (!selected) {
    await pool.end();
    process.exit(1);
  }

  log.info(
    { providers: selected.map((p) => p.name) },
    "Starting ticker refresh",
  );

  let totalFetched = 0;
  let totalUpserted = 0;

  for (const provider of selected) {
    log.info({ provider: provider.name }, "Provider start");
    const records = await provider.fetch();
    const result = await upsertAssets(records, provider.name);
    log.info(
      { provider: provider.name, fetched: records.length, upserted: result.upserted },
      "Provider complete",
    );
    totalFetched += records.length;
    totalUpserted += result.upserted;
  }

  log.info(
    {
      providers: selected.length,
      totalFetched,
      totalUpserted,
    },
    "Ticker refresh complete",
  );
}

main()
  .then(async () => {
    await pool.end();
    process.exit(0);
  })
  .catch(async (err) => {
    log.error({ err }, "refresh-tickers failed");
    await pool.end();
    process.exit(1);
  });
