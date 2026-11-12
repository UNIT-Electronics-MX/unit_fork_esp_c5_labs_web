// PN532 lessons on the Pulsar C5. The scripts and driver are read from esp-labs.
import type { LessonEntry } from "@/domain/lesson";

const SETUP = "Unplug USB. Set PN532 V3 switch 1 ON and switch 2 OFF. Wire the four I²C pins as in R1. Open <b>Code</b>, install <code>pn532.py</code> once, and connect the MicroPython REPL.";
const BASE = {
  kind: "lesson", track: "rfid", status: "MicroPython · PN532 I²C", cmd: "",
  commandsIntro: "Run the named script from <b>Code</b>. For R7 and R8, type the commands at the MicroPython REPL after the script starts. The grey label shows where each action happens.",
  pins: [
    { pin: "3V3", idx: 1, role: "VCC", side: "L", kind: "power" },
    { pin: "1", idx: 4, role: "SDA", side: "L", kind: "rfid" },
    { pin: "6", idx: 9, role: "SCL", side: "L", kind: "rfid" },
    { pin: "GND", idx: 12, role: "GND", side: "L", kind: "gnd" },
  ],
  wiring: {
    head: ["PN532 V3 I²C", "Pulsar C5", "Purpose"],
    rows: [
      ["VCC", "3V3", "Power the module at 3.3 V"],
      ["GND", "GND", "Common ground"],
      ["SDA", "QWIIC SDA / GPIO1", "I²C data"],
      ["SCL", "QWIIC SCL / GPIO6", "I²C clock"],
    ],
  },
} as const;

