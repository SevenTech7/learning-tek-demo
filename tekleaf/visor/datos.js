/*
 * Datos del libro convertido en el navegador. En un paquete exportado, `data/config.js` y `data/pages.js` definen estas
 * variables; aquí las entrega la página que contiene este visor (mismo origen), que es quien hizo la conversión.
 * Se copian con JSON para que el visor trabaje con objetos de su propio contexto.
 */
(function () {
  var libro = null;
  try { libro = window.parent && window.parent !== window ? window.parent.__tekleafLibro : null; } catch (e) { libro = null; }
  if (!libro) return;   // sin datos, el visor muestra su propio aviso de «no se pudieron cargar los datos»
  window.TEKLEAF_CONFIG = JSON.parse(JSON.stringify(libro.config));
  window.TEKLEAF_PAGES = JSON.parse(JSON.stringify(libro.pages));
  if (libro.text) window.TEKLEAF_TEXT = JSON.parse(JSON.stringify(libro.text));
})();
