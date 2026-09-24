import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import { BusRouteConfig, BusState, AccessibilitySettings } from '../types/bus';
import { fetchLiveTTCVehicles, RealTTCVehicle, getDistanceMeters, calculateBearing } from '../services/ttcLiveService';
import {
  ROUTE_121_EASTBOUND_POLYLINE,
  ROUTE_121_WESTBOUND_POLYLINE,
  ROUTE_121_STOPS,
  MOM_WORK_STOP,
  MOM_HOME_STOP,
  TTCStopInfo,
  snapPointToRoute
} from '../data/ttc121Geometry';
import {
  Volume2,
  Crosshair,
  RefreshCw,
  ArrowLeftRight,
  Maximize2,
  Sliders,
  Bell,
  Compass,
  X,
  Gauge,
  ZoomIn,
  ZoomOut,
  Clock,
  Sparkles,
  Zap,
  Layers,
  Map as MapIcon,
  MessageSquare
} from 'lucide-react';

interface AccessibleMapProps {
  route: BusRouteConfig;
  busState: BusState;
  settings: AccessibilitySettings;
  onSwitchToBigText: () => void;
  onSpeak: () => void;
  onToggleCommute?: (direction: 'to_work' | 'to_home') => void;
  onOpenCaregiver?: () => void;
  onOpenNotifications?: () => void;
}

type MapLayerType = 'detailed' | 'satellite' | 'contrast';

const formatEtaMinutes = (minutes: number): string => (
  minutes < 1 ? '<1' : String(Math.ceil(minutes))
);

interface VehicleAnimState {
  currentLat: number;
  currentLng: number;
  targetLat: number;
  targetLng: number;
  currentHeading: number;
  targetHeading: number;
  speedKmH: number;
  lastUpdate: number;
}

