import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findBand, parseFeedTitles } from '../src/bands.js';

const xml = `<?xml version="1.0"?><rss><channel>
  <title>MetalProgPop Cast</title>
  <item><title>291: La dicha en movimiento - Los Twist</title></item>
  <item><title>290: Alas - Alas</title></item>
  <item><title>289: Un  paso más en la batalla - V8</title></item>
  <item><title>288: She's So Unusual - Cyndi Lauper</title></item>
  <item><title>286: Core - Stone Temple Pilots </title></item>
  <item><title>284: Clutching at Straw - Marillion</title></item>
  <item><title>Episodio especial sin guion</title></item>
  <item><title>12: Asia - Asia</title></item>
</channel></rss>`;

const feed = parseFeedTitles(xml);

test('parsea "N: Álbum - Banda" e ignora títulos sin banda', () => {
  assert.deepEqual(feed[0], { album: 'La dicha en movimiento', band: 'Los Twist' });
  assert.deepEqual(feed[4], { album: 'Core', band: 'Stone Temple Pilots' });
  assert.equal(feed.length, 7);
});

test('matchea con diferencias de espacios, acentos, apóstrofos y typos', () => {
  assert.equal(findBand('Un paso más en la batalla', feed).band, 'V8');
  assert.equal(findBand('She´s So Unusual', feed).band, 'Cyndi Lauper');
  assert.equal(findBand('Clutching at Straws', feed).band, 'Marillion');
  assert.equal(findBand('Alas', feed).band, 'Alas');
});

test('devuelve null si no hay match razonable', () => {
  assert.equal(findBand('The Power and the Glory', feed), null);
  assert.equal(findBand('Cora', feed), null, 'un álbum corto no matchea otro por una letra');
});
