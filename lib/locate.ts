// Offline reverse-geocoding for the ISS telemetry strip: turns a lat/lon into
// a human phrase like "over Cape Town", "640 km northeast of Madagascar" or
// "over the South Pacific" (no API, just nearest-landmark + ocean fallback).

type Landmark = { name: string; lat: number; lon: number };

// Globally spread, recognizable reference points. Islands matter: the ISS
// spends most of its time over water.
const LANDMARKS: Landmark[] = [
    // Pacific
    { name: "Honolulu", lat: 21.3, lon: -157.9 },
    { name: "Tahiti", lat: -17.7, lon: -149.4 },
    { name: "Fiji", lat: -17.7, lon: 178.0 },
    { name: "Guam", lat: 13.4, lon: 144.8 },
    { name: "Easter Island", lat: -27.1, lon: -109.4 },
    { name: "the Galapagos Islands", lat: -0.7, lon: -90.3 },
    { name: "Auckland", lat: -36.8, lon: 174.8 },
    // Oceania / SE Asia
    { name: "Sydney", lat: -33.9, lon: 151.2 },
    { name: "Perth", lat: -31.9, lon: 115.9 },
    { name: "Darwin", lat: -12.5, lon: 130.8 },
    { name: "Jakarta", lat: -6.2, lon: 106.8 },
    { name: "Singapore", lat: 1.35, lon: 103.8 },
    { name: "Manila", lat: 14.6, lon: 121.0 },
    { name: "Bangkok", lat: 13.8, lon: 100.5 },
    { name: "Papua New Guinea", lat: -6.3, lon: 146.0 },
    // East Asia
    { name: "Tokyo", lat: 35.7, lon: 139.7 },
    { name: "Seoul", lat: 37.6, lon: 127.0 },
    { name: "Beijing", lat: 39.9, lon: 116.4 },
    { name: "Shanghai", lat: 31.2, lon: 121.5 },
    { name: "Hong Kong", lat: 22.3, lon: 114.2 },
    { name: "Taipei", lat: 25.0, lon: 121.6 },
    // South Asia
    { name: "Delhi", lat: 28.6, lon: 77.2 },
    { name: "Mumbai", lat: 19.1, lon: 72.9 },
    { name: "Kolkata", lat: 22.6, lon: 88.4 },
    { name: "Chennai", lat: 13.1, lon: 80.3 },
    { name: "Colombo", lat: 6.9, lon: 79.9 },
    { name: "the Maldives", lat: 4.2, lon: 73.5 },
    { name: "Karachi", lat: 24.9, lon: 67.0 },
    { name: "Dhaka", lat: 23.8, lon: 90.4 },
    // Central / North Asia
    { name: "Tehran", lat: 35.7, lon: 51.4 },
    { name: "Tashkent", lat: 41.3, lon: 69.2 },
    { name: "Almaty", lat: 43.2, lon: 76.9 },
    { name: "Ulaanbaatar", lat: 47.9, lon: 106.9 },
    { name: "Novosibirsk", lat: 55.0, lon: 82.9 },
    { name: "Irkutsk", lat: 52.3, lon: 104.3 },
    { name: "Vladivostok", lat: 43.1, lon: 131.9 },
    // Middle East
    { name: "Dubai", lat: 25.2, lon: 55.3 },
    { name: "Riyadh", lat: 24.7, lon: 46.7 },
    { name: "Istanbul", lat: 41.0, lon: 29.0 },
    // Indian Ocean
    { name: "Madagascar", lat: -18.9, lon: 47.5 },
    { name: "Mauritius", lat: -20.2, lon: 57.5 },
    { name: "the Seychelles", lat: -4.6, lon: 55.5 },
    // Africa
    { name: "Cairo", lat: 30.0, lon: 31.2 },
    { name: "Nairobi", lat: -1.3, lon: 36.8 },
    { name: "Lagos", lat: 6.5, lon: 3.4 },
    { name: "Accra", lat: 5.6, lon: -0.2 },
    { name: "Dakar", lat: 14.7, lon: -17.5 },
    { name: "Casablanca", lat: 33.6, lon: -7.6 },
    { name: "Cape Town", lat: -33.9, lon: 18.4 },
    { name: "Johannesburg", lat: -26.2, lon: 28.0 },
    { name: "Cape Verde", lat: 16.0, lon: -24.0 },
    { name: "St. Helena", lat: -15.9, lon: -5.7 },
    // Europe
    { name: "London", lat: 51.5, lon: -0.1 },
    { name: "Paris", lat: 48.9, lon: 2.3 },
    { name: "Madrid", lat: 40.4, lon: -3.7 },
    { name: "Lisbon", lat: 38.7, lon: -9.1 },
    { name: "Rome", lat: 41.9, lon: 12.5 },
    { name: "Athens", lat: 38.0, lon: 23.7 },
    { name: "Berlin", lat: 52.5, lon: 13.4 },
    { name: "Warsaw", lat: 52.2, lon: 21.0 },
    { name: "Kyiv", lat: 50.5, lon: 30.5 },
    { name: "Moscow", lat: 55.8, lon: 37.6 },
    { name: "Stockholm", lat: 59.3, lon: 18.1 },
    { name: "Reykjavik", lat: 64.1, lon: -21.9 },
    { name: "the Azores", lat: 38.7, lon: -27.2 },
    { name: "the Canary Islands", lat: 28.3, lon: -16.5 },
    // North America
    { name: "Anchorage", lat: 61.2, lon: -149.9 },
    { name: "Vancouver", lat: 49.3, lon: -123.1 },
    { name: "San Francisco", lat: 37.8, lon: -122.4 },
    { name: "Los Angeles", lat: 34.1, lon: -118.2 },
    { name: "Denver", lat: 39.7, lon: -105.0 },
    { name: "Dallas", lat: 32.8, lon: -96.8 },
    { name: "Chicago", lat: 41.9, lon: -87.6 },
    { name: "Toronto", lat: 43.7, lon: -79.4 },
    { name: "New York", lat: 40.7, lon: -74.0 },
    { name: "Miami", lat: 25.8, lon: -80.2 },
    { name: "Bermuda", lat: 32.3, lon: -64.8 },
    // Central / South America
    { name: "Mexico City", lat: 19.4, lon: -99.1 },
    { name: "Havana", lat: 23.1, lon: -82.4 },
    { name: "Panama City", lat: 9.0, lon: -79.5 },
    { name: "Bogota", lat: 4.7, lon: -74.1 },
    { name: "Quito", lat: -0.2, lon: -78.5 },
    { name: "Lima", lat: -12.0, lon: -77.0 },
    { name: "Santiago", lat: -33.4, lon: -70.7 },
    { name: "Buenos Aires", lat: -34.6, lon: -58.4 },
    { name: "Sao Paulo", lat: -23.6, lon: -46.6 },
    { name: "Rio de Janeiro", lat: -22.9, lon: -43.2 },
    { name: "Brasilia", lat: -15.8, lon: -47.9 },
    { name: "Recife", lat: -8.0, lon: -34.9 },
    { name: "Caracas", lat: 10.5, lon: -66.9 },
    { name: "the Falkland Islands", lat: -51.7, lon: -59.2 },
];

