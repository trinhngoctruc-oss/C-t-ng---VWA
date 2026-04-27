/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum Side {
  RED = 'RED',
  BLACK = 'BLACK',
}

export enum GameMode {
  AI = 'AI',
  LOCAL = 'LOCAL',
  ONLINE = 'ONLINE',
}

export enum AiLevel {
  EASY = 'EASY',
  NORMAL = 'NORMAL',
  HARD = 'HARD',
}

export enum PieceType {
  GENERAL = 'GENERAL',
  ADVISOR = 'ADVISOR',
  ELEPHANT = 'ELEPHANT',
  HORSE = 'HORSE',
  CHARIOT = 'CHARIOT',
  CANNON = 'CANNON',
  SOLDIER = 'SOLDIER',
}

export interface Piece {
  id: string;
  type: PieceType;
  side: Side;
  x: number;
  y: number;
}

export interface Move {
  from: { x: number, y: number };
  to: { x: number, y: number };
  piece: Piece;
  captured?: Piece;
}

export const INITIAL_PIECES: Omit<Piece, 'id'>[] = [
  // Black pieces (Top)
  { type: PieceType.CHARIOT, side: Side.BLACK, x: 0, y: 0 },
  { type: PieceType.HORSE, side: Side.BLACK, x: 1, y: 0 },
  { type: PieceType.ELEPHANT, side: Side.BLACK, x: 2, y: 0 },
  { type: PieceType.ADVISOR, side: Side.BLACK, x: 3, y: 0 },
  { type: PieceType.GENERAL, side: Side.BLACK, x: 4, y: 0 },
  { type: PieceType.ADVISOR, side: Side.BLACK, x: 5, y: 0 },
  { type: PieceType.ELEPHANT, side: Side.BLACK, x: 6, y: 0 },
  { type: PieceType.HORSE, side: Side.BLACK, x: 7, y: 0 },
  { type: PieceType.CHARIOT, side: Side.BLACK, x: 8, y: 0 },
  { type: PieceType.CANNON, side: Side.BLACK, x: 1, y: 2 },
  { type: PieceType.CANNON, side: Side.BLACK, x: 7, y: 2 },
  { type: PieceType.SOLDIER, side: Side.BLACK, x: 0, y: 3 },
  { type: PieceType.SOLDIER, side: Side.BLACK, x: 2, y: 3 },
  { type: PieceType.SOLDIER, side: Side.BLACK, x: 4, y: 3 },
  { type: PieceType.SOLDIER, side: Side.BLACK, x: 6, y: 3 },
  { type: PieceType.SOLDIER, side: Side.BLACK, x: 8, y: 3 },

  // Red pieces (Bottom)
  { type: PieceType.CHARIOT, side: Side.RED, x: 0, y: 9 },
  { type: PieceType.HORSE, side: Side.RED, x: 1, y: 9 },
  { type: PieceType.ELEPHANT, side: Side.RED, x: 2, y: 9 },
  { type: PieceType.ADVISOR, side: Side.RED, x: 3, y: 9 },
  { type: PieceType.GENERAL, side: Side.RED, x: 4, y: 9 },
  { type: PieceType.ADVISOR, side: Side.RED, x: 5, y: 9 },
  { type: PieceType.ELEPHANT, side: Side.RED, x: 6, y: 9 },
  { type: PieceType.HORSE, side: Side.RED, x: 7, y: 9 },
  { type: PieceType.CHARIOT, side: Side.RED, x: 8, y: 9 },
  { type: PieceType.CANNON, side: Side.RED, x: 1, y: 7 },
  { type: PieceType.CANNON, side: Side.RED, x: 7, y: 7 },
  { type: PieceType.SOLDIER, side: Side.RED, x: 0, y: 6 },
  { type: PieceType.SOLDIER, side: Side.RED, x: 2, y: 6 },
  { type: PieceType.SOLDIER, side: Side.RED, x: 4, y: 6 },
  { type: PieceType.SOLDIER, side: Side.RED, x: 6, y: 6 },
  { type: PieceType.SOLDIER, side: Side.RED, x: 8, y: 6 },
];

export const PIECE_NAMES: Record<PieceType, Record<Side, string>> = {
  [PieceType.GENERAL]: { [Side.RED]: '帥', [Side.BLACK]: '將' },
  [PieceType.ADVISOR]: { [Side.RED]: '仕', [Side.BLACK]: '士' },
  [PieceType.ELEPHANT]: { [Side.RED]: '相', [Side.BLACK]: '象' },
  [PieceType.HORSE]: { [Side.RED]: '傌', [Side.BLACK]: '馬' },
  [PieceType.CHARIOT]: { [Side.RED]: '俥', [Side.BLACK]: '車' },
  [PieceType.CANNON]: { [Side.RED]: '炮', [Side.BLACK]: '砲' },
  [PieceType.SOLDIER]: { [Side.RED]: '兵', [Side.BLACK]: '卒' },
};
