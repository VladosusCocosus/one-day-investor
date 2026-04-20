import Html from "@kitajs/html";
import { t, type Locale } from "../i18n";

const exchangeIcons: { name: string; svg: string }[] = [
  {
    name: "Binance",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" id="Your_design" x="0px" y="0px" width="126.611px" height="126.611px" viewBox="0 0 126.611 126.611" enable-background="new 0 0 126.611 126.611" xml:space="preserve"><script xmlns=""/>
<polygon fill="#F3BA2F" points="38.171,53.203 62.759,28.616 87.36,53.216 101.667,38.909 62.759,0 23.864,38.896 "/>
<rect x="3.644" y="53.188" transform="matrix(0.7071 0.7071 -0.7071 0.7071 48.7933 8.8106)" fill="#F3BA2F" width="20.233" height="20.234"/>
<polygon fill="#F3BA2F" points="38.171,73.408 62.759,97.995 87.359,73.396 101.674,87.695 101.667,87.703 62.759,126.611   23.863,87.716 23.843,87.696 "/>
<rect x="101.64" y="53.189" transform="matrix(-0.7071 0.7071 -0.7071 -0.7071 235.5457 29.0503)" fill="#F3BA2F" width="20.234" height="20.233"/>
<polygon fill="#F3BA2F" points="77.271,63.298 77.277,63.298 62.759,48.78 52.03,59.509 52.029,59.509 50.797,60.742 48.254,63.285   48.254,63.285 48.234,63.305 48.254,63.326 62.759,77.831 77.277,63.313 77.284,63.305 "/>
</svg>`,
  },
  {
    name: "Bybit",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" xmlns:svg="http://www.w3.org/2000/svg" xml:space="preserve" width="135.467mm" height="45.1272mm" style="shape-rendering:geometricPrecision; text-rendering:geometricPrecision; image-rendering:optimizeQuality; fill-rule:evenodd; clip-rule:evenodd" viewBox="0 0 13547 4513"><script xmlns=""/>
 <defs>
  <style type="text/css">
   <![CDATA[
    .fil1 {fill:#15182A;fill-rule:nonzero}
    .fil0 {fill:#F6A500;fill-rule:nonzero}
   ]]>
  </style>
 </defs>
 <g id="Layer_x0020_1">
  <metadata id="CorelCorpID_0Corel-Layer"/>
 </g>
 <g id="Layer_x0020_1_0">
  <metadata id="CorelCorpID_1Corel-Layer"/>
  <g id="Bybit_x0020_Logo.cdr">
   <polygon class="fil0" points="9655,3480 9655,-1 10355,-1 10355,3480 "/>
   <path class="fil1" d="M1500 4514l-1500 0 0 -3481 1440 0c700,0 1107,381 1107,978 0,386 -262,636 -443,719 216,98 493,318 493,782 0,650 -458,1002 -1097,1002zm-116 -2875l0 0 -685 0 0 802 685 0c297,0 463,-161 463,-401 0,-239 -166,-401 -463,-401zm45 1413l0 0 -730 0 0 856 730 0c317,0 468,-195 468,-430 0,-235 -151,-425 -468,-425z"/>
   <polygon class="fil1" points="4732,3086 4732,4514 4037,4514 4037,3086 2960,1033 3720,1033 4389,2436 5049,1033 5809,1033 "/>
   <path class="fil1" d="M7793 4514l-1500 0 0 -3481 1440 0c700,0 1107,381 1107,978 0,386 -262,636 -443,719 216,98 493,318 493,782 0,650 -458,1002 -1097,1002zm-116 -2875l0 0 -685 0 0 802 685 0c297,0 463,-161 463,-401 0,-239 -166,-401 -463,-401zm45 1413l0 0 -730 0 0 856 730 0c317,0 468,-195 468,-430 0,-235 -151,-425 -468,-425z"/>
   <polygon class="fil1" points="12610,1639 12610,4514 11911,4514 11911,1639 10974,1639 10974,1033 13547,1033 13547,1639 "/>
  </g>
 </g>
</svg>`,
  },
  {
    name: "Kraken",
    svg: `<svg viewBox="0 0 24 24" aria-hidden="true" class="h-12 w-12"><rect width="24" height="24" rx="5" fill="#5741D9"/><path fill="#fff" d="M7.5 6h1.9v4.6L13.6 6h2.4l-4 4.3 4.3 7.7h-2.2l-3.4-6.2-1.3 1.4V18H7.5V6Z"/><path fill="#fff" fill-opacity=".7" d="M5 14.5a1 1 0 1 1-2 0 1 1 0 0 1 2 0Zm3 3.5a1 1 0 1 1-2 0 1 1 0 0 1 2 0Zm13-3.5a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z"/></svg>`,
  },
  {
    name: "Coinbase",
    svg: `<svg viewBox="0 0 24 24" aria-hidden="true" class="h-12 w-12"><circle cx="12" cy="12" r="12" fill="#0052FF"/><rect x="8.5" y="10.25" width="7" height="3.5" rx="0.5" fill="#fff"/></svg>`,
  },
  {
    name: "OKX",
    svg: `<svg viewBox="0 0 24 24" aria-hidden="true" class="h-12 w-12"><rect width="24" height="24" rx="5" fill="#fff"/><rect x="3.5" y="3.5" width="5.5" height="5.5" fill="#111"/><rect x="15" y="3.5" width="5.5" height="5.5" fill="#111"/><rect x="9.25" y="9.25" width="5.5" height="5.5" fill="#111"/><rect x="3.5" y="15" width="5.5" height="5.5" fill="#111"/><rect x="15" y="15" width="5.5" height="5.5" fill="#111"/></svg>`,
  },
  {
    name: "KuCoin",
    svg: `<svg viewBox="0 0 24 24" aria-hidden="true" class="h-12 w-12"><rect width="24" height="24" rx="5" fill="#01121A"/><path fill="#24AE8F" d="m5 12 5-5 3 3 3.5-3.5 2 2L14 12l4.5 4.5-2 2L13 15l-3 3-5-5Zm5-2.2L7.8 12 10 14.2l2.2-2.2L10 9.8Z"/></svg>`,
  },
  {
    name: "Bitfinex",
    svg: `<svg viewBox="0 0 24 24" aria-hidden="true" class="h-12 w-12"><rect width="24" height="24" rx="5" fill="#0F2C2C"/><path fill="#16B157" d="M4 12c3-4 6-5 9-5 5 0 7 3 7 3s-3 1-6 1-5-1-7 2c2 2 4 1 7 1s6 1 6 1-2 3-7 3c-3 0-6-1-9-5Z"/></svg>`,
  },
  {
    name: "Crypto.com",
    svg: `<svg viewBox="0 0 24 24" aria-hidden="true" class="h-12 w-12"><rect width="24" height="24" rx="5" fill="#002D74"/><path fill="#fff" d="m12 3 9 5.2v7.6L12 21l-9-5.2V8.2L12 3Zm0 2.3L5 9.4v5.2l7 4 7-4V9.4l-7-4.1Zm-3.2 5 3.2-1.8 3.2 1.8v3.4L12 15.5l-3.2-1.8v-3.4Z"/></svg>`,
  },
  {
    name: "Revolut X",
    svg: `<img src="https://assets.revolut.com/assets/rev-apps/crypto-exchange.png" alt="Revolut X" class="h-12 w-12 rounded-lg" />`,
  },
];

export function Exchanges({ locale }: { locale: Locale }) {
  return (
    <section
      id="exchanges"
      aria-labelledby="exchanges-heading"
      class="px-6 py-24 md:px-8 md:py-32"
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
          class="mt-16 grid grid-cols-2 gap-4 sm:grid-cols-4 md:grid-cols-4 lg:grid-cols-8"
        >
          {exchangeIcons.map(({ name, svg }) => (
            <li
              title={name}
              class="flex aspect-square items-center justify-center rounded-2xl border border-emerald-900/50 bg-emerald-950/40 p-5 backdrop-blur-sm transition-colors hover:border-emerald-700/60 hover:bg-emerald-950/60"
            >
              <span class="sr-only">{name}</span>
              {svg as "safe"}
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
