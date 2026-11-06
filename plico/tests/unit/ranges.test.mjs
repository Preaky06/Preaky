import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseRanges, rangesToIndices, chunkRanges } from '../../src/assets/js/ranges.mjs';

test('plages simples et ouvertes', () => {
  assert.deepEqual(parseRanges('1-3, 5, 8-', 10), [{ start: 1, end: 3 }, { start: 5, end: 5 }, { start: 8, end: 10 }]);
  assert.deepEqual(parseRanges('-2', 4), [{ start: 1, end: 2 }]);
  assert.deepEqual(parseRanges(' 2 – 4 ; 6 ', 6), [{ start: 2, end: 4 }, { start: 6, end: 6 }]);
});

test('erreurs explicites', () => {
  assert.throws(() => parseRanges('', 3), /au moins une page/);
  assert.throws(() => parseRanges('4', 3), /n’existe pas/);
  assert.throws(() => parseRanges('3-1', 3), /précéder/);
  assert.throws(() => parseRanges('a-b', 3), /invalide/);
  assert.throws(() => parseRanges('0', 3), /commencent à 1/);
});

test('indices sans doublons, ordre conservé', () => {
  assert.deepEqual(rangesToIndices(parseRanges('3, 1-3', 3)), [2, 0, 1]);
});

test('découpe toutes les N pages', () => {
  assert.deepEqual(chunkRanges(5, 2), [{ start: 1, end: 2 }, { start: 3, end: 4 }, { start: 5, end: 5 }]);
});
