import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useSettings } from "./useSettings";

export function useLanguageSync() {
  const { i18n } = useTranslation();
  const { settings } = useSettings();

  useEffect(() => {
    const dbLang = settings?.language;
    if (dbLang && dbLang !== i18n.language) {
      i18n.changeLanguage(dbLang);
      document.cookie = `lang=${dbLang};path=/;max-age=31536000;SameSite=Lax`;
      document.documentElement.lang = dbLang;
    }
  }, [settings?.language, i18n]);
}
