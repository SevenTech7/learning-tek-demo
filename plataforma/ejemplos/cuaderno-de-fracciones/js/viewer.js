/*! TekLeaf viewer — interfaz, navegación, búsqueda, zoom y estado. Código propio, sin dependencias. */
(function () {
'use strict';

/* ---- 10-i18n.js ---- */
/* Textos de la interfaz (es, en) e iconos. Sin dependencias: datos y una función. */
var SUPPORTED_MAJOR = 1;
var NS = 'http://www.w3.org/2000/svg';

var I18N = {
  es: {
    prev: 'Página anterior', next: 'Página siguiente', first: 'Primera página', last: 'Última página',
    page: 'Página', of: 'de', goto: 'Ir a la página', zoomIn: 'Acercar', zoomOut: 'Alejar', zoomReset: 'Restablecer zoom',
    search: 'Buscar', searchPlaceholder: 'Buscar en el documento', thumbs: 'Miniaturas', toc: 'Índice',
    fullscreen: 'Pantalla completa', exitFullscreen: 'Salir de pantalla completa', theme: 'Cambiar tema',
    scrollMode: 'Modo desplazamiento', pageMode: 'Modo página', download: 'Descargar original', close: 'Cerrar',
    results: 'resultados', noResults: 'Sin resultados', loadingText: 'Cargando texto…', textError: 'No se pudo cargar el texto.',
    noSearch: 'Este documento no tiene texto buscable.', retry: 'Reintentar', loadFail: 'No se pudo cargar la página',
    loading: 'Cargando…', unsupported: 'Esta publicación usa un formato no compatible con este visor.',
    configError: 'No se pudieron cargar los datos de la publicación.', goToLink: 'Ir a la página', openLink: 'Abrir enlace',
    nextResult: 'Resultado siguiente', prevResult: 'Resultado anterior', pages: 'Páginas', noToc: 'Este documento no tiene índice.',
    viewer: 'Visor de publicación', toolbar: 'Herramientas', needsJs: 'Requiere JavaScript',
    introTitle: 'Cómo usar esta publicación', introOk: 'Entendido',
    introFlip: 'Arrastra la esquina de una página para pasarla.',
    introSwipe: 'Desliza hacia los lados o usa las flechas del teclado para cambiar de página.',
    introScroll: 'Desplázate hacia abajo para recorrer las páginas.',
    introZoom: 'Un clic (o un toque) para ampliar al 200 %; pellizca para acercar.',
    introSearch: 'Ctrl+F (⌘F en Mac) para buscar en el texto.',
    introSelect: 'Mantén pulsada una palabra para seleccionar texto; sin soltar, arrastra para ampliar.',
    introAgain: 'Pulsa «?» para volver a ver esta ayuda.',
    copy: 'Copiar', copied: 'Texto copiado', copyFail: 'No se pudo copiar el texto',
    playAudio: 'Reproducir audio', pauseAudio: 'Pausar audio', closeAudio: 'Cerrar el audio', audioPlayer: 'Reproductor de audio',
    audioSeek: 'Posición del audio', audioError: 'No se pudo reproducir el audio'
  },
  en: {
    prev: 'Previous page', next: 'Next page', first: 'First page', last: 'Last page',
    page: 'Page', of: 'of', goto: 'Go to page', zoomIn: 'Zoom in', zoomOut: 'Zoom out', zoomReset: 'Reset zoom',
    search: 'Search', searchPlaceholder: 'Search the document', thumbs: 'Thumbnails', toc: 'Contents',
    fullscreen: 'Full screen', exitFullscreen: 'Exit full screen', theme: 'Change theme',
    scrollMode: 'Scroll mode', pageMode: 'Page mode', download: 'Download original', close: 'Close',
    results: 'results', noResults: 'No results', loadingText: 'Loading text…', textError: 'Could not load the text.',
    noSearch: 'This document has no searchable text.', retry: 'Retry', loadFail: 'Could not load the page',
    loading: 'Loading…', unsupported: 'This publication uses a format this viewer does not support.',
    configError: 'Could not load the publication data.', goToLink: 'Go to page', openLink: 'Open link',
    nextResult: 'Next result', prevResult: 'Previous result', pages: 'Pages', noToc: 'This document has no contents.',
    viewer: 'Publication viewer', toolbar: 'Tools', needsJs: 'Requires JavaScript',
    introTitle: 'How to use this publication', introOk: 'Got it',
    introFlip: 'Drag the corner of a page to turn it.',
    introSwipe: 'Swipe sideways or use the arrow keys to change page.',
    introScroll: 'Scroll down to move through the pages.',
    introZoom: 'Click (or tap) to zoom to 200%; pinch to zoom.',
    introSearch: 'Ctrl+F (⌘F on Mac) to search the text.',
    introSelect: 'Press and hold a word to select text; without lifting, drag to extend.',
    introAgain: 'Press “?” to see this help again.',
    copy: 'Copy', copied: 'Text copied', copyFail: 'Could not copy the text',
    playAudio: 'Play audio', pauseAudio: 'Pause audio', closeAudio: 'Close audio', audioPlayer: 'Audio player',
    audioSeek: 'Audio position', audioError: 'Could not play the audio'
  }
};

var ICONS = {
  prev: 'M15 5l-7 7 7 7', next: 'M9 5l7 7-7 7', first: 'M18 5l-7 7 7 7M7 5v14', last: 'M6 5l7 7-7 7M17 5v14',
  zoomIn: 'M11 4a7 7 0 100 14 7 7 0 000-14zM21 21l-5-5M11 8v6M8 11h6', zoomOut: 'M11 4a7 7 0 100 14 7 7 0 000-14zM21 21l-5-5M8 11h6',
  search: 'M11 4a7 7 0 100 14 7 7 0 000-14zM21 21l-5-5', thumbs: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
  toc: 'M4 6h16M4 12h16M4 18h10', fullscreen: 'M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5', exitFullscreen: 'M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5',
  theme: 'M12 3a9 9 0 100 18V3z', scroll: 'M7 4h10M7 20h10M12 7v10M9 14l3 3 3-3M9 10l3-3 3 3', book: 'M3 5h8v14H3zM13 5h8v14h-8z',
  download: 'M12 4v11M7 11l5 5 5-5M5 20h14', play: 'M8 5v14l11-7z', pause: 'M9 5v14M15 5v14', audio: 'M4 10v4h4l5 4V6L8 10zM16 9a4 4 0 010 6M18.5 6.5a8 8 0 010 11', close: 'M6 6l12 12M18 6L6 18', up: 'M6 15l6-6 6 6', down: 'M6 9l6 6 6-6'
};

function icon(name) {
  var svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  var p = document.createElementNS(NS, 'path');
  p.setAttribute('d', ICONS[name]);
  svg.appendChild(p);
  return svg;
}

/* ---- 15-color.js ---- */
/* Color (F3.4): lectura de hexadecimales y contraste WCAG. Sin estado ni DOM: el exportador carga este mismo archivo para avisar de contrastes bajos. */
var HEX_COLOR = /^#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;

/** «#rgb», «#rgba», «#rrggbb» o «#rrggbbaa» → [r, g, b] (el canal alfa se ignora); cualquier otra cosa → null. */
function parseHex(s) {
  if (typeof s !== 'string' || !HEX_COLOR.test(s)) return null;
  var d = s.slice(1);
  if (d.length <= 4) d = d.charAt(0) + d.charAt(0) + d.charAt(1) + d.charAt(1) + d.charAt(2) + d.charAt(2);
  return [parseInt(d.slice(0, 2), 16), parseInt(d.slice(2, 4), 16), parseInt(d.slice(4, 6), 16)];
}

function toHex(rgb) {
  return '#' + rgb.map(function (v) {
    var x = Math.round(Math.max(0, Math.min(255, v))).toString(16);
    return x.length < 2 ? '0' + x : x;
  }).join('');
}

function rgbaOf(rgb, alpha) { return 'rgba(' + rgb.join(',') + ',' + alpha + ')'; }

function luminance(rgb) {
  var c = rgb.map(function (v) { var s = v / 255; return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4); });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}

/** Relación de contraste WCAG entre dos colores [r, g, b] (1 a 21). */
function contrast(a, b) {
  var la = luminance(a);
  var lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/**
 * Blanco o tinta oscura (por defecto la del tema oscuro), la que más contraste dé sobre `bg`. Con la tinta por defecto el peor
 * caso ronda 4.3:1 (suficiente para iconos, 3:1); con negro puro, 4.58:1, así que el texto usa `[0, 0, 0]`.
 */
function readableOn(bg, ink) {
  var white = [255, 255, 255];
  var dark = ink || [11, 18, 32];
  return contrast(bg, white) >= contrast(bg, dark) ? white : dark;
}

/** Aclara `rgb` mezclándolo con blanco, en pasos del 5 %, hasta que contraste al menos `min` con `bg`. Si ya contrasta, lo deja como está. */
function liftToContrast(rgb, bg, min) {
  var out = rgb;
  for (var t = 0.05; t <= 1.0001 && contrast(out, bg) < min; t += 0.05) {
    out = rgb.map(function (v) { return v + (255 - v) * t; });
  }
  return out;
}

/* ---- 17-brand.js ---- */
/* Marca (F3.4): colores de la interfaz y tipografía. La configuración es dato, nunca CSS: cada valor se revalida aquí. */
var DARK_PANEL = [29, 34, 43];   // --panel del tema oscuro (#1d222b): contra él se comprueba el acento
var DEFAULT_ACCENT = [37, 99, 235];
var FONT_FAMILY = /^[A-Za-z0-9][A-Za-z0-9 _.-]{0,59}$/;
var FONT_FILE = /^fonts\/[A-Za-z0-9._-]+\.woff2$/;

/**
 * Acento, fondo y barra. Del acento se derivan el color del texto encima (por contraste) y su versión para el tema oscuro
 * (aclarado hasta 3:1 contra el panel oscuro). La barra, con su propio color, es la misma en ambos temas: de ella se
 * derivan el texto (si no se indica), el hover, el borde, el botón activo y el foco.
 */
/** Opacidad del texto secundario de la barra («de N»): el 85 % del texto, y más si hace falta para que se lea a 4.5:1 sobre la barra. */
function mutedAlpha(bar, fg) {
  for (var a = 0.85; a < 1; a += 0.05) {
    var mixed = [0, 1, 2].map(function (i) { return bar[i] * (1 - a) + fg[i] * a; });
    if (contrast(mixed, bar) >= 4.5) return Math.round(a * 100) / 100;
  }
  return 1;
}

function applyColors(root, colors) {
  if (!colors || typeof colors !== 'object') return;
  var put = function (name, value) { root.style.setProperty(name, value); };
  var accent = parseHex(colors.accent);
  // `config.json` siempre trae el acento de serie: igual que él, es «sin marca» y los dos temas conservan su par diseñado a mano
  if (accent && toHex(accent) !== toHex(DEFAULT_ACCENT)) {
    var lifted = liftToContrast(accent, DARK_PANEL, 3);
    put('--tl-accent', toHex(accent));
    put('--tl-accent-fg', toHex(readableOn(accent)));
    put('--tl-accent-dark', toHex(lifted));
    put('--tl-accent-dark-fg', toHex(readableOn(lifted)));
  }
  var background = parseHex(colors.background);
  if (background) put('--tl-embed-bg', toHex(background));

  var bar = parseHex(colors.toolbar);
  if (!bar) return;
  var fg = parseHex(colors.toolbarText) || readableOn(bar, [0, 0, 0]);   // es texto: 4.5:1 garantizado
  var active = accent || DEFAULT_ACCENT;   // (con el acento de serie, también DEFAULT_ACCENT)
  var activeFg = readableOn(active);
  if (contrast(active, bar) < 3) { active = fg; activeFg = bar; }   // acento que se pierde sobre la barra: se invierte
  put('--tl-bar', toHex(bar));
  put('--tl-bar-fg', toHex(fg));
  put('--tl-bar-muted', rgbaOf(fg, mutedAlpha(bar, fg)));
  put('--tl-bar-line', rgbaOf(fg, 0.24));
  put('--tl-bar-hover', rgbaOf(fg, 0.16));
  put('--tl-bar-active', toHex(active));
  put('--tl-bar-active-fg', toHex(activeFg));
}

/**
 * Tipografía de la interfaz. Se registra con la API FontFace (no con CSS generado) y se usa en cuanto carga: mientras tanto
 * se ve la fuente del sistema, como con `font-display: swap`. Una sola variante para todos los pesos: sirve una fuente variable.
 */
function applyFont(root, font) {
  if (!font || typeof font !== 'object' || typeof FontFace !== 'function' || !document.fonts) return;
  if (!FONT_FAMILY.test(font.family) || !FONT_FILE.test(font.file)) return;
  var face = new FontFace(font.family, 'url("' + font.file + '") format("woff2")', { weight: '100 900', display: 'swap' });
  document.fonts.add(face);
  root.style.setProperty('--tl-font', '"' + font.family + '", var(--tl-sys-font)');
  face.load().catch(function () { /* sin la fuente, se queda la del sistema */ });
}

/* ---- 20-dom.js ---- */
/* Utilidades de DOM y texto: sin estado y sin dependencias del resto de módulos. */
function h(tag, attrs, children) {
  var n = document.createElement(tag);
  if (attrs) Object.keys(attrs).forEach(function (k) {
    if (k === 'class') n.className = attrs[k];
    else if (k === 'text') n.textContent = attrs[k];
    else n.setAttribute(k, attrs[k]);
  });
  (children || []).forEach(function (c) { if (c) n.appendChild(c); });
  return n;
}

function storage() {
  try { var s = window.localStorage; s.getItem('x'); return s; } catch (e) { return null; }
}

function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

function safeUrl(u) {
  try {
    var p = new URL(u, 'http://invalid.invalid/').protocol;
    return /^(https?:|mailto:)$/.test(p) && /^(https?:|mailto:)/i.test(String(u));
  } catch (e) { return false; }
}

function fold(s) {
  var out = '';
  for (var i = 0; i < s.length; i++) {
    var c = s.charAt(i);
    var d = c.normalize('NFD').charAt(0).toLowerCase();
    out += d.length === 1 ? d : c;
  }
  return out;
}

function parseHash() {
  var out = {};
  var raw = String(location.hash || '').replace(/^#/, '');
  raw.split('&').forEach(function (kv) {
    var i = kv.indexOf('=');
    if (i > 0) out[kv.slice(0, i)] = decodeURIComponent(kv.slice(i + 1));
  });
  return out;
}

/* ---- 30-bridge.js ---- */
/* Mensajería con la página anfitriona cuando el visor va embebido en un iframe (FR-EXP-104). */
var PROTOCOL = '1';
var embedded = false;
try { embedded = window.parent !== window; } catch (e) { embedded = true; }

function emit(type, payload) {
  if (!embedded) return;
  try { window.parent.postMessage({ source: 'tekleaf', version: PROTOCOL, type: type, payload: payload || {} }, '*'); } catch (e) { /* sin acceso al padre */ }
}

/** Comandos que el anfitrión envía al visor: goToPage, next, prev, setZoom, search. */
function createBridge(ctx) {
  window.addEventListener('message', function (e) {
    if (!embedded || e.source !== window.parent) return;
    var allowed = (ctx.config.embed && ctx.config.embed.allowedOrigins) || ['*'];
    if (allowed.indexOf('*') === -1 && allowed.indexOf(e.origin) === -1) return;
    var m = e.data;
    if (!m || typeof m !== 'object' || m.source !== 'tekleaf' || m.version !== PROTOCOL || typeof m.type !== 'string') return;
    var p = m.payload && typeof m.payload === 'object' ? m.payload : {};
    switch (m.type) {
      case 'goToPage': if (typeof p.page === 'number' && isFinite(p.page)) ctx.goToPage(p.page); break;
      case 'next': ctx.go('next'); break;
      case 'prev': ctx.go('prev'); break;
      case 'setZoom': if (typeof p.zoom === 'number' && isFinite(p.zoom)) ctx.setZoom(p.zoom); break;
      case 'search':
        if (typeof p.query === 'string' && ctx.config.viewer.search) {
          ctx.loadText().then(function () { ctx.search.query = p.query.slice(0, 200); ctx.runSearch(ctx.search.query); if (ctx.search.results.length) ctx.activate(0); });
        }
        break;
      default: break; // comandos desconocidos: se ignoran
    }
  });
}

/* ---- 40-labels.js ---- */
/* Etiquetas de página (F1.5): lo impreso («iv», «2», «A-3»). Sin etiquetas propias, coinciden con el número físico. */
function createLabels(ctx) {
  var pages = ctx.pages;
  var count = ctx.count;

  ctx.hasLabels = pages.some(function (p) { return String(p.label) !== String(p.number); });

  /** Etiqueta de la página física n; una página sin etiqueta se muestra como su número entre paréntesis. */
  ctx.labelOf = function (n) {
    var pg = pages[n - 1];
    return pg && pg.label ? String(pg.label) : ctx.hasLabels ? '(' + n + ')' : String(n);
  };

  /** Texto escrito por el lector → número físico: primero una etiqueta exacta, después «(n)» o un número físico. */
  ctx.resolvePage = function (value) {
    var s = String(value).trim().toLowerCase();
    if (!s) return null;
    for (var i = 0; i < pages.length; i++) if (pages[i].label && String(pages[i].label).toLowerCase() === s) return i + 1;
    var m = /^\((\d+)\)$/.exec(s) || /^(\d+)$/.exec(s);
    var n = m ? parseInt(m[1], 10) : 0;
    return n >= 1 && n <= count ? n : null;
  };
}

/* ---- 50-ui.js ---- */
/* Estructura de la interfaz: barra de herramientas, barra inferior, tema, pantalla completa, teclado y estado accesible. */
var TOOLBAR_BUTTONS = ['thumbs', 'toc', 'search', 'zoom', 'mode', 'theme', 'download', 'fullscreen'];
/** Logo de la marca en la barra: solo un archivo del propio paquete (la configuración es dato, nunca una URL libre). */
var BRAND_LOGO = /^assets\/[A-Za-z0-9._-]+\.(?:png|jpe?g|svg)$/i;

/**
 * Configuración de la barra (F3.5) revalidada: posición, botones (lista blanca, sin repetidos, en el orden dado) y modo mínimo.
 * Lo que no cumple se descarta; una lista que no deja ningún nombre válido vuelve a la de serie (una lista vacía, en cambio, es legítima).
 */
function readToolbarConfig(raw) {
  var out = { position: 'top', buttons: TOOLBAR_BUTTONS, minimal: false };
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return out;
  if (raw.position === 'bottom') out.position = 'bottom';
  if (raw.minimal === true) out.minimal = true;
  if (Array.isArray(raw.buttons)) {
    var seen = {};
    var valid = raw.buttons.filter(function (b) {
      if (TOOLBAR_BUTTONS.indexOf(b) < 0 || seen[b]) return false;
      seen[b] = true;
      return true;
    });
    if (valid.length || !raw.buttons.length) out.buttons = valid;
  }
  return out;
}

function createUi(ctx) {
  var root = ctx.root;
  var config = ctx.config;
  var vcfg = ctx.vcfg;
  var T = ctx.T;
  var state = ctx.state;
  var count = ctx.count;
  var store = ctx.store;
  var announceTimer = null;
  var lastEmitted = 0;

  /* ---- tema ---- */
  function applyTheme() {
    if (state.theme === 'auto') root.removeAttribute('data-theme'); else root.setAttribute('data-theme', state.theme);
    document.documentElement.setAttribute('data-tl-theme', state.theme);
  }
  function cycleTheme() {
    var order = ['auto', 'light', 'dark'];
    state.theme = order[(order.indexOf(state.theme) + 1) % 3];
    applyTheme();
    try { if (store) store.setItem('tekleaf.theme', state.theme); } catch (e) { /* almacenamiento no disponible */ }
    ctx.live.textContent = T.theme + ': ' + state.theme;
  }

  root.textContent = '';
  root.classList.add('tl-viewer');
  root.setAttribute('role', 'region');
  root.setAttribute('aria-label', config.publication.title + ' — ' + T.viewer);
  root.setAttribute('tabindex', '-1');
  applyTheme();
  // Barras fijas en lugar de ocultas: `#chrome=fixed` en la URL o `data-chrome="fixed"` en el contenedor.
  if (ctx.hash.chrome === 'fixed') root.setAttribute('data-chrome', 'fixed');
  applyColors(root, config.branding && config.branding.colors);
  applyFont(root, config.branding && config.branding.font);

  /* ---- estructura ---- */
  function button(ic, label, cls, fn, extra) {
    var b = h('button', Object.assign({ type: 'button', class: 'tl-btn ' + (cls || ''), 'aria-label': label, title: label }, extra || {}), [icon(ic)]);
    b.addEventListener('click', fn);
    return b;
  }
  ctx.button = button;

  var live = ctx.live = h('div', { class: 'tl-sr', 'aria-live': 'polite', 'aria-atomic': 'true' });
  var srText = ctx.srText = h('div', { class: 'tl-sr', id: 'tl-pagetext', lang: config.publication.language });
  var toolbar = h('div', { class: 'tl-toolbar', role: 'toolbar', 'aria-label': T.toolbar });
  var stage = ctx.stage = h('div', { class: 'tl-stage' });
  var scrollEl = ctx.scrollEl = h('div', { class: 'tl-scroll', hidden: '' });
  var body = h('div', { class: 'tl-body' });
  var panel = ctx.panel = h('aside', { class: 'tl-panel', hidden: '' });
  var bottom = h('div', { class: 'tl-bottom' });
  var title = h('span', { class: 'tl-title', text: config.publication.title });
  var btnPrevSide = ctx.btnPrevSide = button('prev', T.prev, 'tl-side tl-side-prev', function () { ctx.go('prev'); });
  var btnNextSide = ctx.btnNextSide = button('next', T.next, 'tl-side tl-side-next', function () { ctx.go('next'); });
  var loadingEl = h('div', { class: 'tl-loading', role: 'status', text: T.loading });

  body.appendChild(panel);
  var stageWrap = ctx.stageWrap = h('div', { class: 'tl-stagewrap' }, [stage, scrollEl, btnPrevSide, btnNextSide, loadingEl]);
  applyBackground(stageWrap, config.branding && config.branding.background);

  /* ---- fondo del escenario (F3.2): imagen sobre degradado sobre color. Los valores se validan aquí también: la configuración
     es datos, nunca CSS ni HTML libre. ---- */
  function applyBackground(el, bg) {
    if (!bg || typeof bg !== 'object') return;
    var hex = /^#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
    var asset = /^assets\/[A-Za-z0-9._-]+$/;
    var images = [], sizes = [], repeats = [], positions = [];
    if (typeof bg.image === 'string' && asset.test(bg.image)) {
      images.push('url("' + bg.image + '")');
      if (bg.fit === 'tile') {
        var tile = Number(bg.tileSize);
        sizes.push(tile >= 32 && tile <= 1024 ? Math.round(tile) + 'px auto' : 'auto');
        repeats.push('repeat'); positions.push('0 0');
      } else { sizes.push('cover'); repeats.push('no-repeat'); positions.push('center'); }
      el.classList.add('tl-bgimage');
    }
    var g = bg.gradient;
    if (g && hex.test(g.from) && hex.test(g.to)) {
      images.push('linear-gradient(' + (Number(g.angle) % 361 || 0) + 'deg,' + g.from + ',' + g.to + ')');
      sizes.push('auto'); repeats.push('no-repeat'); positions.push('0 0');
    }
    if (images.length) {
      el.style.backgroundImage = images.join(',');
      el.style.backgroundSize = sizes.join(',');
      el.style.backgroundRepeat = repeats.join(',');
      el.style.backgroundPosition = positions.join(',');
    }
    if (typeof bg.color === 'string' && hex.test(bg.color)) el.style.backgroundColor = bg.color;
  }
  body.appendChild(stageWrap);
  root.appendChild(toolbar);
  root.appendChild(body);
  root.appendChild(bottom);
  // Barras ocultas (ver viewer.css): la de navegación asoma a medias sobre el borde inferior; el libro deja libre esa mitad para
  // que ni la tape ni intercepte las esquinas de abajo (el pase de página). La altura de la barra cambia al montarse la tira.
  function syncPeek() {
    var h = Math.round(bottom.offsetHeight / 2);
    if (root.style.getPropertyValue('--tl-peek') === h + 'px') return;
    root.style.setProperty('--tl-peek', h + 'px');
    if (ctx.layoutSoon) ctx.layoutSoon();
  }
  if (window.ResizeObserver) new ResizeObserver(syncPeek).observe(bottom);
  root.appendChild(live);
  root.appendChild(srText);

  /* ---- barra de herramientas ---- */
  ctx.btnThumbs = vcfg.thumbnails !== false ? button('thumbs', T.thumbs, '', function () { ctx.togglePanel('thumbs'); }, { 'aria-expanded': 'false', 'aria-controls': 'tl-panel' }) : null;
  ctx.hasToc = !!(ctx.data.toc && ctx.data.toc.length);
  ctx.btnToc = ctx.hasToc ? button('toc', T.toc, '', function () { ctx.togglePanel('toc'); }, { 'aria-expanded': 'false', 'aria-controls': 'tl-panel' }) : null;
  ctx.btnSearch = vcfg.search !== false ? button('search', T.search, '', function () { ctx.togglePanel('search'); }, { 'aria-expanded': 'false', 'aria-controls': 'tl-panel' }) : null;
  ctx.btnZoomOut = button('zoomOut', T.zoomOut, '', function () { ctx.zoomBy(-0.5); });
  ctx.zoomLabel = h('button', { type: 'button', class: 'tl-zoomlabel', 'aria-label': T.zoomReset, title: T.zoomReset, text: '100%' });
  ctx.zoomLabel.addEventListener('click', function () { ctx.setZoom(1); });
  ctx.btnZoomIn = button('zoomIn', T.zoomIn, '', function () { ctx.zoomBy(0.5); });
  var btnMode = button('scroll', T.scrollMode, '', function () { ctx.toggleMode(); });
  var btnTheme = button('theme', T.theme, '', cycleTheme);
  var fsEnabled = !!(document.fullscreenEnabled || document.webkitFullscreenEnabled);
  var btnFs = fsEnabled ? button('fullscreen', T.fullscreen, '', toggleFullscreen) : null;
  var btnDl = vcfg.download ? h('a', { class: 'tl-btn', href: 'assets/original.pdf', download: '', 'aria-label': T.download, title: T.download }, [icon('download')]) : null;

  /* Cada botón tiene su zona (izquierda o derecha de la barra); la configuración decide cuáles se ven y su orden dentro de la zona.
     Un botón sin función en este documento (índice sin índice, descarga sin original…) es null y simplemente no aparece.
     Los ocultos siguen existiendo (sin colgar del DOM): los atajos de teclado y el estado de los controles no dependen de que se vean. */
  var tb = readToolbarConfig(vcfg.toolbar);
  var tools = {
    thumbs: { zone: 'left', nodes: [ctx.btnThumbs] },
    toc: { zone: 'left', nodes: [ctx.btnToc] },
    search: { zone: 'left', nodes: [ctx.btnSearch] },
    zoom: { zone: 'right', nodes: [ctx.btnZoomOut, ctx.zoomLabel, ctx.btnZoomIn] },
    mode: { zone: 'right', nodes: [btnMode] },
    theme: { zone: 'right', nodes: [btnTheme] },
    download: { zone: 'right', nodes: [btnDl] },
    fullscreen: { zone: 'right', nodes: [btnFs] }
  };
  var zones = { left: h('div', { class: 'tl-group' }), right: h('div', { class: 'tl-group' }) };
  tb.buttons.forEach(function (name) {
    tools[name].nodes.forEach(function (n) { if (n) zones[tools[name].zone].appendChild(n); });
  });
  var logoSrc = config.branding && config.branding.logo;
  if (typeof logoSrc === 'string' && BRAND_LOGO.test(logoSrc)) {
    // decorativo: el título ya dice de qué va. Si no carga, no deja un hueco roto.
    // Dos copias del mismo archivo (la segunda sale de la caché): la de la barra, cuando las barras están fijas, y una flotante en la
    // esquina del visor, que sigue a la vista cuando la barra se oculta (ver «barras ocultas» en viewer.css).
    var brandLogo = h('img', { class: 'tl-brandlogo', src: logoSrc, alt: '', draggable: 'false' });
    var floatLogo = h('img', { class: 'tl-brandlogo tl-brandlogo-float', src: logoSrc, alt: '', draggable: 'false' });
    brandLogo.addEventListener('load', function () {
      var w = brandLogo.naturalHeight ? Math.round(36 * brandLogo.naturalWidth / brandLogo.naturalHeight) : 120;
      root.style.setProperty('--tl-logo-w', Math.min(190, Math.max(24, w)) + 'px');   // sitio que la barra deja al logo flotante
      root.setAttribute('data-logo', '');
    });
    brandLogo.addEventListener('error', function () {
      [brandLogo, floatLogo].forEach(function (n) { if (n.parentNode) n.parentNode.removeChild(n); });
      root.removeAttribute('data-logo');
    });
    zones.left.insertBefore(brandLogo, zones.left.firstChild);
    body.appendChild(floatLogo);
  }
  var center = h('div', { class: 'tl-group tl-grow' }, [title]);
  [zones.left, center, zones.right].forEach(function (g) { toolbar.appendChild(g); });
  root.setAttribute('data-toolbar', tb.minimal ? 'minimal' : tb.position);
  if (tb.minimal) root.removeChild(toolbar);   // modo mínimo: sin barra superior (la pantalla completa pasa a la barra inferior)
  else if (tb.position === 'bottom') root.insertBefore(toolbar, bottom);

  /* ---- barra inferior ---- */
  var btnFirst = button('first', T.first, '', function () { ctx.go('first'); });
  var btnPrev = button('prev', T.prev, '', function () { ctx.go('prev'); });
  var btnNext = button('next', T.next, '', function () { ctx.go('next'); });
  var btnLast = button('last', T.last, '', function () { ctx.go('last'); });
  var slider = h('input', { type: 'range', class: 'tl-slider', min: '1', max: String(count), value: '1', 'aria-label': T.goto });
  slider.addEventListener('input', function () { ctx.goToPage(Number(slider.value)); });
  var pageInput = h('input', ctx.hasLabels
    ? { type: 'text', class: 'tl-pageinput', value: '1', 'aria-label': T.goto, autocomplete: 'off', spellcheck: 'false' }
    : { type: 'number', class: 'tl-pageinput', min: '1', max: String(count), value: '1', 'aria-label': T.goto, inputmode: 'numeric' });
  function commitPageInput() {
    var n = ctx.hasLabels ? ctx.resolvePage(pageInput.value) : parseInt(pageInput.value, 10) || 1;
    if (n === null) pageInput.value = ctx.labelOf(state.page); else ctx.goToPage(n);
  }
  pageInput.addEventListener('change', commitPageInput);
  pageInput.addEventListener('keydown', function (e) { if (e.key === 'Enter') commitPageInput(); });
  var total = h('span', { class: 'tl-total', text: T.of + ' ' + count });
  /* Tira de miniaturas (en lugar del deslizador): portada sola y después parejas en doble página, o de una en una en página simple
     y en modo desplazamiento. Se agrupa como el motor (buildSpreads) y se reconstruye si cambia la agrupación. Sin miniaturas
     (viewer.thumbnails = false) se conserva el deslizador. */
  var film = vcfg.thumbnails !== false ? h('div', { class: 'tl-film', role: 'group', 'aria-label': T.pages }) : null;
  var filmMode = null;
  var filmBuilt = false;   // F1.6: la tira se monta (y sus miniaturas se piden) cuando la portada ya cargó y el navegador está ocioso
  var filmArmed = false;
  var filmLast = null;
  function armFilm() {
    function go() {
      var idle = window.requestIdleCallback || function (f) { return setTimeout(f, 150); };
      idle(function () {
        filmBuilt = true;
        if (filmLast) syncFilm(filmLast[0], filmLast[1]);
      });
    }
    var first = root.querySelector('.tl-page img.tl-img');
    if (first && first.complete && first.naturalWidth) { go(); return; }
    root.addEventListener('load', function once(e) {
      if (!e.target || !e.target.classList || !e.target.classList.contains('tl-img')) return;
      root.removeEventListener('load', once, true);
      go();
    }, true);
  }
  function buildFilm(dbl) {
    film.textContent = '';
    TekLeafFlipbook.buildSpreads(count, dbl).forEach(function (g) {
      var face = h('span', { class: 'tl-film-pages' });
      g.forEach(function (n) {
        var pg = ctx.pages[n - 1];
        var im = h('img', { alt: '', loading: 'lazy', decoding: 'async', draggable: 'false' });
        im.src = pg.thumbnail;
        im.style.aspectRatio = pg.width + ' / ' + pg.height;
        face.appendChild(im);
      });
      var label = g.length === 2 ? ctx.labelOf(g[0]) + '–' + ctx.labelOf(g[1]) : ctx.labelOf(g[0]);
      var item = h('button', { type: 'button', class: 'tl-film-item', 'data-first': String(g[0]), tabindex: '-1', 'aria-label': T.page + ' ' + label }, [face, h('span', { class: 'tl-film-label', text: label })]);
      item._plain = T.page + ' ' + label;
      item.addEventListener('click', function () { ctx.goToPage(g[0]); });
      film.appendChild(item);
    });
    filmMode = dbl ? 'double' : 'single';
  }
  function syncFilm(first, spoken) {
    filmLast = [first, spoken];
    if (!filmBuilt) {
      if (!filmArmed) { filmArmed = true; armFilm(); }
      return;
    }
    var dbl = state.mode === 'page' && !!(ctx.engine && ctx.engine.isDouble && ctx.engine.isDouble());
    if (filmMode !== (dbl ? 'double' : 'single')) buildFilm(dbl);
    var current = null;
    Array.prototype.forEach.call(film.children, function (b) {
      var on = Number(b.getAttribute('data-first')) === first;
      if (on) { current = b; b.setAttribute('aria-current', 'page'); b.setAttribute('aria-label', spoken); b.setAttribute('tabindex', '0'); }
      else { b.removeAttribute('aria-current'); b.setAttribute('aria-label', b._plain); b.setAttribute('tabindex', '-1'); }
    });
    if (current) film.scrollLeft = Math.max(0, current.offsetLeft - (film.clientWidth - current.offsetWidth) / 2);
  }
  // El campo de página va arriba, con las herramientas; sin barra superior (modo mínimo) se queda con la navegación.
  var pageNodes = [pageInput, total];
  if (!tb.minimal) {
    // grupo propio, al final en el DOM y, con `order`, entre el título y las herramientas de la derecha
    toolbar.appendChild(h('div', { class: 'tl-group tl-pagegroup' }, pageNodes));
    zones.right.classList.add('tl-zone-right');
  }
  [btnFirst, btnPrev, film || slider].concat(tb.minimal ? pageNodes : [], [btnNext, btnLast]).forEach(function (n) { bottom.appendChild(n); });
  if (tb.minimal && btnFs) bottom.appendChild(btnFs);

  /* ---- estado que reflejan los controles ---- */
  ctx.hideLoading = function () { loadingEl.hidden = true; };

  ctx.syncModeButton = function () {
    btnMode.replaceChild(icon(state.mode === 'page' ? 'scroll' : 'book'), btnMode.firstChild);
    var lbl = state.mode === 'page' ? T.scrollMode : T.pageMode;
    btnMode.setAttribute('aria-label', lbl);
    btnMode.title = lbl;
    root.setAttribute('data-view', state.mode);
    btnPrevSide.hidden = btnNextSide.hidden = state.mode === 'scroll';
  };

  ctx.updateSrText = function (shown) {
    if (ctx.text.status !== 'ready') { srText.textContent = ''; return; }
    srText.textContent = shown.map(function (n) { return (ctx.text.data.pages[n - 1] || {}).text || ''; }).join('\n');
  };

  ctx.updateUi = function (shown) {
    var first = shown[0];
    var labelOf = ctx.labelOf;
    var label = shown.length === 2 ? labelOf(shown[0]) + '–' + labelOf(shown[1]) : labelOf(first);
    // Con etiquetas, «Página iv (4 de 21)»: lo impreso y, entre paréntesis, la posición real en el documento.
    var spoken = T.page + ' ' + label + (ctx.hasLabels ? ' (' + first + ' ' + T.of + ' ' + count + ')' : ' ' + T.of + ' ' + count);
    slider.value = String(first);
    pageInput.value = labelOf(first);
    total.textContent = T.of + ' ' + count;
    slider.setAttribute('aria-valuetext', spoken);
    if (film) syncFilm(first, spoken);
    var atStart = first <= 1;
    var atEnd = shown[shown.length - 1] >= count;
    btnPrev.disabled = btnFirst.disabled = btnPrevSide.disabled = atStart;
    btnNext.disabled = btnLast.disabled = btnNextSide.disabled = atEnd;
    clearTimeout(announceTimer);
    announceTimer = setTimeout(function () { live.textContent = spoken; }, 120);
    ctx.updateSrText(shown);
    ctx.writeHash();
    if (first !== lastEmitted) { lastEmitted = first; emit('pagechange', { page: first, pageCount: count }); }
    setTimeout(ctx.hideLoading, 8000);
  };

  /* ---- pantalla completa ---- */
  function fsElement() { return document.fullscreenElement || document.webkitFullscreenElement; }
  function toggleFullscreen() {
    if (fsElement()) (document.exitFullscreen || document.webkitExitFullscreen).call(document);
    else (root.requestFullscreen || root.webkitRequestFullscreen).call(root);
  }
  ctx.onFullscreenChange = function () {
    var on = !!fsElement();
    if (btnFs) {
      btnFs.replaceChild(icon(on ? 'exitFullscreen' : 'fullscreen'), btnFs.firstChild);
      btnFs.setAttribute('aria-label', on ? T.exitFullscreen : T.fullscreen);
      btnFs.title = btnFs.getAttribute('aria-label');
    }
    emit('fullscreenchange', { fullscreen: on });
    ctx.layoutSoon();
  };
  document.addEventListener('fullscreenchange', ctx.onFullscreenChange);
  document.addEventListener('webkitfullscreenchange', ctx.onFullscreenChange);

  /* ---- teclado ---- */
  document.addEventListener('keydown', function (e) {
    if (e.defaultPrevented) return;
    var t = e.target;
    var typing = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA');
    if (e.key === 'Escape') {
      if (state.panel) { e.preventDefault(); ctx.closePanel(true); }
      else if (state.zoom > 1) ctx.setZoom(1);
      return;
    }
    if ((e.ctrlKey || e.metaKey) && (e.key === 'f' || e.key === 'F') && ctx.btnSearch && config.viewer.search) { e.preventDefault(); ctx.openPanel('search'); return; }
    if (typing || e.ctrlKey || e.metaKey || e.altKey) return;
    var onButton = t && t.tagName === 'BUTTON' && (e.key === ' ' || e.key === 'Enter');
    if (onButton) return;
    var k = e.key;
    var scrollMode = state.mode === 'scroll';
    if (k === 'ArrowRight' || (!scrollMode && (k === 'PageDown' || k === ' '))) { e.preventDefault(); ctx.go('next'); }
    else if (k === 'ArrowLeft' || (!scrollMode && k === 'PageUp')) { e.preventDefault(); ctx.go('prev'); }
    else if (k === 'Home') { e.preventDefault(); ctx.go('first'); }
    else if (k === 'End') { e.preventDefault(); ctx.go('last'); }
    else if (k === '+' || k === '=') { e.preventDefault(); ctx.zoomBy(0.5); }
    else if (k === '-' || k === '_') { e.preventDefault(); ctx.zoomBy(-0.5); }
    else if (k === '0') { e.preventDefault(); ctx.setZoom(1); }
    else if (state.zoom > 1 && !scrollMode && k.indexOf('Arrow') === 0) {
      e.preventDefault();
      var step = 60;
      if (k === 'ArrowUp') state.ty += step; else if (k === 'ArrowDown') state.ty -= step;
      ctx.clampPan(); ctx.applyTransform();
    }
  });
}

/* ---- 60-pages.js ---- */
/* Páginas: imagen de cada página (con reintento), nivel nítido al ampliar (F1.1), precarga y capa de enlaces. */
function createPages(ctx) {
  var pages = ctx.pages;
  var count = ctx.count;
  var vcfg = ctx.vcfg;
  var T = ctx.T;
  var state = ctx.state;
  var prefetched = {};

  function pageBy(n) { return pages[n - 1]; }

  ctx.renderPage = function (n, opts) {
    var pg = pageBy(n);
    var wrap = h('div', { class: 'tl-page tl-isloading', 'data-page': String(n) });
    wrap.style.aspectRatio = pg.width + ' / ' + pg.height;
    var img = h('img', { class: 'tl-img', alt: T.page + ' ' + ctx.labelOf(n), draggable: 'false', decoding: 'async' });
    wrap.appendChild(img);
    wrap.appendChild(h('div', { class: 'tl-hl' }));
    var linksEl = h('div', { class: 'tl-links' });
    (pg.links || []).forEach(function (l) { var a = linkEl(l); if (a) linksEl.appendChild(a); });
    wrap.appendChild(linksEl);
    var zones = pageZones(pg);
    if (zones.length) wrap.appendChild(zonesEl(zones));
    loadImage(wrap, img, pg.image, n);
    if (vcfg.selection && ctx.text.status === 'ready') ctx.addTextLayer(wrap, n);
    ctx.applyHighlights(wrap, n);
    return wrap;
  };

  /** Zonas de audio (F4.6): un botón por zona sobre la página; el reproductor es de 75-audio.js. */
  function zonesEl(zones) {
    var layer = h('div', { class: 'tl-zones' });
    zones.forEach(function (z) {
      var b = h('button', { type: 'button', class: 'tl-zone', 'data-key': zoneKey(z), 'aria-pressed': 'false', 'aria-label': T.playAudio + (z.title ? ': ' + z.title : '') }, [icon('audio')]);
      b.style.left = z.rect[0] + '%'; b.style.top = z.rect[1] + '%'; b.style.width = z.rect[2] + '%'; b.style.height = z.rect[3] + '%';
      b.addEventListener('click', function (e) { e.stopPropagation(); if (ctx.playZone) ctx.playZone(z); });
      layer.appendChild(b);
    });
    return layer;
  }

  function loadImage(wrap, img, src, n) {
    img.onload = function () { wrap.classList.remove('tl-isloading'); wrap.classList.remove('tl-failed'); ctx.hideLoading(); if (zoomWanted) upgradeImage(wrap); };
    img.onerror = function () {
      wrap.classList.remove('tl-isloading');
      wrap.classList.add('tl-failed');
      ctx.hideLoading();
      emit('error', { code: 'IMAGE_LOAD', message: 'page ' + n });
      if (!wrap.querySelector('.tl-failmsg')) {
        var retry = h('button', { type: 'button', class: 'tl-retry', text: T.retry });
        retry.addEventListener('click', function () {
          wrap.classList.remove('tl-failed'); wrap.classList.add('tl-isloading');
          var m = wrap.querySelector('.tl-failmsg'); if (m) m.remove();
          loadImage(wrap, img, src + '?r=' + Date.now(), n);
        });
        wrap.appendChild(h('div', { class: 'tl-failmsg', role: 'alert' }, [h('span', { text: T.loadFail + ' ' + n }), retry]));
      }
    };
    img.src = src;
  }

  /* ---- imagen nítida al ampliar (F1.1): `zoomImage` solo se pide al superar ZOOM_SWITCH y solo para las páginas
     visibles; al volver a 1× se suelta. El cambio se hace con la imagen ya descargada y decodificada: sin parpadeo. ---- */
  var ZOOM_SWITCH = 1.5;
  var zoomWanted = false;

  function upgradeImage(wrap) {
    var pg = pageBy(Number(wrap.dataset.page));
    var img = wrap.querySelector('.tl-img');
    if (!pg || !pg.zoomImage || !img || wrap.dataset.level === 'zoom' || wrap.dataset.upgrading) return;
    var url = pg.zoomImage;
    wrap.dataset.upgrading = '1';
    var pre = new Image();
    pre.onload = function () {
      delete wrap.dataset.upgrading;
      var swap = function () { if (zoomWanted && wrap.isConnected) { img.src = url; wrap.dataset.level = 'zoom'; } };
      if (pre.decode) pre.decode().then(swap, swap); else swap();
    };
    pre.onerror = function () { delete wrap.dataset.upgrading; /* se conserva la imagen normal */ };
    pre.src = url;
  }

  function downgradeImage(wrap) {
    if (wrap.dataset.level !== 'zoom') return;
    var pg = pageBy(Number(wrap.dataset.page));
    var img = wrap.querySelector('.tl-img');
    delete wrap.dataset.level;
    if (pg && img) img.src = pg.image;
  }

  ctx.syncZoomImages = function () {
    var want = state.zoom > ZOOM_SWITCH || (zoomWanted && state.zoom > 1);
    if (want === zoomWanted) return;
    zoomWanted = want;
    var host = state.mode === 'page' ? (ctx.engine && ctx.engine.layer) : ctx.scrollEl;
    if (!host) return;
    Array.prototype.forEach.call(host.querySelectorAll('.tl-page'), function (w) { if (want) upgradeImage(w); else downgradeImage(w); });
  };

  ctx.prefetchWindow = function (center) {
    var keep = {};
    for (var d = -3; d <= 4; d++) {
      var n = center + d;
      if (n < 1 || n > count) continue;
      keep[n] = true;
      if (!prefetched[n]) { var im = new Image(); im.src = pageBy(n).image; prefetched[n] = im; }
    }
    Object.keys(prefetched).forEach(function (k) { if (!keep[k]) delete prefetched[k]; });
  };

  /* ---- enlaces ---- */
  function linkEl(l) {
    var a = h('a', { class: 'tl-link' });
    var r = l.rect;
    a.style.left = r[0] / 10 + '%'; a.style.top = r[1] / 10 + '%';
    a.style.width = r[2] / 10 + '%'; a.style.height = r[3] / 10 + '%';
    if (l.page) {
      a.setAttribute('href', '#page=' + l.page);
      a.setAttribute('aria-label', T.goToLink + ' ' + l.page);
      a.addEventListener('click', function (e) { e.preventDefault(); emit('linkclick', { page: l.page, internal: true }); ctx.goToPage(l.page); });
    } else if (l.url && safeUrl(l.url)) {
      a.setAttribute('href', l.url);
      a.setAttribute('target', '_blank');
      a.setAttribute('rel', 'noopener noreferrer');
      a.setAttribute('aria-label', T.openLink + ': ' + l.url);
      a.addEventListener('click', function () { emit('linkclick', { url: l.url, internal: false }); });
    } else return null;
    return a;
  }
}

/* ---- 70-search.js ---- */
/* Texto del documento: carga bajo demanda, capa de texto seleccionable y búsqueda con resaltado (FR-VIEW-005). */
function createSearch(ctx) {
  var root = ctx.root;
  var panel = ctx.panel;
  var T = ctx.T;
  var count = ctx.count;
  var text = ctx.text;
  var search = ctx.search;

  ctx.loadText = function () {
    return new Promise(function (resolve, reject) {
      if (text.status === 'ready') return resolve();
      text.waiters.push({ resolve: resolve, reject: reject });
      if (text.status === 'loading') return;
      text.status = 'loading';
      var finish = function (ok) {
        var w = text.waiters; text.waiters = [];
        if (ok) { text.status = 'ready'; text.data = window.TEKLEAF_TEXT; text.folded = []; ctx.updateSrText(ctx.engine ? ctx.engine.current() : [ctx.state.page]); w.forEach(function (x) { x.resolve(); }); }
        else { text.status = 'error'; w.forEach(function (x) { x.reject(new Error('text')); }); emit('error', { code: 'TEXT_LOAD', message: 'text.js' }); }
      };
      if (window.TEKLEAF_TEXT) return finish(true);
      var s = document.createElement('script');
      s.src = 'data/text.js';
      s.onload = function () { finish(!!window.TEKLEAF_TEXT); };
      s.onerror = function () { finish(false); };
      document.head.appendChild(s);
    });
  };

  ctx.addTextLayer = function (wrap, n) {
    var rec = text.data.pages[n - 1];
    if (!rec || wrap.querySelector('.tl-text')) return;
    var layer = h('div', { class: 'tl-text', lang: ctx.config.publication.language });
    rec.boxes.forEach(function (b) {
      var s = h('span', { text: rec.text.substr(b[0], b[1]) + ' ' });
      s.style.left = b[2] / 10 + '%'; s.style.top = b[3] / 10 + '%';
      s.style.width = b[4] / 10 + '%'; s.style.height = b[5] / 10 + '%';
      s.style.fontSize = b[5] / 10 + 'cqh';
      layer.appendChild(s);
    });
    wrap.insertBefore(layer, wrap.querySelector('.tl-links'));
  };

  function foldedPage(i) {
    if (text.folded[i] === undefined) text.folded[i] = fold(text.data.pages[i].text || '');
    return text.folded[i];
  }

  ctx.runSearch = function (q) {
    search.query = q;
    search.results = [];
    search.active = -1;
    var needle = fold(q.trim());
    if (needle.length < 1) { ctx.renderResults(); ctx.applyAllHighlights(); return; }
    for (var i = 0; i < count && search.results.length < 1000; i++) {
      var hay = foldedPage(i);
      var from = 0, idx;
      while ((idx = hay.indexOf(needle, from)) !== -1 && search.results.length < 1000) {
        search.results.push({ page: i + 1, start: idx, len: needle.length });
        from = idx + needle.length;
      }
    }
    ctx.renderResults();
    ctx.applyAllHighlights();
    emit('search', { query: q, results: search.results.length });
  };

  function highlightRects(n) {
    var rec = text.data && text.data.pages[n - 1];
    if (!rec) return [];
    var rs = search.results.filter(function (r) { return r.page === n; });
    if (!rs.length) return [];
    var out = [];
    rec.boxes.forEach(function (b) {
      for (var i = 0; i < rs.length; i++) {
        if (b[0] < rs[i].start + rs[i].len && b[0] + b[1] > rs[i].start) { out.push({ box: b, active: search.results[search.active] === rs[i] }); break; }
      }
    });
    return out;
  }

  ctx.applyHighlights = function (wrap, n) {
    var hl = wrap.querySelector('.tl-hl');
    if (!hl) return;
    hl.textContent = '';
    if (!search.results.length) return;
    highlightRects(n).forEach(function (r) {
      var m = h('mark', { class: r.active ? 'tl-mark tl-active' : 'tl-mark' });
      m.style.left = r.box[2] / 10 + '%'; m.style.top = r.box[3] / 10 + '%';
      m.style.width = r.box[4] / 10 + '%'; m.style.height = r.box[5] / 10 + '%';
      hl.appendChild(m);
    });
  };

  ctx.applyAllHighlights = function () {
    root.querySelectorAll('.tl-page[data-page]').forEach(function (w) { ctx.applyHighlights(w, Number(w.dataset.page)); });
  };

  function snippet(r) {
    var t = text.data.pages[r.page - 1].text || '';
    var a = Math.max(0, r.start - 30), b = Math.min(t.length, r.start + r.len + 40);
    return { pre: (a > 0 ? '…' : '') + t.slice(a, r.start), hit: t.substr(r.start, r.len), post: t.slice(r.start + r.len, b) + (b < t.length ? '…' : '') };
  }

  ctx.activate = function (i) {
    if (i < 0 || i >= search.results.length) return;
    search.active = i;
    var r = search.results[i];
    ctx.goToPage(r.page);
    setTimeout(ctx.applyAllHighlights, 0);
    setTimeout(ctx.applyAllHighlights, 700);
    var items = panel.querySelectorAll('.tl-result');
    items.forEach(function (it, k) { it.classList.toggle('tl-current', k === i); if (k === i) it.scrollIntoView({ block: 'nearest' }); });
    var st = panel.querySelector('.tl-searchstatus');
    if (st) st.textContent = (i + 1) + ' / ' + search.results.length + ' ' + T.results;
  };

  ctx.renderResults = function () {
    var list = panel.querySelector('.tl-results');
    var st = panel.querySelector('.tl-searchstatus');
    if (!list) return;
    list.textContent = '';
    if (!search.query.trim()) { st.textContent = ''; return; }
    st.textContent = search.results.length ? search.results.length + ' ' + T.results : T.noResults;
    search.results.slice(0, 300).forEach(function (r, i) {
      var s = snippet(r);
      var b = h('button', { type: 'button', class: 'tl-result' }, [
        h('span', { class: 'tl-rpage', text: T.page + ' ' + ctx.labelOf(r.page) }),
        h('span', { class: 'tl-rtext' }, [document.createTextNode(s.pre), h('mark', { text: s.hit }), document.createTextNode(s.post)])
      ]);
      b.addEventListener('click', function () { ctx.activate(i); });
      list.appendChild(h('li', null, [b]));
    });
  };

  ctx.stepResult = function (d) {
    if (!search.results.length) return;
    var i = search.active < 0 ? (d > 0 ? 0 : search.results.length - 1) : (search.active + d + search.results.length) % search.results.length;
    ctx.activate(i);
  };
}

/* ---- 75-audio.js ---- */
/* Audio sobre la página (F4.6, versión de audio): cada zona del manifiesto es un botón sobre su página y un reproductor flotante
   (reproducir/pausar, posición, tiempos y cerrar) con el elemento <audio> del navegador. Los datos de las zonas son datos, nunca HTML ni
   CSS: se revalida cada valor y los textos van con textContent. */
var AUDIO_SRC = /^media\/[A-Za-z0-9._-]+\.(?:mp3|m4a|ogg|wav)$/i;

/** Zonas válidas de una página: { rect: [x, y, w, h] en %, src, title }. Lo que no cuadra se descarta en silencio. */
function pageZones(pg) {
  var out = [];
  var list = pg && Array.isArray(pg.zones) ? pg.zones : [];
  list.slice(0, 200).forEach(function (z) {
    if (!z || typeof z !== 'object' || z.kind !== 'audio' || typeof z.src !== 'string' || !AUDIO_SRC.test(z.src)) return;
    var r = z.rect;
    if (!Array.isArray(r) || r.length !== 4 || r.some(function (n) { return typeof n !== 'number' || !isFinite(n); })) return;
    if (r[0] < 0 || r[1] < 0 || r[2] <= 0 || r[3] <= 0 || r[0] + r[2] > 100.01 || r[1] + r[3] > 100.01) return;
    var title = typeof z.title === 'string' && z.title.length >= 1 && z.title.length <= 120 ? z.title : '';
    out.push({ rect: r, src: z.src, title: title });
  });
  return out;
}

/** Identifica una zona: dos zonas pueden compartir archivo y no por eso son la misma. */
function zoneKey(z) { return z.src + '|' + z.rect.join(','); }

function createAudio(ctx) {
  var T = ctx.T;
  var audio = null;      // <audio>, se crea al primer uso
  var bar = null;
  var playBtn, seek, timeEl, titleEl;
  var current = null;    // clave de la zona que suena (o está en pausa)
  var seeking = false;

  function fmt(s) {
    if (!isFinite(s) || s < 0) s = 0;
    var m = Math.floor(s / 60), r = Math.floor(s % 60);
    return m + ':' + (r < 10 ? '0' : '') + r;
  }

  function mark() {
    var playing = !!audio && !audio.paused && !audio.ended;
    Array.prototype.forEach.call(ctx.root.querySelectorAll('.tl-zone'), function (b) {
      b.setAttribute('aria-pressed', String(!!current && b.getAttribute('data-key') === current && playing));
    });
    if (playBtn) {
      playBtn.replaceChild(icon(playing ? 'pause' : 'play'), playBtn.firstChild);
      playBtn.setAttribute('aria-label', playing ? T.pauseAudio : T.playAudio);
    }
  }

  function paint() {
    if (!audio || !bar) return;
    var d = audio.duration;
    if (!seeking) seek.value = isFinite(d) && d > 0 ? String(Math.round((audio.currentTime / d) * 1000)) : '0';
    var now = fmt(audio.currentTime) + ' / ' + fmt(d);
    timeEl.textContent = now;
    seek.setAttribute('aria-valuetext', now);
  }

  function build() {
    audio = document.createElement('audio');
    audio.preload = 'metadata';
    playBtn = h('button', { type: 'button', class: 'tl-audio-btn', 'aria-label': T.playAudio }, [icon('play')]);
    titleEl = h('span', { class: 'tl-audio-title' });
    seek = h('input', { type: 'range', class: 'tl-audio-seek', min: '0', max: '1000', step: '1', value: '0', 'aria-label': T.audioSeek });
    timeEl = h('span', { class: 'tl-audio-time', text: '0:00 / 0:00' });
    var close = h('button', { type: 'button', class: 'tl-audio-btn', 'aria-label': T.closeAudio }, [icon('close')]);
    bar = h('div', { class: 'tl-audio', role: 'region', 'aria-label': T.audioPlayer, hidden: '' }, [playBtn, titleEl, seek, timeEl, close, audio]);   // sin `controls`: el elemento no se ve
    ctx.stageWrap.appendChild(bar);

    playBtn.addEventListener('click', function () { toggle(); });
    close.addEventListener('click', function () { stop(); });
    seek.addEventListener('input', function () {
      seeking = true;
      if (isFinite(audio.duration)) audio.currentTime = (Number(seek.value) / 1000) * audio.duration;
      paint();
    });
    seek.addEventListener('change', function () { seeking = false; });
    bar.addEventListener('keydown', function (e) { if (e.key === 'Escape') { e.stopPropagation(); stop(); } });
    ['timeupdate', 'durationchange', 'loadedmetadata'].forEach(function (t) { audio.addEventListener(t, paint); });
    ['play', 'pause', 'ended'].forEach(function (t) { audio.addEventListener(t, mark); });
    audio.addEventListener('error', function () {
      ctx.live.textContent = T.audioError;
      mark();
    });
  }

  function toggle() {
    if (!audio) return;
    if (audio.paused || audio.ended) {
      if (audio.ended) audio.currentTime = 0;
      var p = audio.play();
      if (p && p.catch) p.catch(function () { ctx.live.textContent = T.audioError; mark(); });
    } else audio.pause();
  }

  function stop() {
    if (!audio) return;
    audio.pause();
    audio.removeAttribute('src');
    audio.load();
    current = null;
    bar.hidden = true;
    mark();
    paint();
  }

  /** Reproduce la zona; si ya es la que suena, alterna reproducir y pausa. `src` ya viene validado por `pageZones`. */
  ctx.playZone = function (zone) {
    if (!audio) build();
    var key = zoneKey(zone);
    if (current === key) { toggle(); return; }
    current = key;
    audio.src = zone.src;
    titleEl.textContent = zone.title || T.audioPlayer;
    seek.value = '0';
    timeEl.textContent = '0:00 / 0:00';
    bar.hidden = false;
    ctx.live.textContent = (zone.title || T.audioPlayer);
    var p = audio.play();
    if (p && p.catch) p.catch(function () { ctx.live.textContent = T.audioError; mark(); });
    mark();
  };
}

/* ---- 80-zoom.js ---- */
/* Zoom y desplazamiento: botones, rueda, pellizco, arrastre, deslizar para pasar página y un clic (o toque) para ampliar al 200 % (FR-VIEW-004/009). */
function createZoom(ctx) {
  var state = ctx.state;
  var stage = ctx.stage;
  var scrollEl = ctx.scrollEl;

  ctx.applyTransform = function () {
    ctx.zoomLabel.textContent = Math.round(state.zoom * 100) + '%';
    ctx.btnZoomOut.disabled = state.zoom <= 1;
    ctx.btnZoomIn.disabled = state.zoom >= 4;
    if (state.mode === 'page') {
      if (ctx.engine) ctx.engine.layer.style.transform = 'translate(' + state.tx + 'px,' + state.ty + 'px) scale(' + state.zoom + ')';
      stage.classList.toggle('tl-zoomed', state.zoom > 1);
    } else {
      scrollEl.style.setProperty('--tl-zoom', String(state.zoom));
    }
    ctx.syncZoomImages();
  };

  ctx.clampPan = function () {
    var w = stage.clientWidth, hgt = stage.clientHeight;
    var mx = ((state.zoom - 1) * w) / 2, my = ((state.zoom - 1) * hgt) / 2;
    state.tx = clamp(state.tx, -mx, mx);
    state.ty = clamp(state.ty, -my, my);
  };

  ctx.setZoomRaw = function (z) { state.zoom = clamp(z, 1, 4); if (state.zoom === 1) { state.tx = 0; state.ty = 0; } ctx.applyTransform(); };

  function zoomAt(z, sx, sy) {
    var nz = clamp(z, 1, 4);
    var rect = stage.getBoundingClientRect();
    var cx = rect.left + rect.width / 2, cy = rect.top + rect.height / 2;
    var px = (sx - cx - state.tx) / state.zoom, py = (sy - cy - state.ty) / state.zoom;
    state.tx = sx - cx - nz * px;
    state.ty = sy - cy - nz * py;
    state.zoom = nz;
    if (nz === 1) { state.tx = 0; state.ty = 0; }
    ctx.clampPan();
    ctx.applyTransform();
    emit('zoomchange', { zoom: state.zoom });
  }

  ctx.setZoom = function (z) {
    var r = stage.getBoundingClientRect();
    if (state.mode === 'page') zoomAt(z, r.left + r.width / 2, r.top + r.height / 2);
    else { ctx.setZoomRaw(z); emit('zoomchange', { zoom: state.zoom }); }
  };
  ctx.zoomBy = function (d) { ctx.setZoom(state.zoom + d); };
  ctx.resetPan = function () { if (state.zoom !== 1) { state.zoom = 1; state.tx = 0; state.ty = 0; ctx.applyTransform(); emit('zoomchange', { zoom: 1 }); } };

  /* ---- gestos ---- */
  var pointers = {};
  var gesture = null;
  /** Otro módulo (la selección con el dedo) se queda con los punteros: se olvida lo que había en curso. */
  ctx.cancelPointers = function () { pointers = {}; gesture = null; };

  stage.addEventListener('pointerdown', function (e) {
    if (e.target.closest && e.target.closest('a,button,input')) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    // Con selección habilitada, pulsar una palabra con el ratón es seleccionar (arrastrar, doble clic): ni captura ni zoom.
    if (e.pointerType === 'mouse' && e.target.closest) { var layer = e.target.closest('.tl-text'); if (layer && e.target !== layer) return; }
    pointers[e.pointerId] = { x: e.clientX, y: e.clientY };
    try { stage.setPointerCapture(e.pointerId); } catch (err) { /* sin captura */ }
    var ids = Object.keys(pointers);
    if (ids.length === 2) {
      var a = pointers[ids[0]], b = pointers[ids[1]];
      gesture = { type: 'pinch', d: Math.hypot(a.x - b.x, a.y - b.y), z: state.zoom };
    } else gesture = { type: 'drag', x0: e.clientX, y0: e.clientY, tx: state.tx, ty: state.ty, moved: false, t: Date.now() };
  });
  stage.addEventListener('pointermove', function (e) {
    if (!pointers[e.pointerId]) return;
    pointers[e.pointerId] = { x: e.clientX, y: e.clientY };
    if (!gesture) return;
    var ids = Object.keys(pointers);
    if (gesture.type === 'pinch' && ids.length === 2) {
      var a = pointers[ids[0]], b = pointers[ids[1]];
      var d = Math.hypot(a.x - b.x, a.y - b.y);
      zoomAt(gesture.z * (d / gesture.d), (a.x + b.x) / 2, (a.y + b.y) / 2);
    } else if (gesture.type === 'drag') {
      var dx = e.clientX - gesture.x0, dy = e.clientY - gesture.y0;
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) gesture.moved = true;
      if (state.zoom > 1) { state.tx = gesture.tx + dx; state.ty = gesture.ty + dy; ctx.clampPan(); ctx.applyTransform(); }
    }
  });
  function endPointer(e) {
    if (!pointers[e.pointerId]) return;
    var g = gesture;
    delete pointers[e.pointerId];
    if (g && g.type === 'drag') {
      var dx = e.clientX - g.x0, dy = e.clientY - g.y0;
      if (ctx.engine && ctx.engine.claimed && ctx.engine.claimed()) { /* el flip arrastrado ya lo trató (F2) */ }
      else if (state.zoom === 1 && g.moved && Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5 && e.type === 'pointerup') ctx.go(dx < 0 ? 'next' : 'prev');
      else if (!g.moved && e.type === 'pointerup') {
        // un clic (o un toque) sin arrastre amplía al 200 % sobre el punto pulsado; otro clic vuelve al tamaño ajustado
        if (state.zoom > 1) ctx.setZoom(1); else zoomAt(2, e.clientX, e.clientY);
      }
    }
    if (!Object.keys(pointers).length) gesture = null;
  }
  stage.addEventListener('pointerup', endPointer);
  stage.addEventListener('pointercancel', endPointer);
  stage.addEventListener('wheel', function (e) {
    if (e.ctrlKey || e.metaKey) { e.preventDefault(); zoomAt(state.zoom * (e.deltaY < 0 ? 1.15 : 1 / 1.15), e.clientX, e.clientY); }
    else if (state.zoom > 1) { e.preventDefault(); state.tx -= e.deltaX; state.ty -= e.deltaY; ctx.clampPan(); ctx.applyTransform(); }
  }, { passive: false });
}

/* ---- 85-select.js ---- */
/* Selección de texto con el dedo (solo con `viewer.selection`): mantener pulsada una palabra la selecciona y, sin soltar, arrastrar
   amplía la selección palabra a palabra; al soltar aparece «Copiar». Con el ratón la selección es la nativa (ver flipbook.js). En el
   modo libro el dedo es del pase de página y del zoom, así que la pulsación larga reclama el gesto una vez que se cumple (sin
   moverse), y el visor sustituye a la selección nativa del navegador, que ahí no dejaría ni arrastrar ni copiar de forma fiable. */
function createSelect(ctx) {
  if (!(ctx.vcfg && ctx.vcfg.selection)) return;
  var T = ctx.T;
  var stage = ctx.stage;
  var HOLD_MS = 450;   // lo que tarda la pulsación larga
  var SLOP = 10;       // px que se puede mover el dedo antes de que sea un deslizamiento y no una pulsación
  var press = null;    // candidato: { id, x, y, word, timer }
  var active = null;   // selección en curso: { id, anchor, focus }
  var bar = null;

  function wordOf(node) {
    var s = node && node.closest ? node.closest('.tl-text span') : null;
    return s && s.parentNode && s.parentNode.classList.contains('tl-text') ? s : null;
  }

  function cancelPress() {
    if (press) { clearTimeout(press.timer); press = null; }
  }

  function select(a, b) {
    var sel = window.getSelection();
    if (!sel || !a.firstChild || !b.firstChild) return;
    var forward = a === b || !!(a.compareDocumentPosition(b) & 4);   // 4 = DOCUMENT_POSITION_FOLLOWING
    var first = forward ? a : b;
    var last = forward ? b : a;
    sel.setBaseAndExtent(first.firstChild, 0, last.firstChild, last.firstChild.length);
  }

  function clearSelection() {
    var sel = window.getSelection();
    if (sel) sel.removeAllRanges();
  }

  /* ---- barra «Copiar» ---- */
  function hideBar() {
    if (bar) bar.hidden = true;
  }

  function copyText(text) {
    function legacy() {
      var ta = h('textarea', { class: 'tl-copybuf', readonly: '', 'aria-hidden': 'true', tabindex: '-1' });
      ta.value = text;
      ctx.root.appendChild(ta);
      ta.select();
      var ok = false;
      try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
      ctx.root.removeChild(ta);
      return ok;
    }
    function done(ok) {
      ctx.live.textContent = ok ? T.copied : T.copyFail;
      hideBar();
      if (ok) clearSelection();
    }
    if (navigator.clipboard && navigator.clipboard.writeText && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(function () { done(true); }, function () { done(legacy()); });
    } else done(legacy());
  }

  function showBar() {
    var sel = window.getSelection();
    var text = sel ? String(sel).replace(/\s+/g, ' ').trim() : '';
    if (!text) { hideBar(); return; }
    if (!bar) {
      var copy = h('button', { type: 'button', class: 'tl-selbtn', text: T.copy });
      var close = h('button', { type: 'button', class: 'tl-selbtn tl-selclose', 'aria-label': T.close, text: '×' });
      bar = h('div', { class: 'tl-selbar', role: 'toolbar', 'aria-label': T.copy }, [copy, close]);
      bar._copy = copy;
      copy.addEventListener('click', function () {
        var s = window.getSelection();
        copyText(s ? String(s).replace(/\s+/g, ' ').trim() : '');
      });
      close.addEventListener('click', function () { hideBar(); clearSelection(); });
      ctx.root.appendChild(bar);
    }
    var r = sel.getRangeAt(0).getBoundingClientRect();
    var host = ctx.root.getBoundingClientRect();
    bar.hidden = false;
    var w = bar.offsetWidth || 150;
    var left = clamp(r.left + r.width / 2 - host.left - w / 2, 8, Math.max(8, host.width - w - 8));
    var top = r.top - host.top - 52;
    if (top < 8) top = r.bottom - host.top + 10;
    bar.style.left = left + 'px';
    bar.style.top = top + 'px';
  }

  /* ---- gesto ---- */
  function begin() {
    var p = press;
    press = null;
    if (!p) return;
    active = { id: p.id, anchor: p.word, focus: p.word };
    // el dedo deja de ser del pase de página y del zoom
    if (ctx.engine && ctx.engine.cancelGesture) ctx.engine.cancelGesture();
    if (ctx.cancelPointers) ctx.cancelPointers();
    select(active.anchor, active.focus);
    hideBar();
    try { if (navigator.vibrate) navigator.vibrate(12); } catch (e) { /* sin vibración */ }
  }

  stage.addEventListener('pointerdown', function (e) {
    if (e.pointerType === 'mouse') return;
    hideBar();
    if (!e.isPrimary) { cancelPress(); return; }   // segundo dedo: pellizco
    var w = wordOf(e.target);
    if (active || !w) return;
    var sel = window.getSelection();
    if (sel && !sel.isCollapsed) clearSelection();   // tocar fuera de la selección la quita
    press = { id: e.pointerId, x: e.clientX, y: e.clientY, word: w, timer: setTimeout(begin, HOLD_MS) };
  });

  stage.addEventListener('pointermove', function (e) {
    if (press && press.id === e.pointerId && Math.hypot(e.clientX - press.x, e.clientY - press.y) > SLOP) cancelPress();
    if (!active || active.id !== e.pointerId) return;
    var w = wordOf(document.elementFromPoint(e.clientX, e.clientY));
    if (w && w !== active.focus) { active.focus = w; select(active.anchor, w); }
  });

  function end(e) {
    if (press && press.id === e.pointerId) cancelPress();
    if (!active || active.id !== e.pointerId) return;
    active = null;
    if (e.type === 'pointerup') showBar(); else { hideBar(); }
  }
  stage.addEventListener('pointerup', end);
  stage.addEventListener('pointercancel', end);

  // Sobre una palabra, el navegador no debe empezar su propia selección ni mostrar su menú: la selección es la del visor.
  stage.addEventListener('touchstart', function (e) {
    if (e.touches.length === 1 && wordOf(e.target)) e.preventDefault();
  }, { passive: false });
  stage.addEventListener('contextmenu', function (e) {
    if (press || active || wordOf(e.target)) e.preventDefault();
  });

  ctx.root.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && bar && !bar.hidden) { hideBar(); clearSelection(); }
  });
}

