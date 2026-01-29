
import React from 'react';

interface MobileControlsProps {
  onPress: (key: string, pressed: boolean) => void;
  mode?: 'PLATFORMER' | 'SHOOTER';
}

const MobileControls: React.FC<MobileControlsProps> = ({ onPress, mode = 'PLATFORMER' }) => {
  const handleTouch = (key: string, e: React.TouchEvent) => {
    e.preventDefault();
    onPress(key, true);
  };

  const handleEnd = (key: string, e: React.TouchEvent) => {
    e.preventDefault();
    onPress(key, false);
  };

  return (
    <div className="fixed inset-0 pointer-events-none select-none z-50 flex items-end justify-between p-4 md:p-10 safe-area-inset">
      {/* Direção Esquerda: D-PAD & DASH */}
      <div className="flex flex-col gap-4 pointer-events-auto mb-4 ml-4">
        <div className="grid grid-cols-3 gap-2">
          <div></div>
          <button
            className="w-14 h-14 bg-white/10 backdrop-blur-md rounded-xl border-2 border-white/20 flex items-center justify-center active:bg-white/40"
            onTouchStart={(e) => handleTouch('ArrowUp', e)}
            onTouchEnd={(e) => handleEnd('ArrowUp', e)}
          >
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 15l7-7 7 7" /></svg>
          </button>
          <div></div>
          
          <button
            className="w-14 h-14 bg-white/10 backdrop-blur-md rounded-xl border-2 border-white/20 flex items-center justify-center active:bg-white/40"
            onTouchStart={(e) => handleTouch('ArrowLeft', e)}
            onTouchEnd={(e) => handleEnd('ArrowLeft', e)}
          >
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <button
             className="w-14 h-14 bg-indigo-600/30 backdrop-blur-md rounded-xl border-2 border-indigo-400/50 flex items-center justify-center active:bg-indigo-500"
             onTouchStart={(e) => handleTouch('Shift', e)}
             onTouchEnd={(e) => handleEnd('Shift', e)}
          >
            <span className="text-white font-black text-[10px]">DASH</span>
          </button>
          <button
            className="w-14 h-14 bg-white/10 backdrop-blur-md rounded-xl border-2 border-white/20 flex items-center justify-center active:bg-white/40"
            onTouchStart={(e) => handleTouch('ArrowRight', e)}
            onTouchEnd={(e) => handleEnd('ArrowRight', e)}
          >
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" /></svg>
          </button>

          <div></div>
          <button
            className="w-14 h-14 bg-white/10 backdrop-blur-md rounded-xl border-2 border-white/20 flex items-center justify-center active:bg-white/40"
            onTouchStart={(e) => handleTouch('ArrowDown', e)}
            onTouchEnd={(e) => handleEnd('ArrowDown', e)}
          >
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" /></svg>
          </button>
          <div></div>
        </div>
      </div>

      {/* Ação Direita: Botões */}
      <div className="flex flex-col items-end gap-6 pointer-events-auto mb-4 mr-4">
        {mode === 'SHOOTER' && (
          <button
            className="w-16 h-16 bg-yellow-600/30 backdrop-blur-md rounded-2xl border-2 border-yellow-400/50 flex items-center justify-center active:bg-yellow-500 shadow-xl"
            onTouchStart={(e) => handleTouch('x', e)}
            onTouchEnd={(e) => handleEnd('x', e)}
          >
            <span className="text-white font-black text-xs">ULTRA</span>
          </button>
        )}
        
        <button
          className="w-24 h-24 md:w-32 md:h-32 bg-cyan-500/30 backdrop-blur-xl rounded-full border-4 border-cyan-400/50 flex items-center justify-center active:bg-cyan-400 active:scale-95 transition-all shadow-2xl"
          onTouchStart={(e) => handleTouch(' ', e)}
          onTouchEnd={(e) => handleEnd(' ', e)}
        >
          <span className="text-white font-black text-lg tracking-tighter uppercase">ATIRAR</span>
        </button>
      </div>
    </div>
  );
};

export default MobileControls;
