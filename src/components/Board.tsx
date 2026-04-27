/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion } from 'motion/react';
import { Fragment } from 'react';

export default function Board() {
  const files = Array.from({ length: 9 });
  const ranks = Array.from({ length: 10 });

  return (
    <div className="relative w-[540px] h-[600px] border-4 border-[#3d2b1f] bg-[#1a1510] shadow-2xl p-[30px] rounded-sm">
      <div className="relative w-full h-full">
        {/* Draw Vertical Lines */}
        {files.map((_, i) => (
          <div
            key={`v-${i}`}
            className="absolute bg-accent-gold/20"
            style={{
              left: i * 60,
              top: 0,
              width: 1,
              height: '100%',
            }}
          >
            {/* Split lines at the river */}
            {i > 0 && i < 8 && (
              <Fragment>
                <div className="absolute top-0 w-full h-[240px] bg-accent-gold/30" />
                <div className="absolute top-[300px] w-full h-[240px] bg-accent-gold/30" />
              </Fragment>
            )}
            {/* Edge lines */}
            {(i === 0 || i === 8) && (
              <div className="absolute top-0 w-full h-full bg-accent-gold/30" />
            )}
          </div>
        ))}

        {/* Draw Horizontal Lines */}
        {ranks.map((_, i) => (
          <div
            key={`h-${i}`}
            className="absolute left-0 bg-accent-gold/30"
            style={{
              top: i * 60,
              width: '100%',
              height: 1,
            }}
          />
        ))}

        {/* Middle River Text */}
        <div className="absolute top-[240px] left-0 w-full h-[60px] flex flex-col items-center justify-center pointer-events-none">
          <div className="w-full flex justify-around">
            <span className="text-2xl font-serif-tc font-bold text-accent-gold/20 select-none tracking-[10px]">楚河</span>
            <span className="text-2xl font-serif-tc font-bold text-accent-gold/20 select-none tracking-[10px]">漢界</span>
          </div>
          <div className="text-[10px] font-serif-tc font-bold text-accent-gold/40 select-none tracking-[2px] uppercase mt-1">
            Nam vô tửu như cờ vô phong - VWA
          </div>
        </div>

        {/* Palace Diagonals (Black) */}
        <svg className="absolute top-0 left-[180px] w-[120px] h-[120px] pointer-events-none opacity-20">
          <line x1="0" y1="0" x2="120" y2="120" stroke="currentColor" className="text-accent-gold" strokeWidth="1" />
          <line x1="120" y1="0" x2="0" y2="120" stroke="currentColor" className="text-accent-gold" strokeWidth="1" />
        </svg>

        {/* Palace Diagonals (Red) */}
        <svg className="absolute bottom-0 left-[180px] w-[120px] h-[120px] pointer-events-none opacity-20">
          <line x1="0" y1="0" x2="120" y2="120" stroke="currentColor" className="text-accent-gold" strokeWidth="1" />
          <line x1="120" y1="0" x2="0" y2="120" stroke="currentColor" className="text-accent-gold" strokeWidth="1" />
        </svg>
      </div>
    </div>
  );
}