/* ---- 90-panels.js ---- */
/* Panel lateral: miniaturas, índice y búsqueda. Un solo panel abierto a la vez, con el foco devuelto al botón que lo abrió. */
function createPanels(ctx) {
  var root = ctx.root;
  var panel = ctx.panel;
  var state = ctx.state;
  var pages = ctx.pages;
  var T = ctx.T;
  var text = ctx.text;
  var search = ctx.search;

  function buttons() { return { thumbs: ctx.btnThumbs, toc: ctx.btnToc, search: ctx.btnSearch }; }

  ctx.togglePanel = function (name) { if (state.panel === name) ctx.closePanel(true); else ctx.openPanel(name); };

  function setExpanded() {
    var b = buttons();
    ['thumbs', 'toc', 'search'].forEach(function (k) { if (b[k]) b[k].setAttribute('aria-expanded', String(state.panel === k)); });
  }

  ctx.closePanel = function (restoreFocus) {
    var prev = state.panel;
    state.panel = null;
    panel.hidden = true;
    panel.textContent = '';
    root.classList.remove('tl-panel-open');
    setExpanded();
    ctx.layoutSoon();
    // el botón que lo abrió puede estar oculto por la configuración de la barra (F3.5): entonces el foco vuelve al visor, no se pierde
    if (restoreFocus && prev) { var b = buttons()[prev]; if (b && b.isConnected) b.focus(); else root.focus({ preventScroll: true }); }
  };

  function panelHeader(label) {
    var close = ctx.button('close', T.close, 'tl-panel-close', function () { ctx.closePanel(true); });
    return h('div', { class: 'tl-panel-head' }, [h('h2', { text: label }), close]);
  }

  ctx.openPanel = function (name) {
    state.panel = name;
    panel.hidden = false;
    panel.id = 'tl-panel';
    panel.textContent = '';
    panel.setAttribute('aria-label', { thumbs: T.thumbs, toc: T.toc, search: T.search }[name]);
    root.classList.add('tl-panel-open');
    setExpanded();
    if (name === 'thumbs') buildThumbs();
    else if (name === 'toc') buildToc();
    else buildSearch();
    ctx.layoutSoon();
  };

  function buildThumbs() {
    panel.appendChild(panelHeader(T.thumbs));
    var list = h('ul', { class: 'tl-thumbs' });
    pages.forEach(function (pg) {
      var im = h('img', { src: pg.thumbnail, alt: '', loading: 'lazy', decoding: 'async' });
      im.style.aspectRatio = pg.width + ' / ' + pg.height;
      var b = h('button', { type: 'button', class: 'tl-thumb', 'data-page': String(pg.number), 'aria-label': T.page + ' ' + ctx.labelOf(pg.number) }, [im, h('span', { text: ctx.labelOf(pg.number) })]);
      b.addEventListener('click', function () { ctx.goToPage(pg.number); });
      list.appendChild(h('li', null, [b]));
    });
    panel.appendChild(list);
    ctx.refreshPanelCurrent(true);
    var first = list.querySelector('[aria-current="page"]') || list.querySelector('button');
    if (first) first.focus({ preventScroll: true });
  }

  function buildToc() {
    panel.appendChild(panelHeader(T.toc));
    if (!ctx.hasToc) { panel.appendChild(h('p', { class: 'tl-empty', text: T.noToc })); return; }
    function make(items) {
      var ul = h('ul', { class: 'tl-toclist' });
      items.forEach(function (it) {
        var b = h('button', { type: 'button', class: 'tl-tocitem' }, [h('span', { text: it.title }), h('span', { class: 'tl-tocpage', text: ctx.labelOf(it.page) })]);
        b.addEventListener('click', function () { ctx.goToPage(it.page); });
        var li = h('li', null, [b]);
        if (it.children && it.children.length) li.appendChild(make(it.children));
        ul.appendChild(li);
      });
      return ul;
    }
    panel.appendChild(make(ctx.data.toc));
    var f = panel.querySelector('.tl-tocitem'); if (f) f.focus();
  }

  function buildSearch() {
    panel.appendChild(panelHeader(T.search));
    var input = h('input', { type: 'search', class: 'tl-searchinput', placeholder: T.searchPlaceholder, 'aria-label': T.search, autocomplete: 'off', spellcheck: 'false' });
    var prevB = ctx.button('up', T.prevResult, '', function () { ctx.stepResult(-1); });
    var nextB = ctx.button('down', T.nextResult, '', function () { ctx.stepResult(1); });
    panel.appendChild(h('div', { class: 'tl-searchbar' }, [input, prevB, nextB]));
    panel.appendChild(h('p', { class: 'tl-searchstatus', role: 'status', 'aria-live': 'polite' }));
    panel.appendChild(h('ul', { class: 'tl-results' }));
    var st = panel.querySelector('.tl-searchstatus');
    var timer;
    input.value = search.query;
    input.addEventListener('input', function () { clearTimeout(timer); timer = setTimeout(function () { ready(function () { ctx.runSearch(input.value); }); }, 150); });
    input.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); ready(function () { if (input.value !== search.query) ctx.runSearch(input.value); ctx.stepResult(e.shiftKey ? -1 : 1); }); } });
    function ready(fn) {
      if (text.status === 'ready') return fn();
      st.textContent = T.loadingText;
      ctx.loadText().then(fn, function () {
        st.textContent = T.textError;
        var r = h('button', { type: 'button', class: 'tl-retry', text: T.retry });
        r.addEventListener('click', function () { text.status = 'idle'; ready(fn); });
        panel.appendChild(r);
      });
    }
    if (!ctx.config.viewer.search) { st.textContent = T.noSearch; input.disabled = true; }
    else if (search.query) ready(function () { ctx.renderResults(); });
    input.focus();
  }

  ctx.refreshPanelCurrent = function (scroll) {
    if (state.panel !== 'thumbs') return;
    panel.querySelectorAll('.tl-thumb').forEach(function (b) {
      var cur = Number(b.dataset.page) === state.page || (ctx.engine && ctx.engine.current && ctx.engine.current().indexOf(Number(b.dataset.page)) !== -1);
      if (cur) { b.setAttribute('aria-current', 'page'); if (scroll || true) b.scrollIntoView({ block: 'nearest' }); } else b.removeAttribute('aria-current');
    });
  };
}

