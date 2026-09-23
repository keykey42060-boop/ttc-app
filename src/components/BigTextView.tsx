import React from 'react';
import { BusRouteConfig, BusState, AccessibilitySettings } from '../types/bus';
import { Volume2, Map, Bell, Phone, Clock, ArrowRight, CheckCircle2, AlertCircle, Compass, Sparkles, Navigation } from 'lucide-react';

interface BigTextViewProps {
  route: BusRouteConfig;
  busState: BusState;
  settings: AccessibilitySettings;
  onSwitchToMap: () => void;
  onOpenNotifications: () => void;
  onSpeak: () => void;
  onToggleCommute: (direction: 'to_work' | 'to_home') => void;
}

export const BigTextView: React.FC<BigTextViewProps> = ({
  route,
  busState,
  settings,
  onSwitchToMap,
  onOpenNotifications,
  onSpeak,
  onToggleCommute,
}) => {
  const isNight = settings.theme === 'night';
  const isYellowContrast = settings.theme === 'contrast-yellow';
  const isGoingToWork = route.direction === 'to_work';

  const isHuge = settings.textSize === 'huge';
  const isXLarge = settings.textSize === 'xlarge';

  const headingSizeClass = isHuge ? 'text-5xl sm:text-7xl' : isXLarge ? 'text-4xl sm:text-6xl' : 'text-3xl sm:text-5xl';
  const etaSizeClass = isHuge ? 'text-6xl sm:text-8xl' : isXLarge ? 'text-5xl sm:text-7xl' : 'text-4xl sm:text-6xl';
  const bodySizeClass = isHuge ? 'text-2xl sm:text-3xl' : isXLarge ? 'text-xl sm:text-2xl' : 'text-lg sm:text-xl';

  const customMinutes = settings.customNotificationMinutes || [10, 5];

  return (
    <div className={`flex flex-col w-full max-w-4xl mx-auto p-4 sm:p-6 space-y-6 ${
      isYellowContrast ? 'text-yellow-300' : isNight ? 'text-slate-100' : 'text-slate-900'
    }`}>
      {/* COMMUTE DIRECTION TOGGLE (Mom's 2 Routes: To Work / Coming Home) */}
      <div className={`p-2 rounded-2xl border-2 flex flex-col sm:flex-row items-center gap-2 shadow-sm ${
        isYellowContrast
          ? 'bg-black border-yellow-500'
          : isNight
          ? 'bg-slate-900 border-slate-700'
          : 'bg-white border-slate-200'
      }`}>
        <button
          onClick={() => onToggleCommute('to_work')}
          className={`flex-1 w-full py-4 px-5 rounded-xl font-black text-lg sm:text-xl flex items-center justify-center gap-3 transition-all active:scale-[0.98] min-h-[58px] ${
            isGoingToWork
              ? isYellowContrast
                ? 'bg-yellow-400 text-black shadow-md'
                : 'bg-red-600 text-white shadow-md'
              : isNight
              ? 'text-slate-400 hover:text-white'
              : 'text-slate-600 hover:text-slate-900'
          }`}
          aria-pressed={isGoingToWork}
        >
          <span className="text-2xl">💼</span>
          <div className="text-left">
            <span className="block leading-none">Going To Work</span>
            <span className="text-xs font-semibold opacity-90">Stop #16754 (Front St West)</span>
          </div>
        </button>

        <button
          onClick={() => onToggleCommute('to_home')}
          className={`flex-1 w-full py-4 px-5 rounded-xl font-black text-lg sm:text-xl flex items-center justify-center gap-3 transition-all active:scale-[0.98] min-h-[58px] ${
            !isGoingToWork
              ? isYellowContrast
                ? 'bg-yellow-400 text-black shadow-md'
                : 'bg-red-600 text-white shadow-md'
              : isNight
              ? 'text-slate-400 hover:text-white'
              : 'text-slate-600 hover:text-slate-900'
          }`}
          aria-pressed={!isGoingToWork}
        >
          <span className="text-2xl">🏡</span>
          <div className="text-left">
            <span className="block leading-none">Coming Home</span>
            <span className="text-xs font-semibold opacity-90">Stop #15583 (The Esplanade at Church)</span>
          </div>
        </button>
      </div>

      {/* PRIMARY CARD: 1ST BUS ARRIVAL (HUGE, READABLE TEXT) */}
      <div className={`p-6 sm:p-8 rounded-3xl border-3 shadow-lg relative overflow-hidden ${
        isYellowContrast
          ? 'bg-black border-yellow-400 text-yellow-300'
          : isNight
          ? 'bg-slate-900 border-slate-700 text-white'
          : 'bg-white border-slate-300 text-slate-950'
      }`}>
        {/* Top Header Badge & Route */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-dashed border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <span className="px-4 py-1.5 rounded-lg bg-red-600 text-white font-black text-xl sm:text-2xl tracking-wide shadow-sm">
              TTC #{route.routeNumber}
            </span>
            <div>
              <p className="text-xs sm:text-sm uppercase font-bold opacity-75">
                {isGoingToWork ? 'Morning Commute' : 'Afternoon Commute'}
              </p>
              <h2 className="text-xl sm:text-2xl font-black">
                {isGoingToWork ? 'Eastbound to Church & The Esplanade' : 'Westbound to Front St West'}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 font-black text-sm">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Live GPS
            </span>
          </div>
        </div>

        {/* BOARDING STOP NOTIFICATION */}
        <div className="mt-4 p-3.5 rounded-2xl bg-slate-100 dark:bg-slate-800/80 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🚏</span>
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Your Boarding Stop
              </p>
              <p className="text-lg sm:text-xl font-black">
                {route.myStopName}
              </p>
            </div>
          </div>

          <button
            onClick={onOpenNotifications}
            className="px-3 py-1.5 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-extrabold text-xs flex items-center gap-1.5 hover:bg-amber-200 transition-colors"
          >
            <Bell className="w-3.5 h-3.5" />
            <span>Alerts: {customMinutes.map(m => `${m}m`).join(', ')}</span>
          </button>
        </div>

        {/* THE GIANT 1ST BUS COUNTDOWN */}
        <div className="py-6 sm:py-8 text-center border-b border-dashed border-slate-200 dark:border-slate-800">
          <p className="text-lg sm:text-2xl font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
            1st Bus Arrives In
          </p>

          <div className={`font-black tracking-tight text-red-600 dark:text-red-400 ${etaSizeClass} flex items-center justify-center gap-3`}>
            <span>{busState.isAtStop ? 'HERE NOW!' : `${busState.bus1.minutesAway} MIN`}</span>
          </div>

          <p className={`font-extrabold mt-2 ${bodySizeClass}`}>
            Expected at <strong className="underline decoration-red-500 decoration-3">{busState.bus1.arrivalClockTime}</strong>
          </p>

          {/* Simple plain English status reassurance */}
          <div className={`mt-5 p-4 rounded-2xl font-black text-lg sm:text-xl flex items-center justify-center gap-3 ${
            busState.isAtStop
              ? 'bg-emerald-500 text-white'
              : busState.bus1.minutesAway <= 2
              ? 'bg-amber-400 text-black animate-pulse'
              : isNight
              ? 'bg-slate-800 text-slate-200'
              : 'bg-blue-50 text-blue-950 border border-blue-200'
          }`}>
            <span className="text-2xl">
              {busState.isAtStop ? '🎉' : busState.bus1.minutesAway <= 2 ? '⚠️' : '🟢'}
            </span>
            <span>{busState.adviceText}</span>
          </div>
        </div>

        {/* 2ND UPCOMING BUS (Both 2 closest buses tracked!) */}
        <div className="mt-5 p-4 sm:p-5 rounded-2xl bg-blue-50/70 dark:bg-slate-800/80 border-2 border-blue-200 dark:border-blue-900/60 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-xl shadow-xs">
              2nd
            </div>
            <div>
              <p className="text-xs uppercase font-black tracking-wide text-blue-800 dark:text-blue-300">
                Following Bus Behind It (TTC {busState.bus2.vehicleNumber})
              </p>
              <h3 className="text-xl sm:text-2xl font-black">
                In {busState.bus2.minutesAway} minutes ({busState.bus2.arrivalClockTime})
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-4 text-sm sm:text-base font-bold text-slate-600 dark:text-slate-300">
            <span className="flex items-center gap-1.5">
              <span>📍</span> {busState.bus2.distanceDescription}
            </span>
            <span>·</span>
            <span className="flex items-center gap-1.5">
              <span>💺</span> {busState.bus2.crowdingLevel}
            </span>
          </div>
        </div>

        {/* LANDMARK & DIRECTION SUMMARY (Clear directions for mom) */}
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-950 flex items-center justify-center text-red-600 text-xl font-bold">
              <Navigation className="w-6 h-6 rotate-45" />
            </div>
            <div>
              <p className="text-xs uppercase font-black text-slate-500 dark:text-slate-400">Direction of Bus</p>
              <p className="text-base font-black">
                Moving <strong>{busState.bus1.directionName}</strong> on {busState.bus1.currentStreet}
              </p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center gap-3">
            <span className="text-3xl">
              {busState.lastPassedLandmark ? busState.lastPassedLandmark.iconEmoji : '🏛️'}
            </span>
            <div>
              <p className="text-xs uppercase font-black text-slate-500 dark:text-slate-400">Where Bus Is Now</p>
              <p className="text-base font-black">
                Just passed: <strong>{busState.lastPassedLandmark?.name || 'Union Station'}</strong>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* GIANT ACTION BUTTONS (Tested for Seniors - 60px+ touch targets) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* 1. READ ALOUD BUTTON */}
        <button
          onClick={onSpeak}
          className={`py-5 px-6 rounded-2xl font-black text-xl flex items-center justify-center gap-4 border-2 shadow-md transition-all active:scale-[0.98] min-h-[68px] ${
            isYellowContrast
              ? 'bg-yellow-400 text-black border-yellow-400 hover:bg-yellow-300'
              : 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700'
          }`}
          aria-label="Read bus status out loud"
        >
          <Volume2 className="w-8 h-8 stroke-[2.5]" />
          <span>Read Aloud To Me</span>
        </button>

        {/* 2. SEE LIVE MAP BUTTON (Detailed map tracking 2 closest buses) */}
        <button
          onClick={onSwitchToMap}
          className={`py-5 px-6 rounded-2xl font-black text-xl flex items-center justify-center gap-4 border-2 shadow-md transition-all active:scale-[0.98] min-h-[68px] ${
            isYellowContrast
              ? 'bg-black text-yellow-300 border-yellow-400 hover:bg-yellow-950'
              : isNight
              ? 'bg-slate-800 text-white border-slate-600 hover:bg-slate-700'
              : 'bg-white text-slate-900 border-slate-300 hover:bg-slate-100'
          }`}
          aria-label="Open detailed map view"
        >
          <Map className="w-8 h-8 text-red-600 stroke-[2.5]" />
          <div className="text-left">
            <span className="block leading-tight">See Live Map</span>
            <span className="text-xs font-bold opacity-75">Detailed TTC Map with Direction Arrows</span>
          </div>
        </button>

        {/* 3. CONFIGURE NOTIFICATIONS BUTTON */}
        <button
          onClick={onOpenNotifications}
          className={`py-4 px-6 rounded-2xl font-black text-lg flex items-center justify-center gap-3 border-2 transition-all active:scale-[0.98] min-h-[60px] ${
            isYellowContrast
              ? 'bg-yellow-950 text-yellow-300 border-yellow-500'
              : isNight
              ? 'bg-slate-800/80 text-slate-200 border-slate-700 hover:bg-slate-700'
              : 'bg-slate-100 text-slate-800 border-slate-200 hover:bg-slate-200'
          }`}
        >
          <Bell className="w-6 h-6 text-amber-500" />
          <span>Set Up Distance Alerts</span>
        </button>

        {/* 4. CALL DAUGHTER / HELPER */}
        <a
          href={`tel:${settings.contactPhone || '416-555-0199'}`}
          className={`py-4 px-6 rounded-2xl font-black text-lg flex items-center justify-center gap-3 border-2 transition-all active:scale-[0.98] min-h-[60px] ${
            isYellowContrast
              ? 'bg-yellow-950 text-yellow-300 border-yellow-500'
              : isNight
              ? 'bg-slate-800/80 text-emerald-300 border-slate-700 hover:bg-slate-700'
              : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
          }`}
        >
          <Phone className="w-6 h-6 text-emerald-600" />
          <span>Call {settings.contactName || 'Daughter'}</span>
        </a>
      </div>
    </div>
  );
};
