import type { SVGProps } from "react";

type Exchange = {
  name: string;
  Icon: (props: SVGProps<SVGSVGElement>) => JSX.Element;
};

function BinanceIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <rect width="24" height="24" rx="5" fill="#0B0E11" />
      <path
        fill="#F0B90B"
        d="M7.93 10.24 12 6.17l4.08 4.08 2.37-2.37L12 1.43 5.57 7.87l2.36 2.37Zm-6.5 1.76 2.37-2.37L6.17 12l-2.37 2.37L1.43 12Zm6.5 1.76L12 17.83l4.08-4.08 2.37 2.37L12 22.57l-6.44-6.44 2.3-2.37Zm9.9-1.76 2.37-2.37L22.57 12l-2.37 2.37L17.83 12ZM14.4 12 12 9.6 10.23 11.4l-.2.2-.43.4L9.6 12l2.4 2.4 2.4-2.4Z"
      />
    </svg>
  );
}

function BybitIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <rect width="24" height="24" rx="5" fill="#17181F" />
      <path
        fill="#F7A600"
        d="M15.1 14.4V8h1.5v6.4h-1.5Zm-9.1 2V6.7h3.1c1.5 0 2.4.8 2.4 2.1 0 .9-.5 1.4-.9 1.6.5.2 1.1.7 1.1 1.8 0 1.4-1 2.2-2.5 2.2H6Zm1.5-5.7h1.5c.7 0 1.1-.4 1.1-1s-.4-.9-1.1-.9H7.5v1.9Zm0 4.3h1.7c.7 0 1.2-.4 1.2-1s-.5-1-1.2-1H7.5v2Zm7.1 1.4v-2.8l-2.2-3.6h1.6l1.3 2.3 1.3-2.3h1.6l-2.2 3.6v2.8h-1.4Z"
      />
    </svg>
  );
}

function KrakenIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <rect width="24" height="24" rx="5" fill="#5741D9" />
      <path
        fill="#fff"
        d="M7.5 6h1.9v4.6L13.6 6h2.4l-4 4.3 4.3 7.7h-2.2l-3.4-6.2-1.3 1.4V18H7.5V6Z"
      />
      <path
        fill="#fff"
        fillOpacity=".7"
        d="M5 14.5a1 1 0 1 1-2 0 1 1 0 0 1 2 0Zm3 3.5a1 1 0 1 1-2 0 1 1 0 0 1 2 0Zm13-3.5a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z"
      />
    </svg>
  );
}

function CoinbaseIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <circle cx="12" cy="12" r="12" fill="#0052FF" />
      <rect x="8.5" y="10.25" width="7" height="3.5" rx="0.5" fill="#fff" />
    </svg>
  );
}

function OkxIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <rect width="24" height="24" rx="5" fill="#fff" />
      <rect x="3.5" y="3.5" width="5.5" height="5.5" fill="#111" />
      <rect x="15" y="3.5" width="5.5" height="5.5" fill="#111" />
      <rect x="9.25" y="9.25" width="5.5" height="5.5" fill="#111" />
      <rect x="3.5" y="15" width="5.5" height="5.5" fill="#111" />
      <rect x="15" y="15" width="5.5" height="5.5" fill="#111" />
    </svg>
  );
}

function KucoinIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <rect width="24" height="24" rx="5" fill="#01121A" />
      <path
        fill="#24AE8F"
        d="m5 12 5-5 3 3 3.5-3.5 2 2L14 12l4.5 4.5-2 2L13 15l-3 3-5-5Zm5-2.2L7.8 12 10 14.2l2.2-2.2L10 9.8Z"
      />
    </svg>
  );
}

function BitfinexIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <rect width="24" height="24" rx="5" fill="#0F2C2C" />
      <path
        fill="#16B157"
        d="M4 12c3-4 6-5 9-5 5 0 7 3 7 3s-3 1-6 1-5-1-7 2c2 2 4 1 7 1s6 1 6 1-2 3-7 3c-3 0-6-1-9-5Z"
      />
    </svg>
  );
}

function CryptoComIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <rect width="24" height="24" rx="5" fill="#002D74" />
      <path
        fill="#fff"
        d="m12 3 9 5.2v7.6L12 21l-9-5.2V8.2L12 3Zm0 2.3L5 9.4v5.2l7 4 7-4V9.4l-7-4.1Zm-3.2 5 3.2-1.8 3.2 1.8v3.4L12 15.5l-3.2-1.8v-3.4Z"
      />
    </svg>
  );
}

const exchanges: Exchange[] = [
  { name: "Binance", Icon: BinanceIcon },
  { name: "Bybit", Icon: BybitIcon },
  { name: "Kraken", Icon: KrakenIcon },
  { name: "Coinbase", Icon: CoinbaseIcon },
  { name: "OKX", Icon: OkxIcon },
  { name: "KuCoin", Icon: KucoinIcon },
  { name: "Bitfinex", Icon: BitfinexIcon },
  { name: "Crypto.com", Icon: CryptoComIcon },
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
          className="mt-16 grid grid-cols-2 gap-4 sm:grid-cols-4 md:grid-cols-4 lg:grid-cols-8"
        >
          {exchanges.map(({ name, Icon }) => (
            <li
              key={name}
              title={name}
              className="flex aspect-square items-center justify-center rounded-2xl border border-emerald-900/50 bg-emerald-950/40 p-5 backdrop-blur-sm transition-colors hover:border-emerald-700/60 hover:bg-emerald-950/60"
            >
              <span className="sr-only">{name}</span>
              <Icon className="h-12 w-12" />
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
