"use client";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { TRACKS, musicChoice, onMusicChange, setMusicChoice, type MusicChoice } from "./music";

// The arcade header's Music menu: pick one of the tracks (music.ts), or off.
// The menu is placed from the button's position and kept inside the screen,
// since on narrow phones the button wraps under the title, to the left. It
// renders into <body>: the header is its own stacking layer, under the game
// cards that follow it, which would otherwise cover the menu.
const MENU_W = 256;

const Note = ({ off }: { off: boolean }) => (
    <svg aria-hidden viewBox="0 0 16 16" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 12.2V3.4l7-1.6v8.6" />
        <circle cx="4.3" cy="12.3" r="1.8" fill="currentColor" stroke="none" />
        <circle cx="11.3" cy="10.6" r="1.8" fill="currentColor" stroke="none" />
        {off && <path d="M2 2l12 12" />}
    </svg>
);

export function MusicButton({ className }: { className?: string }) {
    const [choice, setChoice] = useState<MusicChoice>("drift");
    const [menu, setMenu] = useState<{ left: number; top: number } | null>(null);
    const button = useRef<HTMLButtonElement>(null);
    const panel = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setChoice(musicChoice());
        return onMusicChange(setChoice);
    }, []);

    // Close on a press outside, Escape, scrolling or resizing
    useEffect(() => {
        if (!menu) return;
        const outside = (e: PointerEvent) => {
            const t = e.target as Node;
            if (!panel.current?.contains(t) && !button.current?.contains(t)) setMenu(null);
        };
        const key = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                setMenu(null);
                button.current?.focus();
            }
        };
        const close = () => setMenu(null);
        window.addEventListener("pointerdown", outside);
        window.addEventListener("keydown", key);
        window.addEventListener("resize", close);
        window.addEventListener("scroll", close, { passive: true });
        panel.current?.querySelector<HTMLButtonElement>('[aria-checked="true"]')?.focus();
        return () => {
            window.removeEventListener("pointerdown", outside);
            window.removeEventListener("keydown", key);
            window.removeEventListener("resize", close);
            window.removeEventListener("scroll", close);
        };
    }, [menu]);

    const toggle = () => {
        if (menu) return setMenu(null);
        const r = button.current!.getBoundingClientRect();
        const left = Math.min(Math.max(16, r.right - MENU_W), window.innerWidth - MENU_W - 16);
        setMenu({ left: Math.max(16, left), top: r.bottom + 8 });
    };
    const pick = (c: MusicChoice) => {
        setMusicChoice(c);
        setMenu(null);
    };
    const current = TRACKS.find((t) => t.id === choice);
    const options: { id: MusicChoice; name: string; about?: string }[] = [...TRACKS, { id: "off", name: "Off" }];

    return (
        <>
            <button
                ref={button}
                type="button"
                onClick={toggle}
                aria-haspopup="menu"
                aria-expanded={!!menu}
                aria-label={current ? `Music: ${current.name}. Choose music` : "Music off. Choose music"}
                className={className}
            >
                <Note off={!current} />
                <span className={`hidden sm:inline ${current ? "" : "text-neutral-500"}`}>{current ? current.name : "Music off"}</span>
                <svg aria-hidden viewBox="0 0 10 6" className="hidden h-2 w-2.5 opacity-60 sm:block" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 1l4 4 4-4" />
                </svg>
            </button>
            {menu &&
                createPortal(
                <div
                    ref={panel}
                    role="menu"
                    aria-label="Music"
                    className="fixed z-[60] rounded-2xl border border-white/10 bg-neutral-950/95 p-1.5 shadow-2xl shadow-black/60 backdrop-blur"
                    style={{ left: menu.left, top: menu.top, width: MENU_W }}
                >
                    <p className="px-3 pb-1 pt-2 font-mono text-[10px] uppercase tracking-[0.25em] text-neutral-500">Music</p>
                    {options.map((o) => {
                        const on = choice === o.id;
                        return (
                            <div key={o.id}>
                            {o.id === "off" && <div aria-hidden className="mx-3 my-1 h-px bg-white/10" />}
                            <button
                                type="button"
                                role="menuitemradio"
                                aria-checked={on}
                                onClick={() => pick(o.id)}
                                className={`flex w-full items-start gap-3 rounded-xl px-3 py-2 text-left transition-colors hover:bg-white/[0.06] focus-visible:bg-white/[0.08] focus-visible:outline-none`}
                            >
                                <span
                                    aria-hidden
                                    className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${on ? "bg-white shadow-[0_0_8px_rgba(255,255,255,0.7)]" : "border border-white/30"}`}
                                />
                                <span>
                                    <span className={`block text-sm ${on ? "text-white" : "text-neutral-200"}`}>{o.name}</span>
                                    {o.about && <span className="block text-xs text-neutral-500">{o.about}</span>}
                                </span>
                            </button>
                            </div>
                        );
                    })}
                </div>,
                document.body,
            )}
        </>
    );
}
