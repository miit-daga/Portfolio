// Time-of-day sky, shared by the hero nebula, the planets in the backdrop and
// the porthole on the entry screen.
//
// The backdrop has known the visitor's local hour for a while (star density,
// the atmosphere band along the top edge, the night comet), but the effect was
// easy to miss. These palettes put the hour into the colours themselves: rose
// and gold around dawn, a lighter cyan by day, ember into violet at dusk, and a
// deeper indigo at night. Neighbouring stops blend, so 06:40 sits between dawn
// and day rather than snapping from one to the other.
//
// Preview any hour with ?sky=<0-23> in the URL, the same override
// animated-background.tsx already honours (e.g. /?sky=6 for dawn).

export type Rgb01 = readonly [number, number, number];
export type Rgb255 = { r: number; g: number; b: number };

export type SkyPalette = {
  /** Thinnest cloud, where the nebula fades toward black. */
  base: Rgb01;
  /** Mid-density cloud. */
  mid: Rgb01;
  /** Tint pulled in by the shader's domain warp. */
  warp: Rgb01;
  /** Bright filaments where cloud density peaks. */
  filament: Rgb01;
  /** Light falling on the planets: lit limb, specular, rim. */
  keyLight: Rgb255;
};

const NIGHT: SkyPalette = {
  base: [0.03, 0.05, 0.15],
  mid: [0.06, 0.28, 0.36],
  warp: [0.2, 0.11, 0.46],
  filament: [0.18, 0.46, 0.54],
  keyLight: { r: 205, g: 220, b: 255 },
};

const DAWN: SkyPalette = {
  base: [0.09, 0.05, 0.15],
  mid: [0.42, 0.17, 0.27],
  warp: [0.32, 0.12, 0.34],
  filament: [0.86, 0.56, 0.3],
  keyLight: { r: 255, g: 208, b: 150 },
};

const DAY: SkyPalette = {
  base: [0.05, 0.11, 0.2],
  mid: [0.09, 0.4, 0.42],
  warp: [0.2, 0.22, 0.5],
  filament: [0.28, 0.64, 0.62],
  keyLight: { r: 255, g: 255, b: 255 },
};

const DUSK: SkyPalette = {
  base: [0.07, 0.04, 0.14],
  mid: [0.4, 0.16, 0.2],
  warp: [0.3, 0.11, 0.42],
  filament: [0.82, 0.42, 0.22],
  keyLight: { r: 255, g: 184, b: 128 },
};

// Keyframes across the day. The plateaus line up with the backdrop's own
// night (20-4) and day (7-16) windows; the gaps between them are the blends.
const STOPS: { h: number; p: SkyPalette }[] = [
  { h: 0, p: NIGHT },
  { h: 4.5, p: NIGHT },
  { h: 6, p: DAWN },
  { h: 7.5, p: DAY },
  { h: 16.5, p: DAY },
  { h: 18.5, p: DUSK },
  { h: 20, p: NIGHT },
  { h: 24, p: NIGHT },
];

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const lerp3 = (a: Rgb01, b: Rgb01, t: number): Rgb01 => [
  lerp(a[0], b[0], t),
  lerp(a[1], b[1], t),
  lerp(a[2], b[2], t),
];

/**
 * The visitor's local hour as a fraction (13.5 is half past one), or the
 * ?sky= override when present. Client only; the server is handed noon.
 */
export function resolveSkyHour(): number {
  if (typeof window === "undefined") return 12;
  const param = new URLSearchParams(window.location.search).get("sky");
  if (param !== null && !Number.isNaN(Number(param))) {
    return ((Number(param) % 24) + 24) % 24;
  }
  const now = new Date();
  return now.getHours() + now.getMinutes() / 60;
}

/** Palette for a given hour, blended between the nearest keyframes. */
export function skyPalette(hour: number): SkyPalette {
  const h = ((hour % 24) + 24) % 24;
  for (let i = 0; i < STOPS.length - 1; i++) {
    const a = STOPS[i];
    const b = STOPS[i + 1];
    if (h >= a.h && h < b.h) {
      const t = (h - a.h) / (b.h - a.h);
      return {
        base: lerp3(a.p.base, b.p.base, t),
        mid: lerp3(a.p.mid, b.p.mid, t),
        warp: lerp3(a.p.warp, b.p.warp, t),
        filament: lerp3(a.p.filament, b.p.filament, t),
        keyLight: {
          r: Math.round(lerp(a.p.keyLight.r, b.p.keyLight.r, t)),
          g: Math.round(lerp(a.p.keyLight.g, b.p.keyLight.g, t)),
          b: Math.round(lerp(a.p.keyLight.b, b.p.keyLight.b, t)),
        },
      };
    }
  }
  return NIGHT;
}

/** CSS colour from a 0-1 triple, with an optional alpha. */
export function rgbCss(c: Rgb01, alpha = 1): string {
  const to255 = (v: number) => Math.round(Math.min(1, Math.max(0, v)) * 255);
  const r = to255(c[0]);
  const g = to255(c[1]);
  const b = to255(c[2]);
  return alpha >= 1 ? `rgb(${r}, ${g}, ${b})` : `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
