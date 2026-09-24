import React from 'react';
import { AccessibilitySettings } from '../types/bus';
import { Sliders, Eye, Volume2, X, Phone } from 'lucide-react';

interface TestWithHerPanelProps {
  settings: AccessibilitySettings;
  onUpdateSettings: (newSettings: Partial<AccessibilitySettings>) => void;
  onClose: () => void;
}

export const TestWithHerPanel: React.FC<TestWithHerPanelProps> = ({
  settings,
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

          {/* TEXT SIZE ADJUSTMENT */}
          <div className="mt-5 space-y-2">
            <label className="font-extrabold text-sm flex items-center gap-2">
              <Eye className="w-4 h-4 text-red-600" />
              <span>Text Size (For Mom's Eyesight)</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
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

          {/* LIGHT / DARK APPEARANCE */}
          <div className="mt-5 space-y-2">
            <label className="font-extrabold text-sm flex items-center gap-2">
              <span>🎨 Appearance</span>
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