/* ---- 95-nav.js ---- */
/* Navegación: modo página (motor de flip), modo desplazamiento virtualizado, ir a una página, hash de la URL y maquetación. */
function createNav(ctx) {
  var state = ctx.state;
  var pages = ctx.pages;
  var count = ctx.count;
  var vcfg = ctx.vcfg;
  var stage = ctx.stage;
  var scrollEl = ctx.scrollEl;
  var observer = null;
  var layoutTimer = null;

  ctx.engine = null;

  ctx.mountPageMode = function () {
    stage.hidden = false;
    scrollEl.hidden = true;
    ctx.engine = TekLeafFlipbook.create(stage, {
      pages: pages,
      renderPage: ctx.renderPage,
      double: vcfg.doublePage !== false,
      flip: vcfg.flip !== false,
      onChange: onSpreadChange,
      canDrag: function () { return ctx.state.zoom === 1; },   // con zoom, arrastrar es desplazar (F2)
      onDegrade: function () { /* NFR-PERF-004: transición simple */ }
    });
    ctx.engine.goToPage(state.page, false);
    ctx.applyTransform();
  };

  function onSpreadChange(sp) {
    state.page = sp.pages[0];
    ctx.updateUi(sp.pages);
    ctx.prefetchWindow(sp.pages[0]);
    ctx.refreshPanelCurrent();
  }

  function mountScrollMode() {
    stage.hidden = true;
    scrollEl.hidden = false;
    scrollEl.textContent = '';
    if (ctx.engine) { ctx.engine.destroy(); ctx.engine = null; }
    var inner = h('div', { class: 'tl-scrollinner' });
    scrollEl.appendChild(inner);
    var visible = {};
    observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        var node = en.target;
        var n = Number(node.dataset.page);
        visible[n] = en.intersectionRatio;
        if (en.isIntersecting) {
          if (!node.dataset.ready) { node.dataset.ready = '1'; fillScrollPage(node, n); }
        } else if (node.dataset.ready && Math.abs(n - state.page) > 6) {
          node.textContent = ''; delete node.dataset.ready;
        }
      });
      var best = state.page, bestR = -1;
      Object.keys(visible).forEach(function (k) { if (visible[k] > bestR) { bestR = visible[k]; best = Number(k); } });
      if (bestR > 0 && best !== state.page && !scrollEl._jumping) { state.page = best; ctx.updateUi([best]); ctx.refreshPanelCurrent(); }
    }, { root: scrollEl, rootMargin: '100% 0px', threshold: [0, 0.25, 0.5, 0.75, 1] });
    pages.forEach(function (pg) {
      var slot = h('div', { class: 'tl-scrollpage', 'data-page': String(pg.number) });
      slot.style.aspectRatio = pg.width + ' / ' + pg.height;
      inner.appendChild(slot);
      observer.observe(slot);
    });
    ctx.applyTransform();
    scrollToPage(state.page);
  }
  ctx.mountScrollMode = mountScrollMode;

  function fillScrollPage(slot, n) {
    var node = ctx.renderPage(n);
    node.style.width = '100%';
    slot.appendChild(node);
  }

  function scrollToPage(n) {
    var slot = scrollEl.querySelector('[data-page="' + n + '"]');
    if (!slot) return;
    scrollEl._jumping = true;
    // sin scrollIntoView: también desplazaría el visor entero (las barras flotantes subirían con él)
    scrollEl.scrollTop += slot.getBoundingClientRect().top - scrollEl.getBoundingClientRect().top;
    setTimeout(function () { scrollEl._jumping = false; state.page = n; ctx.updateUi([n]); }, 60);
  }

  function unmountObserver() { if (observer) { observer.disconnect(); observer = null; } }

  ctx.toggleMode = function () {
    state.mode = state.mode === 'page' ? 'scroll' : 'page';
    ctx.setZoomRaw(1);
    unmountObserver();
    if (state.mode === 'scroll') mountScrollMode();
    else { scrollEl.textContent = ''; ctx.mountPageMode(); }
    ctx.syncModeButton();
    ctx.writeHash();
  };

  ctx.go = function (dir) {
    if (state.mode === 'scroll') {
      if (dir === 'first') ctx.goToPage(1);
      else if (dir === 'last') ctx.goToPage(count);
      else ctx.goToPage(state.page + (dir === 'next' ? 1 : -1));
      return;
    }
    ctx.resetPan();
    if (!ctx.engine) return;
    if (dir === 'next') ctx.engine.next();
    else if (dir === 'prev') ctx.engine.prev();
    else if (dir === 'first') ctx.engine.first();
    else ctx.engine.last();
  };

  ctx.goToPage = function (n) {
    n = clamp(Math.round(n) || 1, 1, count);
    if (state.mode === 'scroll') { scrollToPage(n); return; }
    ctx.resetPan();
    if (ctx.engine) ctx.engine.goToPage(n, true);
  };

  ctx.writeHash = function () {
    try {
      var parts = ['page=' + state.page];
      if (embedded || ctx.hash.theme) { /* conservar solo parámetros de página */ }
      history.replaceState(null, '', '#' + parts.join('&'));
    } catch (e) { /* entorno sin history (sandbox opaco) */ }
  };

  ctx.layoutSoon = function () {
    clearTimeout(layoutTimer);
    layoutTimer = setTimeout(function () { if (ctx.engine) { ctx.engine.layout(); ctx.clampPan(); ctx.applyTransform(); } }, 30);
  };
  if (window.ResizeObserver) new ResizeObserver(ctx.layoutSoon).observe(ctx.stageWrap); else window.addEventListener('resize', ctx.layoutSoon);

  window.addEventListener('hashchange', function () {
    var hh = parseHash();
    var n = parseInt(hh.page, 10);
    if (n && n !== state.page) ctx.goToPage(n);
  });
}

