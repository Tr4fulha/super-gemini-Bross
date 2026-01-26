
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
    <div className="fixed bottom-8 left-0 right-0 px-6 flex justify-between items-end pointer-events-none select-none">
      {/* Directional Pad */}
      <div className="flex gap-4 pointer-events-auto">
        <button
          className="w-20 h-20 bg-white/20 backdrop-blur-md rounded-full border-2 border-white/50 flex items-center justify-center active:scale-90 transition-transform"
          onTouchStart={(e) => handleTouch('ArrowLeft', e)}
          onTouchEnd={(e) => handleEnd('ArrowLeft', e)}
        >
          <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <button
          className="w-20 h-20 bg-white/20 backdrop-blur-md rounded-full border-2 border-white/50 flex items-center justify-center active:scale-90 transition-transform"
          onTouchStart={(e) => handleTouch('ArrowRight', e)}
          onTouchEnd={(e) => handleEnd('ArrowRight', e)}
        >
          <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Action Buttons */}
      <div className="pointer-events-auto">
        <button
          className="w-24 h-24 bg-red-500/50 backdrop-blur-md rounded-full border-4 border-white/70 flex items-center justify-center active:scale-90 transition-transform shadow-lg"
          onTouchStart={(e) => handleTouch(' ', e)}
          onTouchEnd={(e) => handleEnd(' ', e)}
        >
          <span className="text-white font-bold text-xl">JUMP</span>
        </button>
      </div>
    </div>
  );
};

export default MobileControls;
