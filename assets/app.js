/*
 * Dibuja la lista de aplicaciones a partir de window.LEARNING_TEK_REGISTRY (apps.js).
 *
 * Script clásico (no módulo) a propósito: los módulos ES no cargan desde file://, y esta página
 * tiene que abrirse también con doble clic. No guarda nada: el entorno elegido viaja en la URL
 * (?entorno=local), no en localStorage ni en cookies.
 */
(function () {
  "use strict";

  var ETIQUETA_SALUD = {
    comprobando: "Comprobando…",
    ok: "En línea",
    ko: "Sin respuesta",
    "sin-url": "Sin desplegar",
  };
  var ESPERA_SALUD_MS = 5000;
  var MOSTRAR_FILTRO_DESDE = 7;

  var registro = window.LEARNING_TEK_REGISTRY;
  var rejilla = document.getElementById("rejilla");

  if (!registro || !Array.isArray(registro.apps) || !Array.isArray(registro.entornos) || !registro.entornos.length) {
    rejilla.appendChild(el("p", { className: "aviso" }, "No se pudo leer apps.js. Revisa que exista y que no tenga errores."));
    return;
  }

  // Registro depurado para publicar (lo marca scripts/ensamblar-demo.mjs): sin diagnóstico interno
  // y con textos pensados para quien visita, no para quien desarrolla.
  var publico = registro.modoPublico === true;
  // Las etiquetas del estado MVP viven en el registro interno (no en este script) para que la página
  // publicada no lleve ese vocabulario. Sin etiquetas, no se dibuja ninguna insignia.
  var ETIQUETA_ESTADO = registro.etiquetasEstado || {};
  var TEXTO_SIN_URL = publico ? "Próximamente" : "Sin desplegar";
  ETIQUETA_SALUD["sin-url"] = TEXTO_SIN_URL;

  var entornoActual = elegirEntorno();
  dibujarEntornos();
  var tarjetas = registro.apps.map(dibujarTarjeta);
  tarjetas.forEach(function (t) {
    rejilla.appendChild(t.nodo);
  });
  if (!tarjetas.length) {
    rejilla.appendChild(el("p", { className: "vacio" }, "Todavía no hay aplicaciones registradas en apps.js."));
  }
  actualizarResumen();
  prepararFiltro();
  tarjetas.forEach(comprobarSalud);

  // ── Entorno ─────────────────────────────────────────────────────────────

  function elegirEntorno() {
    var pedido = new URLSearchParams(window.location.search).get("entorno");
    var encontrado = registro.entornos.filter(function (e) {
      return e.id === pedido;
    })[0];
    return encontrado || registro.entornos[0];
  }

  function dibujarEntornos() {
    var nav = document.getElementById("entornos");
    // Con un solo entorno no hay nada que elegir.
    if (registro.entornos.length < 2) {
      nav.hidden = true;
      return;
    }
    registro.entornos.forEach(function (e, i) {
      var params = new URLSearchParams(window.location.search);
      if (i === 0) params.delete("entorno");
      else params.set("entorno", e.id);
      var consulta = params.toString();
      var a = el("a", { href: consulta ? "?" + consulta : window.location.pathname, title: e.descripcion || "" }, e.nombre);
      if (e.id === entornoActual.id) a.setAttribute("aria-current", "page");
      nav.appendChild(a);
    });
  }

  // ── Tarjeta ─────────────────────────────────────────────────────────────

  function dibujarTarjeta(app) {
    var datosEntorno = (app.entornos && app.entornos[entornoActual.id]) || null;
    var url = datosEntorno ? urlSegura(datosEntorno.url, app.id) : null;
    var estado = ETIQUETA_ESTADO[app.mvp && app.mvp.estado] ? app.mvp.estado : null;

    var nodo = el("article", { className: "app", id: "app-" + app.id });
    nodo.setAttribute("aria-labelledby", "titulo-" + app.id);

    var cabeza = el("div", { className: "app__cabeza" });
    cabeza.appendChild(el("span", { className: "app__categoria" }, app.categoria || ""));
    if (estado) cabeza.appendChild(el("span", { className: "estado estado--" + estado }, ETIQUETA_ESTADO[estado]));
    nodo.appendChild(cabeza);

    nodo.appendChild(el("h2", { id: "titulo-" + app.id }, app.nombre));
    if (app.descripcion) nodo.appendChild(el("p", { className: "app__desc" }, app.descripcion));

    if (Array.isArray(app.stack) && app.stack.length) {
      var lista = el("ul", { className: "stack" });
      lista.setAttribute("aria-label", "Tecnologías");
      app.stack.forEach(function (s) {
        lista.appendChild(el("li", null, s));
      });
      nodo.appendChild(lista);
    }

    if (app.mvp && app.mvp.nota) nodo.appendChild(el("p", { className: "app__mvp" }, app.mvp.nota));

    // Bloque del entorno elegido
    var bloque = el("div", { className: "app__entorno" });
    var salud = el("p", { className: "salud" });
    salud.appendChild(el("span", { className: "salud__punto" }));
    var saludTexto = el("span", null, "");
    salud.appendChild(saludTexto);
    bloque.appendChild(salud);

    if (!datosEntorno) {
      fijarSalud(salud, saludTexto, "sin-url", publico ? TEXTO_SIN_URL : "Sin configurar en «" + entornoActual.nombre + "»");
    } else if (!url) {
      fijarSalud(salud, saludTexto, "sin-url");
    }

    // notaPublica es para quien visita; nota es interna (en la página publicada ya viene quitada).
    if (datosEntorno && datosEntorno.notaPublica) bloque.appendChild(el("p", { className: "app__nota" }, datosEntorno.notaPublica));
    if (datosEntorno && datosEntorno.nota) bloque.appendChild(el("p", { className: "app__nota" }, datosEntorno.nota));

    if (datosEntorno && Array.isArray(datosEntorno.acceso) && datosEntorno.acceso.length) {
      bloque.appendChild(dibujarAcceso(datosEntorno.acceso));
    }
    nodo.appendChild(bloque);

    // Acciones
    var acciones = el("div", { className: "app__acciones" });
    if (url) {
      var abrir = el("a", { className: "boton boton--principal", href: url, target: "_blank", rel: "noopener noreferrer" }, "Abrir");
      abrir.appendChild(el("span", { "aria-hidden": "true" }, "↗"));
      abrir.appendChild(el("span", { className: "visualmente-oculto" }, " (se abre en una pestaña nueva)"));
      acciones.appendChild(abrir);
    } else {
      var inactivo = el("span", { className: "boton boton--inactivo", title: TEXTO_SIN_URL }, "Abrir");
      inactivo.setAttribute("aria-disabled", "true");
      acciones.appendChild(inactivo);
    }
    // Un repositorio privado no sirve a nadie más que a su dueño: no se enlaza (daría 404), se avisa.
    if (app.codigo && app.codigo.privado) {
      acciones.appendChild(el("span", { className: "boton boton--inactivo", title: "El código fuente no es público" }, "Código privado"));
    } else if (app.codigo) {
      var codigo = urlSegura(app.codigo.url, app.id);
      if (codigo) {
        acciones.appendChild(el("a", { className: "boton boton--secundario", href: codigo, target: "_blank", rel: "noopener noreferrer" }, "Código"));
      }
    } else if (app.insignia) {
      acciones.appendChild(el("span", { className: "boton boton--inactivo", title: "Demostración con datos de ejemplo; no es el producto" }, app.insignia));
    }
    nodo.appendChild(acciones);

    return {
      app: app,
      nodo: nodo,
      url: url,
      salud: salud,
      saludTexto: saludTexto,
      texto: [app.nombre, app.categoria, app.descripcion].concat(app.stack || []).join(" ").toLowerCase(),
    };
  }

  function dibujarAcceso(acceso) {
    var detalles = el("details", { className: "acceso" });
    detalles.appendChild(el("summary", null, "Credenciales de prueba"));
    var tabla = el("table");
    var cabecera = el("tr");
    ["Rol", "Usuario", "Clave"].forEach(function (t) {
      var th = el("th", null, t);
      th.setAttribute("scope", "col");
      cabecera.appendChild(th);
    });
    var thead = el("thead");
    thead.appendChild(cabecera);
    tabla.appendChild(thead);
    var cuerpo = el("tbody");
    acceso.forEach(function (c) {
      var fila = el("tr");
      fila.appendChild(el("td", null, c.rol || ""));
      var tdUsuario = el("td");
      tdUsuario.appendChild(el("code", null, c.usuario || ""));
      fila.appendChild(tdUsuario);
      var tdClave = el("td");
      tdClave.appendChild(el("code", null, c.clave || ""));
      fila.appendChild(tdClave);
      cuerpo.appendChild(fila);
    });
    tabla.appendChild(cuerpo);
    detalles.appendChild(tabla);
    return detalles;
  }

  // ── Salud ───────────────────────────────────────────────────────────────

  /*
   * Comprobación orientativa: una petición no-cors solo dice si "algo respondió" en esa dirección,
   * no si la aplicación funciona. Un navegador puede además bloquearla (contenido mixto, red
   * privada), y entonces se ve como "Sin respuesta" aunque la app esté arriba.
   */
  function comprobarSalud(t) {
    if (!t.url || typeof fetch !== "function") return;
    fijarSalud(t.salud, t.saludTexto, "comprobando");
    var control = typeof AbortController === "function" ? new AbortController() : null;
    var reloj = setTimeout(function () {
      if (control) control.abort();
    }, ESPERA_SALUD_MS);
    fetch(t.url, { mode: "no-cors", cache: "no-store", credentials: "omit", signal: control ? control.signal : undefined })
      .then(function (r) {
        // Mismo sitio: la respuesta es legible y un 404 se nota. Otro sitio: la respuesta es opaca
        // (solo sabemos que «algo respondió»).
        if (r.type !== "opaque" && !r.ok) throw new Error("HTTP " + r.status);
        fijarSalud(t.salud, t.saludTexto, "ok");
      })
      .catch(function () {
        fijarSalud(t.salud, t.saludTexto, "ko");
        t.salud.title = "No respondió en " + ESPERA_SALUD_MS / 1000 + " s, o el navegador bloqueó la comprobación.";
      })
      .then(function () {
        clearTimeout(reloj);
      });
  }

  function fijarSalud(nodo, texto, estado, etiqueta) {
    nodo.setAttribute("data-estado", estado);
    texto.textContent = etiqueta || ETIQUETA_SALUD[estado];
  }

  // ── Resumen y filtro ────────────────────────────────────────────────────

  function actualizarResumen(visibles) {
    var total = tarjetas.length;
    var conUrl = tarjetas.filter(function (t) {
      return t.url;
    }).length;
    var partes = [plural(total, "aplicación", "aplicaciones")];
    if (!publico) partes.push(conUrl + " con enlace en «" + entornoActual.nombre + "»");
    if (typeof visibles === "number" && visibles !== total) partes.push(visibles + " mostradas");
    document.getElementById("resumen").textContent = partes.join(" · ");
  }

  function prepararFiltro() {
    if (tarjetas.length < MOSTRAR_FILTRO_DESDE) return;
    var etiqueta = document.getElementById("filtro");
    var campo = document.getElementById("filtro-texto");
    etiqueta.hidden = false;
    campo.addEventListener("input", function () {
      var q = campo.value.trim().toLowerCase();
      var visibles = 0;
      tarjetas.forEach(function (t) {
        var mostrar = !q || t.texto.indexOf(q) !== -1;
        t.nodo.hidden = !mostrar;
        if (mostrar) visibles++;
      });
      actualizarResumen(visibles);
    });
  }

  // ── Utilidades ──────────────────────────────────────────────────────────

  /**
   * Solo http(s), o una ruta relativa al propio sitio ("./autoria/"). Cualquier otra cosa
   * (javascript:, data:…) se descarta. Una ruta relativa se resuelve contra la página actual; así
   * funciona igual en el sitio publicado, en un servidor local y abierta con doble clic (file://).
   */
  function urlSegura(valor, appId) {
    if (!valor) return null;
    try {
      var relativa = /^\.{0,2}\/[^\/]/.test(valor) || /^\.\//.test(valor);
      var u = new URL(valor, window.location.href);
      if (u.protocol === "http:" || u.protocol === "https:") return u.href;
      if (relativa && u.protocol === window.location.protocol) return u.href;
    } catch (e) {
      /* cae al aviso */
    }
    if (window.console) console.warn("[Learning TEK] URL descartada en «" + appId + "»: " + valor);
    return null;
  }

  function plural(n, uno, varios) {
    return n + " " + (n === 1 ? uno : varios);
  }

  function el(etiqueta, props, texto) {
    var nodo = document.createElement(etiqueta);
    if (props) {
      Object.keys(props).forEach(function (k) {
        if (k === "className") nodo.className = props[k];
        else nodo.setAttribute(k, props[k]);
      });
    }
    if (texto != null) nodo.textContent = texto;
    return nodo;
  }
})();
