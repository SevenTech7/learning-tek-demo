/*! TekLeaf pageturn — geometría y render del pase de página (F2). Código propio, sin dependencias.
 * Coordenadas: el lomo es x = 0, la hoja ocupa [0, W] × [0, H] y la esquina de origen C es (W, H) o (W, 0).
 * La geometría son funciones puras (se prueban en Node); el render (createLeaf) solo toca `clip-path` y `transform`. */
(function (global) {
  'use strict';

  var EPS = 1e-6;
  var SPAN_CAST = 96;   // anchura de las sombras (px de la hoja); fija, para no provocar layout por fotograma
  var SPAN_FOLD = 60;

  /* ---------- geometría ---------- */

  /** Mantiene P a una distancia del lomo ≤ W: la hoja es rígida y no puede despegarse. */
  function clampDrag(C, P, W) {
    var dx = P[0], dy = P[1] - C[1], d = Math.sqrt(dx * dx + dy * dy);
    return d <= W ? [P[0], P[1]] : [dx / d * W, C[1] + dy / d * W];
  }

  /**
   * Atenúa la componente vertical del arrastre según se acerca al lomo (1 en la esquina … 0 en el lomo). Con el pliegue siguiendo al
   * puntero en vertical durante todo el pase, a mitad de recorrido queda inclinado y la parte doblada sobresale por arriba o por abajo
   * del libro, como si la hoja se arrancara del lomo. Así la esquina se despega siguiendo al puntero, pero el pliegue se va poniendo
   * vertical y la hoja gira anclada al lomo (en el lomo, P = (−W, C.y) da el mismo pliegue vertical de antes).
   */
  function relax(C, P, W) {
    var g = Math.max(0, Math.min(1, P[0] / W));
    g = g * g;   // al cuadrado: la esquina se despega en diagonal al principio y el pliegue se verticaliza pronto
    return [P[0], C[1] + (P[1] - C[1]) * g];
  }

  /** Línea de pliegue = mediatriz de CP; null si el arrastre es demasiado pequeño. */
  function fold(C, P) {
    var dx = P[0] - C[0], dy = P[1] - C[1], len = Math.sqrt(dx * dx + dy * dy);
    if (len < 0.5) return null;
    return { M: [(C[0] + P[0]) / 2, (C[1] + P[1]) / 2], n: [dx / len, dy / len], len: len };
  }

  function side(f, X) { return (X[0] - f.M[0]) * f.n[0] + (X[1] - f.M[1]) * f.n[1]; }

  /** Sutherland–Hodgman contra un semiplano: keep = +1 conserva el lado de P, −1 el de C. */
  function clip(poly, f, keep) {
    var out = [];
    for (var i = 0; i < poly.length; i++) {
      var A = poly[i], B = poly[(i + 1) % poly.length];
      var sa = keep * side(f, A), sb = keep * side(f, B);
      if (sa >= -EPS) out.push(A);
      if ((sa > EPS && sb < -EPS) || (sa < -EPS && sb > EPS)) {
        var t = sa / (sa - sb);
        out.push([A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t]);
      }
    }
    return out;
  }

  function rect(W, H) { return [[0, 0], [W, 0], [W, H], [0, H]]; }

  /** Reflexión respecto del pliegue como matrix(a,b,c,d,e,f) de CSS. */
  function reflection(f) {
    var nx = f.n[0], ny = f.n[1], k = 2 * (nx * f.M[0] + ny * f.M[1]);
    return [1 - 2 * nx * nx, -2 * nx * ny, -2 * nx * ny, 1 - 2 * ny * ny, k * nx, k * ny];
  }

  function reflect(f, X) {
    var s = 2 * side(f, X);
    return [X[0] - s * f.n[0], X[1] - s * f.n[1]];
  }

  /** Estado de un fotograma; null si la hoja sigue plana. */
  function frame(W, H, C, P) {
    var Pc = clampDrag(C, P, W), f = fold(C, Pc);
    if (!f) return null;
    var R = rect(W, H);
    return {
      fold: f, P: Pc,
      flat: clip(R, f, +1),     // parte que sigue plana
      folded: clip(R, f, -1),   // parte que se dobla (y deja ver la página de debajo)
      matrix: reflection(f),
      angle: Math.atan2(f.n[1], f.n[0]) * 180 / Math.PI
    };
  }

  function polygonCss(poly) {
    return 'polygon(' + poly.map(function (p) { return (Math.round(p[0] * 10) / 10) + 'px ' + (Math.round(p[1] * 10) / 10) + 'px'; }).join(',') + ')';
  }

  function area(poly) {
    var s = 0;
    for (var i = 0; i < poly.length; i++) { var a = poly[i], b = poly[(i + 1) % poly.length]; s += a[0] * b[1] - b[0] * a[1]; }
    return Math.abs(s) / 2;
  }

  /** Posición de P con la hoja del todo abierta (apoyada sobre la página de al lado). */
  function openPoint(W, C) { return [-W, C[1]]; }

  /** 0 = hoja cerrada (P en C) … 1 = abierta del todo (P en el lomo opuesto), a lo largo del eje x. */
  function progress(W, P) { return Math.max(0, Math.min(1, (W - P[0]) / (2 * W))); }

  /** Trayectoria de un pase automático desde la esquina inferior: s = 0 cerrada … 1 abierta. */
  function arc(W, H, s) { return [W * (1 - 2 * s), H - 0.35 * H * Math.sin(Math.PI * s)]; }

  /**
   * Decide si al soltar se completa el pase. vOpen = velocidad hacia «abierta» (px/ms, con signo).
   * La mitad del recorrido es la mitad de la distancia de la esquina al lomo (P.x = W/2, progress = 0,25);
   * al cerrar (página simple, hacia atrás) se cuenta desde el otro extremo.
   */
  function shouldComplete(opening, W, P, vOpen, fling) {
    var f = fling == null ? 0.5 : fling, p = progress(W, P);
    if (opening) return vOpen > f || (vOpen > -f && p > 0.25);
    return -vOpen > f || (-vOpen > -f && p < 0.75);
  }

  /** Easing de los pases automáticos y de la animación de soltar. */
  function easeInOut(u) { return u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2; }
  function easeOut(u) { return 1 - Math.pow(1 - u, 3); }

  /* ---------- render ---------- */

  function div(cls) { var d = document.createElement('div'); d.className = cls; return d; }
  function size(e, w, h) { e.style.width = w + 'px'; e.style.height = h + 'px'; }

  function grad(parent, span, h, bg) {
    var g = div('tl-turn-grad');
    size(g, span, h);
    g.style.background = bg;
    var fx = div('tl-turn-fx');
    fx.appendChild(g);
    parent.appendChild(fx);
    return { fx: fx, g: g, span: span };
  }

  function place(gr, M, angle, dirSign) {
    gr.g.style.transform = 'translate(' + M[0].toFixed(1) + 'px,' + M[1].toFixed(1) + 'px) rotate(' + angle.toFixed(2) + 'deg) translate(' + (dirSign > 0 ? 0 : -gr.span) + 'px,' + (-gr.h) + 'px)';
  }

  /**
   * Hoja que se dobla. spec: { W, H, x, y, dir (1 | −1), corner ('bottom' | 'top'), front, back, shadows, hinged }.
   * (x, y) es la posición del lomo en el contenedor; dir = −1 refleja la hoja (página izquierda).
   * Devuelve { root, C, update(P), setShadows(on), destroy() }.
   */
  function createLeaf(spec) {
    var W = spec.W, H = spec.H, dir = spec.dir < 0 ? -1 : 1;
    var hinged = !!spec.hinged;   // doble página: la hoja gira sobre el lomo y no puede sobresalir (ver `relax`); en página simple no hay lomo
    var C = [W, spec.corner === 'top' ? 0 : H];
    var gh = (W + H) * 2;

    var root = div('tl-leaf');
    root.setAttribute('inert', '');
    root.setAttribute('aria-hidden', 'true');
    root.style.left = spec.x + 'px';
    root.style.top = spec.y + 'px';
    if (dir < 0) root.style.transform = 'scaleX(-1)';

    // La sombra proyectada va bajo la hoja plana (opaca): no necesita recorte propio.
    var cast = div('tl-turn-layer tl-turn-cast');
    size(cast, W, H);
    var castG = grad(cast, SPAN_CAST, gh, 'linear-gradient(to left,rgba(0,0,0,.38),rgba(0,0,0,0))');

    var front = div('tl-turn-layer tl-turn-front');
    size(front, W, H);
    var frontIn = div('tl-turn-in');
    if (dir < 0) frontIn.style.transform = 'scaleX(-1)';
    frontIn.appendChild(spec.front);
    front.appendChild(frontIn);
    var frontG = grad(front, SPAN_FOLD, gh, 'linear-gradient(to right,rgba(0,0,0,.22),rgba(0,0,0,0))');

    var back = div('tl-turn-layer tl-turn-back');
    size(back, W, H);
    var backIn = div('tl-turn-in');
    if (dir > 0) backIn.style.transform = 'scaleX(-1)';   // el reverso se ve en espejo
    backIn.appendChild(spec.back);
    back.appendChild(backIn);
    var backG = grad(back, SPAN_FOLD, gh, 'linear-gradient(to left,rgba(0,0,0,.30),rgba(255,255,255,.12) 40%,rgba(0,0,0,0))');
    [castG, frontG, backG].forEach(function (x) { x.h = gh / 2; });

    root.appendChild(cast);
    root.appendChild(front);
    root.appendChild(back);

    var shadows = spec.shadows !== false;
    function setShadows(on) {
      shadows = !!on;
      [castG, frontG, backG].forEach(function (x) { x.fx.style.display = shadows ? '' : 'none'; });
    }
    setShadows(shadows);

    var last = null;
    function update(P) {
      var fr = frame(W, H, C, hinged ? relax(C, P, W) : P);
      last = fr;
      if (!fr) {
        front.style.clipPath = 'none'; front.style.visibility = 'visible';
        back.style.visibility = 'hidden'; cast.style.visibility = 'hidden';
        return null;
      }
      var hasFlat = fr.flat.length >= 3, hasFolded = fr.folded.length >= 3;
      front.style.visibility = hasFlat ? 'visible' : 'hidden';
      back.style.visibility = hasFolded ? 'visible' : 'hidden';
      cast.style.visibility = hasFolded && shadows ? 'visible' : 'hidden';
      if (hasFlat) front.style.clipPath = polygonCss(fr.flat);
      if (hasFolded) {
        back.style.clipPath = polygonCss(fr.folded);
        back.style.transform = 'matrix(' + fr.matrix.map(function (v) { return v.toFixed(5); }).join(',') + ')';
      }
      if (shadows) {
        place(castG, fr.fold.M, fr.angle, -1);
        place(frontG, fr.fold.M, fr.angle, +1);
        place(backG, fr.fold.M, fr.angle, -1);
        // Al llegar a abierta del todo, la hoja queda plana sobre la de al lado y el sombreado del pliegue ya no tiene sentido: se
        // desvanece en el último tramo para que el paso a la página fija (que solo lleva la sombra del lomo) no dé un salto.
        var k = Math.max(0, Math.min(1, (progress(W, fr.P) - 0.8) / 0.2));
        var o = String(Math.round((1 - k * k * (3 - 2 * k)) * 1000) / 1000);
        [castG, frontG, backG].forEach(function (x) { x.fx.style.opacity = o; });
      }
      return fr;
    }

    update(C);
    return {
      root: root, C: C, update: update, setShadows: setShadows,
      state: function () { return last; },
      destroy: function () { if (root.parentNode) root.parentNode.removeChild(root); }
    };
  }

  global.TekLeafPageTurn = {
    clampDrag: clampDrag, relax: relax, fold: fold, side: side, clip: clip, rect: rect, reflection: reflection, reflect: reflect, frame: frame,
    polygonCss: polygonCss, area: area, openPoint: openPoint, progress: progress, arc: arc, shouldComplete: shouldComplete,
    easeInOut: easeInOut, easeOut: easeOut, createLeaf: createLeaf
  };
})(typeof window !== 'undefined' ? window : globalThis);
