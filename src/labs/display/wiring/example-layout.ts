// Where things sit in the wiring examples' drawing: one viewBox shared by every example, with the
// turned Pulsar C5 on the right and the parts it feeds on the left.
import { BOARD_H_MM, BOARD_W_MM, flip } from "./pulsar-flipped";

/** Drawing units per mm, and the turned board's top-left corner. */
export const S = 7;
export const BX = 500;
export const BY = 150;
export const BW = BOARD_W_MM * S;
export const BH = BOARD_H_MM * S;
export const mx = (mm: number) => BX + mm * S;
export const my = (mm: number) => BY + mm * S;
/** How far out from the board edge a pad's name and its "GP27" are set. */
export const NAME_OUT = 9;
export const GPIO_OUT = 38;
/** Where a pad's printed labels end, measured out from the board edge. */
export const LABELS_END = 64;

/** The board's QWIIC port (given in its own frame at 11.56, 40.5 mm), after the turn, in mm. */
export const QWIIC_PORT = flip(11.56, 40.5);
