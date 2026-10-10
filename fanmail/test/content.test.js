import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildContenido, campaignSettings, extractRegion } from '../src/content.js';
import { publicUrl } from '../src/urls.js';

const s3 = { bucket: 'metalprogpop', region: 'sa-east-1' };

const programs = [
  {
    number: 96,
    parts: [
      { part: 1, album: 'Core', band: 'Stone Temple Pilots', key: 'videos/Programa096-Parte 1-Core.mp4' },
      { part: 3, album: 'She´s So Unusual', band: 'Cyndi Lauper', key: 'videos/Programa096-Parte 3-She´s So Unusual.mp4' },
    ],
    poneRec: { key: 'Poné REC/Poné Rec 96.mp3' },
  },
  {
    number: 97,
    parts: [{ part: 2, album: 'Alas', band: 'Alas', key: 'videos/Programa097-Parte 2-Alas.mp4' }],
    poneRec: null,
  },
];

test('arma URLs como las de los fanmails anteriores', () => {
  assert.equal(
    publicUrl(s3, 'videos/Programa095-Parte 2-Clutching at Straws.mp4'),
    'https://metalprogpop.s3.sa-east-1.amazonaws.com/videos/Programa095-Parte+2-Clutching+at+Straws.mp4',
  );
  assert.equal(
    publicUrl(s3, 'Poné REC/Poné Rec 095.mp3'),
    'https://metalprogpop.s3.sa-east-1.amazonaws.com/Pon%C3%A9+REC/Pon%C3%A9+Rec+095.mp3',
  );
});

test('título, asunto y preview', () => {
  assert.deepEqual(campaignSettings(programs, 'Fanmail'), {
    title: 'Fanmail 96 + 97',
    subject_line: 'FANMAIL 96 + 97',
    preview_text: 'Stone Temple Pilots, Cyndi Lauper, Alas',
  });
});

test('contenido con una sección por programa y Poné Rec solo de los que hay', () => {
  const html = buildContenido(programs, s3);
  assert.match(html, />VIDEOS DEL PROGRAMA 96</);
  assert.match(html, />VIDEOS DEL PROGRAMA 97</);
  assert.match(html, />Parte 3 - Cyndi Lauper - She´s So Unusual</);
  assert.match(html, /href="https:\/\/metalprogpop\.s3\.sa-east-1\.amazonaws\.com\/videos\/Programa096-Parte\+1-Core\.mp4"/);
  assert.match(html, />Poné Rec™ del Programa 96</);
  assert.doesNotMatch(html, /Programa 97<\/a>/);
});

test('escapa HTML en nombres', () => {
  const html = buildContenido([{ number: 1, parts: [{ part: 1, album: 'Rock & <Roll>', band: 'A', key: 'videos/x.mp4' }], poneRec: null }], s3);
  assert.match(html, /Rock &amp; &lt;Roll&gt;/);
});

test('extrae regiones editables entre marcadores', () => {
  const html = 'x<!--fanmail:intro--><div>Hola <b>che</b></div><!--/fanmail:intro-->y';
  assert.equal(extractRegion(html, 'intro'), 'Hola <b>che</b>');
  assert.equal(extractRegion(html, 'cierre'), null);
});