export const rfidLessons = [
  {
    ...BASE, id: "R1", title: "Wire PN532", heading: "Connect and identify the PN532 V3",
    goal: "Replace the RC522 SPI wiring with four PN532 I²C wires and verify the reader firmware before using a card.",
    goalLine: "Read a stable PN532 firmware version three times on the Pulsar C5.",
    goalCheck: ["The I²C scan contains <code>0x24</code>.", "Three lines report IC <code>0x32</code> without a bus or checksum error."],
    learn: ["PN532 V3 switches", "QWIIC GPIO1/6", "7-bit I²C address", "command frames"],
    panels: [{ title: "How the I²C check works", body: [
      "The Pulsar C5 scans the I²C bus on GPIO1 (SDA) and GPIO6 (SCL). A correctly wired PN532 in I²C mode answers at the 7-bit address <code>0x24</code>.",
      "The script requests the chip and firmware version three times, then prepares the reader for card detection. Repeated matching answers show that commands and responses can travel over the bus before a card is involved.",
    ] }],
    commands: [{ command: "rfid_r1_pn532.py", where: "app", card: "off", does: "Scans I²C, reads the PN532 firmware three times and configures the reader.", see: "<code>0x24</code> appears in the scan and all three lines show IC <code>0x32</code>." }],
    steps: [SETUP, "Run <code>rfid_r1_pn532.py</code> with no card nearby.", "Check address 0x24 and compare the three firmware readings."],
    note: "Use the PN532's I²C SDA/SCL pins, not its SPI pins. MicroPython shows 7-bit address <code>0x24</code>; NXP's manual calls its 8-bit write address <code>0x48</code>. QWIIC GPIO1/6 needs pull-ups on the module or wiring. Power the module from 3V3.",
    preview: { widget: "pn532Lab", view: 1 },
  },
  {
    ...BASE, id: "R2", title: "Wake a card", heading: "Detect one ISO14443-A card",
    goal: "Activate one nearby card and read its UID, ATQA and SAK. Lift it to observe removal.",
    goalLine: "See one detection per placement and a removal when the card leaves the antenna.",
    goalCheck: ["A card prints UID, ATQA and SAK.", "Moving it away prints <code>Card removed</code>."],
    learn: ["ISO14443-A", "UID", "ATQA", "SAK", "passive activation"],
    panels: [{ title: "How card detection works", body: [
      "The PN532 repeatedly searches for one ISO14443-A target. When a card enters the antenna field, it activates the card and returns its UID, ATQA and SAK to MicroPython.",
      "The script remembers the last UID, so a card held in place prints once. After three scans without a card it prints <code>Card removed</code>; presenting it again starts a new detection.",
    ] }],
    commands: [
      { command: "rfid_r2_pn532.py", where: "app", card: "on", does: "Polls the PN532 and prints a new card's UID, ATQA and SAK once.", see: "One <code>UID</code> line appears when you place the card." },
      { command: "Lift the card", where: "hands", card: "off", does: "Lets three scans pass without a detected card, clearing the remembered UID.", see: "<code>Card removed</code> appears; the next placement prints the UID again." },
    ],
    steps: [SETUP, "Run <code>rfid_r2_pn532.py</code> and place one card flat on the antenna.", "Lift it and present it again; compare the UIDs."],
    note: "A UID identifies a card for this exercise but is not a secure credential. This script asks the PN532 for one target per scan.",
    preview: { widget: "pn532Lab", view: 2 },
  },
  {
    ...BASE, id: "R3", title: "Who's there", heading: "Build a sequential card inventory",
    goal: "Present several cards one at a time and count each unique UID.",
    goalLine: "Make an inventory of at least two different cards.",
    goalCheck: ["Each distinct card appears in the list.", "Presenting one again increases its count."],
    learn: ["anticollision", "selection", "UID length", "sequential inventory"],
    panels: [{ title: "How the inventory works", body: [
      "Each scan asks the PN532 to select one card. The script converts its UID to text and uses that UID as a key in a dictionary of encounter counts.",
      "A card held on the antenna is counted only once until it is lifted. Presenting it again increases its count; pressing Ctrl+C prints the complete list. Cards are read one at a time.",
    ] }],
    commands: [
      { command: "rfid_r3_pn532.py", where: "app", card: "on", does: "Adds each newly presented UID to the inventory or increases its count.", see: "Each tap prints the UID, SAK and number of times seen." },
      { command: "Ctrl+C", where: "serial", card: "any", does: "Stops the scan loop and prints the saved counts.", see: "<code>Unique cards</code> and one count per UID appear." },
    ],
    steps: [SETUP, "Run <code>rfid_r3_pn532.py</code>. Tap two cards separately and lift each between taps.", "Press Ctrl+C to print the final counts."],
    note: "This is a sequential inventory, not simultaneous reading of overlapping tags. ISO14443-A UIDs may be 4, 7 or 10 bytes.",
    preview: { widget: "pn532Lab", view: 3 },
  },
  {
    ...BASE, id: "R4", title: "Inside a tag", heading: "Read user memory",
    goal: "Read MIFARE Classic block 4 with the factory Key A, or Type 2 pages 8–11.",
    goalLine: "See 16 data bytes from a tag you own without changing them.",
    goalCheck: ["The script prints Classic block 4 or Type 2 pages 8–11.", "The result has 16 hexadecimal bytes."],
    learn: ["Classic authentication", "factory Key A", "Type 2 pages", "user data"],
    panels: [{ title: "How a memory read works", body: [
      "After detecting a tag, the script uses its response to choose a supported memory path. For MIFARE Classic it authenticates sector 1 with Key A or B, then reads data block 4. For a supported Type 2 tag it reads pages 8–11.",
      "Both paths return 16 data bytes. A Classic authentication error <code>0x14</code> means the chosen sector key did not open that block; the script reports the error and makes no memory change.",
    ] }],
    commands: [{ command: "rfid_r4_pn532.py", where: "app", card: "on", does: "Detects the tag, authenticates Classic when needed and reads 16 user-data bytes.", see: "<code>Classic data block 4</code> or <code>Type 2 pages 8-11</code> followed by 16 hex bytes." }],
    steps: [SETUP, "Reinstall the updated <code>pn532.py</code> on the board, then run <code>rfid_r4_pn532.py</code> and present one test tag.", "Note its SAK and the 16 printed data bytes. If PN532 reports 0x14, enter a known sector 1 key in CLASSIC_KEY and select Key A or B with CLASSIC_KEY_TYPE."],
    note: "PN532 status 0x14 means MIFARE Classic authentication failed. The example uses factory Key A (FF FF FF FF FF FF); it cannot read block 4 if this card uses another sector 1 key. Keep the card still, or try a fresh test tag. Other tag families need their own memory commands.",
    preview: { widget: "pn532Lab", view: 4 },
  },
  {
    ...BASE, id: "R5", title: "Write & verify", heading: "Write a test data location",
    goal: "Read existing data, explicitly arm a write to a disposable tag, then verify the new bytes.",
    goalLine: "Verify a write to Classic block 4 or Type 2 page 8.",
    goalCheck: ["The first run prints old bytes and changes nothing.", "With <code>ARM_WRITE = True</code>, readback says <code>verified: True</code>."],
    learn: ["write authorization", "data blocks", "Type 2 pages", "readback"],
    panels: [{ title: "How write and readback work", body: [
      "R5 first reads the chosen user-data location. With <code>ARM_WRITE = False</code> it stops there; no write command is sent. Classic block 4 needs sector 1 authentication before either reading or writing.",
      "After you explicitly set <code>ARM_WRITE = True</code>, the script writes 16 bytes to Classic block 4 or 4 bytes to Type 2 page 8. It reads the same location again and prints <code>verified: True</code> only when the bytes match.",
    ] }],
    commands: [
      { command: "ARM_WRITE = False", where: "app", card: "on", does: "Reads the original data and leaves the tag unchanged.", see: "The old bytes and <code>Read-only pass complete</code> appear." },
      { command: "ARM_WRITE = True", where: "app", card: "on", does: "Writes the example bytes to the disposable tag and reads them back for comparison.", see: "<code>After:</code> shows the new bytes and <code>verified: True</code>." },
    ],
    steps: [SETUP, "Reinstall the updated <code>pn532.py</code> on the board. Use a disposable tag you own. Run <code>rfid_r5_pn532.py</code> with <code>ARM_WRITE = False</code> and record old data.", "Set <code>ARM_WRITE = True</code>, rerun with the same tag and check readback."],
    note: "This overwrites Classic block 4 (16 bytes) or Type 2 page 8 (4 bytes). It never writes manufacturer or lock data or Classic sector trailers. For PN532 status 0x14, enter a known sector 1 key in CLASSIC_KEY; no bytes are changed when authentication fails. Reset ARM_WRITE to False afterward.",
    preview: { widget: "pn532Lab", view: 5 },
  },
  {
    ...BASE, id: "R6", title: "Field edge", heading: "Measure the PN532 field edge",
    goal: "Measure detection rate and read time at four card positions.",
    goalLine: "Record hits out of ten at four measured positions.",
    goalCheck: ["The script prints four hit counts and average scan times.", "Moving beyond range lowers the hit count."],
    learn: ["antenna alignment", "read probability", "scan latency", "experimental controls"],
    panels: [{ title: "How the field test works", body: [
      "At each of four positions the script runs ten card-detection attempts. It counts successful reads and measures the time spent scanning, then prints hits out of ten and the average scan time.",
      "Keep the same tag and orientation while changing only its position. The PN532 result does not include signal strength, so the hit count is the practical indication of the field edge in this experiment.",
    ] }],
    commands: [{ command: "rfid_r6_pn532.py", where: "app", card: "move", does: "Measures ten scans at each of four card positions.", see: "Four lines report <code>hits/10</code> and average milliseconds per scan." }],
    steps: [SETUP, "Run <code>rfid_r6_pn532.py</code> with one tag.", "At each prompt hold it still: flat, 1 cm, 2 cm and near the edge. Record hits/10."],
    note: "The passive target response has no RSSI. Hits per ten scans is the observable metric; distance depends on tag and orientation.",
    preview: { widget: "pn532Lab", view: 6 },
  },
  {
    ...BASE, id: "R7", title: "Card manager", heading: "Manage a simulated door locally",
    goal: "Store a UID allowlist on the C5, enroll cards, block one and print access decisions in the console.",
    goalLine: "See GRANTED for an enrolled card, then DENIED after blocking it.",
    goalCheck: ["<code>enroll NAME</code> saves a tapped card.", "<code>check</code> changes from GRANTED to DENIED after <code>block UID</code>."],
    learn: ["local persistence", "allowlist", "blocked state", "UID limitations"],
    panels: [{ title: "How the simulated door decides", body: [
      "The PN532 reads a card UID; the C5 looks it up in <code>rfid_r7_cards.json</code>. Enrolling adds a name and an allowed state, while blocking changes that saved state.",
      "The <code>check</code> command prints GRANTED only for an enrolled, unblocked UID. The decision stays in the REPL; this exercise does not control a physical lock. The JSON file preserves the list after a restart.",
    ] }],
    commands: [
      { command: "enroll Ada", card: "on", does: "Reads the tapped UID and saves it with the name Ada in the local allowlist.", see: "<code>Enrolled</code> appears with the UID and name." },
      { command: "check", card: "on", does: "Looks up the tapped UID and its blocked state.", see: "The enrolled card prints <code>GRANTED</code>." },
      { command: "block UID", card: "any", does: "Marks that saved UID as blocked in the local file.", see: "The REPL prints <code>block</code> and the UID." },
      { command: "check", card: "on", does: "Checks the same card against the updated allowlist.", see: "The decision changes to <code>DENIED</code>." },
    ],
    steps: [SETUP, "Run <code>rfid_r7_pn532.py</code>. Type <code>enroll Ada</code> and tap a card.", "Type <code>check</code> and tap it again. Copy its UID from <code>list</code>, run <code>block UID</code>, and check again.", "Rerun the script to confirm the list survives."],
    note: "This is a classroom simulation and does not actuate a lock. The list is in <code>rfid_r7_cards.json</code>. A UID can be copied, so this is unsuitable for real access control. The older Arduino door-app uses a different protocol.",
    preview: { widget: "pn532Lab", view: 7 },
  },
  {
    ...BASE, id: "R8", title: "Card friends", heading: "Give each card a persistent friend",
    goal: "Map UIDs to eight characters in the C5 filesystem. Two taps print a joint scene cue.",
    goalLine: "Assign two cards different friends and make a TOGETHER line.",
    goalCheck: ["<code>tap</code> prints a FRIEND line.", "A second card prints TOGETHER with both names."],
    learn: ["UID-to-character mapping", "JSON persistence", "sequential taps", "scene cues"],
    panels: [{ title: "How card friends are remembered", body: [
      "The PN532 reads a UID and the C5 associates it with one of eight character names in <code>rfid_r8_friends.json</code>. The character is stored on the board, so the tag itself is never written.",
      "Each tap prints a FRIEND line. The script also remembers the previous UID; when you tap a different card next, it prints a TOGETHER line with both characters. Reloading the script reads the saved assignments.",
    ] }],
    commands: [
      { command: "give fox", card: "on", does: "Assigns the fox character to the tapped UID and saves the mapping.", see: "A <code>FRIEND</code> line contains that UID and <code>fox</code>." },
      { command: "give robot", card: "on", does: "Assigns robot to another UID and remembers the previous card.", see: "The next <code>FRIEND</code> line is followed by <code>TOGETHER,fox,robot</code>." },
      { command: "list", card: "any", does: "Reads the saved UID-to-character assignments from the board.", see: "Both cards and their character names appear after a restart." },
    ],
    steps: [SETUP, "Run <code>rfid_r8_pn532.py</code>. Type <code>give fox</code> and tap card 1; type <code>give robot</code> and tap card 2.", "Type <code>tap</code> for each in turn. Check FRIEND and TOGETHER, then rerun and inspect <code>list</code>."],
    note: "The character lives in <code>rfid_r8_friends.json</code> on the board, not in tag memory. This MicroPython script prints scene cues; the older Arduino friends-app uses a different firmware protocol.",
    preview: { widget: "pn532Lab", view: 8 },
  },
] as const satisfies readonly LessonEntry[];
