/**
 * Hub de acessibilidade do material publicado.
 *
 * Espelha o painel de acessibilidade da aplicação (tema, filtros de cor,
 * tamanho de fonte, fonte para dislexia, redução de movimento) em um widget
 * flutuante, persistido em localStorage. Tudo funciona offline.
 */
export const A11Y_CSS = `
/* ===== Hub de Acessibilidade ===== */
/* VLibras: some quando desligado e nunca estoure a largura da página. */
html[data-vlibras="off"] [vw] { display: none !important; }
[vw] { position: fixed; bottom: 20px; right: 20px; z-index: 95; max-width: 100%; }
[vw-access-button] { width: 56px; height: 56px; }
.vw-plugin-wrapper { max-width: min(420px, calc(100vw - 32px)); overflow: hidden; }
/* O [hidden] da UA stylesheet perde para o display:flex das classes abaixo;
   sem esta regra o overlay do painel fica sempre visível e não fecha. */
[hidden] { display: none !important; }
.skip-link { position: absolute; left: -9999px; top: 0; background: var(--brand-red); color: #fff; padding: 8px 12px; z-index: 100; border-radius: 0 0 8px 0; font-weight: 700; }
.skip-link:focus { left: 0; }

/* Filtros para daltonismo */
html[data-color-filter="protanopia"] { filter: url("#a11y-protanopia"); }
html[data-color-filter="deuteranopia"] { filter: url("#a11y-deuteranopia"); }
html[data-color-filter="tritanopia"] { filter: url("#a11y-tritanopia"); }
html[data-color-filter="monocromia"] { filter: grayscale(100%); }

/* Tamanho de fonte */
html[data-font-size="small"] { font-size: 14px; }
html[data-font-size="normal"] { font-size: 16px; }
html[data-font-size="large"] { font-size: 18px; }
html[data-font-size="xlarge"] { font-size: 20px; }

/* Fonte para dislexia */
html[data-font="opendyslexic"] body,
html[data-font="opendyslexic"] input,
html[data-font="opendyslexic"] select,
html[data-font="opendyslexic"] button,
html[data-font="opendyslexic"] textarea {
  font-family: "OpenDyslexic", "Open Sans", system-ui, sans-serif !important;
  letter-spacing: 0.01em;
}

/* Redução de movimento */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; scroll-behavior: auto !important; }
}

.sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0; }

/* Widget flutuante: so o icone de acessibilidade + alca show/ocultar.
   O estado e unico (catalogo.a11y.fabHidden) e sincronizado nas duas abas. */
.a11y-widget { position: fixed; bottom: 20px; left: 0; z-index: 90; display: flex; align-items: flex-end; }
.a11y-fab { display: flex; flex-direction: column; gap: 10px; margin-left: 20px; transition: transform .25s, opacity .25s; }
.a11y-fab.hidden-fab { transform: translateX(calc(-100% - 1.5rem)); opacity: 0; pointer-events: none; }
.a11y-btn { width: 48px; height: 48px; border-radius: 50%; border: 2px solid #fff; background: var(--brand-red); color: #fff; display: grid; place-items: center; cursor: pointer; box-shadow: 0 4px 16px rgba(0,0,0,.35); font-size: 1.1rem; }
.a11y-btn:hover { filter: brightness(1.1); }
.a11y-show { width: 22px; height: 64px; border-radius: 0 8px 8px 0; border: 1px solid rgba(255,255,255,.5); border-left: 0; background: rgba(15,23,42,.85); color: #fff; cursor: pointer; display: grid; place-items: center; font-size: 1rem; box-shadow: 0 4px 12px rgba(0,0,0,.3); }
.a11y-sync { position: fixed; bottom: 20px; left: 0; z-index: 90; width: 6px; height: 64px; pointer-events: none; opacity: 0; }

/* Painel */
.a11y-overlay { position: fixed; inset: 0; z-index: 100; display: flex; align-items: center; justify-content: center; padding: 16px; background: rgba(0,0,0,.55); backdrop-filter: blur(2px); }
.a11y-panel { background: var(--bg-surface); color: var(--text-main); border: 1px solid var(--border-color); border-radius: 16px; width: 100%; max-width: 520px; max-height: 90vh; overflow: hidden; display: flex; flex-direction: column; box-shadow: 0 20px 60px rgba(0,0,0,.4); }
.a11y-panel header { padding: 20px 24px; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center; }
.a11y-panel header h2 { font-size: 1.25rem; font-weight: 800; }
.a11y-panel .a11y-body { padding: 20px 24px; overflow-y: auto; flex: 1; display: flex; flex-direction: column; gap: 18px; }
.a11y-panel section { display: flex; flex-direction: column; gap: 8px; }
.a11y-panel section > p, .a11y-panel section > label { font-weight: 700; font-size: .95rem; }
.a11y-panel .a11y-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 10px 12px; border: 1px solid var(--border-color); border-radius: 10px; }
.a11y-panel select, .a11y-panel input[type="range"] { width: 100%; }
.a11y-panel .a11y-actions { padding: 16px 24px; border-top: 1px solid var(--border-color); }
.a11y-panel .a11y-actions button { width: 100%; padding: 10px; border-radius: 8px; border: 1px solid var(--border-color); background: var(--bg-surface); color: var(--text-main); font-weight: 700; cursor: pointer; }
.a11y-panel .a11y-actions button:hover { background: var(--brand-red); color: #fff; border-color: var(--brand-red); }
.a11y-toggle { width: 40px; height: 22px; border-radius: 999px; background: var(--border-color); position: relative; cursor: pointer; border: none; }
.a11y-toggle.on { background: var(--brand-red); }
.a11y-toggle::after { content: ""; position: absolute; top: 2px; left: 2px; width: 18px; height: 18px; border-radius: 50%; background: #fff; transition: transform .2s; }
.a11y-toggle.on::after { transform: translateX(18px); }
`;

