/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Piece, PieceType, Side, AiLevel } from './types';

export function getPieceAt(pieces: Piece[], x: number, y: number): Piece | undefined {
  return pieces.find(p => p.x === x && p.y === y);
}

export function isValidMove(
  piece: Piece,
  toX: number,
  toY: number,
  pieces: Piece[]
): boolean {
  if (toX < 0 || toX > 8 || toY < 0 || toY > 9) return false;

  const targetPiece = getPieceAt(pieces, toX, toY);
  if (targetPiece && targetPiece.side === piece.side) return false;

  const dx = Math.abs(toX - piece.x);
  const dy = Math.abs(toY - piece.y);

  switch (piece.type) {
    case PieceType.GENERAL:
      if (toX < 3 || toX > 5) return false;
      if (piece.side === Side.BLACK && (toY < 0 || toY > 2)) return false;
      if (piece.side === Side.RED && (toY < 7 || toY > 9)) return false;
      return (dx === 1 && dy === 0) || (dx === 0 && dy === 1);

    case PieceType.ADVISOR:
      if (toX < 3 || toX > 5) return false;
      if (piece.side === Side.BLACK && (toY < 0 || toY > 2)) return false;
      if (piece.side === Side.RED && (toY < 7 || toY > 9)) return false;
      return dx === 1 && dy === 1;

    case PieceType.ELEPHANT:
      if (dx !== 2 || dy !== 2) return false;
      if (piece.side === Side.BLACK && toY > 4) return false;
      if (piece.side === Side.RED && toY < 5) return false;
      const eyeX = (piece.x + toX) / 2;
      const eyeY = (piece.y + toY) / 2;
      if (getPieceAt(pieces, eyeX, eyeY)) return false;
      return true;

    case PieceType.HORSE:
      if (!((dx === 1 && dy === 2) || (dx === 2 && dy === 1))) return false;
      const legX = dx === 2 ? (piece.x + toX) / 2 : piece.x;
      const legY = dy === 2 ? (piece.y + toY) / 2 : piece.y;
      if (getPieceAt(pieces, legX, legY)) return false;
      return true;

    case PieceType.CHARIOT:
      if (piece.x !== toX && piece.y !== toY) return false;
      return countPiecesBetween(piece.x, piece.y, toX, toY, pieces) === 0;

    case PieceType.CANNON:
      if (piece.x !== toX && piece.y !== toY) return false;
      const count = countPiecesBetween(piece.x, piece.y, toX, toY, pieces);
      if (targetPiece) {
        return count === 1;
      } else {
        return count === 0;
      }

    case PieceType.SOLDIER:
      if (piece.side === Side.BLACK) {
        if (toY < piece.y) return false;
        if (piece.y <= 4) {
          return dx === 0 && toY === piece.y + 1;
        } else {
          return (dx === 0 && toY === piece.y + 1) || (dy === 0 && dx === 1);
        }
      } else {
        if (toY > piece.y) return false;
        if (piece.y >= 5) {
          return dx === 0 && toY === piece.y - 1;
        } else {
          return (dx === 0 && toY === piece.y - 1) || (dy === 0 && dx === 1);
        }
      }

    default:
      return false;
  }
}

function countPiecesBetween(x1: number, y1: number, x2: number, y2: number, pieces: Piece[]): number {
  let count = 0;
  if (x1 === x2) {
    const minY = Math.min(y1, y2);
    const maxY = Math.max(y1, y2);
    for (let y = minY + 1; y < maxY; y++) {
      if (getPieceAt(pieces, x1, y)) count++;
    }
  } else if (y1 === y2) {
    const minX = Math.min(x1, x2);
    const maxX = Math.max(x1, x2);
    for (let x = minX + 1; x < maxX; x++) {
      if (getPieceAt(pieces, x, y1)) count++;
    }
  }
  return count;
}

export function isKingInCheck(side: Side, pieces: Piece[]): boolean {
  const king = pieces.find(p => p.type === PieceType.GENERAL && p.side === side);
  if (!king) return false;

  const opponentSide = side === Side.RED ? Side.BLACK : Side.RED;
  const opponents = pieces.filter(p => p.side === opponentSide);

  for (const opp of opponents) {
    if (isValidMove(opp, king.x, king.y, pieces)) {
      return true;
    }
  }

  const otherKing = pieces.find(p => p.type === PieceType.GENERAL && p.side === opponentSide);
  if (otherKing && king.x === otherKing.x) {
    if (countPiecesBetween(king.x, king.y, otherKing.x, otherKing.y, pieces) === 0) {
      return true;
    }
  }

  return false;
}

