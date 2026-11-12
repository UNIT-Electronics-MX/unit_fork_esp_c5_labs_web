// Pulsar C5 P4 sensor lab for Processing 4.
// Run p4_sensor_stream.py on the board; install its five drivers first.
// P4,seq,mask,temp,rh,pressure,pressureTemp,lux,proximity,volts,soc,mx,my,mz
// mask bits: FHT40=1, LPS22HB=2, VCNL4040=4, MAX17048=8, MMC5603=16.

import processing.serial.*;

final int BAUD = 115200;
final int BG = #101923;
final int PANEL = #1C2A36;
final int INK = #EDF5F6;
final int MUTED = #93A9B4;
final int[] ACCENTS = {#FFB76A, #70C6F5, #F3DC73, #83DBAF, #CFB1FF};
final String[] NAMES = {"Temperatura y humedad", "Presión", "Luz y proximidad", "Batería LiPo", "Campo magnético"};
final String[] CHIPS = {"FHT40 · 0x44", "LPS22HB · 0x5C", "VCNL4040 · 0x60", "MAX17048 · 0x36", "MMC5603 · 0x30"};

Serial port;
int portIndex = 0;
String portName = "";
volatile String notice = "";
volatile SensorSample latest;
volatile int packets = 0;
int lastRateAt = 0;
int lastRatePackets = 0;
int sensorHz = 0;
int view = 6; // 6 = animated overview, 0 = data grid, 1..5 = one sensor

class SensorSample {
  final int seq, mask, receivedAt;
  final float[] value;

  SensorSample(int seq, int mask, float[] value, int receivedAt) {
    this.seq = seq;
    this.mask = mask;
    this.value = value;
    this.receivedAt = receivedAt;
  }

  boolean has(int sensor) { return (mask & (1 << sensor)) != 0; }
}

void setup() {
  size(1000, 680, P3D);
  smooth(2);
  surface.setResizable(true);
  frameRate(60);
  textFont(createFont("SansSerif", 16));
  openPort(0);
}

void openPort(int index) {
  if (port != null) {
    port.stop();
    port = null;
  }
  latest = null;
  sensorHz = 0;
  String[] ports = Serial.list();
  println("Serial ports:");
  printArray(ports);
  if (ports.length == 0) {
    portName = "";
    notice = "Conecta la placa y pulsa P para buscar el puerto.";
    return;
  }
  portIndex = ((index % ports.length) + ports.length) % ports.length;
  portName = ports[portIndex];
  try {
    port = new Serial(this, portName, BAUD);
    port.bufferUntil('\n');
    notice = "Puerto abierto. Esperando tramas P4 de la placa…";
  } catch (RuntimeException error) {
    notice = "No se pudo abrir " + portName + ". Pulsa P para probar otro.";
  }
}

// Processing calls this on the serial thread. Publish one complete immutable sample.
void serialEvent(Serial source) {
  String line = source.readStringUntil('\n');
  if (line == null) return;
  line = trim(line);
  if (line.startsWith("P4_WARN,")) {
    notice = line.substring(8);
    println(line); // Keep every sensor error visible in Processing's console.
    return;
  }
  String[] field = split(line, ',');
  if (field.length != 14 || !field[0].equals("P4")) return;
  try {
    int seq = Integer.parseInt(field[1]);
    int mask = Integer.parseInt(field[2]);
    if (mask < 0 || mask > 31) return;
    float[] values = new float[11];
    for (int i = 0; i < values.length; i++) {
      values[i] = field[i + 3].equals("-") ? Float.NaN : Float.parseFloat(field[i + 3]);
      if (Float.isInfinite(values[i])) return;
    }
    int[][] groups = {{0, 1}, {2, 3}, {4, 5}, {6, 7}, {8, 9, 10}};
    for (int sensor = 0; sensor < 5; sensor++) {
      if ((mask & (1 << sensor)) == 0) continue;
      for (int fieldIndex : groups[sensor]) if (Float.isNaN(values[fieldIndex])) return;
    }
    latest = new SensorSample(seq, mask, values, millis());
    packets++;
  } catch (NumberFormatException error) {
    // Ignore boot text, incomplete USB frames and malformed packets.
  }
}

void keyPressed() {
  if (key == 'p' || key == 'P') openPort(portIndex + 1);
  if (key == ESC) {
    key = 0; // ESC returns to the visual overview instead of closing Processing.
    view = 6;
  }
  if (key == 'v' || key == 'V') view = 6;
  if (key == '0' || key == 'd' || key == 'D') view = 0;
  if (key >= '1' && key <= '5') view = key - '0';
}

void draw() {
  int now = millis();
  if (now - lastRateAt >= 1000) {
    int count = packets;
    sensorHz = round((count - lastRatePackets) * 1000.0f / max(1, now - lastRateAt));
    lastRatePackets = count;
    lastRateAt = now;
  }
  background(BG);
  SensorSample sample = latest;
  boolean live = sample != null && now - sample.receivedAt < 2000;
  drawHeader(live);
  if (view == 6) drawVisualOverview(sample, live);
  else if (view == 0) drawDashboard(sample, live);
  else drawDetail(view - 1, sample, live);
  drawFooter();
}

void drawVisualOverview(SensorSample sample, boolean live) {
  float x = 28;
  float y = 99;
  float stageW = width - 388;
  float stageH = height - 180;
  noStroke();
  fill(#182A36);
  rect(x, y, stageW, stageH, 18);

  boolean warm = live && sample.has(0);
  boolean bright = live && sample.has(2);
  float temp = warm ? sample.value[0] : 20;
  float lux = bright ? max(0, sample.value[4]) : 0;
  float proximity = bright ? max(0, sample.value[5]) : 0;
  float lightLevel = constrain(log(1 + lux) / log(1001), 0, 1);
  int warmColour = lerpColor(#6EBEFF, #FF856D, constrain((temp - 18) / 18, 0, 1));
  int orbColour = bright ? lerpColor(#30445D, warmColour, 0.25 + 0.75 * lightLevel) : #526676;

  // The orbit is a visual metaphor. Temperature sets its colour, light its
  // brightness and proximity the ring spacing; it is not a physical model.
  pushMatrix();
  translate(x + stageW / 2, y + stageH * 0.49, 0);
  rotateY(millis() * 0.00055f);
  rotateX(-0.22f + sin(millis() * 0.0008f) * 0.12f);
  ambientLight(85, 95, 115);
  directionalLight(225, 225, 230, -0.5f, -0.6f, -1);
  noFill();
  stroke(ACCENTS[2], bright ? 145 : 55);
  strokeWeight(2);
  float ringSize = 265 + constrain(proximity * 0.45f, 0, 90);
  pushMatrix();
  rotateX(0.52f);
  ellipse(0, 0, ringSize, ringSize);
  popMatrix();
  pushMatrix();
  rotateY(0.75f);
  ellipse(0, 0, ringSize + 36, ringSize + 36);
  popMatrix();
  noStroke();
  fill(orbColour);
  sphereDetail(20);
  sphere(94 + 4 * sin(millis() * 0.0014f));
  popMatrix();

  hint(DISABLE_DEPTH_TEST);
  camera();
  noLights();
  textAlign(LEFT, TOP);
  fill(INK);
  textSize(21);
  text("AMBIENTE EN VIVO", x + 22, y + 18);
  fill(MUTED);
  textSize(13);
  text("Color: temperatura  ·  brillo: luz  ·  anillos: proximidad", x + 22, y + 50);
  text(live ? "La escena sigue las lecturas disponibles" : "Esperando datos de la placa", x + 22, y + stageH - 35);

  float cardX = x + stageW + 16;
  float cardW = width - cardX - 28;
  float gap = 8;
  float cardH = (stageH - 4 * gap) / 5;
  for (int sensor = 0; sensor < 5; sensor++) {
    drawVisualSensor(sensor, cardX, y + sensor * (cardH + gap), cardW, cardH, sample, live);
  }
  hint(ENABLE_DEPTH_TEST);
}

void drawVisualSensor(int sensor, float x, float y, float w, float h, SensorSample sample, boolean live) {
  noStroke();
  fill(PANEL);
  rect(x, y, w, h, 12);
  boolean available = live && sample != null && sample.has(sensor);
  fill(available ? ACCENTS[sensor] : #7B8D98);
  ellipse(x + 20, y + 24, 9, 9);
  fill(INK);
  textAlign(LEFT, TOP);
  textSize(15);
  text(NAMES[sensor], x + 36, y + 14);
  fill(MUTED);
  textSize(11);
  text(CHIPS[sensor], x + 36, y + 35);
  if (!available) {
    fill(live ? #FFB76A : MUTED);
    textSize(15);
    text(live ? "SIN LECTURA" : "ESPERANDO DATOS", x + 19, y + h - 31);
    return;
  }
  float[] v = sample.value;
  String reading = sensor == 0 ? nf(v[0], 0, 1) + " °C  ·  " + nf(v[1], 0, 1) + " % RH" :
    sensor == 1 ? nf(v[2], 0, 1) + " hPa" :
    sensor == 2 ? nf(v[4], 0, 1) + " lux  ·  prox " + int(v[5]) :
    sensor == 3 ? nf(v[6], 0, 3) + " V  ·  " + nf(v[7], 0, 1) + " %" :
    "X " + int(v[8]) + "  Y " + int(v[9]) + "  Z " + int(v[10]);
  fill(ACCENTS[sensor]);
  textSize(sensor == 4 ? 14 : 18);
  text(reading, x + 19, y + h - 34);
}

void drawHeader(boolean live) {
  fill(INK);
  textAlign(LEFT, TOP);
  textSize(27);
  text("P4  /  SENSORES INTEGRADOS", 28, 22);
  fill(MUTED);
  textSize(13);
  text("Pulsar C5 · GPIO2 SDA / GPIO3 SCL · USB 115200", 30, 61);
  fill(live ? #79DBAF : #FFB76A);
  textAlign(RIGHT, TOP);
  text(live ? "RECIBIENDO  " + sensorHz + " Hz" : "ESPERANDO DATOS", width - 28, 31);
}

void drawDashboard(SensorSample sample, boolean live) {
  float gap = 16;
  float margin = 28;
  float top = 99;
  float bottom = height - 80;
  float cardW = (width - margin * 2 - gap * 2) / 3;
  float cardH = (bottom - top - gap) / 2;
  for (int i = 0; i < 5; i++) {
    int col = i % 3;
    int row = i / 3;
    float x = margin + col * (cardW + gap);
    float y = top + row * (cardH + gap);
    drawCard(i, x, y, cardW, cardH, sample, live, false);
  }
  float x = margin + 2 * (cardW + gap);
  float y = top + cardH + gap;
  noStroke();
  fill(#16242E);
  rect(x, y, cardW, cardH, 16);
  fill(MUTED);
  textAlign(LEFT, TOP);
  textSize(15);
  text("EXPERIMENTOS", x + 22, y + 23);
  textSize(16);
  text("1–5  amplía un sensor", x + 22, y + 65);
  text("V / Esc  escena visual", x + 22, y + 96);
  text("P  cambia de puerto USB", x + 22, y + 127);
}

void drawDetail(int sensor, SensorSample sample, boolean live) {
  drawCard(sensor, 28, 99, width - 56, height - 180, sample, live, true);
}

void drawCard(int sensor, float x, float y, float w, float h, SensorSample sample, boolean live, boolean large) {
  noStroke();
  fill(PANEL);
  rect(x, y, w, h, 16);
  fill(ACCENTS[sensor]);
  rect(x, y, 6, h, 3);
  fill(INK);
  textAlign(LEFT, TOP);
  textSize(large ? 28 : 18);
  text(NAMES[sensor], x + 22, y + 20);
  fill(MUTED);
  textSize(large ? 16 : 12);
  text(CHIPS[sensor], x + 22, y + (large ? 59 : 49));
  if (!live || sample == null) {
    fill(MUTED);
    textSize(large ? 23 : 16);
    text("Esperando datos…", x + 22, y + (large ? 125 : 94));
    return;
  }
  if (!sample.has(sensor)) {
    fill(#FFB76A);
    textSize(large ? 23 : 16);
    text("Sin lectura", x + 22, y + (large ? 125 : 94));
    fill(MUTED);
    textSize(large ? 16 : 12);
    text("Revisa sensor y driver", x + 22, y + (large ? 165 : 124));
    return;
  }
  float[] v = sample.value;
  float primaryY = y + (large ? 113 : 92);
  textSize(large ? 52 : 31);
  fill(ACCENTS[sensor]);
  if (sensor == 0) text(nf(v[0], 0, 1) + " °C", x + 22, primaryY);
  if (sensor == 1) text(nf(v[2], 0, 1) + " hPa", x + 22, primaryY);
  if (sensor == 2) text(nf(v[4], 0, 1) + " lux", x + 22, primaryY);
  if (sensor == 3) text(nf(v[7], 0, 1) + " %", x + 22, primaryY);
  if (sensor == 4) text("X " + int(v[8]), x + 22, primaryY);

  float secondY = primaryY + (large ? 86 : 51);
  fill(INK);
  textSize(large ? 26 : 17);
  if (sensor == 0) text("Humedad  " + nf(v[1], 0, 1) + " %", x + 22, secondY);
  if (sensor == 1) text("Sensor  " + nf(v[3], 0, 1) + " °C", x + 22, secondY);
  if (sensor == 2) text("Proximidad  " + int(v[5]) + " cuentas", x + 22, secondY);
  if (sensor == 3) text("Celda  " + nf(v[6], 0, 3) + " V", x + 22, secondY);
  if (sensor == 4) text("Y " + int(v[9]) + "    Z " + int(v[10]), x + 22, secondY);

  float meterY = large ? y + h - 115 : y + h - 48;
  if (sensor == 0) drawMeter(x + 22, meterY, w - 44, v[1] / 100.0, ACCENTS[sensor]);
  if (sensor == 2) drawMeter(x + 22, meterY, w - 44, log(1 + max(0, v[4])) / log(10001), ACCENTS[sensor]);
  if (sensor == 3) drawMeter(x + 22, meterY, w - 44, v[7] / 100.0, ACCENTS[sensor]);
  if (large) {
    fill(MUTED);
    textSize(15);
    String description = sensor == 2 ? "Luz en escala logarítmica; proximidad en cuentas crudas." :
      sensor == 4 ? "Ejes magnéticos crudos; no indican norte sin calibración." :
      sensor == 3 ? "La carga requiere una batería LiPo conectada." :
      sensor == 1 ? "El barómetro actualiza su medición a 1 Hz." :
      "La humedad relativa va de 0 a 100 %.";
    text(description, x + 22, y + h - 49);
  }
}

void drawMeter(float x, float y, float w, float ratio, int colour) {
  noStroke();
  fill(#324451);
  rect(x, y, w, 9, 5);
  fill(colour);
  rect(x, y, w * constrain(ratio, 0, 1), 9, 5);
}

void drawFooter() {
  fill(MUTED);
  textAlign(LEFT, TOP);
  textSize(13);
  text("PUERTO  " + (portName.isEmpty() ? "ninguno" : portName) + "     P cambiar     V escena     0 datos     1–5 ampliar", 29, height - 67);
  text(notice, 29, height - 43, width - 58, 35);
}