/* ---- 96-intro.js ---- */
/* Intro / ayuda inicial (F3.3): diálogo modal que se muestra la primera vez, se recuerda y se reabre con «?». Todo texto va con
   textContent y cada valor de la configuración se revalida: la configuración es dato, nunca HTML ni CSS. */
var INTRO_LOGO = /^assets\/[A-Za-z0-9._-]+\.(?:png|jpe?g|svg)$/i;

function createIntro(ctx) {
  var root = ctx.root;
  var T = ctx.T;
  var cfg = ctx.vcfg.intro;
  var embed = root.getAttribute('data-mode') === 'embed';
  var enabled = !!cfg && typeof cfg === 'object' && !Array.isArray(cfg) && (!embed || cfg.embed === true);
  ctx.introEnabled = enabled;
  ctx.showIntro = function () {};
  ctx.showIntroFirstTime = function () {};
  if (!enabled) return;

  var title = typeof cfg.title === 'string' && cfg.title.length >= 1 && cfg.title.length <= 80 ? cfg.title : T.introTitle;
  var custom = typeof cfg.text === 'string' && cfg.text.length >= 1 && cfg.text.length <= 600 ? cfg.text : '';
  var logo = typeof cfg.logo === 'string' && INTRO_LOGO.test(cfg.logo) ? cfg.logo : '';
  var logoBg = parseHex(cfg.logoBackground);
  var wait = typeof cfg.dismissAfterMs === 'number' && cfg.dismissAfterMs >= 1000 && cfg.dismissAfterMs <= 120000 ? Math.round(cfg.dismissAfterMs) : 0;
  var seenKey = 'tekleaf.intro.' + String(ctx.config.publication.id || '');
  var timer = null;
  var returnTo = null;

  /* ---- contenido: el del autor, o el de serie según lo que este visor tiene de verdad (flip, modo, búsqueda) ---- */
  var body = h('div', { class: 'tl-intro-text', id: 'tl-intro-text' });
  if (custom) {
    custom.split('\n').forEach(function (line) { if (line.trim()) body.appendChild(h('p', { text: line.trim() })); });
  } else {
    var list = h('ul');
    var first = ctx.state.mode === 'scroll' ? T.introScroll : (ctx.vcfg.flip !== false ? T.introFlip : T.introSwipe);
    var items = [first, T.introZoom];
    if (ctx.btnSearch) items.push(T.introSearch);
    if (ctx.vcfg.selection && ctx.state.mode !== 'scroll') items.push(T.introSelect);
    items.push(T.introAgain);
    items.forEach(function (t) { list.appendChild(h('li', { text: t })); });
    body.appendChild(list);
  }

  /* ---- estructura ---- */
  var okBtn = h('button', { type: 'button', class: 'tl-intro-ok', text: T.introOk });
  var box = h('div', { class: 'tl-intro-box', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'tl-intro-title', 'aria-describedby': 'tl-intro-text' });
  var overlay = h('div', { class: 'tl-intro', hidden: '' }, [box]);
  if (logo) {
    var band = h('div', { class: 'tl-intro-brand' }, [h('img', { class: 'tl-intro-logo', src: logo, alt: '' })]);
    // la banda del logo: el color indicado o, si la barra tiene uno propio, ese (un logo blanco sobre transparente necesita fondo)
    if (logoBg) { band.style.setProperty('--tl-intro-brand', toHex(logoBg)); band.classList.add('tl-intro-band'); }
    else if (root.style.getPropertyValue('--tl-bar')) band.classList.add('tl-intro-band');
    box.appendChild(band);
  }
  box.appendChild(h('div', { class: 'tl-intro-content' }, [h('h2', { id: 'tl-intro-title', text: title }), body, okBtn]));
  root.appendChild(overlay);

  /* ---- abrir y cerrar ---- */
  function seen() { try { return !!(ctx.store && ctx.store.getItem(seenKey)); } catch (e) { return false; } }
  function remember() { try { if (ctx.store) ctx.store.setItem(seenKey, '1'); } catch (e) { /* sin almacenamiento: se mostrará de nuevo, pero no estorba */ } }
  function setInert(on) {
    Array.prototype.forEach.call(root.children, function (c) {
      if (c === overlay || !/\btl-(toolbar|body|bottom)\b/.test(c.className)) return;
      if (on) c.setAttribute('inert', ''); else c.removeAttribute('inert');
    });
  }
  function cancelTimer() { clearTimeout(timer); timer = null; }

  function open() {
    if (!overlay.hidden) return;
    returnTo = document.activeElement;
    overlay.hidden = false;
    setInert(true);
    okBtn.focus();
    cancelTimer();
    if (wait) timer = setTimeout(close, wait);
  }
  function close() {
    if (overlay.hidden) return;
    cancelTimer();
    overlay.hidden = true;
    setInert(false);
    remember();
    var back = returnTo && root.contains(returnTo) && typeof returnTo.focus === 'function' ? returnTo : root;
    returnTo = null;
    back.focus({ preventScroll: true });
  }

  okBtn.addEventListener('click', close);
  overlay.addEventListener('click', function (e) { if (e.target === overlay) close(); });
  // quien interactúa con el diálogo no quiere que se cierre solo
  ['pointerdown', 'pointerenter', 'wheel', 'keydown'].forEach(function (t) { overlay.addEventListener(t, cancelTimer, { passive: true }); });
  overlay.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); return; }
    if (e.key === 'Tab') { e.preventDefault(); okBtn.focus(); return; }   // el botón es lo único enfocable: el foco no sale del diálogo
    e.stopPropagation();   // las flechas, el espacio y los atajos no deben mover el libro que hay debajo
  });
  document.addEventListener('keydown', function (e) {
    if (e.defaultPrevented || e.key !== '?' || e.ctrlKey || e.metaKey || e.altKey) return;
    var t = e.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;
    e.preventDefault();
    open();
  });

  ctx.showIntro = open;
  ctx.showIntroFirstTime = function () { if (!seen()) open(); };
}

