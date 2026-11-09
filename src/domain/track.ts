import type { TrackId } from "./lesson";

/** The board a track's lessons are wired on: the ESP32-S3 DevKitC-1 or the UNIT Pulsar C5. */
export type BoardId = "devkitc-s3" | "pulsar-c5";

/** A theme of lessons. `lessonIds` is the table of contents: order and membership. */
export interface Track {
  readonly id: TrackId;
  readonly title: string;
  readonly blurb: string;
  /** CSS custom property holding the track's colour, e.g. "--rfid". */
  readonly color: `--${string}`;
  readonly lessonIds: readonly string[];
  readonly planned?: boolean;
  /** Defaults to "devkitc-s3": the pinout card and pin positions follow this board. */
  readonly board?: BoardId;
}
