/**
 * Idioma del texto (SPEC F1.5): los metadatos de los PDF mienten con frecuencia (InDesign declara `en-US` por defecto
 * aunque el documento esté en español). Detector mínimo por palabras funcionales, sin dependencias ni red.
 * Solo distingue los idiomas de esta tabla; ante la duda devuelve `null` y se conserva el idioma declarado.
 */
const STOPWORDS = {
  es: 'de la que el en los se del las un por con no una su para es al lo como más pero sus le ya este sí porque esta entre cuando muy sin sobre también me hasta hay donde quien desde todo nos durante son está ser fue han',
  en: 'the of and to in is that for it as with was on be by this are at from or an have not but you which we can all their has more will one its our also been they were your than into',
  pt: 'de que não uma os no se na por mais as dos como mas foi ao ele das tem seu sua ou ser quando muito nos já está também só pelo pela até isso ela entre com para são em do da um é',
  fr: 'de la le et les des en un du une que est pour qui dans par plus pas au sur ne se ce il sont avec ou comme mais nous vous leur son cette ces aux été être fait qu',
  it: 'di il la che in per un è con non una del le si da dei più come ma al lo sono gli nel alla anche della delle questo suo ha tra quando cui',
  de: 'der die und in den von zu das mit sich des auf für ist im dem nicht ein eine als auch es an werden aus er hat dass sie nach wird bei um am sind noch wie einem einer zur',
};
export const LANGUAGE_NAMES = { es: 'español', en: 'inglés', pt: 'portugués', fr: 'francés', it: 'italiano', de: 'alemán' };

const SETS = Object.fromEntries(Object.entries(STOPWORDS).map(([k, v]) => [k, new Set(v.split(' ').filter((w) => w.length > 1))]));
const MAX_CHARS = 60_000;
const MIN_TOKENS = 80;
/** Parte mínima de palabras funcionales del idioma ganador (la prosa suele rondar el 35-45 %). */
const MIN_SHARE = 0.18;
/** El ganador debe superar al segundo por este factor. */
const MIN_MARGIN = 1.35;

/** Devuelve `{ code, share }` del idioma más probable de `texts` (cadenas, p. ej. una por página) o `null` si no es fiable. */
export function detectLanguage(texts) {
  let sample = '';
  for (const t of texts) {
    if (typeof t !== 'string') continue;
    sample += `${t}\n`;
    if (sample.length >= MAX_CHARS) break;
  }
  const tokens = sample.toLowerCase().match(/\p{L}+/gu) ?? [];
  if (tokens.length < MIN_TOKENS) return null;
  const scores = Object.entries(SETS).map(([code, set]) => {
    let hits = 0;
    for (const w of tokens) if (set.has(w)) hits++;
    return { code, share: hits / tokens.length };
  }).sort((a, b) => b.share - a.share);
  const [best, second] = scores;
  if (best.share < MIN_SHARE || best.share < second.share * MIN_MARGIN) return null;
  return best;
}
