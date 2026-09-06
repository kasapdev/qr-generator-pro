/* =====================================================================
   QR Generator Pro — app.js
   Vanilla ES6+, classic script (no modules). Depends on window.WUS and
   the global `qrcode` factory from qrcode.lib.js.
   ===================================================================== */
(function () {
  'use strict';

  var W = window.WUS;
  var HISTORY_KEY = 'qrgen.history';
  var SETTINGS_KEY = 'qrgen.settings';
  var MAX_HISTORY = 12;

  /* --------------------------- App state --------------------------- */
  var state = {
    type: 'url',
    ec: 'M',
    margin: 4,
    fg: '#0C0E1A',
    bg: '#FFFFFF',
    fields: {}        // per-type input values, keyed by field id
  };

  /* Last successfully generated matrix (cached for exports) */
  var current = null; // { count, isDark(r,c), data, type, label }

  /* --------------------------- DOM refs --------------------------- */
  var $ = function (sel) { return document.querySelector(sel); };
  var fieldsEl = $('#fields');
  var canvas = $('#qrCanvas');
  var ctx = canvas.getContext('2d');
  var stageEmpty = $('#previewEmpty');
  var qrFrame = $('#qrFrame');
  var encodedRow = $('#encodedRow');
  var encodedText = $('#encodedText');
  var sizeReadout = $('#sizeReadout');
  var contrastBadge = $('#contrastBadge');

  /* ============================================================
     1. FIELD DEFINITIONS PER CONTENT TYPE
     ============================================================ */
  var TYPES = {
    url: {
      label: 'Website URL',
      fields: [
        { id: 'url', type: 'url', label: 'URL', placeholder: 'https://example.com', autofocus: true }
      ]
    },
    text: {
      label: 'Plain text',
      fields: [
        { id: 'text', type: 'textarea', label: 'Text', placeholder: 'Anything you like — notes, a message, a code…', autofocus: true }
      ]
    },
    email: {
      label: 'Email',
      fields: [
        { id: 'addr', type: 'email', label: 'Recipient', placeholder: 'hello@example.com', autofocus: true },
        { id: 'subject', type: 'text', label: 'Subject', placeholder: 'Optional subject', half: true },
        { id: 'body', type: 'textarea', label: 'Body', placeholder: 'Optional message body' }
      ]
    },
    phone: {
      label: 'Phone',
      fields: [
        { id: 'number', type: 'tel', label: 'Phone number', placeholder: '+1 555 123 4567', autofocus: true }
      ]
    },
    sms: {
      label: 'SMS',
      fields: [
        { id: 'number', type: 'tel', label: 'Phone number', placeholder: '+1 555 123 4567', autofocus: true },
        { id: 'body', type: 'textarea', label: 'Message', placeholder: 'Optional pre-filled message' }
      ]
    },
    wifi: {
      label: 'WiFi network',
      fields: [
        { id: 'ssid', type: 'text', label: 'Network name (SSID)', placeholder: 'MyNetwork', autofocus: true },
        { id: 'enc', type: 'select', label: 'Security', options: [
          { value: 'WPA', text: 'WPA / WPA2 / WPA3' },
          { value: 'WEP', text: 'WEP' },
          { value: 'nopass', text: 'None (open)' }
        ], half: true },
        { id: 'password', type: 'text', label: 'Password', placeholder: 'Network password', half: true },
        { id: 'hidden', type: 'checkbox', label: 'Hidden network' }
      ]
    },
    contact: {
      label: 'Contact card',
      fields: [
        { id: 'name', type: 'text', label: 'Full name', placeholder: 'Jane Doe', autofocus: true },
        { id: 'phone', type: 'tel', label: 'Phone', placeholder: '+1 555 123 4567', half: true },
        { id: 'email', type: 'email', label: 'Email', placeholder: 'jane@example.com', half: true },
        { id: 'org', type: 'text', label: 'Organization', placeholder: 'Optional company or title', half: true },
        { id: 'url', type: 'url', label: 'Website', placeholder: 'Optional website', half: true }
      ]
    }
  };

  /* ============================================================
     2. RENDER FIELDS FOR THE ACTIVE TYPE
     ============================================================ */
  function renderFields() {
    var def = TYPES[state.type];
    fieldsEl.innerHTML = '';
    var saved = state.fields[state.type] || {};

    // Group consecutive "half" fields into 2-col rows for a tidy layout.
    var i = 0;
    while (i < def.fields.length) {
      var f = def.fields[i];
      if (f.half && def.fields[i + 1] && def.fields[i + 1].half) {
        var row = W.el('div', { class: 'field-row' });
        row.appendChild(buildField(f, saved));
        row.appendChild(buildField(def.fields[i + 1], saved));
        fieldsEl.appendChild(row);
        i += 2;
      } else {
        fieldsEl.appendChild(buildField(f, saved));
        i += 1;
      }
    }

    var first = fieldsEl.querySelector('[data-autofocus]');
    if (first) { try { first.focus(); } catch (e) {} }
  }

  function buildField(f, saved) {
    var wrap = W.el('div', { class: 'field' });
    var inputId = 'f_' + state.type + '_' + f.id;

    if (f.type === 'checkbox') {
      var lbl = W.el('label', { class: 'check', 'for': inputId });
      var sw = W.el('span', { class: 'switch' });
      var input = W.el('input', { type: 'checkbox', id: inputId });
      input.checked = !!saved[f.id];
      sw.appendChild(input);
      sw.appendChild(W.el('span', { class: 'track' }));
      sw.appendChild(W.el('span', { class: 'thumb' }));
      lbl.appendChild(sw);
      lbl.appendChild(W.el('span', { text: f.label }));
      input.addEventListener('change', onFieldInput);
      wrap.appendChild(lbl);
      wrap.dataset.fid = f.id;
      return wrap;
    }

    wrap.appendChild(W.el('label', { 'for': inputId, text: f.label }));

    var ctl;
    if (f.type === 'textarea') {
      ctl = W.el('textarea', { id: inputId, placeholder: f.placeholder || '' });
    } else if (f.type === 'select') {
      ctl = W.el('select', { id: inputId });
      f.options.forEach(function (o) {
        var opt = W.el('option', { value: o.value, text: o.text });
        ctl.appendChild(opt);
      });
    } else {
      ctl = W.el('input', { id: inputId, type: f.type || 'text', placeholder: f.placeholder || '' });
    }

    if (saved[f.id] != null) {
      ctl.value = saved[f.id];
    }
    if (f.autofocus) ctl.setAttribute('data-autofocus', '');
    ctl.dataset.fid = f.id;
    ctl.addEventListener('input', onFieldInput);
    ctl.addEventListener('change', onFieldInput);
    wrap.appendChild(ctl);
    return wrap;
  }

  /* Collect current field values into state.fields[type] */
  function collectFields() {
    var vals = {};
    var nodes = fieldsEl.querySelectorAll('[data-fid]');
    nodes.forEach(function (n) {
      var ctl = n.matches('input,textarea,select') ? n : n.querySelector('input,textarea,select');
      if (!ctl) return;
      vals[n.dataset.fid || ctl.dataset.fid] = ctl.type === 'checkbox' ? ctl.checked : ctl.value;
    });
    state.fields[state.type] = vals;
    return vals;
  }

  /* ============================================================
     3. BUILD THE ENCODED STRING FROM FIELD VALUES
     ============================================================ */
  function trim(s) { return (s == null ? '' : String(s)).trim(); }

  /* Escape special chars for the WIFI: payload (\ ; , : and ") */
  function wifiEscape(s) {
    return String(s).replace(/([\\;,:"])/g, '\\$1');
  }

  /* Escape special chars for the MECARD: payload (\ ; , and :) */
  function mecardEscape(s) {
    return String(s).replace(/([\\;,:])/g, '\\$1');
  }

  function buildEncoded(vals) {
    var v = vals || {};
    switch (state.type) {
      case 'url': {
        var u = trim(v.url);
        if (!u) return '';
        // Add a protocol if the user typed a bare domain.
        if (!/^[a-z][a-z0-9+.\-]*:/i.test(u)) u = 'https://' + u;
        return u;
      }
      case 'text':
        return trim(v.text);
      case 'email': {
        var addr = trim(v.addr);
        if (!addr) return '';
        var q = [];
        if (trim(v.subject)) q.push('subject=' + encodeURIComponent(trim(v.subject)));
        if (trim(v.body)) q.push('body=' + encodeURIComponent(trim(v.body)));
        return 'mailto:' + addr + (q.length ? '?' + q.join('&') : '');
      }
      case 'phone': {
        var num = trim(v.number);
        return num ? 'tel:' + num.replace(/\s+/g, '') : '';
      }
      case 'sms': {
        var sn = trim(v.number);
        if (!sn) return '';
        var b = trim(v.body);
        return 'sms:' + sn.replace(/\s+/g, '') + (b ? '?body=' + encodeURIComponent(b) : '');
      }
      case 'wifi': {
        var ssid = trim(v.ssid);
        if (!ssid) return '';
        var enc = v.enc || 'WPA';
        var pass = trim(v.password);
        var hidden = !!v.hidden;
        var out = 'WIFI:T:' + (enc === 'nopass' ? 'nopass' : enc) + ';S:' + wifiEscape(ssid) + ';';
        if (enc !== 'nopass') out += 'P:' + wifiEscape(pass) + ';';
        out += 'H:' + (hidden ? 'true' : 'false') + ';;';
        return out;
      }
      case 'contact': {
        var name = trim(v.name);
        if (!name) return '';
        var mc = 'MECARD:N:' + mecardEscape(name) + ';';
        if (trim(v.phone)) mc += 'TEL:' + trim(v.phone).replace(/\s+/g, '') + ';';
        if (trim(v.email)) mc += 'EMAIL:' + mecardEscape(trim(v.email)) + ';';
        if (trim(v.org)) mc += 'ORG:' + mecardEscape(trim(v.org)) + ';';
        if (trim(v.url)) {
          var site = trim(v.url);
          if (!/^[a-z][a-z0-9+.\-]*:/i.test(site)) site = 'https://' + site;
          mc += 'URL:' + mecardEscape(site) + ';';
        }
        mc += ';';
        return mc;
      }
      default:
        return '';
    }
  }

  /* Short human-readable label for history cards */
  function buildLabel(vals) {
    var v = vals || {};
    switch (state.type) {
      case 'url': return trim(v.url) || '—';
      case 'text': return trim(v.text) || '—';
      case 'email': return trim(v.addr) || '—';
      case 'phone': return trim(v.number) || '—';
      case 'sms': return trim(v.number) || '—';
      case 'wifi': return trim(v.ssid) || '—';
      case 'contact': return trim(v.name) || '—';
      default: return '—';
    }
  }

  /* ============================================================
     4. QR GENERATION + CANVAS RENDERING
     ============================================================ */

  /* Create a QR model; auto-bumps type number on overflow. */
  function makeQr(data, level) {
    // typeNumber 0 = auto-fit in this library build.
    var qr = qrcode(0, level);
    qr.addData(data);
    qr.make();
    return qr;
  }

  /* Draw a matrix onto a canvas at a chosen pixel size. */
  function drawMatrix(targetCanvas, count, isDark, opts) {
    var margin = opts.margin;
    var fg = opts.fg, bg = opts.bg;
    var total = count + margin * 2;
    // Pick a cell size so output is close to (but not over) desired px.
    var cell = Math.max(1, Math.floor(opts.px / total));
    var dim = cell * total;

    targetCanvas.width = dim;
    targetCanvas.height = dim;
    var c = targetCanvas.getContext('2d');
    c.imageSmoothingEnabled = false;

    // Background
    c.fillStyle = bg;
    c.fillRect(0, 0, dim, dim);

    // Dark modules
    c.fillStyle = fg;
    for (var r = 0; r < count; r++) {
      for (var col = 0; col < count; col++) {
        if (isDark(r, col)) {
          c.fillRect((col + margin) * cell, (r + margin) * cell, cell, cell);
        }
      }
    }
    return dim;
  }

  /* Contrast helper — rough relative-luminance ratio for a warning badge. */
  function luminance(hex) {
    var h = hex.replace('#', '');
    if (h.length === 3) h = h[0]+h[0]+h[1]+h[1]+h[2]+h[2];
    var rgb = [0, 2, 4].map(function (i) {
      var v = parseInt(h.substr(i, 2), 16) / 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
  }
  function contrastRatio(a, b) {
    var l1 = luminance(a), l2 = luminance(b);
    var hi = Math.max(l1, l2), lo = Math.min(l1, l2);
    return (hi + 0.05) / (lo + 0.05);
  }
  function updateContrastBadge() {
    var ratio = contrastRatio(state.fg, state.bg);
    contrastBadge.classList.remove('badge--success', 'badge--warning', 'badge--danger');
    if (ratio >= 4) {
      contrastBadge.classList.add('badge--success');
      contrastBadge.textContent = 'Contrast OK (' + ratio.toFixed(1) + ':1)';
    } else if (ratio >= 2.2) {
      contrastBadge.classList.add('badge--warning');
      contrastBadge.textContent = 'Low contrast (' + ratio.toFixed(1) + ':1)';
    } else {
      contrastBadge.classList.add('badge--danger');
      contrastBadge.textContent = 'May not scan (' + ratio.toFixed(1) + ':1)';
    }
  }

  /* Master generate: read inputs, encode, render preview. */
  var generate = function (opts) {
    opts = opts || {};
    var vals = collectFields();
    var data = buildEncoded(vals);
    updateContrastBadge();

    if (!data) {
      current = null;
      showEmpty(true);
      sizeReadout.textContent = '— × —';
      encodedRow.hidden = true;
      return;
    }

    try {
      var qr = makeQr(data, state.ec);
      var count = qr.getModuleCount();

      // Live preview at a comfortable on-screen resolution.
      drawMatrix(canvas, count, qr.isDark, {
        margin: state.margin, fg: state.fg, bg: state.bg, px: 520
      });

      current = {
        count: count,
        isDark: qr.isDark,
        data: data,
        type: state.type,
        label: buildLabel(vals)
      };

      showEmpty(false);
      var modules = count + state.margin * 2;
      sizeReadout.textContent = count + ' × ' + count + ' modules';
      encodedText.textContent = data;
      encodedRow.hidden = false;

      if (opts.pushHistory) pushHistory(current);
      saveSettings();
    } catch (err) {
      current = null;
      showEmpty(true);
      sizeReadout.textContent = '— × —';
      encodedRow.hidden = true;
      W.toast('That content is too long to fit in a QR code. Try shorter text or a lower error-correction level.', 'error');
      // eslint-disable-next-line no-console
      console.error('[QR] generation failed:', err);
    }
  };

  function showEmpty(isEmpty) {
    stageEmpty.hidden = !isEmpty;
    qrFrame.style.visibility = isEmpty ? 'hidden' : 'visible';
  }

  /* Debounced live regeneration on input. */
  var generateLive = W.debounce(function () { generate({ pushHistory: false }); }, 160);

  function onFieldInput(e) {
    // Keep hex inputs / color pickers in sync if the event came from them.
    generateLive();
  }

  /* ============================================================
     5. EXPORTS — PNG & SVG
     ============================================================ */
  function downloadPng() {
    if (!current) { W.toast('Nothing to export yet — add some content first.', 'error'); return; }
    try {
      var off = document.createElement('canvas');
      drawMatrix(off, current.count, current.isDark, {
        margin: state.margin, fg: state.fg, bg: state.bg, px: 1024
      });
      off.toBlob(function (blob) {
        if (!blob) { W.toast('PNG export failed.', 'error'); return; }
        W.download('qr-' + current.type + '.png', blob);
        W.toast('PNG downloaded');
      }, 'image/png');
    } catch (err) {
      W.toast('PNG export failed.', 'error');
      console.error(err);
    }
  }

  function downloadSvg() {
    if (!current) { W.toast('Nothing to export yet — add some content first.', 'error'); return; }
    try {
      var svg = buildSvg(current.count, current.isDark, state.margin, state.fg, state.bg);
      W.download('qr-' + current.type + '.svg', svg, 'image/svg+xml');
      W.toast('SVG downloaded');
    } catch (err) {
      W.toast('SVG export failed.', 'error');
      console.error(err);
    }
  }

  /* Build a clean, scalable SVG with our own fg/bg + margin (one path). */
  function buildSvg(count, isDark, margin, fg, bg) {
    var total = count + margin * 2;
    var rects = '';
    for (var r = 0; r < count; r++) {
      for (var c = 0; c < count; c++) {
        if (isDark(r, c)) {
          rects += 'M' + (c + margin) + ',' + (r + margin) + 'h1v1h-1z';
        }
      }
    }
    return '<?xml version="1.0" encoding="UTF-8"?>\n' +
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + total + ' ' + total + '" ' +
      'shape-rendering="crispEdges" width="1024" height="1024">' +
      '<rect width="' + total + '" height="' + total + '" fill="' + fg + '" opacity="0"/>' +
      '<rect width="' + total + '" height="' + total + '" fill="' + bg + '"/>' +
      '<path fill="' + fg + '" d="' + rects + '"/>' +
      '</svg>';
  }

  function copyData() {
    if (!current) { W.toast('Nothing to copy yet.', 'error'); return; }
    W.copy(current.data, 'Encoded data copied');
  }

  /* ============================================================
     6. HISTORY
     ============================================================ */
  function loadHistory() { return W.store.get(HISTORY_KEY, []) || []; }
  function saveHistory(list) { W.store.set(HISTORY_KEY, list); }

  function pushHistory(item) {
    var list = loadHistory();
    // De-dupe by identical data + type.
    list = list.filter(function (h) { return !(h.type === item.type && h.data === item.data); });
    list.unshift({
      id: W.uid(),
      type: item.type,
      label: item.label,
      data: item.data,
      ec: state.ec,
      margin: state.margin,
      fg: state.fg,
      bg: state.bg,
      fields: state.fields[item.type] || {},
      ts: Date.now()
    });
    if (list.length > MAX_HISTORY) list = list.slice(0, MAX_HISTORY);
    saveHistory(list);
    renderHistory();
  }

  function renderHistory() {
    var list = loadHistory();
    var holder = $('#historyList');
    var empty = $('#historyEmpty');
    var clearBtn = $('#clearHistory');
    holder.innerHTML = '';

    if (!list.length) {
      empty.hidden = false;
      clearBtn.hidden = true;
      return;
    }
    empty.hidden = true;
    clearBtn.hidden = false;

    list.forEach(function (h) {
      var card = W.el('button', { class: 'history-card', type: 'button', title: h.data });
      card.setAttribute('aria-label', 'Restore ' + h.type + ': ' + h.label);

      var thumb = W.el('div', { class: 'thumb' });
      var tc = document.createElement('canvas');
      try {
        var qr = makeQr(h.data, h.ec || 'M');
        drawMatrix(tc, qr.getModuleCount(), qr.isDark, {
          margin: 2, fg: h.fg || '#0C0E1A', bg: h.bg || '#FFFFFF', px: 160
        });
      } catch (e) { /* skip broken thumb */ }
      thumb.appendChild(tc);

      card.appendChild(thumb);
      card.appendChild(W.el('span', { class: 'h-type', text: h.type.toUpperCase() }));
      card.appendChild(W.el('span', { class: 'h-label truncate', text: h.label }));
      card.appendChild(W.el('span', { class: 'h-date', text: W.formatDate(h.ts) }));

      card.addEventListener('click', function () { restoreHistory(h); });
      holder.appendChild(card);
    });
  }

  function restoreHistory(h) {
    state.type = h.type;
    state.ec = h.ec || 'M';
    state.margin = (h.margin != null ? h.margin : 4);
    state.fg = h.fg || '#0C0E1A';
    state.bg = h.bg || '#FFFFFF';
    state.fields[h.type] = Object.assign({}, h.fields || {});

    syncControlsFromState();
    selectTab(h.type, false);
    renderFields();
    generate({ pushHistory: false });
    W.toast('Restored from history');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function clearHistory() {
    W.store.remove(HISTORY_KEY);
    renderHistory();
    W.toast('History cleared');
  }

  /* ============================================================
     7. CONTROLS WIRING (tabs, options, colors)
     ============================================================ */
  function selectTab(type, doRender) {
    state.type = type;
    var btns = document.querySelectorAll('.type-tabs button');
    btns.forEach(function (b) {
      var active = b.dataset.type === type;
      b.classList.toggle('is-active', active);
      b.setAttribute('aria-selected', active ? 'true' : 'false');
    });
    if (doRender !== false) {
      renderFields();
      generate({ pushHistory: false });
    }
  }

  /* Reflect state values back onto the option controls. */
  function syncControlsFromState() {
    $('#ec').value = state.ec;
    $('#margin').value = state.margin;
    $('#marginVal').textContent = state.margin;
    $('#fg').value = normalizeHex(state.fg);
    $('#fgHex').value = state.fg.toUpperCase();
    $('#bg').value = normalizeHex(state.bg);
    $('#bgHex').value = state.bg.toUpperCase();
  }

  function normalizeHex(hex) {
    var h = String(hex || '').trim();
    if (!/^#/.test(h)) h = '#' + h;
    if (/^#[0-9a-f]{3}$/i.test(h)) {
      h = '#' + h[1]+h[1] + h[2]+h[2] + h[3]+h[3];
    }
    return /^#[0-9a-f]{6}$/i.test(h) ? h : '#000000';
  }

  function wireControls() {
    // Type tabs
    document.querySelectorAll('.type-tabs button').forEach(function (b) {
      b.addEventListener('click', function () {
        collectFields();           // keep current type's values before switching
        selectTab(b.dataset.type);
      });
    });

    // Error correction
    $('#ec').addEventListener('change', function () {
      state.ec = this.value;
      generate({ pushHistory: false });
    });

    // Margin slider
    var marginEl = $('#margin');
    marginEl.addEventListener('input', function () {
      state.margin = parseInt(this.value, 10);
      $('#marginVal').textContent = state.margin;
      generateLive();
    });

    // Color pickers <-> hex text fields
    wireColorPair('#fg', '#fgHex', 'fg');
    wireColorPair('#bg', '#bgHex', 'bg');

    // Swap colors
    $('#swapColors').addEventListener('click', function () {
      var tmp = state.fg; state.fg = state.bg; state.bg = tmp;
      syncControlsFromState();
      generate({ pushHistory: false });
    });

    // Exports / copy
    $('#dlPng').addEventListener('click', downloadPng);
    $('#dlSvg').addEventListener('click', downloadSvg);
    $('#copyData').addEventListener('click', copyData);

    // History clear
    $('#clearHistory').addEventListener('click', clearHistory);
  }

  function wireColorPair(pickerSel, hexSel, key) {
    var picker = $(pickerSel);
    var hex = $(hexSel);
    picker.addEventListener('input', function () {
      state[key] = picker.value.toUpperCase();
      hex.value = state[key];
      generateLive();
    });
    hex.addEventListener('input', function () {
      // Only apply when the typed value is a complete 3- or 6-digit hex.
      var raw = hex.value.replace('#', '');
      if (/^[0-9a-f]{3}$/i.test(raw) || /^[0-9a-f]{6}$/i.test(raw)) {
        var n = normalizeHex(raw);
        state[key] = n.toUpperCase();
        picker.value = n;
        generateLive();
      }
    });
    hex.addEventListener('blur', function () {
      hex.value = normalizeHex(hex.value).toUpperCase();
      state[key] = hex.value;
      picker.value = hex.value;
      generate({ pushHistory: false });
    });
  }

  /* ============================================================
     8. SETTINGS PERSISTENCE
     ============================================================ */
  function saveSettings() {
    W.store.set(SETTINGS_KEY, {
      type: state.type, ec: state.ec, margin: state.margin,
      fg: state.fg, bg: state.bg, fields: state.fields
    });
  }
  function loadSettings() {
    var s = W.store.get(SETTINGS_KEY, null);
    if (!s) return;
    if (TYPES[s.type]) state.type = s.type;
    if (['L','M','Q','H'].indexOf(s.ec) > -1) state.ec = s.ec;
    if (typeof s.margin === 'number') state.margin = W.clamp(s.margin, 0, 16);
    if (s.fg) state.fg = normalizeHex(s.fg).toUpperCase();
    if (s.bg) state.bg = normalizeHex(s.bg).toUpperCase();
    if (s.fields && typeof s.fields === 'object') state.fields = s.fields;
  }

  /* ============================================================
     9. SHORTCUTS + HELP MODAL
     ============================================================ */
  var SHORTCUTS = [
    { combo: 'mod+enter', keys: ['Ctrl/⌘', 'Enter'], desc: 'Generate & save to history' },
    { combo: 'mod+s', keys: ['Ctrl/⌘', 'S'], desc: 'Download PNG' },
    { combo: 'mod+shift+s', keys: ['Ctrl/⌘', '⇧', 'S'], desc: 'Download SVG' },
    { combo: 'mod+shift+c', keys: ['Ctrl/⌘', '⇧', 'C'], desc: 'Copy encoded data' },
    { combo: '?', keys: ['?'], desc: 'Show this help' }
  ];

  var helpModal = $('#helpModal');
  function openHelp() { helpModal.hidden = false; $('#helpClose').focus(); }
  function closeHelp() { helpModal.hidden = true; }

  function buildHelpList() {
    var ul = $('#shortcutList');
    ul.innerHTML = '';
    SHORTCUTS.forEach(function (s) {
      var li = W.el('li');
      li.appendChild(W.el('span', { class: 'desc', text: s.desc }));
      var keys = W.el('span', { class: 'keys' });
      (s.display || s.keys).forEach(function (k) { keys.appendChild(W.el('kbd', { text: k })); });
      li.appendChild(keys);
      ul.appendChild(li);
    });
  }

  function wireShortcuts() {
    W.registerShortcut('mod+enter', function () { generate({ pushHistory: true }); W.toast('Generated'); }, 'Generate & save');
    W.registerShortcut('mod+s', function () { downloadPng(); }, 'Download PNG');
    W.registerShortcut('mod+shift+s', function () { downloadSvg(); }, 'Download SVG');
    W.registerShortcut('mod+shift+c', function () { copyData(); }, 'Copy data');
    W.registerShortcut('?', openHelp, 'Help');

    document.querySelector('[data-shortcut-help]').addEventListener('click', openHelp);
    $('#helpClose').addEventListener('click', closeHelp);
    helpModal.addEventListener('click', function (e) {
      if (e.target === helpModal) closeHelp();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !helpModal.hidden) closeHelp();
    });
  }

  /* ============================================================
     10. INIT
     ============================================================ */
  function init() {
    loadSettings();
    syncControlsFromState();
    buildHelpList();
    wireControls();
    wireShortcuts();
    selectTab(state.type, false);
    renderFields();
    renderHistory();
    generate({ pushHistory: false });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
