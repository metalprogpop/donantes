#!/usr/bin/env node
// Arma el draft del próximo fanmail: detecta lo nuevo en S3, lo hace público
// y crea la campaña en Mailchimp. Nunca envía nada.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { createInterface } from 'node:readline/promises';
import { findBand, parseFeedTitles } from './bands.js';
import { buildContenido, campaignSettings, extractRegion } from './content.js';
import { createMailchimp } from './mailchimp.js';
import { programsLinkedInHtml } from './names.js';
import { buildPlan } from './plan.js';
import { createS3 } from './s3.js';
import { publicUrl } from './urls.js';

const root = join(import.meta.dirname, '..');
const config = JSON.parse(readFileSync(join(root, 'config.json'), 'utf8'));

const { values: args } = parseArgs({
  options: {
    'dry-run': { type: 'boolean', default: false },
    'allow-incomplete': { type: 'boolean', default: false },
    replace: { type: 'boolean', default: false },
    help: { type: 'boolean', short: 'h', default: false },
  },
});

if (args.help) {
  console.log(`Uso: npm start -- [opciones]

  --dry-run           Muestra el plan y sale, sin tocar S3 ni Mailchimp
  --allow-incomplete  Sigue aunque falten partes o Poné Rec de algún programa
  --replace           Si ya hay un draft para estos programas, regenera los links
                      (conserva la intro y el cierre que hayas escrito)`);
  process.exit(0);
}

// One interface per question: a shared one closes early when stdin is piped.
const ask = async (q) => {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    return await rl.question(q);
  } finally {
    rl.close();
  }
};
const fail = (msg) => {
  console.error(`\n✖ ${msg}`);
  process.exit(1);
};

try {
  process.loadEnvFile(join(root, '.env'));
} catch {
  // la key puede venir del entorno
}
if (!process.env.MAILCHIMP_API_KEY) fail('Falta MAILCHIMP_API_KEY (en fanmail/.env)');

const mc = createMailchimp(process.env.MAILCHIMP_API_KEY);
const s3 = createS3(config.aws);
const prefix = config.mailchimp.campaignTitlePrefix;
const isFanmail = (c) => c.settings.title?.toLowerCase().startsWith(prefix.toLowerCase());

// 1. Último programa ya enviado
const sent = (await mc.campaigns({ status: 'sent' })).filter(isFanmail).slice(0, 3);
if (!sent.length) fail(`No encontré campañas enviadas cuyo título empiece con "${prefix}"`);
const linked = (await Promise.all(sent.map((c) => mc.contentHtml(c.id)))).flatMap(programsLinkedInHtml);
const lastProgram = Math.max(...linked);
console.log(`Último fanmail enviado: "${sent[0].settings.title}" (último programa linkeado: ${lastProgram})`);

// 2. Lo nuevo en S3
const keys = await s3.listKeys();
const { programs, problems } = buildPlan({
  keys,
  lastProgram,
  prefixes: config.prefixes,
  partsPerProgram: config.partsPerProgram,
});
if (!programs.length) {
  console.log(`\nNo hay nada nuevo en S3 después del programa ${lastProgram}.`);
  process.exit(0);
}

// 3. Bandas desde el RSS
const feed = parseFeedTitles(await (await fetch(config.rssUrl)).text());
for (const p of programs) {
  for (const part of p.parts) {
    const match = findBand(part.album, feed);
    if (match) {
      part.band = match.band;
    } else {
      if (!process.stdin.isTTY) fail(`No encontré la banda de "${part.album}" (programa ${p.number}) en el RSS`);
      part.band = (await ask(`¿Banda de "${part.album}" (programa ${p.number}, parte ${part.part})? `)).trim();
    }
  }
}

const settings = campaignSettings(programs, prefix);
const contenido = buildContenido(programs, config.aws);
const objects = programs.flatMap((p) => [...p.parts.map((x) => x.key), ...(p.poneRec ? [p.poneRec.key] : [])]);
const publicState = await Promise.all(objects.map((key) => s3.isPublic(key)));

// 4. Plan
console.log(`\n── Plan ─────────────────────────────────────────`);
console.log(`Título:  ${settings.title}\nAsunto:  ${settings.subject_line}\nPreview: ${settings.preview_text}\n`);
for (const p of programs) {
  console.log(`VIDEOS DEL PROGRAMA ${p.number}`);
  for (const x of p.parts) console.log(`  Parte ${x.part} - ${x.band} - ${x.album}`);
}
console.log('PONÉ REC™');
for (const p of programs.filter((x) => x.poneRec)) console.log(`  Poné Rec™ del Programa ${p.number}`);
console.log('\nObjetos en S3:');
objects.forEach((key, i) => console.log(`  ${publicState[i] ? 'ya público ' : 'HACER PÚBLICO'}  ${key}`));

if (problems.length) {
  console.log('\nProblemas:');
  for (const p of problems) console.log(`  ⚠ ${p}`);
  if (!args['allow-incomplete']) fail('Hay programas incompletos. Esperá a que termine la subida o corré con --allow-incomplete.');
}

const drafts = (await mc.campaigns({ status: 'save' })).filter((c) => c.settings.title === settings.title);
if (drafts.length && !args.replace) {
  fail(`Ya existe un draft "${settings.title}": ${mc.editUrl(drafts[0].web_id)}\n  Corré con --replace para regenerar sus links.`);
}

if (args['dry-run']) {
  console.log('\n(dry-run: no se tocó nada)');
  process.exit(0);
}

const answer = (await ask(`\n¿Aplico los cambios y ${drafts.length ? 'actualizo el' : 'creo el'} draft? [s/N] `)).trim().toLowerCase();
if (answer !== 's' && answer !== 'si' && answer !== 'sí') fail('Cancelado, no se tocó nada.');

// 5. ACLs + verificación anónima
for (const [i, key] of objects.entries()) {
  if (!publicState[i]) {
    await s3.makePublic(key);
    console.log(`✔ público: ${key}`);
  }
}
for (const key of objects) {
  const res = await fetch(publicUrl(config.aws, key), { method: 'HEAD' });
  if (!res.ok) fail(`El link no responde (${res.status}): ${publicUrl(config.aws, key)}`);
}
console.log(`✔ los ${objects.length} links responden sin credenciales`);

// 6. Template + draft
const templateId = await mc.upsertTemplate(config.mailchimp.templateName, readFileSync(join(root, 'template.html'), 'utf8'));
const campaignSettingsBody = {
  ...settings,
  from_name: config.mailchimp.fromName,
  reply_to: config.mailchimp.replyTo,
  template_id: templateId,
};

let campaign;
const sections = { contenido };
if (drafts.length) {
  campaign = drafts[0];
  const html = await mc.contentHtml(campaign.id);
  for (const name of ['intro', 'cierre']) {
    const kept = extractRegion(html, name);
    if (kept !== null) sections[name] = kept;
  }
  await mc.updateCampaignSettings(campaign.id, campaignSettingsBody);
} else {
  campaign = await mc.createCampaign({ listId: config.mailchimp.listId, settings: campaignSettingsBody });
}
await mc.setTemplateContent(campaign.id, templateId, sections);

console.log(`\n✔ Draft listo: ${mc.editUrl(campaign.web_id)}`);
console.log('  Falta escribir la intro (reemplazá "[ESCRIBIR INTRO]") y enviarlo desde Mailchimp.');
