import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseRevolutPdf } from "../index";
import { detectLocale, parseDate, parseNumber } from "../locale";
import { detectDocumentKind } from "../detect";
import { UnknownDocumentError } from "../types";

const FIXTURES = resolve(import.meta.dir, "../../fixtures");

describe("locale", () => {
  test("parseNumber handles es-ES format", () => {
    expect(parseNumber("2.929,05", "es")).toBe("2929.05");
    expect(parseNumber("5.336,01", "es")).toBe("5336.01");
    expect(parseNumber("-5,56", "es")).toBe("-5.56");
    expect(parseNumber("0,3721", "es")).toBe("0.3721");
  });

  test("parseNumber handles en-US format", () => {
    expect(parseNumber("5,450.41", "en")).toBe("5450.41");
    expect(parseNumber("4.26803244", "en")).toBe("4.26803244");
    expect(parseNumber("1,141.78", "en")).toBe("1141.78");
  });

  test("detectLocale recognises Spanish abr/Apr tokens", () => {
    expect(detectLocale("Period 1 abr 2026 - 21 abr 2026")).toBe("es");
    expect(detectLocale("Period 01 Apr 2026 - 21 Apr 2026")).toBe("en");
  });

  test("parseDate handles both locales", () => {
    expect(parseDate("21 abr 2026", "es").toISOString()).toBe("2026-04-21T00:00:00.000Z");
    expect(parseDate("01 Apr 2026", "en").toISOString()).toBe("2026-04-01T00:00:00.000Z");
  });
});

describe("detect", () => {
  test("rejects unknown PDF text", () => {
    expect(() => detectDocumentKind("Some random invoice from another company")).toThrow(UnknownDocumentError);
  });
});

describe("parseRevolutPdf — securities", () => {
  test("parses the en-US securities statement", async () => {
    const buf = readFileSync(resolve(FIXTURES, "securities-statement.pdf"));
    const doc = await parseRevolutPdf(buf);
    expect(doc.type).toBe("securities");
    if (doc.type !== "securities") throw new Error();

    expect(doc.accountNumber).toBe("5G0S0BJ1GDGR");
    expect(doc.periodStart.toISOString()).toBe("2026-04-01T00:00:00.000Z");
    expect(doc.periodEnd.toISOString()).toBe("2026-04-21T00:00:00.000Z");

    expect(doc.currencies).toHaveLength(2);
    const usd = doc.currencies.find((c) => c.currency === "USD");
    const eur = doc.currencies.find((c) => c.currency === "EUR");
    expect(usd).toBeDefined();
    expect(eur).toBeDefined();
    if (!usd || !eur) throw new Error();

    expect(usd.positionsValueEnd).toBe("5450.41");
    expect(usd.cashValueEnd).toBe("0.08");
    expect(usd.totalEnd).toBe("5450.49");
    expect(usd.holdings).toHaveLength(8);

    const grmn = usd.holdings.find((h) => h.symbol === "GRMN");
    expect(grmn).toBeDefined();
    expect(grmn?.isin).toBe("CH0114405324");
    expect(grmn?.quantity).toBe("4.26803244");
    expect(grmn?.valueNative).toBe("1141.78");

    const aapl = usd.holdings.find((h) => h.symbol === "AAPL");
    expect(aapl?.isin).toBe("US0378331005");
    expect(aapl?.quantity).toBe("4.48241313");

    expect(eur.positionsValueEnd).toBe("3136.38");
    expect(eur.cashValueEnd).toBe("0.33");
    expect(eur.holdings).toHaveLength(4);

    // Clean cases: lowercase transition correctly separates ticker from company name.
    const vuaa = eur.holdings.find((h) => h.isin === "IE00BFMXXD54");
    expect(vuaa?.symbol).toBe("VUAA");
    expect(vuaa?.quantity).toBe("1.52302896");
    const boy = eur.holdings.find((h) => h.isin === "ES0113211835");
    expect(boy?.symbol).toBe("BOY");

    // All ISINs and quantities are correct (ISIN is the authoritative identifier
    // — orchestration layer normalises ticker via asset_catalog lookup).
    const isins = eur.holdings.map((h) => h.isin).sort();
    expect(isins).toEqual([
      "ES0113211835",
      "IE00BFMXXD54",
      "NL0000226223",
      "NL0010273215",
    ]);
  });
});

describe("parseRevolutPdf — savings", () => {
  test("parses the es-ES Flexible Cash Funds statement", async () => {
    const buf = readFileSync(resolve(FIXTURES, "savings-statement-es.pdf"));
    const doc = await parseRevolutPdf(buf);
    expect(doc.type).toBe("savings");
    if (doc.type !== "savings") throw new Error();

    expect(doc.accountNumber).toBe("7aea9560-fc7d-4b8d-abf9-cdeca19b3996");
    expect(doc.currency).toBe("EUR");
    expect(doc.closingBalance).toBe("5336.01");
    expect(doc.periodStart.toISOString()).toBe("2026-04-01T00:00:00.000Z");
    expect(doc.periodEnd.toISOString()).toBe("2026-04-21T00:00:00.000Z");

    expect(doc.funds.length).toBeGreaterThanOrEqual(1);
    const fidelity = doc.funds.find((f) => f.isin === "IE000AZVL3K0");
    expect(fidelity).toBeDefined();
    expect(fidelity?.currency).toBe("EUR");
    expect(fidelity?.quantity).toBe("5342.79");
    expect(fidelity?.valueNative).toBe("5342.79");
  });
});
