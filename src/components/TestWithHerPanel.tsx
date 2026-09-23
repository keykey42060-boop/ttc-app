import React from 'react';
import { BusRouteConfig, BusState, AccessibilitySettings } from '../types/bus';
import { Sliders, Eye, Volume2, FastForward, Play, Pause, RefreshCw, X, Shield, Phone } from 'lucide-react';

interface TestWithHerPanelProps {
  route: BusRouteConfig;
  busState: BusState;
  settings: AccessibilitySettings;
  isPlaying: boolean;
  simulationSpeedMultiplier: number;
  onTogglePlay: () => void;
  onSetSpeed: (speed: number) => void;
  onJumpStage: (stage: 'start' | 'midway' | 'arriving' | 'atStop') => void;
  onUpdateSettings: (newSettings: Partial<AccessibilitySettings>) => void;
  onClose: () => void;
}

export const TestWithHerPanel: React.FC<TestWithHerPanelProps> = ({
  route,
  busState,
  settings,
  isPlaying,
  simulationSpeedMultiplier,
  onTogglePlay,
  onSetSpeed,
  onJumpStage,
  onUpdateSettings,
  onClose,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/50 backdrop-blur-xs animate-fade-in">
      <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 w-full max-w-md h-full p-6 shadow-2xl overflow-y-auto flex flex-col justify-between border-l border-slate-200 dark:border-slate-800">
        <div>
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2.5">
              <Sliders className="w-6 h-6 text-red-600" />
              <div>
                <h3 className="font-black text-xl leading-none">Test With Mom</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Caregiver iteration controls</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white"
              aria-label="Close"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* SIMULATION PLAYBACK & JUMP CONTROLS */}
          <div className="mt-5 p-4 rounded-2xl bg-slate-100 dark:bg-slate-800/80 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-sm uppercase tracking-wide text-slate-600 dark:text-slate-400">
                Bus Movement Simulator
              </span>
              <span className="font-bold text-xs text-red-600 dark:text-red-400">
                1st: {busState.bus1.minutesAway}m ({Math.round(busState.bus1.progress * 100)}%) · 2nd: {busState.bus2.minutesAway}m
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={onTogglePlay}
                className="flex-1 py-2.5 px-3 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-sm flex items-center justify-center gap-2"
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                <span>{isPlaying ? 'Pause' : 'Play Live'}</span>
              </button>

              <button
                onClick={() => onSetSpeed(simulationSpeedMultiplier === 1 ? 5 : simulationSpeedMultiplier === 5 ? 12 : 1)}
                className="py-2.5 px-3 rounded-xl border border-slate-300 dark:border-slate-600 font-bold text-xs"
              >
                {simulationSpeedMultiplier}x Speed
              </button>
            </div>

            {/* Quick Milestone Jumps */}
            <div className="pt-2">
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-2">Jump to Milestone:</p>
              <div className="grid grid-cols-2 gap-2 text-xs font-semibold">
                <button
                  onClick={() => onJumpStage('start')}
                  className="py-2 px-2.5 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-left hover:border-red-500"
                >
                  ⏱️ 10 min away
                </button>
                <button
                  onClick={() => onJumpStage('midway')}
                  className="py-2 px-2.5 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-left hover:border-red-500"
                >
                  🧥 5 min away
                </button>
                <button
                  onClick={() => onJumpStage('arriving')}
                  className="py-2 px-2.5 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-left hover:border-red-500"
                >
                  🚶 2 min away
                </button>
                <button
                  onClick={() => onJumpStage('atStop')}
                  className="py-2 px-2.5 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-left hover:border-red-500"
                >
                  🎉 Arrived at stop
                </button>
              </div>
            </div>
          </div>

          {/* TEXT SIZE ADJUSTMENT */}
          <div className="mt-5 space-y-2">
            <label className="font-extrabold text-sm flex items-center gap-2">
              <Eye className="w-4 h-4 text-red-600" />
              <span>Text Size (For Mom's Eyesight)</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['large', 'xlarge', 'huge'] as const).map((size) => (
                <button
                  key={size}
                  onClick={() => onUpdateSettings({ textSize: size })}
                  className={`py-3 px-2 rounded-xl text-center font-bold text-sm border-2 transition-all ${
                    settings.textSize === size
                      ? 'border-red-600 bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300'
                      : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                  }`}
                >
                  {size === 'large' ? 'Standard' : size === 'xlarge' ? 'Large' : 'Giant'}
                </button>
              ))}
            </div>
          </div>

          {/* CONTRAST THEME */}
          <div className="mt-5 space-y-2">
            <label className="font-extrabold text-sm flex items-center gap-2">
              <span>🎨 Contrast Mode</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => onUpdateSettings({ theme: 'daylight' })}
                className={`py-2.5 px-2 rounded-xl text-center font-bold text-xs border-2 ${
                  settings.theme === 'daylight'
                    ? 'border-red-600 bg-slate-100 text-slate-900 font-black'
                    : 'border-slate-200 text-slate-600'
                }`}
              >
                🌞 Clean Light
              </button>
              <button
                onClick={() => onUpdateSettings({ theme: 'night' })}
                className={`py-2.5 px-2 rounded-xl text-center font-bold text-xs border-2 ${
                  settings.theme === 'night'
                    ? 'border-red-600 bg-slate-900 text-white font-black'
                    : 'border-slate-200 text-slate-600'
                }`}
              >
                🌙 Dark Mode
              </button>
              <button
                onClick={() => onUpdateSettings({ theme: 'contrast-yellow' })}
                className={`py-2.5 px-2 rounded-xl text-center font-bold text-xs border-2 ${
                  settings.theme === 'contrast-yellow'
                    ? 'border-yellow-400 bg-black text-yellow-300 font-black'
                    : 'border-slate-200 text-slate-600'
                }`}
              >
                🟡 High Yellow
              </button>
            </div>
          </div>

          {/* VOICE SPEED */}
          <div className="mt-5 space-y-2">
            <label className="font-extrabold text-sm flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-red-600" />
                <span>Voice Speed (Read Aloud)</span>
              </span>
              <span className="text-xs font-bold text-slate-500">{settings.voiceSpeed}x</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[0.75, 0.85, 1.0].map((rate) => (
                <button
                  key={rate}
                  onClick={() => onUpdateSettings({ voiceSpeed: rate })}
                  className={`py-2 px-2 rounded-xl text-center font-bold text-xs border-2 ${
                    settings.voiceSpeed === rate
                      ? 'border-red-600 bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300'
                      : 'border-slate-200 dark:border-slate-700'
                  }`}
                >
                  {rate === 0.75 ? 'Slower' : rate === 0.85 ? 'Gentle' : 'Normal'}
                </button>
              ))}
            </div>
          </div>

          {/* CONTACT INFO */}
          <div className="mt-5 space-y-3">
            <label className="font-extrabold text-sm flex items-center gap-2">
              <Phone className="w-4 h-4 text-emerald-600" />
              <span>Helper Contact (For 1-Tap Call)</span>
            </label>
            <div className="space-y-2">
              <input
                type="text"
                value={settings.contactName}
                onChange={(e) => onUpdateSettings({ contactName: e.target.value })}
                placeholder="Contact Name (e.g. Daughter Sarah)"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold"
              />
              <input
                type="tel"
                value={settings.contactPhone}
                onChange={(e) => onUpdateSettings({ contactPhone: e.target.value })}
                placeholder="Phone Number (e.g. 416-555-0192)"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-6 border-t border-slate-200 dark:border-slate-800 mt-6">
          <button
            onClick={onClose}
            className="w-full py-3.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-extrabold text-base"
          >
            Apply & Close
          </button>
        </div>
      </div>
    </div>
  );
};
