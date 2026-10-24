import React from 'react';
import { Play, ShieldAlert, Smartphone, Volume2, Skull, Eye } from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton';
import { soundManager } from '../audio/SoundManager';

interface Props {
  onStart: () => void;
}

export const MainMenu: React.FC<Props> = ({ onStart }) => {
  const handleStart = () => {
    soundManager.init();
    soundManager.resume();
    onStart();
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-gradient-to-b from-black via-[#090b0e] to-black text-white select-none overflow-y-auto">
      {/* Background Grungy Atmosphere */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(130,20,20,0.25),transparent_70%)] pointer-events-none" />

      <div className="relative max-w-xl w-full bg-zinc-950/80 border border-zinc-800/90 rounded-2xl p-6 md:p-8 shadow-2xl backdrop-blur-md flex flex-col items-center text-center">
        {/* Warning Icon Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-950/80 border border-red-700/60 text-red-400 text-xs font-mono uppercase tracking-wider mb-3">
          <Skull className="w-3.5 h-3.5" />
          <span>Спецблок №9 • Режим изоляции</span>
        </div>

        {/* Title */}
        <h1 className="text-3xl md:text-5xl font-black tracking-tight text-white uppercase drop-shadow-[0_4px_12px_rgba(239,68,68,0.35)]">
          ПСИХБОЛЬНИЦА
        </h1>
        <h2 className="text-xl md:text-2xl font-bold tracking-widest text-red-500 uppercase mt-1">
          ТЕМНЫЙ ПОБЕГ
        </h2>

        {/* Story prologue */}
        <p className="mt-4 text-xs md:text-sm text-zinc-300 leading-relaxed max-w-md">
          Эксперимент в психиатрической клинике вышел из-под контроля. <strong className="text-white">Пациент Ноль</strong> бродит по темным палатам.
          Все двери заблокированы, а генератор обесточен. Услышав шаги — <strong className="text-red-400">ПРЯЧЬТЕСЬ В ШКАФАХ</strong> и задерживайте дыхание!
        </p>

        {/* Action Buttons */}
        <div className="mt-6 w-full flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={handleStart}
            className="w-full sm:w-auto flex-1 flex items-center justify-center gap-3 px-6 py-3.5 rounded-xl bg-red-700 hover:bg-red-600 text-white font-bold text-base md:text-lg tracking-wide border border-red-500/60 shadow-xl shadow-red-950/60 active:scale-95 transition cursor-pointer"
          >
            <Play className="w-5 h-5 fill-current" />
            <span>НАЧАТЬ ПОБЕГ</span>
          </button>

          <div className="w-full sm:w-auto">
            <PWAInstallButton />
          </div>
        </div>

        {/* Control Instructions */}
        <div className="mt-6 w-full pt-4 border-t border-zinc-800/80 grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
          {/* PC Controls */}
          <div className="bg-zinc-900/60 p-3 rounded-lg border border-zinc-800 text-[11px] text-zinc-300 space-y-1">
            <div className="text-amber-400 font-mono font-bold flex items-center gap-1.5 mb-1.5">
              <span>🖥 Управление на ПК:</span>
            </div>
            <div><strong>W, A, S, D</strong> — Передвижение</div>
            <div><strong>Мышь</strong> — Оглядеться по сторонам</div>
            <div><strong>[E]</strong> — Спрятаться в шкаф / Взять</div>
            <div><strong>[Пробел]</strong> — Задержать дыхание в шкафу</div>
            <div><strong>[F]</strong> — Фонарик • <strong>Shift</strong> — Бег</div>
          </div>

          {/* Mobile Controls */}
          <div className="bg-zinc-900/60 p-3 rounded-lg border border-zinc-800 text-[11px] text-zinc-300 space-y-1">
            <div className="text-cyan-400 font-mono font-bold flex items-center gap-1.5 mb-1.5">
              <Smartphone className="w-3.5 h-3.5" />
              <span>📱 На телефоне (PWA):</span>
            </div>
            <div><strong>Левая область</strong> — Виртуальный джойстик</div>
            <div><strong>Правая область</strong> — Провести пальцем (взгляд)</div>
            <div><strong>Кнопка [Рука]</strong> — Спрятаться в шкаф</div>
            <div><strong>Кнопка [Легкие]</strong> — Задержка дыхания</div>
            <div><strong>Кнопки справа</strong> — Фонарик и Бег</div>
          </div>
        </div>

        {/* Atmospheric Sound Note */}
        <div className="mt-4 flex items-center gap-2 text-[11px] text-zinc-400 font-mono">
          <Volume2 className="w-4 h-4 text-zinc-300" />
          <span>Рекомендуется играть в наушниках для объемного звука шагов монстра</span>
        </div>
      </div>
    </div>
  );
};
