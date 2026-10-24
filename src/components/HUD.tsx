import React from 'react';
import { GameEngine } from '../game/GameEngine';
import { Battery, Zap, Heart, Wind, Key, ShieldCheck, Volume2, VolumeX, Sparkles } from 'lucide-react';
import { soundManager } from '../audio/SoundManager';
import { PWAInstallButton } from './PWAInstallButton';

interface Props {
  engine: GameEngine;
  onOpenSettings?: () => void;
}

export const HUD: React.FC<Props> = ({ engine }) => {
  const stats = engine.player.stats;
  const isHiding = stats.isHiding;
  const isNearLocker = !!engine.player.nearestLocker;
  const fearLevel = stats.fearLevel; // 0 to 100
  const [muted, setMuted] = React.useState(false);

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    soundManager.setMasterVolume(next ? 0 : 0.85);
  };

  // Heart rate calculated from fear
  const bpm = Math.round(60 + (fearLevel / 100) * 110);

  return (
    <div className="fixed inset-0 pointer-events-none z-20 select-none overflow-hidden">
      {/* 1. High Fear / Heartbeat Red Edge Vignette */}
      {fearLevel > 20 && (
        <div
          className="absolute inset-0 pointer-events-none transition-opacity duration-300"
          style={{
            background: `radial-gradient(circle at 50% 50%, transparent 40%, rgba(136, 19, 19, ${
              (fearLevel / 100) * 0.75
            }) 100%)`,
          }}
        />
      )}

      {/* 2. Realistic Locker View Slats (when hiding inside a closet) */}
      {isHiding && (
        <div className="absolute inset-0 pointer-events-none flex flex-col justify-between">
          {/* Top locker dark rim */}
          <div className="h-14 bg-black/95 border-b-4 border-zinc-800" />

          {/* Vertical metal locker louvers / slits overlay */}
          <div className="flex-1 flex flex-col justify-evenly px-4 py-2 opacity-95">
            {Array.from({ length: 14 }).map((_, i) => (
              <div
                key={i}
                className="w-full h-3 bg-gradient-to-b from-zinc-950 via-zinc-900 to-black shadow-inner border-y border-zinc-950"
              />
            ))}
          </div>

          {/* Bottom locker dark rim */}
          <div className="h-20 bg-black/95 border-t-4 border-zinc-800 flex items-center justify-center">
            <div className="flex items-center gap-4 text-xs md:text-sm font-mono text-zinc-300">
              <span className="flex items-center gap-1.5 text-amber-400 font-bold">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping" />
                ВЫ В ШКАФУ
              </span>
              <span>•</span>
              <span className="text-cyan-400">
                [ПРОБЕЛ] / Зажать кнопку: Задержать дыхание ({Math.round(stats.breathRemaining)}%)
              </span>
              <span>•</span>
              <span className="text-zinc-400">[E] / Кнопка: Выйти из шкафа</span>
            </div>
          </div>
        </div>
      )}

      {/* 3. Top Bar: Vital Status Meters */}
      <div className="absolute top-4 left-4 right-4 flex items-start justify-between pointer-events-auto">
        {/* Left: Vitals */}
        <div className="flex flex-col gap-2.5 bg-black/60 backdrop-blur-md p-3 rounded-xl border border-zinc-800/80 shadow-xl max-w-xs">
          {/* Heart Rate / Fear */}
          <div className="flex items-center gap-2">
            <Heart
              className={`w-4 h-4 transition-transform ${
                fearLevel > 60 ? 'text-red-500 scale-125' : 'text-rose-400'
              }`}
            />
            <div className="flex-1">
              <div className="flex justify-between text-[11px] font-mono text-zinc-300 mb-1">
                <span>ПУЛЬС</span>
                <span className={bpm > 120 ? 'text-red-400 font-bold' : 'text-zinc-400'}>
                  {bpm} BPM
                </span>
              </div>
              <div className="w-36 h-1.5 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800">
                <div
                  className="h-full bg-rose-600 transition-all duration-300"
                  style={{ width: `${fearLevel}%` }}
                />
              </div>
            </div>
          </div>

          {/* Stamina Meter */}
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-400" />
            <div className="flex-1">
              <div className="flex justify-between text-[11px] font-mono text-zinc-300 mb-1">
                <span>ВЫНОСЛИВОСТЬ</span>
                <span>{Math.round(stats.stamina)}%</span>
              </div>
              <div className="w-36 h-1.5 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800">
                <div
                  className={`h-full transition-all duration-150 ${
                    stats.stamina < 20 ? 'bg-red-500 animate-pulse' : 'bg-amber-400'
                  }`}
                  style={{ width: `${stats.stamina}%` }}
                />
              </div>
            </div>
          </div>

          {/* Flashlight Battery */}
          <div className="flex items-center gap-2">
            <Battery
              className={`w-4 h-4 ${
                stats.battery < 20 ? 'text-red-400 animate-pulse' : 'text-emerald-400'
              }`}
            />
            <div className="flex-1">
              <div className="flex justify-between text-[11px] font-mono text-zinc-300 mb-1">
                <span>ФОНАРИК [F]</span>
                <span className={stats.isFlashlightOn ? 'text-emerald-400' : 'text-zinc-500'}>
                  {stats.isFlashlightOn ? `${Math.round(stats.battery)}%` : 'ВЫКЛ'}
                </span>
              </div>
              <div className="w-36 h-1.5 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800">
                <div
                  className={`h-full transition-all duration-300 ${
                    stats.battery < 20 ? 'bg-red-500' : 'bg-emerald-500'
                  }`}
                  style={{ width: `${stats.battery}%` }}
                />
              </div>
            </div>
          </div>

          {/* Breath Meter (if in locker) */}
          {isHiding && (
            <div className="flex items-center gap-2 pt-1 border-t border-zinc-800">
              <Wind
                className={`w-4 h-4 ${
                  stats.isHoldingBreath ? 'text-cyan-400 animate-pulse' : 'text-zinc-500'
                }`}
              />
              <div className="flex-1">
                <div className="flex justify-between text-[11px] font-mono text-cyan-300 mb-1">
                  <span>ДЫХАНИЕ</span>
                  <span>{Math.round(stats.breathRemaining)}%</span>
                </div>
                <div className="w-36 h-1.5 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800">
                  <div
                    className="h-full bg-cyan-400 transition-all duration-150"
                    style={{ width: `${stats.breathRemaining}%` }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right: Objectives & Inventory & PWA */}
        <div className="flex flex-col items-end gap-2.5">
          {/* Header controls: Quality Toggle, Sound & PWA */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const next = engine.graphicsQuality === 'fast' ? 'high' : 'fast';
                engine.setGraphicsQuality(next);
              }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-zinc-900/80 border border-zinc-700/80 text-[11px] font-mono text-zinc-300 hover:text-white shadow-md active:scale-95 cursor-pointer backdrop-blur-sm"
              title="Переключить качество графики"
            >
              {engine.graphicsQuality === 'fast' ? (
                <>
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-amber-300 font-bold">60 FPS (Эко)</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="text-cyan-300 font-bold">Качество</span>
                </>
              )}
            </button>
            <PWAInstallButton />
            <button
              onClick={toggleMute}
              className="p-2 rounded-lg bg-zinc-900/80 border border-zinc-700/80 text-zinc-300 hover:text-white shadow-md active:scale-95 cursor-pointer backdrop-blur-sm"
              title={muted ? 'Включить звук' : 'Выключить звук'}
            >
              {muted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4" />}
            </button>
          </div>

          {/* Objectives Box */}
          <div className="bg-black/60 backdrop-blur-md p-3 rounded-xl border border-zinc-800/80 shadow-xl max-w-xs text-right">
            <div className="text-[10px] font-mono tracking-widest text-red-400 uppercase font-bold mb-1">
              ЦЕЛЬ ВЫЖИВАНИЯ
            </div>
            <div className="text-xs text-zinc-200 leading-snug">
              {!engine.isGeneratorActive ? (
                <span>1. Найдите ключ-карту и запустите <strong>генератор в Морге</strong>.</span>
              ) : !engine.inventory.some((i) => i.id === 'keycard_master_exit') ? (
                <span>2. Возьмите <strong>Мастер-карту</strong> в Морге!</span>
              ) : (
                <span className="text-emerald-400 font-bold">3. БЕГИТЕ К ГЛАВНОМУ ВЫХОДУ!</span>
              )}
            </div>

            {/* Keys / Inventory */}
            {engine.inventory.length > 0 && (
              <div className="mt-2.5 pt-2 border-t border-zinc-800/80 flex flex-wrap justify-end gap-1.5">
                {engine.inventory.map((item) => (
                  <span
                    key={item.id}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-zinc-800/90 border border-amber-500/40 text-[10px] text-amber-300 font-mono"
                  >
                    <Key className="w-3 h-3 text-amber-400" />
                    {item.name}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 4. Center Crosshair / Prompt */}
      {!isHiding && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          {/* Subtle Reticle Dot */}
          <div className="w-1.5 h-1.5 rounded-full bg-white/40 shadow-sm" />

          {/* Interaction Banner */}
          {isNearLocker && (
            <div className="absolute top-[56%] flex items-center gap-2 px-4 py-2 rounded-xl bg-red-950/90 border border-red-500/80 text-white text-xs md:text-sm font-semibold tracking-wide shadow-2xl animate-pulse">
              <span className="px-1.5 py-0.5 rounded bg-red-800 font-mono text-xs font-bold border border-red-400">
                E
              </span>
              <span>СПРЯТАТЬСЯ В ШКАФ</span>
            </div>
          )}
        </div>
      )}

      {/* 5. Center Bottom Message Banner (Notes / Game events) */}
      {engine.currentMessage && (
        <div className="absolute bottom-28 left-1/2 -translate-x-1/2 max-w-lg w-[90%] bg-zinc-950/95 border border-zinc-700/80 p-3.5 rounded-2xl shadow-2xl text-center text-xs md:text-sm text-zinc-100 font-medium leading-relaxed pointer-events-auto backdrop-blur-md">
          {engine.currentMessage}
        </div>
      )}
    </div>
  );
};
