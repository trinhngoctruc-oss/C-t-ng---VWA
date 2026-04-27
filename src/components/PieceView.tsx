/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion } from 'motion/react';
import React from 'react';
import { Piece, PIECE_NAMES, Side } from '../types';

interface PieceViewProps {
  piece: Piece;
  isSelected?: boolean;
  isCapturable?: boolean;
  isCheck?: boolean;
  onClick: () => void;
}

const PieceView: React.FC<PieceViewProps> = ({ piece, isSelected, isCapturable, isCheck, onClick }) => {
  const isRed = piece.side === Side.RED;
  const name = PIECE_NAMES[piece.type][piece.side];

  return (
    <motion.div
      layoutId={piece.id}
      initial={false}
      animate={{
        x: piece.x * 60 - 24, // Offset to center on intersection (48/2)
        y: piece.y * 60 - 24, // Offset to center on intersection
        scale: isSelected ? 1.1 : 1,
        z: isSelected ? 20 : 0, // Lift selected piece
        rotateZ: piece ? [0, -1, 1, -1, 1, 0] : 0, // Gentle shake on position update
      }}
      transition={{ 
        rotateZ: { duration: 0.4, times: [0, 0.2, 0.4, 0.6, 0.8, 1] },
        x: { type: 'spring', stiffness: 300, damping: 25 },
        y: { type: 'spring', stiffness: 300, damping: 25 },
        scale: { duration: 0.2 },
        z: { duration: 0.2 }
      }}
      className="absolute z-10 cursor-pointer pointer-events-auto"
      style={{ 
        width: 48, 
        height: 64, // Slightly taller for the 3D look
        transformStyle: 'preserve-3d',
      }}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      {/* The 3D Cup Container */}
      <div className="relative w-full h-full group">
        
        {/* Cup Shadow on Board */}
        <div className="absolute bottom-[-6px] left-1/2 -translate-x-1/2 w-6 h-3 bg-black/40 blur-md rounded-full transform -rotate-x-90" />

        {/* Cup Body (Transparent Glass Cylinder) */}
        <div className={`
          relative w-full h-full rounded-b-[24px] rounded-t-[8px]
          border-x-2 border-white/20 
          bg-gradient-to-b from-white/10 to-white/5
          backdrop-blur-[2px] overflow-hidden
          transition-all duration-300
          ${isSelected ? 'ring-2 ring-accent-gold/50 shadow-[0_0_15px_rgba(212,175,55,0.4)]' : ''}
          ${isCapturable ? 'ring-2 ring-red-500/50 animate-pulse' : ''}
          ${isCheck ? 'ring-4 ring-red-600 shadow-[0_0_20px_rgba(220,38,38,0.8)] animate-bounce' : ''}
        `}>
          {/* Wine / Liquid inside */}
          <motion.div 
            initial={false}
            animate={{ height: isSelected ? '60%' : '50%' }}
            className={`
              absolute bottom-0 w-full
              bg-gradient-to-t
              ${isRed ? 'from-red-900/80 to-red-600/40' : 'from-neutral-900/90 to-neutral-700/40'}
            `}
            style={{ 
              borderRadius: '0 0 24px 24px',
              boxShadow: isRed ? 'inset 0 0 10px rgba(153,27,27,0.5)' : 'inset 0 0 10px rgba(0,0,0,0.5)'
            }}
          >
            {/* Liquid Surface Shine */}
            <div className="absolute top-0 w-full h-2 bg-white/20 blur-[1px]" />
          </motion.div>

          {/* Glass Reflections */}
          <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-white/10 pointer-events-none" />
          <div className="absolute left-1 top-4 w-[2px] h-12 bg-white/20 rounded-full" />
          
          {/* Piece Name at the Bottom (Seen through glass/liquid) */}
          <div className="absolute bottom-3 w-full flex items-center justify-center pointer-events-none">
            <span className={`
              font-serif-tc font-bold select-none text-[1.2rem]
              ${isRed ? 'text-white' : 'text-neutral-300'}
              filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]
              transition-colors duration-300
            `}>
              {name}
            </span>
          </div>

          {/* Top Rim of the Cup */}
          <div className="absolute top-0 w-full h-6 rounded-full border-t-2 border-white/30 bg-white/5" />
        </div>
      </div>
    </motion.div>
  );
};

export default PieceView;

