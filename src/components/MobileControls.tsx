import React, { useRef, useState, useEffect } from 'react';
import { GameEngine } from '../game/GameEngine';
import { Flashlight, ShieldAlert, Wind, Footprints, Hand, Eye } from 'lucide-react';

interface Props {
  engine: GameEngine;
}

export const MobileControls: React.FC<Props> = ({ engine }) => {
  const [joystickActive, setJoystickActive] = useState(false);
  const [stickPos, setStickPos] = useState({ x: 0, y: 0 });
  const touchStartPos = useRef({ x: 0, y: 0 });

  // Right touch look zone
  const lookTouchId = useRef<number | null>(null);
  const lookLastPos = useRef({ x: 0, y: 0 });

  const isHiding = engine.player.stats.isHiding;
  const isHoldingBreath = engine.player.stats.isHoldingBreath;

  // Handle Left Joystick (Movement)
  const handleJoyStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartPos.current = { x: touch.clientX, y: touch.clientY };
    setJoystickActive(true);
    setStickPos({ x: 0, y: 0 });
  };

  const handleJoyMove = (e: React.TouchEvent) => {
    if (!joystickActive) return;
    const touch = e.touches[0];
    const dx = touch.clientX - touchStartPos.current.x;
    const dy = touch.clientY - touchStartPos.current.y;
    const maxRadius = 45;
    const dist = Math.hypot(dx, dy);

    let normX = dx;
    let normY = dy;
    if (dist > maxRadius) {
      normX = (dx / dist) * maxRadius;
      normY = (dy / dist) * maxRadius;
    }

    setStickPos({ x: normX, y: normY });
    engine.player.mobileMoveX = normX / maxRadius;
    engine.player.mobileMoveY = normY / maxRadius;
  };

  const handleJoyEnd = () => {
    setJoystickActive(false);
    setStickPos({ x: 0, y: 0 });
    engine.player.mobileMoveX = 0;
    engine.player.mobileMoveY = 0;
  };

  // Handle Right Screen Area (Camera Look)
  const handleLookStart = (e: React.TouchEvent) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      // Only capture if on the right half of the screen
      if (touch.clientX > window.innerWidth * 0.45 && lookTouchId.current === null) {
        lookTouchId.current = touch.identifier;
        lookLastPos.current = { x: touch.clientX, y: touch.clientY };
        break;
      }
    }
  };

  const handleLookMove = (e: React.TouchEvent) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === lookTouchId.current) {
        const dx = touch.clientX - lookLastPos.current.x;
        const dy = touch.clientY - lookLastPos.current.y;
        lookLastPos.current = { x: touch.clientX, y: touch.clientY };

        const sensitivity = 0.005;
        engine.player.yaw -= dx * sensitivity;
        engine.player.pitch = Math.max(-Math.PI / 2.3, Math.min(Math.PI / 2.3, engine.player.pitch - dy * sensitivity));
        break;
      }
    }
  };

  const handleLookEnd = (e: React.TouchEvent) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === lookTouchId.current) {
        lookTouchId.current = null;
        break;
      }
    }
  };

  return (
    <div className="fixed inset-0 pointer-events-none z-30 select-none overflow-hidden">
      {/* Right Screen Swipe Zone for Camera Look */}
      <div
        className="absolute right-0 top-0 w-3/5 h-full pointer-events-auto touch-none"
        onTouchStart={handleLookStart}
        onTouchMove={handleLookMove}
        onTouchEnd={handleLookEnd}
        onTouchCancel={handleLookEnd}
      />

      {/* Left Virtual Joystick */}
      {!isHiding && (
        <div
          className="absolute bottom-8 left-6 w-32 h-32 rounded-full border-2 border-white/20 bg-black/30 backdrop-blur-xs pointer-events-auto touch-none flex items-center justify-center shadow-lg"
          onTouchStart={handleJoyStart}
          onTouchMove={handleJoyMove}
          onTouchEnd={handleJoyEnd}
          onTouchCancel={handleJoyEnd}
        >
          <div
            className="w-14 h-14 rounded-full bg-zinc-200/40 border border-white/50 shadow-md transition-transform"
            style={{
              transform: `translate(${stickPos.x}px, ${stickPos.y}px)`,
            }}
          />
        </div>
      )}

      {/* Right Action Touch Buttons */}
      <div className="absolute bottom-8 right-6 flex flex-col items-end gap-3 pointer-events-auto">
        {/* Inside Locker: Hold Breath Button */}
        {isHiding && (
          <button
            onTouchStart={() => (engine.player.stats.isHoldingBreath = true)}
            onTouchEnd={() => (engine.player.stats.isHoldingBreath = false)}
            onMouseDown={() => (engine.player.stats.isHoldingBreath = true)}
            onMouseUp={() => (engine.player.stats.isHoldingBreath = false)}
            className={`flex items-center gap-2 px-5 py-3.5 rounded-2xl text-sm font-bold tracking-wide shadow-2xl transition border active:scale-95 cursor-pointer ${
              isHoldingBreath
                ? 'bg-cyan-600 text-white border-cyan-400 animate-pulse'
                : 'bg-zinc-900/90 text-cyan-300 border-cyan-800'
            }`}
          >
            <Wind className="w-5 h-5" />
            <span>{isHoldingBreath ? 'ДЕРЖИТЕ ДЫХАНИЕ...' : 'ЗАДЕРЖАТЬ ДЫХАНИЕ'}</span>
          </button>
        )}

        {/* Interact / Hide Button */}
        <button
          onClick={() => engine.interact()}
          className={`w-14 h-14 rounded-2xl flex items-center justify-center font-bold text-lg shadow-xl border active:scale-90 transition cursor-pointer backdrop-blur-md ${
            isHiding
              ? 'bg-amber-600/90 text-white border-amber-400'
              : engine.player.nearestLocker
              ? 'bg-red-700/95 text-white border-red-400 animate-bounce'
              : 'bg-zinc-800/80 text-zinc-200 border-zinc-600'
          }`}
          title="Взаимодействие / Спрятаться в шкаф"
        >
          {isHiding ? <Eye className="w-6 h-6" /> : <Hand className="w-6 h-6" />}
        </button>

        {/* Secondary controls row */}
        <div className="flex items-center gap-3">
          {/* Flashlight Button */}
          <button
            onClick={() => engine.player.toggleFlashlight()}
            className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-lg border active:scale-90 transition cursor-pointer backdrop-blur-sm ${
              engine.player.stats.isFlashlightOn
                ? 'bg-amber-500/90 text-black border-amber-300'
                : 'bg-zinc-900/80 text-zinc-400 border-zinc-700'
            }`}
            title="Фонарик"
          >
            <Flashlight className="w-5 h-5" />
          </button>

          {/* Crouch Button */}
          {!isHiding && (
            <button
              onClick={() => engine.player.toggleCrouch()}
              className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-lg border active:scale-90 transition cursor-pointer backdrop-blur-sm ${
                engine.player.stats.isCrouching
                  ? 'bg-zinc-300 text-zinc-900 border-white'
                  : 'bg-zinc-900/80 text-zinc-400 border-zinc-700'
              }`}
              title="Присесть"
            >
              <Footprints className="w-5 h-5" />
            </button>
          )}

          {/* Sprint Button */}
          {!isHiding && (
            <button
              onTouchStart={() => engine.player.setSprinting(true)}
              onTouchEnd={() => engine.player.setSprinting(false)}
              onMouseDown={() => engine.player.setSprinting(true)}
              onMouseUp={() => engine.player.setSprinting(false)}
              className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-lg border active:scale-90 transition cursor-pointer backdrop-blur-sm ${
                engine.player.stats.isSprinting
                  ? 'bg-red-600 text-white border-red-400'
                  : 'bg-zinc-900/80 text-zinc-400 border-zinc-700'
              }`}
              title="Спринт (Бег)"
            >
              <ShieldAlert className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