export const AccessibleMap: React.FC<AccessibleMapProps> = ({
  route,
  busState,
  settings,
  onSwitchToBigText,
  onSpeak,
  onToggleCommute,
  onOpenCaregiver,
  onOpenNotifications,
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  
  // Layer refs
  const baseTileLayerRef = useRef<L.TileLayer | null>(null);
  const overlayTileLayerRef = useRef<L.TileLayer | null>(null);
  
  // Route polyline refs
  const casingPrimaryRef = useRef<L.Polyline | null>(null);
  const linePrimaryRef = useRef<L.Polyline | null>(null);
  const lineSecondaryRef = useRef<L.Polyline | null>(null);

  // Markers
  const vehicleMarkersRef = useRef<Map<string, L.Marker>>(new Map());
  const stopMarkersRef = useRef<L.Marker[]>([]);
  const momStopMarkerRef = useRef<L.Marker | null>(null);

  // 60 FPS Animation state map for smooth vehicle gliding
  const animStatesRef = useRef<Map<string, VehicleAnimState>>(new Map());
  const rafIdRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef<number>(performance.now());

  // State: Default to 'detailed' (Detailed Google Maps street view)
  const [mapTheme, setMapTheme] = useState<MapLayerType>('detailed');
  const [liveVehicles, setLiveVehicles] = useState<RealTTCVehicle[]>([]);
  const [isLoadingLive, setIsLoadingLive] = useState<boolean>(false);
  const [lastFeedSync, setLastFeedSync] = useState<string>('Syncing live...');
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [selectedStop, setSelectedStop] = useState<TTCStopInfo | null>(null);
  const [followBusId, setFollowBusId] = useState<string | null>(null);
  const [currentZoom, setCurrentZoom] = useState<number>(15.5);
  const [fpsCounter, setFpsCounter] = useState<number>(60);
  const [etaTick, setEtaTick] = useState<number>(0);
  const feedRequestRef = useRef(0);

  const isGoingToWork = route.direction === 'to_work';
  const activeMomStop = isGoingToWork ? MOM_WORK_STOP : MOM_HOME_STOP;

  // ==============================================================
  // BASEMAP DEFINITIONS - DETAILED GOOGLE MAPS & SATELLITE TILES
  // ==============================================================
  // 1. Google Detailed Roadmap: Rich roads, building footprints, street labels & parks
  const GOOGLE_ROADMAP = 'https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}';
  // 2. Google Hybrid Satellite: Photographic aerial view + crisp street names & landmarks
  const GOOGLE_SATELLITE = 'https://mt{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}';
  // 3. Esri World Light Canvas: Clean high-contrast neutral transit view
  const ESRI_CANVAS_BASE = 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}';
  const ESRI_CANVAS_LABELS = 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}';

  // Key recognition landmarks for Mom (uncluttered)
  const getMainLandmark = (stopCode: string): string | null => {
    if (stopCode === '6375' || stopCode === '11169') return '🏪 St. Lawrence Market';
    if (stopCode === '16754' || stopCode === '246') return '🚉 Union Station';
    return null;
  };

  // Switch basemap tiles
  const switchTiles = useCallback((map: L.Map, theme: MapLayerType) => {
    if (baseTileLayerRef.current) {
      map.removeLayer(baseTileLayerRef.current);
      baseTileLayerRef.current = null;
    }
    if (overlayTileLayerRef.current) {
      map.removeLayer(overlayTileLayerRef.current);
      overlayTileLayerRef.current = null;
    }

    if (theme === 'detailed') {
      const gTile = L.tileLayer(GOOGLE_ROADMAP, {
        subdomains: ['0', '1', '2', '3'],
        maxNativeZoom: 20,
        maxZoom: 22,
        attribution: '&copy; Google Maps',
      }).addTo(map);
      baseTileLayerRef.current = gTile;
    } else if (theme === 'satellite') {
      const satTile = L.tileLayer(GOOGLE_SATELLITE, {
        subdomains: ['0', '1', '2', '3'],
        maxNativeZoom: 20,
        maxZoom: 22,
        attribution: '&copy; Google Maps',
      }).addTo(map);
      baseTileLayerRef.current = satTile;
    } else {
      const canvasBase = L.tileLayer(ESRI_CANVAS_BASE, {
        maxNativeZoom: 16,
        maxZoom: 22,
        attribution: 'Tiles &copy; Esri',
      }).addTo(map);
      const canvasLabels = L.tileLayer(ESRI_CANVAS_LABELS, {
        maxNativeZoom: 16,
        maxZoom: 22,
      }).addTo(map);
      baseTileLayerRef.current = canvasBase;
      overlayTileLayerRef.current = canvasLabels;
    }
  }, []);

  // Near-real-time polling: keeps updates fast enough to feel live while preserving smooth map motion.
  const refreshTTCFeed = useCallback(async () => {
    const requestId = ++feedRequestRef.current;
    try {
      const vehicles = await fetchLiveTTCVehicles(
        '121',
        activeMomStop.lat,
        activeMomStop.lng,
        route.direction
      );
      if (requestId !== feedRequestRef.current) return;

      if (vehicles && vehicles.length > 0) {
        setLiveVehicles(vehicles);

        // Update animation target state
        const anims = animStatesRef.current;
        const now = performance.now();

        vehicles.forEach((v) => {
          const state = anims.get(v.id);

          if (!state) {
            anims.set(v.id, {
              currentLat: v.lat,
              currentLng: v.lng,
              targetLat: v.lat,
              targetLng: v.lng,
              currentHeading: v.heading,
              targetHeading: v.heading,
              speedKmH: v.speedKmH || 22,
              lastUpdate: now,
            });
          } else {
            state.targetLat = v.lat;
            state.targetLng = v.lng;
            state.targetHeading = v.heading;
            state.speedKmH = v.speedKmH || 22;
            state.lastUpdate = now;
          }
        });
      }
      setLastFeedSync(new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit' }));
    } catch (err) {
      console.error('Fast feed refresh error:', err);
    }
  }, [activeMomStop.lat, activeMomStop.lng, route.direction]);

  // Poll aggressively for the most live feel possible without starving the feed
  // 600ms keeps the bus positions responsive while still staying within a normal live-vehicle refresh cadence.
  useEffect(() => {
    refreshTTCFeed();
    const interval = setInterval(refreshTTCFeed, 600);
    return () => clearInterval(interval);
  }, [refreshTTCFeed]);

  // Repaint the ETA once per second so the card does not wait for a feed response.
  useEffect(() => {
    const interval = setInterval(() => setEtaTick((tick) => tick + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  // ==============================================================
  // 60 FPS HARDWARE-ACCELERATED REQUESTANIMATIONFRAME GLIDE ENGINE
  // ==============================================================
  useEffect(() => {
    let frameCount = 0;
    let lastFpsCheck = performance.now();

    const animateLoop = (time: number) => {
      const dt = Math.min(0.1, (time - lastFrameTimeRef.current) / 1000); // delta in seconds
      lastFrameTimeRef.current = time;

      // Track FPS
      frameCount++;
      if (time - lastFpsCheck >= 1000) {
        setFpsCounter(Math.round((frameCount * 1000) / (time - lastFpsCheck)));
        frameCount = 0;
        lastFpsCheck = time;
      }

      const map = mapInstanceRef.current;
      const anims = animStatesRef.current;
      const markers = vehicleMarkersRef.current;

      if (map && anims.size > 0) {
        anims.forEach((state, id) => {
          // Easing curve tuned for near-real-time motion: quick enough to react to fresh GPS, smooth enough to avoid jitter.
          const lerpFactor = 0.18 + Math.min(0.72, dt * 15);
          state.currentLat += (state.targetLat - state.currentLat) * lerpFactor;
          state.currentLng += (state.targetLng - state.currentLng) * lerpFactor;

          // Dead reckoning: If close to target and moving, gently extrapolate along heading
          const dLat = state.targetLat - state.currentLat;
          const dLng = state.targetLng - state.currentLng;
          const distSq = dLat * dLat + dLng * dLng;
          if (distSq < 0.0000001 && state.speedKmH > 0) {
            const metersMove = (state.speedKmH * 1000 / 3600) * dt * 1.1;
            const headingRad = (state.currentHeading * Math.PI) / 180;
            state.currentLat += (metersMove * Math.cos(headingRad)) / 111100;
            state.currentLng += (metersMove * Math.sin(headingRad)) / 80600;
          }

          // Shortest-arc heading angle interpolation (no 360 degree snap spinning)
          let deltaH = (state.targetHeading - state.currentHeading + 540) % 360 - 180;
          state.currentHeading = (state.currentHeading + deltaH * Math.min(1.0, dt * 12.0) + 360) % 360;

          // Update Leaflet marker position at 60 FPS
          const marker = markers.get(id);
          if (marker && map.hasLayer(marker)) {
            marker.setLatLng([state.currentLat, state.currentLng]);

            // Update rotation of direction pointer directly via DOM transform for silky 60fps performance
            const iconElem = marker.getElement();
            if (iconElem) {
              const busOrientation = iconElem.querySelector('.realistic-bus-orientation') as HTMLElement;
              if (busOrientation) {
                busOrientation.style.transform = `rotate(${state.currentHeading}deg)`;
              }
            }
          }

          // Camera smooth follow if active: animate gently so the map stays attached without jitter.
          if (followBusId === id && map) {
            map.panTo([state.currentLat, state.currentLng], {
              animate: true,
              duration: 0.25,
              noMoveStart: true,
            });
          }
        });
      }

      rafIdRef.current = requestAnimationFrame(animateLoop);
    };

    rafIdRef.current = requestAnimationFrame(animateLoop);
    return () => {
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    };
  }, [followBusId]);

  // ==============================================================
  // REALISTIC RED TRANSIT BUS MARKER
  // ==============================================================
  const createRealisticVehicleIcon = (
    cleanVid: string,
    etaLabel: string,
    heading: number,
    isPrimary: boolean,
    isSelected: boolean
  ) => {
    const bgGradient = 'background: linear-gradient(145deg, #F04438 0%, #B91C1C 100%);';

    const glowShadow = isSelected
      ? 'box-shadow: 0 0 0 3px #FACC15, 0 8px 20px rgba(0,0,0,0.45);'
      : 'box-shadow: 0 4px 12px rgba(0,0,0,0.32), 0 1px 3px rgba(0,0,0,0.25);';

    return `
      <div style="position: relative; width: 46px; height: 71px; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; user-select: none; pointer-events: auto;">
        
        <!-- Floating Realistic ETA Badge -->
        <div style="padding: 2px 7px; border-radius: 9999px; font-size: 10px; font-weight: 800; font-family: 'Plus Jakarta Sans', system-ui, sans-serif; color: #FFFFFF; ${bgGradient} border: 1.5px solid rgba(255,255,255,0.95); box-shadow: 0 2px 8px rgba(0,0,0,0.3); margin-bottom: 2px; white-space: nowrap; letter-spacing: -0.2px;">
          ${etaLabel}
        </div>

        <!-- Rotating vehicle orientation keeps the front arrow attached to the bus nose -->
        <div class="realistic-bus-orientation" style="position: relative; width: 22px; height: 56px; transform: rotate(${Math.round(heading)}deg); transform-origin: center center;">
          <!-- Realistic red bus body -->
          <div class="realistic-bus-body" style="position: absolute; top: 12px; left: 0; width: 22px; height: 44px; border-radius: 6px 6px 4px 4px; display: flex; align-items: center; justify-content: center; ${bgGradient} border: 2.5px solid #FFFFFF; ${glowShadow}">
          <!-- Front windshield and roof windows -->
          <div style="position: absolute; top: 5px; left: 3px; right: 3px; height: 10px; border-radius: 3px 3px 2px 2px; background: #111827; border: 1px solid rgba(255,255,255,0.6);"></div>
          <div style="position: absolute; top: 18px; left: 3px; right: 3px; height: 10px; border-radius: 2px; background: #111827; border: 1px solid rgba(255,255,255,0.6);"></div>
          <!-- Wheels -->
          <div style="position: absolute; left: 1px; top: 9px; width: 3px; height: 10px; border-radius: 1px; background: #20242A;"></div>
          <div style="position: absolute; right: 1px; top: 9px; width: 3px; height: 10px; border-radius: 1px; background: #20242A;"></div>
          <div style="position: absolute; left: 1px; bottom: 9px; width: 3px; height: 10px; border-radius: 1px; background: #20242A;"></div>
          <div style="position: absolute; right: 1px; bottom: 9px; width: 3px; height: 10px; border-radius: 1px; background: #20242A;"></div>
          
          <!-- Bus Number on the side panel -->
          <span style="font-size: 6px; font-weight: 900; font-family: 'Plus Jakarta Sans', system-ui, sans-serif; color: white; line-height: 1; letter-spacing: -0.2px; text-shadow: 0 1px 2px rgba(0,0,0,0.4);">
            ${cleanVid.length > 4 ? cleanVid.slice(-3) : cleanVid}
          </span>
          </div>

          <!-- Directional arrow fixed to the front/nose of the bus -->
          <div class="realistic-bus-heading-needle" style="position: absolute; left: 0; right: 0; top: 0; height: 14px; pointer-events: none; z-index: 3;">
            <div style="width: 0; height: 0; border-left: 7px solid transparent; border-right: 7px solid transparent; border-bottom: 13px solid #FACC15; position: absolute; left: 50%; top: -1px; transform: translateX(-50%); filter: drop-shadow(0 0 1px #111827) drop-shadow(0 2px 3px rgba(0,0,0,0.6));"></div>
          </div>
        </div>
      </div>
    `;
  };

  // Realistic Landmark & Street Stop Sign
  const createStopIcon = (stop: TTCStopInfo, landmarkText: string | null) => {
    if (landmarkText) {
      const isMarket = landmarkText.includes('Market');
      const badgeBg = isMarket
        ? 'background: #991B1B; color: #FEF2F2; border: 1.5px solid #F87171;'
        : 'background: #1E3A8A; color: #EFF6FF; border: 1.5px solid #60A5FA;';

      return `
        <div style="position: relative; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; user-select: none; cursor: pointer;">
          <!-- Realistic Landmark Capsule -->
          <div style="padding: 3.5px 10px; border-radius: 9999px; font-size: 10.5px; font-weight: 800; font-family: 'Plus Jakarta Sans', system-ui, sans-serif; ${badgeBg} box-shadow: 0 4px 14px rgba(0,0,0,0.25); margin-bottom: 3px; white-space: nowrap; display: flex; align-items: center; gap: 4px;">
            ${landmarkText}
          </div>
          <!-- Clean transit roundel -->
          <div style="width: 14px; height: 14px; border-radius: 50%; background-color: #FFFFFF; border: 3px solid #DC2626; box-shadow: 0 2px 6px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center;">
            <div style="width: 4px; height: 4px; border-radius: 50%; background-color: #DC2626;"></div>
          </div>
        </div>
      `;
    }

    return `
      <div style="width: 10px; height: 10px; border-radius: 50%; background-color: #FFFFFF; border: 2.5px solid #DC2626; box-shadow: 0 1px 3px rgba(0,0,0,0.25); display: flex; align-items: center; justify-content: center; cursor: pointer;"></div>
    `;
  };

  // Realistic Mom's Stop Beacon
  const createMomStopIcon = (stopCode: string, isSelected: boolean) => {
    return `
      <div style="position: relative; width: 104px; height: 54px; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; user-select: none; cursor: pointer;">
        <!-- Realistic TTC Stop Sign Banner -->
        <div style="padding: 3px 9px; border-radius: 9999px; font-size: 10.5px; font-weight: 800; font-family: 'Plus Jakarta Sans', system-ui, sans-serif; background: linear-gradient(135deg, #047857 0%, #065F46 100%); color: #FFFFFF; border: 1.5px solid #FDE047; box-shadow: 0 4px 14px rgba(4, 120, 87, 0.45); margin-bottom: 3px; white-space: nowrap; display: flex; align-items: center; gap: 4px;">
          <span style="color: #FDE047;">⭐</span> Mom's Stop #${stopCode}
        </div>

        <!-- 28px Realistic Transit Pole Puck -->
        <div style="position: relative; width: 28px; height: 28px; border-radius: 50%; background: linear-gradient(135deg, #10B981 0%, #047857 100%); border: 2.5px solid #FFFFFF; box-shadow: 0 4px 12px rgba(0,0,0,0.35); display: flex; align-items: center; justify-content: center; font-size: 14px; color: white; ${
          isSelected ? 'outline: 3px solid #FBBF24;' : ''
        }">
          🚏
        </div>
      </div>
    `;
  };

  // ==============================================================
  // 1. INITIALIZE LEAFLET MAP ON MOUNT
  // ==============================================================
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const map = L.map(mapContainerRef.current, {
      center: [43.649, -79.370],
      zoom: 15.5,
      minZoom: 11,
      maxZoom: 22,
      zoomControl: false,
      attributionControl: false,
    });

    map.on('zoomend', () => {
      setCurrentZoom(map.getZoom());
    });

    switchTiles(map, mapTheme);

    const isEastbound = route.direction === 'to_work';
    const primaryPolyline = isEastbound ? ROUTE_121_EASTBOUND_POLYLINE : ROUTE_121_WESTBOUND_POLYLINE;
    const secondaryPolyline = !isEastbound ? ROUTE_121_EASTBOUND_POLYLINE : ROUTE_121_WESTBOUND_POLYLINE;

    // Soft realistic route casing
    const casingPrimary = L.polyline(primaryPolyline, {
      color: '#000000',
      weight: 6.5,
      opacity: 0.18,
      lineCap: 'round',
      lineJoin: 'round',
    }).addTo(map);

    // Realistic vibrant transit route ribbon
    const linePrimary = L.polyline(primaryPolyline, {
      color: '#FF3B30',
      weight: 4.5,
      opacity: 0.95,
      lineCap: 'round',
      lineJoin: 'round',
    }).addTo(map);

    // Secondary route ribbon (soft translucent)
    const lineSecondary = L.polyline(secondaryPolyline, {
      color: '#FF3B30',
      weight: 2.8,
      opacity: 0.45,
      lineCap: 'round',
      lineJoin: 'round',
    }).addTo(map);

    casingPrimaryRef.current = casingPrimary;
    linePrimaryRef.current = linePrimary;
    lineSecondaryRef.current = lineSecondary;

    // Mom's Boarding Stop Beacon
    const momMarker = L.marker([activeMomStop.lat, activeMomStop.lng], {
      icon: L.divIcon({
        html: createMomStopIcon(activeMomStop.code, false),
        className: 'mom-stop-beacon-marker',
        iconSize: [92, 52],
        iconAnchor: [46, 38],
      }),
      zIndexOffset: 1500,
    }).addTo(map);

    momMarker.on('click', () => {
      setSelectedStop(activeMomStop);
      setSelectedVehicleId(null);
    });
    momStopMarkerRef.current = momMarker;

    mapInstanceRef.current = map;

    // Fit route bounds initially
    const allCoords = [...ROUTE_121_EASTBOUND_POLYLINE, ...ROUTE_121_WESTBOUND_POLYLINE];
    const bounds = L.latLngBounds(allCoords);
    map.fitBounds(bounds, { padding: [40, 40] });

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
      vehicleMarkersRef.current.clear();
      stopMarkersRef.current = [];
      animStatesRef.current.clear();
    };
  }, []); // Only runs once on mount

  // ==============================================================
  // 2. SMOOTH COMMUTE UPDATE (TO WORK <-> TO HOME)
  // ==============================================================
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const primaryPolyline = isGoingToWork ? ROUTE_121_EASTBOUND_POLYLINE : ROUTE_121_WESTBOUND_POLYLINE;
    const secondaryPolyline = !isGoingToWork ? ROUTE_121_EASTBOUND_POLYLINE : ROUTE_121_WESTBOUND_POLYLINE;

    if (casingPrimaryRef.current) casingPrimaryRef.current.setLatLngs(primaryPolyline);
    if (linePrimaryRef.current) linePrimaryRef.current.setLatLngs(primaryPolyline);
    if (lineSecondaryRef.current) lineSecondaryRef.current.setLatLngs(secondaryPolyline);

    if (momStopMarkerRef.current) {
      momStopMarkerRef.current.setLatLng([activeMomStop.lat, activeMomStop.lng]);
      momStopMarkerRef.current.setIcon(
        L.divIcon({
          html: createMomStopIcon(activeMomStop.code, false),
          className: 'mom-stop-beacon-marker',
          iconSize: [92, 52],
          iconAnchor: [46, 38],
        })
      );
    }

    // Refresh intermediate stops
    stopMarkersRef.current.forEach((m) => map.removeLayer(m));
    const newStopMarkers: L.Marker[] = [];

    ROUTE_121_STOPS.forEach((stop) => {
      if (stop.code === activeMomStop.code) return;

      const landmark = getMainLandmark(stop.code);
      const isLandmark = Boolean(landmark);

      const stopMarker = L.marker([stop.lat, stop.lng], {
        icon: L.divIcon({
          html: createStopIcon(stop, landmark),
          className: isLandmark ? 'ttc-landmark-stop-marker' : 'ttc-clean-stop-marker',
          iconSize: isLandmark ? [130, 36] : [10, 10],
          iconAnchor: isLandmark ? [65, 30] : [5, 5],
        }),
        zIndexOffset: isLandmark ? 600 : 350,
      }).addTo(map);

      stopMarker.bindTooltip(`<strong>${stop.name}</strong><br><span style="font-size:10px;color:#8E8E93">TTC Stop #${stop.code}</span>`, {
        direction: 'top',
        offset: [0, -5],
        className: 'compact-stop-tooltip',
      });

      stopMarker.on('click', () => {
        setSelectedStop(stop);
        setSelectedVehicleId(null);
      });

      newStopMarkers.push(stopMarker);
    });
    stopMarkersRef.current = newStopMarkers;

    map.flyTo([activeMomStop.lat, activeMomStop.lng], 16, { duration: 0.8 });
  }, [activeMomStop, isGoingToWork]);

  // Basemap switch
  useEffect(() => {
    if (mapInstanceRef.current) {
      switchTiles(mapInstanceRef.current, mapTheme);
    }
  }, [mapTheme, switchTiles]);

  // ==============================================================
  // 3. VEHICLE MARKERS ATTACHMENT & SYNC
  // ==============================================================
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const currentMarkers = vehicleMarkersRef.current;
    const activeIds = new Set(liveVehicles.map((v) => v.id));

    // Remove deleted markers
    currentMarkers.forEach((marker, id) => {
      if (!activeIds.has(id)) {
        map.removeLayer(marker);
        currentMarkers.delete(id);
        animStatesRef.current.delete(id);
      }
    });

    // Add or update markers
    liveVehicles.forEach((v, index) => {
      const isPrimary = index === 0;
      const isSelected = selectedVehicleId === v.id;
      const state = animStatesRef.current.get(v.id);
      const effectiveLat = state ? state.currentLat : v.lat;
      const effectiveLng = state ? state.currentLng : v.lng;
      const effectiveHeading = state ? state.currentHeading : v.heading;

      const html = createRealisticVehicleIcon(
        v.cleanVid,
        v.isApproaching === false ? 'Not approaching' : `${formatEtaMinutes(v.minutesToMomStop)}m`,
        effectiveHeading,
        isPrimary,
        isSelected
      );

      let marker = currentMarkers.get(v.id);
      if (!marker) {
        marker = L.marker([effectiveLat, effectiveLng], {
          icon: L.divIcon({
            html,
            className: 'realistic-bus-puck-marker',
            iconSize: [46, 71],
            iconAnchor: [23, 53],
          }),
          zIndexOffset: isPrimary ? 1200 : 1000 - index,
        }).addTo(map);

        marker.on('click', () => {
          setSelectedVehicleId(v.id);
          setSelectedStop(null);
          setFollowBusId(v.id);
        });

        currentMarkers.set(v.id, marker);
      } else {
        if (!map.hasLayer(marker)) marker.addTo(map);
        marker.setIcon(
          L.divIcon({
            html,
            className: 'realistic-bus-puck-marker',
            iconSize: [46, 71],
            iconAnchor: [23, 53],
          })
        );
        marker.setZIndexOffset(isPrimary ? 1200 : 1000 - index);
      }
    });
  }, [liveVehicles, selectedVehicleId]);

  // Camera Actions
  const fitAllBuses = useCallback(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;
    
    if (liveVehicles.length > 0) {
      const pts: [number, number][] = liveVehicles.map((v) => {
        const s = snapPointToRoute(v.lat, v.lng, v.direction);
        return [s.lat, s.lng];
      });
      pts.push([activeMomStop.lat, activeMomStop.lng]);
      const bounds = L.latLngBounds(pts);
      map.fitBounds(bounds, { padding: [55, 55], maxZoom: 16 });
    } else {
      const allCoords = [...ROUTE_121_EASTBOUND_POLYLINE, ...ROUTE_121_WESTBOUND_POLYLINE];
      map.fitBounds(L.latLngBounds(allCoords), { padding: [45, 45] });
    }
    setFollowBusId(null);
  }, [liveVehicles, activeMomStop]);

  const focusVehicle = useCallback((v: RealTTCVehicle) => {
    if (!mapInstanceRef.current) return;
    const state = animStatesRef.current.get(v.id);
    const lat = state ? state.currentLat : v.lat;
    const lng = state ? state.currentLng : v.lng;

    mapInstanceRef.current.flyTo([lat, lng], 18, { duration: 0.8 });
    setSelectedVehicleId(v.id);
    setSelectedStop(null);
    setFollowBusId(v.id);
  }, []);

  const focusMomStop = useCallback(() => {
    if (!mapInstanceRef.current) return;
    mapInstanceRef.current.flyTo([activeMomStop.lat, activeMomStop.lng], 18, { duration: 0.8 });
    setSelectedStop(activeMomStop);
    setSelectedVehicleId(null);
    setFollowBusId(null);
  }, [activeMomStop]);

  const focusStop = useCallback((stop: TTCStopInfo) => {
    if (!mapInstanceRef.current) return;
    mapInstanceRef.current.flyTo([stop.lat, stop.lng], 18, { duration: 0.8 });
    setSelectedStop(stop);
    setSelectedVehicleId(null);
  }, []);

  const fitFullRoute = useCallback(() => {
    if (!mapInstanceRef.current) return;
    const allCoords = [...ROUTE_121_EASTBOUND_POLYLINE, ...ROUTE_121_WESTBOUND_POLYLINE];
    mapInstanceRef.current.fitBounds(L.latLngBounds(allCoords), { padding: [45, 45], duration: 0.8 });
    setFollowBusId(null);
  }, []);

  const handleZoomIn = () => {
    if (mapInstanceRef.current) mapInstanceRef.current.zoomIn();
  };

  const handleZoomOut = () => {
    if (mapInstanceRef.current) mapInstanceRef.current.zoomOut();
  };

  // Calculate ETA from nearest bus
  const calculateStopETA = (stop: TTCStopInfo) => {
    if (liveVehicles.length === 0) return { minutes: 3, distanceM: 500 };
    let minMinutes = Infinity;
    let minDistance = Infinity;

    liveVehicles.forEach((v) => {
      const d = getDistanceMeters(v.lat, v.lng, stop.lat, stop.lng);
      const estMin = Math.max(1, Math.round(d / 250));
      if (estMin < minMinutes) {
        minMinutes = estMin;
        minDistance = d;
      }
    });

    return {
      minutes: minMinutes === Infinity ? 4 : minMinutes,
      distanceM: minDistance === Infinity ? 600 : minDistance,
    };
  };

  const selectedVehicle = liveVehicles.find((v) => v.id === selectedVehicleId) || (liveVehicles.length > 0 ? liveVehicles[0] : null);

  const getLiveEtaMinutes = (vehicle: RealTTCVehicle) => {
    void etaTick;
    if (vehicle.isApproaching === false) return Infinity;
    const state = animStatesRef.current.get(vehicle.id);
    const currentLat = state?.currentLat ?? vehicle.lat;
    const currentLng = state?.currentLng ?? vehicle.lng;
    const distanceFromLastFeed = getDistanceMeters(currentLat, currentLng, vehicle.lat, vehicle.lng);
    const estimatedDistance = Math.max(0, vehicle.distanceMeters - distanceFromLastFeed);
    const speedMetersPerMinute = Math.max(vehicle.speedKmH, 1) * 1000 / 60;
    return Math.max(0.5, estimatedDistance / speedMetersPerMinute);
  };

  const formatEta = (vehicle: RealTTCVehicle) => {
    const etaMinutes = getLiveEtaMinutes(vehicle);
    if (!Number.isFinite(etaMinutes)) return 'Not approaching';
    return `${formatEtaMinutes(etaMinutes)} MIN`;
  };

  const getHeadingRelativeToYou = (vehicle: RealTTCVehicle) => {
    const targetStop = isGoingToWork ? MOM_WORK_STOP : MOM_HOME_STOP;
    const bearingToStop = calculateBearing(vehicle.lat, vehicle.lng, targetStop.lat, targetStop.lng);
    const relativeAngle = ((bearingToStop - vehicle.heading + 540) % 360) - 180;
    return Math.abs(relativeAngle) <= 90 ? 'Toward you' : 'Away from you';
  };

  return (
    <div className="relative flex flex-col w-full h-full min-h-screen bg-[#F2F2F7] dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans select-none overflow-hidden">
      
      {/* ============================================================== */}
      {/* 1. TRANSLUCENT TOP HEADER (Glass Blur & High-Legibility)        */}
      {/* ============================================================== */}
      <header className="z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl px-2.5 sm:px-4 py-2 flex items-center justify-between gap-1.5 shadow-xs border-b border-black/5 dark:border-white/10 transition-colors">
        <div className="flex items-center gap-1.5 sm:gap-3 min-w-0">
          {/* TTC Iconic Crest */}
          <div className="flex items-center gap-1.5 bg-[#FF3B30] text-white px-2.5 py-0.5 rounded-lg shadow-xs font-black text-xs sm:text-sm uppercase tracking-wide shrink-0">
            <span>TTC 121</span>
          </div>

          <div className="hidden md:flex items-center gap-1 text-xs font-bold text-slate-700 dark:text-slate-300">
            <span>Esplanade-River</span>
          </div>

          {/* Commute Direction Switcher */}
          {onToggleCommute && (
            <button
              onClick={() => onToggleCommute(isGoingToWork ? 'to_home' : 'to_work')}
              className="px-2 sm:px-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 transition-all shadow-xs border border-black/5 dark:border-white/10 shrink-0"
              title="Switch Morning Work / Afternoon Home"
            >
              <ArrowLeftRight className="w-3.5 h-3.5 text-blue-500 shrink-0" />
              <span className="hidden sm:inline">{isGoingToWork ? 'Going Home' : 'Going to Work'}</span>
              <span className="sm:hidden">{isGoingToWork ? 'Home' : 'Work'}</span>
              <span className="hidden lg:inline text-[10px] text-emerald-600 dark:text-emerald-400 font-extrabold">
                {isGoingToWork ? '(Stop #15583)' : '(Stop #16754)'}
              </span>
            </button>
          )}

          {/* 60 FPS Real-time Glide Indicator */}
          <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-extrabold border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>60 FPS GLIDE</span>
            <span className="opacity-70">• 1.5s SYNC</span>
          </div>
        </div>

        {/* Right Action Buttons */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {/* Big Text View Button for Mom */}
          <button
            onClick={onSwitchToBigText}
            className="px-2 sm:px-3 py-1 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs flex items-center gap-1.5 shadow-sm transition-all active:scale-95"
            title="Switch to Senior Big Text View"
          >
            <Volume2 className="w-3.5 h-3.5 stroke-[2.5]" />
            <span className="hidden sm:inline">Big Text</span>
          </button>

          {/* Speech */}
          <button
            onClick={onSpeak}
            className="p-1.5 sm:p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors shadow-xs border border-black/5 dark:border-white/10"
            title="Read Arrival Aloud"
          >
            <Volume2 className="w-4 h-4 text-blue-500" />
          </button>

          {/* Alerts / Caregiver */}
          {onOpenNotifications && (
            <button
              onClick={onOpenNotifications}
              className="p-1.5 sm:p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors shadow-xs border border-black/5 dark:border-white/10"
              title="Notification Settings"
            >
              <Bell className="w-4 h-4 text-amber-500" />
            </button>
          )}
          {onOpenCaregiver && (
            <button
              onClick={onOpenCaregiver}
              className="p-1.5 sm:p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors shadow-xs border border-black/5 dark:border-white/10"
              title="Caregiver Testing Panel"
            >
              <Sliders className="w-4 h-4" />
            </button>
          )}
        </div>
      </header>

      {/* ============================================================== */}
      {/* 2. HORIZONTAL LIVE BUS CAROUSEL CHIPS                          */}
      {/* ============================================================== */}
      <div className="z-20 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border-b border-black/5 dark:border-white/10 px-3 py-1.5 flex items-center gap-2 overflow-x-auto text-xs scrollbar-none">
        {/* Frame All Buses Button */}
        <button
          onClick={fitAllBuses}
          className="px-2.5 py-1 rounded-full bg-slate-200/80 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-bold flex items-center gap-1.5 shrink-0 transition-colors shadow-2xs border border-black/5 dark:border-white/10"
        >
          <Crosshair className="w-3.5 h-3.5 text-blue-500" />
          <span>Show All ({liveVehicles.length} Buses)</span>
        </button>

        {/* Individual Bus Chips */}
        {liveVehicles.map((v, i) => {
          const isSelected = selectedVehicleId === v.id;
          const isPrimary = i === 0;

          return (
            <button
              key={v.id}
              onClick={() => focusVehicle(v)}
              className={`px-3 py-1 rounded-full font-bold flex items-center gap-1.5 shrink-0 transition-all shadow-2xs ${
                isSelected
                  ? 'bg-blue-600 text-white ring-2 ring-blue-400/50 shadow-md'
                  : isPrimary
                  ? 'bg-red-500/10 text-red-600 dark:bg-red-500/20 dark:text-red-400 hover:bg-red-500/20 border border-red-500/30'
                  : 'bg-white/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 border border-black/5 dark:border-white/10'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${isPrimary ? 'bg-red-500 animate-pulse' : 'bg-blue-500'}`} />
              <span>#{v.cleanVid}</span>
              <span className="font-extrabold text-[11px] opacity-90">({formatEta(v).toLowerCase()})</span>
            </button>
          );
        })}

        {/* Mom's Stop Quick Chip */}
        <button
          onClick={focusMomStop}
          className="px-3 py-1 rounded-full bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 font-bold flex items-center gap-1.5 shrink-0 border border-emerald-500/30 transition-all shadow-2xs"
        >
          <span>⭐</span>
          <span>Mom's Stop (#{activeMomStop.code})</span>
        </button>

        <a
          href={`sms:898882?body=${encodeURIComponent(activeMomStop.code)}`}
          aria-label={`Text TTC for arrivals at stop ${activeMomStop.code}`}
          className="px-3 py-1 rounded-full bg-sky-500/10 hover:bg-sky-500/20 text-sky-700 dark:text-sky-300 font-bold flex items-center gap-1.5 shrink-0 border border-sky-500/30 transition-all shadow-2xs"
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>Text Arrivals</span>
        </a>

        {/* Full Route Chip */}
        <button
          onClick={fitFullRoute}
          className="px-2.5 py-1 rounded-full bg-white/70 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-semibold flex items-center gap-1 shrink-0 border border-black/5 dark:border-white/10 hover:text-slate-900 dark:hover:text-white transition-colors text-[11px]"
        >
          <Maximize2 className="w-2.5 h-2.5" />
          <span>Full Route</span>
        </button>
      </div>

      {/* ============================================================== */}
      {/* 3. MAIN MAP WORKSPACE (REALISTIC 3D BUILDINGS & AERIAL VIEW)   */}
      {/* ============================================================== */}
      <div className="relative flex-1 w-full h-[calc(100vh-85px)] overflow-hidden">
        {/* Leaflet Map Container */}
        <div ref={mapContainerRef} className="w-full h-full absolute inset-0 z-0 bg-[#E5E0D8]" />

        {/* Map Layer Mode Switcher (Top-Right) */}
        <div className="absolute top-3 right-3 z-[500] flex items-center bg-white/85 dark:bg-slate-900/85 border border-black/10 dark:border-white/15 rounded-2xl p-1 shadow-xl backdrop-blur-xl text-xs font-bold text-slate-600 dark:text-slate-300">
          <button
            onClick={() => setMapTheme('detailed')}
            className={`px-2.5 sm:px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
              mapTheme === 'detailed'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'hover:text-slate-900 dark:hover:text-white'
            }`}
            title="Detailed Google Maps View with Street Geometry, Parks & Buildings"
          >
            <MapIcon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Detailed</span>
          </button>
          <button
            onClick={() => setMapTheme('satellite')}
            className={`px-2.5 sm:px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
              mapTheme === 'satellite'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'hover:text-slate-900 dark:hover:text-white'
            }`}
            title="Real Photographic Satellite View with Street Labels"
          >
            <Layers className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Satellite</span>
          </button>
          <button
            onClick={() => setMapTheme('contrast')}
            className={`px-2.5 sm:px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
              mapTheme === 'contrast'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'hover:text-slate-900 dark:hover:text-white'
            }`}
            title="Clean High-Contrast Transit View"
          >
            <Compass className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Clean</span>
          </button>
        </div>

        {/* Live Status & Commute Pill (Top-Left) */}
        <div className="absolute top-3 left-3 z-[500] px-3 py-1.5 rounded-2xl bg-white/85 dark:bg-slate-900/85 border border-black/10 dark:border-white/15 shadow-xl backdrop-blur-xl flex items-center gap-2 text-xs">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="font-extrabold text-slate-900 dark:text-white">
            {isGoingToWork ? 'TO WORK' : 'TO HOME'}
          </span>
          <span className="text-slate-500 dark:text-slate-400 text-[10px] font-medium hidden sm:inline">
            ({lastFeedSync})
          </span>
        </div>

        {/* Bottom Floating Card: Selected Bus Details (Transit Sheet) */}
        {selectedVehicle && !selectedStop && (
          <div className="absolute bottom-4 left-3 right-3 sm:left-4 sm:w-96 z-[500] bg-white/90 dark:bg-slate-900/90 border border-black/10 dark:border-white/15 rounded-3xl p-4 shadow-2xl backdrop-blur-2xl text-slate-900 dark:text-white">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#FF3B30] to-[#D70015] text-white flex flex-col items-center justify-center font-black shadow-md shrink-0">
                  <span className="text-[9px] uppercase font-bold leading-none">TTC</span>
                  <span className="text-base font-black leading-none">{selectedVehicle.cleanVid}</span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-black text-sm text-slate-900 dark:text-white">
                      Bus #{selectedVehicle.cleanVid}
                    </h3>
                    {selectedVehicle.isClosest && (
                      <span className="px-1.5 py-0.5 rounded-md text-[9px] font-black bg-emerald-500 text-white uppercase tracking-wider">
                        NEXT BUS
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                    {selectedVehicle.destination}
                  </p>
                </div>
              </div>

              <div className="text-right">
                <div className="text-xl font-black text-blue-600 dark:text-blue-400 leading-tight">
                  {formatEta(selectedVehicle)}
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold">
                  {selectedVehicle.isApproaching === false ? 'No arrival estimate' : selectedVehicle.arrivalClockTime}
                </div>
              </div>
            </div>

            <div className="mt-3 pt-2.5 border-t border-black/5 dark:border-white/10 grid grid-cols-3 gap-2 text-center text-xs">
              <div className="bg-slate-100/70 dark:bg-slate-800/60 p-2 rounded-xl">
                <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium flex items-center justify-center gap-1">
                  <Gauge className="w-3 h-3 text-blue-500" /> Speed
                </div>
                <div className="font-extrabold text-slate-800 dark:text-slate-200 mt-0.5">{selectedVehicle.speedKmH} km/h</div>
              </div>
              <div className="bg-slate-100/70 dark:bg-slate-800/60 p-2 rounded-xl">
                <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium flex items-center justify-center gap-1">
                  <Compass className="w-3 h-3 text-blue-500" /> Heading
                </div>
                <div className="font-extrabold text-slate-800 dark:text-slate-200 mt-0.5">{getHeadingRelativeToYou(selectedVehicle)}</div>
              </div>
              <div className="bg-slate-100/70 dark:bg-slate-800/60 p-2 rounded-xl">
                <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Seats</div>
                <div className="font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5 text-[11px] truncate">{selectedVehicle.passengerLoad}</div>
              </div>
            </div>

            <div className="mt-3 flex items-center gap-2">
              <button
                onClick={() => focusVehicle(selectedVehicle)}
                className="flex-1 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-sm active:scale-98"
              >
                <Crosshair className="w-3.5 h-3.5" />
                <span>Follow Bus #{selectedVehicle.cleanVid}</span>
              </button>
              <button
                onClick={focusMomStop}
                className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs flex items-center justify-center gap-1 transition-all border border-black/5 dark:border-white/10 active:scale-98"
              >
                <span>⭐ Mom's Stop</span>
              </button>
            </div>
          </div>
        )}

        {/* Bottom Floating Card: Selected Stop Details */}
        {selectedStop && (
          <div className="absolute bottom-4 left-3 right-3 sm:left-4 sm:w-96 z-[500] bg-white/90 dark:bg-slate-900/90 border border-black/10 dark:border-white/15 rounded-3xl p-4 shadow-2xl backdrop-blur-2xl text-slate-900 dark:text-white">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#10B981] to-[#059669] text-white flex items-center justify-center font-black shadow-md shrink-0 text-xl border border-white/40">
                  🚏
                </div>
                <div>
                  <h3 className="font-black text-sm text-slate-900 dark:text-white leading-snug">
                    {selectedStop.name}
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-blue-600 dark:text-blue-400 font-bold">
                      TTC Stop #{selectedStop.code}
                    </span>
                    {selectedStop.code === activeMomStop.code && (
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-emerald-600 text-white uppercase">
                        ⭐ MOM'S BOARDING STOP
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedStop(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {(() => {
              const eta = calculateStopETA(selectedStop);
              return (
                <div className="mt-3 p-3 rounded-2xl bg-slate-100/70 dark:bg-slate-800/60 border border-black/5 dark:border-white/10 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-medium">
                    <Clock className="w-4 h-4 text-blue-500" />
                    <span>Estimated Next Bus:</span>
                  </div>
                  <div className="font-black text-blue-600 dark:text-blue-400 text-sm">
                    ~{eta.minutes} min <span className="text-[10px] text-slate-500 dark:text-slate-400 font-normal">({eta.distanceM}m away)</span>
                  </div>
                </div>
              );
            })()}

            <div className="mt-3 flex items-center gap-2">
              <button
                onClick={() => focusStop(selectedStop)}
                className="flex-1 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-sm active:scale-98"
              >
                <Crosshair className="w-3.5 h-3.5" />
                <span>Center On Stop</span>
              </button>
              {selectedStop.code !== activeMomStop.code && (
                <button
                  onClick={() => {
                    if (onToggleCommute) {
                      onToggleCommute(isGoingToWork ? 'to_home' : 'to_work');
                    }
                  }}
                  className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-sm active:scale-98"
                >
                  <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
                  <span>Set as Mom's Stop</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Floating Navigation & Zoom Controls (Upper-Right, away from bus card) */}
        <div className="absolute right-3 top-20 z-[500] flex flex-col items-center gap-2">
          {/* Zoom Buttons Group */}
          <div className="flex flex-col items-center bg-white/85 dark:bg-slate-900/85 p-1 rounded-2xl border border-black/10 dark:border-white/15 shadow-xl backdrop-blur-xl">
            <button
              onClick={handleZoomIn}
              className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all active:scale-95"
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <div className="w-6 h-px bg-black/5 dark:bg-white/10 my-0.5"></div>
            <button
              onClick={handleZoomOut}
              className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all active:scale-95"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Fit Camera Button */}
          <button
            onClick={fitAllBuses}
            className="w-10 h-10 rounded-2xl bg-white/85 dark:bg-slate-900/85 border border-black/10 dark:border-white/15 shadow-xl backdrop-blur-xl flex items-center justify-center text-blue-600 dark:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all active:scale-95"
            title="Recenter and Fit All Buses"
          >
            <Crosshair className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
