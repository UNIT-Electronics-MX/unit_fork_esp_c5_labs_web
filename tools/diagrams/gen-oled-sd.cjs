// Diagrama de conexión: Pulsar C5 + Qwiic Bus + OLED SSD1306 + microSD
// Genera pulsar_c5_qwiic_oled_sd.svg (vista como en la foto: USB-C abajo, Qwiic arriba)
const fs = require('fs');
const out = process.argv[2] || 'pulsar_c5_qwiic_oled_sd.svg';

const VW = 1200, VH = 700;
const S = 8, BW = 17.78 * S, BH = 43.18 * S;
const BX = 760, BY = 250;                       // Pulsar
const R = (x, y) => [BX + (17.78 - x) * S, BY + (43.18 - y) * S]; // rotado 180°
const o = [];
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');

const WIRE = { GND: '#1d1f1e', '3V3': '#d23a2a', SDA: '#1f8a4c', SCL: '#e3a91f' };

// ---------------- estilos ----------------
const css = `
text{font-family:var(--pp-mono,"JetBrains Mono","IBM Plex Mono",ui-monospace,Menlo,monospace)}
.bd{fill:var(--pp-board,#1c2521);stroke:var(--pp-board-edge,#0f1513);stroke-width:1.5}
.hole{fill:var(--pp-bg,#f5f5f0)}
.cmp{fill:var(--pp-part,#2a3531);stroke:var(--pp-part-edge,#435049);stroke-width:.8}
.metal{fill:#b9c0c4;stroke:#8a9296;stroke-width:.8}
.silk{fill:#aeb8b3;font-size:5.6px;letter-spacing:.03em}
.chip{fill:var(--pp-silk,#7d8b85);font-size:6px;letter-spacing:.04em}
.lbl{fill:var(--pp-text,#2d3330);font-size:11px;font-weight:600}
.sub{fill:var(--pp-muted,#6c726c);font-size:10px}
.cap{fill:var(--pp-muted,#6c726c);font-size:9.5px;letter-spacing:.1em}
.box{fill:var(--pp-card,#ffffff);stroke:var(--pp-line,#d6d6cc);stroke-width:1}
.lead{stroke:var(--pp-accent,#c45a1a);stroke-width:1;stroke-dasharray:3 3;fill:none}
.acc{fill:var(--pp-accent,#c45a1a)}
.ring{fill:none;stroke:var(--pp-accent,#c45a1a);stroke-width:1.6}
.oled{fill:#9fe6ff;font-size:15px;font-weight:700;letter-spacing:.06em}
.hdr{fill:#121212;stroke:#2c2c2c;stroke-width:.8}
.sock{fill:#050505}
`;

// ---------------- cable Qwiic ----------------
// k=0 es el hilo interior de la curva. Orden en el conector de la Pulsar (rotado): SCL, SDA, 3V3, GND
const sig = ['SCL', 'SDA', '3V3', 'GND'];
const qx = k => R(11.56, 0)[0] - 12 + 8 * k;   // salida del JST de la Pulsar
const qTop = BY + 0.6 * S;                       // borde del conector
const hubX = 108, hubY = k => 336 + 8 * k;       // entrada al JST izquierdo del hub
function cable(k) {
  const px = qx(k), yt = 92 - 8 * k, xl = 58 - 8 * k, yh = hubY(k), r = 110;
  return `M${px} ${qTop} L${px} ${yt + r} C${px} ${yt + r * .3} ${px - r * .3} ${yt} ${px - r} ${yt} ` +
    `L${xl + r} ${yt} C${xl + r * .3} ${yt} ${xl} ${yt + r * .3} ${xl} ${yt + r} ` +
    `L${xl} ${yh - 60} C${xl} ${yh - 18} ${xl + 18} ${yh} ${xl + 60} ${yh} L${hubX} ${yh}`;
}
const cables = [];
for (let k = 0; k < 4; k++) cables.push(`<path d="${cable(k)}" fill="none" stroke="#0b0d0c" stroke-width="7.2" stroke-linecap="round" opacity=".55"/>`);
for (let k = 0; k < 4; k++) cables.push(`<path d="${cable(k)}" fill="none" stroke="${WIRE[sig[k]]}" stroke-width="5" stroke-linecap="round"/>`);

