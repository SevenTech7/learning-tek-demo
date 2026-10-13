/*
 * Conversión de un PDF pequeño en el navegador (solo la demostración publicada).
 *
 * El producto convierte en un contenedor con Poppler (ADR-0003) y el paquete no lleva motor de PDF (ADR-0004). Aquí, para
 * que quien visita la demostración pueda probar su propio archivo sin servidor, pdf.js hace en su navegador el trabajo de
 * Poppler y el resultado es el MISMO modelo que consume el visor: una imagen (más una ampliada) y una miniatura por página,
 * texto con posiciones, enlaces, índice y numeración impresa. El visor no se toca y el paquete resultante tampoco lleva pdf.js.
 *
 * Nada sale del navegador: el archivo se lee en memoria, se convierte en un worker y se descarta al recargar.
 * Es una versión reducida a propósito (límites duros, sin índice reconstruido ni marca): ver demo/README.md.
 */
import { FORMAT_VERSION, GENERATOR, DEFAULT_VIEWER, DEFAULT_COLORS } from './formato.js';
import { detectLanguage } from './lang.js';

/**
 * Safari (WebKit) no implementa la iteración asíncrona de `ReadableStream` (`for await (const x of stream)`), que pdf.js usa en
 * `getTextContent()`: sin esto el texto salía vacío en Safari y en iOS, sin ningún error visible. Se añade solo si falta.
 */
if (typeof ReadableStream !== 'undefined' && !ReadableStream.prototype[Symbol.asyncIterator]) {
  ReadableStream.prototype[Symbol.asyncIterator] = function iteradorAsincrono() {
    const reader = this.getReader();
    return {
      async next() {
        const r = await reader.read();
        if (r.done) reader.releaseLock();
        return r;
      },
      async return(value) {
        const cancelacion = reader.cancel(value);
        reader.releaseLock();
        await cancelacion;
        return { done: true, value };
      },
      [Symbol.asyncIterator]() { return this; },
    };
  };
}

export const LIMITES = Object.freeze({
  maxBytes: 1024 * 1024,   // 1 MB
  maxPages: 6,
  maxSide: 1600,           // lado mayor de la imagen de página, en px (igual que `--max-side` por defecto)
  zoomSide: 2400,          // imagen ampliada: menos que los 3200 px del producto para no agotar la memoria de un móvil
  thumbSize: 200,          // ancho de la miniatura, en px
  maxPixels: 12_000_000,   // tope por lienzo: un PDF con una página gigante no debe poder agotar la memoria
  maxImagePixels: 30_000_000, // tope de una imagen incrustada ya decodificada (un escaneado a 600 ppp en A4 son ≈ 35 Mpx en bilevel)
  timeoutMs: 90_000,       // tiempo total de la conversión
});

/** Error con un código estable y un mensaje listo para mostrar a quien visita la demostración. */
export class ErrorDemo extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'ErrorDemo';
    this.code = code;
  }
}

const MB = 1024 * 1024;
const formatMb = (bytes) => `${(bytes / MB).toLocaleString('es', { maximumFractionDigits: 1 })} MB`;

/** Cabecera `%PDF-` dentro de los primeros 1024 bytes (lo que admite la especificación). */
export function esPdf(bytes) {
  const n = Math.min(bytes.length - 4, 1024);
  for (let i = 0; i <= n; i++) {
    if (bytes[i] === 0x25 && bytes[i + 1] === 0x50 && bytes[i + 2] === 0x44 && bytes[i + 3] === 0x46 && bytes[i + 4] === 0x2d) return true;
  }
  return false;
}

export function slugify(s) {
  const slug = String(s).normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return slug || 'libro';
}

/** Suma de comprobación corta (FNV-1a de 32 bits): solo distingue un libro de otro para la clave de la ayuda inicial. */
function fnv(text) {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(16).padStart(8, '0');
}

const round1 = (n) => Math.round(n * 10) / 10;
const permille = (v, total) => Math.max(0, Math.min(1000, round1((v / total) * 1000)));

/** Producto de matrices 2×3 de PDF (la misma composición que `Util.transform` de pdf.js). */
const mul = (a, b) => [
  a[0] * b[0] + a[2] * b[1], a[1] * b[0] + a[3] * b[1],
  a[0] * b[2] + a[2] * b[3], a[1] * b[2] + a[3] * b[3],
  a[0] * b[4] + a[2] * b[5] + a[4], a[1] * b[4] + a[3] * b[5] + a[5],
];
const apply = (m, x, y) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];

