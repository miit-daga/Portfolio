"use client";
import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { useMotionValue, useReducedMotion, useSpring } from "framer-motion";

// Depth parallax for the hero hologram: the photo turns toward the cursor, and
// further while dragged, springing back on release.
//
// No canvas. A live accelerated canvas anywhere in the hero strips the
// gradient orbs' mix-blend-mode (see hero-nebula.tsx), so this is an SVG
// filter on the photo instead: each pixel is displaced by its depth times the
// pointer offset, which is the same maths a WebGL depth-parallax shader does.
// The map (public/hero-portrait-dmap.png) packs depth into red (x) and green
// (y) around a neutral 0.5, with blue held at 0.5 so each pass moves one axis.
// It was built from a Depth Anything V2 map of the portrait: the head carries
// most of the range so the face leads the turn, the torso is flattened behind
// it, and depth is carried a little past the outline so edges do not ghost.
//
// Desktop Chromium and Firefox with a fine pointer only. Phones, Safari (whose
// SVG filters on HTML are slow) and reduced motion keep the still photo. Idle,
// the displacement sits at zero and nothing repaints.

const MAP_URL = "/hero-portrait-dmap.png";
// Displacement scale at full turn. Offset = scale * (depth - 0.5); the face
// sits near 0.78 and the ears near 0.4, so a full turn moves the face ~8px and
// the ears ~3px the other way. Much past this and the cheek-to-ear step tears
const MAX_SCALE = 30;
// How far the idle cursor-follow may turn, as a share of a full drag
const FOLLOW_SHARE = 0.5;
// Pointer travel for a full turn while dragging, in px
const DRAG_RANGE = 200;
const DRAG_THRESHOLD = 6;

const clamp = (v: number) => Math.max(-1, Math.min(1, v));