export function getAllLegalMoves(side: Side, pieces: Piece[]) {
  const moves: { piece: Piece, toX: number, toY: number }[] = [];
  const ourPieces = pieces.filter(p => p.side === side);
  
  for (const piece of ourPieces) {
    for (let y = 0; y < 10; y++) {
      for (let x = 0; x < 9; x++) {
        if (isValidMove(piece, x, y, pieces)) {
          const simulatedPieces = pieces
            .filter(p => !(p.x === x && p.y === y))
            .map(p => p.id === piece.id ? { ...p, x, y } : p);
          
          if (!isKingInCheck(side, simulatedPieces)) {
            moves.push({ piece, toX: x, toY: y });
          }
        }
      }
    }
  }
  return moves;
}

// Simplified AI Logic with Positional Values
const PIECE_VALUES: Record<PieceType, number> = {
  [PieceType.GENERAL]: 10000,
  [PieceType.ADVISOR]: 200,
  [PieceType.ELEPHANT]: 200,
  [PieceType.HORSE]: 450,
  [PieceType.CHARIOT]: 1000,
  [PieceType.CANNON]: 500,
  [PieceType.SOLDIER]: 100,
};

// Bonus points for positioning
function getPositionalBonus(piece: Piece): number {
  const { type, x, y, side } = piece;
  let bonus = 0;

  // Soldier movement bonus (across river)
  if (type === PieceType.SOLDIER) {
    if (side === Side.RED) {
      if (y <= 4) bonus += 20; // Crossed river
      if (y <= 1) bonus += 40; // Deep in enemy territory
      if (y === 3 || y === 4) { // Central columns after crossing
        if (x >= 2 && x <= 6) bonus += 15;
      }
    } else {
      if (y >= 5) bonus += 20;
      if (y >= 8) bonus += 40;
      if (y === 5 || y === 6) {
        if (x >= 2 && x <= 6) bonus += 15;
      }
    }
  }

  // Chariot/Horse control bonus (central columns and forward positions)
  if (type === PieceType.CHARIOT) {
    if (x >= 3 && x <= 5) bonus += 15;
    // Chariots should be active
    if (side === Side.RED && y <= 4) bonus += 20;
    if (side === Side.BLACK && y >= 5) bonus += 20;
  }
  
  if (type === PieceType.HORSE) {
    if (x >= 2 && x <= 6) bonus += 10;
    // Horses should advance
    if (side === Side.RED && y <= 6) bonus += 15;
    if (side === Side.BLACK && y >= 3) bonus += 15;
  }

  // Cannon placement (behind own pieces or attacking)
  if (type === PieceType.CANNON) {
    if (side === Side.RED && y <= 2) bonus += 15;
    if (side === Side.BLACK && y >= 7) bonus += 15;
  }

  return bonus;
}

export function evaluateBoard(pieces: Piece[], side: Side): number {
  let score = 0;
  const opponentSide = side === Side.RED ? Side.BLACK : Side.RED;

  for (const p of pieces) {
    let val = PIECE_VALUES[p.type] + getPositionalBonus(p);
    
    // Optimized mobility check: only for certain pieces and fewer checks
    let mobility = 0;
    if (p.type === PieceType.CHARIOT || p.type === PieceType.HORSE || p.type === PieceType.CANNON) {
      // Faster mobility check: check only in x and y directions for some radius
      const directions = [[0,1], [0,-1], [1,0], [-1,0]];
      for (const [dx, dy] of directions) {
        const nx = p.x + dx;
        const ny = p.y + dy;
        if (nx >= 0 && nx <= 8 && ny >= 0 && ny <= 9) {
          if (isValidMove(p, nx, ny, pieces)) mobility += 10;
        }
      }
    }

    if (p.side === side) {
      score += val + mobility;
    } else {
      score -= val + mobility;
    }
  }

  // Bonus for controlling center files
  for (const p of pieces) {
    if (p.x === 4) {
      if (p.side === side) score += 30;
      else score -= 30;
    }
  }

  return score;
}

