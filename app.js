/* Mis Finanzas — Copyright (c) 2026 Felipe Manrique. Todos los derechos reservados. Ver LICENSE. */
/* Mis Finanzas FM — 6 frascos, cartera de inversiones, metas y cuotas. Datos en localStorage de este dispositivo. */
(function () {
  'use strict';

  const KEY = 'mf-fm:v1';
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2));
  const pad = (n) => String(n).padStart(2, '0');
  const isoDate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const todayIso = () => isoDate(new Date());
  const monthOf = (iso) => iso.slice(0, 7);
  const parseIso = (iso) => { const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d || 1); };
  const clone = (o) => JSON.parse(JSON.stringify(o));

  const ICON = {
    google: '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="#fff" d="M21.6 12.2c0-.7-.1-1.4-.2-2H12v3.8h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.7 3-4.3 3-7.3z"/><path fill="#fff" opacity=".85" d="M12 22c2.7 0 5-.9 6.6-2.4l-3.2-2.5c-.9.6-2 1-3.4 1-2.6 0-4.8-1.8-5.6-4.1H3.1v2.6A10 10 0 0 0 12 22z"/><path fill="#fff" opacity=".7" d="M6.4 14c-.2-.6-.3-1.3-.3-2s.1-1.4.3-2V7.4H3.1a10 10 0 0 0 0 9.2L6.4 14z"/><path fill="#fff" opacity=".85" d="M12 5.9c1.5 0 2.8.5 3.8 1.5l2.9-2.9A10 10 0 0 0 3.1 7.4L6.4 10c.8-2.3 3-4.1 5.6-4.1z"/></svg>',
    chart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 19V12M12 19V6M18 19v-9"/></svg>',
    lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="10.5" width="14" height="9.5" rx="2.5"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"/></svg>',
    cloud: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 18.5h10.5a4 4 0 0 0 .6-7.95A6 6 0 0 0 6.6 9.1 4.75 4.75 0 0 0 7 18.5z"/></svg>',
    mic: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21"/></svg>',
    left: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m15 5-7 7 7 7"/></svg>',
    right: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m9 5 7 7-7 7"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M7 7l10 10M17 7 7 17"/></svg>',
    warn: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3.5 2.8 19.5h18.4z"/><path d="M12 10v4M12 17v.01"/></svg>',
    quote: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0"/></svg>'
  };

  // ---------- Estado ----------
  const DEFAULT_SETTINGS = () => ({
    lang: 'es-AR',
    autoSave: false,
    defaultMethod: 'Efectivo',
    defaultCurrency: 'ARS',
    theme: 'auto',
    glass: 0.35,
    bigText: false,
    methods: ['Efectivo', 'Débito', 'Crédito', 'Transferencia', 'Mercado Pago'],
    initialBalances: {},
    categories: clone(Parser.DEFAULT_CATEGORIES),
    lastBackup: null,
    jars: DEFAULT_JARS(),
    catJar: DEFAULT_CAT_JAR(),
    jarInit: {},
    jarStart: monthOf(todayIso()) + '-01',
    jarMoves: [],
    colchonMeses: 6,
    colchonManual: 0,
    gastoEstimado: 1700000 / 6,
    metas: [{ id: 'm-mudanza', nombre: 'Mudarme', monto: 0 }, { id: 'm-auto', nombre: 'Auto', monto: 0 }, { id: 'm-viaje', nombre: 'Viaje', monto: 0 }],
    holdings: [],
    cuotas: []
  });

  let db = load();
  const ui = { tab: 'movs', month: monthOf(todayIso()), q: '', type: 'all', cat: null };

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const d = JSON.parse(raw);
        const settings = Object.assign(DEFAULT_SETTINGS(), d.settings || {});
        const NEW = { '#007AFF': '#0088FF', '#FF3B30': '#FF383C', '#FF9500': '#FF8D28', '#5856D6': '#6155F5', '#AF52DE': '#CB30E0',
          '#30B0C7': '#00C3D0', '#64D2FF': '#00C0E8', '#A2845E': '#AC7F5E', '#D4A017': '#FFCC00', '#FF6482': '#FF2D55' };
        ['gasto', 'ingreso'].forEach((t) => (settings.categories[t] || []).forEach((c) => { if (NEW[c.color]) c.color = NEW[c.color]; }));
        ['gasto', 'ingreso', 'inversion'].forEach((t) => { if (!Array.isArray(settings.categories[t])) settings.categories[t] = clone(Parser.DEFAULT_CATEGORIES[t]); });
        [['gasto', 'Resumen de tarjeta'], ['ingreso', 'Pensión']].forEach(([t, n]) => { if (!settings.categories[t].some((c) => c.name === n)) settings.categories[t].splice(Math.max(0, settings.categories[t].length - 1), 0, clone(Parser.DEFAULT_CATEGORIES[t].find((c) => c.name === n))); });
        // colchón acordado: 6 meses de un gasto estimado de $283.333 (= $1.700.000), punto medio entre $200.000 y $370.000
        if (!settings.gastoEstimadoEditado && [370000, 200000].includes(+settings.gastoEstimado)) settings.gastoEstimado = 1700000 / 6;
        if (!settings.colchonEditado && +settings.colchonManual === 1700000) settings.colchonManual = 0;
        const iCS = settings.categories.gasto.findIndex((c) => c.name === 'Comida y salidas');
        if (iCS >= 0) {
          const def = (n) => clone(Parser.DEFAULT_CATEGORIES.gasto.find((c) => c.name === n));
          settings.categories.gasto.splice(iCS, 1, def('Comida'), def('Salidas'));
          if (settings.catJar) { delete settings.catJar['Comida y salidas']; settings.catJar['Salidas'] = 'diversion'; }
          (d.movs || []).forEach((m) => {
            if (m.category !== 'Comida y salidas') return;
            const t = Parser.norm([m.description, m.transcript].join(' '));
            m.category = Parser.detectCategory(t, 'gasto', { gasto: [def('Salidas'), def('Comida')] }) === 'Salidas' ? 'Salidas' : 'Comida';
          });
        }
        settings.categories.gasto.forEach((c) => { if (c.name === 'Comida' && c.color === '#FF9F0A') c.color = '#C69214'; });
        (settings.jars || []).forEach((j) => { if (j.id === 'libertad' && +j.pct === 18.5 && !settings.jarsPct100) j.pct = 20; });
        // Dar pasa de $10.000 fijos a "lo que des en el mes" (pedido de Felipe)
        (settings.jars || []).forEach((j) => { if (j.id === 'dar' && +j.fixed === 10000 && !settings.darActual) { delete j.fixed; j.actual = true; j.hint = 'Recibe exactamente lo que donás o regalás en el mes'; } });
        settings.darActual = true;
        settings.jarsPct100 = true;
        if (!settings.categories.gasto.some((c) => c.name === 'Donaciones')) settings.categories.gasto.splice(Math.max(0, settings.categories.gasto.length - 1), 0, clone(Parser.DEFAULT_CATEGORIES.gasto.find((c) => c.name === 'Donaciones')));
        return { movs: Array.isArray(d.movs) ? d.movs : [], settings };
      }
    } catch (e) { console.warn('No pude leer los datos guardados', e); }
    return { movs: [], settings: DEFAULT_SETTINGS() };
  }
  let persistAsked = false;
  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(db));
    } catch (e) {
      toast('No pude guardar en este dispositivo. Exportá una copia desde Ajustes.');
      return false;
    }
    if (!persistAsked && navigator.storage && navigator.storage.persist) { persistAsked = true; navigator.storage.persist().catch(() => {}); }
    scheduleSync();
    return true;
  }
  const S = () => db.settings;

  // ---------- Formato ----------
  // Números: punto decimal y un espacio fino entre miles (34 861.8), como en el teclado del teléfono.
  const fmtCache = {};
  function fmtNum(v, max = 2, min = 0) {
    const k = max + ':' + min;
    if (!fmtCache[k]) fmtCache[k] = new Intl.NumberFormat('en-US', { minimumFractionDigits: min, maximumFractionDigits: max });
    return fmtCache[k].format(v).replace(/,/g, '\u2060\u2005\u2060'); // espacio angosto (¼ em) que no corta línea
  }
  const CUR_SIGN = { ARS: '$', USD: 'US$', EUR: '€' };
  function money(v, cur = 'ARS', signed = false) {
    const s = (CUR_SIGN[cur] || cur) + ' ' + fmtNum(Math.abs(v), 2, v % 1 ? 2 : 0);
    if (signed && v) return (v < 0 ? '−' : '+') + s;
    return v < 0 ? '−' + s : s;
  }
  const monthName = (ym) => { const d = parseIso(ym + '-01'); return d.toLocaleDateString('es-AR', { month: 'long' }) + ' ' + d.getFullYear(); };
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  const monthShort = (ym) => parseIso(ym + '-01').toLocaleDateString('es-AR', { month: 'short' }).replace('.', '');
  function dayLabel(iso) {
    const t = todayIso();
    if (iso === t) return 'Hoy';
    const y = new Date(); y.setDate(y.getDate() - 1);
    if (iso === isoDate(y)) return 'Ayer';
    const d = parseIso(iso);
    const opts = { weekday: 'short', day: 'numeric', month: 'short' };
    if (d.getFullYear() !== new Date().getFullYear()) opts.year = 'numeric';
    return d.toLocaleDateString('es-AR', opts).replace(/[.,]/g, '');
  }
  function shiftMonth(ym, n) { const d = parseIso(ym + '-01'); d.setMonth(d.getMonth() + n); return monthOf(isoDate(d)); }
  // Lo que se escribe a mano: el punto (o la coma) es decimal; los espacios separan miles.
  function parseAmount(s) {
    if (typeof s === 'number') return s;
    s = String(s || '').replace(/[^\d.,]/g, '');
    if (!s) return NaN;
    if (s.includes('.') && s.includes(',')) { const v = Parser.parseDigits(s); return v === null ? NaN : v; } // pegado tipo 1.234,56
    const parts = s.split(s.includes(',') ? ',' : '.');
    return parseFloat(parts.length > 2 ? parts.join('') : parts.join('.'));
  }
  // Planillas importadas: 1.500 = mil quinientos
  function parseLoose(s) {
    s = String(s || '').replace(/[^\d.,]/g, '');
    const v = s ? Parser.parseDigits(s) : null;
    return v === null ? NaN : v;
  }
  const parseQty = parseAmount;
  function amountInputValue(v) {
    if (!v && v !== 0) return '';
    return fmtNum(v).replace(/\u2060/g, ''); // en los campos, sin caracteres invisibles que traben el borrado
  }

  function catInfo(type, name) {
    const list = S().categories[type] || [];
    return list.find((c) => c.name === name) || { name: name || 'Sin categoría', color: '#8E8E93', kw: [] };
  }

  // ---------- Toast ----------
  let toastTimer;
  function toast(msg, undo) {
    const el = $('#toast');
    $('#toast-msg').textContent = msg;
    const b = $('#toast-btn');
    b.hidden = !undo;
    b.onclick = () => { if (undo) undo(); el.classList.remove('show'); };
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), undo ? 5000 : 3000);
  }

  // ---------- Hoja inferior ----------
  const sheet = { onClose: null };
  function openSheet({ title, left = 'Cancelar', right = '', onLeft, onRight, render, onClose }) {
    const sh = $('#sheet'), sc = $('#scrim');
    $('#sheet-title').textContent = title;
    const l = $('#sheet-left'), r = $('#sheet-right');
    l.textContent = left; l.hidden = !left;
    r.textContent = right; r.hidden = !right; r.disabled = false;
    l.onclick = () => (onLeft ? onLeft() : closeSheet());
    r.onclick = () => onRight && onRight();
    if (sheet.onClose && sheet.onClose !== onClose) { const f = sheet.onClose; sheet.onClose = null; f(); }
    sheet.onClose = onClose || null;
    const body = $('#sheet-body');
    body.innerHTML = '';
    body.scrollTop = 0;
    render(body);
    $$('.split-box', body).forEach(paintSplit);
    if (sh.hidden) {
      sh.hidden = false; sc.hidden = false;
      requestAnimationFrame(() => requestAnimationFrame(() => { sh.classList.add('open'); sc.classList.add('open'); }));
      document.body.style.overflow = 'hidden';
    }
  }
  function closeSheet() {
    const sh = $('#sheet'), sc = $('#scrim');
    if (sheet.onClose) { const f = sheet.onClose; sheet.onClose = null; f(); }
    sh.classList.remove('open'); sc.classList.remove('open');
    document.body.style.overflow = '';
    setTimeout(() => { if (!sh.classList.contains('open')) { sh.hidden = true; sc.hidden = true; $('#sheet-body').innerHTML = ''; } }, 380);
  }
  const sheetOpen = () => !$('#sheet').hidden && $('#sheet').classList.contains('open');

  // ---------- Cálculos ----------
  function totals(movs) {
    const t = { ARS: { in: 0, out: 0 }, USD: { in: 0, out: 0 } };
    for (const m of movs) {
      const c = t[m.currency] || (t[m.currency] = { in: 0, out: 0 });
      if (m.type === 'ingreso') c.in += m.amount; else c.out += m.amount;
    }
    return t;
  }
  const movsOfMonth = (ym) => db.movs.filter((m) => monthOf(m.date) === ym);
  const sortMovs = (arr) => arr.sort((a, b) => (b.date.localeCompare(a.date)) || (b.createdAt || 0) - (a.createdAt || 0));

  // Agrupa cada título de sección con lo que sigue hasta el próximo título (para el diseño en columnas de pantallas grandes).
  function paneify(el) {
    const kids = Array.from(el.children);
    let pane = null, i = 0;
    for (const k of kids) {
      if (k.matches('h2.section-title')) { pane = document.createElement('section'); pane.className = 'pane pane-' + (i++); el.insertBefore(pane, k); }
      else if (!pane) { pane = document.createElement('section'); pane.className = 'pane pane-lead'; el.insertBefore(pane, k); }
      pane.appendChild(k);
    }
  }

  // ---------- Render: selector de mes ----------
  function renderMonthSwitch() {
    const cur = monthOf(todayIso());
    $$('[data-month-switch]').forEach((el) => {
      el.innerHTML = `<button data-m="-1" aria-label="Mes anterior">${ICON.left}</button>
        <span class="label">${esc(cap(monthName(ui.month)))}</span>
        <button data-m="1" aria-label="Mes siguiente" ${ui.month >= cur ? 'disabled' : ''}>${ICON.right}</button>
        ${ui.month !== cur ? '<button class="today-link" data-m="0">Este mes</button>' : ''}`;
    });
  }

  // ---------- Render: movimientos ----------
  function renderSummary() {
    const ms = movsOfMonth(ui.month);
    const t = totals(ms);
    const inv = sum(ms.filter((m) => m.type === 'inversion' && m.currency === 'ARS'));
    const gas = t.ARS.out - inv;
    const bal = t.ARS.in - t.ARS.out;
    const js = jarsState(ui.month);
    let html = `<div><div class="caption">Balance de ${esc(monthName(ui.month).split(' ')[0])}</div>
      <div class="balance num ${bal < 0 ? 'neg' : ''}">${money(Math.round(bal))}</div></div>
      <div class="split">
        <div class="in"><span class="caption">Ingresos</span><span class="v num">${money(Math.round(t.ARS.in))}</span></div>
        <div class="out"><span class="caption">Gastos</span><span class="v num">${money(Math.round(gas))}</span></div>
      </div>
      ${inv ? `<div class="usd-line num">Invertido este mes: <strong style="color:var(--inv)">${money(Math.round(inv))}</strong></div>` : ''}
      <button class="jar-strip" id="jar-strip">${jarsOf().filter((j) => j.id === 'gastos' || j.id === 'diversion').map((j) => `<span style="--j:${esc(j.color)}"><span class="jar-dot"></span>${esc(j.name)} <strong class="num">${money(Math.round((js[j.id] || {}).bal || 0))}</strong></span>`).join('')}${ICON.right}</button>`;
    if (t.USD.in || t.USD.out) html += `<div class="usd-line num">Dólares: ingresos ${money(t.USD.in, 'USD')} · salidas ${money(t.USD.out, 'USD')}</div>`;
    $('#summary').innerHTML = html;
    $('#jar-strip').onclick = () => go('accounts');
  }

  function renderBackupBanner() {
    const el = $('#backup-banner');
    if (driveOn()) {
      const st = driveState();
      if (st.level === 'error') {
        el.innerHTML = `<div class="banner">${ICON.warn}<div>Copia en Drive: ${esc(st.text)} <button id="bk-fix">Revisar</button></div></div>`;
        $('#bk-fix').onclick = () => go('settings');
      } else el.innerHTML = '';
      return;
    }
    const n = db.movs.length;
    const last = S().lastBackup ? new Date(S().lastBackup) : null;
    // sin cuenta: recordatorio semanal de copia manual
    const since = last || (S().firstUse ? new Date(S().firstUse) : null);
    const stale = since && (Date.now() - since.getTime()) > 7 * 864e5;
    if (n >= 3 && stale) {
      el.innerHTML = `<div class="banner">${ICON.warn}<div>Tus datos están sólo en este teléfono. ${last ? 'Tu última copia es de hace más de una semana.' : 'Todavía no guardaste ninguna copia.'} <button id="bk-now">Guardar copia</button> · <button id="bk-g">Conectar Google</button></div></div>`;
      $('#bk-now').onclick = exportJSON;
      $('#bk-g').onclick = openDriveConnect;
    } else el.innerHTML = '';
  }

  function filteredMovs() {
    const q = Parser.norm(ui.q.trim());
    let arr = q ? db.movs.slice() : movsOfMonth(ui.month);
    if (ui.type !== 'all') arr = arr.filter((m) => m.type === ui.type);
    if (ui.cat) arr = arr.filter((m) => m.category === ui.cat);
    if (q) {
      arr = arr.filter((m) => {
        const hay = Parser.norm([m.description, m.category, m.method, m.amount, amountInputValue(m.amount)].join(' '));
        return q.split(/\s+/).every((w) => hay.includes(w));
      });
    }
    return sortMovs(arr);
  }

  function rowHtml(m) {
    const c = catInfo(m.type, m.category);
    const hold = m.type === 'inversion' && m.holdingId ? (S().holdings || []).find((x) => x.id === m.holdingId) : null;
    const jar = m.type === 'gasto' ? jarById(jarOfMov(m)) : null;
    const sub = [m.category, m.type === 'ingreso' && m.split ? 'Reparto personalizado' : null, jar ? jar.name : null, hold ? hold.nombre : null, m.method, m.installments ? m.installments + ' cuotas' : null].filter(Boolean).join(' · ');
    return `<button class="row" data-id="${esc(m.id)}">
      <span class="badge" style="--c:${esc(c.color)}" aria-hidden="true">${esc((m.category || '?').charAt(0).toUpperCase())}</span>
      <span class="mid"><span class="t">${esc(m.description || m.category)}</span>
      <span class="s">${m.source === 'voz' ? `<span class="mic-tag" title="Cargado con la voz">${ICON.quote}</span>` : ''}${esc(sub)}</span></span>
      <span class="amt num ${typeClass(m.type) === 'out' ? '' : typeClass(m.type)}">${money(m.type === 'ingreso' ? m.amount : -m.amount, m.currency, m.type === 'ingreso')}</span>
    </button>`;
  }

  function renderList() {
    const list = $('#list');
    const cf = $('#cat-filter');
    if (ui.cat) { cf.hidden = false; cf.innerHTML = `Categoría: <strong>${esc(ui.cat)}</strong> <button id="clear-cat">Quitar filtro</button>`; $('#clear-cat').onclick = () => { ui.cat = null; renderMovs(); }; }
    else cf.hidden = true;

    const arr = filteredMovs();
    if (!db.movs.length) {
      const ex = ['Gasté 12 mil en nafta con débito', 'Cobré 850 mil de sueldo por transferencia', 'Ayer pagué 4.500 de colectivo y 9 mil en la farmacia'];
      list.innerHTML = `<div class="empty"><h2>Contale a la app en qué se fue la plata</h2>
        <p>Tocá el micrófono y hablá como le hablarías a alguien. La app entiende el monto, si es gasto o ingreso, la categoría, el medio de pago y la fecha.</p>
        <div class="examples">${ex.map((e) => `<button data-ex="${esc(e)}">${ICON.quote}<span>“${esc(e)}”</span></button>`).join('')}</div>
        <p class="hint">Tocá un ejemplo para ver cómo lo interpreta. No se guarda nada hasta que confirmes.</p></div>`;
      $$('[data-ex]', list).forEach((b) => (b.onclick = () => openReview(b.dataset.ex, 'ejemplo')));
      return;
    }
    if (!arr.length) {
      list.innerHTML = `<div class="empty"><p>${ui.q ? 'Ningún movimiento coincide con la búsqueda.' : 'No hay movimientos en ' + esc(monthName(ui.month)) + '.'}</p></div>`;
      return;
    }
    const days = new Map();
    for (const m of arr) { if (!days.has(m.date)) days.set(m.date, []); days.get(m.date).push(m); }
    let html = ui.q ? `<p class="footnote">${arr.length} resultado${arr.length === 1 ? '' : 's'} en todos los meses</p>` : '';
    for (const [d, ms] of days) {
      const net = ms.filter((m) => m.currency === 'ARS').reduce((s, m) => s + (m.type === 'ingreso' ? m.amount : -m.amount), 0);
      html += `<div class="day"><div class="day-head"><span>${esc(dayLabel(d))}</span><span class="num">${net ? money(net, 'ARS', true) : ''}</span></div>
        <div class="group">${ms.map(rowHtml).join('')}</div></div>`;
    }
    list.innerHTML = html;
    $$('.row', list).forEach((r) => (r.onclick = () => openEditor(db.movs.find((m) => m.id === r.dataset.id))));
  }

  function renderMovs() {
    renderMonthSwitch(); renderSummary(); renderBackupBanner(); renderList();
    $$('#type-filter button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.f === ui.type)));
  }

  // ---------- Render: análisis ----------
  function renderStats() {
    renderMonthSwitch();
    const el = $('#stats');
    const ms = movsOfMonth(ui.month).filter((m) => m.currency === 'ARS');
    const t = totals(ms).ARS;
    const prevT = totals(movsOfMonth(shiftMonth(ui.month, -1)).filter((m) => m.currency === 'ARS')).ARS;
    const cur = monthOf(todayIso());
    const d0 = parseIso(ui.month + '-01');
    const daysInMonth = new Date(d0.getFullYear(), d0.getMonth() + 1, 0).getDate();
    const daysElapsed = ui.month === cur ? new Date().getDate() : ui.month < cur ? daysInMonth : 0;
    const expenses = ms.filter((m) => m.type === 'gasto');
    const biggest = expenses.slice().sort((a, b) => b.amount - a.amount)[0];
    const byMethod = {};
    expenses.forEach((m) => (byMethod[m.method] = (byMethod[m.method] || 0) + m.amount));
    const topMethod = Object.entries(byMethod).sort((a, b) => b[1] - a[1])[0];
    let cmp = '—';
    if (prevT.out && t.out) {
      const p = Math.round(((t.out - prevT.out) / prevT.out) * 100);
      cmp = (p > 0 ? '+' : '') + p + '%';
    }

    let html = `<div class="stats">
      <div class="stat"><span class="k">Gasto por día</span><span class="v num">${daysElapsed ? money(Math.round(t.out / daysElapsed)) : '—'}</span><span class="d">promedio del mes</span></div>
      <div class="stat"><span class="k">Vs. mes anterior</span><span class="v num">${cmp}</span><span class="d">en gastos (${esc(monthShort(shiftMonth(ui.month, -1)))}: ${money(prevT.out)})</span></div>
      <div class="stat"><span class="k">Mayor gasto</span><span class="v num">${biggest ? money(biggest.amount) : '—'}</span><span class="d">${biggest ? esc(biggest.description || biggest.category) : 'sin gastos'}</span></div>
      <div class="stat"><span class="k">Medio más usado</span><span class="v txt">${topMethod ? esc(topMethod[0]) : '—'}</span><span class="d num">${topMethod ? money(topMethod[1]) : 'sin gastos'}</span></div>
    </div>`;

    const block = (type, title) => {
      const items = ms.filter((m) => m.type === type);
      const total = items.reduce((s, m) => s + m.amount, 0);
      if (!total) return `<h2 class="section-title">${title}</h2><div class="card"><p class="footnote" style="margin:0">Sin ${title.toLowerCase()} en ${esc(monthName(ui.month))}.</p></div>`;
      const by = {};
      items.forEach((m) => (by[m.category] = (by[m.category] || 0) + m.amount));
      const rows = Object.entries(by).sort((a, b) => b[1] - a[1]);
      const max = rows[0][1];
      return `<h2 class="section-title">${title}</h2><div class="card catbars">${rows.map(([name, v]) => {
        const c = catInfo(type, name);
        return `<button class="catbar" data-cat="${esc(name)}" data-type="${type}">
          <span class="n"><span class="dot" style="background:${esc(c.color)}"></span><span>${esc(name)}</span></span>
          <span class="v num">${money(v)}<small>${Math.round((v / total) * 100)}%</small></span>
          <span class="track"><i style="width:${(v / max) * 100}%;background:${esc(c.color)}"></i></span></button>`;
      }).join('')}</div>`;
    };
    html += block('gasto', 'Gastos por categoría');
    html += block('ingreso', 'Ingresos por categoría');
    html += `<h2 class="section-title">Últimos 6 meses</h2><div class="card chart">${barChart()}
      <div class="legend"><span><i style="background:var(--income-fill)"></i>Ingresos</span><span><i style="background:var(--expense-fill)"></i>Gastos</span></div></div>
      <p class="footnote">Montos en pesos. Los movimientos en dólares se muestran aparte en el resumen.</p>`;
    el.innerHTML = html;
    paneify(el);
    $$('.catbar', el).forEach((b) => (b.onclick = () => { ui.cat = b.dataset.cat; ui.type = b.dataset.type; ui.q = ''; $('#q').value = ''; go('movs'); }));
  }

  function niceMax(v) {
    if (v <= 0) return 1;
    const p = Math.pow(10, Math.floor(Math.log10(v)));
    const n = v / p;
    return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p;
  }
  function shortMoney(v) {
    if (v >= 1e6) return '$' + fmtNum(v / 1e6, 1) + ' M';
    if (v >= 1e3) return '$' + fmtNum(v / 1e3, 0) + ' mil';
    return '$' + v;
  }
  function barChart() {
    const months = [];
    for (let i = 5; i >= 0; i--) months.push(shiftMonth(ui.month, -i));
    const data = months.map((ym) => ({ ym, ...totals(movsOfMonth(ym).filter((m) => m.currency === 'ARS')).ARS }));
    const max = niceMax(Math.max(...data.map((d) => Math.max(d.in, d.out))));
    const W = 340, H = 180, L = 52, B = 22, T = 8, R = 4;
    const ch = H - B - T, cw = (W - L - R) / months.length;
    const bw = Math.min(16, cw / 3);
    let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Ingresos y gastos de los últimos 6 meses">`;
    [0, 0.5, 1].forEach((f) => {
      const y = T + ch - ch * f;
      s += `<line x1="${L}" x2="${W - R}" y1="${y}" y2="${y}" stroke="var(--separator)" stroke-width="${f === 0 ? 1 : 0.5}"/>`;
      s += `<text x="${L - 6}" y="${y + 4}" text-anchor="end">${esc(shortMoney(max * f))}</text>`;
    });
    data.forEach((d, i) => {
      const cx = L + cw * i + cw / 2;
      const hi = (d.in / max) * ch, ho = (d.out / max) * ch;
      if (hi > 0) s += `<rect x="${cx - bw - 1}" y="${T + ch - hi}" width="${bw}" height="${hi}" rx="3" fill="var(--income-fill)"><title>${esc(monthName(d.ym))} · ingresos ${esc(money(d.in))}</title></rect>`;
      if (ho > 0) s += `<rect x="${cx + 1}" y="${T + ch - ho}" width="${bw}" height="${ho}" rx="3" fill="var(--expense-fill)"><title>${esc(monthName(d.ym))} · gastos ${esc(money(d.out))}</title></rect>`;
      s += `<text x="${cx}" y="${H - 6}" text-anchor="middle" style="${d.ym === ui.month ? 'font-weight:600;fill:var(--label)' : ''}">${esc(monthShort(d.ym))}</text>`;
    });
    return s + '</svg>';
  }

  const sum = (arr) => arr.reduce((s, m) => s + (+m.amount || 0), 0);
  const monthsBetween = (fromIso, toIso) => { const a = parseIso(fromIso), b = parseIso(toIso); return (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth()); };
  // ---------- Método de los 6 frascos (adaptado) ----------
  // Cada ingreso se reparte al entrar: primero los frascos de monto fijo (una vez por mes), después el resto por porcentaje.
  // Los gastos salen del frasco de su categoría y las inversiones del de libertad financiera.
  function DEFAULT_JARS() { return [
    { id: 'gastos', name: 'Gastos del mes', pct: 45, color: '#0088FF', hint: 'Tarjeta, cuotas, nafta, comida, compras, salud' },
    { id: 'diversion', name: 'Diversión', pct: 10, color: '#FF8D28', hint: 'Salidas, cenas y gustos. Se gasta sin culpa' },
    { id: 'largo', name: 'Ahorro a largo plazo', pct: 25, color: '#00C8B3', hint: 'Primero el colchón; después mudanza, auto y viaje' },
    { id: 'libertad', name: 'Libertad financiera', pct: 20, color: '#6155F5', hint: 'Inversión: no se toca' },
    { id: 'dar', name: 'Dar', actual: true, color: '#FF2D55', hint: 'Recibe exactamente lo que donás o regalás en el mes' }
  ]; }
  function DEFAULT_CAT_JAR() { return { 'Salidas': 'diversion', 'Ocio': 'diversion', 'Ropa': 'diversion', 'Educación': 'largo', 'Donaciones': 'dar', 'Regalos': 'dar' }; }
  const jarsOf = () => S().jars || [];
  const jarById = (id) => jarsOf().find((j) => j.id === id) || jarsOf()[0];
  const jarOfMov = (m) => {
    if (m.type === 'inversion') return m.jar && jarById(m.jar) ? m.jar : 'libertad';
    if (m.type !== 'gasto') return null;
    const id = m.jar || (S().catJar || {})[m.category] || 'gastos';
    return jarsOf().some((j) => j.id === id) ? id : (jarsOf()[0] || {}).id;
  };

  function jarsState(ym) {
    const jars = jarsOf();
    const pctJars = jars.filter((j) => !(j.fixed > 0) && !j.actual);
    const pctTotal = pctJars.reduce((s, j) => s + (+j.pct || 0), 0) || 1;
    const st = {};
    jars.forEach((j) => { const ini = +(S().jarInit || {})[j.id] || 0; st[j.id] = { bal: ini, prev: ini, inM: 0, outM: 0, mvM: 0 }; });
    const start = S().jarStart || '0000';
    const moves = (S().jarMoves || []).filter((x) => x.date >= start).map((x) => Object.assign({ kind: 'move' }, x));
    const movs = db.movs.filter((m) => m.currency === 'ARS' && m.date >= start).concat(moves)
      .filter((m) => monthOf(m.date) <= ym)
      .sort((a, b) => a.date.localeCompare(b.date) || (a.createdAt || 0) - (b.createdAt || 0));
    // saldo = anterior (inicial + meses previos) + entró este mes − usado este mes ± movido entre frascos
    const put = (id, v, m, kind) => {
      if (!st[id]) return;
      st[id].bal += v;
      if (monthOf(m.date) < ym) st[id].prev += v;
      else if (kind === 'move') st[id].mvM += v;
      else if (v >= 0) st[id].inM += v; else st[id].outM -= v;
    };
    // Por mes: ingresos con reparto normal y lo que se descuenta antes de los porcentajes
    // (montos fijos + frascos "según lo que des", que reciben exactamente lo gastado en el mes).
    const monthInfo = {};
    const info = (mo) => monthInfo[mo] || (monthInfo[mo] = { ing: 0, actual: {} });
    const actualJars = jars.filter((j) => j.actual);
    const fixedJars = jars.filter((j) => !j.actual && j.fixed > 0);
    for (const m of movs) {
      if (m.kind === 'move') continue;
      if (m.type === 'ingreso' && !(m.split && Object.keys(m.split).length)) info(monthOf(m.date)).ing += m.amount;
      else if (m.type !== 'ingreso') { const id = jarOfMov(m); const j = actualJars.find((x) => x.id === id); if (j) { const inf = info(monthOf(m.date)); inf.actual[id] = (inf.actual[id] || 0) + m.amount; } }
    }
    const firstFor = (mo) => {
      const inf = info(mo);
      if (inf.deduct) return inf.deduct;
      const want = fixedJars.map((j) => [j.id, +j.fixed || 0]).concat(actualJars.map((j) => [j.id, inf.actual[j.id] || 0]));
      let left = inf.ing; const ded = {};
      want.forEach(([id, v]) => { const d = Math.min(v, Math.max(0, left)); ded[id] = d; left -= d; });
      inf.deduct = ded; inf.base = Math.max(0, left);
      return ded;
    };
    for (const m of movs) {
      if (m.kind === 'move') { put(m.from, -m.amount, m, 'move'); put(m.to, m.amount, m, 'move'); continue; }
      if (m.type === 'ingreso' && m.split && Object.keys(m.split).length) {
        // reparto personalizado: cada frasco recibe su porcentaje de este ingreso
        const tot = Object.values(m.split).reduce((a2, b2) => a2 + (+b2 || 0), 0) || 100;
        Object.entries(m.split).forEach(([id, p]) => put(id, m.amount * (+p || 0) / tot, m));
      } else if (m.type === 'ingreso') {
        const mo = monthOf(m.date), inf = info(mo), ded = firstFor(mo);
        const share = inf.ing ? m.amount / inf.ing : 0;
        Object.entries(ded).forEach(([id, v]) => put(id, v * share, m));
        const rest = inf.base * share;
        pctJars.forEach((j) => put(j.id, rest * (+j.pct || 0) / pctTotal, m));
      } else {
        const id = jarOfMov(m);
        if (id) put(id, -m.amount, m);
      }
    }
    return st;
  }

  // Colchón: N meses del promedio de gastos de los últimos 3 meses completos (o el mes actual si no hay historia).
  // Gasto mensual para el colchón: promedio real de los últimos 3 meses completos con gastos;
  // si todavía no hay ningún mes completo, el gasto estimado de Ajustes (un mes a medias daría un colchón demasiado chico).
  function avgMonthlyGastos() {
    const vals = [];
    const start = S().jarStart ? monthOf(S().jarStart) : '0000-00';
    for (let i = 1; i <= 3; i++) {
      const ym = shiftMonth(monthOf(todayIso()), -i);
      if (ym < start) continue;
      const g = sum(movsOfMonth(ym).filter((m) => m.type === 'gasto' && m.currency === 'ARS'));
      if (g > 0) vals.push(g);
    }
    if (vals.length) return { value: vals.reduce((a, b) => a + b, 0) / vals.length, real: true };
    return { value: +S().gastoEstimado || 0, real: false };
  }
  function metasState(largoBal) {
    const meses = +S().colchonMeses || 6;
    const g = avgMonthlyGastos();
    const avg = g.value;
    const target = Math.round((+S().colchonManual || avg * meses) / 1000) * 1000;
    let avail = Math.max(0, largoBal);
    const colchon = { nombre: +S().colchonManual ? 'Colchón de emergencia' : `Colchón de emergencia (${meses} meses)`, monto: target, tiene: Math.min(avail, target), auto: !S().colchonManual, avg, real: g.real };
    avail -= colchon.tiene;
    const metas = (S().metas || []).map((mt) => { const tiene = Math.min(avail, +mt.monto || 0); avail -= tiene; return Object.assign({}, mt, { tiene }); });
    return { colchon, metas, sobrante: avail, fase: colchon.monto > 0 && colchon.tiene < colchon.monto ? 1 : 2 };
  }

  // ---------- Cartera: tenencias y precios ----------
  const PRICES_KEY = 'mf-fm:prices';
  const CRYPTO_IDS = { BTC: 'bitcoin', ETH: 'ethereum', USDT: 'tether', USDC: 'usd-coin', SOL: 'solana', ADA: 'cardano', DOT: 'polkadot', NEXO: 'nexo' };
  const HOLD_TYPES = {
    cripto: { label: 'Cripto', hint: 'Ej: BTC, ETH, USDT', clase: 'variable' },
    cedear: { label: 'CEDEAR o acción argentina (en pesos)', hint: 'Ej: SPY, QQQ, GGAL', clase: 'variable' },
    usa: { label: 'ETF o acción de EE.UU. (en dólares)', hint: 'Ej: SPY, QQQ', clase: 'variable' },
    manual: { label: 'Renta fija u otro (valor a mano)', hint: 'Plazo fijo, bonos, ON, money market', clase: 'fija' }
  };
  let prices = (() => { try { return JSON.parse(localStorage.getItem(PRICES_KEY)) || {}; } catch (e) { return {}; } })();
  let pricesLoading = false;
  const mep = () => ((prices.dolar || {}).bolsa || {}).venta || ((prices.dolar || {}).blue || {}).venta || 0;
  const cryptoId = (h) => CRYPTO_IDS[(h.simbolo || '').toUpperCase()] || (h.simbolo || '').toLowerCase();
  const yahooSym = (h) => h.tipo === 'cedear' ? (h.simbolo || '').toUpperCase() + '.BA' : (h.simbolo || '').toUpperCase();

  async function refreshPrices(force) {
    const hs = S().holdings || [];
    if (pricesLoading || (!force && prices.at && Date.now() - new Date(prices.at).getTime() < 10 * 60000)) return;
    if (!navigator.onLine) return;
    pricesLoading = true; renderPlanIfOpen();
    const next = { at: new Date().toISOString(), yahoo: {}, crypto: {}, dolar: prices.dolar || null };
    const syms = [...new Set(hs.filter((h) => h.tipo === 'cedear' || h.tipo === 'usa').map(yahooSym).filter(Boolean))];
    const ids = [...new Set(hs.filter((h) => h.tipo === 'cripto').map(cryptoId).filter(Boolean))];
    try {
      const r = await broker('prices', { symbols: syms });
      if (r && r.ok) { next.yahoo = r.yahoo || {}; if (r.dolar) next.dolar = r.dolar; }
    } catch (e) { next.yahoo = prices.yahoo || {}; }
    if (ids.length) {
      try {
        const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=' + ids.join(',') + '&vs_currencies=usd,ars');
        if (res.ok) next.crypto = await res.json();
      } catch (e) { next.crypto = prices.crypto || {}; }
    }
    prices = next;
    try { localStorage.setItem(PRICES_KEY, JSON.stringify(prices)); } catch (e) { /* sin espacio */ }
    pricesLoading = false; renderPlanIfOpen();
  }
  const renderPlanIfOpen = () => { if (ui.tab === 'accounts') renderAccounts(); };

  function holdingState(h) {
    const movs = db.movs.filter((m) => m.type === 'inversion' && m.holdingId === h.id);
    const qty = (+h.cantidad || 0) + movs.reduce((s, m) => s + (+m.cantidad || 0), 0);
    const aportes = (+h.aporteInicial || 0) + sum(movs.filter((m) => m.currency === 'ARS'));
    let price = null, ars = null;
    if (h.tipo === 'cripto') { const c = (prices.crypto || {})[cryptoId(h)]; if (c) { price = c.ars; ars = qty * c.ars; } }
    else if (h.tipo === 'cedear') { const q = (prices.yahoo || {})[yahooSym(h)]; if (q && q.price) { price = q.price; ars = qty * q.price; } }
    else if (h.tipo === 'usa') { const q = (prices.yahoo || {})[yahooSym(h)]; if (q && q.price && mep()) { price = q.price; ars = qty * q.price * mep(); } }
    else { ars = (+h.valorManual || 0) || aportes; }
    const clase = h.clase || (HOLD_TYPES[h.tipo] || {}).clase || 'variable';
    return { qty, aportes, price, ars, clase, res: ars !== null && aportes ? ars - aportes : null };
  }

  // ---------- Cuotas ----------
  function cuotaState(c) {
    const pasaron = Math.max(0, monthsBetween(c.base + '-01', monthOf(todayIso()) + '-01'));
    const quedan = Math.max(0, (+c.restantes || 0) - pasaron);
    const fin = quedan > 0 ? shiftMonth(monthOf(todayIso()), quedan - 1) : null;
    return { quedan, fin };
  }

  // ---------- Pestaña Plan ----------
  function renderAccounts() {
    renderMonthSwitch();
    const el = $('#accounts');
    const st = S();
    const ym = monthOf(todayIso());
    const esteMes = ui.month === ym;
    const js = jarsState(ui.month);
    const jsHoy = esteMes ? js : jarsState(ym);
    const chev = '<svg class="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="m9 5 7 7-7 7"/></svg>';

    // Frascos
    let html = `<h2 class="section-title" style="margin-top:8px">Mis frascos${esteMes ? '' : ' en ' + esc(monthName(ui.month).split(' ')[0])}</h2><div class="jars">${jarsOf().map((j) => {
      const s = js[j.id] || { bal: 0, prev: 0, inM: 0, outM: 0, mvM: 0 };
      // disponible del mes: lo que venía del mes anterior + lo que entró − lo usado ± lo movido
      const mes = s.bal;
      const disp = Math.max(0, s.prev) + s.inM + Math.max(0, s.mvM);
      const pct = disp > 0 ? Math.max(0, Math.min(1, mes / disp)) : 0;
      return `<button class="card jar" data-jar="${esc(j.id)}" style="--j:${esc(j.color)}">
        <div class="jar-top"><span class="jar-dot"></span><span class="jar-name">${esc(j.name)}</span><span class="jar-pct">${j.actual ? 'lo que des' : j.fixed > 0 ? money(+j.fixed) : String(+j.pct || 0) + '%'}</span></div>
        <div class="jar-bal num ${mes < 0 ? 'neg' : ''}">${money(Math.round(mes))}</div>
        <div class="bar"><i style="width:${pct * 100}%;background:var(--j)"></i></div>
        <div class="jar-calc num">
          <span>${monthOf(S().jarStart || '') === ui.month ? 'Inicial' : 'Anterior'}</span><span class="${s.prev < 0 ? 'neg' : ''}">${money(Math.round(s.prev))}</span>
          <span>Entró</span><span class="pos">+${money(Math.round(s.inM))}</span>
          <span>Usado</span><span>−${money(Math.round(s.outM))}</span>
          ${Math.round(s.mvM) ? `<span>Movido</span><span class="${s.mvM > 0 ? 'pos' : ''}">${money(Math.round(s.mvM), 'ARS', true)}</span>` : ''}
        </div>
      </button>`;
    }).join('')}</div>
      <button class="btn tinted" id="jar-move" style="margin-top:12px">Mover entre frascos</button>
      <p class="footnote">El número grande es lo disponible del mes: lo que te quedó del mes anterior + lo que entró − lo que usaste ± lo que moviste. Lo que no uses pasa solo al mes siguiente. De lo que cobrás en el mes, Dar recibe exactamente lo que donaste; el resto es el 100% y se reparte con tus porcentajes. </p>`;
    const gm = js.gastos;
    if (esteMes && gm && new Date().getDate() >= 24 && gm.bal > 1000) html += `<div class="banner">${ICON.warn}<div>Te sobran <strong>${money(Math.round(gm.bal))}</strong> en Gastos del mes. Podés dejarlos para el mes que viene o <button id="jar-move-gastos">moverlos a otro frasco</button>.</div></div>`;
    const div = js.diversion;
    if (esteMes && div && new Date().getDate() >= 24 && div.bal > 0) html += `<div class="banner">${ICON.warn}<div>Te quedan <strong>${money(Math.round(div.bal))}</strong> en Diversión este mes. La idea del método es usarlos: date un gusto.</div></div>`;

    // Metas (desde el frasco de ahorro a largo plazo)
    const ms = metasState((jsHoy.largo || {}).bal || 0);
    const metaCard = (nombre, monto, tiene, extra, id) => {
      const p = monto ? Math.min(1, tiene / monto) : 0;
      return `<button class="card meta" ${id ? `data-meta="${esc(id)}"` : 'data-colchon="1"'}>
        <div class="bt-top"><span class="meta-name">${esc(nombre)}</span><span class="num"><strong>${Math.round(p * 100)}%</strong></span></div>
        <div class="bar ${p >= 1 ? 'done' : ''}"><i style="width:${p * 100}%"></i></div>
        <div class="meta-sub num">${monto ? `${money(Math.round(tiene))} de ${money(Math.round(monto))}${extra ? ' · ' + extra : ''}` : 'Tocá para definir el objetivo'}</div></button>`;
    };
    html += `<h2 class="section-title">Mis metas</h2>
      <p class="footnote" style="margin:-4px 6px 10px">Se llenan en orden con el frasco de ahorro a largo plazo. ${ms.fase === 1 ? '<strong>Fase 1:</strong> primero el colchón.' : '<strong>Fase 2:</strong> colchón completo, ahora tus metas.'}</p>
      <div class="metas">${metaCard(ms.colchon.nombre, ms.colchon.monto, ms.colchon.tiene, ms.colchon.auto ? (ms.colchon.real ? `tu promedio de gastos: ${money(Math.round(ms.colchon.avg))}/mes` : `gasto estimado ${money(Math.round(ms.colchon.avg))}/mes, hasta tener un mes completo`) : 'monto fijado a mano')}
      ${ms.metas.map((mt) => metaCard(mt.nombre, +mt.monto || 0, mt.tiene, mt.plazo ? 'para ' + esc(cap(monthName(monthOf(mt.plazo)))) : '', mt.id)).join('')}</div>
      <button class="btn tinted" id="meta-new" style="margin-top:12px">Nueva meta</button>`;

    // Cartera
    const hs = (st.holdings || []).map((h) => Object.assign({ h }, holdingState(h)));
    const valued = hs.filter((x) => x.ars !== null);
    const tot = valued.reduce((s, x) => s + x.ars, 0);
    const fija = valued.filter((x) => x.clase === 'fija').reduce((s, x) => s + x.ars, 0);
    const vari = tot - fija;
    const aport = hs.reduce((s, x) => s + x.aportes, 0);
    const sinPrecio = hs.filter((x) => x.ars === null);
    const completo = !sinPrecio.length;
    html += `<h2 class="section-title">Mi cartera</h2>`;
    if (hs.length) {
      html += `<div class="card cartera">
        <div class="caption">Valor total</div>
        <div class="balance num">${completo ? money(Math.round(tot)) : pricesLoading ? 'Actualizando…' : money(Math.round(tot))}</div>
        ${!completo && !pricesLoading ? `<div class="usd-line">Sin precio: ${esc(sinPrecio.map((x) => x.h.nombre).join(', '))}. El total no los incluye.</div>` : ''}
        ${completo && mep() ? `<div class="usd-line num">≈ ${money(Math.round(tot / mep()), 'USD')} al dólar MEP ${money(Math.round(mep()))}</div>` : ''}
        ${completo && aport ? `<div class="usd-line num">Aportado ${money(Math.round(aport))} · resultado <strong style="color:${tot - aport >= 0 ? 'var(--income)' : 'var(--expense)'}">${money(Math.round(tot - aport), 'ARS', true)}</strong></div>` : ''}
        ${completo && tot ? `<div class="guide-bar" style="margin-top:10px"><i style="flex:${fija || 0.0001};background:#00C8B3"></i><i style="flex:${vari || 0.0001};background:#6155F5"></i></div>
        <div class="legend"><span><i style="background:#00C8B3"></i>Renta fija ${Math.round((fija / tot) * 100)}%</span><span><i style="background:#6155F5"></i>Renta variable ${Math.round((vari / tot) * 100)}%</span></div>` : ''}
      </div>
      <div class="list" style="margin-top:12px">${hs.map((x) => `<button class="item" data-hold="${esc(x.h.id)}"><span class="grow">${esc(x.h.nombre)}<span class="sub num">${x.clase === 'fija' ? 'Renta fija' : 'Renta variable'}${x.h.tipo !== 'manual' ? ` · ${fmtNum(+x.qty, 8)} ${esc((x.h.simbolo || '').toUpperCase())}` : ''}${x.res !== null ? ` · <span style="color:${x.res >= 0 ? 'var(--income)' : 'var(--expense)'}">${money(Math.round(x.res), 'ARS', true)}</span>` : ''}</span></span>
        <span class="val num" style="color:var(--label)">${x.ars !== null ? money(Math.round(x.ars)) : (pricesLoading ? '…' : 'sin precio')}</span>${chev}</button>`).join('')}</div>
      <div class="btn-row" style="margin-top:12px"><button class="btn tinted" id="hold-new">Agregar activo</button><button class="btn tinted" id="prices-now" ${pricesLoading ? 'disabled' : ''}>${pricesLoading ? 'Actualizando…' : 'Actualizar precios'}</button></div>
      <p class="footnote">${prices.at ? 'Precios de referencia del ' + esc(new Date(prices.at).toLocaleString('es-AR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })) + ' (Yahoo Finance, CoinGecko, dolarapi). ' : ''}La app sólo muestra tus tenencias; no es asesoramiento financiero.</p>`;
    } else {
      html += `<div class="card cta-card"><p>Cargá cada activo una vez (por ejemplo cuántos BTC o cuántos CEDEARs de SPY tenés) y la app actualiza los precios sola, separando renta fija y variable.</p><button class="btn" id="hold-new">Agregar activo</button></div>`;
    }

    // Cuotas
    const cs = (st.cuotas || []).map((c) => Object.assign({ c }, cuotaState(c)));
    const activas = cs.filter((x) => x.quedan > 0);
    const totalMes = activas.reduce((s, x) => s + (+x.c.monto || 0), 0);
    html += `<h2 class="section-title">Mis cuotas</h2>`;
    if (cs.length) {
      const libera = [];
      for (let i = 1; i <= 6; i++) {
        const ymF = shiftMonth(ym, i);
        const sale = activas.filter((x) => x.fin && x.fin < ymF && x.fin >= shiftMonth(ymF, -1)).reduce((s, x) => s + (+x.c.monto || 0), 0);
        if (sale) libera.push(`${cap(monthShort(ymF))}: se liberan ${money(Math.round(sale))}`);
      }
      html += `<div class="card"><div class="bt-top"><span>Pagás en cuotas por mes</span><span class="num"><strong>${money(Math.round(totalMes))}</strong></span></div>
        ${libera.length ? `<div class="h-top" style="margin-top:10px">${libera.map((l) => `<div><span>${esc(l)}</span></div>`).join('')}</div>` : ''}</div>
        <div class="list" style="margin-top:12px">${cs.map((x) => `<button class="item" data-cuota="${esc(x.c.id)}"><span class="grow">${esc(x.c.desc)}<span class="sub">${x.quedan ? `Quedan ${x.quedan} · termina en ${esc(monthName(x.fin))}` : 'Terminada'}</span></span><span class="val num">${money(+x.c.monto || 0)}</span>${chev}</button>`).join('')}</div>`;
    } else {
      html += `<div class="card cta-card"><p>Anotá tus compras en cuotas (monto por mes y cuántas faltan) y la app te muestra cuándo terminan y cuánta plata se libera.</p></div>`;
    }
    html += `<button class="btn tinted" id="cuota-new" style="margin-top:12px">Agregar cuota</button>`;

    // Cuentas
    const rows = st.methods.map((name) => {
      const all = db.movs.filter((m) => m.method === name && m.currency === 'ARS');
      const net = all.reduce((s, m) => s + (m.type === 'ingreso' ? m.amount : -m.amount), 0);
      return { name, bal: (+st.initialBalances[name] || 0) + net };
    });
    html += `<h2 class="section-title">Mis cuentas</h2><div class="list">${rows.map((r) => `<button class="item" data-acc="${esc(r.name)}"><span class="grow">${esc(r.name)}</span><span class="val num" style="color:${r.bal < 0 ? 'var(--expense)' : 'var(--label)'}">${money(Math.round(r.bal))}</span>${chev}</button>`).join('')}</div>
      <p class="footnote">Saldo por medio de pago: saldo inicial + ingresos − gastos e inversiones hechos con ese medio.</p>`;

    el.innerHTML = html;
    paneify(el);
    $$('[data-jar]', el).forEach((b) => (b.onclick = () => editJars()));
    $('#jar-move').onclick = () => moveJars(null);
    const mg = $('#jar-move-gastos'); if (mg) mg.onclick = () => moveJars('gastos');
    $('#meta-new').onclick = () => editMeta(null);
    $$('[data-meta]', el).forEach((b) => (b.onclick = () => editMeta((st.metas || []).find((x) => x.id === b.dataset.meta))));
    $$('[data-colchon]', el).forEach((b) => (b.onclick = editColchon));
    $('#hold-new').onclick = () => editHolding(null);
    const pn = $('#prices-now'); if (pn) pn.onclick = () => refreshPrices(true);
    $$('[data-hold]', el).forEach((b) => (b.onclick = () => editHolding((st.holdings || []).find((x) => x.id === b.dataset.hold))));
    $('#cuota-new').onclick = () => editCuota(null);
    $$('[data-cuota]', el).forEach((b) => (b.onclick = () => editCuota((st.cuotas || []).find((x) => x.id === b.dataset.cuota))));
    $$('[data-acc]', el).forEach((b) => (b.onclick = () => editInitial(b.dataset.acc)));
    if ((st.holdings || []).length) refreshPrices(false);
  }

  // ---------- Editores ----------
  function delButton(id, label) { return `<button class="btn danger" id="${id}">${label}</button>`; }
  function armDelete(btn, fn) {
    btn.onclick = () => {
      if (!btn.classList.contains('armed')) { btn.classList.add('armed'); btn.textContent = 'Tocá de nuevo para eliminar'; return; }
      fn();
    };
  }

  function editJars() {
    const st = S();
    const jars = clone(jarsOf());
    openSheet({
      title: 'Mis frascos', right: 'Guardar',
      render(body) {
        body.innerHTML = `<p class="footnote" style="font-size:15px;color:var(--label);margin:0">De lo que cobrás en el mes, primero se separa lo que va a los frascos "lo que gaste en el mes" (por ejemplo Dar recibe exactamente lo que donaste) y los montos fijos. Lo que queda es el 100%, y sobre eso se aplican los porcentajes: tienen que sumar 100%.</p>
          ${jars.map((j, i) => `<div class="field-group jar-ed" style="--j:${esc(j.color)}">
            <button type="button" class="jar-ed-head" aria-expanded="false" aria-controls="j-b${i}"><span class="jar-dot"></span><span class="grow"><span id="j-h${i}">${esc(j.name)}</span><small class="jar-ed-ini num" id="j-ini${i}">${+(st.jarInit || {})[j.id] ? 'Saldo inicial ' + money(+st.jarInit[j.id]) : ''}</small></span>
              <span class="jar-ed-sum num" id="j-s${i}">${j.actual ? 'lo que des' : j.fixed > 0 ? money(+j.fixed) : String(+j.pct || 0) + '%'}</span>
              <svg class="jar-ed-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg></button>
            <div class="jar-ed-body" id="j-b${i}" hidden>
            <div class="field"><label for="j-n${i}">Nombre</label><input id="j-n${i}" value="${esc(j.name)}"></div>
            <div class="field"><label for="j-t${i}">Tipo</label><select id="j-t${i}"><option value="pct" ${j.fixed > 0 || j.actual ? '' : 'selected'}>Porcentaje</option><option value="fixed" ${j.fixed > 0 && !j.actual ? 'selected' : ''}>Monto fijo por mes</option><option value="actual" ${j.actual ? 'selected' : ''}>Lo que gaste en el mes</option></select></div>
            <div class="field"><label for="j-v${i}">Valor</label><input id="j-v${i}" inputmode="decimal" value="${esc(j.actual ? '' : j.fixed > 0 ? amountInputValue(+j.fixed) : String(+j.pct || 0))}"></div>
            <div class="field"><label for="j-i${i}">Saldo inicial</label><input id="j-i${i}" inputmode="decimal" placeholder="0" value="${esc(amountInputValue(+(st.jarInit || {})[j.id] || ''))}"></div>
            </div>
          </div>`).join('')}
          <div class="field-group"><div class="field"><label for="j-start">Contar desde</label><input id="j-start" type="date" value="${esc(st.jarStart || '')}"></div></div>
          <p class="footnote" style="margin-top:-8px">Los cobros anteriores a esa fecha no se reparten. Usá "saldo inicial" para lo que ya tenés, por ejemplo tus ahorros en Ahorro a largo plazo.</p>
          <div class="said"><span>Suma de porcentajes</span><strong class="num" id="j-sum" style="color:var(--label)"></strong></div>`;
        // desplegar / plegar cada frasco
        $$('.jar-ed-head', body).forEach((h) => (h.onclick = () => {
          const b = $('#' + h.getAttribute('aria-controls'));
          const open = b.hidden;
          b.hidden = !open; h.setAttribute('aria-expanded', String(open));
        }));
        const upd = () => {
          jars.forEach((_, i) => {
            const tt = $('#j-t' + i).value, fixed = tt === 'fixed', v = $('#j-v' + i).value || '0', ini = parseAmount($('#j-i' + i).value);
            $('#j-v' + i).closest('.field').hidden = tt === 'actual';
            $('#j-h' + i).textContent = $('#j-n' + i).value || jars[i].name;
            $('#j-s' + i).textContent = tt === 'actual' ? 'lo que des' : fixed ? money(parseAmount(v) || 0) : String(parseFloat(v.replace(',', '.')) || 0) + '%';
            $('#j-ini' + i).textContent = ini ? 'Saldo inicial ' + money(ini) : '';
          });
          let t = 0; jars.forEach((_, i) => { if ($('#j-t' + i).value === 'pct') t += parseFloat(($('#j-v' + i).value || '0').replace(',', '.')) || 0; });
          const ok = Math.abs(t - 100) <= 0.05;
          $('#j-sum').textContent = String(Math.round(t * 10) / 10) + '%' + (ok ? ' ✓' : t < 100 ? ` · falta ${String(Math.round((100 - t) * 10) / 10)}%` : ` · sobra ${String(Math.round((t - 100) * 10) / 10)}%`);
          $('#j-sum').style.color = ok ? 'var(--income)' : 'var(--warn)';
        };
        jars.forEach((_, i) => { $('#j-v' + i).oninput = upd; $('#j-t' + i).onchange = upd; $('#j-n' + i).oninput = upd; $('#j-i' + i).oninput = upd; });
        upd();
      },
      onRight() {
        let tot = 0; jars.forEach((_, i) => { if ($('#j-t' + i).value === 'pct') tot += parseFloat(($('#j-v' + i).value || '0').replace(',', '.')) || 0; });
        if (Math.abs(tot - 100) > 0.05) { toast(`Los porcentajes tienen que sumar 100% (van ${String(Math.round(tot * 10) / 10)}%)`); return; }
        const init = {};
        jars.forEach((j, i) => {
          j.name = $('#j-n' + i).value.trim() || j.name;
          const v = $('#j-v' + i).value;
          const tt = $('#j-t' + i).value;
          if (tt === 'actual') { j.actual = true; delete j.fixed; delete j.pct; }
          else if (tt === 'fixed') { j.fixed = parseAmount(v) || 0; delete j.pct; delete j.actual; }
          else { j.pct = parseFloat((v || '0').replace(',', '.')) || 0; delete j.fixed; delete j.actual; }
          const iv = parseAmount($('#j-i' + i).value); if (iv) init[j.id] = iv;
        });
        st.jars = jars; st.jarInit = init; st.jarStart = $('#j-start').value || st.jarStart;
        save(); closeSheet(); renderAll(); toast('Frascos guardados');
      }
    });
  }

  function moveJars(from) {
    const st = S(); st.jarMoves = st.jarMoves || [];
    const js = jarsState(monthOf(todayIso()));
    const opts = (sel) => jarsOf().map((j) => `<option value="${esc(j.id)}" ${j.id === sel ? 'selected' : ''}>${esc(j.name)} (${money(Math.round((js[j.id] || {}).bal || 0))})</option>`).join('');
    const def = from || 'gastos';
    const to = def === 'libertad' ? 'largo' : 'libertad';
    const recent = st.jarMoves.slice().sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt).slice(0, 12);
    openSheet({
      title: 'Mover entre frascos', right: 'Mover',
      render(body) {
        body.innerHTML = `<p class="footnote" style="font-size:15px;color:var(--label);margin:0">Pasá plata de un frasco a otro, por ejemplo lo que te sobró de Gastos del mes a Libertad financiera. No cambia tus cuentas: sólo cómo está repartida.</p>
          <div class="field-group">
            <div class="field"><label for="mv-from">De</label><select id="mv-from">${opts(def)}</select></div>
            <div class="field"><label for="mv-to">A</label><select id="mv-to">${opts(to)}</select></div>
            <div class="field"><label for="mv-amt">Monto</label><input id="mv-amt" inputmode="decimal" placeholder="0" autocomplete="off"></div>
            <div class="field"><label for="mv-note">Nota</label><input id="mv-note" placeholder="Opcional" autocomplete="off"></div>
          </div>
          <button class="link-btn" id="mv-all" style="justify-self:start;padding:0">Mover todo el saldo del frasco de origen</button>
          ${recent.length ? `<p class="label-sm">Últimos movimientos</p><div class="list">${recent.map((x) => `<div class="item"><span class="grow">${esc(jarById(x.from).name)} → ${esc(jarById(x.to).name)}<span class="sub">${esc(dayLabel(x.date))}${x.note ? ' · ' + esc(x.note) : ''}</span></span><span class="val num">${money(Math.round(x.amount))}</span>
            <button class="icon-btn mv-del" data-id="${esc(x.id)}" aria-label="Deshacer" style="width:28px;height:28px;color:var(--expense)">${ICON.close}</button></div>`).join('')}</div>` : ''}`;
        $('#mv-all').onclick = () => { const b = (js[$('#mv-from').value] || {}).bal || 0; $('#mv-amt').value = amountInputValue(Math.max(0, Math.round(b))); };
        $$('.mv-del', body).forEach((b) => (b.onclick = () => {
          if (!b.classList.contains('armed')) { b.classList.add('armed'); b.style.background = 'var(--expense-fill)'; b.style.color = '#fff'; return; }
          st.jarMoves = st.jarMoves.filter((x) => x.id !== b.dataset.id); save(); renderAll(); moveJars(from); toast('Movimiento deshecho');
        }));
      },
      onRight() {
        const a = $('#mv-from').value, b = $('#mv-to').value, amount = parseAmount($('#mv-amt').value);
        if (a === b) { toast('Elegí dos frascos distintos'); return; }
        if (!(amount > 0)) { toast('Poné cuánto querés mover'); $('#mv-amt').focus(); return; }
        st.jarMoves.push({ id: uid(), date: todayIso(), from: a, to: b, amount, note: $('#mv-note').value.trim(), createdAt: Date.now() });
        save(); closeSheet(); renderAll();
        toast(`Moviste ${money(Math.round(amount))} a ${jarById(b).name}`);
      }
    });
  }

  function editCatJars() {
    const st = S();
    openSheet({
      title: 'Qué va a cada frasco', right: 'Guardar',
      render(body) {
        body.innerHTML = `<p class="footnote" style="font-size:15px;color:var(--label);margin:0">Cada categoría de gasto descuenta de un frasco. En cada movimiento lo podés cambiar.</p>
          <div class="field-group">${st.categories.gasto.map((c, i) => `<div class="field"><label for="cj${i}">${esc(c.name)}</label><select id="cj${i}">${jarsOf().map((j) => `<option value="${esc(j.id)}" ${((st.catJar || {})[c.name] || 'gastos') === j.id ? 'selected' : ''}>${esc(j.name)}</option>`).join('')}</select></div>`).join('')}</div>
          <p class="footnote" style="margin-top:-8px">Las inversiones salen siempre de Libertad financiera.</p>`;
      },
      onRight() {
        const map = {};
        st.categories.gasto.forEach((c, i) => { const v = $('#cj' + i).value; if (v !== 'gastos') map[c.name] = v; });
        st.catJar = map; save(); closeSheet(); renderAll(); toast('Guardado');
      }
    });
  }

  function editColchon() {
    const st = S();
    const g = avgMonthlyGastos();
    openSheet({
      title: 'Colchón de emergencia', right: 'Guardar',
      render(body) {
        body.innerHTML = `<p class="footnote" style="font-size:15px;color:var(--label);margin:0">Plata siempre disponible para imprevistos, que no se invierte en nada que pueda bajar. Se mide en meses de tus gastos.</p>
          <div class="field-group">
            <div class="field"><label for="co-m">Meses</label><input id="co-m" inputmode="numeric" value="${+st.colchonMeses || 6}"></div>
            <div class="field"><label for="co-e">Gasto mensual estimado</label><input id="co-e" inputmode="decimal" placeholder="0" value="${esc(amountInputValue(+st.gastoEstimado || ''))}"></div>
            <div class="field"><label for="co-x">Monto a mano</label><input id="co-x" inputmode="decimal" placeholder="automático" value="${esc(amountInputValue(+st.colchonManual || ''))}"></div>
          </div>
          <p class="footnote" style="margin-top:-8px">${g.real ? `Automático: tu promedio real de gastos (${money(Math.round(g.value))} por mes, últimos meses completos) × meses.` : 'Automático: mientras no tengas un mes completo de gastos cargado, usa el gasto mensual estimado × meses. Después pasa sola a tu promedio real.'} Dejá "monto a mano" vacío para usar el automático.</p>`;
      },
      onRight() {
        st.colchonMeses = Math.max(1, parseInt($('#co-m').value, 10) || 6);
        st.colchonManual = parseAmount($('#co-x').value) || 0;
        st.gastoEstimado = parseAmount($('#co-e').value) || 0;
        st.gastoEstimadoEditado = true;
        st.colchonEditado = true;
        save(); closeSheet(); renderAll(); toast('Colchón actualizado');
      }
    });
  }

  function editMeta(meta) {
    const st = S(); st.metas = st.metas || [];
    const m = meta ? clone(meta) : { nombre: '', monto: 0, plazo: '' };
    openSheet({
      title: meta ? 'Meta' : 'Nueva meta', right: 'Guardar',
      render(body) {
        body.innerHTML = `<div class="field-group">
            <div class="field"><label for="mt-n">Meta</label><input id="mt-n" value="${esc(m.nombre)}" placeholder="Ej: Mudarme" autocomplete="off"></div>
            <div class="field"><label for="mt-m">Monto</label><input id="mt-m" inputmode="decimal" placeholder="0" value="${esc(amountInputValue(+m.monto || ''))}"></div>
            <div class="field"><label for="mt-p">Para cuándo</label><input id="mt-p" type="date" value="${esc(m.plazo || '')}"></div>
          </div>
          <p class="footnote" style="margin-top:-8px">Las metas se llenan en el orden de la lista, después del colchón.</p>
          ${meta ? `<div class="btn-row"><button class="btn tinted" id="mt-up">Subir prioridad</button><button class="btn tinted" id="mt-down">Bajar prioridad</button></div>${delButton('mt-del', 'Eliminar meta')}` : ''}`;
        if (meta) {
          const i = st.metas.findIndex((x) => x.id === meta.id);
          const move = (d) => { const j = i + d; if (j < 0 || j >= st.metas.length) return; const [x] = st.metas.splice(i, 1); st.metas.splice(j, 0, x); save(); closeSheet(); renderAll(); };
          $('#mt-up').onclick = () => move(-1); $('#mt-down').onclick = () => move(1);
          armDelete($('#mt-del'), () => { st.metas = st.metas.filter((x) => x.id !== meta.id); save(); closeSheet(); renderAll(); toast('Meta eliminada'); });
        }
      },
      onRight() {
        const nombre = $('#mt-n').value.trim(), monto = parseAmount($('#mt-m').value);
        if (!nombre) { toast('Poné un nombre para la meta'); return; }
        Object.assign(m, { nombre, monto: monto || 0, plazo: $('#mt-p').value || '' });
        if (meta) Object.assign(st.metas.find((x) => x.id === meta.id), m); else st.metas.push(Object.assign(m, { id: uid() }));
        save(); closeSheet(); renderAll(); toast('Meta guardada');
      }
    });
  }

  function editHolding(h) {
    const st = S(); st.holdings = st.holdings || [];
    const x = h ? clone(h) : { nombre: '', tipo: 'cripto', simbolo: '', clase: '', cantidad: 0, aporteInicial: 0, valorManual: 0 };
    openSheet({
      title: h ? x.nombre : 'Nuevo activo', right: 'Guardar',
      render(body) {
        const draw = () => {
          const manual = x.tipo === 'manual';
          body.innerHTML = `<div class="field-group">
              <div class="field"><label for="h-t">Tipo</label><select id="h-t">${Object.entries(HOLD_TYPES).map(([k, v]) => `<option value="${k}" ${x.tipo === k ? 'selected' : ''}>${esc(v.label)}</option>`).join('')}</select></div>
              <div class="field"><label for="h-n">Nombre</label><input id="h-n" value="${esc(x.nombre)}" placeholder="${manual ? 'Ej: Plazo fijo Galicia' : 'Ej: Bitcoin'}" autocomplete="off"></div>
              ${manual ? '' : `<div class="field"><label for="h-s">Símbolo</label><input id="h-s" value="${esc(x.simbolo)}" placeholder="${esc(HOLD_TYPES[x.tipo].hint)}" autocapitalize="characters" autocomplete="off"></div>
              <div class="field"><label for="h-q">Cantidad que tenés</label><input id="h-q" inputmode="decimal" placeholder="0" value="${x.cantidad ? String(x.cantidad) : ''}"></div>`}
              ${manual ? `<div class="field"><label for="h-v">Valor actual</label><input id="h-v" inputmode="decimal" placeholder="0" value="${esc(amountInputValue(+x.valorManual || ''))}"></div>` : ''}
              <div class="field"><label for="h-a">Lo que pusiste</label><input id="h-a" inputmode="decimal" placeholder="0" value="${esc(amountInputValue(+x.aporteInicial || ''))}"></div>
              <div class="field"><label for="h-c">Clase</label><select id="h-c"><option value="variable" ${(x.clase || HOLD_TYPES[x.tipo].clase) === 'variable' ? 'selected' : ''}>Renta variable</option><option value="fija" ${(x.clase || HOLD_TYPES[x.tipo].clase) === 'fija' ? 'selected' : ''}>Renta fija</option></select></div>
            </div>
            <p class="footnote" style="margin-top:-8px">${manual ? 'Para renta fija el valor lo actualizás vos cada tanto (por ejemplo, capital + intereses).' : 'El precio se actualiza solo. Cuando compres más, dictalo ("compré 0,01 BTC por 800 mil") o cargá una inversión con la cantidad.'} "Lo que pusiste" es lo que ya habías invertido antes de usar la app, para calcular el resultado.</p>
            ${h ? delButton('h-del', 'Eliminar activo') : ''}`;
          $('#h-t').onchange = () => { read(); x.tipo = $('#h-t').value; x.clase = ''; draw(); };
          if (h) armDelete($('#h-del'), () => { st.holdings = st.holdings.filter((y) => y.id !== h.id); save(); closeSheet(); renderAll(); toast('Activo eliminado'); });
        };
        const read = () => {
          x.nombre = $('#h-n').value.trim();
          if ($('#h-s')) x.simbolo = $('#h-s').value.trim().toUpperCase();
          if ($('#h-q')) x.cantidad = parseQty($('#h-q').value) || 0;
          if ($('#h-v')) x.valorManual = parseAmount($('#h-v').value) || 0;
          x.aporteInicial = parseAmount($('#h-a').value) || 0;
          x.clase = $('#h-c').value;
        };
        x._read = read;
        draw();
      },
      onRight() {
        x._read(); delete x._read;
        if (!x.nombre) x.nombre = x.simbolo || 'Activo';
        if (x.tipo !== 'manual' && !x.simbolo) { toast('Poné el símbolo, por ejemplo BTC o SPY'); return; }
        if (h) Object.assign(st.holdings.find((y) => y.id === h.id), x); else st.holdings.push(Object.assign(x, { id: uid() }));
        prices.at = null; save(); closeSheet(); renderAll(); toast('Activo guardado');
      }
    });
  }

  function editCuota(c) {
    const st = S(); st.cuotas = st.cuotas || [];
    const x = c ? clone(c) : { desc: '', monto: 0, restantes: 0, base: monthOf(todayIso()) };
    const state = c ? cuotaState(c) : null;
    openSheet({
      title: c ? 'Cuota' : 'Nueva cuota', right: 'Guardar',
      render(body) {
        body.innerHTML = `<div class="field-group">
            <div class="field"><label for="cu-d">Qué es</label><input id="cu-d" value="${esc(x.desc)}" placeholder="Ej: Lavarropas (con mi novia)" autocomplete="off"></div>
            <div class="field"><label for="cu-m">Cuota por mes</label><input id="cu-m" inputmode="decimal" placeholder="0" value="${esc(amountInputValue(+x.monto || ''))}"></div>
            <div class="field"><label for="cu-r">Cuotas que faltan</label><input id="cu-r" inputmode="numeric" placeholder="0" value="${state ? state.quedan : (x.restantes || '')}"></div>
          </div>
          <p class="footnote" style="margin-top:-8px">Contando la de este mes. La app las va descontando sola cada mes.</p>
          ${c ? delButton('cu-del', 'Eliminar cuota') : ''}`;
        if (c) armDelete($('#cu-del'), () => { st.cuotas = st.cuotas.filter((y) => y.id !== c.id); save(); closeSheet(); renderAll(); toast('Cuota eliminada'); });
      },
      onRight() {
        const desc = $('#cu-d').value.trim(), monto = parseAmount($('#cu-m').value), r = parseInt($('#cu-r').value, 10);
        if (!desc || !(monto > 0) || !(r > 0)) { toast('Completá qué es, el monto y cuántas faltan'); return; }
        Object.assign(x, { desc, monto, restantes: r, base: monthOf(todayIso()) });
        if (c) Object.assign(st.cuotas.find((y) => y.id === c.id), x); else st.cuotas.push(Object.assign(x, { id: uid() }));
        save(); closeSheet(); renderAll(); toast('Cuota guardada');
      }
    });
  }

  function openFrascosGuide() {
    openSheet({
      title: 'Los 6 frascos', left: 'Listo', right: '',
      render(body) {
        body.innerHTML = `<div class="guide">
          <p class="guide-lead">Cada vez que cobrás, repartís todo en frascos con un propósito, y gastás de cada uno sólo para lo que es.</p>
          ${jarsOf().map((j) => `<div class="guide-block" style="--g:${esc(j.color)}"><div class="guide-head"><span class="guide-pct num">${j.actual ? '=' : j.fixed > 0 ? '$' : String(+j.pct || 0) + '%'}</span><span><strong>${esc(j.name)}</strong><span class="guide-amt">${j.actual ? 'lo que des en el mes' : j.fixed > 0 ? money(+j.fixed) + ' fijos por mes' : 'de lo que queda'}</span></span></div><p>${esc(j.hint || '')}</p></div>`).join('')}
          <div class="card guide-def">
            <p><b>Libertad financiera no se toca:</b> sólo se invierte, y lo que rinde se reinvierte.</p>
            <p><b>Diversión se gasta todos los meses:</b> es lo que hace sostenible el método.</p>
            <p><b>Ahorro a largo plazo:</b> primero completa el colchón (fase 1); después tus metas (fase 2).</p>
            <p><b>Si un frasco se vacía,</b> se espera al próximo cobro; las emergencias salen de ahorro a largo plazo.</p>
          </div>
          <p class="footnote" style="margin:0">Basado en el método de T. Harv Eker, adaptado a tu perfil. Es una forma de organizarte, no una recomendación de inversión.</p>
        </div>`;
      }
    });
  }

  function editInitial(name) {
    const isUsd = name === '__USD';
    openSheet({
      title: isUsd ? 'Dólares' : name, right: 'Guardar',
      render(body) {
        body.innerHTML = `<p class="footnote">¿Cuánto tenías en ${isUsd ? 'dólares' : esc(name)} antes de empezar a registrar? Los movimientos se suman a este número.</p>
          <div class="field-group"><div class="field"><label for="init-amt">Saldo inicial</label><input id="init-amt" inputmode="decimal" placeholder="0" value="${esc(amountInputValue(+S().initialBalances[name] || 0))}"></div></div>
          <label class="field-group field" style="justify-content:space-between"><span>Es negativo (deuda)</span><span class="switch"><input type="checkbox" id="init-neg" ${(+S().initialBalances[name] || 0) < 0 ? 'checked' : ''}><span></span></span></label>`;
      },
      onRight() {
        let v = parseAmount($('#init-amt').value) || 0;
        v = Math.abs(v) * ($('#init-neg').checked ? -1 : 1);
        S().initialBalances[name] = v; save(); closeSheet(); renderAll(); toast('Saldo inicial actualizado');
      }
    });
  }

  // ---------- Render: ajustes ----------
  function renderSettings() {
    const st = S();
    const el = $('#settings');
    const last = st.lastBackup ? new Date(st.lastBackup).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' }) : 'nunca';
    const sr = !!(window.SpeechRecognition || window.webkitSpeechRecognition);
    el.innerHTML = `
      <h2 class="section-title">Voz</h2>
      <div class="list">
        <label class="item"><span class="grow">Acento del reconocimiento</span>
          <select id="set-lang">${[['es-AR', 'Argentina'], ['es-UY', 'Uruguay'], ['es-CL', 'Chile'], ['es-MX', 'México'], ['es-ES', 'España'], ['es-US', 'EE. UU.'], ['es-CO', 'Colombia']].map(([v, n]) => `<option value="${v}" ${st.lang === v ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
        <label class="item"><span class="grow">Guardar sin revisar<span class="sub">Si la app entendió todo bien, guarda directo</span></span><span class="switch"><input type="checkbox" id="set-auto" ${st.autoSave ? 'checked' : ''}><span></span></span></label>
        <button class="item link" id="set-try">Probar escribiendo una frase</button>
      </div>
      <p class="footnote">${sr ? 'El reconocimiento de voz lo hace tu navegador y necesita conexión a internet.' : 'Este navegador no reconoce voz directamente. Usá el micrófono del teclado para dictar: la app interpreta el texto igual. En iPhone funciona en Safari y en Android en Chrome.'}</p>

      <h2 class="section-title">Preferencias</h2>
      <div class="list">
        <label class="item"><span class="grow">Medio por defecto<span class="sub">Si no decís con qué pagaste</span></span>
          <select id="set-method">${st.methods.map((m) => `<option ${st.defaultMethod === m ? 'selected' : ''}>${esc(m)}</option>`).join('')}</select></label>
        <label class="item"><span class="grow">Apariencia</span>
          <select id="set-theme"><option value="auto" ${st.theme === 'auto' ? 'selected' : ''}>Automática</option><option value="light" ${st.theme === 'light' ? 'selected' : ''}>Clara</option><option value="dark" ${st.theme === 'dark' ? 'selected' : ''}>Oscura</option></select></label>
        <div class="item stack"><span>Vidrio<span class="sub">Más transparente o más fácil de leer</span></span>
          <label class="range-row"><span>Transparente</span><input type="range" id="set-glass" min="0" max="1" step="0.05" value="${+st.glass}" aria-label="Transparencia del vidrio"><span>Opaco</span></label></div>
        <label class="item"><span class="grow">Letra grande<span class="sub">Agranda textos y botones</span></span><span class="switch"><input type="checkbox" id="set-big" ${st.bigText ? 'checked' : ''}><span></span></span></label>
      </div>

      <h2 class="section-title">Método: 6 frascos</h2>
      <div class="list">
        <button class="item" id="set-guide"><span class="grow">Cómo funcionan los frascos<span class="sub">Qué va a cada uno y las reglas del método</span></span><svg class="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="m9 5 7 7-7 7"/></svg></button>
        <button class="item" id="set-jars"><span class="grow">Frascos y porcentajes<span class="sub">${esc(jarsOf().map((j) => j.actual ? 'Dar: lo que des' : j.fixed > 0 ? money(+j.fixed) : String(+j.pct || 0) + '%').join(' · '))}</span></span><svg class="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="m9 5 7 7-7 7"/></svg></button>
        <button class="item" id="set-catjar"><span class="grow">Qué va a cada frasco<span class="sub">Categoría de gasto → frasco</span></span><svg class="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="m9 5 7 7-7 7"/></svg></button>
        <button class="item" id="set-colchon"><span class="grow">Colchón de emergencia<span class="sub">${+st.colchonMeses || 6} meses de gastos</span></span><svg class="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="m9 5 7 7-7 7"/></svg></button>
      </div>

      <h2 class="section-title">Categorías y medios</h2>
      <div class="list">
        <button class="item" id="set-cat-g"><span class="grow">Categorías de gastos</span><span class="val">${st.categories.gasto.length}</span><svg class="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="m9 5 7 7-7 7"/></svg></button>
        <button class="item" id="set-cat-v"><span class="grow">Tipos de inversión</span><span class="val">${st.categories.inversion.length}</span><svg class="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="m9 5 7 7-7 7"/></svg></button>
        <button class="item" id="set-cat-i"><span class="grow">Categorías de ingresos</span><span class="val">${st.categories.ingreso.length}</span><svg class="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="m9 5 7 7-7 7"/></svg></button>
        <button class="item" id="set-methods"><span class="grow">Medios de pago</span><span class="val">${st.methods.length}</span><svg class="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="m9 5 7 7-7 7"/></svg></button>
      </div>
      <p class="footnote">Cada categoría tiene palabras clave. Si decís una de esas palabras, el movimiento cae en esa categoría.</p>

      ${driveSettingsHtml()}

      <h2 class="section-title">Tus datos</h2>
      <div class="list">
        <button class="item link" id="set-export-json">Guardar copia en el teléfono</button>
        <button class="item link" id="set-export-csv">Exportar a planilla (CSV)</button>
        <button class="item link" id="set-import">Importar copia o CSV</button>
        <button class="item danger" id="set-wipe">Borrar todos los datos</button>
      </div>
      <p class="footnote">${db.movs.length} movimientos guardados sólo en este dispositivo y navegador. Última copia: ${esc(last)}. Si borrás los datos del navegador o cambiás de teléfono, los recuperás importando una copia.</p>
      <h2 class="section-title">Versión</h2>
      <div class="list"><div class="item"><span class="grow">Mis Finanzas FM<span class="sub" id="set-ver">Versión ${APP_VERSION}</span></span>
        <button class="btn tinted small" id="set-update">Buscar actualización</button></div></div>
      <p class="footnote" style="text-align:center;margin-top:24px">© 2026 Felipe Manrique. Todos los derechos reservados.<br><a href="privacidad.html" target="_blank" rel="noopener" style="color:var(--accent)">Privacidad y condiciones</a></p>`;
    paneify(el);

    $('#set-lang').onchange = (e) => { st.lang = e.target.value; save(); };
    $('#set-auto').onchange = (e) => { st.autoSave = e.target.checked; save(); };
    $('#set-method').onchange = (e) => { st.defaultMethod = e.target.value; save(); };
    $('#set-theme').onchange = (e) => { st.theme = e.target.value; save(); applyTheme(); };
    $('#set-glass').oninput = (e) => { st.glass = +e.target.value; applyTheme(); };
    $('#set-glass').onchange = () => save();
    $('#set-big').onchange = (e) => { st.bigText = e.target.checked; save(); applyTheme(); };
    $('#set-try').onclick = () => openVoice({ textMode: true });
    $('#set-cat-g').onclick = () => manageCategories('gasto');
    $('#set-cat-i').onclick = () => manageCategories('ingreso');
    $('#set-cat-v').onclick = () => manageCategories('inversion');
    $('#set-methods').onclick = manageMethods;
    $('#set-export-json').onclick = exportJSON;
    $('#set-export-csv').onclick = exportCSV;
    $('#set-import').onclick = () => $('#import-file').click();
    bindDriveSettings();
    $('#set-wipe').onclick = wipeAll;
    $('#set-guide').onclick = openFrascosGuide;
    $('#set-jars').onclick = editJars;
    $('#set-catjar').onclick = editCatJars;
    $('#set-colchon').onclick = editColchon;
    $('#set-update').onclick = (e) => checkUpdate(e.currentTarget);
  }

  function applyTheme() {
    const t = S().theme;
    if (t === 'auto') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme', t);
    const root = document.documentElement.style;
    root.setProperty('--glass-tint', String(Math.min(1, Math.max(0, S().glass ?? 0.35))));
    root.setProperty('--ui-zoom', S().bigText ? '1.15' : '1');
    const meta = document.querySelectorAll('meta[name="theme-color"]');
    meta.forEach((m) => m.setAttribute('content', /dark/.test(m.media) ? '#05070F' : '#EEF3FA'));
  }

  // ---------- Categorías ----------
  function manageCategories(type) {
    const list = S().categories[type];
    openSheet({
      title: { gasto: 'Categorías de gastos', ingreso: 'Categorías de ingresos', inversion: 'Tipos de inversión' }[type], left: 'Listo', right: 'Nueva',
      onLeft() { closeSheet(); renderAll(); },
      onRight() { editCategory(type, null); },
      render(body) {
        body.innerHTML = `<div class="list">${list.map((c, i) => `<button class="item" data-i="${i}"><span class="badge" style="--c:${esc(c.color)};width:30px;height:30px;border-radius:9px;font-size:13px">${esc(c.name.charAt(0))}</span>
          <span class="grow">${esc(c.name)}<span class="sub">${c.kw.length ? esc(c.kw.slice(0, 6).join(', ')) + (c.kw.length > 6 ? '…' : '') : 'Sin palabras clave'}</span></span>
          <svg class="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="m9 5 7 7-7 7"/></svg></button>`).join('')}</div>
          <p class="footnote">La última categoría de la lista se usa cuando la app no reconoce ninguna palabra clave.</p>`;
        $$('[data-i]', body).forEach((b) => (b.onclick = () => editCategory(type, +b.dataset.i)));
      }
    });
  }

  function editCategory(type, idx) {
    const list = S().categories[type];
    const c = idx === null ? { name: '', color: '#5856D6', kw: [] } : list[idx];
    const usedBy = idx === null ? 0 : db.movs.filter((m) => m.type === type && m.category === c.name).length;
    openSheet({
      title: idx === null ? 'Nueva categoría' : c.name, left: 'Atrás', right: 'Guardar',
      onLeft: () => manageCategories(type),
      render(body) {
        body.innerHTML = `<div class="field-group">
            <div class="field"><label for="c-name">Nombre</label><input id="c-name" value="${esc(c.name)}" placeholder="Ej: Gimnasio" autocomplete="off"></div>
            <div class="field"><label for="c-color">Color</label><input id="c-color" type="color" value="${esc(c.color)}" style="flex:none;width:44px;height:30px;padding:0;border-radius:8px"></div>
          </div>
          <p class="label-sm">Palabras clave</p>
          <div class="text-entry"><textarea id="c-kw" placeholder="Separadas por coma. Ej: gimnasio, gym, pileta">${esc(c.kw.join(', '))}</textarea></div>
          <p class="footnote" style="margin-top:-8px">Si en lo que dictás aparece alguna de estas palabras, el movimiento va a esta categoría.</p>
          ${idx !== null && list.length > 1 ? `<button class="btn danger" id="c-del">Eliminar categoría</button><p class="footnote" style="margin-top:-8px">${usedBy ? `Sus ${usedBy} movimientos pasan a “${esc(list[list.length - 1] === c ? list[list.length - 2].name : list[list.length - 1].name)}”.` : 'No tiene movimientos.'}</p>` : ''}`;
        const del = $('#c-del', body);
        if (del) del.onclick = () => {
          if (!del.classList.contains('armed')) { del.classList.add('armed'); del.textContent = 'Tocá de nuevo para eliminar'; return; }
          const fallback = list[list.length - 1] === c ? list[list.length - 2] : list[list.length - 1];
          db.movs.forEach((m) => { if (m.type === type && m.category === c.name) m.category = fallback.name; });
          list.splice(idx, 1); save(); toast('Categoría eliminada'); manageCategories(type);
        };
      },
      onRight() {
        const name = $('#c-name').value.trim();
        if (!name) { $('#c-name').focus(); toast('Poné un nombre para la categoría'); return; }
        if (list.some((x, i) => i !== idx && x.name.toLowerCase() === name.toLowerCase())) { toast('Ya existe una categoría con ese nombre'); return; }
        const kw = $('#c-kw').value.split(/[,\n;]/).map((s) => s.trim().toLowerCase()).filter(Boolean);
        const color = $('#c-color').value;
        if (idx === null) list.splice(Math.max(0, list.length - 1), 0, { name, color, kw });
        else {
          if (c.name !== name) db.movs.forEach((m) => { if (m.type === type && m.category === c.name) m.category = name; });
          Object.assign(c, { name, color, kw });
        }
        save(); toast('Categoría guardada'); manageCategories(type);
      }
    });
  }

  // ---------- Medios de pago ----------
  function manageMethods() {
    const st = S();
    openSheet({
      title: 'Medios de pago', left: 'Listo', right: '',
      onLeft() { closeSheet(); renderAll(); },
      render(body) {
        const draw = () => {
          body.innerHTML = `<div class="list">${st.methods.map((m, i) => `<div class="item"><input class="grow" style="text-align:left;color:var(--label);max-width:none" data-i="${i}" value="${esc(m)}" aria-label="Nombre del medio">
            ${st.methods.length > 1 ? `<button class="icon-btn" data-del="${i}" aria-label="Eliminar ${esc(m)}" style="width:30px;height:30px;color:var(--expense)">${ICON.close}</button>` : ''}</div>`).join('')}</div>
            <div class="field-group"><div class="field"><input id="new-method" placeholder="Agregar otro (ej: Ualá, Naranja X)" style="text-align:left" autocomplete="off"><button class="link-btn" id="add-method">Agregar</button></div></div>
            <p class="footnote">Si decís el nombre de un medio (por ejemplo “con Ualá”), la app lo elige. Al borrar uno, sus movimientos pasan al medio por defecto.</p>`;
          $$('input[data-i]', body).forEach((inp) => (inp.onchange = () => {
            const i = +inp.dataset.i, old = st.methods[i], nw = inp.value.trim();
            if (!nw || st.methods.some((x, j) => j !== i && x === nw)) { inp.value = old; return; }
            st.methods[i] = nw;
            db.movs.forEach((m) => { if (m.method === old) m.method = nw; });
            if (st.defaultMethod === old) st.defaultMethod = nw;
            if (old in st.initialBalances) { st.initialBalances[nw] = st.initialBalances[old]; delete st.initialBalances[old]; }
            save();
          }));
          $$('[data-del]', body).forEach((b) => (b.onclick = () => {
            if (!b.classList.contains('armed')) { b.classList.add('armed'); b.style.background = 'var(--expense-fill)'; b.style.color = '#fff'; return; }
            const i = +b.dataset.del, old = st.methods[i];
            st.methods.splice(i, 1);
            if (st.defaultMethod === old) st.defaultMethod = st.methods[0];
            db.movs.forEach((m) => { if (m.method === old) m.method = st.defaultMethod; });
            delete st.initialBalances[old];
            save(); draw();
          }));
          const add = () => {
            const v = $('#new-method').value.trim();
            if (!v || st.methods.includes(v)) return;
            st.methods.push(v); save(); draw();
          };
          $('#add-method').onclick = add;
          $('#new-method').onkeydown = (e) => { if (e.key === 'Enter') add(); };
        };
        draw();
      }
    });
  }

  // ---------- Editor de movimiento ----------
  const TYPE_LABEL = { gasto: 'Gasto', ingreso: 'Ingreso', inversion: 'Inversión' };
  const typeButtons = (t) => Object.keys(TYPE_LABEL).map((k) => `<button data-t="${k}" aria-pressed="${t === k}">${TYPE_LABEL[k]}</button>`).join('');
  const typeClass = (t) => (t === 'ingreso' ? 'in' : t === 'inversion' ? 'inv' : 'out');
  function typeFields(m, prefix) {
    const sel = (id, label, opts, val) => `<div class="field"><label for="${prefix}${id}">${label}</label><select id="${prefix}${id}">${opts.map(([k, v]) => `<option value="${esc(k)}" ${k === val ? 'selected' : ''}>${esc(v)}</option>`).join('')}</select></div>`;
    if (m.type === 'gasto') return sel('jar', 'Frasco', jarsOf().map((j) => [j.id, j.name]), jarOfMov(m));
    if (m.type === 'ingreso') {
      const rows = m.split && Object.keys(m.split).length ? Object.entries(m.split) : [['libertad', ''], ['largo', '']];
      const on = !!(m.split && Object.keys(m.split).length);
      return sel('split', 'Reparto', [['normal', 'Normal (mis frascos)'], ['custom', 'Personalizado']], on ? 'custom' : 'normal') +
        `<div class="split-box" id="${prefix}splitbox" data-prefix="${prefix}" ${on ? '' : 'hidden'}>
          <div class="sp-rows">${rows.map(([id, p]) => splitRow(id, p)).join('')}</div>
          <div class="sp-foot"><button type="button" class="link-btn sp-add">+ Agregar frasco</button><span class="sp-total num"></span></div>
        </div>`;
    }
    if (m.type === 'inversion') return sel('hold', 'Activo', [['', 'Sin asignar']].concat((S().holdings || []).map((h) => [h.id, h.nombre])), m.holdingId || '') +
      `<div class="field"><label for="${prefix}qty">Cantidad comprada</label><input id="${prefix}qty" inputmode="decimal" placeholder="opcional" value="${m.cantidad ? String(m.cantidad) : ''}"></div>`;
    return '';
  }
  function splitRow(id, p) {
    return `<div class="field sp-row"><select class="sp-jar" aria-label="Frasco">${jarsOf().map((j) => `<option value="${esc(j.id)}" ${j.id === id ? 'selected' : ''}>${esc(j.name)}</option>`).join('')}</select>
      <input class="sp-pct" inputmode="decimal" placeholder="%" aria-label="Porcentaje" value="${p !== '' && p != null ? String(p) : ''}"><span class="sp-pc">%</span>
      <button type="button" class="icon-btn sp-rm" aria-label="Quitar" style="width:28px;height:28px;color:var(--label-2)">${ICON.close}</button></div>`;
  }
  function splitTotal(box) {
    let t = 0;
    $$('.sp-pct', box).forEach((i) => (t += parseFloat((i.value || '0').replace(',', '.')) || 0));
    return Math.round(t * 100) / 100;
  }
  function paintSplit(box) {
    const t = splitTotal(box), el = $('.sp-total', box);
    if (!el) return;
    el.textContent = t === 100 ? 'Total 100% ✓' : t < 100 ? `Total ${String(t)}% · falta ${String(Math.round((100 - t) * 100) / 100)}%` : `Total ${String(t)}% · sobra ${String(Math.round((t - 100) * 100) / 100)}%`;
    el.style.color = t === 100 ? 'var(--income)' : 'var(--warn)';
  }
  function movFields(m, prefix) {
    const st = S();
    const cats = st.categories[m.type] || [];
    const methods = st.methods.includes(m.method) ? st.methods : st.methods.concat(m.method ? [m.method] : []);
    return `<div class="field"><label for="${prefix}desc">Detalle</label><input id="${prefix}desc" value="${esc(m.description)}" placeholder="Ej: Supermercado" autocomplete="off"></div>
      <div class="field"><label for="${prefix}cat">Categoría</label><select id="${prefix}cat">${cats.map((c) => `<option ${c.name === m.category ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}${cats.some((c) => c.name === m.category) ? '' : `<option selected>${esc(m.category)}</option>`}</select></div>
      <div class="field"><label for="${prefix}method">Medio</label><select id="${prefix}method">${methods.map((x) => `<option ${x === m.method ? 'selected' : ''}>${esc(x)}</option>`).join('')}</select></div>
      <div class="field"><label for="${prefix}date">Fecha</label><input id="${prefix}date" type="date" value="${esc(m.date)}" max="${todayIso()}"></div>
      <div class="field"><label for="${prefix}inst">Cuotas</label><input id="${prefix}inst" inputmode="numeric" placeholder="—" value="${m.installments || ''}"></div>
      ${typeFields(m, prefix)}`;
  }
  function readFields(prefix, root) {
    const v = (id) => $('#' + prefix + id, root).value;
    const opt = (id) => { const el = $('#' + prefix + id, root); return el ? el.value : undefined; };
    const inst = parseInt(v('inst'), 10);
    const out = { description: v('desc').trim(), category: v('cat'), method: v('method'), date: v('date') || todayIso(), installments: inst > 1 ? inst : null };
    if (opt('split') !== undefined) {
      out.split = null;
      const box = $('#' + prefix + 'splitbox', root);
      if (opt('split') === 'custom' && box) {
        const sp = {};
        $$('.sp-row', box).forEach((r) => { const v = parseFloat(($('.sp-pct', r).value || '').replace(',', '.')); if (v > 0) sp[$('.sp-jar', r).value] = (sp[$('.sp-jar', r).value] || 0) + v; });
        out.split = sp;
        out.splitTotal = splitTotal(box);
      }
    }
    if (opt('jar') !== undefined) { const def = (S().catJar || {})[out.category] || 'gastos'; out.jar = opt('jar') !== def ? opt('jar') : null; }
    if (opt('hold') !== undefined) { out.holdingId = opt('hold') || null; const q = (opt('qty') || '').trim(); out.cantidad = q ? parseQty(q) || null : null; }
    return out;
  }
  function refillCats(select, type, keep) {
    const cats = S().categories[type];
    const guess = cats.find((c) => c.name === keep) ? keep : cats[cats.length - 1].name;
    select.innerHTML = cats.map((c) => `<option ${c.name === guess ? 'selected' : ''}>${esc(c.name)}</option>`).join('');
  }

  function openEditor(existing) {
    const st = S();
    const m = existing ? clone(existing) : { type: 'gasto', amount: 0, currency: st.defaultCurrency, category: st.categories.gasto[st.categories.gasto.length - 1].name, method: st.defaultMethod, date: todayIso(), description: '', installments: null };
    if (!existing && ui.month !== monthOf(todayIso())) m.date = ui.month + '-01';
    openSheet({
      title: existing ? 'Movimiento' : 'Nuevo movimiento', right: 'Guardar',
      render(body) {
        body.innerHTML = `<div class="segmented" id="e-type">${typeButtons(m.type)}</div>
          <div class="amount-field ${typeClass(m.type)}" id="e-amt-wrap"><button class="cur-btn" id="e-cur" aria-label="Cambiar moneda">${m.currency === 'USD' ? 'US$' : '$'}</button>
            <input id="e-amt" inputmode="decimal" placeholder="0" value="${esc(amountInputValue(m.amount || ''))}" aria-label="Monto" autocomplete="off"></div>
          <div class="field-group" id="e-fields">${movFields(m, 'e-')}</div>
          ${existing && existing.transcript ? `<div class="said"><span>Lo que dijiste</span><q>${esc(existing.transcript)}</q></div>` : ''}
          ${existing ? '<button class="btn tinted" id="e-dup">Duplicar con fecha de hoy</button><button class="btn danger" id="e-del">Eliminar movimiento</button>' : ''}`;
        $$('#e-type button', body).forEach((b) => (b.onclick = () => {
          Object.assign(m, readFields('e-', body));
          m.type = b.dataset.t;
          if (!(st.categories[m.type] || []).some((c) => c.name === m.category)) m.category = Parser.detectCategory(Parser.norm(m.description || ''), m.type, st.categories) || Parser.OTHER[m.type];
          m.jar = null;
          $$('#e-type button', body).forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
          $('#e-amt-wrap').className = 'amount-field ' + typeClass(m.type);
          $('#e-fields').innerHTML = movFields(m, 'e-');
        }));
        $('#e-cur').onclick = () => { m.currency = m.currency === 'USD' ? 'ARS' : 'USD'; $('#e-cur').textContent = m.currency === 'USD' ? 'US$' : '$'; };
        if (!existing) setTimeout(() => $('#e-amt') && $('#e-amt').focus(), 420);
        const del = $('#e-del');
        if (del) del.onclick = () => {
          if (!del.classList.contains('armed')) { del.classList.add('armed'); del.textContent = 'Tocá de nuevo para eliminar'; return; }
          const i = db.movs.findIndex((x) => x.id === existing.id);
          const [removed] = db.movs.splice(i, 1);
          save(); closeSheet(); renderAll();
          toast('Movimiento eliminado', () => { db.movs.push(removed); save(); renderAll(); });
        };
        const dup = $('#e-dup');
        if (dup) dup.onclick = () => {
          const copy = Object.assign(clone(existing), { id: uid(), date: todayIso(), createdAt: Date.now(), source: 'manual', transcript: '' });
          db.movs.push(copy); save(); closeSheet(); ui.month = monthOf(copy.date); renderAll();
          toast('Movimiento duplicado', () => { db.movs = db.movs.filter((x) => x.id !== copy.id); save(); renderAll(); });
        };
      },
      onRight() {
        const amount = parseAmount($('#e-amt').value);
        if (!(amount > 0)) { $('#e-amt').focus(); toast('Ingresá un monto mayor a cero'); return; }
        const f = readFields('e-', $('#sheet-body'));
        if (f.split && f.splitTotal !== 100) { toast(`El reparto personalizado tiene que sumar 100% (va ${String(f.splitTotal)}%)`); return; }
        delete f.splitTotal;
        const rec = Object.assign(m, f, { amount });
        if (!rec.description) rec.description = rec.category;
        if (existing) {
          const i = db.movs.findIndex((x) => x.id === existing.id);
          db.movs[i] = Object.assign(existing, rec);
        } else {
          Object.assign(rec, { id: uid(), createdAt: Date.now(), source: 'manual' });
          db.movs.push(rec);
        }
        save(); closeSheet(); ui.month = monthOf(rec.date); renderAll();
        toast(existing ? 'Cambios guardados' : 'Movimiento guardado');
      }
    });
  }

  // ---------- Voz ----------
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  let rec = null;

  function mergeFinal(acc, t) {
    t = t.trim();
    if (!acc) return t;
    const a = Parser.norm(acc), b = Parser.norm(t);
    if (b.startsWith(a)) return t;      // Chrome Android a veces repite el texto acumulado
    if (a.endsWith(b)) return acc;
    return acc + ' ' + t;
  }

  function openVoice(opts = {}) {
    const textMode = opts.textMode || !SR;
    let state = { finalText: '', interim: '', error: null, cancelled: false, listening: false };
    let silenceTimer, capTimer;

    const stopRec = (abort) => { clearTimeout(silenceTimer); clearTimeout(capTimer); if (rec) { try { abort ? rec.abort() : rec.stop(); } catch (e) { /* ya detenido */ } } };

    openSheet({
      title: textMode ? 'Escribí el movimiento' : 'Cargar con la voz', left: 'Cancelar', right: '',
      onLeft() { state.cancelled = true; stopRec(true); closeSheet(); },
      onClose() { state.cancelled = true; stopRec(true); },
      render(body) {
        if (textMode) return renderText(body, opts.note || (!SR ? 'Este navegador no reconoce voz. Tocá el micrófono del teclado para dictar, o escribí.' : ''), opts.text || '');
        body.innerHTML = `<div class="listen">
            <button class="orb" id="orb" aria-label="Empezar o terminar de escuchar">${ICON.mic}</button>
            <div class="status" id="v-status">Preparando el micrófono…</div>
            <div class="transcript" id="v-text" aria-live="polite"></div>
            <div class="hint" id="v-hint">Decí el monto, en qué y con qué pagaste. Ej: “Gasté 12 mil en nafta con débito y 3.500 en un café”.</div>
          </div>
          <div class="btn-row"><button class="btn tinted" id="v-type">Escribir</button><button class="btn" id="v-done">Listo</button></div>`;
        $('#v-type').onclick = () => { state.cancelled = true; stopRec(true); openVoice({ textMode: true, text: (state.finalText + ' ' + state.interim).trim() }); };
        $('#v-done').onclick = () => { if (state.listening) stopRec(false); else finish(); };
        $('#orb').onclick = () => { if (state.listening) stopRec(false); else start(); };
        start();
      }
    });

    function setStatus(s) { const el = $('#v-status'); if (el) el.textContent = s; }
    function draw() {
      const el = $('#v-text'); if (!el) return;
      el.innerHTML = esc(state.finalText) + (state.interim ? ' <span class="interim">' + esc(state.interim) + '</span>' : '');
    }
    function setOrb(live) { const o = $('#orb'); if (o) { o.classList.toggle('live', live); o.classList.toggle('idle', !live); } }

    function start() {
      state.error = null;
      try {
        rec = new SR();
        rec.lang = S().lang || 'es-AR';
        rec.interimResults = true;
        rec.continuous = true;
        rec.maxAlternatives = 1;
      } catch (e) { return renderTextFallback('No pude iniciar el reconocimiento de voz en este navegador.'); }
      rec.onstart = () => { state.listening = true; setOrb(true); setStatus('Escuchando… tocá Listo cuando termines'); };
      rec.onresult = (e) => {
        let fin = '', interim = '';
        for (let i = 0; i < e.results.length; i++) {
          const r = e.results[i];
          if (r.isFinal) fin = mergeFinal(fin, r[0].transcript); else interim += r[0].transcript;
        }
        // en algunos navegadores cada sesión arranca de cero: no perder lo anterior
        state.finalText = state.base ? mergeFinal(state.base, fin) : fin;
        state.interim = interim.trim();
        draw();
        clearTimeout(silenceTimer);
        silenceTimer = setTimeout(() => stopRec(false), 2600);
      };
      rec.onerror = (e) => { state.error = e.error; };
      rec.onend = () => {
        state.listening = false; setOrb(false);
        clearTimeout(silenceTimer); clearTimeout(capTimer);
        if (state.cancelled) return;
        const text = (state.finalText + ' ' + state.interim).trim();
        if (text && !['not-allowed', 'service-not-allowed'].includes(state.error)) return finish();
        const msg = {
          'not-allowed': 'El navegador no me dejó usar el micrófono. Permitilo para este sitio (ícono del candado o “aA” en la barra de direcciones) o dictá con el teclado.',
          'service-not-allowed': 'El reconocimiento de voz no está disponible acá. Dictá con el micrófono del teclado o escribí.',
          'network': 'El reconocimiento de voz necesita internet. Sin conexión podés dictar con el micrófono del teclado.',
          'audio-capture': 'No encontré un micrófono en este dispositivo.',
          'language-not-supported': 'Este navegador no reconoce el acento elegido. Cambialo en Ajustes.'
        }[state.error];
        if (msg) return renderTextFallback(msg);
        setStatus('No te escuché. Tocá el micrófono para intentar de nuevo.');
      };
      try {
        state.base = state.finalText;
        rec.start();
        capTimer = setTimeout(() => stopRec(false), 45000);
      } catch (e) {
        setOrb(false);
        setStatus('Tocá el micrófono para empezar a hablar.');
      }
    }

    function finish() {
      const text = (state.finalText + ' ' + state.interim).trim();
      if (!text) { setStatus('No te escuché. Tocá el micrófono para intentar de nuevo.'); return; }
      state.cancelled = true;
      openReview(text, 'voz');
    }

    function renderTextFallback(note) {
      state.cancelled = true;
      openVoice({ textMode: true, note, text: (state.finalText + ' ' + state.interim).trim() });
    }

    function renderText(body, note, text) {
      body.innerHTML = `${note ? `<div class="banner" style="margin:0">${ICON.warn}<div>${esc(note)}</div></div>` : ''}
        <div class="text-entry"><textarea id="t-in" placeholder="Ej: Ayer pagué 4.500 de colectivo y 9 mil en la farmacia con débito">${esc(text)}</textarea>
        <button class="btn" id="t-go">Interpretar</button></div>
        <p class="hint" style="margin:0">Podés cargar varios movimientos juntos separándolos con “y”. La app detecta monto, tipo, categoría, medio de pago y fecha (“ayer”, “el lunes”, “el 3 de octubre”).</p>`;
      const ta = $('#t-in', body);
      setTimeout(() => ta.focus(), 420);
      const go = () => { const t = ta.value.trim(); if (!t) { ta.focus(); return; } openReview(t, 'manual'); };
      $('#t-go', body).onclick = go;
      ta.onkeydown = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); go(); } };
    }
  }

  // ---------- Revisión ----------
  function parseText(text) {
    const st = S();
    const items = Parser.parse(text, { categories: st.categories, methods: st.methods, defaultMethod: st.defaultMethod, defaultCurrency: st.defaultCurrency });
    const t = ' ' + Parser.norm(text) + ' ';
    const has = (w) => w && w.length > 1 && t.includes(' ' + Parser.norm(w) + ' ');
    items.forEach((it) => {
      if (it.type !== 'inversion') return;
      const h = (st.holdings || []).find((x) => has(x.simbolo) || Parser.norm(x.nombre || '').split(/\s+/).some((w) => w.length > 3 && has(w)) ||
        (x.tipo === 'cripto' && has(Object.keys(CRYPTO_IDS).find((k) => CRYPTO_IDS[k] === cryptoId(x)) ? cryptoId(x) : '')));
      if (h) { it.holdingId = h.id; if (h.clase === 'fija' || h.tipo === 'manual') it.category = 'Renta fija'; }
      // "compré 0,01 btc": cantidad con decimales antes del símbolo
      const q = Parser.norm(text).match(/(\d+[.,]\d+)\s*(btc|eth|usdt|bitcoin)/);
      if (q) it.cantidad = parseFloat(q[1].replace(',', '.'));
    });
    return items;
  }

  function openReview(text, source) {
    let items = parseText(text);
    const st = S();
    if (source !== 'ejemplo' && st.autoSave && items.length && items.every((i) => i.confidence >= 0.8)) {
      return commit(items, text, source);
    }
    openSheet({
      title: items.length > 1 ? `Revisar ${items.length} movimientos` : 'Revisar', right: source === 'ejemplo' ? '' : 'Guardar',
      onRight() {
        const out = readReview();
        if (!out) return;
        commit(out, text, source);
      },
      render(body) { draw(body); }
    });

    function draw(body) {
      body = body || $('#sheet-body');
      const right = $('#sheet-right');
      right.textContent = items.length > 1 ? `Guardar ${items.length}` : 'Guardar';
      right.disabled = !items.length;
      right.hidden = source === 'ejemplo';
      body.innerHTML = `<div class="said"><span>${source === 'ejemplo' ? 'Ejemplo' : 'Entendí'}</span><q id="r-said">${esc(text)}</q>
          <div id="r-edit" hidden class="text-entry"><textarea id="r-text">${esc(text)}</textarea><button class="btn tinted" id="r-reparse">Volver a interpretar</button></div>
          <div style="display:flex;gap:12px"><button class="link-btn" id="r-toggle" style="padding:0">Corregir el texto</button>${SR ? '<button class="link-btn" id="r-again" style="padding:0">Hablar de nuevo</button>' : ''}</div></div>
        ${items.length ? '' : '<div class="banner" style="margin:0">' + ICON.warn + '<div>No encontré ningún monto. Probá con algo como “gasté 5 mil en el super”.</div></div>'}
        ${items.map((it, i) => reviewCard(it, i)).join('')}
        ${source === 'ejemplo' ? '<p class="hint" style="margin:0">Así se vería tu movimiento. Tocá el micrófono para cargar uno de verdad.</p><button class="btn" id="r-try">' + 'Probar con mi voz' + '</button>' : ''}`;
      $$('.split-box', body).forEach(paintSplit);
      $('#r-toggle').onclick = () => { $('#r-edit').hidden = !$('#r-edit').hidden; $('#r-said').hidden = !$('#r-edit').hidden; if (!$('#r-edit').hidden) $('#r-text').focus(); };
      $('#r-reparse').onclick = () => { text = $('#r-text').value.trim(); items = parseText(text); $('#sheet-title').textContent = items.length > 1 ? `Revisar ${items.length} movimientos` : 'Revisar'; draw(); };
      const again = $('#r-again'); if (again) again.onclick = () => openVoice();
      const tryBtn = $('#r-try'); if (tryBtn) tryBtn.onclick = () => openVoice();
      $$('.review-card', body).forEach((card) => {
        const i = +card.dataset.i;
        $$('.segmented button', card).forEach((b) => (b.onclick = () => {
          syncAll();
          const it = items[i];
          if (it.type === b.dataset.t) return;
          it.type = b.dataset.t;
          const cats = st.categories[it.type];
          it.category = Parser.detectCategory(Parser.norm(it.description || ''), it.type, st.categories) ||
            Parser.detectCategory(Parser.norm(text), it.type, st.categories) || cats[cats.length - 1].name;
          draw();
        }));
        $('.rm', card).onclick = () => { syncAll(); items.splice(i, 1); $('#sheet-title').textContent = items.length > 1 ? `Revisar ${items.length} movimientos` : 'Revisar'; draw(); };
        $('.cur-btn', card).onclick = () => { syncAll(); items[i].currency = items[i].currency === 'USD' ? 'ARS' : 'USD'; draw(); };
      });
    }
    function syncItem(i) {
      const card = $(`.review-card[data-i="${i}"]`); if (!card) return;
      const it = items[i];
      const a = parseAmount($('.rc-amount input', card).value);
      it.amount = a > 0 ? a : 0;
      Object.assign(it, readFields(`r${i}-`, card));
    }
    function syncAll() { items.forEach((_, i) => syncItem(i)); }
    function readReview() {
      syncAll();
      const badSplit = items.findIndex((it) => it.split && it.splitTotal !== 100);
      if (badSplit >= 0) { toast('El reparto personalizado tiene que sumar 100%'); return null; }
      items.forEach((it) => delete it.splitTotal);
      const bad = items.findIndex((it) => !(it.amount > 0));
      if (bad >= 0) { toast('Falta el monto de un movimiento'); $(`.review-card[data-i="${bad}"] .rc-amount input`).focus(); return null; }
      return items;
    }
  }

  function reviewCard(it, i) {
    return `<div class="review-card ${typeClass(it.type)}" data-i="${i}">
      <div class="rc-head"><div class="segmented three">${typeButtons(it.type)}</div><button class="icon-btn rm" aria-label="Quitar este movimiento" style="width:30px;height:30px;color:var(--label-2)">${ICON.close}</button></div>
      <div class="rc-amount"><button class="cur-btn" aria-label="Cambiar moneda">${it.currency === 'USD' ? 'US$' : '$'}</button>
        <input inputmode="decimal" value="${esc(amountInputValue(it.amount))}" aria-label="Monto"></div>
      ${it.confidence < 0.7 ? '<div class="low-conf">Revisá estos datos: no estoy seguro de haber entendido todo.</div>' : ''}
      ${movFields(it, `r${i}-`)}
    </div>`;
  }

  function commit(items, text, source) {
    const now = Date.now();
    const recs = items.map((it, k) => ({
      id: uid(), type: it.type, amount: it.amount, currency: it.currency || 'ARS', category: it.category, method: it.method,
      date: it.date, description: it.description || it.category, installments: it.installments || null,
      jar: it.type === 'gasto' ? it.jar || null : undefined, split: it.type === 'ingreso' && it.split && Object.keys(it.split).length ? it.split : undefined, holdingId: it.type === 'inversion' ? it.holdingId || null : undefined,
      cantidad: it.type === 'inversion' ? it.cantidad || null : undefined,
      createdAt: now + k, source: source === 'manual' ? 'texto' : 'voz', transcript: text
    }));
    db.movs.push(...recs);
    save(); closeSheet();
    ui.month = monthOf(recs[0].date); ui.q = ''; $('#q').value = ''; ui.cat = null;
    go('movs');
    const ids = new Set(recs.map((r) => r.id));
    const msg = recs.length === 1
      ? `Guardado: ${recs[0].description} ${money(recs[0].type === 'ingreso' ? recs[0].amount : -recs[0].amount, recs[0].currency, recs[0].type === 'ingreso')}`
      : `${recs.length} movimientos guardados`;
    toast(msg, () => { db.movs = db.movs.filter((m) => !ids.has(m.id)); save(); renderAll(); });
  }

  // ---------- Exportar / importar ----------
  function download(name, content, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }
  // En el teléfono abre el menú de compartir (Archivos, Drive, WhatsApp…); si no se puede, descarga el archivo.
  async function exportJSON() {
    const data = { app: 'mis-finanzas-fm', version: 1, exportedAt: new Date().toISOString(), movs: db.movs, settings: db.settings };
    const name = `finanzas-fm-copia-${todayIso()}.json`, json = JSON.stringify(data, null, 1);
    const done = () => { S().lastBackup = new Date().toISOString(); save(); renderAll(); };
    try {
      const file = new File([json], name, { type: 'application/json' });
      if (navigator.canShare && navigator.canShare({ files: [file] }) && /Android|iPhone|iPad|iPod/.test(navigator.userAgent)) {
        await navigator.share({ files: [file], title: 'Copia de Mis Finanzas FM' });
        done(); toast('Copia guardada');
        return;
      }
    } catch (e) { if (e && e.name === 'AbortError') return; }
    download(name, json, 'application/json');
    done(); toast('Copia descargada. Guardala en tus archivos o en Drive.');
  }
  const CSV_COLS = ['Fecha', 'Tipo', 'Monto', 'Moneda', 'Categoría', 'Frasco', 'Activo', 'Medio', 'Detalle', 'Cuotas', 'Origen', 'Texto dictado'];
  function exportCSV() {
    const q = (s) => { s = String(s ?? ''); return /[";\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
    const rows = sortMovs(db.movs.slice()).map((m) => [m.date, TYPE_LABEL[m.type] || m.type, String(m.amount).replace('.', ','), m.currency, m.category,
      jarOfMov(m) ? jarById(jarOfMov(m)).name : '', ((S().holdings || []).find((h) => h.id === m.holdingId) || {}).nombre || '', m.method, m.description, m.installments || '', m.source || '', m.transcript || ''].map(q).join(';'));
    download(`finanzas-fm-${todayIso()}.csv`, '﻿' + [CSV_COLS.join(';')].concat(rows).join('\r\n'), 'text/csv;charset=utf-8');
    toast('Planilla exportada');
  }
  function parseCSV(text) {
    text = text.replace(/^﻿/, '');
    const sep = (text.split('\n')[0].match(/;/g) || []).length >= (text.split('\n')[0].match(/,/g) || []).length ? ';' : ',';
    const rows = []; let row = [], cell = '', inQ = false;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (inQ) { if (ch === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else inQ = false; } else cell += ch; }
      else if (ch === '"') inQ = true;
      else if (ch === sep) { row.push(cell); cell = ''; }
      else if (ch === '\n' || ch === '\r') { if (ch === '\r' && text[i + 1] === '\n') i++; row.push(cell); rows.push(row); row = []; cell = ''; }
      else cell += ch;
    }
    if (cell || row.length) { row.push(cell); rows.push(row); }
    const head = rows.shift().map((h) => Parser.norm(h.trim()));
    const col = (n) => head.indexOf(Parser.norm(n));
    const iF = col('Fecha'), iT = col('Tipo'), iM = col('Monto');
    if (iF < 0 || iM < 0) throw new Error('El CSV necesita al menos las columnas Fecha y Monto.');
    return rows.filter((r) => r.length > 1 && r[iF]).map((r, k) => {
      let date = r[iF].trim();
      const dm = date.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
      if (dm) date = `${dm[3].length === 2 ? '20' + dm[3] : dm[3]}-${pad(dm[2])}-${pad(dm[1])}`;
      let amount = parseLoose(r[iM]);
      let type = iT >= 0 && /ingreso/i.test(r[iT]) ? 'ingreso' : iT >= 0 && /inversi/i.test(r[iT]) ? 'inversion' : 'gasto';
      if (/^-/.test(r[iM].trim()) && iT < 0) type = 'gasto';
      const g = (n) => (col(n) >= 0 ? (r[col(n)] || '').trim() : '');
      return { id: uid(), type, amount, currency: g('Moneda') || 'ARS', category: g('Categoría') || (type === 'ingreso' ? 'Otros ingresos' : 'Otros gastos'),
        method: g('Medio') || S().defaultMethod, date, description: g('Detalle') || g('Descripción'), installments: parseInt(g('Cuotas'), 10) || null,
        createdAt: Date.now() + k, source: 'importado', transcript: g('Texto dictado') };
    }).filter((m) => m.amount > 0 && /^\d{4}-\d{2}-\d{2}$/.test(m.date));
  }
  function onImportFile(file) {
    const reader = new FileReader();
    reader.onload = () => {
      let movs = [], settings = null;
      try {
        if (/\.json$/i.test(file.name) || /^\s*\{/.test(reader.result)) {
          const d = JSON.parse(reader.result);
          if (!Array.isArray(d.movs)) throw new Error('El archivo no es una copia de Mis Finanzas.');
          movs = d.movs.filter((m) => m && m.amount > 0 && m.date && m.type);
          settings = d.settings || null;
        } else movs = parseCSV(reader.result);
      } catch (e) { toast(e.message || 'No pude leer el archivo'); return; }
      if (!movs.length) { toast('El archivo no tiene movimientos para importar'); return; }
      const existing = new Set(db.movs.map((m) => m.id));
      const fresh = movs.filter((m) => !existing.has(m.id));
      openSheet({
        title: 'Importar', right: '',
        render(body) {
          body.innerHTML = `<p class="footnote" style="font-size:15px;color:var(--label)">El archivo tiene <strong>${movs.length}</strong> movimientos${settings ? ' y tus ajustes' : ''}. ${fresh.length < movs.length ? `${movs.length - fresh.length} ya están cargados.` : ''}</p>
            <button class="btn" id="imp-add" ${fresh.length ? '' : 'disabled'}>Agregar ${fresh.length} a los actuales</button>
            <button class="btn danger" id="imp-rep">Reemplazar todo por el archivo</button>
            <p class="footnote" style="margin-top:-6px">Reemplazar borra los ${db.movs.length} movimientos actuales de este dispositivo.</p>`;
          $('#imp-add').onclick = () => { if (settings && !db.movs.length) db.settings = Object.assign(DEFAULT_SETTINGS(), settings); db.movs.push(...fresh); save(); applyTheme(); closeSheet(); renderAll(); toast(`${fresh.length} movimientos importados`); };
          const rep = $('#imp-rep');
          rep.onclick = () => {
            if (!rep.classList.contains('armed')) { rep.classList.add('armed'); rep.textContent = 'Tocá de nuevo para reemplazar'; return; }
            db.movs = movs; if (settings) db.settings = Object.assign(DEFAULT_SETTINGS(), settings);
            save(); applyTheme(); closeSheet(); renderAll(); toast('Datos reemplazados');
          };
        }
      });
    };
    reader.readAsText(file);
  }
  function wipeAll() {
    openSheet({
      title: 'Borrar todo', right: '',
      render(body) {
        body.innerHTML = `<p class="footnote" style="font-size:15px;color:var(--label)">Se borran los ${db.movs.length} movimientos y tus ajustes de este dispositivo. No se puede deshacer. Si querés conservarlos, exportá una copia antes.${driveOn() ? ' La copia en Drive no se borra.' : ''}</p>
          <button class="btn tinted" id="w-bk">Exportar copia primero</button>
          <button class="btn danger" id="w-go">Borrar todos los datos</button>`;
        $('#w-bk').onclick = exportJSON;
        const b = $('#w-go');
        b.onclick = () => {
          if (!b.classList.contains('armed')) { b.classList.add('armed'); b.textContent = 'Tocá de nuevo para borrar todo'; return; }
          db = { movs: [], settings: DEFAULT_SETTINGS() }; save(); applyTheme(); closeSheet(); renderAll(); toast('Datos borrados');
        };
      }
    });
  }

  // ---------- Copia cifrada en el Google Drive de cada persona ----------
  // Cada usuario entra con su cuenta de Google desde el teléfono. Permiso mínimo (drive.appdata): la app sólo ve
  // su propia carpeta oculta, no el resto del Drive. Lo que sube va cifrado con la contraseña de copias (vault.js).
  // El intermediario (Apps Script) sólo canjea el inicio de sesión porque el "client secret" no puede ir en una app pública;
  // nunca recibe los datos financieros.
  const GOOGLE_CLIENT_ID = '872037994128-cjgsu37c3mh7cdlsk9ic9l9f03f75agf.apps.googleusercontent.com';
  const BROKER_URL = 'https://script.google.com/macros/s/AKfycbzqMyt30WtQnaUyPxk6SOzmhvmL7Dzp_A6Y1QLTYwAUdyH89j1SoiD54lMbqLWtX_Sv/exec';
  const REDIRECT_URI = 'https://felipemanrique.github.io/mis-finanzas/oauth.html'; // registrada en Google Cloud y en el intermediario
  const SCOPE = 'https://www.googleapis.com/auth/drive.appdata';
  const DRIVE_KEY = 'mf-fm:cloud';
  const MAIN_FILE = 'mf-fm.enc.json';
  const DAILY_KEEP = 60;

  let drive = loadDrive();
  let access = null; // {token, exp} sólo en memoria
  let syncTimer = null, retryTimer = null, syncing = false, syncAgain = false, claimTimer = null;
  let vaultKey = null; // {key, salt, iter}

  function loadDrive() { try { return JSON.parse(localStorage.getItem(DRIVE_KEY)) || {}; } catch (e) { return {}; } }
  function saveDrive() {
    try { localStorage.setItem(DRIVE_KEY, JSON.stringify(drive)); } catch (e) { /* sin almacenamiento */ }
    renderDriveStatus();
  }
  const driveOn = () => !!drive.refreshToken;
  const driveReady = () => !!GOOGLE_CLIENT_ID;
  const backupPayload = () => ({ app: 'mis-finanzas-fm', version: 1, exportedAt: new Date().toISOString(), movs: db.movs, settings: db.settings });
  const randomId = () => btoa(String.fromCharCode.apply(null, crypto.getRandomValues(new Uint8Array(24)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

  // --- clave de cifrado guardada en el teléfono (IndexedDB, no exportable) ---
  function idb() {
    return new Promise((res, rej) => {
      const r = indexedDB.open('mis-finanzas-fm', 1);
      r.onupgradeneeded = () => r.result.createObjectStore('keys');
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
  }
  async function idbDo(mode, fn) {
    const d = await idb();
    return new Promise((res, rej) => {
      const tx = d.transaction('keys', mode);
      const req = fn(tx.objectStore('keys'));
      tx.oncomplete = () => res(req && req.result);
      tx.onerror = () => rej(tx.error);
    });
  }
  async function getVaultKey() {
    if (vaultKey) return vaultKey;
    try { vaultKey = (await idbDo('readonly', (s) => s.get('vault'))) || null; } catch (e) { vaultKey = null; }
    return vaultKey;
  }
  async function setVaultKey(k) { vaultKey = k; try { await idbDo('readwrite', (s) => (k ? s.put(k, 'vault') : s.delete('vault'))); } catch (e) { /* queda en memoria */ } }

  // --- tokens ---
  async function broker(action, extra) {
    const res = await fetch(BROKER_URL, { method: 'POST', body: JSON.stringify(Object.assign({ action }, extra || {})) });
    try { return JSON.parse(await res.text()); } catch (e) { throw new Error('broker'); }
  }
  async function getToken() {
    if (access && access.exp - Date.now() > 60000) return access.token;
    const r = await broker('refresh', { refresh_token: drive.refreshToken });
    if (!r.ok) {
      if (r.error === 'invalid_grant') { drive.lastError = 'reauth'; saveDrive(); throw new Error('reauth'); }
      throw new Error('broker');
    }
    access = { token: r.access_token, exp: Date.now() + (r.expires_in || 3600) * 1000 };
    return access.token;
  }
  async function gfetch(method, url, body, headers, retried) {
    const t = await getToken();
    const res = await fetch(url, { method, headers: Object.assign({ Authorization: 'Bearer ' + t }, headers || {}), body });
    if (res.status === 401 && !retried) { access = null; return gfetch(method, url, body, headers, true); }
    if (!res.ok) { const e = new Error('drive_' + res.status); e.status = res.status; throw e; }
    if (res.status === 204) return null;
    const txt = await res.text();
    try { return JSON.parse(txt); } catch (e) { return txt; }
  }

  // --- archivos en la carpeta oculta de la app ---
  const API = 'https://www.googleapis.com/drive/v3/files';
  const UPLOAD = 'https://www.googleapis.com/upload/drive/v3/files';
  async function listFiles(q) {
    const u = `${API}?spaces=appDataFolder&pageSize=1000&fields=files(id,name,modifiedTime)&q=${encodeURIComponent(q || 'trashed=false')}`;
    return ((await gfetch('GET', u)) || {}).files || [];
  }
  async function findFile(name) { return (await listFiles(`name='${name}' and trashed=false`))[0] || null; }
  async function createFile(name, content) {
    const b = 'mf' + Math.random().toString(36).slice(2);
    const body = `--${b}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify({ name, parents: ['appDataFolder'] })}\r\n--${b}\r\nContent-Type: application/json\r\n\r\n${content}\r\n--${b}--`;
    return gfetch('POST', `${UPLOAD}?uploadType=multipart&fields=id`, body, { 'Content-Type': 'multipart/related; boundary=' + b });
  }
  const updateFile = (id, content) => gfetch('PATCH', `${UPLOAD}/${id}?uploadType=media&fields=id`, content, { 'Content-Type': 'application/json' });
  const readFile = (id) => gfetch('GET', `${API}/${id}?alt=media`);
  const deleteFile = (id) => gfetch('DELETE', `${API}/${id}`);

  async function writeMain(content) {
    if (drive.fileId) {
      try { await updateFile(drive.fileId, content); return; } catch (e) { if (e.status !== 404) throw e; drive.fileId = null; }
    }
    const f = await findFile(MAIN_FILE);
    if (f) { drive.fileId = f.id; await updateFile(f.id, content); } else drive.fileId = (await createFile(MAIN_FILE, content)).id;
  }
  async function readMain() {
    const f = drive.fileId ? { id: drive.fileId } : await findFile(MAIN_FILE);
    if (!f) return null;
    try { const env = await readFile(f.id); drive.fileId = f.id; return env; } catch (e) {
      if (e.status === 404 && drive.fileId) { drive.fileId = null; return readMain(); }
      throw e;
    }
  }
  async function writeDaily(content) {
    const day = todayIso();
    if (drive.lastDaily === day) return;
    const name = `mf-fm-${day}.enc.json`;
    const f = await findFile(name);
    if (f) await updateFile(f.id, content); else await createFile(name, content);
    drive.lastDaily = day;
    // borrar copias diarias viejas
    const limit = isoDate(new Date(Date.now() - DAILY_KEEP * 864e5));
    const old = (await listFiles("name contains 'mf-fm-2' and trashed=false")).filter((x) => (x.name.match(/\d{4}-\d{2}-\d{2}/) || [''])[0] < limit);
    for (const x of old) { try { await deleteFile(x.id); } catch (e) { /* se reintenta otro día */ } }
  }

  // --- sincronización ---
  function scheduleSync(delay = 2500) {
    if (!driveOn()) return;
    if (!drive.pending) { drive.pending = true; saveDrive(); }
    clearTimeout(syncTimer);
    syncTimer = setTimeout(() => syncNow(), delay);
  }

  async function syncNow(force) {
    if (!driveOn() || (!drive.pending && !force)) return;
    if (!navigator.onLine) { drive.lastError = 'offline'; saveDrive(); return; }
    if (syncing) { syncAgain = true; return; }
    const k = await getVaultKey();
    if (!k) { drive.lastError = 'nokey'; drive.pending = true; saveDrive(); return; }
    // no pisar una copia con datos usando una app vacía
    if (!db.movs.length && drive.lastCount > 0 && !force) { drive.lastError = 'would_empty'; saveDrive(); return; }
    syncing = true; clearTimeout(retryTimer);
    drive.pending = false; renderDriveStatus();
    try {
      const env = await Vault.seal(k, backupPayload());
      env.savedAt = new Date().toISOString();
      const content = JSON.stringify(env);
      await writeMain(content);
      await writeDaily(content);
      drive.lastAt = env.savedAt; drive.lastCount = db.movs.length; drive.lastError = null;
    } catch (e) {
      drive.pending = true;
      drive.lastError = e.message === 'reauth' ? 'reauth' : navigator.onLine ? 'server' : 'offline';
    }
    syncing = false; saveDrive();
    if (syncAgain) { syncAgain = false; scheduleSync(500); }
    else if (drive.pending && drive.lastError === 'server') retryTimer = setTimeout(() => syncNow(), 60000);
  }

  function retryDrive() {
    if (drive.pendingSession) claimSession();
    if (!driveOn()) return;
    if (drive.pending || drive.lastError === 'server') syncNow();
  }

  function relTime(iso) {
    const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
    if (s < 60) return 'recién';
    if (s < 3600) return `hace ${Math.round(s / 60)} min`;
    if (s < 86400) return `hace ${Math.round(s / 3600)} h`;
    return new Date(iso).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' }).replace('.', '');
  }
  function driveState() {
    if (!driveOn()) return { level: 'off', text: '' };
    if (syncing) return { level: 'busy', text: 'Subiendo copia cifrada…' };
    const e = drive.lastError;
    if (e === 'reauth') return { level: 'error', text: 'Google cerró el acceso. Volvé a conectar tu cuenta.' };
    if (e === 'nokey') return { level: 'error', text: 'Falta tu contraseña de copias en este teléfono.' };
    if (e === 'would_empty') return { level: 'error', text: 'La app está vacía y tu Drive tiene datos: no subí nada. Restaurá desde Drive.' };
    if (drive.pending && e === 'offline') return { level: 'pending', text: 'Sin conexión. Se sube sola cuando vuelva internet.' };
    if (drive.pending && e === 'server') return { level: 'pending', text: 'No se pudo subir. Reintento en un minuto.' };
    if (drive.pending) return { level: 'pending', text: 'Hay cambios por subir.' };
    if (drive.lastAt) return { level: 'ok', text: `Copia cifrada al día · ${relTime(drive.lastAt)}` };
    return { level: 'ok', text: 'Conectado. La copia se sube con el próximo cambio.' };
  }
  function renderDriveStatus() {
    const st = driveState();
    const b = $('#btn-cloud');
    if (b) {
      b.hidden = st.level === 'off';
      b.dataset.level = st.level;
      b.setAttribute('aria-label', 'Copia en Drive: ' + st.text);
      b.title = st.text;
    }
    const s = $('#drv-status');
    if (s) s.textContent = st.text;
  }

  // --- conectar ---
  function authUrl(session) {
    const p = new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID, redirect_uri: REDIRECT_URI, response_type: 'code', scope: SCOPE,
      access_type: 'offline', prompt: 'consent', state: session
    });
    return 'https://accounts.google.com/o/oauth2/v2/auth?' + p;
  }

  function passwordFields(confirm) {
    return `<div class="field-group">
        <div class="field"><label for="pw1">Contraseña</label><input id="pw1" type="password" autocomplete="${confirm ? 'new-password' : 'current-password'}" placeholder="mínimo 8 caracteres"></div>
        ${confirm ? '<div class="field"><label for="pw2">Repetila</label><input id="pw2" type="password" autocomplete="new-password"></div>' : ''}
      </div>`;
  }

  // Botón "Continuar con Google": un enlace real (en iPhone sólo así se abre Google desde la app instalada).
  function googleButton(id) {
    return `<a class="btn" id="${id}" href="#" role="button" style="display:flex;align-items:center;justify-content:center;gap:10px;text-decoration:none">${ICON.google}Continuar con Google</a>`;
  }
  function bindGoogleButton(el) {
    el.onclick = (e) => {
      if (!driveReady()) { e.preventDefault(); toast('La conexión con Google todavía no está configurada.'); return; }
      drive.pendingSession = randomId(); drive.sessionAt = Date.now(); saveDrive();
      el.href = authUrl(drive.pendingSession);
      el.target = '_blank'; el.rel = 'noopener';
      setTimeout(waitingSheet, 400);
      startClaimLoop();
    };
  }

  function openDriveConnect() {
    openSheet({
      title: 'Copia en Google Drive', right: '',
      render(body) {
        body.innerHTML = `<p class="footnote" style="font-size:15px;color:var(--label);margin:0">Cada cambio se guarda solo en tu Google Drive, cifrado con una contraseña que elegís después. Sin esa contraseña nadie puede leer las copias, ni siquiera Google.</p>
          ${googleButton('g-go')}
          <p class="footnote" style="margin-top:-6px">Google te pide permiso para que la app guarde sus propios datos en una carpeta oculta de tu Drive. La app no puede ver tus otros archivos.</p>`;
        bindGoogleButton($('#g-go'));
      }
    });
  }

  function waitingSheet() {
    openSheet({
      title: 'Conectando con Google', right: '',
      onLeft() { stopClaim(); drive.pendingSession = null; saveDrive(); closeSheet(); if (needsOnboarding()) setTimeout(openWelcome, 420); },
      render(body) {
        body.innerHTML = `<div class="listen"><div class="orb live" style="width:72px;height:72px">${ICON.cloud}</div>
          <div class="status">Elegí tu cuenta y tocá “Continuar” en la pantalla de Google. Cuando diga “Listo”, volvé a esta app.</div>
          <a class="link-btn" href="${esc(authUrl(drive.pendingSession))}" target="_blank" rel="noopener">Abrir Google de nuevo</a></div>`;
      }
    });
  }

  function stopClaim() { clearInterval(claimTimer); claimTimer = null; }
  function startClaimLoop() {
    stopClaim();
    claimTimer = setInterval(claimSession, 2500);
  }
  let claiming = false;
  async function claimSession() {
    if (!drive.pendingSession || claiming) return;
    if (Date.now() - (drive.sessionAt || 0) > 15 * 60000) { stopClaim(); drive.pendingSession = null; saveDrive(); return; }
    claiming = true;
    try {
      const r = await broker('claim', { session: drive.pendingSession });
      if (r.ok) {
        stopClaim();
        drive = { refreshToken: r.refresh_token };
        access = { token: r.access_token, exp: Date.now() + (r.expires_in || 3600) * 1000 };
        saveDrive();
        await afterGoogle();
      }
    } catch (e) { /* sigue esperando */ }
    claiming = false;
  }

  // Después de Google: si ya hay copias, pide la contraseña con la que se crearon; si no, que elija una.
  async function afterGoogle() {
    try {
      const about = await gfetch('GET', 'https://www.googleapis.com/drive/v3/about?fields=user(emailAddress)');
      drive.email = about && about.user && about.user.emailAddress; saveDrive();
    } catch (e) { /* el mail es sólo informativo */ }
    let env = null;
    try { env = await readMain(); } catch (e) { toast('No pude leer tu Drive. Probá de nuevo desde Ajustes.'); return; }
    askPassword(env);
  }

  // Si este teléfono perdió la clave: vuelve a pedirla (o a elegirla si todavía no hay copias).
  async function ensurePassword() {
    try { askPassword(await readMain()); } catch (e) { toast(e.message === 'reauth' ? 'Volvé a conectar tu cuenta de Google.' : 'No pude leer tu Drive. Revisá internet.'); }
  }

  function askPassword(env, wrong) {
    const first = !env;
    openSheet({
      title: first ? 'Último paso' : 'Tu contraseña de copias', right: 'Listo',
      onLeft() { closeSheet(); if (!needsOnboarding()) go('settings'); },
      render(body) {
        body.innerHTML = `${wrong ? `<div class="banner" style="margin:0">${ICON.warn}<div>Esa contraseña no abre tus copias. Probá de nuevo.</div></div>` : ''}
          ${drive.email ? `<p class="footnote" style="margin:0">Conectado como <strong>${esc(drive.email)}</strong></p>` : ''}
          <p class="footnote" style="font-size:15px;color:var(--label);margin:0">${first
            ? 'Elegí una contraseña para cifrar tus copias. Te la vamos a pedir sólo si cambiás de teléfono.'
            : `Tu Drive ya tiene copias${env.savedAt ? ' (la última del ' + esc(new Date(env.savedAt).toLocaleDateString('es-AR')) + ')' : ''}. Ingresá la contraseña con la que las creaste.`}</p>
          ${passwordFields(first)}
          ${first ? `<label class="field-group field" style="justify-content:space-between;gap:12px"><span style="font-size:15px">Entiendo que si la olvido, las copias no se pueden recuperar</span><span class="switch"><input type="checkbox" id="pw-ok"><span></span></span></label>
          <p class="footnote" style="margin-top:-8px">Guardala en el administrador de contraseñas del teléfono o anotala en un lugar seguro.</p>` : '<button class="link-btn" id="pw-reset" style="justify-self:start;padding:0;color:var(--expense)">La olvidé: empezar de cero</button>'}`;
        setTimeout(() => $('#pw1') && $('#pw1').focus(), 420);
        const reset = $('#pw-reset');
        if (reset) reset.onclick = () => resetCopies();
      },
      async onRight() {
        const p1 = $('#pw1').value;
        if (p1.length < 8) { toast('La contraseña tiene que tener al menos 8 caracteres'); return; }
        if (first) {
          if (p1 !== $('#pw2').value) { toast('Las contraseñas no coinciden'); return; }
          if (!$('#pw-ok').checked) { toast('Confirmá que entendés que no se puede recuperar'); return; }
          $('#sheet-right').disabled = true;
          await setVaultKey(await Vault.newKey(p1));
          drive.lastError = null; saveDrive();
          markOnboarded(); closeSheet(); go('movs');
          if (db.movs.length) scheduleSync(200);
          toast('Todo listo. Tocá el micrófono para cargar tu primer movimiento.');
          return;
        }
        $('#sheet-right').disabled = true;
        const k = await Vault.keyForEnvelope(p1, env);
        try {
          const remote = await Vault.open(k, env);
          await setVaultKey(k);
          if (drive.lastError === 'nokey') drive.lastError = null;
          saveDrive(); markOnboarded();
          chooseData(remote, env.savedAt);
        } catch (e) { askPassword(env, true); }
      }
    });
  }

  // ---------- Bienvenida (una sola vez) ----------
  const ONB_KEY = 'mf-fm:onboarded';
  const isOnboarded = () => { try { return !!localStorage.getItem(ONB_KEY); } catch (e) { return true; } };
  function markOnboarded() { try { localStorage.setItem(ONB_KEY, new Date().toISOString()); } catch (e) { /* sin almacenamiento */ } }
  function needsOnboarding() { return !isOnboarded() && !driveOn() && !db.movs.length; }

  function installHint() {
    const standalone = (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone;
    if (standalone) return '';
    const ios = /iPhone|iPad|iPod/.test(navigator.userAgent);
    return `<p class="footnote" style="text-align:center;margin:0">Tip: instalala como app. ${ios ? 'En Safari: Compartir → “Agregar a inicio”.' : 'En Chrome: menú ⋮ → “Instalar app”.'}</p>`;
  }

  function openWelcome() {
    openSheet({
      title: '', left: '', right: '',
      render(body) {
        body.innerHTML = `<div class="welcome">
            <img src="icons/icon.svg" alt="" class="welcome-logo" width="88" height="88">
            <h2>Te damos la bienvenida a Mis Finanzas FM</h2>
            <p>Decile a la app en qué gastaste o cuánto cobraste. Ella anota el monto, la categoría, el medio de pago y la fecha.</p>
          </div>
          <div class="welcome-points">
            <div><span class="wp-ic" style="background-color:var(--accent)">${ICON.mic}</span><span><strong>Hablá y listo.</strong> “Gasté 12 mil en nafta con débito.”</span></div>
            <div><span class="wp-ic" style="background-color:#34C759">${ICON.chart}</span><span><strong>6 frascos.</strong> Cada cobro se reparte solo: gastos, diversión, ahorro, inversión y dar.</span></div>
            <div><span class="wp-ic" style="background-color:#6155F5">${ICON.lock}</span><span><strong>Tus datos son tuyos.</strong> Nada pasa por servidores ajenos.</span></div>
          </div>
          <p class="label-sm">¿Dónde guardamos tus datos?</p>
          ${googleButton('w-google')}
          <p class="footnote" style="margin-top:-6px">Copia automática y cifrada en tu Google Drive. Si cambiás o perdés el teléfono, recuperás todo.</p>
          <button class="btn tinted" id="w-local">Usar sin cuenta</button>
          ${installHint()}`;
        bindGoogleButton($('#w-google'));
        $('#w-local').onclick = openNoAccount;
      }
    });
  }

  function openNoAccount() {
    openSheet({
      title: 'Usar sin cuenta', left: 'Atrás', right: '',
      onLeft: openWelcome,
      render(body) {
        body.innerHTML = `<div class="banner" style="margin:0">${ICON.warn}<div><strong>Podés perder tus datos.</strong> Sin cuenta, todo queda guardado sólo en este teléfono.</div></div>
          <ul class="warn-list">
            <li>Si perdés o cambiás el teléfono, o se borran los datos del navegador, los movimientos se pierden.</li>
            <li>No se sincroniza con otros dispositivos.</li>
            <li>Las copias son manuales: Ajustes → “Guardar copia en el teléfono”. Te lo vamos a recordar cada semana.</li>
            <li>Podés conectar Google más adelante desde Ajustes, sin perder nada.</li>
          </ul>
          ${googleButton('n-google')}
          <button class="btn tinted" id="n-ok">Entiendo, seguir sin cuenta</button>`;
        bindGoogleButton($('#n-google'));
        $('#n-ok').onclick = () => { markOnboarded(); closeSheet(); go('movs'); toast('Listo. Tocá el micrófono para cargar tu primer movimiento.'); };
      }
    });
  }

  function resetCopies() {
    openSheet({
      title: 'Empezar de cero', right: '',
      onLeft() { closeSheet(); go('settings'); },
      render(body) {
        body.innerHTML = `<p class="footnote" style="font-size:15px;color:var(--label);margin:0">Se borran todas las copias de tu Drive (no se pueden abrir sin la contraseña) y se crea una nueva con los ${db.movs.length} movimientos de este teléfono.</p>
          <p class="label-sm">Nueva contraseña de copias</p>${passwordFields(true)}
          <button class="btn danger" id="rs-go">Borrar copias y empezar de cero</button>`;
        const b = $('#rs-go');
        b.onclick = async () => {
          const p1 = $('#pw1').value;
          if (p1.length < 8 || p1 !== $('#pw2').value) { toast(p1.length < 8 ? 'Mínimo 8 caracteres' : 'Las contraseñas no coinciden'); return; }
          if (!b.classList.contains('armed')) { b.classList.add('armed'); b.textContent = 'Tocá de nuevo para borrar las copias'; return; }
          b.disabled = true; b.textContent = 'Borrando…';
          try {
            for (const f of await listFiles("name contains 'mf-fm' and trashed=false")) await deleteFile(f.id);
            drive.fileId = null; drive.lastDaily = null; drive.lastCount = 0;
            await setVaultKey(await Vault.newKey(p1));
            drive.lastError = null; saveDrive();
            await syncNow(true);
            closeSheet(); go('settings'); toast('Copias nuevas creadas');
          } catch (e) { b.disabled = false; b.textContent = 'Borrar copias y empezar de cero'; toast('No pude borrar las copias. Revisá internet.'); }
        };
      }
    });
  }

  // Tras abrir una copia: decidir qué datos quedan en el teléfono.
  function chooseData(remote, savedAt) {
    const rm = Array.isArray(remote.movs) ? remote.movs : [];
    const apply = (movs, settings, msg) => {
      db = { movs, settings: Object.assign(DEFAULT_SETTINGS(), settings || db.settings) };
      try { localStorage.setItem(KEY, JSON.stringify(db)); db = load(); } catch (e) { /* sin espacio */ }
      drive.lastCount = rm.length;
      applyTheme(); closeSheet(); go('movs'); toast(msg);
      scheduleSync(300);
    };
    if (!db.movs.length) return apply(rm, remote.settings, `${rm.length} movimientos recuperados de Drive`);
    const local = db.movs.length;
    const ids = new Set(db.movs.map((m) => m.id));
    const extra = rm.filter((m) => !ids.has(m.id)).length;
    openSheet({
      title: 'Ya tenés datos en los dos lados', right: '',
      render(body) {
        body.innerHTML = `<p class="footnote" style="font-size:15px;color:var(--label);margin:0">Este teléfono tiene <strong>${local}</strong> movimientos y tu Drive <strong>${rm.length}</strong>${savedAt ? ' (copia del ' + esc(new Date(savedAt).toLocaleDateString('es-AR')) + ')' : ''}.</p>
          <button class="btn" id="cd-merge">Combinar (quedan ${local + extra})</button>
          <button class="btn tinted" id="cd-remote">Usar sólo los de Drive</button>
          <button class="btn tinted" id="cd-local">Usar sólo los de este teléfono</button>`;
        $('#cd-merge').onclick = () => apply(db.movs.concat(rm.filter((m) => !ids.has(m.id))), db.settings, 'Datos combinados');
        $('#cd-remote').onclick = () => apply(rm, remote.settings, 'Datos de Drive restaurados');
        $('#cd-local').onclick = () => { drive.lastCount = local; closeSheet(); go('settings'); syncNow(true); toast('Se usan los datos de este teléfono'); };
      }
    });
  }

  async function restoreFromDrive() {
    const k = await getVaultKey();
    let env;
    try { env = await readMain(); } catch (e) { toast(e.message === 'reauth' ? 'Volvé a conectar tu cuenta de Google.' : 'No pude leer tu Drive. Revisá internet.'); return; }
    if (!env) { toast('Todavía no hay copias en tu Drive.'); return; }
    if (!k) return askPassword(env);
    try { chooseData(await Vault.open(k, env), env.savedAt); } catch (e) { askPassword(env, true); }
  }

  function changePassword() {
    openSheet({
      title: 'Cambiar contraseña', right: 'Guardar',
      render(body) {
        body.innerHTML = `<p class="footnote" style="font-size:15px;color:var(--label);margin:0">Las copias se vuelven a cifrar con la contraseña nueva. Las copias diarias anteriores se borran, porque usan la vieja.</p>
          <p class="label-sm">Nueva contraseña</p>${passwordFields(true)}`;
      },
      async onRight() {
        const p1 = $('#pw1').value;
        if (p1.length < 8 || p1 !== $('#pw2').value) { toast(p1.length < 8 ? 'Mínimo 8 caracteres' : 'Las contraseñas no coinciden'); return; }
        $('#sheet-right').disabled = true;
        try {
          for (const f of await listFiles("name contains 'mf-fm-2' and trashed=false")) await deleteFile(f.id);
          drive.lastDaily = null;
          await setVaultKey(await Vault.newKey(p1));
          await syncNow(true);
          closeSheet(); renderSettings(); toast('Contraseña cambiada');
        } catch (e) { $('#sheet-right').disabled = false; toast('No pude cambiarla. Revisá internet.'); }
      }
    });
  }

  async function disconnectDrive() {
    const rt = drive.refreshToken;
    drive = {}; access = null; saveDrive(); await setVaultKey(null);
    if (rt) fetch('https://oauth2.googleapis.com/revoke?token=' + encodeURIComponent(rt), { method: 'POST', mode: 'no-cors' }).catch(() => {});
  }

  function driveSettingsHtml() {
    if (!driveOn()) {
      return `<h2 class="section-title">Copia en Google Drive</h2>
        <div class="list"><button class="item link" id="drv-connect">Conectar con Google</button></div>
        <p class="footnote">Cada cambio se guarda solo en tu Google Drive, cifrado con tu contraseña. Si no hay internet, se sube cuando vuelva. Cada persona usa su propia cuenta.</p>`;
    }
    return `<h2 class="section-title">Copia en Google Drive</h2>
      <div class="list">
        <div class="item"><span class="grow">${esc(drive.email || 'Cuenta de Google')}<span class="sub" id="drv-status" style="white-space:normal"></span></span></div>
        <button class="item link" id="drv-now">Subir copia ahora</button>
        <button class="item link" id="drv-restore">Restaurar desde Drive</button>
        <button class="item link" id="drv-pass">Cambiar contraseña de copias</button>
        <button class="item danger" id="drv-off">Desconectar</button>
      </div>
      <p class="footnote">Las copias van cifradas a una carpeta oculta de tu Drive que sólo usa esta app: una siempre actualizada y una por día (últimos ${DAILY_KEEP} días). Para borrarlas: Drive → Configuración → Administrar apps → Mis Finanzas → Borrar datos ocultos.</p>`;
  }
  function bindDriveSettings() {
    const c = $('#drv-connect'); if (c) c.onclick = openDriveConnect;
    const n = $('#drv-now'); if (n) n.onclick = async () => {
      if (drive.lastError === 'reauth') { openDriveConnect(); return; }
      if (drive.lastError === 'nokey') { ensurePassword(); return; }
      drive.pending = true;
      await syncNow();
      toast(drive.lastError ? driveState().text : 'Copia subida a Drive');
    };
    const r = $('#drv-restore'); if (r) r.onclick = restoreFromDrive;
    const p = $('#drv-pass'); if (p) p.onclick = changePassword;
    const o = $('#drv-off'); if (o) o.onclick = async () => {
      if (!o.classList.contains('armed')) { o.classList.add('armed'); o.textContent = 'Tocá de nuevo para desconectar'; return; }
      await disconnectDrive(); renderSettings(); toast('Desconectado. Tus copias siguen en tu Drive.');
    };
    renderDriveStatus();
  }

  // ---------- Navegación ----------
  function go(tab) {
    ui.tab = tab;
    $$('[data-view]').forEach((v) => (v.hidden = v.dataset.view !== tab));
    $$('.tab').forEach((t) => (t.dataset.tab === tab ? t.setAttribute('aria-current', 'page') : t.removeAttribute('aria-current')));
    try { history.replaceState(null, '', tab === 'movs' ? location.pathname : '#' + tab); } catch (e) { /* sin historial */ }
    renderAll();
    window.scrollTo(0, 0);
  }
  function renderAll() {
    if (ui.tab === 'movs') renderMovs();
    else if (ui.tab === 'stats') renderStats();
    else if (ui.tab === 'accounts') renderAccounts();
    else if (ui.tab === 'settings') renderSettings();
  }

  // ---------- Buscar actualización ----------
  // Compara la versión publicada con la instalada; si hay una nueva, renueva los archivos y recarga.
  async function checkUpdate(btn) {
    const reset = () => { btn.disabled = false; btn.textContent = 'Buscar actualización'; };
    btn.disabled = true; btn.textContent = 'Buscando…';
    try {
      const txt = await (await fetch('app.js?t=' + Date.now(), { cache: 'no-store' })).text();
      const remote = (txt.match(/const APP_VERSION = '(\d[\w.-]*)'/) || [])[1];
      if (!remote) throw new Error('sin versión');
      if (remote === APP_VERSION) { reset(); toast(`Ya tenés la última versión (${APP_VERSION})`); return; }
      btn.textContent = 'Actualizando…';
      const files = ['./', 'index.html', 'styles.css', 'parser.js', 'vault.js', 'app.js', 'manifest.webmanifest', 'privacidad.html'];
      await Promise.all(files.map((f) => fetch(f, { cache: 'reload' }).catch(() => {})));
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.filter((k) => k.startsWith('mf-fm-')).map((k) => caches.delete(k)));
      }
      const reg = navigator.serviceWorker && await navigator.serviceWorker.getRegistration();
      if (reg) await reg.update().catch(() => {});
      toast(`Instalando la versión ${remote}…`);
      setTimeout(() => location.reload(), 700);
    } catch (e) {
      reset(); toast('No pude buscar actualizaciones. Revisá tu conexión a internet.');
    }
  }

  // ---------- Inicio ----------
  const APP_VERSION = '1.8.0';
  function init() {
    applyTheme();
    $$('.tab').forEach((t) => (t.onclick = () => go(t.dataset.tab)));
    $('#btn-mic').onclick = () => openVoice();
    $('#btn-add').onclick = () => openEditor(null);
    $('#scrim').onclick = closeSheet;
    $('#sheet-body').addEventListener('input', (e) => { const box = e.target.closest('.split-box'); if (box) paintSplit(box); });
    $('#sheet-body').addEventListener('click', (e) => {
      const box = e.target.closest('.split-box');
      if (!box) return;
      if (e.target.closest('.sp-add')) {
        const used = $$('.sp-jar', box).map((x) => x.value);
        const next = (jarsOf().find((j) => !used.includes(j.id)) || jarsOf()[0]).id;
        $('.sp-rows', box).insertAdjacentHTML('beforeend', splitRow(next, ''));
        paintSplit(box);
      } else if (e.target.closest('.sp-rm')) {
        if ($$('.sp-row', box).length > 1) e.target.closest('.sp-row').remove();
        paintSplit(box);
      }
    });
    $('#sheet-body').addEventListener('change', (e) => {
      const sp = (e.target.id || '').match(/^(.*)split$/);
      if (sp) { const box = $('#' + sp[1] + 'splitbox'); if (box) { box.hidden = e.target.value !== 'custom'; paintSplit(box); } return; }
      const mm = (e.target.id || '').match(/^(.*)cat$/);
      if (!mm) return;
      const jar = $('#' + mm[1] + 'jar');
      if (jar) jar.value = (S().catJar || {})[e.target.value] || 'gastos';
    });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && sheetOpen()) closeSheet(); });
    document.addEventListener('click', (e) => {
      const b = e.target.closest('[data-m]');
      if (!b) return;
      const n = +b.dataset.m;
      ui.month = n === 0 ? monthOf(todayIso()) : shiftMonth(ui.month, n);
      renderAll();
    });
    $('#q').addEventListener('input', (e) => { ui.q = e.target.value; renderList(); });
    $$('#type-filter button').forEach((b) => (b.onclick = () => { ui.type = b.dataset.f; renderMovs(); }));
    $('#import-file').onchange = (e) => { const f = e.target.files[0]; e.target.value = ''; if (f) onImportFile(f); };
    window.addEventListener('storage', (e) => { if (e.key === KEY) { db = load(); renderAll(); } if (e.key === DRIVE_KEY) { drive = loadDrive(); renderDriveStatus(); } });
    $('#btn-cloud').onclick = () => go('settings');
    window.addEventListener('online', () => retryDrive());
    window.addEventListener('offline', () => renderDriveStatus());
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') retryDrive(); });
    setInterval(renderDriveStatus, 60000);

    const hash = location.hash.slice(1);
    go(['stats', 'accounts', 'settings'].includes(hash) ? hash : 'movs');
    renderDriveStatus();
    retryDrive();
    if (db.movs.length || driveOn()) markOnboarded(); // usuarios que ya venían usando la app
    if (!S().firstUse) { S().firstUse = new Date().toISOString(); try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) { /* */ } }
    if (new URLSearchParams(location.search).get('voz') === '1') setTimeout(() => openVoice(), 300);
    else if (needsOnboarding()) setTimeout(openWelcome, 350);

    if ('serviceWorker' in navigator && location.protocol === 'https:') {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    }
  }

  window.__app = { get db() { return db; }, openReview, parseText };
  init();
})();
