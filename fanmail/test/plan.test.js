import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildPlan } from '../src/plan.js';

const prefixes = { videos: 'videos/', poneRec: 'Poné REC/' };
const base = { prefixes, partsPerProgram: 3, lastProgram: 95 };

const keys = [
  'videos/Programa095-Parte 1-Human.mp4',
  'videos/Programa096-Parte 2-The Power and the Glory.mp4',
  'videos/Programa096-Parte 1-Core.mp4',
  'videos/Programa096-Parte 3-She´s So Unusual.mp4',
  'videos/The Shaggs reacción.mp4',
  'Audios/Programa096-Parte 1-Core.mp3',
  'Poné REC/Poné Rec 96.mp3',
  'Poné REC/Poné Rec prueba 1.mp3',
  'Poné REC/Poné Rec 095.mp3',
];

test('agrupa lo posterior al último programa y ordena las partes', () => {
  const { programs, problems } = buildPlan({ ...base, keys });
  assert.equal(programs.length, 1);
  assert.equal(programs[0].number, 96);
  assert.deepEqual(programs[0].parts.map((p) => p.part), [1, 2, 3]);
  assert.equal(programs[0].poneRec.key, 'Poné REC/Poné Rec 96.mp3');
  assert.deepEqual(problems, []);
});

test('reporta partes y Poné Rec faltantes', () => {
  const { problems } = buildPlan({ ...base, keys: ['videos/Programa097-Parte 2-Alas.mp4'] });
  assert.deepEqual(problems, ['Programa 97: faltan las partes 1, 3', 'Programa 97: falta el Poné Rec']);
});

test('reporta un Poné Rec sin videos', () => {
  const { problems } = buildPlan({ ...base, keys: ['Poné REC/Poné Rec 97.mp3'] });
  assert.deepEqual(problems, ['Programa 97: faltan las partes 1, 2, 3']);
});

test('acepta claves con é descompuesta', () => {
  const { programs } = buildPlan({ ...base, keys: ['Poné REC/Poné Rec 96.mp3'] });
  assert.equal(programs[0].poneRec.key, 'Poné REC/Poné Rec 96.mp3');
});
