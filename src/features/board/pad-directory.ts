import type { PinSide } from "@/domain/lesson";
import { pulsarRow } from "@/domain/pulsar";

export interface PadSideGroup {
  readonly side: PinSide;
  /** Header positions (0-based), top to bottom as they sit on the board with USB-C up. */
  readonly positions: readonly number[];
}

/**
 * Groups header positions by board side, each in the order a reader sees them on the board, so
 * the table reads like the drawing beside it. Sides with no positions left are dropped.
 */
export function padsBySide(positions: readonly number[]): readonly PadSideGroup[] {
  return (["L", "R"] as const)
    .map((side) => ({
      side,
      positions: positions
        .filter((at) => pulsarRow(at).side === side)
        .sort((a, b) => pulsarRow(a).row - pulsarRow(b).row),
    }))
    .filter((group) => group.positions.length > 0);
}
