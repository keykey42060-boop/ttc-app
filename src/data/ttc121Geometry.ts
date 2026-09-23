// Authentic TTC Route 121 Esplanade-River GTFS Geometry and Stops
// Extracted from City of Toronto / TTC Open Data ArcGIS FeatureServer

export interface TTCStopInfo {
  code: string;
  name: string;
  lat: number;
  lng: number;
  isMomWorkStop?: boolean;
  isMomHomeStop?: boolean;
}

// Real GTFS Polyline coordinates for Route 121 (Eastbound: Union Station -> Hennick Bridgepoint Hospital)
export const ROUTE_121_EASTBOUND_POLYLINE: [number, number][] = [[43.646222, -79.37802], [43.646277, -79.37791], [43.646291, -79.377879], [43.646335, -79.377776], [43.646414, -79.377643], [43.646463, -79.37753], [43.646742, -79.377089], [43.646803, -79.377011], [43.646878, -79.376961], [43.647453, -79.37575], [43.647648, -79.375426], [43.648437, -79.373795], [43.64725, -79.373299], [43.647481, -79.372842], [43.647544, -79.372717], [43.648034, -79.371728], [43.648218, -79.370919], [43.648482, -79.369753], [43.648764, -79.368479], [43.649039, -79.367288], [43.649322, -79.3661], [43.650231, -79.366499], [43.650681, -79.366692], [43.651266, -79.364017], [43.651561, -79.362727], [43.651907, -79.361252], [43.652099, -79.360324], [43.652651, -79.357978], [43.652926, -79.356816], [43.653151, -79.35583], [43.653372, -79.354862], [43.653567, -79.354009], [43.653638, -79.35371], [43.653751, -79.353748], [43.654079, -79.353817], [43.65465, -79.353728], [43.654699, -79.353919], [43.65491, -79.354645], [43.655267, -79.354506], [43.655572, -79.354817], [43.655722, -79.354971], [43.655877, -79.355124], [43.656525, -79.355802], [43.656868, -79.356158], [43.657115, -79.356376], [43.657375, -79.35653], [43.657857, -79.356752], [43.657886, -79.356764], [43.658201, -79.356897], [43.658236, -79.356912], [43.658252, -79.356918], [43.658546, -79.357043], [43.658935, -79.357208], [43.659524, -79.357457], [43.659769, -79.357559], [43.660235, -79.357757], [43.660568, -79.357894], [43.660609, -79.357911], [43.661198, -79.358162], [43.661563, -79.35832], [43.661845, -79.358442], [43.66218, -79.358586], [43.662415, -79.358687], [43.663707, -79.359244], [43.663799, -79.358923], [43.664375, -79.356869], [43.664423, -79.356711], [43.664478, -79.356529], [43.66449, -79.35649], [43.664533, -79.356303], [43.664602, -79.355963], [43.664644, -79.355774], [43.664781, -79.355293], [43.664814, -79.355179], [43.664821, -79.355152], [43.664938, -79.354732], [43.665021, -79.354436], [43.665048, -79.354339], [43.665144, -79.353993], [43.665148, -79.353978], [43.665172, -79.353892], [43.665273, -79.353525], [43.665333, -79.35331], [43.665482, -79.352776], [43.665486, -79.352624], [43.66616, -79.352911], [43.665971, -79.353618], [43.665948, -79.353708], [43.665922, -79.353758], [43.665889, -79.353821], [43.665886, -79.353831], [43.665821, -79.353958], [43.665779, -79.354099], [43.665768, -79.354152], [43.665692, -79.354495], [43.665646, -79.354707], [43.665482, -79.355452]];

