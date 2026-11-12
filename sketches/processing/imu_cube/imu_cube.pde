// IMU cube for Processing 4: turns a 3D cube with the BMI270 on the Pulsar C5.
//
// The board runs bmi270_cube.py (lesson D1, MicroPython) and prints one line per sample:
//   IMU,roll,pitch,yaw,ax,ay,az,gx,gy,gz     degrees, m/s², °/s
//   ACK,c,bx,by,bz  /  ACK,z                  answers to the keys below
//
// Keys:  c  calibrate the gyroscope (keep the sensor still)
//        z  set the yaw to zero
//        p  choose the next serial port
//
// Before running:
//  1. Disconnect the serial terminal in the web page: only one program can open the port.
//  2. Opening the port can reset the board. Save bmi270_cube.py on the board as main.py
//     (and bmi270.py beside it) so it starts by itself after a reset.

import processing.serial.*;

final int BAUD = 115200;
// Axis lines: sensor x red, sensor y green, sensor z sky blue (up), as on the web cube.

Serial port;
int portIndex = 0;
String portName = "";
float roll, pitch, yaw;              // degrees, sensor frame
float[] accel = new float[3];
float[] gyro = new float[3];
String notice = "";
volatile int lastLine = -100000;
volatile int sampleCount = 0;
int lastRateAt = 0;
int lastRateCount = 0;
int sensorHz = 0;

void setup() {
  size(800, 600, P3D);
  smooth(2);                          // 8x MSAA makes P3D lag on integrated graphics
  frameRate(60);
  textFont(createFont("SansSerif", 14));
  openPort(0);
}

void openPort(int index) {
  if (port != null) {
    port.stop();
    port = null;
  }
  String[] ports = Serial.list();
  println("Serial ports:");
  printArray(ports);
  if (ports.length == 0) {
    portName = "";
    notice = "No serial ports found: plug in the board and press p.";
    return;
  }
  portIndex = index % ports.length;
  portName = ports[portIndex];
  try {
    port = new Serial(this, portName, BAUD);
    port.bufferUntil('\n');
    notice = "Opened " + portName + ". Press p to try the next port.";
  } catch (RuntimeException e) {
    notice = "Could not open " + portName + " (busy?). Press p for the next port.";
  }
}

// Runs on the serial thread for every complete line.
void serialEvent(Serial p) {
  String line = p.readStringUntil('\n');
  if (line == null) return;
  String[] f = split(trim(line), ',');
  if (f.length == 10 && f[0].equals("IMU")) {
    float[] v = new float[9];
    for (int i = 0; i < 9; i++) {
      v[i] = float(f[i + 1]);
      if (Float.isNaN(v[i])) return;
    }
    roll = v[0];
    pitch = v[1];
    yaw = v[2];
    accel[0] = v[3]; accel[1] = v[4]; accel[2] = v[5];
    gyro[0] = v[6];  gyro[1] = v[7];  gyro[2] = v[8];
    lastLine = millis();
    sampleCount++;
  } else if (f.length >= 2 && f[0].equals("ACK")) {
    notice = f[1].equals("c") ? "Gyroscope calibrated." : "Yaw set to zero.";
  }
}

void keyPressed() {
  if (key == 'p') {
    openPort(portIndex + 1);
  } else if ((key == 'c' || key == 'z') && port != null) {
    port.write(key);                   // the board reads one character, no line ending needed
    notice = key == 'c' ? "Calibrating: keep the sensor still..." : "Zeroing the yaw...";
  }
}

void draw() {
  int now = millis();
  if (now - lastRateAt >= 1000) {
    int count = sampleCount;
    sensorHz = round((count - lastRateCount) * 1000.0 / (now - lastRateAt));
    lastRateCount = count;
    lastRateAt = now;
  }
  background(24, 30, 28);
  lights();

  pushMatrix();
  translate(width / 2, height / 2 + 20, 0);
  rotateX(-0.45);                      // look slightly down on the cube
  rotateY(0.55);
  // Processing's y points down: sensor x -> screen x, sensor y -> -z (away), sensor z -> -y (up).
  // That mapping mirrors the sensor's right-handed frame, so each turn flips sign where the axis
  // flips: yaw about sensor z, then pitch about sensor y, then roll about sensor x.
  rotateY(radians(yaw));
  rotateZ(radians(pitch));
  rotateX(radians(-roll));
  drawCube(160);
  drawAxes(170);
  popMatrix();

  drawHud();
}

// One colour per face, matching the web cube. Coordinates are Processing's (y down).
void drawCube(float s) {
  float h = s / 2;
  noStroke();
  beginShape(QUADS);
  fill(229, 72, 77);  normal( 1, 0, 0); vertex( h, -h, -h); vertex( h, -h,  h); vertex( h,  h,  h); vertex( h,  h, -h); // sensor +x
  fill(224, 80, 143); normal(-1, 0, 0); vertex(-h, -h, -h); vertex(-h,  h, -h); vertex(-h,  h,  h); vertex(-h, -h,  h); // sensor -x
  fill(58, 168, 232); normal( 0,-1, 0); vertex(-h, -h, -h); vertex(-h, -h,  h); vertex( h, -h,  h); vertex( h, -h, -h); // sensor +z (top)
  fill(62, 99, 221);  normal( 0, 1, 0); vertex(-h,  h, -h); vertex( h,  h, -h); vertex( h,  h,  h); vertex(-h,  h,  h); // sensor -z
  fill(47, 158, 106); normal( 0, 0,-1); vertex(-h, -h, -h); vertex( h, -h, -h); vertex( h,  h, -h); vertex(-h,  h, -h); // sensor +y
  fill(242, 188, 46); normal( 0, 0, 1); vertex(-h, -h,  h); vertex(-h,  h,  h); vertex( h,  h,  h); vertex( h, -h,  h); // sensor -y
  endShape();
  stroke(13, 23, 20);
  strokeWeight(2);
  noFill();
  box(s);
}

void drawAxes(float len) {
  strokeWeight(4);
  stroke(229, 72, 77);  line(0, 0, 0, len, 0, 0);   // sensor x
  stroke(47, 158, 106); line(0, 0, 0, 0, 0, -len);  // sensor y
  stroke(58, 168, 232); line(0, 0, 0, 0, -len, 0);  // sensor z (up)
}

void drawHud() {
  hint(DISABLE_DEPTH_TEST);
  camera();
  noLights();
  fill(230);
  textAlign(LEFT, TOP);
  boolean live = millis() - lastLine < 1500;
  text("Port: " + (portName.isEmpty() ? "none" : portName) + (live ? "   receiving" : "   waiting for IMU lines"), 16, 16);
  text(String.format("roll %7.1f°   pitch %7.1f°   yaw %7.1f°", roll, pitch, yaw), 16, 40);
  text(String.format("acc  %6.2f %6.2f %6.2f m/s²", accel[0], accel[1], accel[2]), 16, 64);
  text(String.format("gyro %6.1f %6.1f %6.1f °/s", gyro[0], gyro[1], gyro[2]), 16, 88);
  text("IMU " + sensorHz + " Hz   draw " + round(frameRate) + " fps", 16, 112);
  fill(160);
  text(notice, 16, height - 52);
  text("c calibrate · z zero yaw · p next port", 16, height - 28);
  hint(ENABLE_DEPTH_TEST);
}
