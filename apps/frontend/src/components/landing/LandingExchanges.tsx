type Exchange = {
  name: string;
  brand: string;
  mark: string;
  textClass?: string;
};

const exchanges: Exchange[] = [
  { name: "Binance", brand: "#F0B90B", mark: "B" },
  { name: "Bybit", brand: "#F7A600", mark: "B" },
  { name: "Kraken", brand: "#7132F5", mark: "K", textClass: "text-white" },
  { name: "Coinbase", brand: "#0052FF", mark: "C", textClass: "text-white" },
  { name: "OKX", brand: "#111111", mark: "OK", textClass: "text-white" },
  { name: "KuCoin", brand: "#24AE8F", mark: "K", textClass: "text-white" },
  { name: "Bitfinex", brand: "#16B157", mark: "B", textClass: "text-white" },
  { name: "Crypto.com", brand: "#003CDD", mark: "C", textClass: "text-white" },
];

export function LandingExchanges() {
  return (
    <section
      id="exchanges"
      aria-labelledby="exchanges-heading"
      className="px-6 py-24 md:px-8 md:py-32"
    >
      <div className="mx-auto max-w-[1200px]">
        <div className="mx-auto max-w-[720px] text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-300">
            Connect your exchanges
          </p>
          <h2
            id="exchanges-heading"
            className="mt-4 text-3xl font-bold tracking-tight text-emerald-50 sm:text-4xl md:text-5xl"
          >
            Link read-only API keys from the exchanges you already use.
          </h2>
          <p className="mx-auto mt-5 max-w-[620px] text-base text-emerald-200/90 md:text-lg">
            Balances sync automatically into your pockets. Keys are read-only —
            no trading, no withdrawals, ever.
          </p>
        </div>
        <ul
          role="list"
          className="mt-16 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4"
        >
          {exchanges.map(({ name, brand, mark, textClass }) => (
            <li
              key={name}
              className="flex items-center gap-4 rounded-2xl border border-emerald-900/50 bg-emerald-950/40 p-5 backdrop-blur-sm transition-colors hover:border-emerald-700/60 hover:bg-emerald-950/60"
            >
              <span
                aria-hidden="true"
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-sm font-bold tracking-tight ${textClass ?? "text-emerald-950"}`}
                style={{ backgroundColor: brand }}
              >
                {mark}
              </span>
              <span className="text-sm font-semibold text-emerald-50 sm:text-base">
                {name}
              </span>
            </li>
          ))}
        </ul>
        <p className="mx-auto mt-10 max-w-[620px] text-center text-sm text-emerald-200/70">
          Don't see yours? You can still track holdings manually from any
          exchange, broker, or wallet.
        </p>
      </div>
    </section>
  );
}