// Real GTFS Polyline coordinates for Route 121 (Westbound: Hennick Bridgepoint Hospital -> Union Station)
export const ROUTE_121_WESTBOUND_POLYLINE: [number, number][] = [[43.665768, -79.354152], [43.665692, -79.354495], [43.665646, -79.354707], [43.665482, -79.355452], [43.664814, -79.355179], [43.664781, -79.355293], [43.664644, -79.355774], [43.664602, -79.355963], [43.664533, -79.356303], [43.66449, -79.35649], [43.664478, -79.356529], [43.664423, -79.356711], [43.664375, -79.356869], [43.663799, -79.358923], [43.663707, -79.359244], [43.662415, -79.358687], [43.66218, -79.358586], [43.661845, -79.358442], [43.661563, -79.35832], [43.661198, -79.358162], [43.660609, -79.357911], [43.660568, -79.357894], [43.660235, -79.357757], [43.659769, -79.357559], [43.659524, -79.357457], [43.658935, -79.357208], [43.658546, -79.357043], [43.658252, -79.356918], [43.658236, -79.356912], [43.658201, -79.356897], [43.657886, -79.356764], [43.657857, -79.356752], [43.657375, -79.35653], [43.657115, -79.356376], [43.656868, -79.356158], [43.656525, -79.355802], [43.655877, -79.355124], [43.655722, -79.354971], [43.655572, -79.354817], [43.655267, -79.354506], [43.655098, -79.353857], [43.655082, -79.353812], [43.655004, -79.353553], [43.654832, -79.353649], [43.65465, -79.353728], [43.654079, -79.353817], [43.653751, -79.353748], [43.653638, -79.35371], [43.653489, -79.353614], [43.653421, -79.353566], [43.653347, -79.353514], [43.653281, -79.353466], [43.65322, -79.353415], [43.653139, -79.353338], [43.653025, -79.353215], [43.652936, -79.353115], [43.652861, -79.353068], [43.652567, -79.353552], [43.652195, -79.354359], [43.651938, -79.354781], [43.65182, -79.355288], [43.651594, -79.356258], [43.651323, -79.357378], [43.650754, -79.359741], [43.65019, -79.362128], [43.650296, -79.362178], [43.651561, -79.362727], [43.651266, -79.364017], [43.650843, -79.36384], [43.650103, -79.36353], [43.649901, -79.363759], [43.649854, -79.363828], [43.649831, -79.363867], [43.649806, -79.36393], [43.649787, -79.364015], [43.649617, -79.364771], [43.649322, -79.3661], [43.649039, -79.367288], [43.648764, -79.368479], [43.648482, -79.369753], [43.648218, -79.370919], [43.648034, -79.371728], [43.647544, -79.372717], [43.647481, -79.372842], [43.64725, -79.373299], [43.646354, -79.375272], [43.645777, -79.37649], [43.646878, -79.376961], [43.647846, -79.37737], [43.647747, -79.377698], [43.647712, -79.377872], [43.647334, -79.379729], [43.64598, -79.379122], [43.646094, -79.378456], [43.646176, -79.37817], [43.646222, -79.37802], [43.646277, -79.37791], [43.646291, -79.377879], [43.646335, -79.377776]];

// Backwards compatibility alias
export const ROUTE_121_FULL_POLYLINE = ROUTE_121_EASTBOUND_POLYLINE;
export const ROUTE_121_RETURN_POLYLINE = ROUTE_121_WESTBOUND_POLYLINE;

// Real TTC Surface Stops for Route 121
export const ROUTE_121_STOPS: TTCStopInfo[] = [
  {
    "code": "246",
    "name": "Bay St at Front St West South Side - Union Station",
    "lng": -79.378997,
    "lat": 43.645484
  },
  {
    "code": "12425",
    "name": "The Esplanade at Yonge St",
    "lng": -79.37637,
    "lat": 43.645867
  },
  {
    "code": "16754",
    "name": "1 Front St West - Union Station",
    "lng": -79.377816,
    "lat": 43.646205
  },
  {
    "code": "13455",
    "name": "Yonge St at Front St East",
    "lng": -79.376766,
    "lat": 43.646768
  },
  {
    "code": "15583",
    "name": "The Esplanade at Church St West Side",
    "lng": -79.37365,
    "lat": 43.647131
  },
  {
    "code": "15509",
    "name": "Church St at The Esplanade",
    "lng": -79.37348,
    "lat": 43.647498
  },
  {
    "code": "6375",
    "name": "The Esplanade at Lower Jarvis St East Side",
    "lng": -79.370453,
    "lat": 43.648249
  },
  {
    "code": "11169",
    "name": "The Esplanade at Lower Jarvis St",
    "lng": -79.370746,
    "lat": 43.648293
  },
  {
    "code": "6376",
    "name": "The Esplanade at Lower Sherbourne St",
    "lng": -79.367679,
    "lat": 43.648898
  },
  {
    "code": "11167",
    "name": "The Esplanade at Lower Sherbourne St",
    "lng": -79.367145,
    "lat": 43.649115
  },
  {
    "code": "11166",
    "name": "The Esplanade at Princess St",
    "lng": -79.36594,
    "lat": 43.649391
  },
  {
    "code": "16038",
    "name": "Princess St at The Esplanade North Side",
    "lng": -79.366189,
    "lat": 43.649789
  },
  {
    "code": "6603",
    "name": "Mill St at Parliament St",
    "lng": -79.36191,
    "lat": 43.650318
  },
  {
    "code": "6604",
    "name": "Mill St at Trinity St",
    "lng": -79.359623,
    "lat": 43.650855
  },
  {
    "code": "11164",
    "name": "Berkeley St at Front St East South Side",
    "lng": -79.36392,
    "lat": 43.650874
  },
  {
    "code": "16039",
    "name": "Front St East at Berkeley St",
    "lng": -79.364259,
    "lat": 43.651134
  },
  {
    "code": "15246",
    "name": "Mill St at Cherry St West Side",
    "lng": -79.357883,
    "lat": 43.65127
  },
  {
    "code": "11914",
    "name": "Front St East at Parliament St",
    "lng": -79.362968,
    "lat": 43.651418
  },
  {
    "code": "15510",
    "name": "Front St East at Cherry St",
    "lng": -79.358636,
    "lat": 43.652436
  },
  {
    "code": "16024",
    "name": "Front St East at Bayview Ave",
    "lng": -79.353876,
    "lat": 43.653507
  },
  {
    "code": "16025",
    "name": "Bayview Ave at Front St East",
    "lng": -79.353851,
    "lat": 43.653731
  },
  {
    "code": "16027",
    "name": "River St at King St East",
    "lng": -79.356315,
    "lat": 43.656931
  },
  {
    "code": "16026",
    "name": "River St at Queen St East",
    "lng": -79.356389,
    "lat": 43.657289
  },
  {
    "code": "16029",
    "name": "River St at Dundas St East South Side",
    "lng": -79.358107,
    "lat": 43.660838
  },
  {
    "code": "16028",
    "name": "River St at Dundas St East",
    "lng": -79.358032,
    "lat": 43.661107
  },
  {
    "code": "16030",
    "name": "River St at Gerrard St East",
    "lng": -79.359065,
    "lat": 43.663491
  },
  {
    "code": "16031",
    "name": "Gerrard St East at River St",
    "lng": -79.358666,
    "lat": 43.663948
  },
  {
    "code": "1080",
    "name": "Gerrard St East at Blackburn St",
    "lng": -79.355383,
    "lat": 43.664667
  },
  {
    "code": "16034",
    "name": "St Matthews Rd at Gerrard St East",
    "lng": -79.355329,
    "lat": 43.66496
  },
  {
    "code": "16033",
    "name": "Jack Layton Way at St Matthews Rd",
    "lng": -79.354843,
    "lat": 43.665695
  },
  {
    "code": "16263",
    "name": "Jack Layton Way at Blue Rodeo Dr",
    "lng": -79.353523,
    "lat": 43.666089
  }
];

