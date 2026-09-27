"use client";
import { useEffect, useRef, useState } from "react";
import { loadBodies, type BodyKey } from "./bodies";

// ISRO's journeys, replayed to scale (for app/isro): Chandrayaan-3 to the
// Moon, Mangalyaan to Mars, Aditya-L1 to the Sun–Earth L1 point. Every orbit
// is drawn at its true size and shape, from the mission's published figures
// (ISRO's updates, as compiled on Wikipedia; dates in IST), and the craft
// moves round it as Kepler says, slow at the far end and fast at the near
// one (sped up: each loop takes seconds, whatever its real period). What's
// simplified: the orbits' orientation (each points its far end to the
// right), and the shape of Aditya-L1's halo orbit, drawn as a loop.

type Scene = "earth" | "moon" | "sun" | "mars" | "l1";
type Step = {
    date: string;
    title: string;
    text: string;
    scene: Scene;
    /** how many km from the centre the view shows, edge to middle */
    view: number;
    /** an orbit: its lowest and highest altitude above the body (km) */
    orbit?: [number, number];
    /** only the far end is published (its low point is drawn near the one before, and not quoted) */
    farOnly?: boolean;
    kind?: "launch" | "orbit" | "transfer" | "cruise" | "halo" | "land" | "separate";
};
type Mission = { id: string; name: string; craft: string; rocket: string; summary: string; steps: Step[] };

const RADIUS: Record<"earth" | "moon" | "mars", number> = { earth: 6371, moon: 1737, mars: 3390 };
const MOON_DIST = 384400;
const AU = 149_597_871;
const L1_DIST = 1_500_000;

