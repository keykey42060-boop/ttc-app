import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { BusRouteConfig, BusState, Landmark, AccessibilitySettings, LiveBusVehicle, GeoRoutePoint } from '../types/bus';
import { playChime, speakAnnouncement, triggerVibration, sendOsNotification } from '../utils/audioSpeech';

interface UseBusSimulationProps {
  route: BusRouteConfig;
  settings: AccessibilitySettings;
  liveVehicleCount: number;
  onNotificationTrigger?: (minutesAway: number, title: string, body: string) => void;
}

function calculateBearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const lat1Rad = (lat1 * Math.PI) / 180;
  const lat2Rad = (lat2 * Math.PI) / 180;
  const y = Math.sin(dLon) * Math.cos(lat2Rad);
  const x =
    Math.cos(lat1Rad) * Math.sin(lat2Rad) -
    Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);
  let brng = (Math.atan2(y, x) * 180) / Math.PI;
  return (brng + 360) % 360;
}

function getCardinalDirection(angleDeg: number): string {
  if (angleDeg >= 337.5 || angleDeg < 22.5) return 'North';
  if (angleDeg >= 22.5 && angleDeg < 67.5) return 'North-East';
  if (angleDeg >= 67.5 && angleDeg < 112.5) return 'East';
  if (angleDeg >= 112.5 && angleDeg < 157.5) return 'South-East';
  if (angleDeg >= 157.5 && angleDeg < 202.5) return 'South';
  if (angleDeg >= 202.5 && angleDeg < 247.5) return 'South-West';
  if (angleDeg >= 247.5 && angleDeg < 292.5) return 'West';
  return 'North-West';
}

function interpolateGeoRoute(points: GeoRoutePoint[], rawProgress: number) {
  if (!points || points.length === 0) {
    return {
      lat: 43.6457,
      lng: -79.3854,
      heading: 90,
      directionName: 'East',
      currentStreet: 'Front Street West',
    };
  }
  if (points.length === 1) {
    return {
      lat: points[0].lat,
      lng: points[0].lng,
      heading: 90,
      directionName: 'East',
      currentStreet: points[0].streetName,
    };
  }

  const clamped = Math.max(0, Math.min(1, rawProgress));
  const segmentCount = points.length - 1;
  const globalSegment = clamped * segmentCount;
  const segmentIndex = Math.min(Math.floor(globalSegment), segmentCount - 1);
  const segmentFraction = globalSegment - segmentIndex;

  const pA = points[segmentIndex];
  const pB = points[segmentIndex + 1];

  const lat = pA.lat + (pB.lat - pA.lat) * segmentFraction;
  const lng = pA.lng + (pB.lng - pA.lng) * segmentFraction;
  const heading = calculateBearing(pA.lat, pA.lng, pB.lat, pB.lng);
  const directionName = getCardinalDirection(heading);

  return {
    lat,
    lng,
    heading,
    directionName,
    currentStreet: pA.streetName,
  };
}

