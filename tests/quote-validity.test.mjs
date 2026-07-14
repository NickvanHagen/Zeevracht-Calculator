import assert from 'node:assert/strict';
import { getQuoteValidityInfo } from '../.tmp/test-build/src/utils/quoteValidity.js';

const today = new Date(2026, 6, 14);
const activeStatuses = new Set(['Open', 'Verzonden', 'In behandeling']);

const openKpiCount = (quotes) =>
  quotes.filter((quote) => activeStatuses.has(getQuoteValidityInfo(quote.validUntil, quote.status, today).effectiveStatus)).length;

assert.equal(getQuoteValidityInfo('', 'Open', today).effectiveStatus, 'Open', 'offerte zonder geldigheidsdatum blijft werken');
assert.equal(getQuoteValidityInfo('2026-07-20', 'Open', today).tone, 'normal', 'offerte ruim geldig is normaal');
assert.equal(getQuoteValidityInfo('2026-07-14', 'Open', today).effectiveStatus, 'Open', 'vandaag verloopt nog niet');
assert.equal(getQuoteValidityInfo('2026-07-14', 'Open', today).message, 'Vandaag laatste geldige dag');
assert.equal(getQuoteValidityInfo('2026-07-15', 'Open', today).message, 'Verloopt over 1 dag', 'morgen verlopen toont waarschuwing');
assert.equal(getQuoteValidityInfo('2026-07-17', 'Open', today).message, 'Verloopt over 3 dagen', 'drie dagen toont waarschuwing');
assert.equal(getQuoteValidityInfo('2026-07-13', 'Open', today).effectiveStatus, 'Verlopen', 'actieve offerte na datum verloopt');
assert.equal(getQuoteValidityInfo('2026-07-13', 'Gewonnen', today).effectiveStatus, 'Gewonnen', 'gewonnen offerte verloopt niet automatisch');
assert.equal(getQuoteValidityInfo('2026-07-13', 'Verloren', today).effectiveStatus, 'Verloren', 'verloren offerte verloopt niet automatisch');
assert.equal(getQuoteValidityInfo('2026-07-20', 'Open', today).effectiveStatus, 'Open', 'verlengen herstelt actieve status automatisch');
assert.equal(
  openKpiCount([
    { status: 'Open', validUntil: '2026-07-13' },
    { status: 'Open', validUntil: '2026-07-14' },
    { status: 'Verzonden', validUntil: '2026-07-15' },
    { status: 'Gewonnen', validUntil: '2026-07-13' },
  ]),
  2,
  'KPI Open offertes telt verlopen offertes niet mee',
);

console.log('Quote validity tests passed');
