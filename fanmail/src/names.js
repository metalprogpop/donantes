// Parsing of S3 object names. Uploads are inconsistent ("Poné Rec 97",
// "Poné Rec 095", "Poné Rec093", "Programa 51-Parte 1-..."), so the
// patterns are lenient about spaces and zero padding.

const VIDEO_RE = /^Programa\s*0*(\d+)\s*-\s*Parte\s*(\d+)\s*-\s*(.+?)\s*\.mp4$/i;
const PONE_REC_RE = /^Pon[eé]\s*Rec\s*0*(\d+)\s*\.mp3$/i;

export function basename(key) {
  return key.split('/').pop();
}

export function parseVideoName(name) {
  const m = name.normalize('NFC').match(VIDEO_RE);
  if (!m) return null;
  return { program: Number(m[1]), part: Number(m[2]), album: m[3] };
}

export function parsePoneRecName(name) {
  const m = name.normalize('NFC').match(PONE_REC_RE);
  if (!m) return null;
  return { program: Number(m[1]) };
}

// Program numbers linked from a sent fanmail (videos and Poné Rec links).
export function programsLinkedInHtml(html) {
  const programs = new Set();
  for (const [, href] of html.matchAll(/href="(https?:\/\/[^"]*amazonaws\.com\/[^"]+)"/g)) {
    let name;
    try {
      name = decodeURIComponent(basename(new URL(href).pathname).replace(/\+/g, ' '));
    } catch {
      continue;
    }
    const parsed = parseVideoName(name) ?? parsePoneRecName(name);
    if (parsed) programs.add(parsed.program);
  }
  return [...programs].sort((a, b) => a - b);
}
