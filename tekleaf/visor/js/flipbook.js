/*! TekLeaf flipbook engine — presentación de páginas y efecto flip. Código propio, sin dependencias. */
(function (global) {
  'use strict';

  var FLIP_MS = 600;
  var FADE_MS = 160;
  var ZONE = 0.18;       // zona de esquina que acepta arrastre, como fracción de la página
  var PEEK_PX = 26;      // cuánto se levanta la esquina al pasar el puntero
  var PEEK_MS = 140;
  var DRAG_START = 6;    // px que hay que mover antes de considerar que es un arrastre
  var FLING = 0.5;       // px/ms: por encima, soltar completa (o devuelve) el pase sea cual sea la posición
  var SWIPE_GAIN = 2;    // un deslizamiento fuera de la esquina mueve la esquina virtual el doble

  function el(tag, cls) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    return n;
  }

  /** Agrupa páginas en spreads: portada sola y después pares (FR-VIEW-003). */
  function buildSpreads(count, double) {
    var out = [];
    if (!double) {
      for (var i = 1; i <= count; i++) out.push([i]);
      return out;
    }
    out.push([1]);
    for (var p = 2; p <= count; p += 2) out.push(p + 1 <= count ? [p, p + 1] : [p]);
    return out;
  }

  function reducedMotion() {
    try { return global.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; }
  }

  /**
   * opts: { pages[], renderPage(n) -> HTMLElement, double, flip, rtl, onChange(spread), onDegrade(), canDrag() }
   * canDrag() permite al visor vetar el arrastre (p. ej. con zoom > 1, donde arrastrar es desplazar).
   */
  function create(stage, opts) {
    var PT = global.TekLeafPageTurn;
    var pages = opts.pages;
    var layer = el('div', 'tl-zoomlayer');
    stage.appendChild(layer);
    var api = { layer: layer };
    var double = !!opts.double;
    var flip = opts.flip !== false;
    var wide = true;
    var spreads = buildSpreads(pages.length, double && wide);
    var index = 0;
    var current = null;
    var cleanup = null;
    var slowCount = 0;
    var shadows = true;     // primer escalón de degradación: sin sombras
    var turn = null;        // pase en curso (peek, arrastre, soltar o automático)
    var gesture = null;     // candidato a arrastre del puntero actual
    var claimed = false;    // el gesto actual lo reclamó el flip (el zoom no debe tratarlo como swipe)
    var suppressClick = false;

    function useDouble() { return double && wide; }

    function spreadIndexOf(page) {
      for (var i = 0; i < spreads.length; i++) if (spreads[i].indexOf(page) !== -1) return i;
      return 0;
    }

    function sizeFor(nums) {
      var w = Math.max(1, (stage.clientWidth || 1) - 32);
      var h = Math.max(1, (stage.clientHeight || 1) - 32);
      var ref = nums;
      // En doble página la portada y la última suelta se dibujan al tamaño de las páginas de los pares: un libro no cambia de tamaño
      // al abrirse, y así la hoja que gira entre una suelta y un par encaja exactamente (ver `beginTurn`).
      if (nums.length === 1 && useDouble() && spreads.length > 2) {
        var nb = spreads[nums[0] === 1 ? 1 : spreads.length - 2];
        if (nb && nb.length === 2) ref = nb;
      }
      var tw = 0, th = 0;
      ref.forEach(function (n) { tw += pages[n - 1].width; th = Math.max(th, pages[n - 1].height); });
      return Math.min(w / tw, h / th);
    }

    function layoutSpread(sp, nums) {
      var scale = sizeFor(nums);
      var children = sp.children;
      for (var i = 0; i < nums.length; i++) {
        var pg = pages[nums[i] - 1];
        var node = children[i];
        if (!node || !node.classList.contains('tl-page')) continue;
        node.style.width = Math.floor(pg.width * scale) + 'px';
        node.style.height = Math.floor(pg.height * scale) + 'px';
      }
    }

    function makeSpread(nums) {
      var sp = el('div', 'tl-spread');
      nums.forEach(function (n, i) {
        var pg = opts.renderPage(n);
        pg.classList.add(nums.length === 2 ? (i === 0 ? 'tl-left' : 'tl-right') : 'tl-single');
        sp.appendChild(pg);
      });
      sp._nums = nums;
      layoutSpread(sp, nums);
      return sp;
    }

    function finishNow() {
      if (cleanup) { var c = cleanup; cleanup = null; c(); }
    }

    function show(i, animate) {
      finishNow();
      if (i < 0 || i >= spreads.length) return;
      var prevIdx = index;
      var old = current;
      if (old && animate && flip && PT && !reducedMotion() && Math.abs(i - prevIdx) === 1 && canTurn(i > prevIdx)) {
        var t = beginTurn(i > prevIdx, 'bottom');
        if (t) { t.mode = 'auto'; commitTurn(t); playAuto(t); return; }
      }
      var nums = spreads[i];
      var next = makeSpread(nums);
      index = i;
      if (!old || !animate || reducedMotion()) {
        if (old) old.remove();
        layer.appendChild(next);
        current = next;
        done();
        return;
      }
      current = next;
      doFade(old, next);
      done();
    }

    function done() {
      if (opts.onChange) opts.onChange({ index: index, pages: spreads[index], count: spreads.length });
    }

    function doFade(old, next) {
      next.style.opacity = '0';
      layer.appendChild(next);
      old.style.position = 'absolute';
      var a1 = old.animate([{ opacity: 1 }, { opacity: 0 }], { duration: FADE_MS, fill: 'forwards' });
      var a2 = next.animate([{ opacity: 0 }, { opacity: 1 }], { duration: FADE_MS, fill: 'forwards' });
      var finished = false;
      function end() {
        if (finished) return;
        finished = true;
        a1.cancel(); a2.cancel();
        old.remove();
        next.style.opacity = '';
        cleanup = null;
      }
      cleanup = end;
      a2.onfinish = end;
    }

    /* ---------- pase de página (F2) ---------- */

    /** ¿Hay un spread al otro lado y se puede doblar la hoja hacia él? (en doble página, de par a par o entre una suelta y un par) */
    function canTurn(forward) {
      var j = index + (forward ? 1 : -1);
      if (!current || j < 0 || j >= spreads.length) return false;
      return !useDouble() || current._nums.length + spreads[j].length >= 3;
    }

    /**
     * Copia de una página para la hoja: no lleva el estado de carga ni el número de página (el original sigue en el DOM). Conserva de
     * qué lado del lomo está (`tl-spine-l` / `tl-spine-r`) para llevar la misma sombra del lomo que la página: si no, esa sombra
     * desaparecería al levantar la hoja y reaparecería de golpe al terminarla (parpadeo en el centro del libro).
     */
    function leafCopy(page) {
      var c = page.cloneNode(true);
      var spine = page.classList.contains('tl-left') ? ' tl-spine-l' : page.classList.contains('tl-right') ? ' tl-spine-r' : '';
      c.className = c.className.replace(/\btl-(isloading|left|right|single)\b/g, '').replace(/\s+/g, ' ') + spine;
      c.removeAttribute('data-page');
      return c;
    }

    /** Reverso de una página simple (no hay verso que mostrar): papel liso con la propia página muy tenue. */
    function paperBack(page) {
      var paper = el('div', 'tl-page tl-turn-paper');
      var ghost = leafCopy(page);
      ghost.classList.add('tl-turn-ghost');
      paper.appendChild(ghost);
      return paper;
    }

    /**
     * Prepara un pase hacia el spread siguiente (forward) o el anterior. En doble página la hoja es la página exterior del
     * spread actual; en página simple, la actual al avanzar, y al retroceder la anterior, que vuelve a cerrarse (open = false).
     */
    function beginTurn(forward, corner) {
      if (!PT || turn || !canTurn(forward)) return null;
      var j = index + (forward ? 1 : -1);
      var dbl = useDouble();
      var next = makeSpread(spreads[j]);
      var dir = 1, open = true, src, frontNode, backNode;
      if (dbl) {
        dir = forward ? 1 : -1;
        src = current.children[forward ? 1 : 0] || current.children[0];   // una suelta tiene una sola página
        frontNode = leafCopy(src);
        backNode = leafCopy(next.children[forward ? 0 : 1] || next.children[0]);
      } else if (forward) {
        src = current.children[0];
        frontNode = leafCopy(src);
        backNode = paperBack(src);
      } else {
        open = false;
        src = current.children[0];
        frontNode = leafCopy(next.children[0]);
        backNode = paperBack(next.children[0]);
      }
      var base = layer.getBoundingClientRect();
      var r = src.getBoundingClientRect();
      var leaf = PT.createLeaf({
        W: r.width, H: r.height, dir: dir, corner: corner, front: frontNode, back: backNode, shadows: shadows, hinged: dbl,
        x: (dir > 0 ? r.left : r.right) - base.left, y: r.top - base.top
      });
      layer.insertBefore(next, layer.firstChild);
      layer.appendChild(leaf.root);
      if (open) src.style.visibility = 'hidden';
      var t = {
        forward: forward, j: j, old: current, next: next, src: src, hidden: open, leaf: leaf, dir: dir, open: open,
        W: r.width, H: r.height, C: leaf.C, A: PT.openPoint(r.width, leaf.C), corner: corner,
        mode: 'idle', committed: false, ended: false, raf: 0, P: null, slide: null, restore: null
      };
      if (dbl && current._nums.length !== next._nums.length) slideWithLeaf(t, leaf, (dir > 0 ? r.left : r.right) - base.left);
      t.P = (open ? t.C : t.A).slice();
      paint(t);
      turn = t;
      cleanup = function () { endTurn(t); };
      return t;
    }

    /**
     * Entre una página suelta (centrada) y un par, el lomo no está donde la suelta: la portada es la página derecha del libro y la
     * última, la izquierda, así que media página de diferencia. La hoja gira sobre el lomo del par y, mientras gira, el libro se
     * desliza esa media página para quedar centrado (como al abrir un libro cerrado sobre la mesa). `t.slide(q)`, con q de 0 a 1
     * según el avance, mueve la hoja y lo que lleva debajo; `t.restore()` lo deja todo en su sitio.
     */
    function slideWithLeaf(t, leaf, x0) {
      var old = t.old, next = t.next;
      var fromSingle = old._nums.length === 1;
      var single = fromSingle ? old : next;
      var D = (single._nums[0] === 1 ? 1 : -1) * t.W / 2;   // de su sitio centrado al que ocupa en el libro
      var hide = null;
      if (fromSingle) {
        // el par entra desplazado, con su página de atrás (la que trae la hoja al girar) oculta
        hide = next.children[t.forward ? 0 : 1];
        if (hide) hide.style.visibility = 'hidden';
        t.slide = function (q) {
          leaf.root.style.left = (x0 + q * D) + 'px';
          next.style.transform = 'translateX(' + (-(1 - q) * D) + 'px)';
        };
      } else {
        // la suelta de destino espera bajo la página que se queda, y las dos acaban en su sitio centrado
        t.slide = function (q) {
          leaf.root.style.left = (x0 - q * D) + 'px';
          old.style.transform = 'translateX(' + (-q * D) + 'px)';
          next.style.transform = 'translateX(' + ((1 - q) * D) + 'px)';
        };
      }
      t.restore = function () {
        old.style.transform = '';
        next.style.transform = '';
        if (hide) hide.style.visibility = '';
      };
    }

    /** Dibuja la hoja en t.P y, si hay suelta de por medio, desliza el libro con ella. */
    function paint(t) {
      t.leaf.update(t.P);
      if (t.slide) t.slide(PT.progress(t.W, t.P));
    }

    /** Fija el resultado: a partir de aquí el spread nuevo es el actual y la interfaz ya lo refleja. */
    function commitTurn(t) {
      t.committed = true;
      index = t.j;
      current = t.next;
      done();
    }

    /** Termina el pase de golpe (también si se interrumpe): deja el DOM como si hubiera acabado o se hubiera devuelto. */
    function endTurn(t) {
      if (!t || t.ended) return;
      t.ended = true;
      cancelAnimationFrame(t.raf);
      t.leaf.destroy();
      if (t.restore) t.restore();
      if (t.committed) t.old.remove();
      else { t.next.remove(); if (t.hidden) t.src.style.visibility = ''; }
      if (turn === t) turn = null;
      if (gesture && gesture.turn === t) gesture = null;
    }

    /** Anima P con pos(e), e ∈ [0, 1] según el easing; llama a then() al terminar. Devuelve nada; mide los fotogramas. */
    function run(t, pos, ms, ease, then) {
      var t0 = performance.now(), frames = 0;
      cancelAnimationFrame(t.raf);
      function step(now) {
        if (t.ended) return;
        var u = Math.min(1, (now - t0) / ms);
        t.P = pos(ease(u));
        paint(t);
        frames++;
        if (u < 1) t.raf = requestAnimationFrame(step);
        else then(frames / Math.max(0.001, (performance.now() - t0) / 1000));
      }
      t.raf = requestAnimationFrame(step);
    }

    function lerp(a, b) { return function (e) { return [a[0] + (b[0] - a[0]) * e, a[1] + (b[1] - a[1]) * e]; }; }

    /** Pase automático (clic, tecla, botón): el mismo dibujo que el arrastre, con una trayectoria fija. */
    function playAuto(t) {
      run(t, function (e) { return PT.arc(t.W, t.H, t.open ? e : 1 - e); }, FLIP_MS, PT.easeInOut, function (fps) {
        endTurn(t);
        // NFR-PERF-004: dos pases lentos seguidos bajan un escalón (sin sombras) y luego a transición simple
        slowCount = fps < 50 ? slowCount + 1 : 0;
        if (slowCount >= 2) {
          slowCount = 0;
          if (shadows) shadows = false;
          else if (flip) { flip = false; if (opts.onDegrade) opts.onDegrade(); }
        }
      });
    }

    /** Suelta la hoja: completa o devuelve con una animación corta. */
    function settle(t, complete) {
      t.mode = 'settle';
      var target = complete === t.open ? t.A : t.C;
      var dist = Math.hypot(target[0] - t.P[0], target[1] - t.P[1]);
      if (complete) commitTurn(t);
      run(t, lerp(t.P, target), 120 + 280 * Math.min(1, dist / (2 * t.W)), PT.easeOut, function () { endTurn(t); });
    }

    /** P para un nivel de levantamiento de esquina (0 = reposo … 1 = peek completo). */
    function peekPoint(t, a) {
      var dx = PEEK_PX * a * (t.open ? -1 : 1);
      var dy = PEEK_PX * a * (t.corner === 'top' ? 1 : -1);
      var P0 = t.open ? t.C : t.A;
      return [P0[0] + dx, P0[1] + dy];
    }

    function peekTo(t, to, then) {
      var from = t.amount || 0;
      t.amount = to;
      run(t, function (e) { return peekPoint(t, from + (to - from) * e); }, PEEK_MS * Math.abs(to - from) + 1, PT.easeOut, then || function () {});
    }

    /* ---------- puntero ---------- */

    function canDrag() {
      return !!PT && flip && !reducedMotion() && (!opts.canDrag || opts.canDrag());
    }

    /** Zona de esquina bajo el puntero: { forward, corner } o null. Solo cuenta si ese pase es posible. */
    function zoneAt(cx, cy) {
      if (!current) return null;
      var kids = current.children;
      for (var i = 0; i < kids.length; i++) {
        var r = kids[i].getBoundingClientRect();
        if (cx < r.left || cx > r.right || cy < r.top || cy > r.bottom) continue;
        var forward = kids.length === 2 ? i === 1 : cx > r.left + r.width / 2;
        var inEdge = forward ? cx > r.right - ZONE * r.width : cx < r.left + ZONE * r.width;
        if (!inEdge || !canTurn(forward)) return null;
        if (cy > r.bottom - ZONE * r.height) return { forward: forward, corner: 'bottom' };
        if (cy < r.top + ZONE * r.height) return { forward: forward, corner: 'top' };
        return null;
      }
      return null;
    }

    function sameZone(a, b) { return a && b && a.forward === b.forward && a.corner === b.corner; }

    function hover(z) {
      if (turn) {
        if (turn.mode === 'peek' && !sameZone(z, turn.zone)) {
          var old = turn;
          old.mode = 'retreat';
          peekTo(old, 0, function () { endTurn(old); });
        }
        return;
      }
      if (!z) return;
      var t = beginTurn(z.forward, z.corner);
      if (!t) return;
      t.mode = 'peek';
      t.zone = z;
      peekTo(t, 1);
    }

    /**
     * ¿El ratón se ha pulsado directamente sobre una palabra de la capa de texto (`.tl-text span`)? Solo existe con `selection`.
     * Fuera de las palabras (márgenes, huecos, esquinas) los gestos siguen siendo del visor. Con dedo no se aplica: allí manda el gesto.
     */
    function onWord(e) {
      if (e.pointerType !== 'mouse' || !e.target || !e.target.closest) return false;
      var layer = e.target.closest('.tl-text');
      return !!layer && e.target !== layer;
    }

    function onDown(e) {
      claimed = false;
      suppressClick = false;
      if (gesture && gesture.id !== e.pointerId) { gesture = null; return; }   // segundo dedo: es un pellizco
      gesture = null;
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      if (!canDrag() || (turn && turn.mode !== 'peek' && turn.mode !== 'retreat')) return;
      if (e.target.closest && e.target.closest('button,input')) return;
      if (onWord(e)) return;   // con selección habilitada, pulsar una palabra con el ratón es seleccionar, no pasar de página
      gesture = { id: e.pointerId, x0: e.clientX, y0: e.clientY, zone: zoneAt(e.clientX, e.clientY), started: false, turn: null, samples: [] };
    }

    function startDrag(e, g) {
      var dx = e.clientX - g.x0, dy = e.clientY - g.y0;
      var forward, corner = 'bottom';
      if (g.zone) {
        forward = g.zone.forward; corner = g.zone.corner;
        if (forward ? dx > 0 : dx < 0) return false;                  // hacia fuera de la página: no es un pase
      } else {
        if (Math.abs(dx) < 2 * DRAG_START || Math.abs(dx) < Math.abs(dy) * 1.2) return false;   // swipe: horizontal
        forward = dx < 0;
      }
      var t = turn;
      if (t && t.mode === 'peek' && t.zone && t.zone.forward === forward && t.zone.corner === corner) cancelAnimationFrame(t.raf);
      else {
        if (t) endTurn(t);
        t = beginTurn(forward, corner);
        if (!t) return false;
      }
      t.mode = 'drag';
      // la esquina sigue al puntero desde que se pulsó (sin zona muerta); si venía de un peek, esa elevación se descarta
      // un swipe (sin esquina) parte de cualquier punto: la esquina virtual se mueve el doble para que un cuarto de página baste
      g.turn = t; g.started = true; g.xRef = g.x0; g.yRef = g.y0; g.P0 = (t.open ? t.C : t.A).slice(); g.gain = g.zone ? 1 : SWIPE_GAIN;
      claimed = true;
      try { stage.setPointerCapture(e.pointerId); } catch (err) { /* sin captura */ }
      return true;
    }

    function onMove(e) {
      var g = gesture;
      if (!g || g.id !== e.pointerId) {
        if (!g && e.pointerType === 'mouse' && e.buttons === 0) hover(canDrag() && !onWord(e) ? zoneAt(e.clientX, e.clientY) : null);   // sobre una palabra no se levanta la esquina: ocultaría el texto que se quiere seleccionar
        return;
      }
      if (!g.started) {
        // un swipe (sin esquina) necesita algo más de recorrido para distinguir su dirección
        if (Math.hypot(e.clientX - g.x0, e.clientY - g.y0) < (g.zone ? DRAG_START : 2 * DRAG_START)) return;
        if (!startDrag(e, g)) { gesture = null; return; }   // no es un pase: que lo trate el zoom
      }
      var t = g.turn;
      if (!t || t.ended) return;
      var P = [g.P0[0] + (e.clientX - g.xRef) * t.dir * g.gain, g.P0[1] + (e.clientY - g.yRef)];
      P[0] = Math.max(-t.W, Math.min(t.W, P[0]));
      t.P = PT.clampDrag(t.C, P, t.W);
      paint(t);
      g.samples.push({ t: e.timeStamp, x: t.P[0] });
      if (g.samples.length > 5) g.samples.shift();
    }

    function onUp(e) {
      var g = gesture;
      if (!g || g.id !== e.pointerId) return;
      gesture = null;
      if (!g.started) return;
      var t = g.turn;
      suppressClick = true;
      setTimeout(function () { suppressClick = false; }, 60);
      if (!t || t.ended) return;
      // velocidad de los últimos 100 ms: si el puntero estuvo quieto antes de soltar, no hay golpe
      var s = g.samples.filter(function (x) { return e.timeStamp - x.t < 100; }), vOpen = 0;
      if (s.length > 1) vOpen = -(s[s.length - 1].x - s[0].x) / Math.max(1, s[s.length - 1].t - s[0].t);
      var complete = e.type === 'pointerup' && PT.shouldComplete(t.open, t.W, t.P, vOpen, FLING);
      settle(t, complete);
    }

    function onLeave() { if (!gesture && turn && turn.mode === 'peek') hover(null); }
    function onClick(e) { if (suppressClick) { e.stopPropagation(); e.preventDefault(); } }

    stage.addEventListener('pointerdown', onDown);
    stage.addEventListener('pointermove', onMove);
    stage.addEventListener('pointerup', onUp);
    stage.addEventListener('pointercancel', onUp);
    stage.addEventListener('pointerleave', onLeave);
    stage.addEventListener('click', onClick, true);

    api.goToPage = function (n, animate) {
      n = Math.max(1, Math.min(pages.length, n));
      show(spreadIndexOf(n), animate !== false);
    };
    api.next = function () { if (index < spreads.length - 1) show(index + 1, true); };
    api.prev = function () { if (index > 0) show(index - 1, true); };
    api.first = function () { show(0, true); };
    api.last = function () { show(spreads.length - 1, true); };
    api.hasNext = function () { return index < spreads.length - 1; };
    api.hasPrev = function () { return index > 0; };
    api.current = function () { return spreads[index]; };
    api.spreadIndex = function () { return index; };
    api.setFlip = function (v) { flip = !!v; if (!flip) finishNow(); };
    /** ¿El gesto en curso lo reclamó el flip? El zoom lo consulta para no tratarlo también como swipe. */
    api.claimed = function () { return claimed; };
    api.turning = function () { return !!turn; };
    /** Olvida el gesto candidato del puntero (otro módulo, como la selección con el dedo, lo reclama). */
    api.cancelGesture = function () { gesture = null; claimed = false; };
    api.setDouble = function (v) {
      double = !!v;
      rebuild();
    };
    function rebuild() {
      var page = spreads[index][0];
      var now = useDouble();
      spreads = buildSpreads(pages.length, now);
      finishNow();
      if (current) current.remove();
      index = spreadIndexOf(page);
      current = makeSpread(spreads[index]);
      layer.appendChild(current);
      done();
    }
    /** Recalcula el layout al cambiar el tamaño del contenedor. */
    api.layout = function () {
      if (turn) finishNow();   // el tamaño de la hoja cambia: se termina el pase en curso
      var nowWide = stage.clientWidth >= 720 && stage.clientWidth > stage.clientHeight * 0.9;
      if (nowWide !== wide) { wide = nowWide; if (current) { rebuild(); return; } }
      if (current) layoutSpread(current, current._nums);
    };
    api.isDouble = useDouble;
    api.destroy = function () {
      finishNow();
      stage.removeEventListener('pointerdown', onDown);
      stage.removeEventListener('pointermove', onMove);
      stage.removeEventListener('pointerup', onUp);
      stage.removeEventListener('pointercancel', onUp);
      stage.removeEventListener('pointerleave', onLeave);
      stage.removeEventListener('click', onClick, true);
      layer.remove();
    };

    wide = stage.clientWidth >= 720 && stage.clientWidth > stage.clientHeight * 0.9;
    spreads = buildSpreads(pages.length, useDouble());
    return api;
  }

  global.TekLeafFlipbook = { create: create, buildSpreads: buildSpreads };
})(window);
