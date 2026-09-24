import React, { useState, useEffect, useCallback } from 'react';
import { ROUTE_TO_WORK, ROUTE_TO_HOME } from './data/mockRoutes';
import { BusRouteConfig, AccessibilitySettings } from './types/bus';
import { useBusSimulation } from './hooks/useBusSimulation';
import { BigTextView } from './components/BigTextView';
import { AccessibleMap } from './components/AccessibleMap';
import { NotificationPrototypeModal } from './components/NotificationPrototypeModal';
import { TestWithHerPanel } from './components/TestWithHerPanel';
import { Volume2, Map as MapIcon, Sliders, Bell, Phone, MessageSquare } from 'lucide-react';

const DEFAULT_SETTINGS: AccessibilitySettings = {
  textSize: 'xlarge',
  theme: 'night',
  voiceSpeed: 0.85,
  audioAlerts: true,
  vibrateAlerts: true,
  contactName: 'Sarah (Daughter)',
  contactPhone: '416-555-0199',
  customNotificationMinutes: [10, 5],
  notifyOnLandmarkPass: true,
  notifyOnArrival: true,
};

export default function App() {
  const [commuteDirection, setCommuteDirection] = useState<'to_work' | 'to_home'>('to_work');
  const [viewMode, setViewMode] = useState<'map' | 'text'>('map'); // Default to the sleek Live Map as requested!
  const [showNotificationModal, setShowNotificationModal] = useState<boolean>(false);
  const [showTestPanel, setShowTestPanel] = useState<boolean>(false);
  const [settings, setSettings] = useState<AccessibilitySettings>(() => {
    try {
      const saved = localStorage.getItem('clearride_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        return { ...parsed, theme: parsed.theme || 'night' };
      }
      return DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  });

  const [activeToast, setActiveToast] = useState<{ title: string; body: string } | null>(null);

  // Clear any existing toast notification immediately when switching commute direction
  useEffect(() => {
    setActiveToast(null);
  }, [commuteDirection]);

  const activeRoute: BusRouteConfig = commuteDirection === 'to_work' ? ROUTE_TO_WORK : ROUTE_TO_HOME;

  const handleNotificationTrigger = useCallback((minutesAway: number, title: string, body: string) => {
    setActiveToast({ title, body });
    // auto dismiss toast after 6s
    setTimeout(() => {
      setActiveToast((prev) => (prev?.title === title ? null : prev));
    }, 6000);
  }, []);

  const openNotificationModal = () => {
    setActiveToast(null);
    setShowNotificationModal(true);
  };

  const {
    state: busState,
    progress,
    setProgress,
    isPlaying,
    setIsPlaying,
    simulationSpeedMultiplier,
    setSimulationSpeedMultiplier,
    speakCurrentStatus,
    jumpToStage,
  } = useBusSimulation({
    route: activeRoute,
    settings,
    onNotificationTrigger: handleNotificationTrigger,
  });

  const updateSettings = (newPartial: Partial<AccessibilitySettings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...newPartial };
      try {
        localStorage.setItem('clearride_settings', JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });
  };

  const isNight = settings.theme === 'night';
  const isYellowContrast = settings.theme === 'contrast-yellow';

  return (
    <div
      className={`min-h-screen flex flex-col font-sans transition-colors duration-200 ${
        isYellowContrast
          ? 'bg-black text-yellow-300'
          : isNight
          ? 'bg-slate-950 text-slate-100'
          : 'bg-slate-50 text-slate-900'
      }`}
    >
      {/* IN-APP REAL-TIME TOAST ALERT (When 10 min or 5 min triggers) */}
      {activeToast && (
        <aside
          aria-live="polite"
          className="fixed top-3 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-1.5rem)] sm:w-11/12 max-w-lg p-2.5 sm:p-4 rounded-xl sm:rounded-2xl bg-white/95 text-slate-900 sm:bg-red-600 sm:text-white shadow-lg sm:shadow-2xl border border-red-200 sm:border-2 sm:border-white flex items-center justify-between gap-2 sm:gap-3 animate-bounce backdrop-blur-sm"
        >
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <span className="text-2xl sm:text-3xl">🚌</span>
            <div>
              <p className="font-black text-sm sm:text-base leading-tight">{activeToast.title}</p>
              <p className="text-[11px] sm:text-xs text-slate-600 sm:text-red-100 mt-0.5">{activeToast.body}</p>
            </div>
          </div>
          <button
            onClick={() => setActiveToast(null)}
            className="shrink-0 px-2 py-1 sm:px-3 sm:py-1.5 rounded-lg bg-slate-900/10 sm:bg-black/20 hover:bg-slate-900/20 sm:hover:bg-black/30 font-bold text-[11px] sm:text-xs"
          >
            Dismiss
          </button>
        </aside>
      )}

      {/* TOP BAR CONTRACT: Zone 1 (Wordmark) - Zone 2 (4 clean nav links) - Zone 3 (Primary Action) */}
      {viewMode === 'text' && (
        <header
          className={`px-4 sm:px-8 py-3.5 border-b flex items-center justify-between gap-4 sticky top-0 z-40 backdrop-blur-md ${
            isYellowContrast
              ? 'bg-black/95 border-yellow-500'
              : isNight
              ? 'bg-slate-900/90 border-slate-800'
              : 'bg-white/95 border-slate-200'
          }`}
        >
          {/* Zone 1: Single text element wordmark */}
          <div className="flex items-center gap-2">
            <a
              href="/"
              className="text-xl sm:text-2xl font-black tracking-tight text-red-600 flex items-center gap-2"
            >
              <span className="w-4 h-4 rounded-full bg-red-600 inline-block"></span>
              <span>ClearRide</span>
            </a>
            <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300">
              TTC 121
            </span>
          </div>

          {/* Zone 2: Clean navigation links */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-bold">
            <button
              onClick={() => setViewMode('text')}
              className="text-red-600 underline decoration-2 underline-offset-8 transition-colors flex items-center gap-1.5"
            >
              <span>🔤</span>
              <span>Big Text View</span>
            </button>

            <button
              onClick={() => setViewMode('map')}
              className="opacity-70 hover:opacity-100 transition-colors flex items-center gap-1.5"
            >
              <span>🗺️</span>
              <span>Live Map (TTC)</span>
            </button>

            <button
              onClick={() => setShowNotificationModal(true)}
              className="opacity-70 hover:opacity-100 transition-colors flex items-center gap-1.5"
            >
              <span>🔔</span>
              <span>Alerts (10m & 5m)</span>
            </button>

            <button
              onClick={() => setShowTestPanel(true)}
              className="opacity-70 hover:opacity-100 transition-colors flex items-center gap-1.5"
            >
              <span>⚙️</span>
              <span>Test With Mom</span>
            </button>
          </nav>

          {/* Zone 3: Primary action button */}
          <div className="flex items-center gap-2">
            <button
              onClick={speakCurrentStatus}
              className={`py-2 px-3.5 sm:px-4 rounded-xl font-bold text-sm flex items-center gap-2 transition-transform active:scale-95 shadow-sm whitespace-nowrap ${
                isYellowContrast
                  ? 'bg-yellow-400 text-black hover:bg-yellow-300'
                  : 'bg-red-600 text-white hover:bg-red-700'
              }`}
            >
              <Volume2 className="w-4 h-4 stroke-[2.5]" />
              <span>Read Aloud</span>
            </button>

            {/* Quick Caregiver settings gear for mobile */}
            <button
              onClick={() => setShowTestPanel(true)}
              className="md:hidden p-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300"
              aria-label="Caregiver settings"
            >
              <Sliders className="w-5 h-5" />
            </button>
          </div>
        </header>
      )}

      {/* MAIN VIEW CONTENT: Big Text (Default) OR Accessible Map View */}
      <main className={`flex-1 flex flex-col ${viewMode === 'map' ? 'h-screen w-screen overflow-hidden' : 'justify-start'}`}>
        {viewMode === 'text' ? (
          <BigTextView
            route={activeRoute}
            busState={busState}
            settings={settings}
            onSwitchToMap={() => setViewMode('map')}
            onOpenNotifications={openNotificationModal}
            onSpeak={speakCurrentStatus}
            onToggleCommute={(dir) => setCommuteDirection(dir)}
          />
        ) : (
          <AccessibleMap
            route={activeRoute}
            busState={busState}
            settings={settings}
            onSwitchToBigText={() => setViewMode('text')}
            onSpeak={speakCurrentStatus}
            onToggleCommute={(dir) => setCommuteDirection(dir)}
            onOpenCaregiver={() => setShowTestPanel(true)}
            onOpenNotifications={openNotificationModal}
          />
        )}
      </main>

      {/* MOBILE BOTTOM NAVIGATION DOCK (Thumb Ergonomics) */}
      <div
        className={`md:hidden sticky bottom-0 left-0 right-0 z-40 border-t py-1.5 px-1 grid grid-cols-5 items-center backdrop-blur-md ${
          isYellowContrast
            ? 'bg-black/95 border-yellow-500'
            : isNight
            ? 'bg-slate-900/95 border-slate-800'
            : 'bg-white/95 border-slate-200'
        }`}
      >
        <button
          onClick={() => setViewMode('text')}
          className={`flex min-w-0 w-full flex-col items-center justify-center p-1.5 rounded-xl min-h-[52px] gap-1 transition-colors ${
            viewMode === 'text'
              ? isYellowContrast ? 'text-yellow-400' : 'text-red-600'
              : isNight ? 'text-slate-500' : 'text-slate-400'
          }`}
        >
          <Volume2 className="w-5 h-5 stroke-[2.5]" />
          <span className="text-[10px] font-bold leading-none">Big Text</span>
        </button>

        <button
          onClick={() => setViewMode('map')}
          className={`flex min-w-0 w-full flex-col items-center justify-center p-1.5 rounded-xl min-h-[52px] gap-1 transition-colors ${
            viewMode === 'map'
              ? isYellowContrast ? 'text-yellow-400' : 'text-red-600'
              : isNight ? 'text-slate-500' : 'text-slate-400'
          }`}
        >
          <MapIcon className="w-5 h-5 stroke-[2.5]" />
          <span className="text-[10px] font-bold leading-none">Map</span>
        </button>

        <button
          onClick={openNotificationModal}
          className={`flex min-w-0 w-full flex-col items-center justify-center p-1.5 rounded-xl min-h-[52px] gap-1 transition-colors ${isNight ? 'text-slate-500' : 'text-slate-400'} active:text-amber-500`}
        >
          <Bell className="w-5 h-5 stroke-[2.5]" />
          <span className="text-[10px] font-bold leading-none">Alerts</span>
        </button>

        <a
          href={`sms:898882?body=${encodeURIComponent(activeRoute.originStopId.replace(/\D/g, ''))}`}
          aria-label={`Text TTC for stop ${activeRoute.originStopId.replace(/\D/g, '')}`}
          className="flex min-w-0 w-full flex-col items-center justify-center p-1.5 rounded-xl min-h-[52px] gap-1 transition-colors text-slate-500 dark:text-slate-400 active:text-sky-600"
        >
          <MessageSquare className="w-5 h-5 stroke-[2.5]" />
          <span className="text-[10px] font-bold leading-none">Text</span>
        </a>

        <button
          onClick={() => setShowTestPanel(true)}
          className={`flex min-w-0 w-full flex-col items-center justify-center p-1.5 rounded-xl min-h-[52px] gap-1 transition-colors ${isNight ? 'text-slate-500' : 'text-slate-400'} active:text-red-600`}
        >
          <Sliders className="w-5 h-5 stroke-[2.5]" />
          <span className="text-[10px] font-bold leading-none">Settings</span>
        </button>
      </div>

      {/* NOTIFICATION PROTOTYPE MODAL */}
      {showNotificationModal && (
        <NotificationPrototypeModal
          route={activeRoute}
          busState={busState}
          settings={settings}
          onUpdateSettings={updateSettings}
          onClose={() => setShowNotificationModal(false)}
        />
      )}

      {/* CAREGIVER "TEST WITH HER" CONTROLS DRAWER */}
      {showTestPanel && (
        <TestWithHerPanel
          route={activeRoute}
          busState={busState}
          settings={settings}
          isPlaying={isPlaying}
          simulationSpeedMultiplier={simulationSpeedMultiplier}
          onTogglePlay={() => setIsPlaying(!isPlaying)}
          onSetSpeed={setSimulationSpeedMultiplier}
          onJumpStage={jumpToStage}
          onUpdateSettings={updateSettings}
          onClose={() => setShowTestPanel(false)}
        />
      )}
    </div>
  );
}
