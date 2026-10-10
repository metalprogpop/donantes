import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parsePoneRecName, parseVideoName, programsLinkedInHtml } from '../src/names.js';

test('parsea nombres de video con y sin padding ni espacios', () => {
  assert.deepEqual(parseVideoName('Programa097-Parte 1-Un paso más en la batalla.mp4'), {
    program: 97,
    part: 1,
    album: 'Un paso más en la batalla',
  });
  assert.deepEqual(parseVideoName('Programa 51-Parte 3-Breakfast in America.mp4'), {
    program: 51,
    part: 3,
    album: 'Breakfast in America',
  });
  assert.deepEqual(parseVideoName('Programa017-Parte 1- Trash.mp4'), { program: 17, part: 1, album: 'Trash' });
});

test('ignora especiales y otros formatos de video', () => {
  assert.equal(parseVideoName('Analisis Shaggs.mp4'), null);
  assert.equal(parseVideoName('Entrevista Chrissy Boy Foreman.mp4'), null);
  assert.equal(parseVideoName('Programa097-Parte 1-Alas.mp3'), null);
});

test('parsea las variantes de Poné Rec', () => {
  assert.deepEqual(parsePoneRecName('Poné Rec 97.mp3'), { program: 97 });
  assert.deepEqual(parsePoneRecName('Poné Rec 095.mp3'), { program: 95 });
  assert.deepEqual(parsePoneRecName('Poné Rec093.mp3'), { program: 93 });
  assert.deepEqual(parsePoneRecName('Poné Rec 96.mp3'), { program: 96 }, 'é descompuesta (NFD)');
});

test('ignora las pruebas de Poné Rec', () => {
  assert.equal(parsePoneRecName('Poné Rec prueba 1.mp3'), null);
});

test('saca los programas linkeados en un fanmail enviado', () => {
  const html = `
    <a href="https://metalprogpop.s3.sa-east-1.amazonaws.com/videos/Programa095-Parte+1-Human.mp4">x</a>
    <a href="https://metalprogpop.s3.sa-east-1.amazonaws.com/Pon%C3%A9+REC/Pon%C3%A9+Rec+094.mp3">x</a>
    <a href="https://open.spotify.com/show/4QlRgUm2JiY71meg8UGpDm">x</a>
    <a href="*|UNSUB|*">x</a>`;
  assert.deepEqual(programsLinkedInHtml(html), [94, 95]);
});
