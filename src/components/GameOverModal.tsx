import React from 'react';
import { Skull, Award, RotateCcw } from 'lucide-react';
import { soundManager } from '../audio/SoundManager';

interface Props {
  isVictory: boolean;
  reason?: string;
  onRestart: () => void;
}

export const GameOverModal: React.FC<Props> = ({ isVictory, reason, onRestart }) => {
  const handleRestart = () => {
    soundManager.resume();
    onRestart();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md text-white select-none animate-fadeIn">
      <div
        className={`relative max-w-md w-full p-6 md:p-8 rounded-2xl border text-center shadow-2xl ${
          isVictory
            ? 'bg-zinc-950/90 border-emerald-500/50 shadow-emerald-950/50'
            : 'bg-zinc-950/90 border-red-600/70 shadow-red-950/70'
        }`}
      >
        {/* Icon */}
        <div className="flex justify-center mb-4">
          {isVictory ? (
            <div className="w-16 h-16 rounded-full bg-emerald-950 border-2 border-emerald-500 flex items-center justify-center text-emerald-400">
              <Award className="w-9 h-9" />
            </div>
          ) : (
            <div className="w-16 h-16 rounded-full bg-red-950 border-2 border-red-600 flex items-center justify-center text-red-500 animate-pulse">
              <Skull className="w-9 h-9" />
            </div>
          )}
        </div>

        {/* Title */}
        <h2
          className={`text-2xl md:text-3xl font-black uppercase tracking-wider ${
            isVictory ? 'text-emerald-400' : 'text-red-500'
          }`}
        >
          {isVictory ? 'ВЫ ВЫЖИЛИ!' : 'ВЫ ПОГИБЛИ'}
        </h2>

        {/* Message */}
        <p className="mt-3 text-xs md:text-sm text-zinc-300 leading-relaxed">
          {isVictory
            ? 'Резервный генератор активирован, мастер-карта принята замком. Массивные железные двери распахнулись, и вы вырвались на свободу из проклятой психиатрической клиники!'
            : reason || 'Пациент Ноль настиг вас во мраке больничных коридоров...'}
        </p>

        {/* Tips for survival if died */}
        {!isVictory && (
          <div className="mt-4 p-3 rounded-lg bg-red-950/40 border border-red-900/60 text-[11px] text-zinc-400 text-left space-y-1">
            <div className="text-red-400 font-bold font-mono">СОВЕТ ДЛЯ ВЫЖИВАНИЯ:</div>
            <div>• Заслышав тяжелые шаги или скрежет цепей, немедленно ищите шкаф <strong>[E]</strong>.</div>
            <div>• Внутри шкафа обязательно <strong>удерживайте [Пробел]</strong> или кнопку дыхания, чтобы не выдать себя!</div>
            <div>• Не бегите рядом с монстром — он услышит топот.</div>
          </div>
        )}

        {/* Action Button */}
        <button
          onClick={handleRestart}
          className={`mt-6 w-full flex items-center justify-center gap-2 py-3 px-6 rounded-xl font-bold text-base tracking-wide border shadow-xl transition active:scale-95 cursor-pointer ${
            isVictory
              ? 'bg-emerald-700 hover:bg-emerald-600 text-white border-emerald-400'
              : 'bg-red-700 hover:bg-red-600 text-white border-red-500 shadow-red-950/50'
          }`}
        >
          <RotateCcw className="w-5 h-5" />
          <span>{isVictory ? 'ИГРАТЬ ЕЩЕ РАЗ' : 'ПОПРОБОВАТЬ СНОВА'}</span>
        </button>
      </div>
    </div>
  );
};