export const A11Y_HTML = `
<!-- Hub de Acessibilidade -->
<a class="skip-link" href="#page-content">Pular para o conteúdo</a>
<svg style="position:absolute;width:0;height:0" aria-hidden="true">
  <defs>
    <filter id="a11y-protanopia"><feColorMatrix type="matrix" values="0.567,0.433,0,0,0 0.558,0.442,0,0,0 0,0.242,0.758,0,0 0,0,0,1,0"/></filter>
    <filter id="a11y-deuteranopia"><feColorMatrix type="matrix" values="0.625,0.375,0,0,0 0.7,0.3,0,0,0 0,0.3,0.7,0,0 0,0,0,1,0"/></filter>
    <filter id="a11y-tritanopia"><feColorMatrix type="matrix" values="0.95,0.05,0,0,0 0,0.433,0.567,0,0 0,0.475,0.525,0,0 0,0,0,1,0"/></filter>
  </defs>
</svg>
<div class="a11y-widget" id="a11y-widget">
  <button class="a11y-show" id="a11y-show" type="button" aria-label="Mostrar acessibilidade" title="Mostrar acessibilidade" aria-expanded="true" aria-controls="a11y-fab">›</button>
  <div class="a11y-fab" id="a11y-fab">
    <button class="a11y-btn" id="a11y-open" type="button" aria-label="Abrir acessibilidade" title="Acessibilidade"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="4" r="2"/><path d="M4 9h16"/><path d="M9 9v11"/><path d="M15 9v11"/></svg></button>
  </div>
</div>
<div class="a11y-overlay" id="a11y-overlay" hidden>
  <div class="a11y-panel" role="dialog" aria-modal="true" aria-labelledby="a11y-title">
    <header>
      <h2 id="a11y-title">Acessibilidade</h2>
      <button id="a11y-close" type="button" aria-label="Fechar" style="background:none;border:none;font-size:1.5rem;cursor:pointer;color:var(--text-muted)">×</button>
    </header>
    <div class="a11y-body">
      <section>
        <p>Tema</p>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">
          <button id="a11y-claro" type="button">☀ Claro</button>
          <button id="a11y-escuro" type="button">☾ Escuro</button>
          <button id="a11y-contraste" type="button">◐ Contraste</button>
        </div>
      </section>
      <section>
        <label for="a11y-filtro">Filtro de cor</label>
        <select id="a11y-filtro">
          <option value="none">Nenhum</option>
          <option value="protanopia">Protanopia</option>
          <option value="deuteranopia">Deuteranopia</option>
          <option value="tritanopia">Tritanopia</option>
          <option value="monocromia">Monocromia</option>
        </select>
      </section>
      <section>
        <label for="a11y-fonte">Tamanho da fonte</label>
        <input id="a11y-fonte" type="range" min="0" max="3" step="1" value="1" />
        <div style="display:flex;justify-content:space-between;font-size:.75rem;color:var(--text-muted)"><span>A-</span><span>A</span><span>A+</span><span>A++</span></div>
      </section>
      <section class="a11y-row">
        <span>Fonte para dislexia (OpenDyslexic)</span>
        <button class="a11y-toggle" id="a11y-dislexia" type="button" aria-pressed="false" aria-label="Alternar fonte para dislexia"></button>
      </section>
      <section class="a11y-row">
        <span>VLibras (tradução em Libras)</span>
        <button class="a11y-toggle" id="a11y-vlibras" type="button" aria-pressed="false" aria-label="Alternar VLibras"></button>
      </section>
    </div>
    <div class="a11y-actions">
      <button id="a11y-restore" type="button">Restaurar padrões</button>
    </div>
  </div>
</div>

<!-- VLibras (arquivos locais em resources/scripts/; carregado de forma diferida) -->
<div vw class="enabled">
  <div vw-access-button class="active"></div>
  <div vw-plugin-wrapper><div class="vw-plugin-top-wrapper"></div></div>
</div>
<script>
  (function () {
    function loadVlibras() {
      if (document.documentElement.getAttribute("data-vlibras") === "off") return;
      // Anexo 03, 4.3.9.1: nenhum recurso externo. A editora deve incluir o
      // plugin do VLibras em resources/scripts/ dentro do pacote.
      var s = document.createElement("script");
      s.src = "resources/scripts/vlibras-plugin.js";
      s.onerror = function () {};
      s.onload = function () {
        try { new window.VLibras.Widget("resources/scripts"); } catch (e) {}
      };
      document.body.appendChild(s);
    }
    if (window.requestIdleCallback) requestIdleCallback(loadVlibras); else setTimeout(loadVlibras, 1200);
  })();
</script>
`;

