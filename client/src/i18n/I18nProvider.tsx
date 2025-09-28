import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import en from './en.json';
import he from './he.json';

export type Locale = 'en' | 'he';

type Messages = typeof en;

type I18nContextType = {
  locale: Locale;
  t: (key: string) => string;
  setLocale: (l: Locale) => void;
  messages: Messages;
};

const I18nContext = createContext<I18nContextType | undefined>(undefined);

const DICTS: Record<Locale, Messages> = {
  en,
  he,
};

const STORAGE_KEY = 'printer-system.locale';

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const initial = (localStorage.getItem(STORAGE_KEY) as Locale) || 'he';
  const [locale, setLocaleState] = useState<Locale>(initial);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    localStorage.setItem(STORAGE_KEY, l);
  }, []);

  const messages = DICTS[locale];

  const t = useCallback((key: string) => {
    // simple dot-notation lookup
    const parts = key.split('.');
    let cur: any = messages;
    for (const p of parts) {
      cur = cur?.[p];
      if (cur === undefined) return key; // fallback to key if missing
    }
    return typeof cur === 'string' ? cur : key;
  }, [messages]);

  const value = useMemo(() => ({ locale, setLocale, t, messages }), [locale, setLocale, t, messages]);

  return (
    <I18nContext.Provider value={value}>
      {children}
    </I18nContext.Provider>
  );
};

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
}
