// How much room the pinout needs beside the board, in viewBox units. The drawing scales to its
// column, so every unit of empty margin shrinks the text: the margin covers what is drawn, no more.

const TAG_CHAR_W = 6.2; // IBM Plex Mono, 10px semibold
const TAG_MIN_W = 52;
const TAG_PADDING = 12;
/** Air between the printed labels and the drawing's edge. */
const LABEL_TAIL = 6;
/** A role tag's gap from the labels, its gap from the drawing's edge and a short stretch of leader line. */
const TAG_LEAD = 4 + 6 + 12;
/** How far past the labels the widest tag may reach; a longer tag is clipped to that room. */
const TAG_MAX = 106;

/** Where a pad's printed labels end ("GP27" set 40 units out), measured out from the board edge. */
export const LABEL_REACH = 66;

/** The width of a role tag such as "SDA · LED" before it is fitted into its room. */
export const tagWidth = (label: string): number => Math.max(TAG_MIN_W, label.length * TAG_CHAR_W + TAG_PADDING);

/**
 * The margin on each side of the board (kept equal so the board stays centred) for these role tags,
 * when the printed labels reach `reach` units out from the board.
 */
export function pinoutMargin(tagLabels: readonly string[], reach = LABEL_REACH): number {
  const labels = reach + LABEL_TAIL;
  const widest = Math.max(0, ...tagLabels.map(tagWidth));
  const needed = widest ? reach + TAG_LEAD + widest : labels;
  return Math.min(reach + LABEL_TAIL + TAG_MAX, Math.max(labels, Math.ceil(needed)));
}
