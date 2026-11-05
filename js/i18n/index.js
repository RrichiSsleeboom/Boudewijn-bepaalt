import nl from './nl.js';
import en from './en.js';

const DICTS = { nl, en };
const LANG_KEY = 'laatste-trein-lang';

let current = 'nl';
try {
  const saved = localStorage.getItem(LANG_KEY);
  if (saved && DICTS[saved]) current = saved;
} catch {
  /* no storage: keep Dutch */
}

export const LANGS = Object.keys(DICTS);

export function getLang() {
  return current;
}

export function setLang(lang) {
  if (!DICTS[lang]) return;
  current = lang;
  try {
    localStorage.setItem(LANG_KEY, lang);
  } catch {
    /* ignore */
  }
}

// Translates a UI string. {name} in the text is replaced with vars.name.
export function t(key, vars = {}) {
  const text = DICTS[current][key] ?? DICTS.nl[key] ?? key;
  return text.replace(/\{(\w+)\}/g, (_, name) => (vars[name] ?? `{${name}}`));
}

// Picks the right language from bilingual content such as { nl: '...', en: '...' }.
export function loc(value, lang = current) {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  return value[lang] ?? value.nl ?? '';
}

export { DICTS };
