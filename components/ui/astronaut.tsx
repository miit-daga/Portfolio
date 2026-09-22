"use client";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useReducedMotion } from "framer-motion";
import { kolkataNow } from "@/lib/kolkata";
import { ASTRONAUT_SVG } from "./astronaut-art";

// A little astronaut floating in the hero, on a tether.
//
//   Toss him and he drifts until the cable goes taut and hauls him back.
//   Throw him hard enough and the cable snaps: he tumbles off-screen, then
//   jetpacks home trailing exhaust, and the cable clips back on.
//   He keeps Kolkata's hours (lib/kolkata.ts): awake he waves now and then;
//   while the hero's status chip says "probably asleep" he dozes, and a click
//   startles him awake for a while.
//   His visor glint follows the cursor.
//
// One requestAnimationFrame loop drives position, bob, cable and exhaust by
// writing transforms directly, and it only runs while the hero is on screen.
// Reduced motion gets a still astronaut on a slack cable.
//
// The artwork (astronaut-art.ts) is behind a small rig: the waving arm, the
// visor glint, the nozzles and the cable attachment are all it exposes.

type Pt = { x: number; y: number };

type Rig = {
    w: number;
    h: number;
    /** Where the cable meets the backpack, in art px. */
    attach: Pt;
    /** Jetpack nozzle openings, in art px. */
    nozzles: [Pt, Pt];
};

// Drawn at half the SVG's 120 x 150 viewBox. The cable leaves the jetpack's
// top corner on the anchor's side; nozzles are the SVG's #astro-nozzle-*
const ART_SCALE = 0.5;
const RIG: Rig = {
    w: 120 * ART_SCALE,
    h: 150 * ART_SCALE,
    attach: { x: 34 * ART_SCALE, y: 62 * ART_SCALE },
    nozzles: [
        { x: 38 * ART_SCALE, y: 107 * ART_SCALE },
        { x: 82 * ART_SCALE, y: 107 * ART_SCALE },
    ],
};

// Cable: anchored off to the upper left, long enough to hang slack at rest
const ANCHOR: Pt = { x: -130, y: -90 };
const CABLE_LEN = 235;
// A release faster than this (px/s) snaps the cable
const SNAP_SPEED = 2100;
const RETURN_MS = 1700;
const EXHAUST_POOL = 28;

type Mode = "idle" | "drag" | "free" | "snapped" | "return";

