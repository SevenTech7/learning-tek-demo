/*
 * TekLeaf — demostración. Interfaz: libros de ejemplo (paquetes reales del producto) y conversión de un PDF propio en el navegador.
 * Nada se guarda: ni cookies ni almacenamiento propio. El libro convertido vive en memoria y se descarta al volver o recargar.
 */
import { LIMITES, ErrorDemo, convertirPdf, slugify } from './convertir.js';
import { componerPaquete, crearZip, ARCHIVOS_VISOR } from './paquete.js';

const $ = (id) => document.getElementById(id);
const BASE = new URL('./', import.meta.url);
const ruta = (rel) => new URL(rel, BASE).href;

const vistas = { inicio: $('vista-inicio'), progreso: $('vista-progreso'), libro: $('vista-libro') };
const aviso = $('aviso');
const entrada = $('archivo');
const zona = $('zona');

let pdfjsPromise = null;
let abortar = null;   // AbortController de la conversión en curso
let ocupado = false;
let libro = null;   // libro abierto: { urls: string[], zip: () => Promise<Blob>, nombreZip }

function mostrar(nombre) {
  for (const [k, el] of Object.entries(vistas)) el.hidden = k !== nombre;
  document.body.classList.toggle('con-libro', nombre === 'libro');
}

function mostrarAviso(texto) {
  aviso.textContent = texto;
  aviso.hidden = !texto;
}

/* ---- pdf.js: se carga solo cuando hace falta ---- */

function cargarPdfjs() {
  if (!pdfjsPromise) {
    pdfjsPromise = import('./pdfjs/pdf.min.mjs').then((m) => {
      m.GlobalWorkerOptions.workerSrc = ruta('pdfjs/pdf.worker.min.mjs');
      return m;
    });
    pdfjsPromise.catch(() => { pdfjsPromise = null; });
  }
  return pdfjsPromise;
}

const RUTAS_PDFJS = () => ({
  cMapUrl: ruta('pdfjs/cmaps/'),
  cMapPacked: true,
  standardFontDataUrl: ruta('pdfjs/standard_fonts/'),
  wasmUrl: ruta('pdfjs/wasm/'),
  iccUrl: ruta('pdfjs/iccs/'),
});

/* ---- libro abierto ---- */

/** El visor es un iframe que se crea al abrir un libro y se quita al cerrarlo: así se descarga el documento y se libera su memoria. */
function crearVisor(src) {
  const f = document.createElement('iframe');
  f.id = 'visor';
  f.title = 'Visor del libro';
  f.setAttribute('allow', 'fullscreen');
  $('libro-marco').appendChild(f);
  // Barras fijas: con las de serie (que se esconden hasta acercar el ratón) quien prueba la demostración no ve qué puede hacer.
  f.src = `${src}#chrome=fixed`;
  f.addEventListener('load', () => { try { f.contentWindow.focus(); } catch { /* sin foco */ } }, { once: true });
  return f;
}

function liberarLibro() {
  const f = $('visor');
  if (f) f.remove();
  if (libro) for (const u of libro.urls) URL.revokeObjectURL(u);
  libro = null;
  try { delete window.__tekleafLibro; } catch { window.__tekleafLibro = undefined; }
}

function abrirLibro({ src, titulo, nota, descarga, nombreZip, zip }) {
  $('libro-titulo').textContent = titulo;
  const n = $('libro-aviso');
  n.textContent = nota || '';
  n.hidden = !nota;
  const dl = $('descargar');
  dl.onclick = null;
  if (descarga) {
    dl.href = descarga;
    dl.setAttribute('download', nombreZip);
  } else {
    dl.href = '#';
    dl.onclick = async (e) => {
      e.preventDefault();
      dl.setAttribute('aria-busy', 'true');
      try {
        const blob = await zip();
        const u = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = u;
        a.download = nombreZip;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(u), 30_000);
      } catch {
        mostrarAvisoLibro('No se pudo preparar el paquete. Inténtalo de nuevo.');
      } finally {
        dl.removeAttribute('aria-busy');
      }
    };
  }
  mostrar('libro');
  history.pushState({ vista: 'libro' }, '', '#libro');
  crearVisor(src);
  $('libro-titulo').focus({ preventScroll: true });
}

function mostrarAvisoLibro(texto) {
  const n = $('libro-aviso');
  n.textContent = texto;
  n.hidden = !texto;
}

function volverAlInicio({ desdeHistoria = false } = {}) {
  liberarLibro();
  mostrar('inicio');
  if (!desdeHistoria && history.state && history.state.vista === 'libro') history.back();
  $('titulo-inicio').scrollIntoView?.({ block: 'start' });
}

/* ---- conversión de un PDF propio ---- */

