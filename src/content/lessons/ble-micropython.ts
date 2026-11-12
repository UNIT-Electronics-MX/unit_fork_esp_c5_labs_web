// The Bluetooth LE track's language variants. Arduino is the C++ lab of each lesson (its own
// PlatformIO firmware with a screen); MicroPython runs ble_b1_listen.py ... ble_b8_host.py from
// esp-labs/examples/micropython/pulsar-c5 on the Pulsar C5, which has no screen: the views
// become serial commands, BOOT is the button and the RGB LED shows the radio.
import type { LessonVariant } from "@/domain/lesson";
import { arduinoLab, c5Script } from "./c5-script-variant";

const arduino = arduinoLab;

const SETUP =
  "Open <b>Code</b>, connect the serial REPL and press <b>Install ble_kit.py</b> once: every Bluetooth lab imports it.";

/** What every MicroPython variant shares: no firmware command, no screen widgets. */
const script = { ...c5Script, hideWidgets: ["bleScreens", "ble"] } as const;

export const bleVariants = {
  B1: [
    arduino,
    {
      ...script,
      short: "Scanner script and serial commands",
      goal: "Turn the Pulsar C5 into a Bluetooth LE listener with MicroPython's <code>bluetooth</code> module. <code>ble_b1_listen.py</code> scans all the time, guesses what each device is and takes a packet apart byte by byte, all from the serial console.",
      goalLine: "Find your own phone among the devices around you, read its packets byte by byte, and measure how often it advertises.",
      goalCheck: [
        "<code>list</code> prints a table of devices with a kind (phone, audio, keyboard…), strongest first.",
        "You picked your own phone and <code>bytes</code> shows its AD structures: Flags, then manufacturer data.",
        "<code>watch</code> prints one line per packet of your phone, and you can read its advertising interval from the <code>+… ms</code> gaps.",
        "<code>mode passive</code> makes the scan response disappear; <code>mode active</code> brings it back.",
      ],
      learn: ["bluetooth.BLE", "gap_scan()", "AD structures", "active vs passive scan", "RSSI → distance", "private addresses"],
      steps: [
        SETUP,
        "Run <code>ble_b1_listen.py</code>. <b>Checkpoint 1:</b> <code>+ active scan, 100/100 ms</code> and the RGB LED blinking blue.",
        "Type <code>list</code>. <b>Checkpoint 2:</b> a table of devices with kinds and makers.",
        "Hold your unlocked phone next to the board, type <code>pick 1</code>, then <code>bytes</code>. <b>Checkpoint 3:</b> its AD structures, and the address type <i>private (RPA)</i>.",
        "Type <code>watch</code> for ten seconds, then <code>watch off</code>. <b>Checkpoint 4:</b> you can name your phone's advertising interval.",
        "Try <code>mode passive</code> / <code>mode active</code> and <code>timing 100 30</code>, then <code>stats</code> for packets per second. BOOT: click = next device, double-click = bytes, long press = pause.",
      ],
      note: "Everything here is what devices broadcast to anyone; the board never connects to them. Don't post your neighbours' addresses. Press <b>Stop</b> before running another script: the script switches the radio off on the way out.",
    },
  ],
  B2: [
    arduino,
    {
      ...script,
      short: "Beacon script and serial commands",
      goal: "Make the Pulsar C5 a <b>beacon</b> from MicroPython: <code>ble_b2_beacon.py</code> packs button presses, the chip's temperature and uptime into its own 31-byte advertisement, then the same budget carries an iBeacon, an Eddystone-URL or just a name.",
      goalLine: "Read live values from the board on a phone without ever connecting, then switch the packet format.",
      goalCheck: [
        "nRF Connect shows <b>Bench B2</b> with manufacturer data <code>FFFF 01 …</code> that changes when you double-click BOOT.",
        "<code>bytes</code> prints both packets and how many of the 31 bytes each uses.",
        "<code>mode ibeacon</code> and <code>mode url</code> change what the phone shows.",
      ],
      learn: ["gap_advertise()", "advertising payloads", "manufacturer data", "iBeacon", "Eddystone-URL", "advertising interval"],
      steps: [
        SETUP,
        "Run <code>ble_b2_beacon.py</code>. <b>Checkpoint 1:</b> <code>+ bench ADV_NONCONN/SCAN_IND every 100 ms, 24+7 B</code>.",
        "Scan with nRF Connect or LightBlue and open <b>Bench B2</b>. Double-click BOOT and rescan: the press count in the manufacturer data goes up.",
        "Type <code>bytes</code>, then <code>mode ibeacon</code>, <code>mode url</code> and <code>mode name</code>. BOOT click also steps through the modes.",
        "Try <code>interval 1000</code>: the phone sees fewer packets. <code>adv off</code> (or a long press) silences the board.",
      ],
      note: "Anyone nearby can read what the board broadcasts: never put anything private in an advertisement. iPhone apps cannot see iBeacon frames, so try that mode on Android. MicroPython cannot set the TX power: the packet only states it.",
    },
  ],
  B3: [
    arduino,
    {
      ...script,
      short: "GATT server script",
      goal: "Run the Bench GATT service from MicroPython with <code>ble_b3_gatt.py</code>: from nRF Connect or LightBlue, set the RGB LED's colour, write a message, read the chip's temperature and subscribe to the BOOT button.",
      goalLine: "Connect from your phone and drive the board through its own GATT table.",
      goalCheck: [
        "nRF Connect connects to <b>Bench B3</b> and lists the Bench service with five named characteristics, plus Device Information and Battery.",
        "Writing <code>FF0000</code> to LED turns the RGB LED red, and the console prints <code>&lt; write LED FF 00 00</code>.",
        "After subscribing to Button, every BOOT gesture arrives as a notification.",
      ],
      learn: ["gatts_register_services()", "characteristics & descriptors", "read, write, notify", "little-endian values"],
      steps: [
        SETUP,
        "Run <code>ble_b3_gatt.py</code>. <b>Checkpoint 1:</b> <code>Advertising as Bench B3</code> and the LED blinking blue.",
        "Connect from nRF Connect or LightBlue. <b>Checkpoint 2:</b> the LED turns green and the console prints <code>+ connected</code>.",
        "Write 3 bytes to LED (<code>FF0000</code>, then <code>0000FF</code>) and some text to Message.",
        "Subscribe to Button and Temperature. Click, double-click and hold BOOT: the phone receives gesture and count.",
        "Type <code>message hello</code> and read Message from the phone. <code>led auto</code> gives the LED back to the radio.",
      ],
      note: "MicroPython does not tell the script who subscribed, so it notifies every connected phone. It also cannot ask for other connection parameters or the 2M PHY, so <code>params</code> and <code>phy</code> stay in the Arduino lab.",
    },
  ],
  B4: [
    arduino,
    {
      ...script,
      short: "Pairing script and bonds",
      goal: "Add a Vault to the Bench service with <code>ble_b4_pair.py</code>: only an encrypted, authenticated link may read it. Touch it from the phone and pairing starts; confirm the six digits with BOOT, and the board keeps the bond in <code>ble_bonds.json</code>.",
      goalLine: "Pair with numeric comparison, read the Vault, and see the bond survive a restart.",
      goalCheck: [
        "Reading Vault starts pairing, and the console prints <code>* COMPARE …</code> with the same six digits as the phone.",
        "After you click BOOT, the console prints <code>link encrypted, authenticated (MITM-safe), bonded</code> and the Vault opens.",
        "Run the script again: <code>bonds</code> still counts the phone.",
      ],
      learn: ["bond, le_secure, mitm, io", "numeric comparison", "encrypted characteristics", "_IRQ_GET_SECRET / _IRQ_SET_SECRET"],
      steps: [
        SETUP,
        "Run <code>ble_b4_pair.py</code> and connect to <b>Bench B4</b> from nRF Connect or LightBlue.",
        "Read the Vault characteristic. <b>Checkpoint 1:</b> the phone asks to pair and both sides show six digits.",
        "If they match, click BOOT (or type <code>yes</code>). <b>Checkpoint 2:</b> the link is encrypted and bonded, and the Vault reads <code>nothing here yet</code>.",
        "Write to the Vault, disconnect, press <b>Stop</b> and run the script again. <b>Checkpoint 3:</b> the phone reconnects without asking.",
        "Try <code>allow bonded</code>, then <code>forget</code>: forget the board on the phone too before pairing again.",
      ],
      note: "Set <code>LOCK_CONTROLS = True</code> at the top of the script to require encryption for LED and Message too. A long press (or <code>no</code>) refuses a pairing.",
    },
  ],
  B5: [
    arduino,
    {
      ...script,
      short: "Script for the Web Bluetooth app",
      goal: "Run <code>ble_b5_app.py</code> and talk to the board from esp-labs' Web Bluetooth app: the Bench service plus Canvas, Sensors and a speed test, with no Wi-Fi and no server.",
      goalLine: "Connect the app, draw, watch live sensors and measure how many bytes per second the link carries.",
      goalCheck: [
        "The app connects to <b>Bench B5</b> and lists the Bench service with the Canvas, Sensors, Speed and Link characteristics.",
        "Drawing in the app lights the RGB LED in the last colour and the console counts canvas commands.",
        "The speed test ends with a summary such as <code>Speed: 50000 bytes in … ms</code>.",
      ],
      learn: ["Web Bluetooth", "write without response", "notification throughput", "MTU"],
      steps: [
        SETUP,
        "Run <code>ble_b5_app.py</code>. Open the ble-app in Chrome (or Bluefy on iPhone) and connect to <b>Bench B5</b>.",
        "Draw on the sketch tab. <b>Checkpoint 1:</b> the RGB LED takes the colour you drew with; <code>canvas</code> prints the counters.",
        "Open the live tab. <b>Checkpoint 2:</b> temperature, the A2 reading and free memory update five times a second.",
        "Run the speed test from the app or type <code>speed 50000</code>. <b>Checkpoint 3:</b> a summary with bytes, milliseconds and MTU.",
      ],
      note: "The Pulsar C5 has no screen, so sketch commands are counted instead of drawn. The ESP32-C5 has no touch sensor: the touch line carries the A2 (GPIO4) reading. MicroPython reports neither RSSI nor connection parameters, so RSSI stays 0 and Link requests are only logged.",
    },
  ],
  B6: [
    arduino,
    {
      ...script,
      short: "HID keyboard script",
      goal: "Make the Pulsar C5 a Bluetooth LE keyboard with media keys from MicroPython: <code>ble_b6_keyboard.py</code> registers the standard HID service, sends key and media reports, and bonds with Just Works.",
      goalLine: "Pair the board like any keyboard, type text into your phone or computer and control its music.",
      goalCheck: [
        "<b>Bench B6</b> appears in the phone's or computer's Bluetooth settings as a keyboard and pairs without a code.",
        "<code>type hello</code> types <i>hello</i> into a text field on the paired device.",
        "BOOT click plays or pauses the music; double-click skips to the next track.",
      ],
      learn: ["HID over GATT", "Report Map", "input reports", "consumer control", "Just Works bonding"],
      steps: [
        SETUP,
        "Run <code>ble_b6_keyboard.py</code>. Pair <b>Bench B6</b> from the Bluetooth settings, not from nRF Connect.",
        "<b>Checkpoint 1:</b> the console prints <code>link encrypted, Just Works, bonded</code>.",
        "Open a notes app and type <code>type Hello from the C5</code> in the serial console. <b>Checkpoint 2:</b> the text appears.",
        "Try <code>key enter</code>, <code>key cmd+space</code> (Mac) or <code>key ctrl+alt+t</code>, and <code>media up</code>.",
        "Play some music: BOOT click = play/pause, double-click = next track, long press = mute.",
      ],
      note: "The script types with a US layout: on a computer set to another layout some symbols change. Use <code>forget</code>, and forget the board on the device too, before pairing it somewhere else.",
    },
  ],
  B7: [
    arduino,
    {
      ...script,
      short: "BLE-MIDI script",
      goal: "Turn the Pulsar C5 into a Bluetooth MIDI instrument with <code>ble_b7_midi.py</code>: the standard BLE-MIDI service, notes from BOOT and the console, tunes and a drum machine. GarageBand, a synth app or the ble-app makes the sound.",
      goalLine: "Play notes from the board in a synth app, and see notes from the app light the RGB LED.",
      goalCheck: [
        "GarageBand (Advanced → Bluetooth MIDI Devices) or the ble-app connects to <b>Bench B7</b>.",
        "BOOT clicks play the scale; double-click plays a chord.",
        "Notes played in the app print <code>&lt; note on …</code> and light the LED.",
      ],
      learn: ["BLE-MIDI", "note on / note off", "timestamps", "running status", "channel 10 drums"],
      steps: [
        SETUP,
        "Run <code>ble_b7_midi.py</code> and connect to <b>Bench B7</b> from GarageBand, a synth app or the ble-app Music tab.",
        "Click BOOT a few times. <b>Checkpoint 1:</b> the app plays the notes of the pentatonic scale.",
        "Type <code>tune twinkle</code>, then <code>seq rock</code> and <code>bpm 120</code>. <code>stop</code> (or a long press) silences everything.",
        "Play on the app's keyboard. <b>Checkpoint 2:</b> the console prints the notes and the LED changes colour.",
      ],
      note: "MIDI carries notes, not sound: the board never makes a sound itself. The ESP32-C5 has no touch sensor, so the touch keys of the Arduino lab are left out.",
    },
  ],
  B8: [
    arduino,
    {
      ...script,
      short: "Central script: explore and host",
      goal: "Swap roles with <code>ble_b8_host.py</code>: the Pulsar C5 becomes the central. It scans, connects, explores any device's GATT table (only the public basics), then pairs with your BLE keyboard or mouse and decodes its reports.",
      goalLine: "Explore a device's services, then type on a Bluetooth keyboard and read the text in the console.",
      goalCheck: [
        "<code>connect 1</code> prints the device's services and characteristics, then its name, maker and battery.",
        "<code>host</code> pairs with a keyboard: you type the printed passkey on it, then Enter.",
        "Keys typed on the keyboard appear as <code>&lt; key report … | text</code> lines.",
      ],
      learn: ["central role", "gap_connect()", "GATT discovery", "CCCD subscriptions", "HID reports"],
      steps: [
        SETUP,
        "Run <code>ble_b8_host.py</code>. Put a BLE keyboard or mouse in pairing mode and type <code>list</code>.",
        "Type <code>connect 1</code> (the number from the list). <b>Checkpoint 1:</b> its services, characteristics and basics.",
        "Type <code>host</code>. A keyboard shows <code>* PASSKEY …</code>: type those digits on the keyboard, then Enter.",
        "<b>Checkpoint 2:</b> keys you press print key reports and the text so far; a mouse prints buttons and movement.",
        "<code>disconnect</code> (or a long press) hangs up and scanning starts again.",
      ],
      note: "Explore reads only standard characteristics, never vendor data. The script decodes keyboards that send 8-byte reports and prints any other report as hex. Bonds are kept in <code>ble_host_bonds.json</code>; <code>forget</code> deletes them.",
    },
  ],
} as const satisfies Readonly<Record<string, readonly LessonVariant[]>>;