// ---------------- Qwiic Bus (hub) ----------------
function hub() {
  const x = 108, y = 168, w = 400, h = 196;
  const g = [];
  g.push(`<path class="bd" d="M${x + 10} ${y} H${x + w - 10} Q${x + w} ${y} ${x + w} ${y + 10} V${y + h} H${x + 250} V${y + h + 34} Q${x + 250} ${y + h + 40} ${x + 244} ${y + h + 40} H${x + 156} Q${x + 150} ${y + h + 40} ${x + 150} ${y + h + 34} V${y + h} H${x} V${y + 10} Q${x} ${y} ${x + 10} ${y} Z"/>`);
  for (const [hx, hy] of [[x + 14, y + 14], [x + w - 14, y + 14]]) g.push(`<circle class="hole" cx="${hx}" cy="${hy}" r="8"/>`);
  // tres hileras de 8 conectores hembra
  for (let r = 0; r < 3; r++) {
    const ry = y + 34 + r * 42;
    g.push(`<rect class="hdr" x="${x + 52}" y="${ry}" width="${296}" height="30" rx="2"/>`);
    for (let c = 0; c < 8; c++) g.push(`<rect class="sock" x="${x + 60 + c * 36}" y="${ry + 8}" width="14" height="14" rx="1"/>`);
  }
  g.push(`<text class="silk" x="${x + 200}" y="${y + 29}" text-anchor="middle" style="font-size:7px">SDA · SCL · 3.3V · GND (bus común)</text>`);
  // JST izquierdo y derecho
  g.push(`<rect x="${x + 2}" y="${y + 154}" width="30" height="40" rx="2" fill="#efece3" stroke="#c9c4b4"/>`);
  g.push(`<rect x="${x + w - 32}" y="${y + 154}" width="30" height="40" rx="2" fill="#efece3" stroke="#c9c4b4"/>`);
  g.push(`<text class="silk" x="${x + 200}" y="${y + 172}" text-anchor="middle" style="font-size:9px;font-weight:700;letter-spacing:.12em">QWIIC BUS</text>`);
  g.push(`<text class="silk" x="${x + 200}" y="${y + 184}" text-anchor="middle" style="font-size:6.5px">UNIT ELECTRONICS</text>`);
  // pines hacia la OLED
  const pins = ['GND', '3.3V', 'SCL', 'SDA'];
  pins.forEach((p, i) => {
    const px = x + 162 + i * 25.4;
    g.push(`<circle cx="${px}" cy="${y + h + 22}" r="6" fill="#d9b44a"/><circle cx="${px}" cy="${y + h + 22}" r="2.6" fill="#141414"/>`);
    g.push(`<text class="silk" x="${px}" y="${y + h + 10}" text-anchor="middle">${p}</text>`);
  });
  return g.join('');
}

// ---------------- OLED ----------------
function oled() {
  const x = 146, y = 404, w = 324, h = 280;
  const g = [];
  g.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8" fill="#1b4f9c" stroke="#123a75" stroke-width="1.5"/>`);
  for (const [hx, hy] of [[x + 14, y + 14], [x + w - 14, y + 14], [x + 14, y + h - 14], [x + w - 14, y + h - 14]]) g.push(`<circle cx="${hx}" cy="${hy}" r="8" fill="#d9b44a"/><circle class="hole" cx="${hx}" cy="${hy}" r="5"/>`);
  const pins = ['GND', 'VCC', 'SCL', 'SDA'];
  pins.forEach((p, i) => {
    const px = 108 + 162 + i * 25.4;
    g.push(`<rect x="${px - 3}" y="${y - 18}" width="6" height="30" fill="#c8ccd0"/>`);
    g.push(`<rect x="${px - 6}" y="${y + 6}" width="12" height="12" rx="1" fill="${i === 0 ? '#d9b44a' : '#d9b44a'}"/>`);
    g.push(`<text x="${px}" y="${y + 32}" text-anchor="middle" style="fill:#e8eefc;font-size:9px;font-weight:600">${p}</text>`);
  });
  // pantalla
  g.push(`<rect x="${x + 16}" y="${y + 46}" width="${w - 32}" height="${178}" rx="3" fill="#06080b" stroke="#2a2f36"/>`);
  const lines = ['SD + OLED OK', 'Write OK', 'Read: SD OK', '', 'File: test.txt'];
  lines.forEach((t, i) => t && g.push(`<text class="oled" x="${x + 38}" y="${y + 82 + i * 30}">${esc(t)}</text>`));
  g.push(`<path d="M${x + 110} ${y + h - 30} h104 l10 30 h-124 z" fill="#2a2a2a"/>`);
  return g.join('');
}

