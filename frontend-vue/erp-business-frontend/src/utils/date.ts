/**
 * Resolves the `Intl`/`toLocaleDateString` locale to use for a given active
 * app locale (from `useI18n()`'s `locale.value`). Keeps date formatting in
 * sync with the app's language instead of hardcoding a single locale.
 */
export function dateLocaleFor(appLocale: string): string {
  return appLocale === 'en' ? 'en-US' : 'es-VE';
}