const MISSIONS: Mission[] = [
    {
        id: "chandrayaan-3",
        name: "Chandrayaan-3",
        craft: "Vikram and Pragyan",
        rocket: "LVM3-M4",
        summary: "Apollo reached the Moon in three days. Chandrayaan-3 took 40, spiralling out round the Earth and in round the Moon, because its rocket couldn't throw it there directly: the slow route trades time for fuel. It landed near the Moon's south pole, the first craft ever to.",
        steps: [
            { date: "14 Jul 2023, 2:35 pm", title: "Launch", scene: "earth", view: 45000, orbit: [170, 36500], kind: "launch", text: "LVM3, ISRO's heaviest rocket, lifts off from Sriharikota and leaves Chandrayaan-3 in a long, thin orbit round the Earth." },
            { date: "15 Jul 2023", title: "Orbit raise 1", scene: "earth", view: 50000, orbit: [173, 41762], kind: "orbit", text: "The first of five burns, each fired at the lowest point, where the craft is fastest: a push there stretches the far end most." },
            { date: "17 Jul 2023", title: "Orbit raise 2", scene: "earth", view: 50000, orbit: [226, 41603], kind: "orbit", text: "This one mostly lifted the low point, clear of the thin upper air; the far end barely moved." },
            { date: "18 Jul 2023", title: "Orbit raise 3", scene: "earth", view: 60000, orbit: [228, 51400], kind: "orbit", text: "The far end stretches almost 10,000 km further out." },
            { date: "20 Jul 2023", title: "Orbit raise 4", scene: "earth", view: 82000, orbit: [233, 71351], kind: "orbit", text: "Another 20,000 km on the far end, which now reaches nearly a fifth of the way to the Moon." },
            { date: "25 Jul 2023", title: "Orbit raise 5", scene: "earth", view: 145000, orbit: [236, 127603], kind: "orbit", text: "The last lap round the Earth: the far end now reaches a third of the way to the Moon." },
            { date: "1 Aug 2023, just after midnight", title: "Trans-lunar injection", scene: "earth", view: 420000, orbit: [288, 369328], kind: "transfer", text: "One more burn at the low point, and the orbit's far end reaches out to meet the Moon. Five days coasting across." },
            { date: "5 Aug 2023", title: "Captured by the Moon", scene: "moon", view: 21000, orbit: [164, 18074], kind: "orbit", text: "A braking burn, and the Moon's gravity takes hold: Chandrayaan-3 now circles the Moon instead of the Earth." },
            { date: "6 Aug 2023", title: "Lunar orbit reduced", scene: "moon", view: 7000, orbit: [170, 4313], kind: "orbit", text: "Burns now go the other way, shrinking the orbit: its far end comes in by three quarters." },
            { date: "9 Aug 2023", title: "Lunar orbit reduced", scene: "moon", view: 3900, orbit: [174, 1437], kind: "orbit", text: "The far end comes in by two thirds again." },
            { date: "14 Aug 2023", title: "Lunar orbit reduced", scene: "moon", view: 3300, orbit: [150, 177], kind: "orbit", text: "Nearly a circle now: its high and low points are only 27 km apart." },
            { date: "16 Aug 2023", title: "Final circular orbit", scene: "moon", view: 3300, orbit: [153, 163], kind: "orbit", text: "A last small trim: its high and low points now just 10 km apart, a near-circle about 160 km up, the orbit the lander will leave from." },
            { date: "17 Aug 2023", title: "Separation", scene: "moon", view: 3300, orbit: [153, 163], kind: "separate", text: "Vikram, with the Pragyan rover folded inside, separates from the propulsion module, which stays in orbit." },
            { date: "18 Aug 2023", title: "Deboost 1", scene: "moon", view: 3300, orbit: [113, 157], kind: "orbit", text: "Vikram fires its own engines for the first time, lowering its orbit." },
            { date: "20 Aug 2023, early hours", title: "Deboost 2", scene: "moon", view: 3300, orbit: [25, 134], kind: "orbit", text: "Its low point is now where the powered descent will begin." },
            { date: "23 Aug 2023, 6:03 pm", title: "Landing", scene: "moon", view: 3300, orbit: [25, 134], kind: "land", text: "From 25 km, a powered descent of about 20 minutes to a soft touchdown near the south pole, at 69.37°S 32.32°E, now named Shiv Shakti point. India became the fourth country to land softly on the Moon, and the first near its south pole." },
        ],
    },
    {
        id: "mangalyaan",
        name: "Mangalyaan",
        craft: "the Mars Orbiter Mission",
        rocket: "PSLV-C25",
        summary: "India's first interplanetary mission reached Mars orbit on its first attempt, the first Asian country to get there, for about ₹450 crore. Its rocket was too small to send it straight to Mars, so it circled the Earth for almost a month first, raising its orbit in six burns.",
        steps: [
            { date: "5 Nov 2013, 2:38 pm", title: "Launch", scene: "earth", view: 30000, orbit: [264, 23904], kind: "launch", text: "PSLV-C25 lifts off from Sriharikota and leaves Mangalyaan in an elongated orbit round the Earth." },
            { date: "7 Nov 2013", title: "Orbit raise 1", scene: "earth", view: 36000, orbit: [260, 28825], farOnly: true, kind: "orbit", text: "The first of the Earth-bound burns, each fired at the low point, where a push stretches the far end most." },
            { date: "8 Nov 2013", title: "Orbit raise 2", scene: "earth", view: 48000, orbit: [260, 40186], farOnly: true, kind: "orbit", text: "The far end stretches over 11,000 km further out." },
            { date: "9 Nov 2013", title: "Orbit raise 3", scene: "earth", view: 82000, orbit: [260, 71636], farOnly: true, kind: "orbit", text: "The biggest stretch yet: over 31,000 km more on the far end." },
            { date: "11 Nov 2013", title: "A burn falls short", scene: "earth", view: 90000, orbit: [260, 78276], farOnly: true, kind: "orbit", text: "This burn delivered far less than planned, adding only about 6,600 km to the far end. ISRO added a supplementary burn to make it up." },
            { date: "13 Nov 2013", title: "Supplementary burn", scene: "earth", view: 135000, orbit: [260, 118642], farOnly: true, kind: "orbit", text: "Back on plan: the far end out by another 40,000 km." },
            { date: "16 Nov 2013", title: "Final orbit raise", scene: "earth", view: 215000, orbit: [260, 192874], farOnly: true, kind: "orbit", text: "The far end now reaches half the way to the Moon, eight times further out than the orbit it launched into." },
            { date: "1 Dec 2013, 12:49 am", title: "Trans-Mars injection", scene: "sun", view: 1.75 * AU, kind: "cruise", text: "The last burn at the low point sends Mangalyaan out of Earth's grip for good, onto an orbit round the Sun whose far end meets Mars. From this burn to Mars took 297 days and 7 hours (often quoted as 298), from 1 December 2013 to 24 September 2014, 323 days after launch: 780 million km of coasting, with small course corrections on the way." },
            { date: "24 Sep 2014, 7:40 am", title: "Mars orbit insertion", scene: "mars", view: 88000, orbit: [421.7, 76993.6], kind: "orbit", text: "A braking burn, and Mars captures it, once round every 72 hours 52 minutes. It went on to work for eight years, planned for six months." },
        ],
    },
    {
        id: "aditya-l1",
        name: "Aditya-L1",
        craft: "India's solar observatory",
        rocket: "PSLV-C57",
        summary: "India's first mission to study the Sun works from the Sun–Earth L1 point, 1.5 million km from Earth toward the Sun, where the pull of the two balances. From there it watches the Sun without ever being eclipsed by the Earth or the Moon.",
        steps: [
            { date: "2 Sep 2023, 11:50 am", title: "Launch", scene: "earth", view: 26000, orbit: [235, 19500], kind: "launch", text: "PSLV-C57 lifts off from Sriharikota and leaves Aditya-L1 in an elongated orbit round the Earth." },
            { date: "3 Sep 2023", title: "Earth-bound burn 1", scene: "earth", view: 29000, orbit: [245, 22459], kind: "orbit", text: "The first of four Earth-bound burns, each fired at the low point, stretching the far end." },
            { date: "5 Sep 2023", title: "Earth-bound burn 2", scene: "earth", view: 48000, orbit: [282, 40225], kind: "orbit", text: "The far end grows by almost 18,000 km." },
            { date: "10 Sep 2023", title: "Earth-bound burn 3", scene: "earth", view: 82000, orbit: [296, 71767], kind: "orbit", text: "The far end grows by over 31,000 km." },
            { date: "15 Sep 2023", title: "Earth-bound burn 4", scene: "earth", view: 140000, orbit: [256, 121973], kind: "orbit", text: "The last loop round the Earth: its far end reaches almost a third of the way to the Moon." },
            { date: "19 Sep 2023, 2 am", title: "Trans-L1 injection", scene: "l1", view: 1_750_000, kind: "cruise", text: "It leaves the Earth for L1, 1.5 million km sunward, about four times as far as the Moon. The crossing takes almost four months." },
            { date: "6 Jan 2024, 4:17 pm", title: "Halo orbit insertion", scene: "l1", view: 1_750_000, kind: "halo", text: "Aditya-L1 settles into a halo orbit around L1, once round every 177.86 days, keeping the Sun in constant view. (Its loop is drawn here schematically.)" },
        ],
    },
];

