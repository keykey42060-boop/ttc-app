import React, { useState } from 'react';
import { BusRouteConfig, BusState, AccessibilitySettings } from '../types/bus';
import { playChime, speakAnnouncement, triggerVibration, requestNotificationPermission, sendOsNotification } from '../utils/audioSpeech';
import { Bell, Check, Volume2, Smartphone, Play, X, Plus, Trash2, Sliders } from 'lucide-react';

interface NotificationPrototypeModalProps {
  route: BusRouteConfig;
  busState: BusState;
  settings: AccessibilitySettings;
  onUpdateSettings: (newSettings: Partial<AccessibilitySettings>) => void;
  onClose: () => void;
}

export const NotificationPrototypeModal: React.FC<NotificationPrototypeModalProps> = ({
  route,
  busState,
  settings,
  onUpdateSettings,
  onClose,
}) => {
  const [permissionStatus, setPermissionStatus] = useState<string>(
    typeof Notification !== 'undefined' ? Notification.permission : 'unsupported'
  );
  const [newThresholdInput, setNewThresholdInput] = useState<number>(8);
  const [activeTestNotification, setActiveTestNotification] = useState<{
    title: string;
    body: string;
    timeLabel: string;
  } | null>(null);

  const customMinutes = settings.customNotificationMinutes || [10, 5];

  const enableSystemNotifications = async () => {
    const granted = await requestNotificationPermission();
    setPermissionStatus(granted ? 'granted' : 'denied');
    if (granted) {
      sendOsNotification(
        `✅ Notifications Set for Bus #${route.routeNumber}`,
        `Mom will be notified when Bus 121 is ${customMinutes.join(' & ')} minutes away!`
      );
      playChime('gentle');
    }
  };

  const handleAddThreshold = (mins: number) => {
    if (mins <= 0 || mins > 45) return;
    if (customMinutes.includes(mins)) return;
    const updated = [...customMinutes, mins].sort((a, b) => b - a);
    onUpdateSettings({ customNotificationMinutes: updated });
  };

  const handleRemoveThreshold = (mins: number) => {
    const updated = customMinutes.filter((m) => m !== mins);
    onUpdateSettings({ customNotificationMinutes: updated });
  };

  const testCustomAlert = (minutes: number) => {
    const title = `🚌 TTC Bus 121 is ${minutes} Minutes Away`;
    const body = minutes >= 10
      ? `Bus 121 is on its way toward your stop (${route.myStopName}). Time to finish up and get ready!`
      : minutes >= 5
      ? `Bus 121 is approaching Union Station. Time to put on your coat and shoes!`
      : `Bus 121 is turning onto your street. Please walk to the bus stop bench now!`;

    setActiveTestNotification({
      title,
      body,
      timeLabel: `${minutes} MIN ALERT`,
    });

    if (settings.audioAlerts) {
      playChime(minutes <= 3 ? 'alert' : minutes <= 5 ? 'alert' : 'gentle');
    }

    if (settings.vibrateAlerts) {
      triggerVibration([250, 100, 250]);
    }

    const speechText = minutes <= 3
      ? `Mom, Bus 121 is ${minutes} minutes away. Please walk out to your stop bench now.`
      : `Mom, Bus 121 is ${minutes} minutes away. You have time to put on your coat and get ready.`;

    speakAnnouncement(speechText, settings.voiceSpeed);
    sendOsNotification(title, body);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border-2 border-slate-300 dark:border-slate-700 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Bell className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-2xl font-black">Set Up When to Notify Mom</h2>
              <p className="text-xs sm:text-sm font-semibold opacity-75">
                Customize alert distance and minutes away for TTC Bus 121
              </p>
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

        {/* Real Device Permissions Prompt */}
        <div className="mt-5 p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <Smartphone className="w-6 h-6 text-blue-600 mt-1 shrink-0" />
            <div>
              <h3 className="font-extrabold text-base text-blue-950 dark:text-blue-200">
                Push Notifications on Mom's Phone
              </h3>
              <p className="text-xs text-blue-800 dark:text-blue-300 mt-0.5">
                {permissionStatus === 'granted'
                  ? 'System alerts are active on this device.'
                  : 'Enable this so mom gets lock-screen alerts even with phone in her purse.'}
              </p>
            </div>
          </div>

          <button
            onClick={enableSystemNotifications}
            disabled={permissionStatus === 'granted'}
            className={`px-4 py-2.5 rounded-xl font-bold text-sm whitespace-nowrap transition-colors shadow-sm ${
              permissionStatus === 'granted'
                ? 'bg-emerald-600 text-white cursor-default'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            {permissionStatus === 'granted' ? '✓ Alerts Allowed' : 'Enable Device Alerts'}
          </button>
        </div>

        {/* CUSTOM NOTIFICATION THRESHOLD MANAGER (Requested by user!) */}
        <div className="mt-6 p-5 rounded-2xl bg-slate-100 dark:bg-slate-800/80 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-black">
                How far away do you want to be notified?
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Add any minutes you want (e.g. 15 min, 10 min, 5 min, 2 min).
              </p>
            </div>
          </div>

          {/* Active Alert Chips with Delete & Test */}
          <div className="flex flex-wrap gap-2.5">
            {customMinutes.map((mins) => (
              <div
                key={mins}
                className="flex items-center gap-2 pl-3.5 pr-2 py-2 rounded-xl bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 shadow-xs"
              >
                <span className="font-black text-sm">
                  {mins} min away
                </span>
                <button
                  onClick={() => testCustomAlert(mins)}
                  className="p-1.5 rounded-lg bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400 hover:bg-red-200 transition-colors"
                  title={`Test ${mins} min alert`}
                >
                  <Play className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleRemoveThreshold(mins)}
                  className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-400 hover:text-slate-700"
                  title="Remove this alert"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>

          {/* Quick Add Presets & Custom Slider */}
          <div className="pt-2 border-t border-slate-200 dark:border-slate-700 space-y-3">
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400">Quick Add Preset:</p>
            <div className="flex flex-wrap gap-2">
              {[15, 12, 10, 8, 5, 3, 2].map((preset) => (
                <button
                  key={preset}
                  onClick={() => handleAddThreshold(preset)}
                  disabled={customMinutes.includes(preset)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                    customMinutes.includes(preset)
                      ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 border-transparent cursor-not-allowed'
                      : 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-600 hover:border-red-500'
                  }`}
                >
                  + {preset} min
                </button>
              ))}
            </div>

            {/* Slider for exact minute adjustment */}
            <div className="pt-2 flex items-center gap-3">
              <span className="text-xs font-bold">Custom:</span>
              <input
                type="range"
                min="1"
                max="25"
                value={newThresholdInput}
                onChange={(e) => setNewThresholdInput(Number(e.target.value))}
                className="flex-1 accent-red-600"
              />
              <span className="font-black text-sm w-12 text-center">{newThresholdInput} min</span>
              <button
                onClick={() => handleAddThreshold(newThresholdInput)}
                className="px-3 py-1.5 rounded-lg bg-red-600 text-white font-bold text-xs hover:bg-red-700"
              >
                Add Alert
              </button>
            </div>
          </div>
        </div>

        {/* PHONE LOCKSCREEN PREVIEW (What mom sees when her phone buzzes) */}
        <div className="mt-5 p-4 rounded-2xl bg-slate-900 text-white border border-slate-800">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center justify-between">
            <span>📱 Mom's Phone Lock-Screen Simulation</span>
            <span className="text-emerald-400">Live Preview</span>
          </p>

          <div className="p-4 rounded-2xl bg-slate-800/90 border border-slate-700 shadow-md">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
              <span className="flex items-center gap-1.5 font-bold text-white">
                <span className="w-2.5 h-2.5 rounded-full bg-red-600"></span>
                TTC BUS TRACKER · NOW
              </span>
              <span className="font-mono">8:10 AM</span>
            </div>

            <p className="font-black text-base sm:text-lg text-white">
              {activeTestNotification?.title || '🚌 TTC Bus 121 is 5 Minutes Away'}
            </p>
            <p className="text-sm text-slate-300 mt-1">
              {activeTestNotification?.body ||
                'Bus 121 is approaching your stop. Time to put on your coat and step outside!'}
            </p>
          </div>
        </div>

        {/* ALERT SETTINGS */}
        <div className="mt-5 space-y-2.5">
          <h4 className="text-sm font-extrabold text-slate-800 dark:text-slate-200">
            Alert Preferences
          </h4>

          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-100 dark:bg-slate-800">
            <div>
              <p className="font-bold text-sm">Speak alert aloud (Voice Announcement)</p>
              <p className="text-xs opacity-75">Speaks slowly so mom doesn't have to look at the screen</p>
            </div>
            <input
              type="checkbox"
              checked={settings.audioAlerts}
              onChange={(e) => onUpdateSettings({ audioAlerts: e.target.checked })}
              className="w-5 h-5 text-red-600 rounded cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-100 dark:bg-slate-800">
            <div>
              <p className="font-bold text-sm">Vibrate phone on alert</p>
              <p className="text-xs opacity-75">Tactile vibration pulse so she feels it in her pocket</p>
            </div>
            <input
              type="checkbox"
              checked={settings.vibrateAlerts}
              onChange={(e) => onUpdateSettings({ vibrateAlerts: e.target.checked })}
              className="w-5 h-5 text-red-600 rounded cursor-pointer"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black text-base shadow-sm"
          >
            Save & Done
          </button>
        </div>
      </div>
    </div>
  );
};