/* ---- 99-viewer.js ---- */
/* Arranque: valida los datos, crea el contexto compartido y conecta los módulos. */
function fatal(root, msg) {
  root.textContent = '';
  root.appendChild(h('div', { class: 'tl-fatal', role: 'alert', text: msg }));
}

function boot() {
  var root = document.getElementById('tekleaf');
  if (!root) return;
  var config = window.TEKLEAF_CONFIG;
  var data = window.TEKLEAF_PAGES;
  var lang0 = (document.documentElement.lang || 'es').slice(0, 2);
  var T0 = I18N[lang0] || I18N.es;
  if (!config || !data) return fatal(root, T0.configError);
  var major = parseInt(String(config.formatVersion || data.formatVersion || '0').split('.')[0], 10);
  if (major !== SUPPORTED_MAJOR) {
    emit('error', { code: 'UNSUPPORTED_FORMAT', message: 'formatVersion ' + config.formatVersion });
    return fatal(root, T0.unsupported);
  }
  start(root, config, data);
}

/**
 * Contexto compartido (`ctx`): datos de la publicación, estado y las funciones que cada módulo publica para los demás.
 * Los módulos se llaman entre sí siempre a través de `ctx`, así que el orden de creación solo importa para lo que
 * se usa durante la construcción (etiquetas → interfaz → resto).
 */