export function useHoloDepth(holoRef: RefObject<HTMLElement | null>) {
    const reduce = useReducedMotion();
    const [enabled, setEnabled] = useState(false);
    const [size, setSize] = useState({ w: 0, h: 0 });
    const figureRef = useRef<HTMLDivElement>(null);
    const dxRef = useRef<SVGFEDisplacementMapElement>(null);
    const dyRef = useRef<SVGFEDisplacementMapElement>(null);
    const draggedRef = useRef(false);

    const follow = useRef({ x: 0, y: 0 });
    const drag = useRef({ x: 0, y: 0 });
    const tx = useMotionValue(0);
    const ty = useMotionValue(0);
    const sx = useSpring(tx, { stiffness: 90, damping: 16 });
    const sy = useSpring(ty, { stiffness: 90, damping: 16 });

    // Capability gate, then wait for the map: before it loads, feImage is
    // transparent and every pixel would shift by the same amount
    useEffect(() => {
        if (reduce) return;
        const mq = window.matchMedia("(pointer: fine) and (min-width: 1024px)");
        const ua = navigator.userAgent;
        const isSafari = /Safari/.test(ua) && !/Chrome|Chromium|Edg|Firefox/.test(ua);
        if (!mq.matches || isSafari) return;
        let alive = true;
        const img = new window.Image();
        img.onload = () => alive && setEnabled(true);
        img.src = MAP_URL;
        return () => {
            alive = false;
        };
    }, [reduce]);

    // The filter works in the photo's own pixel space, so track its size
    useEffect(() => {
        if (!enabled || !figureRef.current) return;
        const el = figureRef.current;
        const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }));
        ro.observe(el);
        return () => ro.disconnect();
    }, [enabled]);

    // Springs to filter attributes, outside React
    useEffect(() => {
        if (!enabled) return;
        const apply = () => {
            dxRef.current?.setAttribute("scale", String(-sx.get() * MAX_SCALE));
            dyRef.current?.setAttribute("scale", String(-sy.get() * MAX_SCALE));
        };
        const a = sx.on("change", apply);
        const b = sy.on("change", apply);
        apply();
        return () => {
            a();
            b();
        };
    }, [enabled, sx, sy]);

    const retarget = useCallback(() => {
        tx.set(clamp(follow.current.x + drag.current.x));
        ty.set(clamp(follow.current.y + drag.current.y));
    }, [tx, ty]);

    // Cursor follow and drag, only while the hologram is on screen
    useEffect(() => {
        const holo = holoRef.current;
        if (!enabled || !holo) return;
        let onScreen = true;
        let start: { x: number; y: number } | null = null;

        const onMove = (e: PointerEvent) => {
            if (!onScreen) return;
            const r = holo.getBoundingClientRect();
            const cx = r.left + r.width / 2;
            const cy = r.top + r.height / 2;
            // Normalised by the room on that side, so reaching either edge of
            // the window is a full follow: the hologram sits off-centre, and a
            // single divisor made turns toward the near edge half as strong
            const ex = e.clientX - cx;
            const ey = e.clientY - cy;
            follow.current = {
                x: clamp(ex / Math.max(1, ex < 0 ? cx : window.innerWidth - cx)) * FOLLOW_SHARE,
                y: clamp(ey / Math.max(1, ey < 0 ? cy : window.innerHeight - cy)) * FOLLOW_SHARE,
            };
            if (start) {
                const dx = e.clientX - start.x;
                const dy = e.clientY - start.y;
                if (Math.hypot(dx, dy) > DRAG_THRESHOLD) draggedRef.current = true;
                drag.current = { x: dx / DRAG_RANGE, y: dy / DRAG_RANGE };
            }
            retarget();
        };
        const onDown = (e: PointerEvent) => {
            if (e.button !== 0) return;
            start = { x: e.clientX, y: e.clientY };
            draggedRef.current = false;
        };
        const onUp = () => {
            if (!start) return;
            start = null;
            drag.current = { x: 0, y: 0 };
            retarget();
        };
        const onLeave = () => {
            follow.current = { x: 0, y: 0 };
            if (!start) retarget();
        };

        const io = new IntersectionObserver(([entry]) => {
            onScreen = entry.isIntersecting;
            if (!onScreen) {
                follow.current = { x: 0, y: 0 };
                drag.current = { x: 0, y: 0 };
                retarget();
            }
        });
        io.observe(holo);
        holo.addEventListener("pointerdown", onDown);
        window.addEventListener("pointermove", onMove, { passive: true });
        window.addEventListener("pointerup", onUp);
        document.documentElement.addEventListener("pointerleave", onLeave);
        return () => {
            io.disconnect();
            holo.removeEventListener("pointerdown", onDown);
            window.removeEventListener("pointermove", onMove);
            window.removeEventListener("pointerup", onUp);
            document.documentElement.removeEventListener("pointerleave", onLeave);
        };
    }, [enabled, holoRef, retarget]);

    /** True once per click that ended a drag, so the drag does not also count as a click. */
    const consumeDrag = useCallback(() => {
        const was = draggedRef.current;
        draggedRef.current = false;
        return was;
    }, []);

    const ready = enabled && size.w > 0;

    const filterSvg = enabled ? (
        <svg aria-hidden width="0" height="0" style={{ position: "absolute", pointerEvents: "none" }}>
            <defs>
                <filter
                    id="holo-depth"
                    filterUnits="userSpaceOnUse"
                    primitiveUnits="userSpaceOnUse"
                    x="0"
                    y="0"
                    width={size.w}
                    height={size.h}
                    // sRGB, or the map's 0.5 neutral would be linearised off-centre
                    colorInterpolationFilters="sRGB"
                >
                    <feImage href={MAP_URL} x="0" y="0" width={size.w} height={size.h} preserveAspectRatio="none" result="map" />
                    <feDisplacementMap ref={dxRef} in="SourceGraphic" in2="map" scale="0" xChannelSelector="R" yChannelSelector="B" result="shiftX" />
                    <feDisplacementMap ref={dyRef} in="shiftX" in2="map" scale="0" xChannelSelector="B" yChannelSelector="G" />
                </filter>
            </defs>
        </svg>
    ) : null;

    return {
        figureRef,
        figureStyle: ready ? { filter: "url(#holo-depth)" } : undefined,
        filterSvg,
        consumeDrag,
        interactive: enabled,
    };
}
