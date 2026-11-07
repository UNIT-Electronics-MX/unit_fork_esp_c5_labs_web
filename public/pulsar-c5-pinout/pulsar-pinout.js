/*!
 * Pulsar C5 · pinout SVG (vista top)
 * UNIT Electronics · DevLab · UE0134 v1.2.3
 * Geometría tomada de los Gerbers (agujeros del header a 1.27 / 16.51 mm, paso 2.54 mm)
 * y mapeo de GPIO verificado contra el esquemático unit_sch_v_1_2_3.
 *
 * Uso en navegador:
 *   PulsarPinout.render(document.getElementById('pinout'), {
 *     used: { D13: 'SCL', D11: 'SDA', '3V3': 'VCC', GND1: 'GND' }
 *   });
 * Uso en Node:
 *   const { svg } = require('./pulsar-pinout.js'); fs.writeFileSync('x.svg', svg({ mode: 'reference' }));
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.PulsarPinout = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // ---- data -------------------------------------------------------------
  // id: clave única (usada en `used`), silk: texto serigrafiado, gpio: número o null,
  // nano: nombre Arduino Nano, cat: categoría, fn: función corta (chip), info: descripción
  const LEFT = [
    { id: 'D13',  silk: 'D13',  gpio: 27, nano: 'D13', cat: 'strap', fn: 'SCK',     info: 'SPI SCK · LED integrado · strapping' },
    { id: '3V3',  silk: '3V3',  gpio: null, cat: 'power', fn: '',      info: 'Salida 3.3 V del regulador' },
    { id: 'EN',   silk: 'EN',   gpio: null, cat: 'ctrl',  fn: '',      info: 'Enable del regulador 3.3 V (pad AREF, por jumper)' },
    { id: 'VBAT', silk: 'VBAT', gpio: null, cat: 'power', fn: '',      info: 'Batería Li-Po 1S (pad A0, por jumper)' },
    { id: 'A1',   silk: 'A1',   gpio: 1,  nano: 'D15', cat: 'safe',  fn: 'A1',  info: 'ADC1_CH0 · compartido con SDA del Qwiic' },
    { id: 'A2',   silk: 'A2',   gpio: 4,  nano: 'D16', cat: 'safe',  fn: 'A2',  info: 'ADC1_CH3 · MTCK' },
    { id: 'A3',   silk: 'A3',   gpio: 5,  nano: 'D17', cat: 'safe',  fn: 'A3',  info: 'ADC1_CH4 · MTDO' },
    { id: 'SDA',  silk: 'SDA',  gpio: 2,  nano: 'D18', cat: 'strap', fn: 'SDA', info: 'I²C SDA del header y sensores · strapping (MTMS)' },
    { id: 'SCL',  silk: 'SCL',  gpio: 3,  nano: 'D19', cat: 'strap', fn: 'SCL', info: 'I²C SCL del header y sensores · strapping (MTDI)' },
    { id: 'D21',  silk: 'D21',  gpio: 6,  nano: 'D21', cat: 'safe',  fn: 'A6',  info: 'ADC1_CH5 · compartido con SCL del Qwiic' },
    { id: 'RGB',  silk: 'RGB',  gpio: null, cat: 'neo',   fn: 'NEO OUT', info: 'Salida de datos del NeoPixel (DO), para encadenar más LEDs' },
    { id: 'VUSB', silk: 'VUSB', gpio: null, cat: 'power', fn: '',      info: '5 V del conector USB-C' },
    { id: 'GND1', silk: 'GND',  gpio: null, cat: 'gnd',   fn: '',      info: 'Tierra' },
    { id: 'GND2', silk: 'GND',  gpio: null, cat: 'gnd',   fn: '',      info: 'Tierra' },
    { id: 'VIN',  silk: 'VIN',  gpio: null, cat: 'power', fn: '',      info: 'Entrada de alimentación' },
  ];
  const RIGHT = [
    { id: 'D12',  silk: 'D12',  gpio: 26, nano: 'D12', cat: 'strap', fn: 'MISO',   info: 'SPI MISO · strapping' },
    { id: 'D11',  silk: 'D11',  gpio: 7,  nano: 'D11', cat: 'strap', fn: 'MOSI',   info: 'SPI MOSI · strapping' },
    { id: 'D10',  silk: 'D10',  gpio: 10, nano: 'D10', cat: 'safe',  fn: 'SS',     info: 'SPI SS' },
    { id: 'D9',   silk: 'D9',   gpio: 14, nano: 'D9',  cat: 'bus',   fn: 'USB D+', info: 'USB nativo D+ (USB-Serial-JTAG)' },
    { id: 'D8',   silk: 'D8',   gpio: 13, nano: 'D8',  cat: 'bus',   fn: 'USB D−', info: 'USB nativo D− (USB-Serial-JTAG)' },
    { id: 'D7',   silk: 'D7',   gpio: 25, nano: 'D7',  cat: 'strap', fn: '',       info: 'GPIO · strapping' },
    { id: 'D6',   silk: 'D6',   gpio: 24, nano: 'D6',  cat: 'safe',  fn: '',       info: 'GPIO' },
    { id: 'D5',   silk: 'D5',   gpio: 23, nano: 'D5',  cat: 'safe',  fn: '',       info: 'GPIO' },
    { id: 'D4',   silk: 'D4',   gpio: 9,  nano: 'D4',  cat: 'safe',  fn: '',       info: 'GPIO' },
    { id: 'D3',   silk: 'D3',   gpio: 28, nano: 'D3',  cat: 'strap', fn: 'BOOT',   info: 'Botón BOOT · strapping de arranque' },
    { id: 'D2',   silk: 'D2',   gpio: 0,  nano: 'D2',  cat: 'neo',   fn: 'NEO IN', info: 'Entrada de datos del NeoPixel (NEOP_DIN) según esquemático v1.2.3' },
    { id: 'GND3', silk: 'GND',  gpio: null, cat: 'gnd',   fn: '',      info: 'Tierra' },
    { id: 'RST',  silk: 'RST',  gpio: null, cat: 'ctrl',  fn: '',      info: 'Reset (CHIP_PU)' },
    { id: 'RX',   silk: 'RX0',  gpio: 12, nano: 'D0',  cat: 'bus',   fn: 'RX',     info: 'UART0 RX' },
    { id: 'TX',   silk: 'TX0',  gpio: 11, nano: 'D1',  cat: 'bus',   fn: 'TX',     info: 'UART0 TX' },
  ];
  const QWIIC = [
    { id: 'Q_GND', silk: 'GND', gpio: null, cat: 'gnd' },
    { id: 'Q_3V3', silk: '3V3', gpio: null, cat: 'power' },
    { id: 'Q_SDA', silk: 'SDA', gpio: 1, cat: 'safe' },
    { id: 'Q_SCL', silk: 'SCL', gpio: 6, cat: 'safe' },
  ];
  const CATS = {
    safe:  { label: 'GPIO seguro',            color: '#e0a526' },
    strap: { label: 'strapping', color: '#c9302c' },
    bus:   { label: 'USB / UART0',            color: '#2e7db5' },
    power: { label: 'alimentación',           color: '#d4561e' },
    gnd:   { label: 'masa',                   color: '#46504c' },
    ctrl:  { label: 'control',                color: '#d23b78' },
    neo:   { label: 'NeoPixel',               color: '#8a5ac4' },
  };

  // ---- geometry (mm -> px) ---------------------------------------------
  const S = 8;                       // px por mm
  const BW = 17.78 * S, BH = 43.18 * S;
  const BX = 178, BY = 18;           // origen de la tarjeta
  const VBW = BX * 2 + BW;           // ancho total simétrico
  const pinY = i => BY + (3.81 + 2.54 * i) * S;
  const mx = x => BX + x * S, my = y => BY + y * S;

  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  function css(prefix) {
    return `
.${prefix} text{font-family:var(--pp-mono,"JetBrains Mono","IBM Plex Mono",ui-monospace,Menlo,monospace)}
.${prefix} .bd{fill:var(--pp-board,#1c2521);stroke:var(--pp-board-edge,#0f1513);stroke-width:1.5}
.${prefix} .hole{fill:var(--pp-bg,#f5f5f0)}
.${prefix} .cmp{fill:var(--pp-part,#2a3531);stroke:var(--pp-part-edge,#435049);stroke-width:.8}
.${prefix} .cmpo{fill:none;stroke:var(--pp-part-edge,#435049);stroke-width:.8;stroke-dasharray:3 2}
.${prefix} .usb{fill:var(--pp-metal,#9ca7a2);stroke:var(--pp-metal-edge,#77827d);stroke-width:.8}
.${prefix} .jst{fill:var(--pp-jst,#c8662a)}
.${prefix} .silk{fill:var(--pp-silk,#7d8b85);font-size:6.5px;letter-spacing:.06em}
.${prefix} .chip{fill:var(--pp-silk,#7d8b85);font-size:6px;letter-spacing:.04em}
.${prefix} .nm{fill:var(--pp-text,#2d3330);font-size:10px;font-weight:600}
.${prefix} .gp{fill:var(--pp-muted,#8b918b);font-size:9px}
.${prefix} .fn{fill:var(--pp-muted,#6c726c);font-size:8.5px}
.${prefix} .fnb{fill:var(--pp-chip,#ebebe4);stroke:var(--pp-line,#d6d6cc);stroke-width:.8}
.${prefix} .tag text{fill:#fff;font-size:8.5px;font-weight:700;letter-spacing:.05em}
.${prefix} .lead{stroke:var(--pp-accent,#c45a1a);stroke-width:1;stroke-dasharray:2 2;fill:none}
.${prefix} .qlead{stroke:var(--pp-muted,#8b918b);stroke-width:.8;fill:none}
.${prefix} .ring{fill:none;stroke:var(--pp-accent,#c45a1a);stroke-width:1.6}
.${prefix} .pin{cursor:default}
.${prefix} .pin:hover .dot{stroke:var(--pp-text,#2d3330);stroke-width:1.2}
.${prefix} .lg{fill:var(--pp-muted,#6c726c);font-size:9px}
`;
  }

  function board(p) {
    const o = [];
    // tarjeta con esquinas redondeadas
    o.push(`<rect class="bd" x="${BX}" y="${BY}" width="${BW}" height="${BH}" rx="${1.1 * S}"/>`);
    // USB-C (sobresale del borde superior)
    o.push(`<rect class="usb" x="${mx(4.42)}" y="${my(-1.1)}" width="${8.94 * S}" height="${7.3 * S}" rx="${1.6 * S}"/>`);
    o.push(`<rect fill="var(--pp-board,#1c2521)" opacity=".55" x="${mx(5.6)}" y="${my(-0.5)}" width="${6.6 * S}" height="${1.6 * S}" rx="${0.8 * S}"/>`);
    o.push(`<text class="chip" x="${mx(8.89)}" y="${my(5.3)}" text-anchor="middle" fill="#3a4440" style="fill:var(--pp-board,#1c2521)">USB-C</text>`);
    // botones BOOT / RST
    for (const [x, t] of [[3.18, 'BOOT'], [14.66, 'RST']]) {
      o.push(`<rect class="cmp" x="${mx(x - 0.8)}" y="${my(2.65)}" width="${1.6 * S}" height="${2.6 * S}" rx="2"/>`);
      o.push(`<circle cx="${mx(x)}" cy="${my(3.95)}" r="${0.45 * S}" fill="var(--pp-metal,#9ca7a2)"/>`);
      o.push(`<text class="chip" x="${mx(x)}" y="${my(6.6)}" text-anchor="middle">${t}</text>`);
    }
    // sensores y periféricos (contornos sobrios, posiciones del pick and place)
    const parts = [
      [12.90, 11.26, 3, 3], [12.66, 16.09, 2, 2], [7.79, 13.39, 2, 2], [6.46, 16.41, 4, 2],
      [4.39, 10.66, .8, .8], [4.06, 8.95, 1.5, 1.5], [4.77, 25.80, 3, 4], [10.31, 36.36, 1.6, 1.2],
    ];
    for (const [x, y, w, h] of parts) o.push(`<rect class="cmp" x="${mx(x - w / 2)}" y="${my(y - h / 2)}" width="${w * S}" height="${h * S}" rx="1"/>`);
    o.push(`<text class="chip" x="${mx(9.6)}" y="${my(9.2)}" text-anchor="middle">SENSORES</text>`);
    // microSD
    o.push(`<rect class="cmpo" x="${mx(3.3)}" y="${my(17.95)}" width="${11.2 * S}" height="${5.5 * S}" rx="2"/>`);
    o.push(`<text class="chip" x="${mx(8.9)}" y="${my(21.0)}" text-anchor="middle">microSD</text>`);
    // ESP32-C5
    o.push(`<rect class="cmp" x="${mx(7.57)}" y="${my(27.23)}" width="${6 * S}" height="${6 * S}" rx="2"/>`);
    o.push(`<text class="chip" x="${mx(10.57)}" y="${my(30.0)}" text-anchor="middle">ESP32-C5</text>`);
    o.push(`<text class="chip" x="${mx(10.57)}" y="${my(31.2)}" text-anchor="middle" opacity=".7">HR8</text>`);
    // antena y U.FL
    o.push(`<rect class="cmp" x="${mx(3.11)}" y="${my(36.36)}" width="${1.6 * S}" height="${.8 * S}" rx="1"/>`);
    o.push(`<circle class="cmp" cx="${mx(5.33)}" cy="${my(40.88)}" r="${1.25 * S}"/>`);
    o.push(`<circle cx="${mx(5.33)}" cy="${my(40.88)}" r="${0.45 * S}" fill="var(--pp-metal,#9ca7a2)"/>`);
    o.push(`<text class="chip" x="${mx(5.33)}" y="${my(38.9)}" text-anchor="middle">U.FL</text>`);
    // LED RGB
    o.push(`<rect x="${mx(14.06)}" y="${my(36.6)}" width="${S}" height="${S}" rx="1.5" fill="#f1efe6"/>`);
    o.push(`<text class="chip" x="${mx(14.56)}" y="${my(35.8)}" text-anchor="middle">RGB</text>`);
    // Qwiic
    o.push(`<rect class="jst" x="${mx(8.56)}" y="${my(38.4)}" width="${6 * S}" height="${4.2 * S}" rx="2"/>`);
    o.push(`<text class="tag" x="${mx(11.56)}" y="${my(40.9)}" text-anchor="middle" style="fill:#fff;font-size:6.5px;font-weight:700;letter-spacing:.06em">QWIIC</text>`);
    // agujeros de montaje
    for (const [x, y] of [[1.27, 1.27], [16.51, 1.27], [1.27, 41.91], [16.51, 41.91]]) o.push(`<circle class="hole" cx="${mx(x)}" cy="${my(y)}" r="${0.85 * S}"/>`);
    return o.join('');
  }

  function catColor(c) { return (CATS[c] || CATS.safe).color; }

  function pinRow(pin, i, side, opts) {
    const y = pinY(i), left = side === 'L';
    const cx = left ? mx(1.27) : mx(16.51);
    const used = opts.used && Object.prototype.hasOwnProperty.call(opts.used, pin.id) ? opts.used[pin.id] : null;
    const col = catColor(pin.cat);
    const o = [];
    const title = [pin.silk, pin.gpio != null ? 'GPIO' + pin.gpio : null, pin.nano && pin.nano !== pin.silk ? pin.nano : null, pin.info].filter(Boolean).join(' · ');
    o.push(`<g class="pin" data-pin="${esc(pin.id)}"><title>${esc(title)}</title>`);
    // etiqueta serigrafía y GPIO
    const nmX = left ? BX - 7 : BX + BW + 7;
    const gpX = left ? BX - 38 : BX + BW + 38;
    const anchor = left ? 'end' : 'start';
    o.push(`<text class="nm" x="${nmX}" y="${y + 3.5}" text-anchor="${anchor}">${esc(pin.silk)}</text>`);
    if (pin.gpio != null) o.push(`<text class="gp" x="${gpX}" y="${y + 3.2}" text-anchor="${anchor}">GP${pin.gpio}</text>`);
    // columna exterior: etiqueta de la lección o función de referencia
    const tagW = 52, tagH = 14;
    const tagX = left ? 6 : VBW - 6 - tagW;
    const textEdge = left ? (pin.gpio != null ? gpX - 26 : nmX - 26) : (pin.gpio != null ? gpX + 26 : nmX + 26);
    if (used != null) {
      const tc = pin.cat === 'power' ? CATS.power.color : pin.cat === 'gnd' ? CATS.gnd.color : 'var(--pp-accent,#c45a1a)';
      const x1 = left ? tagX + tagW + 3 : textEdge + 4, x2 = left ? textEdge - 4 : tagX - 3;
      if (x2 > x1) o.push(`<line class="lead" x1="${x1}" y1="${y}" x2="${x2}" y2="${y}"/>`);
      o.push(`<g class="tag"><rect x="${tagX}" y="${y - tagH / 2}" width="${tagW}" height="${tagH}" rx="2.5" style="fill:${tc}"/>`);
      o.push(`<text x="${tagX + tagW / 2}" y="${y + 3}" text-anchor="middle">${esc(used)}</text></g>`);
    } else if (opts.mode === 'reference' && pin.fn) {
      o.push(`<rect class="fnb" x="${tagX}" y="${y - tagH / 2}" width="${tagW}" height="${tagH}" rx="2.5"/>`);
      o.push(`<text class="fn" x="${tagX + tagW / 2}" y="${y + 3}" text-anchor="middle">${esc(pin.fn)}</text>`);
    }
    // pad
    if (used != null) o.push(`<circle class="ring" cx="${cx}" cy="${y}" r="${0.95 * S}"/>`);
    o.push(`<circle class="dot" cx="${cx}" cy="${y}" r="${(used != null ? 0.7 : 0.55) * S}" style="fill:${col}"/>`);
    o.push(`</g>`);
    return o.join('');
  }

  function qwiicRow(opts) {
    const o = [];
    const by = BY + BH, ly = by + 26, cx = mx(11.56);
    const offs = [-1.5, -0.5, 0.5, 1.5];
    const xs = [-48, -16, 16, 48];
    QWIIC.forEach((q, k) => {
      const px = cx + offs[k] * S, lx = cx + xs[k];
      const used = opts.used && Object.prototype.hasOwnProperty.call(opts.used, q.id) ? opts.used[q.id] : null;
      const col = used != null ? (q.cat === 'power' ? CATS.power.color : q.cat === 'gnd' ? CATS.gnd.color : 'var(--pp-accent,#c45a1a)') : catColor(q.cat);
      o.push(`<g class="pin" data-pin="${q.id}"><title>Qwiic ${q.silk}${q.gpio != null ? ' · GPIO' + q.gpio : ''}</title>`);
      o.push(`<path class="qlead" d="M${px} ${by - 2} L${px} ${by + 4} L${lx} ${ly - 9}"/>`);
      o.push(`<rect x="${lx - 14}" y="${ly - 8}" width="28" height="14" rx="7" style="fill:${col}"/>`);
      o.push(`<text x="${lx}" y="${ly + 2}" text-anchor="middle" style="fill:#fff;font-size:8px;font-weight:700">${used != null ? esc(used) : q.silk}</text>`);
      if (q.gpio != null) o.push(`<text class="gp" x="${lx}" y="${ly + 18}" text-anchor="middle">GP${q.gpio}</text>`);
      o.push(`</g>`);
    });
    return o.join('');
  }

  function legend(y) {
    const keys = Object.keys(CATS);
    const o = [];
    const colW = (VBW - 20) / 4;
    keys.forEach((k, i) => {
      const x = 10 + (i % 4) * colW, yy = y + Math.floor(i / 4) * 16;
      o.push(`<circle cx="${x + 4}" cy="${yy - 3}" r="4" style="fill:${CATS[k].color}"/><text class="lg" x="${x + 13}" y="${yy}">${CATS[k].label}</text>`);
    });
    return o.join('');
  }

  /**
   * Genera el SVG como string.
   * opts.mode: 'lesson' (solo etiquetas de la lección) | 'reference' (función de cada pin)
   * opts.used: { pinId: 'ETIQUETA' }  ids: D0..D21 por nombre de serigrafía, 3V3, EN, VBAT, A1, A2, A3,
   *            SDA, SCL, RGB, VUSB, VIN, GND1, GND2, GND3, RST, RX, TX, Q_GND, Q_3V3, Q_SDA, Q_SCL
   * opts.legend: dibuja la leyenda dentro del SVG
   * opts.title: texto accesible
   */
  function svg(opts = {}) {
    opts = Object.assign({ mode: 'lesson', used: {}, legend: false, title: 'Pinout Pulsar C5, vista superior' }, opts);
    const uid = 'pp' + Math.random().toString(36).slice(2, 7);
    const qBottom = BY + BH + 52;
    const H = opts.legend ? qBottom + 40 : qBottom;
    return `<svg xmlns="http://www.w3.org/2000/svg" class="${uid}" viewBox="0 0 ${VBW} ${H}" role="img" aria-label="${esc(opts.title)}">` +
      `<title>${esc(opts.title)}</title><style>${css(uid)}</style>` +
      board() +
      LEFT.map((p, i) => pinRow(p, i, 'L', opts)).join('') +
      RIGHT.map((p, i) => pinRow(p, i, 'R', opts)).join('') +
      qwiicRow(opts) +
      (opts.legend ? legend(qBottom + 14) : '') +
      `</svg>`;
  }

  function render(el, opts) { el.innerHTML = svg(opts); return el.firstChild; }

  return { svg, render, LEFT, RIGHT, QWIIC, CATS };
});