const R_EARTH = 6371;
const rad = Math.PI / 180;

const haversineKm = (aLat: number, aLon: number, bLat: number, bLon: number) => {
    const dLat = (bLat - aLat) * rad;
    const dLon = (bLon - aLon) * rad;
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(aLat * rad) * Math.cos(bLat * rad) * Math.sin(dLon / 2) ** 2;
    return R_EARTH * 2 * Math.asin(Math.sqrt(h));
};

const COMPASS = ["north", "northeast", "east", "southeast", "south", "southwest", "west", "northwest"];

// Initial bearing from the landmark toward the point, snapped to 8 winds
const bearingWord = (fromLat: number, fromLon: number, toLat: number, toLon: number) => {
    const dLon = (toLon - fromLon) * rad;
    const y = Math.sin(dLon) * Math.cos(toLat * rad);
    const x =
        Math.cos(fromLat * rad) * Math.sin(toLat * rad) -
        Math.sin(fromLat * rad) * Math.cos(toLat * rad) * Math.cos(dLon);
    const deg = ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
    return COMPASS[Math.round(deg / 45) % 8];
};

const oceanName = (lat: number, lon: number) => {
    if (lat < -55) return "the Southern Ocean";
    const l = ((lon + 540) % 360) - 180; // normalize to -180..180
    if (l >= -70 && l < 20) return lat >= 0 ? "the North Atlantic" : "the South Atlantic";
    if (l >= 20 && l < 146) return "the Indian Ocean";
    return lat >= 0 ? "the North Pacific" : "the South Pacific";
};

// "over Cape Town" | "640 km northeast of Madagascar" | "over the South Pacific"
export function describeLocation(lat: number, lon: number): string {
    let best: Landmark = LANDMARKS[0];
    let bestDist = Infinity;
    for (const lm of LANDMARKS) {
        const d = haversineKm(lat, lon, lm.lat, lm.lon);
        if (d < bestDist) {
            bestDist = d;
            best = lm;
        }
    }
    if (bestDist < 200) return `over ${best.name}`;
    if (bestDist < 1400) {
        const dist = Math.round(bestDist / 10) * 10;
        return `${dist} km ${bearingWord(best.lat, best.lon, lat, lon)} of ${best.name}`;
    }
    return `over ${oceanName(lat, lon)}`;
}