// ---------------- Pulsar C5 (rotada, USB abajo) ----------------
const LEFT = ['D13', '3V3', 'EN', 'VBAT', 'A1', 'A2', 'A3', 'SDA', 'SCL', 'D21', 'RGB', 'VUSB', 'GND', 'GND', 'VIN'];
const RIGHT = ['D12', 'D11', 'D10', 'D9', 'D8', 'D7', 'D6', 'D5', 'D4', 'D3', 'D2', 'GND', 'RST', 'RX0', 'TX0'];
const SDPINS = { D5: 'CS', D11: 'MOSI', D12: 'MISO', D13: 'SCK' };
const pad = {};
function pulsar() {
  const g = [];
  g.push(`<rect class="bd" x="${BX}" y="${BY}" width="${BW}" height="${BH}" rx="${1.1 * S}"/>`);
  const rc = (cx, cy, w, h, cls, extra = '') => { const [X, Y] = R(cx, cy); return `<rect class="${cls}" x="${X - w * S / 2}" y="${Y - h * S / 2}" width="${w * S}" height="${h * S}" ${extra}/>`; };
  // USB-C (abajo)
  g.push(rc(8.89, 2.55, 8.94, 7.3, 'metal', `rx="${1.6 * S}"`));
  { const [X, Y] = R(8.89, 0.3); g.push(`<rect x="${X - 3.3 * S}" y="${Y - 0.8 * S}" width="${6.6 * S}" height="${1.6 * S}" rx="${.8 * S}" fill="#4a5155"/>`); }
  // botones
  for (const [x, t] of [[3.18, 'BOOT'], [14.66, 'RST']]) {
    g.push(rc(x, 3.95, 1.6, 2.6, 'cmp', 'rx="2"'));
    const [X, Y] = R(x, 3.95); g.push(`<circle cx="${X}" cy="${Y}" r="${.45 * S}" fill="#b9c0c4"/><text class="chip" x="${X}" y="${Y - 14}" text-anchor="middle">${t}</text>`);
  }
  for (const [x, y, w, h] of [[12.90, 11.26, 3, 3], [12.66, 16.09, 2, 2], [7.79, 13.39, 2, 2], [6.46, 16.41, 4, 2], [4.39, 10.66, .8, .8], [4.06, 8.95, 1.5, 1.5], [4.77, 25.80, 3, 4], [10.31, 36.36, 1.6, 1.2]])
    g.push(rc(x, y, w, h, 'cmp', 'rx="1"'));
  g.push(rc(10.57, 30.23, 6, 6, 'cmp', 'rx="2"'));
  { const [X, Y] = R(10.57, 30.23); g.push(`<text class="chip" x="${X}" y="${Y + 2}" text-anchor="middle">ESP32-C5</text>`); }
  // microSD con tarjeta
  { const [X, Y] = R(8.9, 20.7);
    g.push(`<rect x="${X - 5.6 * S}" y="${Y - 2.75 * S}" width="${11.2 * S}" height="${5.5 * S}" rx="2" fill="#c3c9cc" stroke="#8a9296"/>`);
    g.push(`<rect x="${X - 5.2 * S}" y="${Y - 2.75 * S - 9.5 * S}" width="${10.4 * S}" height="${10.2 * S}" rx="3" fill="#8f9396"/>`);
    g.push(`<rect x="${X + 0.6 * S}" y="${Y - 2.75 * S - 9.5 * S}" width="${4.6 * S}" height="${10.2 * S}" rx="3" fill="#c8202f"/>`);
    g.push(`<text x="${X - 2.5 * S}" y="${Y - 7.6 * S}" text-anchor="middle" style="fill:#fff;font-size:11px;font-weight:700">32</text>`);
    g.push(`<text x="${X - 2.5 * S}" y="${Y - 6.3 * S}" text-anchor="middle" style="fill:#fff;font-size:6px">GB · A1</text>`);
    g.push(`<text x="${X + 2.9 * S}" y="${Y - 7.2 * S}" text-anchor="middle" transform="rotate(90 ${X + 2.9 * S} ${Y - 7.6 * S})" style="fill:#fff;font-size:7px;font-weight:700">microSD</text>`);
  }
  // LED RGB y U.FL
  { const [X, Y] = R(14.56, 37.1); g.push(`<rect x="${X - 4}" y="${Y - 4}" width="8" height="8" rx="1.5" fill="#f1efe6"/>`); }
  { const [X, Y] = R(5.33, 40.88); g.push(`<circle class="cmp" cx="${X}" cy="${Y}" r="${1.25 * S}"/><circle cx="${X}" cy="${Y}" r="${.45 * S}" fill="#b9c0c4"/>`); }
  // Qwiic (arriba)
  g.push(rc(11.56, 40.5, 6, 4.2, '', 'rx="2" fill="#efece3" stroke="#c9c4b4"'));
  { const [X, Y] = R(11.56, 39.2); g.push(`<text class="chip" x="${X}" y="${Y + 12}" text-anchor="middle">QWIIC</text>`); }
  // agujeros de montaje
  for (const [x, y] of [[1.27, 1.27], [16.51, 1.27], [1.27, 41.91], [16.51, 41.91]]) { const [X, Y] = R(x, y); g.push(`<circle class="hole" cx="${X}" cy="${Y}" r="${.85 * S}"/>`); }
  // pads y serigrafía
  const pinsAt = (names, xmm) => names.forEach((n, i) => {
    const [X, Y] = R(xmm, 43.18 - (3.81 + 2.54 * i));
    const sd = SDPINS[n];
    if (sd) pad[n] = [X, Y];
    g.push(`<circle cx="${X}" cy="${Y}" r="${.62 * S}" fill="${sd ? 'var(--pp-accent,#c45a1a)' : '#d9b44a'}"/><circle cx="${X}" cy="${Y}" r="${.28 * S}" fill="#141414"/>`);
    if (sd) g.push(`<circle class="ring" cx="${X}" cy="${Y}" r="${1.0 * S}"/>`);
    const inside = X < BX + BW / 2 ? X + 10 : X - 10;
    g.push(`<text class="silk" x="${inside}" y="${Y + 2}" text-anchor="${X < BX + BW / 2 ? 'start' : 'end'}">${n}</text>`);
  });
  pinsAt(LEFT, 1.27); pinsAt(RIGHT, 16.51);
  return g.join('');
}