function minimax(
  pieces: Piece[],
  depth: number,
  alpha: number,
  beta: number,
  isMaximizing: boolean,
  side: Side
): number {
  if (depth <= 0) return evaluateBoard(pieces, side);

  const opponentSide = side === Side.RED ? Side.BLACK : Side.RED;
  const currentSide = isMaximizing ? side : opponentSide;
  const moves = getAllLegalMoves(currentSide, pieces);

  if (moves.length === 0) {
    // Checkmate or stalemate
    return isMaximizing ? -20000 - depth : 20000 + depth;
  }

  // King safety: extra penalty if king is in check
  if (isKingInCheck(currentSide, pieces)) {
    if (isMaximizing) alpha -= 50;
    else beta += 50;
  }

  // Move ordering: heuristic to evaluate better moves first
  moves.sort((a, b) => {
    const aTarget = getPieceAt(pieces, a.toX, a.toY);
    const bTarget = getPieceAt(pieces, b.toX, b.toY);
    const aVal = aTarget ? PIECE_VALUES[aTarget.type] : 0;
    const bVal = bTarget ? PIECE_VALUES[bTarget.type] : 0;
    
    // Also prioritize moving pieces closer to enemy king
    const enemyKing = pieces.find(p => p.type === PieceType.GENERAL && p.side === (currentSide === Side.RED ? Side.BLACK : Side.RED));
    let aProx = 0, bProx = 0;
    if (enemyKing) {
      aProx = Math.abs(a.toX - enemyKing.x) + Math.abs(a.toY - enemyKing.y);
      bProx = Math.abs(b.toX - enemyKing.x) + Math.abs(b.toY - enemyKing.y);
    }

    return (bVal - aVal) + (aProx - bProx);
  });

  if (isMaximizing) {
    let maxEval = -Infinity;
    for (const move of moves) {
      const activePieceId = move.piece.id;
      const newPieces = pieces
        .filter(p => !(p.x === move.toX && p.y === move.toY))
        .map(p => p.id === activePieceId ? { ...p, x: move.toX, y: move.toY } : p);
      
      const ev = minimax(newPieces, depth - 1, alpha, beta, false, side);
      maxEval = Math.max(maxEval, ev);
      alpha = Math.max(alpha, ev);
      if (beta <= alpha) break;
    }
    return maxEval;
  } else {
    let minEval = Infinity;
    for (const move of moves) {
      const activePieceId = move.piece.id;
      const newPieces = pieces
        .filter(p => !(p.x === move.toX && p.y === move.toY))
        .map(p => p.id === activePieceId ? { ...p, x: move.toX, y: move.toY } : p);

      const ev = minimax(newPieces, depth - 1, alpha, beta, true, side);
      minEval = Math.min(minEval, ev);
      beta = Math.min(beta, ev);
      if (beta <= alpha) break;
    }
    return minEval;
  }
}

export function getBestMove(pieces: Piece[], side: Side, level: AiLevel) {
  const depthMap = {
    [AiLevel.EASY]: 3,    // Equivalent to previous Normal
    [AiLevel.NORMAL]: 4,  // Equivalent to previous Hard
    [AiLevel.HARD]: 5     // Extreme
  };
  const depth = depthMap[level] || 3;
  const moves = getAllLegalMoves(side, pieces);

  if (moves.length === 0) return null;

  // Move ordering for root
  moves.sort((a, b) => {
    const aTarget = getPieceAt(pieces, a.toX, a.toY);
    const bTarget = getPieceAt(pieces, b.toX, b.toY);
    const aVal = aTarget ? PIECE_VALUES[aTarget.type] : 0;
    const bVal = bTarget ? PIECE_VALUES[bTarget.type] : 0;
    return bVal - aVal;
  });

  let bestMove = moves[0];
  let bestValue = -Infinity;

  for (const move of moves) {
    const activePieceId = move.piece.id;
    const nextPieces = pieces
      .filter(p => !(p.x === move.toX && p.y === move.toY))
      .map(p => p.id === activePieceId ? { ...p, x: move.toX, y: move.toY } : p);

    const boardValue = minimax(nextPieces, depth - 1, -Infinity, Infinity, false, side);
    if (boardValue > bestValue) {
      bestValue = boardValue;
      bestMove = move;
    }
  }

  return bestMove;
}
