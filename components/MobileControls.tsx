
import React from 'react';

interface MobileControlsProps {
  onPress: (key: string, pressed: boolean) => void;
}

const MobileControls: React.FC<MobileControlsProps> = ({ onPress }) => {
  const handleTouch = (key: string, e: React.TouchEvent) => {
    e.preventDefault();
    onPress(key, true);
  };

  const handleEnd = (key: string, e: React.TouchEvent) => {
    e.preventDefault();
    onPress(key, false);
  };

  return (
    <div className="fixed inset-0 pointer-events-none select-none z-50">
      {/* Botões de Direção - Esquerda Inferior */}
      <div className="absolute bottom-8 left-8 flex gap-6 pointer-events-auto">
        <button
          className="w-20 h-20 bg-black/30 backdrop-blur-lg rounded-2xl border-2 border-white/20 flex items-center justify-center active:bg-white/40 active:scale-90 transition-all"
          onTouchStart={(e) => handleTouch('ArrowLeft', e)}
          onTouchEnd={(e) => handleEnd('ArrowLeft', e)}
        >
          <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <button
          className="w-20 h-20 bg-black/30 backdrop-blur-lg rounded-2xl border-2 border-white/20 flex items-center justify-center active:bg-white/40 active:scale-90 transition-all"
          onTouchStart={(e) => handleTouch('ArrowRight', e)}
          onTouchEnd={(e) => handleEnd('ArrowRight', e)}
        >
          <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Botão de Pulo - Direita Inferior */}
      <div className="absolute bottom-8 right-8 pointer-events-auto">
        <button
          className="w-24 h-24 bg-cyan-600/40 backdrop-blur-lg rounded-full border-4 border-cyan-400/50 flex items-center justify-center active:bg-cyan-400 active:scale-95 transition-all shadow-2xl"
          onTouchStart={(e) => handleTouch(' ', e)}
          onTouchEnd={(e) => handleEnd(' ', e)}
        >
          <span className="text-white font-black text-xl tracking-tighter">PULAR</span>
        </button>
      </div>
    </div>
  );
};

export default MobileControls;