/** Palabras con su caja: `{ text, boxes }` en el formato de `data/text.js` (cajas en milésimas de página, `[inicio, largo, x, y, ancho, alto]`). */
export function extraerTexto(content, vp) {
  let text = '';
  const boxes = [];
  const W = vp.width;
  const H = vp.height;
  for (const it of content.items) {
    if (typeof it.str !== 'string' || !it.str.trim() || !Array.isArray(it.transform)) continue;
    const [a, b, c, d, e, f] = it.transform;
    const len = it.str.length;
    const span = Math.hypot(a, b) || 1;
    const ux = a / span;   // sentido del texto, en espacio de usuario
    const uy = b / span;
    const advance = it.width || 0;
    const re = /\S+/g;
    let m;
    while ((m = re.exec(it.str))) {
      const word = m[0].normalize('NFKC');
      const t0 = m.index / len;
      const t1 = (m.index + m[0].length) / len;
      // Esquinas de la palabra en espacio de usuario: de la línea base hacia arriba 0,88 del cuerpo y hacia abajo 0,22 (como las cajas de pdftotext).
      const x0 = e + ux * advance * t0;
      const y0 = f + uy * advance * t0;
      const x1 = e + ux * advance * t1;
      const y1 = f + uy * advance * t1;
      const corners = [
        apply(vp.transform, x0 + c * 0.88, y0 + d * 0.88),
        apply(vp.transform, x1 + c * 0.88, y1 + d * 0.88),
        apply(vp.transform, x1 - c * 0.22, y1 - d * 0.22),
        apply(vp.transform, x0 - c * 0.22, y0 - d * 0.22),
      ];
      const xs = corners.map((p) => p[0]);
      const ys = corners.map((p) => p[1]);
      const left = Math.min(...xs);
      const top = Math.min(...ys);
      const bx = permille(left, W);
      const by = permille(top, H);
      const bw = permille(Math.max(...xs) - left, W);
      const bh = permille(Math.max(...ys) - top, H);
      if (text) text += ' ';
      boxes.push([text.length, word.length, bx, by, bw, bh]);
      text += word;
    }
  }
  return { text, boxes };
}

const URL_PERMITIDA = /^(https?:|mailto:)/i;

async function paginaDeDestino(pdf, dest, cache) {
  const key = typeof dest === 'string' ? `n:${dest}` : null;
  if (key && cache.has(key)) return cache.get(key);
  let page = null;
  try {
    const d = typeof dest === 'string' ? await pdf.getDestination(dest) : dest;
    const ref = Array.isArray(d) ? d[0] : null;
    if (ref && typeof ref === 'object') page = (await pdf.getPageIndex(ref)) + 1;
    else if (Number.isInteger(ref)) page = ref + 1;
  } catch { page = null; }
  if (key) cache.set(key, page);
  return page;
}

/** Enlaces de la página en el formato de `pages.json`: `{ rect: [x, y, ancho, alto] (milésimas), page | url }`. */
async function extraerEnlaces(pdf, page, vp, total, cache) {
  const out = [];
  let annots = [];
  try { annots = await page.getAnnotations({ intent: 'display' }); } catch (e) { console.warn('[tekleaf-demo] no se pudieron leer los enlaces:', e); return out; }
  for (const a of annots) {
    if (a.subtype !== 'Link' || !Array.isArray(a.rect)) continue;
    // Con la matriz de la vista y no con `convertToViewportRectangle`: así no depende de un método que cambia entre versiones.
    const [x1, y1] = apply(vp.transform, a.rect[0], a.rect[1]);
    const [x2, y2] = apply(vp.transform, a.rect[2], a.rect[3]);
    const left = Math.min(x1, x2);
    const top = Math.min(y1, y2);
    const rect = [permille(left, vp.width), permille(top, vp.height), permille(Math.abs(x2 - x1), vp.width), permille(Math.abs(y2 - y1), vp.height)];
    if (rect[2] <= 0 || rect[3] <= 0) continue;
    if (typeof a.url === 'string' && URL_PERMITIDA.test(a.url)) out.push({ rect, url: a.url });
    else if (a.dest) {
      const target = await paginaDeDestino(pdf, a.dest, cache);
      if (target && target >= 1 && target <= total) out.push({ rect, page: target });
    }
  }
  return out;
}

async function extraerIndice(pdf, total, cache) {
  let outline = null;
  try { outline = await pdf.getOutline(); } catch { return []; }
  const walk = async (items, depth) => {
    const out = [];
    for (const it of items ?? []) {
      if (depth > 6 || out.length >= 200) break;
      const title = String(it.title ?? '').replace(/\s+/g, ' ').trim().slice(0, 200);
      const page = it.dest ? await paginaDeDestino(pdf, it.dest, cache) : null;
      const children = await walk(it.items, depth + 1);
      if (title && page && page >= 1 && page <= total) out.push({ title, page, ...(children.length ? { children } : {}) });
      else out.push(...children);
    }
    return out;
  };
  return walk(outline, 0);
}

function aBlob(canvas, type, quality) {
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('No se pudo codificar la imagen.'))), type, quality));
}

