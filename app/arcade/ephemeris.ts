// Where the planets and the Moon really are on a date, for Gravity Assist's
// mission of the day. The planets come from JPL's "Keplerian Elements for
// Approximate Positions of the Major Planets" (E. M. Standish, Table 1, good
// from 1800 to 2050 to within a fraction of a degree); the Moon from the usual
// short series for its longitude, good to a degree or so. Checked against JPL
// Horizons. Positions are heliocentric, in the ecliptic, in AU.

export type Planet = "mercury" | "venus" | "earth" | "mars" | "jupiter" | "saturn" | "uranus" | "neptune";

// a (AU), e, I, L, long. perihelion, long. ascending node (degrees), then each per century
const ELEMENTS: Record<Planet, [number, number][]> = {
    mercury: [[0.38709927, 0.00000037], [0.20563593, 0.00001906], [7.00497902, -0.00594749], [252.2503235, 149472.67411175], [77.45779628, 0.16047689], [48.33076593, -0.12534081]],
    venus: [[0.72333566, 0.0000039], [0.00677672, -0.00004107], [3.39467605, -0.0007889], [181.9790995, 58517.81538729], [131.60246718, 0.00268329], [76.67984255, -0.27769418]],
    earth: [[1.00000261, 0.00000562], [0.01671123, -0.00004392], [-0.00001531, -0.01294668], [100.46457166, 35999.37244981], [102.93768193, 0.32327364], [0, 0]],
    mars: [[1.52371034, 0.00001847], [0.0933941, 0.00007882], [1.84969142, -0.00813131], [-4.55343205, 19140.30268499], [-23.94362959, 0.44441088], [49.55953891, -0.29257343]],
    jupiter: [[5.202887, -0.00011607], [0.04838624, -0.00013253], [1.30439695, -0.00183714], [34.39644051, 3034.74612775], [14.72847983, 0.21252668], [100.47390909, 0.20469106]],
    saturn: [[9.53667594, -0.0012506], [0.05386179, -0.00050991], [2.48599187, 0.00193609], [49.95424423, 1222.49362201], [92.59887831, -0.41897216], [113.66242448, -0.28867794]],
    uranus: [[19.18916464, -0.00196176], [0.04725744, -0.00004397], [0.77263783, -0.00242939], [313.23810451, 428.48202785], [170.9542763, 0.40805281], [74.01692503, 0.04240589]],
    neptune: [[30.06992276, 0.00026291], [0.00859048, 0.00005105], [1.77004347, 0.00035372], [-55.12002969, 218.45945325], [44.96476227, -0.32241464], [131.78422574, -0.00508664]],
};
export const PLANETS = Object.keys(ELEMENTS) as Planet[];

const D2R = Math.PI / 180;
/** Days since J2000.0 (2000 January 1, 12:00 TT, near enough UTC here). */
const daysSinceJ2000 = (date: Date) => (date.getTime() - Date.UTC(2000, 0, 1, 12)) / 86_400_000;

/** A planet's heliocentric ecliptic position, in AU. */
export function planetAt(p: Planet, date: Date) {
    const T = daysSinceJ2000(date) / 36525;
    const [a, e, I, L, wbar, node] = ELEMENTS[p].map(([v, rate]) => v + rate * T);
    const w = (wbar - node) * D2R;
    let M = ((L - wbar) % 360) * D2R;
    if (M > Math.PI) M -= 2 * Math.PI;
    if (M < -Math.PI) M += 2 * Math.PI;
    // Kepler's equation, by Newton's method
    let E = M + e * Math.sin(M);
    for (let k = 0; k < 8; k++) E -= (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
    const xp = a * (Math.cos(E) - e);
    const yp = a * Math.sqrt(1 - e * e) * Math.sin(E);
    const [cw, sw, cO, sO, cI, sI] = [Math.cos(w), Math.sin(w), Math.cos(node * D2R), Math.sin(node * D2R), Math.cos(I * D2R), Math.sin(I * D2R)];
    return {
        x: (cw * cO - sw * sO * cI) * xp + (-sw * cO - cw * sO * cI) * yp,
        y: (cw * sO + sw * cO * cI) * xp + (-sw * sO + cw * cO * cI) * yp,
        z: sw * sI * xp + cw * sI * yp,
    };
}

/** A planet's heliocentric ecliptic longitude, in degrees (0 to 360). */
export function longitude(p: Planet, date: Date) {
    const { x, y } = planetAt(p, date);
    return ((Math.atan2(y, x) / D2R) % 360 + 360) % 360;
}

/** The Moon's geocentric ecliptic longitude, in degrees. */
export function moonLongitude(date: Date) {
    const d = daysSinceJ2000(date);
    const L = 218.316 + 13.176396 * d; // mean longitude
    const M = (134.963 + 13.064993 * d) * D2R; // mean anomaly
    const Ms = (357.529 + 0.98560028 * d) * D2R; // the Sun's mean anomaly
    const D = (297.85 + 12.190749 * d) * D2R; // mean elongation
    const lon = L + 6.289 * Math.sin(M) + 1.274 * Math.sin(2 * D - M) + 0.658 * Math.sin(2 * D) - 0.186 * Math.sin(Ms) + 0.214 * Math.sin(2 * M);
    return ((lon % 360) + 360) % 360;
}

/** How far apart two planets are today, in km. */
export function distanceKm(a: Planet, b: Planet, date: Date) {
    const p = planetAt(a, date);
    const q = planetAt(b, date);
    return Math.hypot(p.x - q.x, p.y - q.y, p.z - q.z) * 149_597_870.7;
}