function start(root, config, data) {
  var pages = data.pages;
  var vcfg = config.viewer || {};
  var hash = parseHash();
  var store = storage();

  var langPref = vcfg.language && vcfg.language !== 'auto' ? vcfg.language : (config.publication.language || navigator.language || 'es');
  var lang = String(langPref).slice(0, 2).toLowerCase();
  if (!I18N[lang]) lang = String(navigator.language || 'es').slice(0, 2).toLowerCase();

  var state = {
    mode: hash.mode === 'scroll' || hash.mode === 'page' ? hash.mode : (vcfg.mode === 'scroll' ? 'scroll' : 'page'),
    theme: hash.theme || (store && store.getItem('tekleaf.theme')) || vcfg.theme || 'auto',
    zoom: 1, tx: 0, ty: 0, page: 1, panel: null
  };
  if (['auto', 'light', 'dark'].indexOf(state.theme) < 0) state.theme = 'auto';

  var ctx = {
    root: root, config: config, data: data, pages: pages, count: pages.length, vcfg: vcfg, hash: hash, store: store,
    T: I18N[lang] || I18N.es,
    state: state,
    text: { status: 'idle', data: null, folded: [], waiters: [] },
    search: { query: '', results: [], active: -1, perPage: {} }
  };

  createLabels(ctx);
  createUi(ctx);
  createPages(ctx);
  createSearch(ctx);
  createAudio(ctx);
  createZoom(ctx);
  createSelect(ctx);
  createPanels(ctx);
  createNav(ctx);
  createBridge(ctx);
  createIntro(ctx);

  /* ---- inicio ---- */
  var startPage = parseInt(hash.page, 10);
  state.page = startPage >= 1 && startPage <= ctx.count ? startPage : 1;
  ctx.syncModeButton();
  if (state.mode === 'scroll') ctx.mountScrollMode(); else ctx.mountPageMode();
  ctx.onFullscreenChange();
  if (vcfg.selection) {
    ctx.loadText().then(function () {
      root.querySelectorAll('.tl-page[data-page]').forEach(function (w) { ctx.addTextLayer(w, Number(w.dataset.page)); });
      ctx.updateSrText(ctx.engine ? ctx.engine.current() : [state.page]);
    }, function () { /* sin capa de texto */ });
  }
  root.focus({ preventScroll: true });
  ctx.showIntroFirstTime();
  emit('ready', { pageCount: ctx.count, page: state.page, version: PROTOCOL });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