export const A11Y_JS = `
(function () {
  var KEY = "catalogo.a11y.v1";
  var DEFAULTS = { tema: "light", filtro: "none", tamanhoFonte: "normal", dislexia: false, vlibras: false };
  var SIZES = ["small", "normal", "large", "xlarge"];
  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) {
        var prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
        return Object.assign({}, DEFAULTS, { tema: prefersDark ? "dark" : "light" });
      }
      return Object.assign({}, DEFAULTS, JSON.parse(raw));
    } catch (e) { return Object.assign({}, DEFAULTS); }
  }
  function save(cfg) { try { localStorage.setItem(KEY, JSON.stringify(cfg)); } catch (e) {} }
  function apply(cfg) {
    var r = document.documentElement;
    if (cfg.filtro === "none") r.removeAttribute("data-color-filter"); else r.setAttribute("data-color-filter", cfg.filtro);
    r.setAttribute("data-font-size", cfg.tamanhoFonte);
    r.setAttribute("data-theme", cfg.tema === "escuro" ? "dark" : cfg.tema === "claro" ? "light" : cfg.tema);
    r.setAttribute("data-vlibras", cfg.vlibras ? "on" : "off");
    if (cfg.dislexia) r.setAttribute("data-font", "opendyslexic"); else r.removeAttribute("data-font");
  }
  var cfg = load();
  apply(cfg);

  var fab = document.getElementById("a11y-fab");
  var showBtn = document.getElementById("a11y-show");
  var FAB_KEY = "catalogo.a11y.fabHidden";
  var overlay = document.getElementById("a11y-overlay");
  var panel = overlay ? overlay.querySelector(".a11y-panel") : null;
  var openBtn = document.getElementById("a11y-open");
  var closeBtn = document.getElementById("a11y-close");
  var claroBtn = document.getElementById("a11y-claro");
  var escuroBtn = document.getElementById("a11y-escuro");
  var contrasteBtn = document.getElementById("a11y-contraste");
  var vlibrasBtn = document.getElementById("a11y-vlibras");
  var filtroSel = document.getElementById("a11y-filtro");
  var fonteRange = document.getElementById("a11y-fonte");
  var dislexiaBtn = document.getElementById("a11y-dislexia");
  var restoreBtn = document.getElementById("a11y-restore");

  function syncUI() {
    if (filtroSel) filtroSel.value = cfg.filtro;
    if (fonteRange) fonteRange.value = String(SIZES.indexOf(cfg.tamanhoFonte));
    if (dislexiaBtn) {
      dislexiaBtn.classList.toggle("on", !!cfg.dislexia);
      dislexiaBtn.setAttribute("aria-pressed", cfg.dislexia ? "true" : "false");
    }
    if (vlibrasBtn) {
      vlibrasBtn.classList.toggle("on", !!cfg.vlibras);
      vlibrasBtn.setAttribute("aria-pressed", cfg.vlibras ? "true" : "false");
    }
  }
  syncUI();

  function update(patch) {
    cfg = Object.assign({}, cfg, patch);
    apply(cfg);
    save(cfg);
    syncUI();
  }

  function openPanel() {
    if (!overlay) return;
    overlay.hidden = false;
    document.body.style.overflow = "hidden";
    // Sempre que o painel abre, o widget reaparece sincronizado.
    setFabHidden(false);
  }
  function closePanel() {
    if (!overlay) return;
    overlay.hidden = true;
    document.body.style.overflow = "";
  }

  // Fonte unica de verdade: um so estado para FAB e alca, persistido e
  // sincronizado entre abas via storage.
  function setFabHidden(hidden) {
    if (fab) fab.classList.toggle("hidden-fab", !!hidden);
    if (showBtn) {
      showBtn.hidden = !hidden;
      showBtn.textContent = hidden ? "›" : "‹";
      showBtn.setAttribute("aria-label", hidden ? "Mostrar acessibilidade" : "Ocultar acessibilidade");
      showBtn.setAttribute("title", hidden ? "Mostrar acessibilidade" : "Ocultar acessibilidade");
      showBtn.setAttribute("aria-expanded", hidden ? "false" : "true");
    }
    try { localStorage.setItem(FAB_KEY, hidden ? "1" : "0"); } catch (e) {}
  }
  function syncFab() {
    var hidden = false;
    try { hidden = localStorage.getItem(FAB_KEY) === "1"; } catch (e) {}
    setFabHidden(hidden);
  }
  syncFab();
  window.addEventListener("storage", function (e) { if (e.key === FAB_KEY) syncFab(); });

  if (openBtn) openBtn.addEventListener("click", openPanel);
  if (showBtn) showBtn.addEventListener("click", function () { setFabHidden(false); });
  if (closeBtn) closeBtn.addEventListener("click", closePanel);
  if (overlay) overlay.addEventListener("click", function (e) { if (e.target === overlay) closePanel(); });

  if (claroBtn) claroBtn.addEventListener("click", function () { update({ tema: "light" }); });
  if (escuroBtn) escuroBtn.addEventListener("click", function () { update({ tema: "dark" }); });
  if (contrasteBtn) contrasteBtn.addEventListener("click", function () { update({ tema: "high-contrast" }); });
  if (vlibrasBtn) vlibrasBtn.addEventListener("click", function () { update({ vlibras: !cfg.vlibras }); });
  if (filtroSel) filtroSel.addEventListener("change", function () { update({ filtro: filtroSel.value }); });
  if (fonteRange) fonteRange.addEventListener("input", function () { update({ tamanhoFonte: SIZES[Number(fonteRange.value)] || "normal" }); });
  if (dislexiaBtn) dislexiaBtn.addEventListener("click", function () { update({ dislexia: !cfg.dislexia }); });
  if (restoreBtn) restoreBtn.addEventListener("click", function () { cfg = Object.assign({}, DEFAULTS); apply(cfg); save(cfg); syncUI(); });

  // keyboard: Escape closes panel
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && overlay && !overlay.hidden) closePanel();
  });
})();
`;
