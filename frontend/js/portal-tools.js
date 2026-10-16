// Herramientas de accesibilidad del encabezado: temas de color / daltonismo y lectura en voz alta.
(function () {
  /* ======================================================================
     Temas de color (los colores están en public/css/theme.css)
     ====================================================================== */
  const STORAGE_KEY = "eslabon-theme";

  // `sw` es el color de la muestra; "clasico" no lleva atributo en <html>.
  const THEMES = [
    { key: "clasico", name: "Clásico", sw: "linear-gradient(135deg,#6B7280,#111827)" },
    { key: "azul", name: "Azul", sw: "#1D4ED8" },
    { key: "verde", name: "Verde", sw: "#047857" },
    { key: "violeta", name: "Violeta", sw: "#6D28D9" },
    { key: "ambar", name: "Ámbar", sw: "#B45309" },
  ];
  const COLOR_BLIND = [
    { key: "deuteranopia", name: "Deuteranopía", hint: "Azul · naranja — ceguera rojo-verde", sw: "#0050C8" },
    { key: "protanopia", name: "Protanopía", hint: "Azul · amarillo — sin percepción roja", sw: "#0077B6" },
    { key: "tritanopia", name: "Tritanopía", hint: "Rojo · verde — sin azul ni amarillo", sw: "#A31D1D" },
  ];

  const swatchesEl = document.getElementById("themeSwatches");
  const cbListEl = document.getElementById("themeCbList");

  function currentTheme() {
    return document.documentElement.getAttribute("data-portal-theme") || "clasico";
  }

  function applyTheme(key) {
    if (key === "clasico") document.documentElement.removeAttribute("data-portal-theme");
    else document.documentElement.setAttribute("data-portal-theme", key);
    try {
      if (key === "clasico") localStorage.removeItem(STORAGE_KEY);
      else localStorage.setItem(STORAGE_KEY, key);
    } catch (e) { /* sin almacenamiento: el cambio solo dura esta página */ }
    renderThemes();
  }

  function renderThemes() {
    const active = currentTheme();

    swatchesEl.replaceChildren(
      ...THEMES.map((t) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "theme-swatch" + (t.key === active ? " is-selected" : "");
        btn.setAttribute("aria-pressed", String(t.key === active));
        btn.setAttribute("aria-label", "Tema " + t.name);
        btn.innerHTML = '<span class="dot"><span class="material-symbols-outlined">check</span></span><span class="label"></span>';
        btn.querySelector(".dot").style.setProperty("--sw", t.sw);
        btn.querySelector(".label").textContent = t.name;
        btn.addEventListener("click", () => applyTheme(t.key));
        return btn;
      })
    );

    cbListEl.replaceChildren(
      ...COLOR_BLIND.map((t) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "theme-cb" + (t.key === active ? " is-selected" : "");
        btn.setAttribute("aria-pressed", String(t.key === active));
        btn.innerHTML = '<span class="dot"></span><span class="txt"><b></b><small></small></span><span class="material-symbols-outlined check">check</span>';
        btn.querySelector(".dot").style.setProperty("--sw", t.sw);
        btn.querySelector("b").textContent = t.name;
        btn.querySelector("small").textContent = t.hint;
        // Volver a pulsar el tema activo regresa al Clásico.
        btn.addEventListener("click", () => applyTheme(t.key === active ? "clasico" : t.key));
        return btn;
      })
    );
  }

  if (swatchesEl && cbListEl) renderThemes();

  /* ======================================================================
     Lectura en voz alta (Web Speech API)
     ====================================================================== */
  const narrateBtn = document.getElementById("narrateBtn");
  const narrateIcon = document.getElementById("narrateIcon");
  const synth = window.speechSynthesis;
  const LANG = "es-MX";
  const MAX_CHUNK = 180; // Chrome corta los textos muy largos: se leen en trozos
  const SKIP_TAGS = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "SVG", "CANVAS", "TEMPLATE", "IFRAME", "INPUT", "SELECT", "TEXTAREA"]);

  let units = [];
  let unitIndex = 0;
  let run = 0; // identifica la lectura vigente: las respuestas de lecturas canceladas se ignoran
  let highlighted = null;

  function isHidden(el) {
    if (el.hidden || el.getAttribute("aria-hidden") === "true") return true;
    const style = getComputedStyle(el);
    return style.display === "none" || style.visibility === "hidden";
  }

  function mustSkip(el) {
    return (
      SKIP_TAGS.has(el.tagName.toUpperCase()) ||
      el.hasAttribute("data-no-read") ||
      el.classList.contains("material-symbols-outlined") || // los iconos son texto ("bolt", "payments"...)
      isHidden(el)
    );
  }

  // Bloque (no en línea) al que pertenece un nodo de texto: cada bloque se lee como una frase.
  function blockOf(node) {
    let el = node.parentElement;
    while (el && el !== document.body && getComputedStyle(el).display.startsWith("inline")) el = el.parentElement;
    return el;
  }

  // Recorre la página en orden y devuelve [{ el, text }]. Un elemento con data-speak
  // se lee con ese texto (y se ignora su contenido).
  function collectUnits() {
    const result = [];
    const byBlock = new Map();
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (node.nodeType === Node.TEXT_NODE) {
          // Los textos dentro de un elemento con data-speak ya se leen con ese texto.
          if (!node.nodeValue.trim() || node.parentElement.closest("[data-speak]")) return NodeFilter.FILTER_REJECT;
          return NodeFilter.FILTER_ACCEPT;
        }
        if (mustSkip(node)) return NodeFilter.FILTER_REJECT;
        if (node.hasAttribute("data-speak")) return NodeFilter.FILTER_ACCEPT;
        return NodeFilter.FILTER_SKIP;
      },
    });

    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      if (node.nodeType === Node.ELEMENT_NODE) {
        result.push({ el: node, text: node.getAttribute("data-speak") });
        continue;
      }
      const block = blockOf(node);
      if (!block) continue;
      let unit = byBlock.get(block);
      if (!unit) {
        unit = { el: block, text: "" };
        byBlock.set(block, unit);
        result.push(unit);
      }
      unit.text += " " + node.nodeValue;
    }

    return result
      .map((u) => ({ el: u.el, text: u.text.replace(/\s+/g, " ").trim() }))
      .filter((u) => /[\p{L}\p{N}]/u.test(u.text));
  }

  // Parte un texto en trozos de como máximo MAX_CHUNK caracteres, cortando en frases o espacios.
  function chunkify(text) {
    const chunks = [];
    for (const sentence of text.split(/(?<=[.!?…])\s+/)) {
      let rest = sentence;
      while (rest.length > MAX_CHUNK) {
        let cut = rest.lastIndexOf(" ", MAX_CHUNK);
        if (cut < MAX_CHUNK / 2) cut = MAX_CHUNK;
        chunks.push(rest.slice(0, cut).trim());
        rest = rest.slice(cut).trim();
      }
      if (rest) chunks.push(rest);
    }
    return chunks;
  }

  function pickVoice() {
    const voices = synth.getVoices();
    const lower = (v) => v.lang.replace("_", "-").toLowerCase();
    return (
      voices.find((v) => lower(v) === "es-mx") ||
      voices.find((v) => lower(v) === "es-us") ||
      voices.find((v) => lower(v).startsWith("es")) ||
      null
    );
  }

  function setHighlight(el) {
    if (highlighted) highlighted.classList.remove("reading-now");
    highlighted = el;
    if (el) {
      el.classList.add("reading-now");
      el.scrollIntoView({ block: "center", behavior: "smooth" });
    }
  }

  function setUi(reading) {
    narrateBtn.classList.toggle("is-on", reading);
    narrateBtn.setAttribute("aria-pressed", String(reading));
    const label = reading ? "Detener la lectura" : "Leer la página en voz alta";
    narrateBtn.title = label;
    narrateBtn.setAttribute("aria-label", label);
    narrateIcon.textContent = reading ? "volume_up" : "volume_off";
  }

  function stop() {
    run++;
    synth.cancel();
    setHighlight(null);
    setUi(false);
  }

  function speakUnit(myRun) {
    if (myRun !== run) return;
    if (unitIndex >= units.length) return stop();

    const unit = units[unitIndex];
    const chunks = chunkify(unit.text);
    let i = 0;
    setHighlight(unit.el);

    const next = () => {
      if (myRun !== run) return;
      if (i >= chunks.length) {
        unitIndex++;
        return speakUnit(myRun);
      }
      try {
        const utterance = new SpeechSynthesisUtterance(chunks[i++]);
        utterance.lang = LANG;
        const voice = pickVoice();
        if (voice) utterance.voice = voice;
        utterance.rate = 0.95;
        utterance.onend = next;
        utterance.onerror = (e) => {
          // "canceled"/"interrupted" ocurren al detener: no son fallos.
          if (e.error !== "canceled" && e.error !== "interrupted") stop();
        };
        synth.speak(utterance);
      } catch (err) {
        stop(); // si el navegador no puede hablar, el botón no se queda "leyendo"
      }
    };
    next();
  }

  function start() {
    closeOtherPanels();
    synth.cancel();
    units = collectUnits();
    if (units.length === 0) return;
    // Primero se anuncia en qué página se está.
    units.unshift({ el: null, text: "Leyendo la página: " + document.title.replace(/\s*[—–]\s*/g, ", ") + "." });
    unitIndex = 0;
    run++;
    setUi(true);
    speakUnit(run);
  }

  // Los paneles abiertos tapan el contenido: se cierran al empezar a leer.
  function closeOtherPanels() {
    if (typeof closePanels === "function") closePanels();
  }

  if (narrateBtn) {
    if (!synth || typeof SpeechSynthesisUtterance === "undefined") {
      narrateBtn.disabled = true;
      narrateBtn.title = "Tu navegador no permite la lectura en voz alta";
    } else {
      narrateBtn.addEventListener("click", () => (narrateBtn.getAttribute("aria-pressed") === "true" ? stop() : start()));
      // Esc también detiene la lectura; al salir de la página se calla.
      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && narrateBtn.getAttribute("aria-pressed") === "true") stop();
      });
      window.addEventListener("pagehide", () => synth.cancel());
    }
  }
})();
