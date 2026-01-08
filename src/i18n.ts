import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './locales/en.json';
import ja from './locales/ja.json';
import es from './locales/es.json';

// Get saved language from localStorage or default to 'en'
const getSavedLanguage = (): string => {
    try {
        const saved = localStorage.getItem('config:app.llm_language');
        if (saved) {
            const parsed = JSON.parse(saved);
            return parsed || 'en';
        }
    } catch {
        // ignore
    }
    return 'en';
};

i18n
    .use(initReactI18next)
    .init({
        resources: {
            en: { translation: en },
            ja: { translation: ja },
            es: { translation: es },
        },
        lng: getSavedLanguage(),
        fallbackLng: 'en',
        interpolation: {
            escapeValue: false, // React already escapes values
        },
    });

export default i18n;
