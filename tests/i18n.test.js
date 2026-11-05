import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DICTS, loc } from '../js/i18n/index.js';

test('i18n: Dutch and English have the same keys', () => {
  const nl = Object.keys(DICTS.nl).sort();
  const en = Object.keys(DICTS.en).sort();
  assert.deepEqual(en, nl);
});

test('i18n: no empty translations', () => {
  for (const [lang, dict] of Object.entries(DICTS)) {
    for (const [key, value] of Object.entries(dict)) {
      assert.ok(value && value.trim().length > 0, `${lang} ${key} is empty`);
    }
  }
});

test('i18n: loc picks the requested language and falls back to Dutch', () => {
  assert.equal(loc({ nl: 'Hallo', en: 'Hello' }, 'en'), 'Hello');
  assert.equal(loc({ nl: 'Hallo' }, 'en'), 'Hallo');
  assert.equal(loc('tekst', 'en'), 'tekst');
  assert.equal(loc(undefined, 'nl'), '');
});
