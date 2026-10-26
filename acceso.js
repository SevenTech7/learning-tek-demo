/*
 * Acceso de las demostraciones publicadas (Autoría, TekLeaf y Plataforma): UNA sola credencial para las tres.
 *
 * Es un script clásico y sin dependencias que `scripts/ensamblar-demo.mjs` copia a la raíz del sitio y enlaza
 * desde la página de cada demo. Expone `window.AccesoDemo`:
 *
 *   verificar(usuario, clave) -> Promise<boolean>   compara contra un hash; si coincide, recuerda el acceso.
 *   abierto()                 -> boolean            ¿se verificó la credencial en este navegador (últimas 12 h)?
 *   cerrar()                  -> void               olvida el acceso.
 *
 * La credencial NO está aquí: solo su hash (PBKDF2-SHA256, sal propia, 310 000 vueltas). Con una clave larga no
 * se puede deducir leyendo el código. Aun así es un sitio estático: quien edite el JavaScript en su navegador
 * puede saltarse el aviso de «clave incorrecta». Es una puerta para que no entre cualquiera que tropiece con el
 * enlace, no una caja fuerte. La protección real llega con el despliegue en Azure.
 *
 * Para cambiar la credencial: `scripts/generar-credencial-demo.py` imprime la sal y el hash nuevos.
 * El valor guardado en el navegador es solo una marca de tiempo; no contiene ni la clave ni su hash.
 */
(function () {
  "use strict";

  var SAL = "tK8tpDwL1Ujnq+1+lj1GJQ==";
  var HASH = "GlWf6gMOHpko3ABA1aZNOvq68rEGr5K1rN8bmbypY4A=";
  var VUELTAS = 310000;

  var MARCA = "tek7-demo:acceso";
  var VIGENCIA_MS = 12 * 60 * 60 * 1000;

  function bytes(base64) {
    var binario = atob(base64);
    var salida = new Uint8Array(binario.length);
    for (var i = 0; i < binario.length; i += 1) salida[i] = binario.charCodeAt(i);
    return salida;
  }

  function abierto() {
    try {
      var guardado = JSON.parse(window.localStorage.getItem(MARCA) || "null");
      return !!guardado && typeof guardado.hasta === "number" && guardado.hasta > Date.now();
    } catch (error) {
      return false;
    }
  }

  function recordar() {
    try {
      window.localStorage.setItem(MARCA, JSON.stringify({ hasta: Date.now() + VIGENCIA_MS }));
    } catch (error) {
      /* sin almacenamiento: entra igual, pero no se recuerda */
    }
  }

  function cerrar() {
    try {
      window.localStorage.removeItem(MARCA);
    } catch (error) {
      /* nada que olvidar */
    }
  }

  function iguales(a, b) {
    if (a.length !== b.length) return false;
    var diferencia = 0;
    for (var i = 0; i < a.length; i += 1) diferencia |= a[i] ^ b[i];
    return diferencia === 0;
  }

  /** Sin WebCrypto (página servida sin HTTPS fuera de localhost) no se puede comprobar: se rechaza. */
  function verificar(usuario, clave) {
    var cripto = window.crypto && window.crypto.subtle;
    if (!cripto) return Promise.resolve(false);
    var texto = String(usuario == null ? "" : usuario).trim().toLowerCase() + "\n" + String(clave == null ? "" : clave);
    var codificador = new TextEncoder();
    return cripto
      .importKey("raw", codificador.encode(texto), "PBKDF2", false, ["deriveBits"])
      .then(function (material) {
        return cripto.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: bytes(SAL), iterations: VUELTAS }, material, 256);
      })
      .then(function (derivado) {
        var coincide = iguales(new Uint8Array(derivado), bytes(HASH));
        if (coincide) recordar();
        return coincide;
      })
      .catch(function () {
        return false;
      });
  }

  window.AccesoDemo = Object.freeze({ verificar: verificar, abierto: abierto, cerrar: cerrar });
})();