// ---------------- callouts ----------------
function callouts() {
  const g = [];
  // microSD
  const bx = 958, by = 330, bw = 226;
  g.push(`<rect class="box" x="${bx}" y="${by}" width="${bw}" height="168" rx="8"/>`);
  g.push(`<text class="cap" x="${bx + 14}" y="${by + 22}">MICROSD · SPI INTERNO</text>`);
  const rows = [['CS', 'D5', 23], ['MOSI', 'D11', 7], ['MISO', 'D12', 26], ['SCK', 'D13', 27]];
  rows.forEach(([f, d, gp], i) => {
    const y = by + 48 + i * 24;
    g.push(`<rect class="acc" x="${bx + 14}" y="${y - 11}" width="42" height="15" rx="2.5"/><text x="${bx + 35}" y="${y}" text-anchor="middle" style="fill:#fff;font-size:9px;font-weight:700">${f}</text>`);
    g.push(`<text class="lbl" x="${bx + 66}" y="${y}">${d}</text><text class="sub" x="${bx + 104}" y="${y}">GPIO${gp}</text>`);
  });
  g.push(`<text class="sub" x="${bx + 14}" y="${by + 152}" style="font-size:9px">Pads compartidos con la SD</text>`);
  // líneas a los pads SD (lado derecho de la placa en esta vista = D13 y lado izquierdo D5/D11/D12)
  const [x13, y13] = pad.D13; g.push(`<path class="lead" d="M${x13 + 10} ${y13} H${bx - 18} V${by + 84} H${bx}"/>`);
  // Qwiic / OLED
  const qx0 = 958, qy0 = 120, qw = 226;
  g.push(`<rect class="box" x="${qx0}" y="${qy0}" width="${qw}" height="168" rx="8"/>`);
  g.push(`<text class="cap" x="${qx0 + 14}" y="${qy0 + 22}">QWIIC · I²C</text>`);
  const qr = [['SDA', 'GPIO1', 'SDA', WIRE.SDA], ['SCL', 'GPIO6', 'SCL', WIRE.SCL], ['3V3', '3.3 V', 'VCC', WIRE['3V3']], ['GND', '0 V', 'GND', WIRE.GND]];
  qr.forEach(([s, p, ol, c], i) => {
    const y = qy0 + 48 + i * 24;
    g.push(`<rect x="${qx0 + 14}" y="${y - 7}" width="22" height="6" rx="3" fill="${c}"/>`);
    g.push(`<text class="lbl" x="${qx0 + 44}" y="${y}">${s}</text><text class="sub" x="${qx0 + 84}" y="${y}">${p}</text><text class="sub" x="${qx0 + 150}" y="${y}">→ ${ol}</text>`);
  });
  g.push(`<text class="sub" x="${qx0 + 14}" y="${qy0 + 152}" style="font-size:9px">OLED SSD1306 128×64 · dir. 0x3C</text>`);
  const [qcx] = R(11.56, 40.5);
  g.push(`<path class="lead" d="M${qcx + 22} ${qy0 + 84} H${qx0}"/>`);
  // títulos de piezas
  g.push(`<text class="cap" x="${BX + BW / 2}" y="${BY + BH + 26}" text-anchor="middle">PULSAR C5</text>`);
  g.push(`<text class="cap" x="${70}" y="${560}" text-anchor="start" transform="rotate(-90 70 560)">CABLE QWIIC · JST SH 4P</text>`);
  return g.join('');
}

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${VW} ${VH}" role="img" aria-label="Conexión Pulsar C5 con OLED SSD1306 por Qwiic y microSD">` +
  `<title>Pulsar C5 · Qwiic Bus · OLED SSD1306 · microSD</title><style>${css}</style>` +
  hub() + oled() + cables.join('') + pulsar() + callouts() + `</svg>`;
fs.writeFileSync(out, svg);
console.log('ok', svg.length);
