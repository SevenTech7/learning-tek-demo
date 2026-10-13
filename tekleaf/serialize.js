/**
 * Serializa JSON para incrustarlo en un script clásico (FR-EXP-004, NFR-SEC-003).
 * Escapa `<`, `>`, `&` y los separadores de línea U+2028/2029 para que ningún texto
 * del documento pueda cerrar el literal ni la etiqueta <script>.
 */
export function safeJson(value, indent) {
  return JSON.stringify(value, null, indent)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

export const dataScript = (globalName, value, indent) => `window.${globalName} = ${safeJson(value, indent)};\n`;
