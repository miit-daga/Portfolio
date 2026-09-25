"use client";
import { useEffect, useState } from "react";
import { musicOn, onMusicChange, setMusicOn } from "./music";

// The arcade header's switch for the background music (music.ts)
export function MusicButton({ className }: { className?: string }) {
    const [on, setOn] = useState(true);
    useEffect(() => {
        setOn(musicOn());
        return onMusicChange(setOn);
    }, []);
    return (
        <button
            type="button"
            onClick={() => setMusicOn(!musicOn())}
            aria-pressed={on}
            aria-label={on ? "Turn the music off" : "Turn the music on"}
            title={on ? "Music on" : "Music off"}
            className={className}
        >
            <svg aria-hidden viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 12.2V3.4l7-1.6v8.6" />
                <circle cx="4.3" cy="12.3" r="1.8" fill="currentColor" stroke="none" />
                <circle cx="11.3" cy="10.6" r="1.8" fill="currentColor" stroke="none" />
                {!on && <path d="M2 2l12 12" />}
            </svg>
            <span className={`hidden sm:inline ${on ? "" : "text-neutral-500"}`}>{on ? "Music" : "Music off"}</span>
        </button>
    );
}
