/**
 * Validate an ISIN using the ISO 6166 check digit (Luhn variant).
 *
 * Used to reject spurious 12-character matches when an ISIN is concatenated
 * against adjacent text (e.g. "ETF" + "IE00BFMXXD5" looks like a valid
 * structural match but fails the checksum).
 */
export function isValidIsin(isin: string): boolean {
  if (!/^[A-Z]{2}[A-Z0-9]{9}\d$/.test(isin)) return false;

  const flat: number[] = [];
  for (const ch of isin) {
    if (ch >= "0" && ch <= "9") {
      flat.push(ch.charCodeAt(0) - "0".charCodeAt(0));
    } else {
      const n = ch.charCodeAt(0) - "A".charCodeAt(0) + 10; // A=10..Z=35
      flat.push(Math.floor(n / 10), n % 10);
    }
  }

  let sum = 0;
  // Double every second digit starting from the 2nd-from-right.
  for (let i = flat.length - 1, pos = 0; i >= 0; i--, pos++) {
    let v = flat[i]!;
    if (pos % 2 === 1) {
      v *= 2;
      if (v > 9) v -= 9;
    }
    sum += v;
  }
  return sum % 10 === 0;
}
