import React, { useEffect, useRef, useState } from 'react';
import { GameEngine } from './game/GameEngine';
import { HUD } from './components/HUD';
import { MobileControls } from './components/MobileControls';
import { MainMenu } from './components/MainMenu';
import { GameOverModal } from './components/GameOverModal';
import { soundManager } from './audio/SoundManager';

export default function App() {
  const canvasMountRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<GameEngine | null>(null);

  const [gameStarted, setGameStarted] = useState(false);
  const [gameStatus, setGameStatus] = useState<'PLAYING' | 'GAMEOVER' | 'VICTORY'>('PLAYING');
  const [gameOverReason, setGameOverReason] = useState('');
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [, setRenderTrigger] = useState(0);

  // Detect touch device
  useEffect(() => {
    const checkTouch = () => {
      setIsTouchDevice(
        'ontouchstart' in window ||
        navigator.maxTouchPoints > 0 ||
        window.matchMedia('(pointer: coarse)').matches
      );
    };
    checkTouch();
  }, []);

  // Initialize Game Engine once
  useEffect(() => {
    if (!canvasMountRef.current) return;

    const engine = new GameEngine(canvasMountRef.current, (eng) => {
      // Callback whenever state changes
      if (eng.status === 'GAMEOVER' || eng.status === 'VICTORY') {
        setGameStatus(eng.status);
        setGameOverReason(eng.currentMessage);
      }
      // Force light react state tick for HUD updates
      setRenderTrigger((prev) => (prev + 1) % 10000);
    });

    engineRef.current = engine;

    // Desktop Keyboard Listeners
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!engineRef.current) return;
      const player = engineRef.current.player;

      switch (e.code) {
        case 'KeyW':
        case 'ArrowUp':
          player.moveForward = true;
          break;
        case 'KeyS':
        case 'ArrowDown':
          player.moveBackward = true;
          break;
        case 'KeyA':
        case 'ArrowLeft':
          player.moveLeft = true;
          break;
        case 'KeyD':
        case 'ArrowRight':
          player.moveRight = true;
          break;
        case 'ShiftLeft':
        case 'ShiftRight':
          player.setSprinting(true);
          break;
        case 'KeyC':
        case 'ControlLeft':
          player.toggleCrouch();
          break;
        case 'KeyF':
          player.toggleFlashlight();
          break;
        case 'KeyE':
          engineRef.current.interact();
          break;
        case 'Space':
          if (player.stats.isHiding) {
            e.preventDefault();
            player.stats.isHoldingBreath = true;
          }
          break;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (!engineRef.current) return;
      const player = engineRef.current.player;

      switch (e.code) {
        case 'KeyW':
        case 'ArrowUp':
          player.moveForward = false;
          break;
        case 'KeyS':
        case 'ArrowDown':
          player.moveBackward = false;
          break;
        case 'KeyA':
        case 'ArrowLeft':
          player.moveLeft = false;
          break;
        case 'KeyD':
        case 'ArrowRight':
          player.moveRight = false;
          break;
        case 'ShiftLeft':
        case 'ShiftRight':
          player.setSprinting(false);
          break;
        case 'Space':
          player.stats.isHoldingBreath = false;
          break;
      }
    };

    // Mouse Pointer Lock & Camera Look for Desktop
    const handleMouseMove = (e: MouseEvent) => {
      if (!engineRef.current || document.pointerLockElement !== canvasMountRef.current) return;
      const player = engineRef.current.player;

      const sensitivity = 0.0022;
      player.yaw -= e.movementX * sensitivity;
      player.pitch = Math.max(-Math.PI / 2.3, Math.min(Math.PI / 2.3, player.pitch - e.movementY * sensitivity));
    };

    const handleCanvasClick = () => {
      if (canvasMountRef.current && !document.pointerLockElement) {
        canvasMountRef.current.requestPointerLock?.();
      }
      soundManager.resume();
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousemove', handleMouseMove);
    canvasMountRef.current.addEventListener('click', handleCanvasClick);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousemove', handleMouseMove);
      if (engineRef.current) {
        engineRef.current.destroy();
      }
    };
  }, []);

  const handleStartGame = () => {
    setGameStarted(true);
    setGameStatus('PLAYING');
    if (canvasMountRef.current && !isTouchDevice) {
      canvasMountRef.current.requestPointerLock?.();
    }
  };

  const handleRestart = () => {
    if (engineRef.current) {
      engineRef.current.restart();
      setGameStatus('PLAYING');
      setGameOverReason('');
      if (canvasMountRef.current && !isTouchDevice) {
        canvasMountRef.current.requestPointerLock?.();
      }
    }
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black text-white select-none">
      {/* 1. 3D WebGL Canvas Container */}
      <div
        ref={canvasMountRef}
        className="absolute inset-0 cursor-crosshair z-0"
      />

      {/* 2. Main Menu Overlay before start */}
      {!gameStarted && <MainMenu onStart={handleStartGame} />}

      {/* 3. In-Game HUD Overlay */}
      {gameStarted && engineRef.current && (
        <HUD engine={engineRef.current} />
      )}

      {/* 4. Mobile Controls (if touch device) */}
      {gameStarted && engineRef.current && isTouchDevice && (
        <MobileControls engine={engineRef.current} />
      )}

      {/* 5. Game Over / Victory Modal */}
      {gameStarted && (gameStatus === 'GAMEOVER' || gameStatus === 'VICTORY') && (
        <GameOverModal
          isVictory={gameStatus === 'VICTORY'}
          reason={gameOverReason}
          onRestart={handleRestart}
        />
      )}
    </div>
  );
}
