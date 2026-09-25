"use client";
import { useEffect, useRef, useState } from "react";
import { placeOf, startPresence, usePresence } from "@/lib/presence";

// Other explorers aboard right now (lib/presence.ts). <Presence /> runs the
// check-ins for the page and, now and then, notes an arrival; <ExplorersLine />
// is the footer's line; the flight path draws their ships (flight-path.tsx).

const NOTE_GAP = 3 * 60_000;

/** The check-ins, and a quiet note when someone comes aboard (at most every few minutes). */
export function Presence() {
    const { arrived } = usePresence();
    const [note, setNote] = useState<{ place: string; at: number } | null>(null);
    const lastNote = useRef(0);
    useEffect(() => startPresence(), []);
    useEffect(() => {
        if (!arrived || arrived.at - lastNote.current < NOTE_GAP) return;
        setNote(arrived);
        lastNote.current = arrived.at;
        const id = window.setTimeout(() => setNote(null), 5000);
        return () => window.clearTimeout(id);
    }, [arrived]);
    if (!note) return null;
    return (
        <div key={note.at} role="status" className="pointer-events-none fixed left-1/2 top-20 z-[5000] -translate-x-1/2 animate-in fade-in slide-in-from-bottom-2 duration-500 sm:bottom-28 sm:top-auto">
            <p className="whitespace-nowrap rounded-full border border-violet-300/25 bg-black/70 px-4 py-1.5 font-mono text-[11px] uppercase tracking-[0.15em] text-violet-100 backdrop-blur-md">
                <span aria-hidden className="mr-2 inline-block h-1.5 w-1.5 rounded-full bg-violet-300 align-middle shadow-[0_0_6px_rgba(196,181,253,0.9)]" />
                Someone in {note.place} just came aboard
            </p>
        </div>
    );
}

/** "3 other explorers aboard now · Berlin, Tokyo…", or nothing when it's just you. */
export function ExplorersLine() {
    const { explorers } = usePresence();
    if (!explorers.length) return null;
    const places = [...new Set(explorers.map(placeOf))];
    const shown = places.slice(0, 3).join(", ") + (places.length > 3 ? ` and ${places.length - 3} more` : "");
    return (
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-neutral-500">
            <span aria-hidden className="mr-2 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-violet-300 align-middle" />
            {explorers.length === 1 ? "1 other explorer" : `${explorers.length} other explorers`} aboard now · {shown}
        </p>
    );
}
