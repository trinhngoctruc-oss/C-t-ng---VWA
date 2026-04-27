/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AnimatePresence, motion } from 'motion/react';
import React, { useCallback, useEffect, useState } from 'react';
import Board from './components/Board';
import PieceView from './components/PieceView';
import { getBestMove, isKingInCheck, isValidMove, getAllLegalMoves } from './engine';
import { auth, createRoom, joinRoom, subscribeToRoom, updateGameState } from './services/firebaseService';
import { INITIAL_PIECES, Piece, PieceType, Side, GameMode, AiLevel } from './types';

type View = 'LOGIN' | 'MENU' | 'AI_SETUP' | 'ONLINE_SETUP' | 'GAME';

export default function App() {
  const [view, setView] = useState<View>('LOGIN');
  const [username, setUsername] = useState(() => localStorage.getItem('xiangqi_user') || '');
  const [gameMode, setGameMode] = useState<GameMode>(GameMode.LOCAL);
  const [aiLevel, setAiLevel] = useState<AiLevel>(AiLevel.NORMAL);
  const [roomId, setRoomId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  
  useEffect(() => {
    if (localStorage.getItem('xiangqi_user')) {
      setView('MENU');
    }
  }, []);

  const saveNameAndEnter = () => {
    if (username.trim()) {
      localStorage.setItem('xiangqi_user', username.trim());
      setView('MENU');
    }
  };
  
  const [pieces, setPieces] = useState<Piece[]>(() => 
    INITIAL_PIECES.map((p, i) => ({ ...p, id: `p-${i}` }))
  );
  const [turn, setTurn] = useState<Side>(Side.RED);
  const [selectedPieceId, setSelectedPieceId] = useState<string | null>(null);
  const [winner, setWinner] = useState<Side | null>(null);
  const [isCheckmate, setIsCheckmate] = useState(false);
  const [check, setCheck] = useState<Side | null>(null);
  const [roomData, setRoomData] = useState<any>(null);
  const [playerSide, setPlayerSide] = useState<Side>(Side.RED);

  const changeName = () => {
    localStorage.removeItem('xiangqi_user');
    setUsername('');
    setView('LOGIN');
  };

  const selectedPiece = pieces.find(p => p.id === selectedPieceId);

  const startLocal = () => {
    setPieces(INITIAL_PIECES.map((p, i) => ({ ...p, id: `p-${i}` })));
    setTurn(Side.RED);
    setGameMode(GameMode.LOCAL);
    setView('GAME');
    setWinner(null);
    setIsCheckmate(false);
    setErrorMessage('');
  };

  const startAi = (level: AiLevel) => {
    setPieces(INITIAL_PIECES.map((p, i) => ({ ...p, id: `p-${i}` })));
    setTurn(Side.RED);
    setGameMode(GameMode.AI);
    setAiLevel(level);
    setPlayerSide(Side.RED);
    setView('GAME');
    setWinner(null);
    setIsCheckmate(false);
    setErrorMessage('');
  };

  const handleCreateRoom = async () => {
    if (!username) {
      setErrorMessage('Vui lòng nhập tên của bạn');
      return;
    }
    
    // Generate a random 4-character ID
    const newId = Math.random().toString(36).substring(2, 6).toUpperCase();
    setRoomId(newId);
    
    setIsLoading(true);
    setErrorMessage('');
    try {
      const initial = INITIAL_PIECES.map((p, i) => ({ ...p, id: `p-${i}` }));
      setPieces(initial);
      await createRoom(newId, username, initial);
      setGameMode(GameMode.ONLINE);
      setPlayerSide(Side.RED);
      setView('GAME');
      setIsCheckmate(false);
    } catch (error: any) {
      let msg = 'Không thể tạo phòng. Vui lòng thử lại.';
      try {
        const errInfo = JSON.parse(error.message);
        if (errInfo.error.includes('offline')) {
          msg = 'LỖI KẾT NỐI: Không thể liên hệ máy chủ Firebase.';
        }
      } catch {
        msg = error.message || msg;
      }
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinRoom = async () => {
    const cleanId = roomId.trim().toUpperCase();
    if (!cleanId || !username) {
      setErrorMessage('Vui lòng nhập mã phòng');
      return;
    }
    setIsLoading(true);
    setErrorMessage('');
    try {
      await joinRoom(cleanId, username);
      setGameMode(GameMode.ONLINE);
      setPlayerSide(Side.BLACK);
      setView('GAME');
      setIsCheckmate(false);
    } catch (error: any) {
      let msg = 'Mã phòng không tồn tại hoặc đã đầy.';
      try {
        const errInfo = JSON.parse(error.message);
        if (errInfo.error.includes('offline')) {
          msg = 'LỖI KẾT NỐI: Không thể liên hệ máy chủ Firebase. Kiểm tra mạng hoặc API Key.';
        } else if (errInfo.error.includes('permission')) {
          msg = 'LỖI QUYỀN TRUY CẬP: Kiểm tra cấu hình Security Rules.';
        }
      } catch {
        msg = error.message || msg;
      }
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (gameMode === GameMode.ONLINE && roomId) {
      const unsub = subscribeToRoom(roomId.trim(), (data) => {
        setRoomData(data);
        if (data.pieces) setPieces(data.pieces);
        if (data.turn) setTurn(data.turn as Side);
        if (data.winner) setWinner(data.winner as Side);
        
    if (isKingInCheck(data.turn as Side, data.pieces)) {
          setCheck(data.turn as Side);
          // Check for checkmate in online mode
          const legalMoves = getAllLegalMoves(data.turn as Side, data.pieces);
          if (legalMoves.length === 0) {
            setIsCheckmate(true);
            setWinner(data.turn === Side.RED ? Side.BLACK : Side.RED);
          }
        } else {
          setCheck(null);
          // Stalemate check
          const legalMoves = getAllLegalMoves(data.turn as Side, data.pieces);
          if (legalMoves.length === 0) {
            setWinner(data.turn === Side.RED ? Side.BLACK : Side.RED);
          }
        }
      });
      return () => unsub();
    }
  }, [gameMode, roomId]);

  // AI Turn
  useEffect(() => {
    if (gameMode === GameMode.AI && turn === Side.BLACK && !winner) {
      const timer = setTimeout(() => {
        const move = getBestMove(pieces, Side.BLACK, aiLevel);
        if (move) {
          executeMove(move.piece, move.toX, move.toY);
        }
      }, 700);
      return () => clearTimeout(timer);
    }
  }, [turn, gameMode, pieces, winner, aiLevel]);

  const executeMove = (piece: Piece, toX: number, toY: number) => {
    const newPieces = pieces
      .filter(p => !(p.x === toX && p.y === toY))
      .map(p => p.id === piece.id ? { ...p, x: toX, y: toY } : p);

    const capturedPiece = pieces.find(p => p.x === toX && p.y === toY);
    const hasWon = capturedPiece?.type === PieceType.GENERAL;
    const nextTurn = turn === Side.RED ? Side.BLACK : Side.RED;

    if (gameMode === GameMode.ONLINE) {
      updateGameState(roomId.trim(), newPieces, nextTurn, hasWon ? piece.side : null);
    } else {
      setPieces(newPieces);
      setTurn(nextTurn);
      if (hasWon) setWinner(piece.side);
      
      const nextSideCheck = isKingInCheck(nextTurn, newPieces);
      const legalMoves = getAllLegalMoves(nextTurn, newPieces);
      
      if (nextSideCheck) {
        setCheck(nextTurn);
        if (legalMoves.length === 0) {
          setIsCheckmate(true);
          setWinner(piece.side);
        }
      } else {
        setCheck(null);
        if (legalMoves.length === 0) {
          // Stalemate is a win for the current player
          setWinner(piece.side);
        }
      }
    }
    setSelectedPieceId(null);
  };

  const handlePieceClick = (piece: Piece) => {
    if (winner) return;
    if (gameMode === GameMode.AI && turn === Side.BLACK) return;
    if (gameMode === GameMode.ONLINE && turn !== playerSide) return;

    if (piece.side === turn) {
      setSelectedPieceId(piece.id);
    } else if (selectedPiece) {
      handleMove(selectedPiece, piece.x, piece.y);
    }
  };

  const handleMove = useCallback((piece: Piece, toX: number, toY: number) => {
    if (!isValidMove(piece, toX, toY, pieces)) return;
    const newPieces = pieces
      .filter(p => !(p.x === toX && p.y === toY))
      .map(p => p.id === piece.id ? { ...p, x: toX, y: toY } : p);

    if (isKingInCheck(piece.side, newPieces)) return;
    executeMove(piece, toX, toY);
  }, [pieces, turn, gameMode, roomId, playerSide]);

  const handleBoardClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (winner || !selectedPiece) return;
    if (gameMode === GameMode.ONLINE && turn !== playerSide) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const boardWidth = 540;
    const boardHeight = 600;
    
    // Scale tracking
    const scale = rect.width / boardWidth;
    const gridX = Math.round((e.clientX - rect.left - 30 * scale) / (60 * scale));
    const gridY = Math.round((e.clientY - rect.top - 30 * scale) / (60 * scale));

    if (gridX >= 0 && gridX <= 8 && gridY >= 0 && gridY <= 9) {
      handleMove(selectedPiece, gridX, gridY);
    }
  };

  if (view === 'LOGIN') {
    return (
      <div className="min-h-screen bg-bg flex flex-col items-center justify-center p-8 font-sans overflow-hidden">
        {/* Background Decorative Element */}
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-accent-gold/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-accent-red/5 blur-[120px] rounded-full" />

        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }} 
          className="bg-surface/40 backdrop-blur-xl p-12 rounded-[2rem] shadow-2xl border border-white/10 w-full max-w-md text-center z-10"
        >
          <div className="w-20 h-20 bg-accent-gold/10 rounded-2xl flex items-center justify-center mx-auto mb-8 border border-accent-gold/30">
            <span className="text-4xl">🍶</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black text-white mb-2 italic font-serif-tc tracking-tight">Cờ tiên tửu VWA</h1>
          <p className="text-accent-gold/60 text-sm uppercase tracking-[0.3em] font-bold mb-12">Glass Cup Edition</p>
          
          <div className="space-y-6 text-left">
            <div>
              <label className="text-[10px] uppercase tracking-[0.2em] text-text-dim font-bold ml-2 mb-2 block">Danh tính của bạn</label>
              <input 
                type="text" 
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="Ví dụ: Lão Tướng..."
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-5 focus:border-accent-gold outline-none transition-all text-white placeholder:text-white/20"
              />
            </div>
            
            <button 
              disabled={!username}
              onClick={saveNameAndEnter}
              className="w-full bg-white text-bg py-5 rounded-2xl font-black disabled:opacity-30 hover:bg-accent-gold transition-all duration-500 shadow-xl shadow-accent-gold/10"
            >
              VÀO BÀN CỜ
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  if (view === 'MENU') {
    return (
      <div className="min-h-screen bg-bg flex flex-col items-center justify-center p-8 font-sans overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-accent-gold/5 blur-[150px] rounded-full" />
        
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          className="flex flex-col gap-6 w-full max-w-sm z-10"
        >
          <div className="text-center mb-12">
            <p className="text-text-dim text-sm tracking-[0.2em] uppercase font-bold mb-2">Xin chào</p>
            <h2 className="text-4xl font-black text-white">{username}</h2>
          </div>

          {[
            { id: 'AI_SETUP', icon: '🤖', title: 'Đấu với máy', desc: 'Luyện tập cùng AI thông minh' },
            { id: 'LOCAL', icon: '👥', title: 'Chơi tại chỗ', desc: 'Đấu với bạn bè cùng thiết bị' },
            { id: 'ONLINE_SETUP', icon: '🌐', title: 'Chơi Online', desc: 'Tìm đối thủ khắp mọi nơi' }
          ].map((item) => (
            <button 
              key={item.id}
              onClick={() => item.id === 'LOCAL' ? startLocal() : setView(item.id as View)} 
              className="bg-surface/40 hover:bg-surface/80 border border-white/5 px-8 py-8 rounded-[1.5rem] transition-all flex items-center gap-6 group text-left backdrop-blur-md"
            >
              <div className="w-14 h-14 bg-white/5 rounded-xl flex items-center justify-center text-2xl group-hover:bg-accent-gold/20 transition-all">
                {item.icon}
              </div>
              <div className="flex-grow">
                <span className="block text-xl font-black text-white group-hover:text-accent-gold transition-all">{item.title}</span>
                <span className="text-xs text-text-dim font-medium">{item.desc}</span>
              </div>
              <span className="text-accent-gold opacity-0 group-hover:opacity-100 transition-all font-black">→</span>
            </button>
          ))}

          <button onClick={changeName} className="mt-8 text-text-dim hover:text-white transition-colors text-xs font-bold tracking-widest uppercase py-4">Đổi tên</button>
        </motion.div>
      </div>
    );
  }

  if (view === 'AI_SETUP') {
    return (
      <div className="min-h-screen bg-bg flex flex-col items-center justify-center p-8 font-sans">
         <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col gap-4 w-full max-w-sm">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-black text-white mb-2">Chọn thử thách</h2>
            <p className="text-text-dim text-sm font-medium">Độ khó của trí tuệ nhân tạo</p>
          </div>
          
          <button onClick={() => startAi(AiLevel.EASY)} className="bg-surface border border-emerald-500/20 px-8 py-8 rounded-2xl hover:bg-emerald-500/10 transition-all font-black text-2xl group relative overflow-hidden">
             <span className="relative z-10">DỄ</span>
             <div className="absolute inset-0 bg-emerald-500 opacity-0 group-hover:opacity-5 transition-opacity" />
          </button>
          
          <button onClick={() => startAi(AiLevel.NORMAL)} className="bg-surface border border-yellow-500/20 px-8 py-8 rounded-2xl hover:bg-yellow-500/10 transition-all font-black text-2xl group relative overflow-hidden">
             <span className="relative z-10">BÌNH THƯỜNG</span>
             <div className="absolute inset-0 bg-yellow-500 opacity-0 group-hover:opacity-5 transition-opacity" />
          </button>
          
          <button onClick={() => startAi(AiLevel.HARD)} className="bg-surface border border-red-500/20 px-8 py-8 rounded-2xl hover:bg-red-500/10 transition-all font-black text-2xl group relative overflow-hidden">
             <span className="relative z-10">KHÓ</span>
             <div className="absolute inset-0 bg-red-500 opacity-0 group-hover:opacity-5 transition-opacity" />
          </button>
          
          <button onClick={() => setView('MENU')} className="mt-12 text-text-dim hover:text-white transition-colors text-xs font-bold uppercase tracking-widest text-center py-4">Quay lại</button>
        </motion.div>
      </div>
    );
  }

  if (view === 'ONLINE_SETUP') {
    return (
      <div className="min-h-screen bg-bg flex flex-col items-center justify-center p-8 font-sans">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-surface/40 backdrop-blur-xl p-12 rounded-[2.5rem] shadow-2xl border border-white/10 w-full max-w-md relative overflow-hidden">
          {isLoading && (
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-20 flex flex-col items-center justify-center">
              <div className="w-12 h-12 border-4 border-accent-gold/20 border-t-accent-gold rounded-full animate-spin mb-4" />
              <p className="text-accent-gold font-bold text-xs tracking-widest uppercase">Đang kết nối...</p>
            </div>
          )}

          <div className="text-center mb-10">
            <h2 className="text-3xl font-black text-white mb-2 italic font-serif-tc">Khai cuộc trực tuyến</h2>
            <p className="text-text-dim text-xs font-bold tracking-widest uppercase">Chia sẻ mã để cùng tham chiến</p>
          </div>

          <div className="space-y-6">
            <div className="bg-black/40 border border-white/10 rounded-2xl p-6 text-center">
              <label className="text-[10px] uppercase tracking-[0.2em] text-text-dim font-bold mb-4 block">Mã phòng của bạn</label>
              <input 
                type="text" 
                value={roomId}
                onChange={e => {
                  setRoomId(e.target.value.toUpperCase());
                  setErrorMessage('');
                }}
                disabled={isLoading}
                placeholder="NHẬP MÃ..."
                className="w-full bg-transparent border-none outline-none text-3xl font-mono text-center tracking-[0.5em] text-accent-gold placeholder:text-white/5 uppercase"
              />
            </div>
            
            {errorMessage && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-red-500 text-[10px] font-bold text-center uppercase tracking-wider">
                {errorMessage}
              </motion.div>
            )}
            
            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={handleCreateRoom} 
                disabled={isLoading}
                className="bg-white text-bg py-5 rounded-2xl font-black hover:bg-accent-gold transition-all duration-300 disabled:opacity-20 flex flex-col items-center justify-center"
              >
                <span className="text-sm">TẠO MỚI</span>
                <span className="text-[8px] opacity-60">Mã tự sinh</span>
              </button>
              <button 
                onClick={handleJoinRoom} 
                disabled={!roomId || isLoading}
                className="border-2 border-white/10 text-white py-5 rounded-2xl font-black hover:border-accent-gold hover:text-accent-gold transition-all duration-300 disabled:opacity-20 flex flex-col items-center justify-center"
              >
                <span className="text-sm">THAM GIA</span>
                <span className="text-[8px] opacity-60">Nhập mã trên</span>
              </button>
            </div>
          </div>
          
          <button 
            disabled={isLoading}
            onClick={() => {
              setView('MENU');
              setErrorMessage('');
            }} 
            className="w-full mt-10 text-text-dim hover:text-white transition-colors text-xs font-bold tracking-widest uppercase disabled:opacity-0"
          >
            Thoát
          </button>
        </motion.div>
      </div>
    );
  }

  const [availableSize, setAvailableSize] = useState({ width: 0, height: 0 });
  const mainRef = React.useRef<HTMLElement>(null);

  useEffect(() => {
    if (!mainRef.current) return;
    
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setAvailableSize({
          width: entry.contentRect.width,
          height: entry.contentRect.height
        });
      }
    });

    observer.observe(mainRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="fixed inset-0 bg-bg text-white font-sans flex flex-col items-center justify-center overflow-hidden touch-none select-none">
      <div className="flex flex-col lg:flex-row w-full h-full max-w-7xl lg:max-h-[900px] bg-bg lg:bg-neutral-800 lg:rounded-xl lg:shadow-2xl overflow-hidden relative">
        
        {/* Top Bar (Black Player) */}
        <aside className="bg-surface/90 backdrop-blur-md lg:bg-surface p-2 lg:p-6 flex flex-row lg:flex-col lg:gap-8 order-1 border-b lg:border-r border-white/5 z-10 shrink-0 h-10 lg:h-full">
          <div className="flex flex-row lg:flex-col flex-grow items-center lg:items-start justify-between lg:justify-start gap-2">
            <div className="flex flex-col">
              <h2 className="text-[9px] lg:text-[10px] uppercase tracking-[0.2em] text-text-dim font-bold leading-none">
                {gameMode === GameMode.AI ? 'AI (BLACK)' : (gameMode === GameMode.ONLINE ? (roomData?.blackPlayerName || 'Waiting...') : 'Player (Black)')}
              </h2>
              <div className="flex items-center gap-2 mt-1">
                <span className={`w-1.5 h-1.5 rounded-full ${turn === Side.BLACK ? 'bg-accent-gold animate-pulse' : 'bg-neutral-600'}`} />
                <span className={`text-[10px] lg:text-xs font-bold ${turn === Side.BLACK ? 'text-accent-gold' : 'text-text-dim'}`}>
                  {turn === Side.BLACK ? 'Đang đi' : 'Đang đợi'}
                </span>
              </div>
            </div>
            
            <div className="flex flex-row lg:flex-col gap-4">
              <div className="flex flex-col items-center lg:items-start">
                <span className="text-[8px] text-text-dim uppercase leading-none">Quân cờ</span>
                <span className="text-xs lg:text-sm font-black leading-none">{pieces.filter(p => p.side === Side.BLACK).length}</span>
              </div>
              {gameMode === GameMode.AI && (
                <div className="hidden lg:flex flex-col">
                  <span className="text-[8px] text-text-dim uppercase leading-none">Độ khó</span>
                  <span className="text-xs font-black text-accent-gold italic leading-none">{aiLevel}</span>
                </div>
              )}
            </div>
          </div>

          <div className="hidden lg:flex flex-grow flex-col mt-4">
            <h3 className="text-[10px] uppercase tracking-[0.2em] text-text-dim mb-2">Phòng</h3>
            <div className="flex-grow bg-black/20 rounded-lg p-3 font-mono text-[10px] border border-white/5">
              <div className="text-accent-gold mb-1">ID: {roomId || 'LOCAL'}</div>
              <div className="text-text-dim text-[9px] uppercase tracking-tighter opacity-50">MODE: {gameMode}</div>
            </div>
          </div>
        </aside>

        {/* Main Game Area */}
        <main 
          ref={mainRef}
          className="flex-grow bg-[#1a1a1a] flex items-center justify-center relative order-2 lg:order-2 overflow-hidden touch-none pointer-events-auto min-h-0 w-full p-2 lg:p-8"
        >
          {/* Background Board Grid Decorative */}
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '40px 40px' }} />
          
          <div className="relative w-full h-full flex items-center justify-center">
             <div 
              className="relative transition-all duration-500 flex items-center justify-center"
              style={{
                width: '100%',
                height: '100%',
              }}
            >
                <div 
                  className="relative origin-center"
                  style={{ 
                    width: '540px',
                    height: '600px',
                    // scale(min(MAX_SCALE, HORIZONTAL_FIT, VERTICAL_FIT))
                    // Use measured availableSize instead of window-based vw/vh for 100% accurate responsive fit
                    transform: availableSize.width > 0 ? `scale(min(0.9, (availableSize.width - 20) / 540, (availableSize.height - 20) / 600))` : 'scale(0.5)',
                    transformOrigin: 'center center'
                  }}
                >
                <div className="relative group cursor-crosshair" onClick={handleBoardClick}>
                  <motion.div 
                    // No 3D tilt on mobile/tablet (width < 1024) to keep edges within view
                    animate={{ rotateX: (winner || (typeof window !== 'undefined' && window.innerWidth < 1024)) ? 0 : 20 }} 
                    transition={{ duration: 1 }} 
                    style={{ transformStyle: 'preserve-3d' }} 
                    className="relative w-full h-full"
                  >
                    <Board />
                    <div className="absolute top-[30px] left-[30px] w-[480px] h-[540px] pointer-events-none" style={{ transform: 'translateZ(1px)' }}>
                      {pieces.map((piece) => (
                        <PieceView
                          key={piece.id}
                          piece={piece}
                          isSelected={selectedPieceId === piece.id}
                          isCheck={check === piece.side && piece.type === PieceType.GENERAL}
                          isCapturable={selectedPieceId !== null && selectedPieceId !== piece.id && isValidMove(selectedPiece!, piece.x, piece.y, pieces)}
                          onClick={() => handlePieceClick(piece)}
                        />
                      ))}
                    </div>
                  </motion.div>

                  <AnimatePresence>
                    {winner && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-black/80 backdrop-blur-[6px] z-20 flex items-center justify-center rounded-lg pointer-events-none">
                        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-surface p-10 rounded-[2.5rem] shadow-2xl border border-white/10 text-center">
                           <div className="text-6xl mb-6">🏆</div>
                           <h2 className="text-4xl font-black text-white mb-2 uppercase tracking-tighter italic font-serif-tc">{winner} THẮNG</h2>
                           {isCheckmate && <p className="text-accent-red font-bold mb-6 tracking-widest text-sm">HẾT CỜ!</p>}
                           <div className="flex gap-4">
                             <button onClick={() => setView('MENU')} className="flex-grow px-8 py-4 bg-white text-bg rounded-2xl font-black hover:bg-accent-gold transition-all pointer-events-auto">MENU</button>
                             <button onClick={startLocal} className="px-8 py-4 border border-white/20 text-white rounded-2xl font-black hover:bg-white/5 transition-all pointer-events-auto">LẠI</button>
                           </div>
                        </motion.div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>
          </div>

          {/* Floating Mobile Check Notification */}
          <AnimatePresence>
            {check && (
              <motion.div initial={{ y: -50, opacity: 0 }} animate={{ y: 20, opacity: 1 }} exit={{ y: -50, opacity: 0 }} className="absolute top-2 lg:top-8 left-1/2 -translate-x-1/2 bg-accent-red px-6 py-2 rounded-full shadow-lg z-30 font-black text-xs uppercase tracking-[0.2em] border border-white/20">
                ⚠️ CHIẾU TƯỚNG!
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        {/* Bottom Bar (Mobile) / Right Sidebar (Desktop) */}
        <aside className="bg-surface/90 backdrop-blur-md lg:bg-surface p-2 lg:p-6 flex flex-row lg:flex-col lg:gap-8 order-3 border-t lg:border-l border-white/5 z-10 shrink-0 h-10 lg:h-full">
          <div className="flex flex-row lg:flex-col flex-grow items-center lg:items-start justify-between lg:justify-start gap-2">
            <div className="flex flex-col">
              <h2 className="text-[9px] lg:text-[10px] uppercase tracking-[0.2em] text-text-dim font-bold leading-none">
                {gameMode === GameMode.ONLINE ? (roomData?.redPlayerName || username) : username} (RED)
              </h2>
              <div className="flex items-center gap-2 mt-1">
                <span className={`w-1.5 h-1.5 rounded-full ${turn === Side.RED ? 'bg-accent-red animate-pulse' : 'bg-neutral-600'}`} />
                <span className={`text-[10px] lg:text-xs font-bold ${turn === Side.RED ? 'text-accent-red' : 'text-text-dim'}`}>
                  {turn === Side.RED ? 'Đang đi' : 'Đang đợi'}
                </span>
              </div>
            </div>

            <div className="flex flex-row lg:flex-col gap-4">
              <div className="flex flex-col items-center lg:items-start">
                <span className="text-[8px] text-text-dim uppercase leading-none">Quân cờ</span>
                <span className="text-xs lg:text-sm font-black leading-none">{pieces.filter(p => p.side === Side.RED).length}</span>
              </div>
              <button 
                onClick={() => setView('MENU')} 
                className="lg:hidden px-2 bg-white/5 border border-white/10 rounded-lg h-7 flex items-center justify-center min-w-[60px]"
              >
                <span className="text-[8px] font-bold tracking-widest uppercase leading-none">Thoát</span>
              </button>
            </div>
          </div>

          <div className="hidden lg:flex flex-col gap-4 mt-auto">
             <div className="p-4 bg-white/5 rounded-xl border border-white/5">
              <div className="text-[10px] text-text-dim uppercase tracking-widest font-bold opacity-50 mb-1 leading-none">Lượt đi</div>
              <div className={`text-xl font-black italic tracking-tighter ${turn === Side.RED ? 'text-accent-red' : 'text-accent-gold'}`}>
                {turn === Side.RED ? 'ĐỎ QUÂN' : 'ĐEN QUÂN'}
              </div>
            </div>

            <button onClick={() => setView('MENU')} className="w-full py-4 bg-white/5 border border-white/10 rounded-xl text-[10px] uppercase tracking-[0.3em] font-black hover:bg-white/10 hover:border-accent-gold hover:text-accent-gold transition-all duration-300">
              THOÁT TRẬN
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}

