
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
      {/* Botões de Direção - Esquerda Inferior - Layout adaptado para polegares em paisagem */}
      <div className="flex gap-4 md:gap-8 pointer-events-auto items-center mb-2 ml-2">
        <button
          className="w-16 h-16 md:w-20 md:h-20 bg-white/10 backdrop-blur-md rounded-2xl border-2 border-white/20 flex items-center justify-center active:bg-white/40 active:scale-90 transition-all shadow-lg"
          onTouchStart={(e) => handleTouch('ArrowLeft', e)}
          onTouchEnd={(e) => handleEnd('ArrowLeft', e)}
        >
          <svg className="w-8 h-8 md:w-10 md:h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <button
          className="w-16 h-16 md:w-20 md:h-20 bg-white/10 backdrop-blur-md rounded-2xl border-2 border-white/20 flex items-center justify-center active:bg-white/40 active:scale-90 transition-all shadow-lg"
          onTouchStart={(e) => handleTouch('ArrowRight', e)}
          onTouchEnd={(e) => handleEnd('ArrowRight', e)}
        >
          <svg className="w-8 h-8 md:w-10 md:h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Botão de Ação - Direita Inferior - Tamanho e cor otimizados para destaque sem bloquear visão */}
      <div className="pointer-events-auto mb-2 mr-2">
        <button
          className="w-20 h-20 md:w-28 md:h-28 bg-cyan-500/20 backdrop-blur-xl rounded-full border-4 border-cyan-400/40 flex items-center justify-center active:bg-cyan-400/80 active:scale-95 transition-all shadow-[0_0_30px_rgba(34,211,238,0.3)]"
          onTouchStart={(e) => handleTouch(' ', e)}
          onTouchEnd={(e) => handleEnd(' ', e)}
        >
          <div className="flex flex-col items-center">
            <span className="text-white font-black text-sm md:text-lg tracking-tighter uppercase leading-none">
              {mode === 'PLATFORMER' ? 'PULAR' : 'ATIRAR'}
            </span>
            {mode === 'SHOOTER' && (
              <div className="mt-1 w-6 h-1 bg-cyan-400 rounded-full animate-pulse" />
            )}
          </div>
        </button>
      </div>
    </div>
  );
};

export default MobileControls;
