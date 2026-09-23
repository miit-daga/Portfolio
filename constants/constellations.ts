// The About section's hidden constellations (components/ui/constellation-puzzle.tsx),
// one for each day of the week, Sunday first. Coordinates are in the puzzle's 320 x 200 viewBox.
// Each figure is hidden among decoy stars; the visitor traces its edges.

export type Pt = { x: number; y: number };

export type Figure = {
    id: string;
    /** Charted name, shown once traced. */
    name: string;
    /** Fills "<noun> is hidden in these stars". */
    noun: string;
    stars: Pt[];
    /** Pairs of indices into stars. */
    edges: [number, number][];
    decoys: Pt[];
};

export const FIGURES: Figure[] = [
    {
        id: "m",
        name: "MIIT-1",
        noun: "a letter",
        stars: [
            { x: 70, y: 168 },
            { x: 78, y: 52 },
            { x: 125, y: 118 },
            { x: 172, y: 50 },
            { x: 182, y: 168 },
        ],
        edges: [[0, 1], [1, 2], [2, 3], [3, 4]],
        decoys: [
            { x: 232, y: 72 },
            { x: 268, y: 142 },
            { x: 215, y: 32 },
            { x: 292, y: 92 },
            { x: 138, y: 22 },
            { x: 40, y: 92 },
        ],
    },
    {
        id: "d",
        name: "DAGA-2",
        noun: "a letter",
        stars: [
            { x: 92, y: 38 },
            { x: 92, y: 172 },
            { x: 168, y: 156 },
            { x: 202, y: 106 },
            { x: 170, y: 54 },
        ],
        edges: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 0]],
        decoys: [
            { x: 250, y: 60 },
            { x: 272, y: 150 },
            { x: 40, y: 120 },
            { x: 132, y: 104 },
            { x: 230, y: 180 },
            { x: 36, y: 40 },
        ],
    },
    {
        id: "rocket",
        name: "LAUNCH",
        noun: "a rocket",
        stars: [
            { x: 160, y: 22 },
            { x: 136, y: 66 },
            { x: 184, y: 66 },
            { x: 136, y: 136 },
            { x: 184, y: 136 },
            { x: 108, y: 176 },
            { x: 212, y: 176 },
        ],
        edges: [[0, 1], [0, 2], [1, 3], [2, 4], [3, 4], [3, 5], [4, 6]],
        decoys: [
            { x: 60, y: 60 },
            { x: 262, y: 44 },
            { x: 282, y: 120 },
            { x: 44, y: 140 },
            { x: 160, y: 100 },
            { x: 236, y: 96 },
        ],
    },
    {
        id: "dipper",
        name: "URSA MAJOR",
        noun: "the Big Dipper",
        stars: [
            { x: 60, y: 118 },
            { x: 66, y: 168 },
            { x: 132, y: 172 },
            { x: 140, y: 124 },
            { x: 190, y: 102 },
            { x: 236, y: 80 },
            { x: 288, y: 64 },
        ],
        edges: [[0, 1], [1, 2], [2, 3], [3, 0], [3, 4], [4, 5], [5, 6]],
        decoys: [
            { x: 110, y: 40 },
            { x: 230, y: 160 },
            { x: 36, y: 50 },
            { x: 176, y: 36 },
            { x: 280, y: 146 },
            { x: 100, y: 96 },
        ],
    },
    {
        id: "ufo",
        name: "VISITOR",
        noun: "a flying saucer",
        stars: [
            { x: 64, y: 122 },
            { x: 122, y: 96 },
            { x: 160, y: 60 },
            { x: 198, y: 96 },
            { x: 256, y: 122 },
            { x: 208, y: 150 },
            { x: 112, y: 150 },
        ],
        edges: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 0]],
        decoys: [
            { x: 60, y: 44 },
            { x: 264, y: 40 },
            { x: 160, y: 182 },
            { x: 290, y: 176 },
            { x: 30, y: 178 },
            { x: 160, y: 118 },
        ],
    },
    {
        id: "comet",
        name: "HALLEY",
        noun: "a comet",
        // A bright head, three tail streaks fanning out behind it
        stars: [
            { x: 250, y: 56 },
            { x: 172, y: 70 },
            { x: 86, y: 80 },
            { x: 164, y: 112 },
            { x: 72, y: 142 },
            { x: 186, y: 148 },
            { x: 116, y: 186 },
        ],
        edges: [[0, 1], [1, 2], [0, 3], [3, 4], [0, 5], [5, 6]],
        decoys: [
            { x: 120, y: 26 },
            { x: 282, y: 112 },
            { x: 236, y: 186 },
            { x: 36, y: 36 },
            { x: 298, y: 30 },
            { x: 36, y: 186 },
        ],
    },
    {
        id: "satellite",
        name: "HUBBLE",
        noun: "a satellite",
        // A square body with a winged solar panel on each side
        stars: [
            { x: 144, y: 84 },
            { x: 184, y: 84 },
            { x: 184, y: 124 },
            { x: 144, y: 124 },
            { x: 82, y: 104 },
            { x: 246, y: 104 },
        ],
        edges: [[0, 1], [1, 2], [2, 3], [3, 0], [0, 4], [4, 3], [1, 5], [5, 2]],
        decoys: [
            { x: 44, y: 40 },
            { x: 282, y: 42 },
            { x: 60, y: 172 },
            { x: 262, y: 170 },
            { x: 164, y: 36 },
            { x: 164, y: 180 },
        ],
    },
];

export const isFigureId = (v: unknown): v is string => typeof v === "string" && FIGURES.some((f) => f.id === v);

/**
 * Today's constellation, by the visitor's day of the week (Sunday is the M).
 * ?constellation=<id> previews a specific one.
 */
export function todaysFigure(): Figure {
    if (typeof window !== "undefined") {
        const forced = new URLSearchParams(window.location.search).get("constellation");
        const hit = FIGURES.find((f) => f.id === forced);
        if (hit) return hit;
    }
    return FIGURES[new Date().getDay() % FIGURES.length];
}
