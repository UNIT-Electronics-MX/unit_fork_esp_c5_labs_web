// Lessons of the "zigbee" track: the Pulsar C5's IEEE 802.15.4 radio, ported from Lab 6 of the
// ESP32-C6 course. Pins use the Pulsar header (src/domain/pulsar.ts).
import type { LessonEntry } from "@/domain/lesson";
import { arduinoCmd, PULSAR_STATUS } from "./arduino";

export const zigbeeLessons = [
  {
    kind: "lesson",
    id: "Z1",
    track: "zigbee",
    title: "Two-board network",
    status: PULSAR_STATUS,
    heading: "A coordinator and an end device",
    goal: "Flash one Pulsar C5 as a Zigbee <b>coordinator</b> and another as an <b>end device</b>. The end device counts once a second and reports the count; the coordinator prints what arrives.",
    learn: ["Zigbee roles", "endpoints", "clusters (ZCL)", "binding", "attribute reporting"],
    pins: [{ pin: "28", idx: 20, role: "BOOT", side: "R", kind: "btn" }],
    usb: true,
    cmd: arduinoCmd("z1-coordinator", "PartitionScheme=zigbee_zczr_8MB,ZigbeeMode=zczr"),
    wiring: {
      title: "Build options per board",
      head: ["Board", "Zigbee Mode", "Partition Scheme"],
      rows: [
        ["coordinator", "Zigbee ZCZR (coordinator/router)", "Zigbee ZCZR 8MB with spiffs"],
        ["end device", "Zigbee ED (end device)", "Zigbee 8MB with spiffs"],
      ],
    },
    steps: [
      "Flash the coordinator with the command above. It opens the network for three minutes.",
      "Flash the second board: <code>arduino-cli compile -u -p PORT2 --fqbn esp32:esp32:esp32c5:CDCOnBoot=cdc,PSRAM=enabled,FlashSize=8M,PartitionScheme=zigbee_8MB,ZigbeeMode=ed sketches/pulsar-c5/z1-end-device</code>.",
      "Watch the coordinator: <code>End device bound</code>, then the counts.",
      "Press BOOT on the coordinator to ask for a report on every change; on the end device, a short press reports at once and a 3-second hold resets its network settings.",
    ],
    note: "The count rides in the Temperature Measurement cluster, a trick from Espressif's examples. The C6 course's Labs 7 and 8 (PULSAR Stick, PULSAR Powersupply) ship ready-made C6 firmware and are not ported.",
    panels: [],
  },
] as const satisfies readonly LessonEntry[];