/** ¿Codifica este navegador WebP desde un lienzo? (Safari devuelve PNG.) Se decide una sola vez. */
async function soportaWebp() {
  try {
    const c = document.createElement('canvas');
    c.width = c.height = 2;
    return (await aBlob(c, 'image/webp', 0.8)).type === 'image/webp';
  } catch { return false; }
}

function lienzo(width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));
  return canvas;
}

/** Escala para que el lado mayor mida `side` px, sin pasar de `maxPixels` ni ampliar de más una página diminuta. */
export function escalaPara(widthPt, heightPt, side) {
  let scale = side / Math.max(widthPt, heightPt, 1);
  const pixels = widthPt * scale * heightPt * scale;
  if (pixels > LIMITES.maxPixels) scale *= Math.sqrt(LIMITES.maxPixels / pixels);
  return scale;
}

function traducirError(e) {
  const name = e && e.name;
  if (e instanceof ErrorDemo) return e;
  console.error('[tekleaf-demo] la conversión falló:', e);   // sin esto, un fallo inesperado solo diría «no se pudo convertir»
  if (name === 'PasswordException') return new ErrorDemo('ENCRYPTED', 'Ese PDF está protegido con contraseña y esta demostración no puede abrirlo.');
  if (name === 'InvalidPDFException' || name === 'MissingPDFException' || name === 'FormatError' || name === 'XRefParseException') {
    return new ErrorDemo('BAD_PDF', 'No se pudo leer ese archivo como PDF. Puede estar dañado.');
  }
  return new ErrorDemo('FAILED', 'No se pudo convertir ese PDF. Prueba con otro archivo.');
}

/**
 * Convierte un PDF (File o Blob) en el modelo de publicación de TekLeaf.
 *
 * `pdfjs`: el módulo ya cargado. `rutas`: opciones de `getDocument` con las direcciones de cmaps, fuentes estándar y wasm.
 * `progreso({ fase, pagina, total })` se llama al avanzar. `signal` (AbortSignal) detiene la conversión en cualquier momento,
 * incluso a mitad de una página: aborta el worker de pdf.js. Con `signal.reason === 'timeout'` el error es `TIMEOUT`.
 *
 * Devuelve `{ config, pagesData, text, files, resumen }`: `files` es un `Map<ruta, Blob>` con las rutas relativas del paquete
 * (`images/page-001.webp`…) y `pagesData.pages[].image` etc. apuntan a ellas, igual que en un paquete exportado.
 */
