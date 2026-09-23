"use client";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import type { Phosphor } from "./pdf-screen";
import { playPostBeep } from "./crt-sound";

// The resume computer's operating system: MIIT-DOS (retro-computer.tsx).
//   DosBoot    power-on self test, memory count, drives, then C:\> RESUME.EXE
//   FKeyBar    the function-key bar along the bottom, as in old DOS programs;
//              click the keys or press them
//   HelpBox    F1's box of keys
//   DosPrompt  what F10 quits to: a small C:\> with a handful of commands,
//              and "terminal" for the site's full terminal

// The screen's text colours, per phosphor. On paper it is the classic DOS
// grey on black with a blue bar; on green or amber, a monochrome tube, the
// bar is the same colour in reverse
export function dosColours(p: Phosphor) {
    if (p === "green") return { text: "#4ade80", dim: "rgba(74,222,128,0.55)", bg: "#030a05", bar: "#4ade80", barText: "#031a0b", key: "#031a0b", glow: "0 0 6px rgba(74,222,128,0.55)" };
    if (p === "amber") return { text: "#fbbf24", dim: "rgba(251,191,36,0.55)", bg: "#0a0602", bar: "#fbbf24", barText: "#1c1002", key: "#1c1002", glow: "0 0 6px rgba(251,191,36,0.55)" };
    return { text: "#d4d4d4", dim: "#8a8a8a", bg: "#050505", bar: "#0000aa", barText: "#55ffff", key: "#ffffff", glow: "0 0 4px rgba(255,255,255,0.25)" };
}

// ---- Boot ----------------------------------------------------------------

