import Html from "@kitajs/html";
import { t, type Locale } from "../i18n";

const exchanges: { name: string; icon: string }[] = [
  { name: "Binance", icon: "https://upload.wikimedia.org/wikipedia/commons/e/e8/Binance_Logo.svg" },
  { name: "Bybit", icon: "https://s2.coinmarketcap.com/static/img/exchanges/128x128/521.png" },
  { name: "Kraken", icon: "https://www.kraken.com/_assets/icons/apple-touch-icon.png" },
  { name: "Coinbase", icon: "https://www.coinbase.com/apple-touch-icon.png" },
  { name: "OKX", icon: "https://www.okx.com/cdn/assets/imgs/253/59830BB78B18A776.png" },
  { name: "KuCoin", icon: "https://www.kucoin.com/logo.png" },
  { name: "Bitfinex", icon: "https://s2.coinmarketcap.com/static/img/exchanges/128x128/37.png" },
  { name: "Crypto.com", icon: "https://crypto.com/icons/icon-192x192.png" },
  { name: "Revolut X", icon: "https://assets.revolut.com/assets/rev-apps/crypto-exchange.png" },
];

export function Exchanges({ locale }: { locale: Locale }) {
  return (
    <section
      id="exchanges"
      aria-labelledby="exchanges-heading"
      class="px-6 py-16 md:px-8 md:py-32"
    >
      <div class="mx-auto max-w-[1200px]">
        <div class="mx-auto max-w-[720px] text-center">
          <p class="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-300">
            {t("exchanges.label", locale)}
          </p>
          <h2
            id="exchanges-heading"
            class="mt-4 text-3xl font-bold tracking-tight text-emerald-50 sm:text-4xl md:text-5xl"
          >
            {t("exchanges.title", locale)}
          </h2>
          <p class="mx-auto mt-5 max-w-[620px] text-base text-emerald-200/90 md:text-lg">
            {t("exchanges.subtitle", locale)}
          </p>
        </div>
        <ul
          role="list"
          class="mt-16 grid grid-cols-3 gap-4 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-9"
        >
          {exchanges.map(({ name, icon }) => (
            <li
              title={name}
              class="flex aspect-square items-center justify-center rounded-2xl border border-emerald-900/50 bg-emerald-950/40 p-4 backdrop-blur-sm transition-colors hover:border-emerald-700/60 hover:bg-emerald-950/60 md:p-5"
            >
              <span class="sr-only">{name}</span>
              <img
                src={icon}
                alt={name}
                loading="lazy"
                width={48}
                height={48}
                class="h-12 w-12 rounded-lg object-contain"
              />
            </li>
          ))}
        </ul>
        <p class="mx-auto mt-10 max-w-[620px] text-center text-sm text-emerald-200/70">
          {t("exchanges.fallback", locale)}
        </p>
      </div>
    </section>
  );
}
