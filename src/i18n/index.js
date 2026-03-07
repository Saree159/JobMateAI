import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './en.json';
import he from './he.json';

const savedLang = localStorage.getItem('hirematex_lang') || 'en';

// Apply direction immediately (before React renders) to avoid flash
document.documentElement.dir = savedLang === 'he' ? 'rtl' : 'ltr';
document.documentElement.lang = savedLang;

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    he: { translation: he },
  },
  lng: savedLang,
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

export default i18n;