export const AstronautBuddy = ({ className }: { className?: string }) => {
    const reduce = useReducedMotion();
    const rootRef = useRef<HTMLDivElement>(null);
    const bodyRef = useRef<HTMLDivElement>(null);
    const artRef = useRef<HTMLDivElement>(null);
    const cableRef = useRef<SVGPathElement>(null);
    const exhaustRef = useRef<HTMLDivElement>(null);
    const armRef = useRef<SVGElement | null>(null);
    const glintRef = useRef<SVGElement | null>(null);
    const [asleep, setAsleep] = useState(false);
    const [startled, setStartled] = useState(false);
    const sleepRef = useRef(false);
    const wakeUntil = useRef(0);

    // Kolkata's hours decide whether he sleeps; a click keeps him up a while
    useEffect(() => {
        const check = () => {
            const night = kolkataNow().mood.label === "probably asleep";
            const next = night && Date.now() > wakeUntil.current;
            sleepRef.current = next;
            setAsleep(next);
        };
        check();
        const id = setInterval(check, 15000);
        return () => clearInterval(id);
    }, []);

    useEffect(() => {
        const root = rootRef.current;
        const body = bodyRef.current;
        const cable = cableRef.current;
        const exhaustLayer = exhaustRef.current;
        if (!root || !body || !cable || !exhaustLayer) return;
        const rig = RIG;

        const pos: Pt = { x: 0, y: 0 };
        const vel: Pt = { x: 0, y: 0 };
        let angle = 0;
        let spin = 0;
        let mode: Mode = "idle";
        let tethered = true;
        let cableAlpha = 1;
        let t0 = performance.now();
        let last = t0;
        let releasedAt = 0;
        let snappedAt = 0;
        let ret: { from: Pt; start: number } | null = null;
        let drag: { dx: number; dy: number; samples: { x: number; y: number; t: number }[]; downAt: number; moved: boolean } | null = null;
        let onScreen = true;
        let raf = 0;

        // Exhaust particles: a fixed pool of dots, reused
        const puffs = Array.from({ length: EXHAUST_POOL }, () => {
            const el = document.createElement("span");
            el.className = "absolute rounded-full pointer-events-none";
            Object.assign(el.style, { left: "0", top: "0", width: "6px", height: "6px", opacity: "0" });
            exhaustLayer.appendChild(el);
            return { el, x: 0, y: 0, vx: 0, vy: 0, life: 0, max: 1, gold: false };
        });
        let puffIdx = 0;
        const puff = (x: number, y: number, vx: number, vy: number, gold = false) => {
            const p = puffs[puffIdx++ % puffs.length];
            Object.assign(p, { x, y, vx, vy, life: 0, max: 0.45 + Math.random() * 0.3, gold });
        };

        // A point on the art, rotated with the body, in root coordinates
        const onArt = (pt: Pt, bob: number): Pt => {
            const cx = rig.w / 2;
            const cy = rig.h / 2;
            const dx = pt.x - cx;
            const dy = pt.y - cy;
            const c = Math.cos(angle);
            const s = Math.sin(angle);
            return { x: pos.x + cx + dx * c - dy * s, y: pos.y + bob + cy + dx * s + dy * c };
        };

        const offScreen = () => {
            const r = body.getBoundingClientRect();
            return r.right < -40 || r.left > window.innerWidth + 40 || r.bottom < -40 || r.top > window.innerHeight + 40;
        };

        const step = (now: number) => {
            const dt = Math.min(0.05, (now - last) / 1000);
            last = now;
            const t = (now - t0) / 1000;
            const sleeping = sleepRef.current;

            if (mode === "free" || mode === "snapped") {
                pos.x += vel.x * dt;
                pos.y += vel.y * dt;
                const damp = Math.pow(0.35, dt); // near-frictionless, it is space
                vel.x *= damp;
                vel.y *= damp;
                if (mode === "free") {
                    // Cable: once taut, it hauls him back and eats the outward speed
                    const bx = pos.x + rig.attach.x - ANCHOR.x;
                    const by = pos.y + rig.attach.y - ANCHOR.y;
                    const dist = Math.hypot(bx, by);
                    if (dist > CABLE_LEN) {
                        const nx = bx / dist;
                        const ny = by / dist;
                        const out = vel.x * nx + vel.y * ny;
                        if (out > 0) {
                            vel.x -= out * nx * 1.4;
                            vel.y -= out * ny * 1.4;
                            spin += out * 0.004 * (Math.random() > 0.5 ? 1 : -1);
                        }
                        pos.x -= nx * (dist - CABLE_LEN) * 0.5;
                        pos.y -= ny * (dist - CABLE_LEN) * 0.5;
                    }
                    // A second after release he starts drifting back to his post
                    if (now - releasedAt > 900) {
                        vel.x += -pos.x * 1.6 * dt;
                        vel.y += -pos.y * 1.6 * dt;
                    }
                    if (Math.hypot(pos.x, pos.y) < 1.5 && Math.hypot(vel.x, vel.y) < 8 && Math.abs(angle) < 0.02) {
                        pos.x = pos.y = vel.x = vel.y = spin = angle = 0;
                        mode = "idle";
                    }
                } else if (offScreen() || now - snappedAt > 2200) {
                    mode = "return";
                    ret = { from: { ...pos }, start: now };
                }
                angle += spin * dt;
                spin *= Math.pow(0.5, dt);
                if (mode === "free" && now - releasedAt > 900) angle += -angle * 1.8 * dt;
            } else if (mode === "return" && ret) {
                const u = Math.min(1, (now - ret.start) / RETURN_MS);
                const e = 1 - Math.pow(1 - u, 3);
                // A curve that swings in from above, not a straight line
                const cx = ret.from.x * 0.3;
                const cy = Math.min(ret.from.y, 0) - 120;
                const px = (1 - e) * (1 - e) * ret.from.x + 2 * (1 - e) * e * cx;
                const py = (1 - e) * (1 - e) * ret.from.y + 2 * (1 - e) * e * cy;
                const mvx = (px - pos.x) / Math.max(dt, 0.001);
                const mvy = (py - pos.y) / Math.max(dt, 0.001);
                pos.x = px;
                pos.y = py;
                angle += (Math.max(-0.5, Math.min(0.5, mvx * 0.0008)) - angle) * 6 * dt;
                // Jetpack: two plumes, opposite the direction of travel
                for (const n of rig.nozzles) {
                    const p = onArt(n, 0);
                    const sp = Math.hypot(mvx, mvy) || 1;
                    puff(p.x, p.y, (-mvx / sp) * 90 + (Math.random() - 0.5) * 30, (-mvy / sp) * 90 + 40 + Math.random() * 30);
                }
                if (u >= 1) {
                    pos.x = pos.y = angle = spin = 0;
                    vel.x = vel.y = 0;
                    mode = "idle";
                    tethered = true;
                    ret = null;
                }
            }

            // Cable fades out on a snap, back in once he is home
            cableAlpha += ((tethered ? 1 : 0) - cableAlpha) * Math.min(1, dt * (tethered ? 3 : 14));

            // Idle bob: slower and lower while asleep
            const bobAmp = mode === "idle" ? (sleeping ? 3 : 8) : 0;
            const bobT = sleeping ? t * 0.55 : t;
            const bob = Math.sin((bobT * 2 * Math.PI) / 6.5) * bobAmp;
            const rest = mode === "idle" ? (sleeping ? -0.2 : Math.sin((bobT * 2 * Math.PI) / 6.5 + 1) * 0.08) : 0;
            body.style.transform = `translate(${pos.x}px, ${pos.y + bob}px) rotate(${angle + rest}rad)`;

            // Cable: slack droops, taut is straight
            const b = onArt(rig.attach, bob);
            const dist = Math.hypot(b.x - ANCHOR.x, b.y - ANCHOR.y);
            const slack = Math.max(0, CABLE_LEN - dist) / CABLE_LEN;
            const mx = (ANCHOR.x + b.x) / 2;
            const my = (ANCHOR.y + b.y) / 2 + slack * 110;
            cable.setAttribute("d", `M ${ANCHOR.x} ${ANCHOR.y} Q ${mx} ${my} ${b.x} ${b.y}`);
            cable.style.opacity = String(cableAlpha * 0.75);

            // Exhaust
            for (const p of puffs) {
                if (p.life >= p.max) {
                    if (p.el.style.opacity !== "0") p.el.style.opacity = "0";
                    continue;
                }
                p.life += dt;
                p.x += p.vx * dt;
                p.y += p.vy * dt;
                const k = 1 - p.life / p.max;
                p.el.style.opacity = String(k * 0.9);
                p.el.style.background = p.gold ? "#fde68a" : k > 0.6 ? "#fef3c7" : "#fb923c";
                p.el.style.transform = `translate(${p.x - 3}px, ${p.y - 3}px) scale(${0.5 + (1 - k) * 1.3})`;
            }

            raf = onScreen ? requestAnimationFrame(step) : 0;
        };

        const start = () => {
            if (!raf) {
                last = performance.now();
                raf = requestAnimationFrame(step);
            }
        };

        // --- Pointer: drag to toss, click to wake or wave ---
        const onDown = (e: PointerEvent) => {
            if (mode === "return" || mode === "snapped") return;
            e.preventDefault();
            body.setPointerCapture(e.pointerId);
            const r = root.getBoundingClientRect();
            drag = { dx: e.clientX - r.left - pos.x, dy: e.clientY - r.top - pos.y, samples: [], downAt: performance.now(), moved: false };
            mode = "drag";
            vel.x = vel.y = 0;
        };
        const onMove = (e: PointerEvent) => {
            if (!drag) return;
            const r = root.getBoundingClientRect();
            const nx = e.clientX - r.left - drag.dx;
            const ny = e.clientY - r.top - drag.dy;
            if (Math.hypot(nx - pos.x, ny - pos.y) > 3) drag.moved = true;
            pos.x = nx;
            pos.y = ny;
            const tnow = performance.now();
            drag.samples.push({ x: nx, y: ny, t: tnow });
            drag.samples = drag.samples.filter((s) => tnow - s.t < 90);
        };
        const onUp = () => {
            if (!drag) return;
            const d = drag;
            drag = null;
            const now = performance.now();
            if (!d.moved && now - d.downAt < 400) {
                mode = "free";
                releasedAt = now - 900;
                onClickBody();
                return;
            }
            const s = d.samples;
            if (s.length >= 2) {
                const a = s[0];
                const z = s[s.length - 1];
                const dtS = Math.max(0.016, (z.t - a.t) / 1000);
                vel.x = (z.x - a.x) / dtS;
                vel.y = (z.y - a.y) / dtS;
            }
            spin = vel.x * 0.006;
            releasedAt = now;
            const speed = Math.hypot(vel.x, vel.y);
            if (speed > SNAP_SPEED && tethered) {
                // The cable gives: a spark where it parted, then he is loose
                tethered = false;
                mode = "snapped";
                snappedAt = now;
                const b = onArt(rig.attach, 0);
                for (let i = 0; i < 8; i++) {
                    const a = (i / 8) * Math.PI * 2;
                    puff(b.x, b.y, Math.cos(a) * 160, Math.sin(a) * 160, true);
                }
            } else {
                mode = "free";
            }
        };

        const onClickBody = () => {
            if (sleepRef.current) {
                wakeUntil.current = Date.now() + 25000;
                sleepRef.current = false;
                setAsleep(false);
                setStartled(true);
                setTimeout(() => setStartled(false), 1400);
                body.animate(
                    [{ translate: "0 0" }, { translate: "0 -10px" }, { translate: "-3px -4px" }, { translate: "3px -6px" }, { translate: "0 0" }],
                    { duration: 500, easing: "ease-out" },
                );
                setTimeout(() => wave(), 700);
            } else {
                wave();
            }
        };

        // Wave: the right arm swings up and back a few times
        const wave = () => {
            const arm = armRef.current;
            if (!arm || sleepRef.current) return;
            // The arm is drawn already raised; the wave swings it about the
            // shoulder (set as its transform origin in SvgArt)
            arm.animate(
                [
                    { transform: "rotate(0deg)" },
                    { transform: "rotate(-22deg)" },
                    { transform: "rotate(14deg)" },
                    { transform: "rotate(-22deg)" },
                    { transform: "rotate(14deg)" },
                    { transform: "rotate(0deg)" },
                ],
                { duration: 1500, easing: "ease-in-out" },
            );
        };

        // Awake, he waves every so often
        let waveTimer: ReturnType<typeof setTimeout>;
        const scheduleWave = () => {
            waveTimer = setTimeout(() => {
                if (mode === "idle" && onScreen) wave();
                scheduleWave();
            }, 11000 + Math.random() * 9000);
        };

        // Visor glint leans toward the cursor
        const onPointer = (e: PointerEvent) => {
            const g = glintRef.current;
            if (!g || !onScreen) return;
            const r = body.getBoundingClientRect();
            const dx = e.clientX - (r.left + r.width / 2);
            const dy = e.clientY - (r.top + r.height * 0.25);
            const d = Math.hypot(dx, dy) || 1;
            // In viewBox units: the visor is 36 wide, the glint 8
            g.setAttribute("transform", `translate(${(dx / d) * 8} ${(dy / d) * 6})`);
        };

        const io = new IntersectionObserver(([entry]) => {
            onScreen = entry.isIntersecting;
            if (onScreen) start();
        });
        io.observe(root);

        if (reduce) {
            // Still: draw the slack cable once and stop
            step(performance.now());
            cancelAnimationFrame(raf);
            raf = 0;
            io.disconnect();
            return () => puffs.forEach((p) => p.el.remove());
        }

        body.addEventListener("pointerdown", onDown);
        window.addEventListener("pointermove", onMove);
        window.addEventListener("pointerup", onUp);
        window.addEventListener("pointermove", onPointer, { passive: true });
        scheduleWave();
        start();

        return () => {
            cancelAnimationFrame(raf);
            clearTimeout(waveTimer);
            io.disconnect();
            body.removeEventListener("pointerdown", onDown);
            window.removeEventListener("pointermove", onMove);
            window.removeEventListener("pointerup", onUp);
            window.removeEventListener("pointermove", onPointer);
            puffs.forEach((p) => p.el.remove());
        };
    }, [reduce]);

    return (
        <div ref={rootRef} className={`pointer-events-none absolute z-[55] ${className ?? ""}`} style={{ width: RIG.w, height: RIG.h }}>
            {/* Cable, drawn behind him in the same coordinates */}
            <svg aria-hidden className="pointer-events-none absolute left-0 top-0 overflow-visible" width="1" height="1">
                <path ref={cableRef} fill="none" stroke="#cbd5e1" strokeWidth="1.4" strokeLinecap="round" strokeDasharray="1 0" />
            </svg>
            <div ref={exhaustRef} aria-hidden className="pointer-events-none absolute left-0 top-0" />

            <div
                ref={bodyRef}
                role="img"
                aria-label={asleep ? "A sleeping astronaut on a tether. Click to wake him." : "A floating astronaut on a tether. Drag to toss him; throw hard to snap the cable."}
                className="pointer-events-auto absolute left-0 top-0 cursor-grab touch-none select-none active:cursor-grabbing"
                style={{ width: RIG.w, height: RIG.h, transformOrigin: "50% 50%" }}
            >
                <div ref={artRef} className="relative h-full w-full" style={{ filter: "drop-shadow(0 0 8px rgba(251,191,36,0.16))" }}>
                    <SvgArt armRef={armRef} glintRef={glintRef} asleep={asleep} />
                </div>

                {/* Sleep: a slow drift of z's */}
                {asleep && !reduce && (
                    <div aria-hidden className="pointer-events-none absolute -right-3 -top-4">
                        {[0, 1, 2].map((i) => (
                            <span
                                key={i}
                                className="absolute font-mono font-bold text-indigo-200/80"
                                style={{ fontSize: 9 + i * 3, animation: `astro-z 3.6s ease-out ${i * 1.2}s infinite` } as CSSProperties}
                            >
                                z
                            </span>
                        ))}
                    </div>
                )}
                {startled && (
                    <span aria-hidden className="pointer-events-none absolute -right-2 -top-5 font-mono text-base font-bold text-amber-300">
                        !
                    </span>
                )}
            </div>
        </div>
    );
};

