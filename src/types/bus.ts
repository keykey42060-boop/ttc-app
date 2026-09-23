export interface Landmark {
  id: string;
  name: string;
  category: 'library' | 'pharmacy' | 'market' | 'townhall' | 'park' | 'home' | 'work' | 'clinic';
  iconEmoji: string;
  lat: number;
  lng: number;
  street: string;
  color: string;
  description: string;
}

export interface GeoRoutePoint {
  lat: number;
  lng: number;
  streetName: string;
  landmarkNear?: string;
  stopName?: string;
}

export interface LiveBusVehicle {
  id: string;
  busLabel: '1st Bus (Next)' | '2nd Bus (Following)';
  vehicleNumber: string;
  lat: number;
  lng: number;
  progress: number;
  heading: number; // 0-360 degrees
  directionName: string; // e.g. "Eastbound", "Westbound", "Southbound"
  currentStreet: string;
  minutesAway: number;
  secondsRemaining: number;
  arrivalClockTime: string;
  crowdingLevel: 'Plenty of Seats' | 'Some Seats' | 'Full';
  distanceDescription: string;
  isClosest: boolean;
}

export type CommuteDirection = 'to_work' | 'to_home';

export interface BusRouteConfig {
  id: string;
  routeNumber: string;
  routeName: string;
  badgeColor: string; // TTC Red #E11D48
  originName: string;
  originStopId: string;
  destinationName: string;
  destinationStopId: string;
  direction: CommuteDirection;
  myStopName: string;
  myStopCoordinates: { lat: number; lng: number };
  destinationStopCoordinates: { lat: number; lng: number };
  points: GeoRoutePoint[];
  landmarks: Landmark[];
  scheduledIntervalMinutes: number;
}

export interface BusState {
  bus1: LiveBusVehicle;
  bus2: LiveBusVehicle;
  lastPassedLandmark: Landmark | null;
  nextApproachingLandmark: Landmark | null;
  statusText: string;
  adviceText: string;
  isAtStop: boolean;
  hasDeparted: boolean;
}

export type TextSizeSetting = 'large' | 'xlarge' | 'huge';
export type ThemeSetting = 'daylight' | 'night' | 'contrast-yellow';

export interface AccessibilitySettings {
  textSize: TextSizeSetting;
  theme: ThemeSetting;
  voiceSpeed: number; // 0.75 to 1.0
  audioAlerts: boolean;
  vibrateAlerts: boolean;
  contactName: string;
  contactPhone: string;
  customNotificationMinutes: number[];
  notifyOnLandmarkPass: boolean;
  notifyOnArrival: boolean;
}