export function DosBoot({ phosphor, onDone, onDisk }: { phosphor: Phosphor; onDone: () => void; onDisk: (busy: boolean) => void }) {
    const c = dosColours(phosphor);
    const [mem, setMem] = useState(0);
    const [step, setStep] = useState(0);
    const [cmd, setCmd] = useState("");

    useEffect(() => {
        const t: number[] = [];
        const at = (ms: number, fn: () => void) => t.push(window.setTimeout(fn, ms));
        at(520, () => setStep(1)); // BIOS banner
        // memory counting up to 640K
        at(700, () => {
            let k = 0;
            const id = window.setInterval(() => {
                k = Math.min(640, k + 64);
                setMem(k);
                if (k >= 640) {
                    window.clearInterval(id);
                    playPostBeep();
                }
            }, 55);
            t.push(id);
        });
        at(1400, () => {
            setStep(2); // drives
            onDisk(true);
        });
        at(1950, () => setStep(3)); // starting DOS
        at(2300, () => {
            onDisk(false);
            setStep(4); // prompt
        });
        const word = "RESUME.EXE";
        [...word].forEach((_, i) => at(2550 + i * 65, () => setCmd(word.slice(0, i + 1))));
        at(2550 + word.length * 65 + 250, () => onDisk(true));
        at(2550 + word.length * 65 + 650, () => {
            onDisk(false);
            onDone();
        });
        return () => t.forEach((id) => {
            window.clearTimeout(id);
            window.clearInterval(id);
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <div className="relative space-y-0.5 font-mono text-[11px] leading-relaxed sm:text-[13px]" style={{ color: c.text, textShadow: c.glow }}>
            {step >= 1 && (
                <>
                    <p>MIIT-1 BIOS v2.6 · (C) 1986 Miit Daga, Kolkata</p>
                    <p>Memory test: {String(mem).padStart(3, " ")}K {mem >= 640 ? "OK" : ""}</p>
                </>
            )}
            {step >= 2 && <p>Detecting drives ...... A: none  C: 20MB</p>}
            {step >= 3 && (
                <>
                    <p>&nbsp;</p>
                    <p>Starting MIIT-DOS 3.30 ...</p>
                </>
            )}
            {step >= 4 && (
                <>
                    <p>&nbsp;</p>
                    <p>
                        C:\&gt;{cmd}
                        <span className="ml-0.5 inline-block h-[1em] w-[0.6em] animate-pulse align-text-bottom motion-reduce:animate-none" style={{ background: c.text }} />
                    </p>
                </>
            )}
        </div>
    );
}

// ---- Function-key bar ----------------------------------------------------

export type FKey = { n: string; label: string; key: string; run: () => void };

export function FKeyBar({ keys, phosphor }: { keys: FKey[]; phosphor: Phosphor }) {
    const c = dosColours(phosphor);
    return (
        <div className="absolute inset-x-0 bottom-0 z-20 flex h-[26px] items-stretch gap-[3px] px-1 font-mono text-[10px] sm:text-[11px]" style={{ background: c.bg }}>
            {keys.map((k) => (
                <button
                    key={k.n}
                    type="button"
                    onClick={k.run}
                    title={`${k.label} (${k.key})`}
                    className="flex min-w-0 flex-1 items-center overflow-hidden whitespace-nowrap text-left transition-opacity hover:opacity-85 focus-visible:outline-none focus-visible:ring-1"
                >
                    <span className="px-1 font-bold" style={{ color: c.text }}>
                        {k.n}
                    </span>
                    <span className="flex-1 truncate px-1 py-1" style={{ background: c.bar, color: c.barText }}>
                        {k.label}
                    </span>
                </button>
            ))}
        </div>
    );
}

// ---- F1 help --------------------------------------------------------------

export function HelpBox({ phosphor, onClose, atPrompt }: { phosphor: Phosphor; onClose: () => void; atPrompt: boolean }) {
    const c = dosColours(phosphor);
    const rows = [
        ["1", "this help"],
        ["2", "download the resume (PDF)"],
        ["3", "phosphor: paper, green, amber"],
        ["4", "tube: off, soft, full"],
        ["0", atPrompt ? "back to the resume" : "quit to the C:\\> prompt"],
    ];
    return (
        <motion.div
            className="absolute inset-0 z-30 flex items-center justify-center bg-black/40 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
        >
            <div
                className="w-full max-w-sm p-1 font-mono text-[11px] sm:text-xs"
                style={{ background: phosphor === "paper" ? "#0000aa" : c.bg, color: phosphor === "paper" ? "#ffffff" : c.text, boxShadow: "6px 6px 0 rgba(0,0,0,0.6)" }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* the double-line border of a DOS dialog */}
                <div className="border-[3px] border-double px-3 pb-3 pt-1" style={{ borderColor: phosphor === "paper" ? "#ffffff" : c.text }}>
                    <p className="-mt-3 mb-2 text-center">
                        <span className="px-2" style={{ background: phosphor === "paper" ? "#0000aa" : c.bg }}>
                            HELP
                        </span>
                    </p>
                    {rows.map(([k, d]) => (
                        <p key={k} className="flex gap-3">
                            <span className="w-8 shrink-0" style={{ color: phosphor === "paper" ? "#ffff55" : c.text }}>
                                {k}
                            </span>
                            <span>{d}</span>
                        </p>
                    ))}
                    <p className="mt-2" style={{ color: phosphor === "paper" ? "#aaaaaa" : c.dim }}>
                        {atPrompt
                            ? "At the prompt the number keys type, so click the bar, or use F1 to F10 (on a Mac, hold fn). RESUME goes back too."
                            : "Press the number keys, click the bar, or use F1 to F10 (on a Mac, hold fn). The dials and the yellow button on the monitor work too."}
                    </p>
                    <p className="mt-3 text-center">
                        <button type="button" onClick={onClose} className="px-3" style={{ background: phosphor === "paper" ? "#aaaaaa" : c.text, color: phosphor === "paper" ? "#000" : c.bg }}>
                            OK
                        </button>
                    </p>
                </div>
            </div>
        </motion.div>
    );
}

// ---- The C:\> prompt ------------------------------------------------------

const FILES = {
    "RESUME.TXT": [
        "MIIT DAGA",
        "Software Development Engineer (full-time, remote), June 2026 - present",
        "",
        "B.Tech, Information Technology, VIT Vellore, 2022 - 2026. CGPA 9.22",
        "Backend development first: FastAPI, NodeJS, PostgreSQL, AWS.",
        "Also into AI and ML: 10 Scopus-indexed papers and a filed patent.",
        "",
        "The full record: type RESUME, or press F2 to download it.",
    ],
    "CONTACT.TXT": [
        "EMAIL     miitcodes27@gmail.com",
        "PHONE     +91 7003816564",
        "SITE      https://miitdaga.dev",
        "LINKEDIN  linkedin.com/in/miit-daga",
        "GITHUB    github.com/miit-daga",
        "BASE      Kolkata, India",
    ],
    "PROJECTS.TXT": [
        "DISMAN      disaster management system, built in 36 hours",
        "FITAI       cloud AI fitness dashboard and assistant, on AWS",
        "DRIFTGUARD  ML network intrusion detection that adapts to drift",
        "QUICK-SEED  database seeding tool (TypeScript)",
        "FLOWSQUIRE  file organiser (TypeScript)",
        "",
        "More, live from GitHub, on the main page.",
    ],
} as const;

type Line = { text: string; kind?: "cmd" | "err" };

export function DosPrompt({
    phosphor,
    onResume,
    onDownload,
    onDisk,
}: {
    phosphor: Phosphor;
    onResume: () => void;
    onDownload: () => void;
    onDisk: (busy: boolean) => void;
}) {
    const c = dosColours(phosphor);
    const [lines, setLines] = useState<Line[]>([{ text: "MIIT-DOS Version 3.30" }, { text: "Type HELP for a list of commands." }, { text: "" }]);
    const [input, setInput] = useState("");
    const [history, setHistory] = useState<string[]>([]);
    const [hIdx, setHIdx] = useState(-1);
    const inputRef = useRef<HTMLInputElement>(null);
    const endRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        inputRef.current?.focus({ preventScroll: true });
    }, []);
    useEffect(() => {
        endRef.current?.scrollIntoView({ block: "end" });
    }, [lines]);

    const disk = () => {
        onDisk(true);
        window.setTimeout(() => onDisk(false), 350);
    };

    const run = (raw: string) => {
        const text = raw.trim();
        const out: Line[] = [{ text: `C:\\>${raw}`, kind: "cmd" }];
        const [word, ...rest] = text.split(/\s+/);
        const cmd = (word || "").toLowerCase();
        const arg = rest.join(" ").toUpperCase();
        const say = (...t: string[]) => t.forEach((x) => out.push({ text: x }));

        if (!cmd) {
            /* an empty line */
        } else if (cmd === "help" || cmd === "?") {
            say(
                "DIR               list the files",
                "TYPE <file>       show a file, e.g. TYPE CONTACT.TXT",
                "RESUME            back to the resume",
                "DOWNLOAD          download the resume (PDF)",
                "TERMINAL          open the full terminal (new tab)",
                "VER, DATE, TIME   the usual",
                "CLS               clear the screen",
            );
        } else if (cmd === "dir" || cmd === "ls") {
            disk();
            say(
                " Volume in drive C is MIIT-1",
                " Directory of C:\\",
                "",
                "RESUME   EXE      32,768  09-23-86",
                "RESUME   PDF     159,887  09-23-86",
                "RESUME   TXT         412  09-23-86",
                "CONTACT  TXT         198  09-23-86",
                "PROJECTS TXT         356  09-23-86",
                "TERMINAL LNK          64  09-23-86",
                "        6 file(s)    193,685 bytes",
                "                  20,193,280 bytes free",
            );
        } else if (cmd === "type" || cmd === "cat") {
            const name = arg.includes(".") ? arg : `${arg}.TXT`;
            const file = FILES[name as keyof typeof FILES];
            if (!arg) out.push({ text: "Required parameter missing", kind: "err" });
            else if (file) {
                disk();
                say(...file);
            } else if (name === "RESUME.PDF" || name === "RESUME.EXE") out.push({ text: "Not a text file. Try RESUME, or TYPE RESUME.TXT", kind: "err" });
            else out.push({ text: "File not found", kind: "err" });
        } else if (cmd === "resume" || cmd === "resume.exe" || cmd === "exit" || cmd === "win") {
            onResume();
            return;
        } else if (cmd === "download") {
            onDownload();
            say("Downloading RESUME.PDF ...");
        } else if (cmd === "terminal") {
            window.open("/terminal.html", "_blank", "noopener");
            say("Opening the full terminal in a new tab ...");
        } else if (cmd === "cls" || cmd === "clear") {
            setLines([]);
            setInput("");
            return;
        } else if (cmd === "ver") {
            say("MIIT-DOS Version 3.30");
        } else if (cmd === "date" || cmd === "time") {
            const now = new Date();
            say(
                `Current ${cmd} in Kolkata is ${
                    cmd === "date"
                        ? new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", weekday: "short", day: "2-digit", month: "2-digit", year: "numeric" }).format(now)
                        : new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(now)
                }`,
            );
        } else if (cmd === "echo") {
            say(rest.join(" "));
        } else if (cmd === "cd") {
            say("C:\\");
        } else {
            out.push({ text: "Bad command or file name", kind: "err" });
        }
        out.push({ text: "" });
        setLines((l) => [...l, ...out].slice(-200));
    };

    return (
        <div
            className="resume-scroll absolute inset-0 overflow-y-auto px-4 py-3 font-mono text-[11px] leading-relaxed sm:px-6 sm:text-[13px]"
            style={{ color: c.text, background: c.bg, textShadow: c.glow }}
            onClick={() => inputRef.current?.focus({ preventScroll: true })}
        >
            {lines.map((l, i) => (
                <p key={i} className="whitespace-pre-wrap break-words" style={l.kind === "err" ? { opacity: 0.8 } : undefined}>
                    {l.text || "\u00a0"}
                </p>
            ))}
            <form
                className="flex"
                onSubmit={(e) => {
                    e.preventDefault();
                    if (input.trim()) setHistory((h) => [...h, input].slice(-30));
                    setHIdx(-1);
                    run(input);
                    setInput("");
                }}
            >
                <label htmlFor="dos-input">C:\&gt;</label>
                <input
                    id="dos-input"
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === "ArrowUp" && history.length) {
                            e.preventDefault();
                            const i = hIdx < 0 ? history.length - 1 : Math.max(0, hIdx - 1);
                            setHIdx(i);
                            setInput(history[i]);
                        } else if (e.key === "ArrowDown" && hIdx >= 0) {
                            e.preventDefault();
                            const i = hIdx + 1;
                            if (i >= history.length) {
                                setHIdx(-1);
                                setInput("");
                            } else {
                                setHIdx(i);
                                setInput(history[i]);
                            }
                        }
                    }}
                    autoComplete="off"
                    autoCapitalize="off"
                    spellCheck={false}
                    aria-label="Command"
                    className="min-w-0 flex-1 bg-transparent uppercase outline-none"
                    style={{ color: c.text, caretColor: c.text }}
                />
            </form>
            <div ref={endRef} />
        </div>
    );
}