// The SVG artwork, with its rig parts handed back to the behaviour above
const SvgArt = ({
    armRef,
    glintRef,
    asleep,
}: {
    armRef: React.MutableRefObject<SVGElement | null>;
    glintRef: React.MutableRefObject<SVGElement | null>;
    asleep: boolean;
}) => {
    const hostRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const host = hostRef.current;
        if (!host) return;
        const arm = host.querySelector<SVGElement>("#astro-arm-wave");
        if (arm) {
            arm.style.transformBox = "view-box";
            arm.style.transformOrigin = "86px 74px";
        }
        armRef.current = arm;
        const glint = host.querySelector<SVGElement>("#astro-glint");
        if (glint) glint.style.transition = "transform 0.3s ease-out, opacity 0.6s";
        glintRef.current = glint;
    }, [armRef, glintRef]);

    // Asleep: chest lights off, visor glint dimmed
    useEffect(() => {
        const host = hostRef.current;
        if (!host) return;
        host.querySelectorAll<SVGCircleElement>('circle[r="2.2"]').forEach((c) => {
            if (!c.dataset.on) c.dataset.on = c.getAttribute("fill") ?? "";
            c.setAttribute("fill", asleep ? "#475569" : c.dataset.on);
        });
        const glint = host.querySelector<SVGElement>("#astro-glint");
        if (glint) glint.style.opacity = asleep ? "0.25" : "1";
    }, [asleep]);

    // Our own static file, never user input
    return <div ref={hostRef} className="h-full w-full" dangerouslySetInnerHTML={{ __html: ASTRONAUT_SVG }} />;
};