/** A point on an orbit, at a fraction of its period, as Kepler has it: [x, y] km from the body's centre, far end to the right. */
function onOrbit(rp: number, ra: number, frac: number): [number, number] {
    const a = (rp + ra) / 2;
    const e = (ra - rp) / (ra + rp);
    const M = frac * Math.PI * 2;
    let E = M;
    for (let i = 0; i < 12; i++) E -= (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
    const b = a * Math.sqrt(1 - e * e);
    // perigee on the left, apogee on the right
    return [-a * (Math.cos(E) - e), b * Math.sin(E)];
}
const orbitPath = (rp: number, ra: number, n = 240) => Array.from({ length: n + 1 }, (_, i) => onOrbit(rp, ra, i / n));

export function Journeys() {
    const [mi, setMi] = useState(0);
    const [si, setSi] = useState(0);
    const [playing, setPlaying] = useState(false);
    const canvas = useRef<HTMLCanvasElement>(null);
    const mission = MISSIONS[mi];
    const step = mission.steps[si];
    const live = useRef({ mission, si, view: step.view, scene: step.scene, fade: 1, t0: performance.now() });
    live.current.mission = mission;
    live.current.si = si;

    // a new step: the craft starts its loop afresh
    useEffect(() => {
        live.current.t0 = performance.now();
    }, [mi, si]);

    // playing: the next step every few seconds
    useEffect(() => {
        if (!playing) return;
        const id = window.setTimeout(() => {
            if (si < mission.steps.length - 1) setSi(si + 1);
            else setPlaying(false);
        }, mission.steps[si].kind === "cruise" ? 9000 : 4200);
        return () => window.clearTimeout(id);
    }, [playing, si, mission]);

    // the drawing
    useEffect(() => {
        const cv = canvas.current;
        if (!cv) return;
        const ctx = cv.getContext("2d")!;
        let raf = 0;
        const stars = Array.from({ length: 140 }, () => [Math.random(), Math.random(), Math.random() * 0.8 + 0.2]);
        // the worlds, rendered from their real maps as they arrive (gradients until then)
        const worlds: Partial<Record<BodyKey, HTMLCanvasElement[]>> = {};
        loadBodies((key, c) => (worlds[key] = c));
        const draw = () => {
            raf = requestAnimationFrame(draw);
            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            const w = cv.clientWidth;
            const h = cv.clientHeight;
            if (cv.width !== w * dpr) {
                cv.width = w * dpr;
                cv.height = h * dpr;
            }
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            const L = live.current;
            const st = L.mission.steps[L.si];
            // the view glides between scales within a scene; a new scene fades in
            if (st.scene !== L.scene) {
                L.fade = Math.max(0, L.fade - 0.08);
                if (L.fade === 0) {
                    L.scene = st.scene;
                    L.view = st.view;
                }
            } else {
                L.fade = Math.min(1, L.fade + 0.06);
                L.view = Math.exp(Math.log(L.view) + (Math.log(st.view) - Math.log(L.view)) * 0.08);
            }
            const t = (performance.now() - L.t0) / 1000;
            ctx.fillStyle = "#03050a";
            ctx.fillRect(0, 0, w, h);
            for (const [sx, sy, sb] of stars) {
                ctx.fillStyle = `rgba(255,255,255,${0.15 + sb * 0.35})`;
                ctx.fillRect(sx * w, sy * h, 1, 1);
            }
            ctx.globalAlpha = L.fade;
            // the scene's centre is left of middle when the craft heads right (Earth scenes), else the middle
            const cx = L.scene === "earth" ? w * 0.34 : L.scene === "l1" ? w * 0.72 : w * 0.5;
            const cy = h * 0.5;
            const k = (Math.min(w * (L.scene === "earth" ? 0.6 : L.scene === "l1" ? 0.66 : 0.46), h * 0.46) * 1) / L.view;
            const X = (x: number) => cx + x * k;
            const Y = (y: number) => cy - y * k;
            const body = (x: number, y: number, r: number, c1: string, c2: string, label: string, key?: BodyKey) => {
                const pr = Math.max(3.5, r * k);
                // the smallest prepared size at least as big as it's drawn
                const sizes = key ? worlds[key] : undefined;
                const need = pr * 2 * (window.devicePixelRatio || 1);
                const world = sizes ? ([...sizes].reverse().find((c) => c.width >= need) ?? sizes[0]) : undefined;
                if (key === "sun") {
                    // its glow first
                    const glow = ctx.createRadialGradient(X(x), Y(y), pr * 0.9, X(x), Y(y), pr * 3.2);
                    glow.addColorStop(0, "rgba(255,200,120,0.45)");
                    glow.addColorStop(1, "rgba(255,140,40,0)");
                    ctx.fillStyle = glow;
                    ctx.beginPath();
                    ctx.arc(X(x), Y(y), pr * 3.2, 0, Math.PI * 2);
                    ctx.fill();
                }
                if (key === "earth" && pr > 6) {
                    // a thin blue glow of air round the limb
                    const air = ctx.createRadialGradient(X(x), Y(y), pr * 0.98, X(x), Y(y), pr * 1.12);
                    air.addColorStop(0, "rgba(110,170,255,0.45)");
                    air.addColorStop(1, "rgba(110,170,255,0)");
                    ctx.fillStyle = air;
                    ctx.beginPath();
                    ctx.arc(X(x), Y(y), pr * 1.12, 0, Math.PI * 2);
                    ctx.fill();
                }
                if (world) {
                    ctx.drawImage(world, X(x) - pr, Y(y) - pr, pr * 2, pr * 2);
                } else {
                    const g = ctx.createRadialGradient(X(x) - pr * 0.35, Y(y) - pr * 0.35, pr * 0.1, X(x), Y(y), pr);
                    g.addColorStop(0, c1);
                    g.addColorStop(1, c2);
                    ctx.fillStyle = g;
                    ctx.beginPath();
                    ctx.arc(X(x), Y(y), pr, 0, Math.PI * 2);
                    ctx.fill();
                }
                ctx.fillStyle = "rgba(226,232,240,0.75)";
                ctx.font = "11px ui-monospace, monospace";
                // (below-left for a big close-up body, where the craft labels won't be)
                if (pr > 90) ctx.fillText(label, X(x) - pr * 0.72 - 20, Y(y) + pr * 0.72 + 22);
                else ctx.fillText(label, X(x) + pr + 6, Y(y) - pr - 4);
            };
            const path = (pts: [number, number][], style: string, width = 1.2, dash: number[] = []) => {
                ctx.strokeStyle = style;
                ctx.lineWidth = width;
                ctx.setLineDash(dash);
                ctx.beginPath();
                pts.forEach(([x, y], i) => (i ? ctx.lineTo(X(x), Y(y)) : ctx.moveTo(X(x), Y(y))));
                ctx.stroke();
                ctx.setLineDash([]);
            };
            const craft = (x: number, y: number, label?: string, colour = "#fbbf24") => {
                ctx.fillStyle = colour;
                ctx.shadowColor = colour;
                ctx.shadowBlur = 10;
                ctx.beginPath();
                ctx.arc(X(x), Y(y), 3.5, 0, Math.PI * 2);
                ctx.fill();
                ctx.shadowBlur = 0;
                if (label) {
                    ctx.fillStyle = colour;
                    ctx.font = "10px ui-monospace, monospace";
                    ctx.fillText(label, X(x) + 8, Y(y) - 8);
                }
            };
            // low lunar orbits (under ~200 km over a 1,737 km Moon) differ by a few km, far
            // under a pixel at scale; in those close-ups heights are drawn 6 times taller
            const tall = L.scene === "moon" && st.view <= 3400 ? 6 : 1;
            // past the separation (Chandrayaan-3's deboosts and landing), Vikram flies alone
            const sepAt = L.mission.steps.findIndex((x) => x.kind === "separate");
            const afterSeparation = sepAt >= 0 && L.si > sepAt;
            // the orbits flown so far in this scene, faint; the current one bright
            const earlier = L.mission.steps.slice(0, L.si).filter((s) => s.scene === L.scene && s.orbit);
            const centreBody = L.scene === "moon" ? "moon" : L.scene === "mars" ? "mars" : "earth";
            const R = RADIUS[centreBody];
            const loop = (st.kind === "cruise" ? 12 : 3 + 4 * Math.min(1, (st.orbit?.[1] ?? 0) / 150000) ** 0.6);

            if (L.scene === "earth" || L.scene === "moon" || L.scene === "mars") {
                if (L.scene === "earth" && L.view > 150000) {
                    // the Moon's orbit, for scale, and the Moon where the transfer meets it
                    path(Array.from({ length: 181 }, (_, i) => [Math.cos((i / 180) * Math.PI * 2) * MOON_DIST, Math.sin((i / 180) * Math.PI * 2) * MOON_DIST] as [number, number]), "rgba(148,163,184,0.18)", 1, [4, 6]);
                    if (st.kind === "transfer") body(R + (st.orbit?.[1] ?? 0) + 1737, 0, 1737, "#e5e7eb", "#6b7280", "Moon", "moon");
                }
                for (const e of earlier) path(orbitPath(R + e.orbit![0] * tall, R + e.orbit![1] * tall), "rgba(94,234,212,0.16)");
                if (L.scene === "earth") body(0, 0, R, "#7dd3fc", "#1e3a8a", "Earth", "earth");
                if (L.scene === "moon") body(0, 0, R, "#f3f4f6", "#4b5563", "Moon", "moon");
                if (L.scene === "mars") body(0, 0, R, "#fdba74", "#9a3412", "Mars", "mars");
                if (st.orbit) {
                    const [p, a] = [R + st.orbit[0] * tall, R + st.orbit[1] * tall];
                    path(orbitPath(p, a), "rgba(94,234,212,0.85)", 1.6);
                    if (st.kind === "land") {
                        // from the low point, down along the orbit to the surface at 69°S (the Moon seen side-on, north up), and stopped
                        const f = Math.min(1, t / 3);
                        const land = -69.37 * (Math.PI / 180);
                        const from = Math.PI;
                        const to = Math.PI * 2 + land;
                        const ang = from + (to - from) * f;
                        const r = p + (R - p) * f * f;
                        const [x1, y1] = [Math.cos(to) * R, Math.sin(to) * R];
                        craft(Math.cos(ang) * r, Math.sin(ang) * r);
                        if (f === 1) {
                            ctx.fillStyle = "rgba(226,232,240,0.85)";
                            ctx.font = "11px ui-monospace, monospace";
                            ctx.fillText("Shiv Shakti point", X(x1) + 8, Y(y1) + 14);
                        }
                    } else if (st.kind === "transfer") {
                        // out along the half orbit toward the Moon, again and again
                        craft(...onOrbit(p, a, ((t / loop) % 1) * 0.5));
                    } else if (st.kind === "separate") {
                        // the two parting: the propulsion module goes on round the orbit, and
                        // Vikram, with Pragyan inside, drifts back from it
                        const f = (t / loop) % 1;
                        const gap = Math.min(0.06, t * 0.02);
                        craft(...onOrbit(p, a, f), "Propulsion module", "#cbd5e1");
                        craft(...onOrbit(p, a, (f - gap + 1) % 1), gap > 0.015 ? "Vikram (with Pragyan)" : undefined);
                    } else {
                        craft(...onOrbit(p, a, (t / loop) % 1), afterSeparation ? "Vikram" : undefined);
                    }
                    // after the separation, the propulsion module still circles its old orbit
                    if (afterSeparation) {
                        const sep = L.mission.steps.find((x) => x.kind === "separate")!;
                        const [pp, pa] = [R + sep.orbit![0] * tall, R + sep.orbit![1] * tall];
                        path(orbitPath(pp, pa), "rgba(203,213,225,0.25)", 1, [3, 5]);
                        craft(...onOrbit(pp, pa, ((t / 5) + 0.35) % 1), "Propulsion module", "#94a3b8");
                    }
                }
                // a scale bar
                const nice = [100, 500, 1000, 5000, 10000, 50000, 100000][[100, 500, 1000, 5000, 10000, 50000, 100000].findIndex((v) => v * k > 70)] ?? 100000;
                ctx.strokeStyle = "rgba(148,163,184,0.6)";
                ctx.fillStyle = "rgba(148,163,184,0.8)";
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(16, h - 18);
                ctx.lineTo(16 + nice * k, h - 18);
                ctx.stroke();
                ctx.font = "10px ui-monospace, monospace";
                ctx.fillText(`${nice.toLocaleString("en-US")} km`, 16, h - 24);
                if (tall > 1) {
                    ctx.fillStyle = "rgba(148,163,184,0.85)";
                    ctx.fillText(`Heights above the Moon drawn ${tall}× taller, so these low orbits show`, 16, 22);
                }
            }

            if (L.scene === "sun") {
                // Earth's and Mars's orbits, and the half orbit between them: from the
                // trans-Mars injection (1 Dec 2013) to Mars (24 Sep 2014), about 297
                // days. The craft leaves from where the Earth is, and Mars is timed to
                // arrive where the craft does; a pause at the arrival before it repeats
                const DAYS = 297;
                const LEFT = Date.UTC(2013, 11, 1);
                const rE = AU;
                const rM = 1.524 * AU;
                path(Array.from({ length: 181 }, (_, i) => [Math.cos((i / 180) * Math.PI * 2) * rE, Math.sin((i / 180) * Math.PI * 2) * rE] as [number, number]), "rgba(125,211,252,0.35)", 1);
                path(Array.from({ length: 181 }, (_, i) => [Math.cos((i / 180) * Math.PI * 2) * rM, Math.sin((i / 180) * Math.PI * 2) * rM] as [number, number]), "rgba(253,186,116,0.35)", 1);
                body(0, 0, 696000 * 20, "#fff7ed", "#f59e0b", "Sun (20× size)", "sun");
                const cycle = loop + 2.5;
                const f = Math.min(1, (t % cycle) / loop);
                const days = f * DAYS;
                // the path: flown so far solid, still to come dashed
                const half = orbitPath(rE, rM, 240).slice(0, 121).map(([x, y]) => [-x, y] as [number, number]);
                const done = Math.round(f * 120);
                path(half.slice(done), "rgba(94,234,212,0.45)", 1.4, [5, 5]);
                path(half.slice(0, done + 1), "rgba(94,234,212,0.95)", 2);
                // where it left, and where it met Mars
                const mark = (x: number, y: number, text: string, colour: string, dx: number) => {
                    ctx.fillStyle = colour;
                    ctx.beginPath();
                    ctx.arc(X(x), Y(y), 2.5, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.font = "10px ui-monospace, monospace";
                    ctx.fillText(text, X(x) + dx, Y(y) + 16);
                };
                mark(rE, 0, "Left Earth · 1 Dec 2013", "rgba(125,211,252,0.9)", -40);
                mark(-rM, 0, "Met Mars · 24 Sep 2014", "rgba(253,186,116,0.9)", -60);
                const aE = (days / 365.25) * Math.PI * 2;
                const aM = Math.PI - (DAYS / 687) * Math.PI * 2 + (days / 687) * Math.PI * 2;
                body(Math.cos(aE) * rE, Math.sin(aE) * rE, 6371 * 900, "#7dd3fc", "#1e3a8a", "Earth", "earth");
                body(Math.cos(aM) * rM, Math.sin(aM) * rM, 3390 * 900, "#fdba74", "#9a3412", "Mars", "mars");
                const [sx, sy] = onOrbit(rE, rM, f * 0.5);
                craft(-sx, sy);
                const date = new Date(LEFT + days * 86_400_000).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
                ctx.fillStyle = "rgba(226,232,240,0.9)";
                ctx.font = "12px ui-monospace, monospace";
                ctx.fillText(f < 1 ? `Day ${Math.round(days)} of ${DAYS} since the last burn · ${date}` : `Day ${DAYS} · ${date}: arrived at Mars`, 16, 22);
                ctx.fillStyle = "rgba(148,163,184,0.75)";
                ctx.font = "10px ui-monospace, monospace";
                ctx.fillText("Earth and Mars move as they did; the craft coasts, the Sun's gravity bending its path", 16, 38);
            }

            if (L.scene === "l1") {
                // the Earth at the right, L1 1.5 million km toward the Sun, off to the left
                path(Array.from({ length: 181 }, (_, i) => [Math.cos((i / 180) * Math.PI * 2) * MOON_DIST, Math.sin((i / 180) * Math.PI * 2) * MOON_DIST] as [number, number]), "rgba(148,163,184,0.2)", 1, [4, 6]);
                body(0, 0, 6371, "#7dd3fc", "#1e3a8a", "Earth", "earth");
                ctx.fillStyle = "rgba(226,232,240,0.55)";
                ctx.font = "10px ui-monospace, monospace";
                ctx.fillText("Moon's orbit", X(-MOON_DIST * 0.72), Y(MOON_DIST * 0.72) - 6);
                const lx = -L1_DIST;
                ctx.strokeStyle = "rgba(251,191,36,0.9)";
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.moveTo(X(lx) - 6, Y(0));
                ctx.lineTo(X(lx) + 6, Y(0));
                ctx.moveTo(X(lx), Y(0) - 6);
                ctx.lineTo(X(lx), Y(0) + 6);
                ctx.stroke();
                ctx.fillStyle = "rgba(251,191,36,0.9)";
                ctx.fillText("L1", X(lx) - 6, Y(0) - 12);
                ctx.fillStyle = "rgba(253,230,138,0.8)";
                ctx.fillText("← to the Sun, 150 million km", 12, 22);
                // the crossing: out from the Earth, curving a little, to L1
                const cross = Array.from({ length: 101 }, (_, i) => {
                    const u = i / 100;
                    return [lx * u, Math.sin(u * Math.PI) * 260000 * (1 - u * 0.4)] as [number, number];
                });
                const halo = Array.from({ length: 181 }, (_, i) => [lx + Math.cos((i / 180) * Math.PI * 2) * 180000, Math.sin((i / 180) * Math.PI * 2) * 300000] as [number, number]);
                if (st.kind === "cruise") {
                    path(cross, "rgba(94,234,212,0.8)", 1.6, [5, 5]);
                    const f = (t / loop) % 1;
                    craft(...cross[Math.round(f * 100)]);
                    ctx.fillStyle = "rgba(226,232,240,0.85)";
                    ctx.fillText(`Day ${Math.round(f * 109)} of the crossing`, 12, h - 16);
                } else {
                    path(cross, "rgba(94,234,212,0.2)", 1);
                    path(halo, "rgba(94,234,212,0.85)", 1.6);
                    craft(...halo[Math.round(((t / 6) % 1) * 180)]);
                    ctx.fillStyle = "rgba(148,163,184,0.7)";
                    ctx.fillText("halo orbit (schematic)", X(lx) - 60, Y(-300000) + 18);
                }
            }
            ctx.globalAlpha = 1;
        };
        raf = requestAnimationFrame(draw);
        return () => cancelAnimationFrame(raf);
    }, []);

    const pick = (i: number) => {
        setMi(i);
        setSi(0);
        setPlaying(false);
    };

    return (
        <div>
            <div className="flex flex-wrap gap-2">
                {MISSIONS.map((m, i) => (
                    <button key={m.id} type="button" onClick={() => pick(i)} className={`rounded-full border px-4 py-1.5 text-sm transition-colors ${i === mi ? "border-amber-300/60 bg-amber-300/10 text-amber-100" : "border-white/15 text-neutral-400 hover:border-white/30 hover:text-white"}`}>
                        {m.name}
                    </button>
                ))}
            </div>
            <p className="mt-4 max-w-3xl text-sm leading-relaxed text-neutral-300 md:text-base">{mission.summary}</p>

            <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_340px]">
                <div className="overflow-hidden rounded-2xl border border-white/10 bg-black">
                    <canvas ref={canvas} className="block h-[46vh] min-h-[320px] w-full md:h-[480px]" aria-label={`${mission.name}'s journey, drawn to scale`} role="img" />
                </div>
                <div className="flex flex-col rounded-2xl border border-white/10 bg-neutral-950/70 p-5">
                    <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-amber-300/90">
                        {step.date} IST · {si + 1} of {mission.steps.length}
                    </p>
                    <h3 className="font-display mt-1 text-xl font-bold">{step.title}</h3>
                    {step.orbit && step.kind !== "land" && step.kind !== "separate" && (
                        <p className="mt-1 font-mono text-xs text-teal-200/90">
                            {step.farOnly ? `far end ${step.orbit[1].toLocaleString("en-US")} km` : `${step.orbit[0].toLocaleString("en-US")} × ${step.orbit[1].toLocaleString("en-US")} km`} {step.scene === "moon" ? "above the Moon" : step.scene === "mars" ? "above Mars" : "above the Earth"}
                        </p>
                    )}
                    <p className="mt-3 flex-1 text-sm leading-relaxed text-neutral-300">{step.text}</p>
                    <div className="mt-4 flex items-center gap-2">
                        <button type="button" onClick={() => (setPlaying(false), setSi(Math.max(0, si - 1)))} disabled={si === 0} className="rounded-full border border-white/15 px-3 py-1.5 text-sm text-neutral-300 hover:border-white/30 disabled:opacity-30">
                            ←
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                if (!playing && si === mission.steps.length - 1) setSi(0);
                                setPlaying(!playing);
                            }}
                            className="flex-1 rounded-full bg-amber-300 px-4 py-1.5 text-sm font-semibold text-neutral-950 hover:bg-amber-200"
                        >
                            {playing ? "Pause" : si === mission.steps.length - 1 ? "Replay the journey" : "Play the journey"}
                        </button>
                        <button type="button" onClick={() => (setPlaying(false), setSi(Math.min(mission.steps.length - 1, si + 1)))} disabled={si === mission.steps.length - 1} className="rounded-full border border-white/15 px-3 py-1.5 text-sm text-neutral-300 hover:border-white/30 disabled:opacity-30">
                            →
                        </button>
                    </div>
                </div>
            </div>

            {/* every step, to jump to */}
            <ol className="mt-4 flex flex-wrap gap-1.5">
                {mission.steps.map((s, i) => (
                    <li key={i}>
                        <button type="button" onClick={() => (setPlaying(false), setSi(i))} title={`${s.date}: ${s.title}`} className={`rounded-md border px-2 py-1 font-mono text-[10px] uppercase tracking-[0.1em] transition-colors ${i === si ? "border-teal-300/60 bg-teal-300/10 text-teal-100" : i < si ? "border-white/10 text-neutral-400" : "border-white/5 text-neutral-600 hover:text-neutral-300"}`}>
                            {s.title}
                        </button>
                    </li>
                ))}
            </ol>
            <p className="mt-3 text-[11px] leading-snug text-neutral-500">
                Orbits drawn to scale from each mission&apos;s published figures (ISRO&apos;s updates, as compiled on Wikipedia); dates and times in IST. Each orbit&apos;s far end is turned to face the right, and loops are sped up to seconds.
            </p>
        </div>
    );
}
