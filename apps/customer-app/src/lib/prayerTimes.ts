// Fajr (end of suhoor) and Maghrib (iftar) worked out on the phone from the
// sun's position - no internet or prayer-time service needed. Same method
// as common prayer-time calculators:
//   Sunni (Muslim World League): Fajr at 18° below the horizon, Maghrib at sunset.
//   Shia (Jafari, Leva Institute): Fajr at 16°, Maghrib at 4° below the horizon.
// Iraq is UTC+3 all year. Results are rounded to the minute; a local mosque
// may differ by a minute or two, which the Home card says.

export type PrayerMethod = 'sunni' | 'shia';

const METHODS: Record<PrayerMethod, { fajrAngle: number; maghribAngle: number }> = {
  sunni: { fajrAngle: 18, maghribAngle: 0.833 },
  shia: { fajrAngle: 16, maghribAngle: 4 },
};

const IRAQ_UTC_OFFSET = 3;

const rad = (d: number) => (d * Math.PI) / 180;
const deg = (r: number) => (r * 180) / Math.PI;
const fix = (a: number, b: number) => a - b * Math.floor(a / b);

function julianDay(year: number, month: number, day: number): number {
  if (month <= 2) {
    year -= 1;
    month += 12;
  }
  const a = Math.floor(year / 100);
  const b = 2 - a + Math.floor(a / 4);
  return Math.floor(365.25 * (year + 4716)) + Math.floor(30.6001 * (month + 1)) + day + b - 1524.5;
}

// Sun declination and equation of time for a Julian day.
function sunPosition(jd: number): { declination: number; equation: number } {
  const d = jd - 2451545.0;
  const g = fix(357.529 + 0.98560028 * d, 360);
  const q = fix(280.459 + 0.98564736 * d, 360);
  const l = fix(q + 1.915 * Math.sin(rad(g)) + 0.02 * Math.sin(rad(2 * g)), 360);
  const e = 23.439 - 0.00000036 * d;
  const ra = fix(deg(Math.atan2(Math.cos(rad(e)) * Math.sin(rad(l)), Math.cos(rad(l)))) / 15, 24);
  return {
    declination: deg(Math.asin(Math.sin(rad(e)) * Math.sin(rad(l)))),
    equation: q / 15 - ra,
  };
}

// Hours between noon and the moment the sun is `angle` degrees below the horizon.
function hoursFromNoon(angle: number, latitude: number, declination: number): number {
  const cos =
    (-Math.sin(rad(angle)) - Math.sin(rad(declination)) * Math.sin(rad(latitude))) /
    (Math.cos(rad(declination)) * Math.cos(rad(latitude)));
  return deg(Math.acos(Math.min(1, Math.max(-1, cos)))) / 15;
}

const toClock = (hours: number) => {
  const minutes = Math.round(fix(hours, 24) * 60) % (24 * 60);
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
};

// "HH:MM" Iraq time for a "YYYY-MM-DD" Iraq calendar day.
export function prayerTimes(
  date: string,
  place: { lat: number; lng: number },
  method: PrayerMethod,
): { fajr: string; maghrib: string } {
  const [y, m, d] = date.split('-').map(Number);
  const jd = julianDay(y, m, d) - place.lng / (15 * 24);
  const { declination, equation } = sunPosition(jd + 0.5);
  const noon = 12 + IRAQ_UTC_OFFSET - place.lng / 15 - equation;
  const { fajrAngle, maghribAngle } = METHODS[method];
  return {
    fajr: toClock(noon - hoursFromNoon(fajrAngle, place.lat, declination)),
    maghrib: toClock(noon + hoursFromNoon(maghribAngle, place.lat, declination)),
  };
}

// Provincial capitals, for the area picked on Home. Matched on the
// province's English name; anything unknown uses Baghdad.
const PLACES: [string[], { lat: number; lng: number }][] = [
  [['baghdad'], { lat: 33.315, lng: 44.366 }],
  [['basra', 'basrah'], { lat: 30.508, lng: 47.783 }],
  [['nineveh', 'ninawa', 'mosul'], { lat: 36.34, lng: 43.13 }],
  [['erbil', 'arbil'], { lat: 36.191, lng: 44.009 }],
  [['sulaymaniyah', 'sulaimani', 'sulaymani'], { lat: 35.557, lng: 45.435 }],
  [['duhok', 'dohuk'], { lat: 36.867, lng: 42.988 }],
  [['halabja'], { lat: 35.178, lng: 45.986 }],
  [['kirkuk'], { lat: 35.468, lng: 44.392 }],
  [['anbar', 'ramadi'], { lat: 33.42, lng: 43.3 }],
  [['babil', 'babylon', 'hillah'], { lat: 32.468, lng: 44.42 }],
  [['karbala'], { lat: 32.616, lng: 44.024 }],
  [['najaf'], { lat: 32.0, lng: 44.33 }],
  [['diyala', 'baqubah'], { lat: 33.75, lng: 44.64 }],
  [['wasit', 'kut'], { lat: 32.51, lng: 45.82 }],
  [['maysan', 'amarah'], { lat: 31.836, lng: 47.144 }],
  [['dhi qar', 'thi qar', 'nasiriyah'], { lat: 31.044, lng: 46.257 }],
  [['muthanna', 'samawah'], { lat: 31.31, lng: 45.28 }],
  [['qadisiyyah', 'qadisiyah', 'diwaniyah'], { lat: 31.99, lng: 44.93 }],
  [['salah', 'saladin', 'tikrit'], { lat: 34.6, lng: 43.68 }],
];

export function placeForProvince(provinceNameEn?: string | null): { lat: number; lng: number } {
  const name = (provinceNameEn ?? '').toLowerCase();
  return PLACES.find(([keys]) => keys.some((k) => name.includes(k)))?.[1] ?? PLACES[0][1];
}
