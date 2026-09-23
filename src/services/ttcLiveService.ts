// Real-time TTC Route 121 Vehicle Location Service
// Live GPS tracking from official Toronto Transit Commission feeds
// Vehicle positions come from the TTC BusTime feed.

import { MOM_WORK_STOP, MOM_HOME_STOP } from '../data/ttc121Geometry';

export interface RealTTCVehicle {
  id: string;
  vehicleNumber: string;
  cleanVid: string;
  route: string;
  lat: number;
  lng: number;
  heading: number;
  speedKmH: number | null;
  direction: 'East' | 'West';
  destination: string;
  passengerLoad: string;
  minutesToMomStop: number;
  distanceMeters: number;
  arrivalClockTime: string;
  lastUpdated: string;
  isClosest: boolean;
  towardStop: boolean;
  isApproachingStop: boolean;
}

// Check whether the vehicle's reported compass heading points generally toward its stop.
function isHeadingTowardPoint(lat: number, lng: number, targetLat: number, targetLng: number, heading: number): boolean {
  const lat1 = (lat * Math.PI) / 180;
  const lat2 = (targetLat * Math.PI) / 180;
  const deltaLng = ((targetLng - lng) * Math.PI) / 180;
  const y = Math.sin(deltaLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLng);
  const bearingToStop = (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
  const headingDifference = Math.abs((heading - bearingToStop + 540) % 360 - 180);
  return headingDifference <= 90;
}

// Haversine distance formula in meters
export function getDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

/** Fetches real-time vehicles through the same-origin Pages Function. */
export async function fetchLiveTTCVehicles(
  routeNum: string = '121',
  momStopLat: number = MOM_WORK_STOP.lat,
  momStopLng: number = MOM_WORK_STOP.lng,
  travelDirection: 'to_work' | 'to_home' = 'to_work'
): Promise<RealTTCVehicle[]> {
  const isGoingHome = travelDirection === 'to_home' || getDistanceMeters(momStopLat, momStopLng, MOM_HOME_STOP.lat, MOM_HOME_STOP.lng) < 100;
  const expectedBusDir: 'West' | 'East' = isGoingHome ? 'West' : 'East';

  // BusTime requires a developer key, which is kept server-side in the Pages Function.
  // Never substitute fabricated vehicle locations when the live feed is unavailable.
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(`/api/ttc/vehicles?rt=${encodeURIComponent(routeNum)}`, {
      cache: 'no-store',
      signal: controller.signal,
    });
    if (!response.ok) return [];

    const data = await response.json();
    const rawVehicles = data?.['bustime-response']?.vehicle || [];
    if (!Array.isArray(rawVehicles)) return [];

    const now = new Date();
    const parsed: RealTTCVehicle[] = rawVehicles.flatMap((v: any) => {
      const lat = Number(v.lat);
      const lng = Number(v.lon);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return [];

      const heading = Number(v.hdg) || 0;
      const distM = getDistanceMeters(lat, lng, momStopLat, momStopLng);
      const estimatedMinutes = Math.max(1, Math.round(distM / 250));
      const arrivalClock = new Date(now.getTime() + estimatedMinutes * 60000)
        .toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
      const loadMap: Record<string, string> = {
        EMPTY: 'Plenty of Seats',
        HALF_EMPTY: 'Plenty of Seats',
        HALF_FULL: 'Seats Available',
        FULL: 'Crowded',
      };

      const rawDir = String(v.rtdir || '').toLowerCase();
      const direction: 'East' | 'West' = rawDir.includes('west')
        ? 'West'
        : rawDir.includes('east')
          ? 'East'
          : (heading > 180 && heading < 360 ? 'West' : 'East');
      const isApproachingStop = distM <= 40 || isHeadingTowardPoint(lat, lng, momStopLat, momStopLng, heading);
      const vidStr = String(v.vid || '').replace(/\\D/g, '');
      if (!vidStr) return [];

      return [{
        id: `ttc-${vidStr}`,
        vehicleNumber: `#${vidStr}`,
        cleanVid: vidStr,
        route: String(v.rt || routeNum),
        lat,
        lng,
        heading,
        speedKmH: v.spd === undefined || v.spd === '' ? null : Math.round((Number(v.spd) || 0) * 1.60934),
        direction,
        destination: v.des || v.rtdir || (direction === 'East' ? 'Towards Hennick Bridgepoint Hospital' : 'Towards Union Station'),
        passengerLoad: loadMap[v.psgld] || 'Seats Available',
        minutesToMomStop: estimatedMinutes,
        distanceMeters: distM,
        arrivalClockTime: arrivalClock,
        lastUpdated: v.tmstmp || now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit' }),
        isClosest: false,
        towardStop: direction === expectedBusDir,
        isApproachingStop,
      }];
    });

    parsed.sort((a, b) => Number(b.towardStop) - Number(a.towardStop) || a.distanceMeters - b.distanceMeters);
    const closestApproaching = parsed.find((vehicle) => vehicle.towardStop && vehicle.isApproachingStop);
    if (closestApproaching) closestApproaching.isClosest = true;
    return parsed;
  } catch {
    return [];
  } finally {
    clearTimeout(timeoutId);
  }
}

