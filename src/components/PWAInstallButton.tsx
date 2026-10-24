import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Download, Smartphone, X, Check } from 'lucide-react';

interface Props {
  variant?: 'button' | 'banner';
}

export const PWAInstallButton: React.FC<Props> = ({ variant = 'button' }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) {
    return (
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-950/80 border border-emerald-600/40 text-emerald-400 text-xs font-mono">
        <Check className="w-3.5 h-3.5" />
        <span>Установлено как приложение</span>
      </div>
    );
  }

  if (isInstallable) {
    return (
      <button
        onClick={install}
        className="flex items-center gap-2 rounded-lg bg-red-700/80 hover:bg-red-600 text-white px-3.5 py-2 text-xs md:text-sm font-semibold tracking-wide border border-red-500/50 shadow-lg shadow-red-950/50 transition active:scale-95 cursor-pointer backdrop-blur-sm"
        title="Скачать игру как приложение на телефон"
      >
        <Download className="w-4 h-4 animate-bounce" />
        <span>Скачать на телефон (PWA)</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className="flex items-center gap-2 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 text-zinc-200 px-3.5 py-2 text-xs md:text-sm font-semibold border border-zinc-600/60 transition active:scale-95 cursor-pointer"
        >
          <Smartphone className="w-4 h-4" />
          <span>Установить на iPhone / iPad</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fadeIn">
            <div className="w-full max-w-sm rounded-xl bg-zinc-900 border border-zinc-700 p-6 shadow-2xl text-white">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                <h3 className="text-base font-bold text-red-400 flex items-center gap-2">
                  <Smartphone className="w-5 h-5 text-red-400" />
                  Установка на iOS Safari
                </h3>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="p-1 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="mt-4 space-y-3 text-xs md:text-sm text-zinc-300">
                <p className="flex items-start gap-2">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-red-950 text-red-400 border border-red-800/60 flex items-center justify-center font-mono text-xs">1</span>
                  <span>Нажмите кнопку <strong>«Поделиться» (Share)</strong> в нижней панели Safari.</span>
                </p>
                <p className="flex items-start gap-2">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-red-950 text-red-400 border border-red-800/60 flex items-center justify-center font-mono text-xs">2</span>
                  <span>Прокрутите вниз и выберите <strong>«На экран "Домой"» (Add to Home Screen)</strong>.</span>
                </p>
                <p className="flex items-start gap-2">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-red-950 text-red-400 border border-red-800/60 flex items-center justify-center font-mono text-xs">3</span>
                  <span>Запускайте игру прямо с рабочего стола без рамок браузера!</span>
                </p>
              </div>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="mt-5 w-full rounded-lg bg-zinc-800 hover:bg-zinc-700 py-2 text-xs font-semibold text-zinc-200 transition"
              >
                Понятно
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  // Fallback info button if browser doesn't expose beforeinstallprompt yet
  return (
    <div className="text-[11px] text-zinc-500 font-mono flex items-center gap-1.5">
      <Smartphone className="w-3.5 h-3.5 text-zinc-400" />
      <span>Поддерживается PWA установка через меню браузера</span>
    </div>
  );
};
