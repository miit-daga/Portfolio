"use client";
import { useSyncExternalStore } from "react";
import { SECTIONS } from "@/constants/sections";
import type { Explorer } from "@/app/api/presence/route";

// Who else is aboard (app/api/presence), for the flight path's other ships,
// the footer's line and the arrival note (components/ui/explorers.tsx). One
// check-in loop for the whole page: every 20 seconds while the tab is in
// view, soon after the visitor moves to another section, and a goodbye when
// the tab is hidden or closed. The id is random and lasts only this tab.

const EVERY = 20_000;
type State = { explorers: Explorer[]; arrived: { place: string; at: number } | null };
let state: State = { explorers: [], arrived: null };
const subs = new Set<() => void>();
const emit = (s: State) => {
    state = s;
    subs.forEach((f) => f());
};

let started = false;
let id = "";
let section = "hero";
let first = true;

/** Where someone is, in words: their city, else their country, else just Earth. */
export function placeOf(e: Explorer) {
    if (e.city) return e.city;
    if (e.country) {
        try {
            return new Intl.DisplayNames(["en"], { type: "region" }).of(e.country) ?? e.country;
        } catch {
            return e.country;
        }
    }
    return "somewhere on Earth";
}

/** The section in view: the last whose top is above the upper part of the screen. */
function sectionNow() {
    let now = "hero";
    for (const s of SECTIONS) {
        const el = document.getElementById(s.id);
        if (el && el.getBoundingClientRect().top < window.innerHeight * 0.4) now = s.id;
    }
    return now;
}

function checkIn() {
    if (document.hidden) return;
    fetch("/api/presence", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, section }), keepalive: true })
        .then((r) => (r.ok ? (r.json() as Promise<{ explorers?: Explorer[] }>) : null))
        .then((d) => {
            if (!d) return;
            const next = d.explorers ?? [];
            // someone new: a place with more explorers than a moment ago (not on the first look)
            let arrived = state.arrived;
            if (!first) {
                const was = new Map<string, number>();
                state.explorers.forEach((e) => was.set(placeOf(e), (was.get(placeOf(e)) ?? 0) + 1));
                const now = new Map<string, number>();
                next.forEach((e) => now.set(placeOf(e), (now.get(placeOf(e)) ?? 0) + 1));
                for (const [p, n] of now) if (n > (was.get(p) ?? 0)) arrived = { place: p, at: Date.now() };
            }
            first = false;
            emit({ explorers: next, arrived });
        })
        .catch(() => {});
}

function leave() {
    const body = JSON.stringify({ id, leave: true });
    try {
        if (!navigator.sendBeacon?.("/api/presence", new Blob([body], { type: "application/json" }))) throw 0;
    } catch {
        fetch("/api/presence", { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true }).catch(() => {});
    }
}

/** Starts the check-ins (once per page); returns a stop. */
export function startPresence() {
    if (started) return () => {};
    started = true;
    try {
        id = sessionStorage.getItem("presence-id") ?? "";
        if (!/^[a-z0-9]{8,24}$/.test(id)) {
            id = Array.from(crypto.getRandomValues(new Uint8Array(8)), (b) => b.toString(36).padStart(2, "0")).join("").slice(0, 16);
            sessionStorage.setItem("presence-id", id);
        }
    } catch {
        id = Math.random().toString(36).slice(2, 14).padEnd(10, "0");
    }
    section = sectionNow();
    checkIn();
    const timer = window.setInterval(checkIn, EVERY);
    // moved to another section: tell the others soon, not at the next tick
    let soon = 0;
    const onScroll = () => {
        const s = sectionNow();
        if (s === section) return;
        section = s;
        window.clearTimeout(soon);
        soon = window.setTimeout(checkIn, 2500);
    };
    const onVisible = () => (document.hidden ? leave() : checkIn());
    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("pagehide", leave);
    return () => {
        started = false;
        window.clearInterval(timer);
        window.clearTimeout(soon);
        window.removeEventListener("scroll", onScroll);
        document.removeEventListener("visibilitychange", onVisible);
        window.removeEventListener("pagehide", leave);
        leave();
    };
}

const subscribe = (f: () => void) => {
    subs.add(f);
    return () => subs.delete(f);
};
const EMPTY: State = { explorers: [], arrived: null };
/** Everyone else aboard now, and the latest arrival. */
export const usePresence = () => useSyncExternalStore(subscribe, () => state, () => EMPTY);