export const MOM_WORK_STOP: TTCStopInfo = {
  code: '16754',
  name: 'Front St West at Union Station',
  lat: 43.646205,
  lng: -79.377816,
  isMomWorkStop: true,
};

export const MOM_HOME_STOP: TTCStopInfo = {
  code: '15583',
  name: 'The Esplanade at Church St West Side',
  lat: 43.647131,
  lng: -79.373650,
  isMomHomeStop: true,
};

// Map-matching / Snapping function to lock GPS vehicle coordinates directly onto the street centerline
export function snapPointToRoute(
  lat: number,
  lng: number,
  direction: 'East' | 'West' | string
): { lat: number; lng: number; heading: number } {
  const isWest = (direction || '').toLowerCase().includes('west');
  // Primary polyline based on direction, fallback to the opposite polyline
  const primaryPts = isWest ? ROUTE_121_WESTBOUND_POLYLINE : ROUTE_121_EASTBOUND_POLYLINE;
  const secondaryPts = isWest ? ROUTE_121_EASTBOUND_POLYLINE : ROUTE_121_WESTBOUND_POLYLINE;

  const testPolyline = (pts: [number, number][]) => {
    let bestDistSq = Infinity;
    let bestLat = lat;
    let bestLng = lng;
    let bestHeading = 0;

    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i];
      const b = pts[i + 1];
      const ay = a[0]; // lat
      const ax = a[1]; // lng
      const by = b[0];
      const bx = b[1];

      const dx = bx - ax;
      const dy = by - ay;
      if (dx === 0 && dy === 0) continue;

      const t = Math.max(0, Math.min(1, ((lng - ax) * dx + (lat - ay) * dy) / (dx * dx + dy * dy)));
      const projX = ax + t * dx;
      const projY = ay + t * dy;

      const dLngM = (projX - lng) * 80600;
      const dLatM = (projY - lat) * 111100;
      const distSq = dLngM * dLngM + dLatM * dLatM;

      if (distSq < bestDistSq) {
        bestDistSq = distSq;
        bestLat = projY;
        bestLng = projX;

        const dLonRad = ((bx - ax) * Math.PI) / 180;
        const lat1Rad = (ay * Math.PI) / 180;
        const lat2Rad = (by * Math.PI) / 180;
        const y = Math.sin(dLonRad) * Math.cos(lat2Rad);
        const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) - Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLonRad);
        bestHeading = (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
      }
    }
    return { bestDistSq, bestLat, bestLng, bestHeading };
  };

  const primaryResult = testPolyline(primaryPts);
  if (primaryResult.bestDistSq < 80 * 80) {
    return {
      lat: primaryResult.bestLat,
      lng: primaryResult.bestLng,
      heading: Math.round(primaryResult.bestHeading),
    };
  }

  // If not near primary, check secondary track
  const secondaryResult = testPolyline(secondaryPts);
  if (secondaryResult.bestDistSq < 80 * 80) {
    return {
      lat: secondaryResult.bestLat,
      lng: secondaryResult.bestLng,
      heading: Math.round(secondaryResult.bestHeading),
    };
  }

  return { lat, lng, heading: isWest ? 260 : 80 };
}
