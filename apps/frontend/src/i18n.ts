import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./locales/en.json";
import ru from "./locales/ru.json";
import es from "./locales/es.json";

const SUPPORTED = ["en", "ru", "es"];

function getInitialLanguage(): string {
  const cookie = document.cookie
    .split("; ")
    .find((c) => c.startsWith("lang="));
  if (cookie) {
    const val = cookie.split("=")[1];
    if (SUPPORTED.includes(val)) return val;
  }
  const browserLang = navigator.language.split("-")[0];
  if (SUPPORTED.includes(browserLang)) return browserLang;
  return "en";
}

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    ru: { translation: ru },
    es: { translation: es },
  },
  lng: getInitialLanguage(),
  fallbackLng: "en",
  interpolation: { escapeValue: false },
});

export default i18n;
