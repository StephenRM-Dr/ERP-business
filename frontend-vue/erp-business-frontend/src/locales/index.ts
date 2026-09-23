import { createI18n } from 'vue-i18n';

import en from './en.json';
import es from './es.json';

// `legacy: false` enables the Composition API mode (required for <script setup>).
// Spanish is the default UI language; English acts as the fallback for missing keys.
const i18n = createI18n({
  legacy: false,
  locale: 'es',
  fallbackLocale: 'en',
  messages: {
    en,
    es,
  },
});

// Vite's default HMR invalidation doesn't reach vue-i18n's already-built
// message compiler cache for plain JSON imports, so editing es.json/en.json
// silently kept serving stale translations until a full dev-server restart.
// Re-pushing the fresh module into the live i18n instance on every edit
// fixes that without needing a restart per locale change.
if (import.meta.hot) {
  import.meta.hot.accept(['./es.json', './en.json'], ([newEs, newEn]) => {
    if (newEs) i18n.global.setLocaleMessage('es', newEs.default);
    if (newEn) i18n.global.setLocaleMessage('en', newEn.default);
  });
}

export default i18n;
