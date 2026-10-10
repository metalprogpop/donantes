// HTML for the "contenido" region, styled like the hand-made fanmails.
import { publicUrl } from './urls.js';

const H1_STYLE =
  'text-align: center;display: block;margin: 0;padding: 0;color: #202020;font-family: Helvetica;font-size: 26px;font-style: normal;font-weight: bold;line-height: 125%;letter-spacing: normal;';
const LI_STYLE = 'mso-line-height-rule: exactly;-ms-text-size-adjust: 100%;-webkit-text-size-adjust: 100%;';
const A_STYLE = `${LI_STYLE}color: #007C89;font-weight: normal;text-decoration: underline;`;

export function escapeHtml(text) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function section(title, links) {
  const items = links
    .map(({ href, text }) => `\t<li style="${LI_STYLE}"><a href="${escapeHtml(href)}" target="_blank" style="${A_STYLE}">${escapeHtml(text)}</a></li>`)
    .join('\n');
  return `<h1 class="mc-toc-title" style="${H1_STYLE}">${escapeHtml(title)}</h1>\n\n<ul>\n${items}\n</ul>\n`;
}

export function buildContenido(programs, s3) {
  const parts = programs.map((p) =>
    section(
      `VIDEOS DEL PROGRAMA ${p.number}`,
      p.parts.map((x) => ({ href: publicUrl(s3, x.key), text: `Parte ${x.part} - ${x.band} - ${x.album}` })),
    ),
  );
  const recs = programs.filter((p) => p.poneRec);
  if (recs.length) {
    parts.push(
      section(
        'PONÉ REC™',
        recs.map((p) => ({ href: publicUrl(s3, p.poneRec.key), text: `Poné Rec™ del Programa ${p.number}` })),
      ),
    );
  }
  return parts.join('\n');
}

export function campaignSettings(programs, titlePrefix) {
  const numbers = programs.map((p) => p.number).join(' + ');
  const bands = [...new Set(programs.flatMap((p) => p.parts.map((x) => x.band)))];
  return {
    title: `${titlePrefix} ${numbers}`,
    subject_line: `${titlePrefix.toUpperCase()} ${numbers}`,
    preview_text: bands.join(', '),
  };
}

// Text between the <!--fanmail:name--> markers that template.html puts
// around each editable region; survives edits in the Mailchimp editor.
export function extractRegion(html, name) {
  const start = `<!--fanmail:${name}-->`;
  const end = `<!--/fanmail:${name}-->`;
  const i = html.indexOf(start);
  const j = html.indexOf(end, i);
  if (i === -1 || j === -1) return null;
  return html.slice(i + start.length, j).replace(/^\s*<div[^>]*>/, '').replace(/<\/div>\s*$/, '');
}
