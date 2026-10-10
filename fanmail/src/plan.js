import { basename, parsePoneRecName, parseVideoName } from './names.js';

// Groups the bucket keys newer than `lastProgram` by program number and
// reports anything that looks like an incomplete upload.
export function buildPlan({ keys, lastProgram, prefixes, partsPerProgram }) {
  const programs = new Map();
  const program = (number) => {
    if (!programs.has(number)) programs.set(number, { number, parts: [], poneRec: null });
    return programs.get(number);
  };

  for (const key of keys) {
    const nfc = key.normalize('NFC');
    if (nfc.startsWith(prefixes.videos.normalize('NFC'))) {
      const video = parseVideoName(basename(key));
      if (video && video.program > lastProgram) {
        program(video.program).parts.push({ part: video.part, album: video.album, key });
      }
    } else if (nfc.startsWith(prefixes.poneRec.normalize('NFC'))) {
      const rec = parsePoneRecName(basename(key));
      if (rec && rec.program > lastProgram) program(rec.program).poneRec = { key };
    }
  }

  const list = [...programs.values()].sort((a, b) => a.number - b.number);
  const problems = [];
  for (const p of list) {
    p.parts.sort((a, b) => a.part - b.part);
    const numbers = p.parts.map((x) => x.part);
    const missing = [];
    for (let i = 1; i <= partsPerProgram; i++) if (!numbers.includes(i)) missing.push(i);
    if (missing.length) problems.push(`Programa ${p.number}: faltan las partes ${missing.join(', ')}`);
    const dupes = numbers.filter((n, i) => numbers.indexOf(n) !== i);
    if (dupes.length) problems.push(`Programa ${p.number}: partes repetidas ${[...new Set(dupes)].join(', ')}`);
    if (!p.poneRec) problems.push(`Programa ${p.number}: falta el Poné Rec`);
  }
  return { programs: list, problems };
}
