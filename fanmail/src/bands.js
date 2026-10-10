import { XMLParser } from 'fast-xml-parser';

// Feed episode titles look like "291: La dicha en movimiento - Los Twist".
export function parseFeedTitles(xml) {
  const parser = new XMLParser({ ignoreAttributes: true, isArray: (name) => name === 'item' });
  const items = parser.parse(xml)?.rss?.channel?.item ?? [];
  return items
    .map((item) => String(item.title ?? '').replace(/^\s*\d+\s*:\s*/, ''))
    .map((title) => {
      const sep = title.lastIndexOf(' - ');
      if (sep === -1) return null;
      return { album: title.slice(0, sep).trim(), band: title.slice(sep + 3).trim() };
    })
    .filter(Boolean);
}

export function normalize(text) {
  return text
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .replace(/['´`’]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function levenshtein(a, b) {
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const curr = [i];
    for (let j = 1; j <= b.length; j++) {
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = curr;
  }
  return prev[b.length];
}

export function similarity(a, b) {
  const [x, y] = [normalize(a), normalize(b)];
  if (!x || !y) return 0;
  return 1 - levenshtein(x, y) / Math.max(x.length, y.length);
}

// Feed is newest first, so on ties the most recent episode wins (albums
// like "Asia" can repeat across the catalog).
export function findBand(album, feedEntries, threshold = 0.85) {
  let best = null;
  for (const entry of feedEntries) {
    const score = similarity(album, entry.album);
    if (score >= threshold && (!best || score > best.score)) best = { ...entry, score };
  }
  return best;
}
