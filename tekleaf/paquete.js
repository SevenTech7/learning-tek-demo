/*
 * Paquete descargable de un libro convertido en el navegador (solo la demostración).
 *
 * Reproduce lo que compone `src/export/package.js` para el tipo `offline` (carpeta que se abre con doble clic): la misma página,
 * los mismos scripts del visor y los mismos archivos de datos, con las imágenes que generó pdf.js. El ZIP se escribe sin
 * compresión (las imágenes ya vienen comprimidas) y con fecha fija, como el escritor del producto.
 */
import { dataScript, safeJson } from './serialize.js';

const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

/** Archivos del visor que lleva todo paquete, tal como los sirve la demostración en `visor/`. */
export const ARCHIVOS_VISOR = ['css/styles.css', 'css/viewer.css', 'js/pageturn.js', 'js/flipbook.js', 'js/viewer.js'];

export function paginaIndex(config, cover) {
  const t = escapeHtml(config.publication.title);
  return `<!doctype html>
<html lang="${escapeHtml(config.publication.language)}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${t}</title>
<meta name="color-scheme" content="light dark">
<link rel="stylesheet" href="css/styles.css">
<link rel="stylesheet" href="css/viewer.css">
${cover ? `<link rel="preload" as="image" href="${escapeHtml(cover)}" fetchpriority="high">\n` : ''}</head>
<body class="tl-host-page">
<noscript><p style="padding:1rem;font-family:sans-serif">Esta publicación requiere JavaScript. / This publication requires JavaScript.</p></noscript>
<div id="tekleaf" class="tl-root" data-mode="page"></div>
<script src="data/config.js"></script>
<script src="data/pages.js"></script>
<script src="js/pageturn.js"></script>
<script src="js/flipbook.js"></script>
<script src="js/viewer.js"></script>
</body>
</html>
`;
}

const ATRIBUCION = `TekLeaf — atribución
====================
Este paquete fue generado con la demostración en línea de TekLeaf. Todos los derechos sobre TekLeaf están reservados por sus titulares.
No incluye bibliotecas de terceros: el viewer y el motor de flip son código propio de TekLeaf y la tipografía es la pila de fuentes
del sistema. No contiene claves de licencia, activación ni telemetría.

Las imágenes de las páginas las generó, en el navegador de quien convirtió el archivo, pdf.js (Mozilla, Apache-2.0).
El paquete no incluye pdf.js ni ninguna parte de él.
`;

/**
 * Compone los archivos del paquete: `Map<ruta, string | Uint8Array | Blob>`.
 * `visor`: `Map<ruta, string>` con los archivos de `ARCHIVOS_VISOR` ya leídos.
 */
export function componerPaquete({ config, pagesData, text, files, visor }) {
  const out = new Map();
  const first = pagesData.pages[0]?.image;
  out.set('index.html', paginaIndex(config, first));
  for (const ruta of ARCHIVOS_VISOR) {
    if (!visor.has(ruta)) throw new Error(`Falta el archivo del visor: ${ruta}`);
    out.set(ruta, visor.get(ruta));
  }
  out.set('fonts/.keep', '');
  out.set('assets/THIRD-PARTY-LICENSES.txt', ATRIBUCION);
  for (const [ruta, blob] of files) out.set(ruta, blob);
  out.set('data/config.json', `${safeJson(config, 2)}\n`);
  out.set('data/config.js', dataScript('TEKLEAF_CONFIG', config, 2));
  out.set('data/pages.json', `${safeJson(pagesData)}\n`);
  out.set('data/pages.js', dataScript('TEKLEAF_PAGES', pagesData));
  if (text) {
    out.set('data/text.json', `${safeJson(text)}\n`);
    out.set('data/text.js', dataScript('TEKLEAF_TEXT', text));
  }
  return out;
}

/* ---- ZIP sin compresión ---- */

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

export function crc32(bytes) {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

const DOS_TIME = 0;
const DOS_DATE = (0 << 9) | (1 << 5) | 1;   // 1980-01-01: determinista

async function aBytes(data) {
  if (typeof data === 'string') return new TextEncoder().encode(data);
  if (data instanceof Uint8Array) return data;
  return new Uint8Array(await data.arrayBuffer());
}

/** Escribe un ZIP (método 0) con `prefijo/` delante de cada ruta. Devuelve un Blob `application/zip`. */
export async function crearZip(archivos, prefijo) {
  const nombres = [...archivos.keys()].sort();
  const partes = [];
  const central = [];
  const enc = new TextEncoder();
  let offset = 0;
  for (const ruta of nombres) {
    const nameBytes = enc.encode(`${prefijo}/${ruta}`);
    const data = await aBytes(archivos.get(ruta));
    const crc = crc32(data);
    const local = new DataView(new ArrayBuffer(30));
    local.setUint32(0, 0x04034b50, true);
    local.setUint16(4, 20, true);
    local.setUint16(6, 0x0800, true);   // nombres en UTF-8
    local.setUint16(8, 0, true);        // sin compresión
    local.setUint16(10, DOS_TIME, true);
    local.setUint16(12, DOS_DATE, true);
    local.setUint32(14, crc, true);
    local.setUint32(18, data.length, true);
    local.setUint32(22, data.length, true);
    local.setUint16(26, nameBytes.length, true);
    partes.push(local.buffer, nameBytes, data);
    const cd = new DataView(new ArrayBuffer(46));
    cd.setUint32(0, 0x02014b50, true);
    cd.setUint16(4, 0x031e, true);
    cd.setUint16(6, 20, true);
    cd.setUint16(8, 0x0800, true);
    cd.setUint16(10, 0, true);
    cd.setUint16(12, DOS_TIME, true);
    cd.setUint16(14, DOS_DATE, true);
    cd.setUint32(16, crc, true);
    cd.setUint32(20, data.length, true);
    cd.setUint32(24, data.length, true);
    cd.setUint16(28, nameBytes.length, true);
    cd.setUint32(38, (0o100644 << 16) >>> 0, true);
    cd.setUint32(42, offset, true);
    central.push(cd.buffer, nameBytes);
    offset += 30 + nameBytes.length + data.length;
  }
  const cdSize = central.reduce((n, p) => n + (p.byteLength ?? p.length), 0);
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true);
  end.setUint16(8, nombres.length, true);
  end.setUint16(10, nombres.length, true);
  end.setUint32(12, cdSize, true);
  end.setUint32(16, offset, true);
  return new Blob([...partes, ...central, end.buffer], { type: 'application/zip' });
}