export function useBusSimulation({ route, settings, liveVehicleCount, onNotificationTrigger }: UseBusSimulationProps) {
  const [progressBus1, setProgressBus1] = useState<number>(0.35); // ~4 min away incoming
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [simulationSpeedMultiplier, setSimulationSpeedMultiplier] = useState<number>(1);

  const firedMinutes = useRef<Set<number>>(new Set());
  const prevProgressRef = useRef<number>(0.35);
  const isFirstMountRef = useRef<boolean>(true);

  // When switching routes (e.g. To Work <-> To Home), reset progress to incoming bus (~4 min away)
  // and clear fired minutes so it NEVER false-alarms an arrival!
  useEffect(() => {
    firedMinutes.current.clear();
    setProgressBus1(0.35);
    prevProgressRef.current = 0.35;
    isFirstMountRef.current = true;
  }, [route.id]);

  useEffect(() => {
    if (progressBus1 < 0.05) {
      firedMinutes.current.clear();
    }
  }, [progressBus1]);

  const computedState = useMemo<BusState>(() => {
    const totalDurationSeconds = 600; // 10 minutes end to end

    // 1st Bus
    const p1 = Math.max(0, Math.min(1, progressBus1));
    const pos1 = interpolateGeoRoute(route.points, p1);
    const secs1 = Math.max(0, Math.round((1 - p1) * totalDurationSeconds));
    const mins1 = Math.max(0, Math.ceil(secs1 / 60));

    const now = new Date();
    const arr1Date = new Date(now.getTime() + secs1 * 1000);
    const clock1 = arr1Date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

    const isAtStop = p1 >= 0.98;
    const hasDeparted = p1 >= 1.0;

    const bus1: LiveBusVehicle = {
      id: 'bus-1',
      busLabel: '1st Bus (Next)',
      vehicleNumber: `${route.routeNumber}A (#8194)`,
      lat: pos1.lat,
      lng: pos1.lng,
      progress: p1,
      heading: pos1.heading,
      directionName: pos1.directionName,
      currentStreet: pos1.currentStreet,
      minutesAway: mins1,
      secondsRemaining: secs1,
      arrivalClockTime: clock1,
      crowdingLevel: 'Plenty of Seats',
      distanceDescription: isAtStop ? 'At stop right now' : mins1 <= 2 ? '1 stop away' : `${Math.ceil(mins1 / 2)} stops away`,
      isClosest: true,
    };

    // 2nd Bus following behind
    let p2 = p1 - 0.40;
    if (p2 < 0) p2 = p2 + 1.0;
    const pos2 = interpolateGeoRoute(route.points, p2);
    const mins2 = mins1 + (route.scheduledIntervalMinutes || 11);
    const secs2 = mins2 * 60;
    const arr2Date = new Date(now.getTime() + secs2 * 1000);
    const clock2 = arr2Date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

    const bus2: LiveBusVehicle = {
      id: 'bus-2',
      busLabel: '2nd Bus (Following)',
      vehicleNumber: `${route.routeNumber}B (#8421)`,
      lat: pos2.lat,
      lng: pos2.lng,
      progress: p2,
      heading: pos2.heading,
      directionName: pos2.directionName,
      currentStreet: pos2.currentStreet,
      minutesAway: mins2,
      secondsRemaining: secs2,
      arrivalClockTime: clock2,
      crowdingLevel: 'Some Seats',
      distanceDescription: `${Math.ceil(mins2 / 2)} stops away`,
      isClosest: false,
    };

    // Landmarks along route
    let lastPassed: Landmark | null = null;
    let nextLandmark: Landmark | null = null;

    if (route.direction === 'to_work') {
      if (p1 < 0.25) {
        lastPassed = route.landmarks.find(l => l.id === 'stop-front-west') || null;
        nextLandmark = route.landmarks.find(l => l.id === 'union-station') || null;
      } else if (p1 < 0.55) {
        lastPassed = route.landmarks.find(l => l.id === 'union-station') || null;
        nextLandmark = route.landmarks.find(l => l.id === 'meridian-hall') || null;
      } else if (p1 < 0.82) {
        lastPassed = route.landmarks.find(l => l.id === 'meridian-hall') || null;
        nextLandmark = route.landmarks.find(l => l.id === 'shoppers-pharmacy') || null;
      } else {
        lastPassed = route.landmarks.find(l => l.id === 'shoppers-pharmacy') || null;
        nextLandmark = route.landmarks.find(l => l.id === 'stop-church-esplanade') || null;
      }
    } else {
      if (p1 < 0.25) {
        lastPassed = route.landmarks.find(l => l.id === 'stop-church-esplanade') || null;
        nextLandmark = route.landmarks.find(l => l.id === 'shoppers-pharmacy') || null;
      } else if (p1 < 0.55) {
        lastPassed = route.landmarks.find(l => l.id === 'shoppers-pharmacy') || null;
        nextLandmark = route.landmarks.find(l => l.id === 'meridian-hall') || null;
      } else if (p1 < 0.82) {
        lastPassed = route.landmarks.find(l => l.id === 'meridian-hall') || null;
        nextLandmark = route.landmarks.find(l => l.id === 'union-station') || null;
      } else {
        lastPassed = route.landmarks.find(l => l.id === 'union-station') || null;
        nextLandmark = route.landmarks.find(l => l.id === 'stop-front-west') || null;
      }
    }

    let statusText = `Bus is ${mins1} min away (${clock1})`;
    let adviceText = 'You have plenty of time. Relax inside.';

    if (isAtStop) {
      statusText = `Bus #${route.routeNumber} is at your stop NOW!`;
      adviceText = 'The bus has arrived right in front of you. Look for the red TTC bus!';
    } else if (mins1 <= 2) {
      statusText = `Bus is 2 minutes away (${clock1})`;
      adviceText = 'Time to step outside to the bus stop bench. Bus is on your block!';
    } else if (mins1 <= 5) {
      statusText = `Bus is ${mins1} minutes away (${clock1})`;
      adviceText = 'Put on your coat and get your PRESTO / fare card ready.';
    } else {
      statusText = `Bus is ${mins1} minutes away (${clock1})`;
      adviceText = 'Plenty of time. Stay seated and warm.';
    }

    return {
      bus1,
      bus2,
      lastPassedLandmark: lastPassed,
      nextApproachingLandmark: nextLandmark,
      statusText,
      adviceText,
      isAtStop,
      hasDeparted,
    };
  }, [progressBus1, route]);

  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setProgressBus1((prev) => {
        const step = (0.3 / 600) * simulationSpeedMultiplier * 3;
        const next = prev + step;
        if (next >= 1.0) {
          return 1.0;
        }
        return next;
      });
    }, 300);

    return () => clearInterval(interval);
  }, [isPlaying, simulationSpeedMultiplier]);

  const checkCustomNotifications = useCallback((minAway: number, isAtStop: boolean) => {
    if (liveVehicleCount === 0) return;

    const thresholds = settings.customNotificationMinutes || [10, 5];

    thresholds.forEach((thresh) => {
      if (minAway === thresh && !firedMinutes.current.has(thresh)) {
        firedMinutes.current.add(thresh);

        const title = `🚌 TTC Bus 121 is ${thresh} Min Away (${computedState.bus1.arrivalClockTime})`;
        const body = thresh >= 10
          ? `Leaving the terminal on ${computedState.bus1.currentStreet}. Time to get ready!`
          : thresh >= 5
          ? `Approaching ${computedState.lastPassedLandmark?.name || 'Union Station'}. Put on your coat!`
          : `Turning onto your street now. Walk to your stop!`;

        if (settings.audioAlerts) playChime(thresh <= 5 ? 'alert' : 'gentle');
        if (settings.vibrateAlerts) triggerVibration([250, 100, 250]);
        sendOsNotification(title, body);
        onNotificationTrigger?.(thresh, title, body);
      }
    });

    if (
      isAtStop &&
      prevProgressRef.current < 0.95 &&
      !isFirstMountRef.current &&
      !firedMinutes.current.has(0) &&
      settings.notifyOnArrival
    ) {
      firedMinutes.current.add(0);
      const title = `🎉 TTC Bus 121 is at your stop!`;
      const body = `Bus #${route.routeNumber} is waiting at ${route.myStopName}. Look for the red bus!`;
      if (settings.audioAlerts) playChime('arrival');
      if (settings.vibrateAlerts) triggerVibration([400, 200, 400]);
      sendOsNotification(title, body);
      onNotificationTrigger?.(0, title, body);
    }

    prevProgressRef.current = progressBus1;
    isFirstMountRef.current = false;
  }, [progressBus1, computedState.bus1.arrivalClockTime, computedState.bus1.currentStreet, computedState.lastPassedLandmark?.name, route.myStopName, route.routeNumber, settings, liveVehicleCount, onNotificationTrigger]);

  useEffect(() => {
    checkCustomNotifications(computedState.bus1.minutesAway, computedState.isAtStop);
  }, [computedState.bus1.minutesAway, computedState.isAtStop, checkCustomNotifications]);

  const speakCurrentStatus = useCallback(() => {
    if (liveVehicleCount === 0) {
      speakAnnouncement('There are no Route 121 buses currently active. Please check again later.', settings.voiceSpeed);
      return;
    }

    const min1 = computedState.bus1.minutesAway;
    const min2 = computedState.bus2.minutesAway;
    const commuteLabel = route.direction === 'to_work' ? 'to work' : 'home';

    let message = '';
    if (computedState.isAtStop) {
      message = `Mom, Bus 121 going ${commuteLabel} is here at your stop right now! Look for the red TTC bus outside.`;
    } else if (min1 <= 2) {
      message = `Mom, the first Bus 121 is two minutes away, arriving at ${computedState.bus1.arrivalClockTime}. It is moving ${computedState.bus1.directionName.toLowerCase()} on ${computedState.bus1.currentStreet}. Please walk out to your stop bench now.`;
    } else {
      const landmarkNote = computedState.lastPassedLandmark ? `It just passed ${computedState.lastPassedLandmark.name}.` : '';
      message = `Mom, the first Bus 121 going ${commuteLabel} is ${min1} minutes away, arriving at ${computedState.bus1.arrivalClockTime}. ${landmarkNote} ${computedState.adviceText}. The second bus is behind it, arriving in ${min2} minutes at ${computedState.bus2.arrivalClockTime}.`;
    }
    speakAnnouncement(message, settings.voiceSpeed);
  }, [computedState, liveVehicleCount, route.direction, settings.voiceSpeed]);

  const jumpToStage = useCallback((stage: 'start' | 'midway' | 'arriving' | 'atStop') => {
    switch (stage) {
      case 'start':
        setProgressBus1(0.05); // 10 min
        break;
      case 'midway':
        setProgressBus1(0.48); // 5 min
        break;
      case 'arriving':
        setProgressBus1(0.82); // 2 min
        break;
      case 'atStop':
        setProgressBus1(0.99); // Arrived
        break;
    }
  }, []);

  return {
    state: computedState,
    progress: progressBus1,
    setProgress: setProgressBus1,
    isPlaying,
    setIsPlaying,
    simulationSpeedMultiplier,
    setSimulationSpeedMultiplier,
    speakCurrentStatus,
    jumpToStage,
  };
}