async function convertir(file) {
  if (ocupado) return;
  mostrarAviso('');
  // Comprobaciones baratas antes de cargar pdf.js
  if (file.size === 0) return mostrarAviso('Ese archivo está vacío.');
  if (file.size > LIMITES.maxBytes) {
    return mostrarAviso(`Ese archivo pesa ${(file.size / 1048576).toLocaleString('es', { maximumFractionDigits: 1 })} MB y esta demostración admite PDF de hasta 1 MB.`);
  }
  ocupado = true;
  const control = new AbortController();
  abortar = control;
  const reloj = setTimeout(() => control.abort('timeout'), LIMITES.timeoutMs);
  mostrar('progreso');
  const barra = $('progreso');
  const estado = $('estado');
  barra.removeAttribute('value');
  estado.textContent = 'Preparando el conversor…';
  $('titulo-progreso').focus({ preventScroll: true });
  try {
    const pdfjs = await cargarPdfjs();
    const r = await convertirPdf(file, {
      pdfjs,
      rutas: RUTAS_PDFJS(),
      signal: control.signal,
      progreso: ({ fase, pagina, total }) => {
        if (fase === 'leer') { estado.textContent = 'Leyendo el PDF…'; return; }
        barra.max = total;
        barra.value = pagina - 1;
        estado.textContent = `Convirtiendo la página ${pagina} de ${total}…`;
      },
    });
    barra.value = barra.max;
    mostrarLibroConvertido(r);
  } catch (e) {
    mostrar('inicio');
    entrada.value = '';
    if (e instanceof ErrorDemo && e.code === 'CANCELLED') return;
    mostrarAviso(e instanceof ErrorDemo ? e.message : 'No se pudo convertir ese PDF. Prueba con otro archivo.');
    aviso.scrollIntoView?.({ block: 'center' });
  } finally {
    clearTimeout(reloj);
    abortar = null;
    ocupado = false;
  }
}

function mostrarLibroConvertido({ config, pagesData, text, files, resumen }) {
  const urls = [];
  const map = new Map();
  for (const [r, blob] of files) {
    const u = URL.createObjectURL(blob);
    urls.push(u);
    map.set(r, u);
  }
  const paraVisor = JSON.parse(JSON.stringify(pagesData));
  for (const p of paraVisor.pages) {
    p.image = map.get(p.image);
    if (p.zoomImage) p.zoomImage = map.get(p.zoomImage);
    p.thumbnail = map.get(p.thumbnail);
  }
  window.__tekleafLibro = { config, pages: paraVisor, text };
  const slug = slugify(config.publication.title);
  libro = { urls };
  const nota = `Convertido en tu navegador: ${resumen.pages} ${resumen.pages === 1 ? 'página' : 'páginas'}${resumen.hasText ? '' : ', sin texto buscable (parece un documento escaneado)'}. El archivo no salió de tu equipo.`;
  abrirLibro({
    src: ruta('visor/index.html'),
    titulo: config.publication.title,
    nota,
    nombreZip: `${slug}.zip`,
    zip: async () => {
      const visorFiles = new Map();
      await Promise.all(ARCHIVOS_VISOR.map(async (r) => {
        const res = await fetch(ruta(`visor/${r}`));
        if (!res.ok) throw new Error(`visor/${r}: ${res.status}`);
        visorFiles.set(r, await res.text());
      }));
      return crearZip(componerPaquete({ config, pagesData, text, files, visor: visorFiles }), slug);
    },
  });
}

/* ---- libros de ejemplo ---- */

async function cargarMuestras() {
  let datos;
  try {
    const res = await fetch(ruta('libros.json'), { cache: 'no-cache' });
    if (!res.ok) return;
    datos = await res.json();
  } catch { return; }
  const lista = $('lista-muestras');
  const libros = Array.isArray(datos && datos.libros) ? datos.libros : [];
  for (const m of libros) {
    if (!m || !/^[a-z0-9-]+$/.test(String(m.id))) continue;
    const li = document.createElement('li');
    li.className = 'muestra';
    const img = document.createElement('img');
    img.src = ruta(`libros/${m.id}/thumbnails/page-001.jpg`);
    img.alt = '';
    img.width = 84;
    img.loading = 'lazy';
    const cuerpo = document.createElement('div');
    const h = document.createElement('h3');
    h.textContent = String(m.titulo);
    const p = document.createElement('p');
    p.textContent = `${m.paginas} páginas · ${m.descripcion}`;
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'btn';
    b.textContent = 'Abrir el libro';
    b.addEventListener('click', () => abrirLibro({
      src: ruta(`libros/${m.id}/index.html`),
      titulo: String(m.titulo),
      nota: 'Libro de ejemplo generado con TekLeaf completo (Poppler): es el paquete tal como lo entrega el producto.',
      descarga: ruta(`libros/${m.id}.zip`),
      nombreZip: `${m.id}.zip`,
    }));
    cuerpo.append(h, p, b);
    li.append(img, cuerpo);
    lista.appendChild(li);
  }
  if (lista.children.length) $('bloque-muestras').hidden = false;
}

/* ---- eventos ---- */

entrada.addEventListener('change', () => {
  const f = entrada.files && entrada.files[0];
  entrada.value = '';   // para que elegir el mismo archivo otra vez vuelva a disparar el evento
  if (f) convertir(f);
});

for (const ev of ['dragenter', 'dragover']) {
  zona.addEventListener(ev, (e) => { e.preventDefault(); zona.classList.add('encima'); });
}
for (const ev of ['dragleave', 'dragend']) zona.addEventListener(ev, () => zona.classList.remove('encima'));
zona.addEventListener('drop', (e) => {
  e.preventDefault();
  zona.classList.remove('encima');
  const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
  if (f) convertir(f);
});
// Soltar un archivo fuera de la zona no debe abandonar la página para abrirlo.
for (const ev of ['dragover', 'drop']) window.addEventListener(ev, (e) => { if (!zona.contains(e.target)) e.preventDefault(); });

$('cancelar').addEventListener('click', () => {
  if (abortar) abortar.abort('cancel');
  $('estado').textContent = 'Cancelando…';
});
$('volver-inicio').addEventListener('click', () => volverAlInicio());
window.addEventListener('popstate', () => {
  if (!vistas.libro.hidden) volverAlInicio({ desdeHistoria: true });
});

// Sin estado propio: recargar siempre vuelve al inicio, sin dejar `#libro` en la dirección.
if (location.hash) history.replaceState(null, '', location.pathname + location.search);
cargarMuestras();