export async function convertirPdf(file, { pdfjs, rutas = {}, progreso = () => {}, signal = null, nombre = '' } = {}) {
  if (!file || !file.size) throw new ErrorDemo('EMPTY', 'Ese archivo está vacío.');
  if (file.size > LIMITES.maxBytes) {
    throw new ErrorDemo('TOO_BIG', `Ese archivo pesa ${formatMb(file.size)} y esta demostración admite PDF de hasta 1 MB.`);
  }
  progreso({ fase: 'leer' });
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!esPdf(bytes)) throw new ErrorDemo('NOT_PDF', 'Ese archivo no parece un PDF.');

  const task = pdfjs.getDocument({
    data: bytes,
    ...rutas,
    isEvalSupported: false,   // CVE-2024-4367 y sucesores: ninguna ruta de pdf.js debe llegar a `new Function`
    enableXfa: false,
    disableAutoFetch: true,
    maxImageSize: LIMITES.maxImagePixels,   // una imagen declarada enorme en un PDF de pocos KB no debe decodificarse
    verbosity: 0,
  });
  const detener = () => { try { task.destroy(); } catch { /* ya liberado */ } };
  if (signal) {
    if (signal.aborted) detener();
    else signal.addEventListener('abort', detener, { once: true });
  }
  try {
    let pdf;
    try { pdf = await task.promise; } catch (e) { throw traducirError(e); }
    const total = pdf.numPages;
    if (total > LIMITES.maxPages) {
      throw new ErrorDemo('TOO_MANY_PAGES', `Ese PDF tiene ${total} páginas y esta demostración admite hasta ${LIMITES.maxPages}.`);
    }

    const webp = await soportaWebp();
    const ext = webp ? 'webp' : 'jpg';
    const encode = (canvas, quality) => (webp ? aBlob(canvas, 'image/webp', quality) : aBlob(canvas, 'image/jpeg', Math.min(0.92, quality + 0.1)));

    const files = new Map();
    const pages = [];
    const texts = [];
    const destinos = new Map();
    let labels = null;
    try { labels = await pdf.getPageLabels(); } catch { labels = null; }

    for (let n = 1; n <= total; n++) {
      if (signal && signal.aborted) throw new ErrorDemo('CANCELLED', 'Conversión cancelada.');
      progreso({ fase: 'pagina', pagina: n, total });
      const page = await pdf.getPage(n);
      const vp1 = page.getViewport({ scale: 1 });
      const stem = `page-${String(n).padStart(3, '0')}`;
      const rec = {
        number: n,
        label: labels && labels[n - 1] ? String(labels[n - 1]) : String(n),
        width: Math.round(vp1.width * 100) / 100,
        height: Math.round(vp1.height * 100) / 100,
      };

      // Imagen de la página
      const vp = page.getViewport({ scale: escalaPara(vp1.width, vp1.height, LIMITES.maxSide) });
      const canvas = lienzo(vp.width, vp.height);
      const ctx = canvas.getContext('2d', { alpha: false });
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      await page.render({ canvasContext: ctx, canvas, viewport: vp }).promise;
      files.set(`images/${stem}.${ext}`, await encode(canvas, 0.8));
      rec.image = `images/${stem}.${ext}`;

      // Miniatura (a partir de la imagen ya dibujada)
      const th = lienzo(LIMITES.thumbSize, (LIMITES.thumbSize * canvas.height) / canvas.width);
      const tctx = th.getContext('2d', { alpha: false });
      tctx.imageSmoothingQuality = 'high';
      tctx.drawImage(canvas, 0, 0, th.width, th.height);
      files.set(`thumbnails/${stem}.jpg`, await aBlob(th, 'image/jpeg', 0.7));
      rec.thumbnail = `thumbnails/${stem}.jpg`;
      th.width = th.height = 0;
      canvas.width = canvas.height = 0;

      // Imagen ampliada: solo si aporta (el producto exige ×1,25)
      const zs = escalaPara(vp1.width, vp1.height, LIMITES.zoomSide);
      if (zs >= vp.scale * 1.25) {
        const zvp = page.getViewport({ scale: zs });
        const zc = lienzo(zvp.width, zvp.height);
        const zctx = zc.getContext('2d', { alpha: false });
        zctx.fillStyle = '#fff';
        zctx.fillRect(0, 0, zc.width, zc.height);
        await page.render({ canvasContext: zctx, canvas: zc, viewport: zvp }).promise;
        files.set(`zoom/${stem}.${ext}`, await encode(zc, 0.76));
        rec.zoomImage = `zoom/${stem}.${ext}`;
        zc.width = zc.height = 0;
      }

      // Texto y enlaces
      let content = { items: [] };
      try { content = await page.getTextContent(); } catch (e) { console.warn(`[tekleaf-demo] no se pudo leer el texto de la página ${n}:`, e); }
      texts.push(extraerTexto(content, vp1));
      rec.links = await extraerEnlaces(pdf, page, vp1, total, destinos);
      pages.push(rec);
      page.cleanup();
    }

    const toc = await extraerIndice(pdf, total, destinos);
    let info = {};
    try { info = (await pdf.getMetadata()).info ?? {}; } catch { info = {}; }

    const hasText = texts.some((t) => t.text.length > 0);
    const fromText = hasText ? detectLanguage(texts.map((t) => t.text)) : null;
    const declared = typeof info.Language === 'string' ? info.Language.slice(0, 2).toLowerCase() : '';
    const language = fromText?.code || declared || 'es';
    const fileTitle = String(nombre || file.name || '').replace(/\.pdf$/i, '').replace(/[_-]+/g, ' ').trim();
    const title = (typeof info.Title === 'string' && info.Title.trim() ? info.Title.trim() : fileTitle || 'Mi PDF').slice(0, 120);
    const author = typeof info.Author === 'string' ? info.Author.trim().slice(0, 120) : '';

    const config = {
      formatVersion: FORMAT_VERSION,
      generator: GENERATOR,
      publication: {
        id: `${slugify(title)}-${fnv(`${title}|${total}|${file.size}`)}`,
        title,
        author,
        language,
        pageCount: total,
        createdAt: new Date().toISOString(),
      },
      viewer: { ...DEFAULT_VIEWER, search: hasText },
      branding: { logo: '', colors: { ...DEFAULT_COLORS } },
      embed: { allowedOrigins: ['*'] },
    };
    const pagesData = { formatVersion: FORMAT_VERSION, pages, toc, ...(toc.length ? { tocSource: 'outline' } : {}) };
    const text = hasText ? { formatVersion: FORMAT_VERSION, pages: texts } : null;

    return { config, pagesData, text, files, resumen: { title, pages: total, bytes: file.size, language, hasText, toc: toc.length } };
  } catch (e) {
    if (signal && signal.aborted) {
      throw signal.reason === 'timeout'
        ? new ErrorDemo('TIMEOUT', 'La conversión tardó demasiado. Prueba con un PDF más sencillo.')
        : new ErrorDemo('CANCELLED', 'Conversión cancelada.');
    }
    throw traducirError(e);
  } finally {
    if (signal) signal.removeEventListener('abort', detener);
    detener();
  }
}
