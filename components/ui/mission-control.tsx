"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { IconArrowRight, IconHeadset, IconSend2, IconX } from "@tabler/icons-react";
import { scrollToSection } from "@/lib/scroll-to-section";
import { trackEvent } from "@/lib/track";

// Mission Control: ask anything about Miit, and get an answer from the site's
// own content (app/api/mission-control), with buttons that fly you to the
// sections it came from. A small round button above the back-to-top rocket
// opens it (on a big screen only once past the hero, whose corner has its own
// "Ask Mission Control"), as do the hero's button and the command menu's (the
// "mission-control" window event, optionally with a question to ask).
// The conversation lasts the visit (sessionStorage), and only the last two
// exchanges go with each question, so follow-ups make sense.

type Place = { id: string; label: string; href: string };
type Msg = { role: "you" | "mc"; text: string; sections?: Place[]; via?: string; error?: boolean };

const LOG_KEY = "mission-control-log";
const SEEN_KEY = "mission-control-seen";
const SUGGESTIONS = ["What's Miit's backend experience?", "Tell me about the research", "Which projects should I look at?", "How can I reach Miit?"];

export function MissionControl() {
    const [open, setOpen] = useState(false);
    const [log, setLog] = useState<Msg[]>([]);
    const [draft, setDraft] = useState("");
    const [busy, setBusy] = useState(false);
    const [seen, setSeen] = useState(true);
    // on a big screen the hero has its own "Ask Mission Control" (Hero.tsx), and
    // this button would sit on its desk: it waits until past the hero
    const [past, setPast] = useState(true);
    useEffect(() => {
        const big = window.matchMedia("(min-width: 1024px)");
        const on = () => setPast(!big.matches || window.scrollY > window.innerHeight * 0.7);
        on();
        window.addEventListener("scroll", on, { passive: true });
        big.addEventListener("change", on);
        return () => {
            window.removeEventListener("scroll", on);
            big.removeEventListener("change", on);
        };
    }, []);
    const input = useRef<HTMLInputElement>(null);
    const scroller = useRef<HTMLDivElement>(null);
    const logRef = useRef<Msg[]>([]);
    logRef.current = log;

    // the visit's conversation so far, and whether the button has been tried
    useEffect(() => {
        try {
            const saved = JSON.parse(sessionStorage.getItem(LOG_KEY) ?? "[]") as Msg[];
            if (Array.isArray(saved)) setLog(saved.slice(-20));
        } catch {
            /* ignore */
        }
        try {
            setSeen(!!localStorage.getItem(SEEN_KEY));
        } catch {
            /* ignore */
        }
    }, []);
    useEffect(() => {
        try {
            sessionStorage.setItem(LOG_KEY, JSON.stringify(log.slice(-20)));
        } catch {
            /* ignore */
        }
        scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
    }, [log, busy]);

    const send = useCallback(async (text: string) => {
        const question = text.trim().slice(0, 300);
        if (!question || busy) return;
        setDraft("");
        // the last two exchanges, so a follow-up has its context
        const pairs: { q: string; a: string }[] = [];
        const past = logRef.current.filter((m) => !m.error);
        for (let i = 0; i + 1 < past.length; i++) if (past[i].role === "you" && past[i + 1].role === "mc") pairs.push({ q: past[i].text, a: past[i + 1].text });
        setLog((l) => [...l, { role: "you", text: question }]);
        setBusy(true);
        trackEvent("mission_control_ask");
        try {
            const r = await fetch("/api/mission-control", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question, history: pairs.slice(-2) }) });
            const d = (await r.json().catch(() => ({}))) as { answer?: string; sections?: Place[]; via?: string; error?: string };
            if (!r.ok || !d.answer) setLog((l) => [...l, { role: "mc", text: d.error ?? "Mission Control lost the signal. Try again in a moment.", error: true }]);
            else setLog((l) => [...l, { role: "mc", text: d.answer!, sections: d.sections, via: d.via }]);
        } catch {
            setLog((l) => [...l, { role: "mc", text: "Mission Control lost the signal. Check your connection and try again.", error: true }]);
        } finally {
            setBusy(false);
        }
    }, [busy]);

    const show = useCallback(() => {
        setOpen(true);
        setSeen(true);
        try {
            localStorage.setItem(SEEN_KEY, "1");
        } catch {
            /* ignore */
        }
    }, []);

    // opened from the command menu, perhaps with a question
    useEffect(() => {
        const on = (e: Event) => {
            show();
            const q = (e as CustomEvent<{ question?: string }>).detail?.question;
            if (q) send(q);
        };
        window.addEventListener("mission-control", on);
        return () => window.removeEventListener("mission-control", on);
    }, [show, send]);

    useEffect(() => {
        if (!open) return;
        const id = window.setTimeout(() => input.current?.focus(), 60);
        const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
        window.addEventListener("keydown", onKey);
        return () => {
            window.clearTimeout(id);
            window.removeEventListener("keydown", onKey);
        };
    }, [open]);

    const fly = (p: Place) => {
        trackEvent("mission_control_fly", { to: p.id });
        if (p.href.startsWith("#")) {
            // (on a phone the panel covers the page: out of the way first)
            if (window.innerWidth < 640) setOpen(false);
            scrollToSection(p.href);
        } else window.location.href = p.href;
    };

    return (
        <>
            {/* the button, just above the back-to-top rocket */}
            {(past || open) && (
                <button
                    type="button"
                    onClick={() => (open ? setOpen(false) : show())}
                    aria-label={open ? "Close Mission Control" : "Ask Mission Control about Miit"}
                    aria-expanded={open}
                    className="group fixed bottom-24 right-4 z-[5000] flex [[data-mobile-notice]_&]:hidden h-12 w-12 items-center justify-center rounded-full border border-sky-300/30 bg-black/60 text-sky-100 shadow-[0_0_18px_rgba(56,189,248,0.25)] backdrop-blur-md transition-colors hover:border-sky-300/60 hover:bg-black/80 sm:bottom-28 sm:right-9"
                >
                    {open ? <IconX className="h-5 w-5" /> : <IconHeadset className="h-5 w-5" />}
                    {!seen && !open && <span aria-hidden className="absolute right-0.5 top-0.5 h-2.5 w-2.5 animate-pulse rounded-full bg-amber-300 shadow-[0_0_8px_rgba(252,211,77,0.9)]" />}
                    {!open && (
                        <span className="pointer-events-none absolute right-full top-1/2 mr-3 hidden -translate-y-1/2 whitespace-nowrap rounded-md border border-white/10 bg-black/80 px-2 py-1 text-xs text-neutral-200 opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100 sm:block">
                            Ask Mission Control
                        </span>
                    )}
                </button>
            )}

            {open && (
                <div
                    role="dialog"
                    aria-label="Mission Control"
                    className="fixed inset-x-3 bottom-3 z-[6500] flex max-h-[78vh] flex-col overflow-hidden rounded-2xl border border-sky-300/25 bg-[#060a14]/95 shadow-[0_0_40px_rgba(56,189,248,0.18)] backdrop-blur-xl animate-in fade-in slide-in-from-bottom-3 duration-200 sm:inset-x-auto sm:bottom-44 sm:right-9 sm:w-[390px] sm:max-h-[min(560px,70vh)]"
                >
                    {/* heading */}
                    <div className="flex items-center justify-between border-b border-white/[0.07] px-4 py-3">
                        <div>
                            <p className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.3em] text-sky-300/90">
                                <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${busy ? "animate-pulse bg-amber-300" : "bg-emerald-400"}`} />
                                Mission Control
                            </p>
                            <p className="mt-0.5 text-sm text-neutral-200">Ask anything about Miit</p>
                        </div>
                        <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="rounded-full p-1.5 text-neutral-400 hover:bg-white/5 hover:text-white">
                            <IconX className="h-4 w-4" />
                        </button>
                    </div>

                    {/* the conversation */}
                    <div ref={scroller} aria-live="polite" className="flex-1 space-y-3 overflow-y-auto overscroll-contain px-4 py-4">
                        <div className="max-w-[92%] rounded-2xl rounded-tl-sm border border-white/[0.07] bg-white/[0.03] px-3.5 py-2.5 text-sm leading-relaxed text-neutral-200">
                            Mission Control here. Ask me about Miit&apos;s work, projects, research or how to reach him, and I&apos;ll answer from what&apos;s on this site.
                        </div>
                        {!log.length && (
                            <div className="flex flex-wrap gap-2 pt-1">
                                {SUGGESTIONS.map((s) => (
                                    <button key={s} type="button" onClick={() => send(s)} className="rounded-full border border-sky-300/25 bg-sky-300/[0.04] px-3 py-1.5 text-left text-xs text-sky-100 transition-colors hover:border-sky-300/50 hover:bg-sky-300/10">
                                        {s}
                                    </button>
                                ))}
                            </div>
                        )}
                        {log.map((m, i) =>
                            m.role === "you" ? (
                                <div key={i} className="ml-auto max-w-[85%] rounded-2xl rounded-tr-sm bg-sky-400/15 px-3.5 py-2 text-sm text-sky-50">
                                    {m.text}
                                </div>
                            ) : (
                                <div key={i} className="max-w-[92%]">
                                    <div className={`whitespace-pre-line rounded-2xl rounded-tl-sm border px-3.5 py-2.5 text-sm leading-relaxed ${m.error ? "border-amber-300/25 bg-amber-300/[0.05] text-amber-100" : "border-white/[0.07] bg-white/[0.03] text-neutral-200"}`}>{m.text}</div>
                                    {!!m.sections?.length && (
                                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                                            {m.sections.map((p) => (
                                                <button key={p.id} type="button" onClick={() => fly(p)} className="flex items-center gap-1 rounded-full border border-white/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.15em] text-neutral-300 transition-colors hover:border-sky-300/50 hover:text-sky-100">
                                                    Fly to {p.label} <IconArrowRight className="h-3 w-3" />
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                    {m.via && <p className="mt-1 pl-1 font-mono text-[9px] uppercase tracking-[0.15em] text-neutral-600">via {m.via}</p>}
                                </div>
                            ),
                        )}
                        {busy && (
                            <div className="flex w-fit items-center gap-1.5 rounded-2xl rounded-tl-sm border border-white/[0.07] bg-white/[0.03] px-3.5 py-2.5 font-mono text-[11px] uppercase tracking-[0.2em] text-neutral-400">
                                Transmitting
                                <span className="flex gap-0.5">
                                    {[0, 1, 2].map((d) => (
                                        <span key={d} className="h-1 w-1 animate-bounce rounded-full bg-sky-300" style={{ animationDelay: `${d * 0.15}s` }} />
                                    ))}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* the question */}
                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            send(draft);
                        }}
                        className="flex items-center gap-2 border-t border-white/[0.07] px-3 py-3"
                    >
                        <input
                            ref={input}
                            value={draft}
                            onChange={(e) => setDraft(e.target.value)}
                            maxLength={300}
                            placeholder={busy ? "Waiting for the answer…" : "Ask a question…"}
                            aria-label="Your question"
                            className="min-w-0 flex-1 rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-white placeholder:text-neutral-500 focus:border-sky-300/50 focus:outline-none"
                        />
                        <button type="submit" disabled={busy || !draft.trim()} aria-label="Send" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sky-400 text-neutral-950 transition-opacity hover:bg-sky-300 disabled:opacity-40">
                            <IconSend2 className="h-4 w-4" />
                        </button>
                    </form>
                    <p className="px-4 pb-2.5 text-center font-mono text-[9px] uppercase tracking-[0.15em] text-neutral-600">Answers come from this site&apos;s content · AI can make mistakes</p>
                </div>
            )}
        </>
    );
}
