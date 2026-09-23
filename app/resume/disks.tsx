"use client";
import { useEffect, useRef, useState } from "react";
import type { Phosphor } from "./pdf-screen";
import { dosColours } from "./dos";
import type { DiskId } from "./floppy";
import { LABEL_KEY } from "./floppy";
import { Publications } from "@/components/Publications";
import { saveContact } from "@/components/ui/contact-actions";
import { playAlienChirps, playPostBeep } from "./crt-sound";

// The programs on the resume computer's floppies (floppy.tsx). Each fills the
// screen above the function-key bar while its disk is in drive A:
//   PROJECTS  the repos, live from GitHub (the same list as the Projects section)
//   PAPERS    the publications, in plain English, with DOIs and citations
//   CONTACT   the ways to reach Miit, and the contact card
//   GAMES     Snake, in the phosphor's colour
//   blank     sign the guestbook (the radar on the main page) by writing to it
//   alien     the alien's disk: a message, and a clue for the fragment hunt

type Props = { disk: DiskId; phosphor: Phosphor; onDisk: (busy: boolean) => void; onLabel: (name: string) => void };

const store = {
    get: (k: string) => {
        try {
            return localStorage.getItem(k);
        } catch {
            return null;
        }
    },
    set: (k: string, v: string) => {
        try {
            localStorage.setItem(k, v);
        } catch {
            /* ignore */
        }
    },
};

export function DiskProgram(props: Props) {
    const c = dosColours(props.phosphor);
    const [loading, setLoading] = useState(true);
    // Every disk takes a moment to read
    useEffect(() => {
        setLoading(true);
        const id = window.setTimeout(() => setLoading(false), 1300);
        return () => window.clearTimeout(id);
    }, [props.disk]);

    const name = props.disk === "blank" ? "SIGN.EXE" : props.disk === "alien" ? "?????.EXE" : `${props.disk.toUpperCase()}.EXE`;
    return (
        <div
            className="resume-scroll absolute inset-0 overflow-y-auto px-4 py-3 font-mono text-[11px] leading-relaxed sm:px-6 sm:text-[13px]"
            style={{ color: c.text, background: c.bg, textShadow: c.glow }}
        >
            <p style={{ color: c.dim }}>A:\&gt;{name}</p>
            {loading ? (
                <p>
                    Reading drive A: <span className="animate-pulse motion-reduce:animate-none">...</span>
                </p>
            ) : props.disk === "projects" ? (
                <Projects {...props} />
            ) : props.disk === "papers" ? (
                <Papers {...props} />
            ) : props.disk === "contact" ? (
                <Contact {...props} />
            ) : props.disk === "games" ? (
                <Snake {...props} />
            ) : props.disk === "blank" ? (
                <Sign {...props} />
            ) : (
                <Alien {...props} />
            )}
        </div>
    );
}

// A row you can pick with the arrows and Enter, or tap
function useSelection(count: number, onPick: (i: number) => void) {
    const [sel, setSel] = useState(0);
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (!count) return;
            if (e.key === "ArrowDown") {
                e.preventDefault();
                setSel((i) => (i + 1) % count);
            } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setSel((i) => (i - 1 + count) % count);
            } else if (e.key === "Enter") {
                e.preventDefault();
                onPick(sel);
            }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [count, sel, onPick]);
    return [sel, setSel] as const;
}

// ---- PROJECTS ---------------------------------------------------------------

type Repo = { name: string; description: string | null; html_url: string; homepage: string | null; languages: Record<string, number> };

function Projects({ phosphor }: Props) {
    const c = dosColours(phosphor);
    const [repos, setRepos] = useState<Repo[] | null | "failed">(null);
    useEffect(() => {
        fetch("/api/github-repos")
            .then((r) => (r.ok ? r.json() : Promise.reject()))
            .then((d) => setRepos(Array.isArray(d) ? d : "failed"))
            .catch(() => setRepos("failed"));
    }, []);
    const list = Array.isArray(repos) ? repos : [];
    const [sel, setSel] = useSelection(list.length, (i) => list[i] && window.open(list[i].html_url, "_blank", "noopener"));

    if (repos === null) return <p>Fetching from github.com/miit-daga ...</p>;
    if (repos === "failed") return <p>General failure reading GitHub. Abort, Retry, Fail?</p>;
    const top = (l: Record<string, number>) => Object.entries(l).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "";
    return (
        <div>
            <p className="mb-2">{list.length} projects, live from GitHub. ↑↓ and Enter, or tap, to open one.</p>
            {list.map((r, i) => (
                <div
                    key={r.name}
                    onMouseEnter={() => setSel(i)}
                    className="mb-1 cursor-pointer px-1"
                    style={i === sel ? { background: c.text, color: c.bg, textShadow: "none" } : undefined}
                    onClick={() => window.open(r.html_url, "_blank", "noopener")}
                >
                    <p className="flex justify-between gap-2">
                        <span className="font-bold">{r.name.toUpperCase()}</span>
                        <span className="shrink-0 opacity-80">{top(r.languages)}</span>
                    </p>
                    {r.description && <p className="opacity-85">{r.description}</p>}
                    {r.homepage && (
                        <a href={r.homepage} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="underline decoration-dotted">
                            live: {r.homepage.replace(/^https?:\/\//, "")}
                        </a>
                    )}
                </div>
            ))}
        </div>
    );
}

// ---- PAPERS -----------------------------------------------------------------

function Papers({ phosphor }: Props) {
    const c = dosColours(phosphor);
    const [copied, setCopied] = useState<string | null>(null);
    const [sel, setSel] = useSelection(Publications.length, (i) => {
        const p = Publications[i];
        if (p.link) window.open(p.link, "_blank", "noopener");
    });
    const copy = async (text: string, what: string) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopied(what);
            window.setTimeout(() => setCopied(null), 1600);
        } catch {
            /* ignore */
        }
    };
    return (
        <div>
            <p className="mb-2">{Publications.length} records. ↑↓ and Enter opens the DOI.</p>
            {Publications.map((p, i) => {
                const cite = "cite" in p ? p.cite : undefined;
                return (
                    <div key={p.title} onMouseEnter={() => setSel(i)} className="mb-3 px-1" style={i === sel ? { outline: `1px solid ${c.text}` } : undefined}>
                        <p style={{ color: c.dim }}>{`${p.type === "patent" ? "PATENT" : "PAPER"}  ${p.venue.toUpperCase()}`}</p>
                        <p className="font-bold">{p.title}</p>
                        <p className="opacity-90">{p.tldr}</p>
                        <p className="mt-1 flex flex-wrap gap-x-3">
                            {p.link && (
                                <a href={p.link} target="_blank" rel="noopener noreferrer" className="underline decoration-dotted">
                                    [DOI]
                                </a>
                            )}
                            {cite && (
                                <>
                                    <button type="button" className="underline decoration-dotted" onClick={() => copy(cite.bibtex, `bib${i}`)}>
                                        {copied === `bib${i}` ? "[copied]" : "[BibTeX]"}
                                    </button>
                                    <button type="button" className="underline decoration-dotted" onClick={() => copy(cite.apa, `apa${i}`)}>
                                        {copied === `apa${i}` ? "[copied]" : "[APA]"}
                                    </button>
                                </>
                            )}
                        </p>
                    </div>
                );
            })}
        </div>
    );
}

// ---- CONTACT ----------------------------------------------------------------

function Contact({ phosphor }: Props) {
    const c = dosColours(phosphor);
    const rows: [string, string, string][] = [
        ["EMAIL", "miitcodes27@gmail.com", "mailto:miitcodes27@gmail.com"],
        ["PHONE", "+91 7003816564", "tel:+917003816564"],
        ["LINKEDIN", "linkedin.com/in/miit-daga", "https://www.linkedin.com/in/miit-daga"],
        ["GITHUB", "github.com/miit-daga", "https://github.com/miit-daga"],
        ["SITE", "miitdaga.dev", "https://miitdaga.dev"],
    ];
    const [saved, setSaved] = useState(false);
    return (
        <div>
            <p className="mb-2">KOLKATA STATION · open channel</p>
            {rows.map(([k, v, href]) => (
                <p key={k}>
                    <span className="inline-block w-24" style={{ color: c.dim }}>
                        {k}
                    </span>
                    <a href={href} target={href.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer" className="underline decoration-dotted">
                        {v}
                    </a>
                </p>
            ))}
            <p className="mt-3">
                <button
                    type="button"
                    className="px-2"
                    style={{ background: c.text, color: c.bg, textShadow: "none" }}
                    onClick={() => {
                        saveContact();
                        setSaved(true);
                    }}
                >
                    {saved ? "CONTACT SAVED" : "SAVE CONTACT CARD"}
                </button>
            </p>
        </div>
    );
}

// ---- GAMES: Snake -----------------------------------------------------------

const COLS = 24;
const ROWS = 14;
type P = { x: number; y: number };

function Snake({ phosphor }: Props) {
    const c = dosColours(phosphor);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [score, setScore] = useState(0);
    const [best, setBest] = useState(() => Number(store.get("dos-snake-best")) || 0);
    const [state, setState] = useState<"ready" | "play" | "over">("ready");
    const dir = useRef<P>({ x: 1, y: 0 });
    const next = useRef<P>({ x: 1, y: 0 });
    const game = useRef<{ snake: P[]; food: P }>({ snake: [], food: { x: 0, y: 0 } });

    const turn = (d: P) => {
        if (d.x === -dir.current.x && d.y === -dir.current.y) return;
        next.current = d;
        if (state !== "play") start();
    };
    const start = () => {
        game.current.snake = [{ x: 8, y: 7 }, { x: 7, y: 7 }, { x: 6, y: 7 }];
        dir.current = { x: 1, y: 0 };
        next.current = { x: 1, y: 0 };
        place();
        setScore(0);
        setState("play");
    };
    const place = () => {
        const g = game.current;
        let f: P;
        do f = { x: Math.floor(Math.random() * COLS), y: Math.floor(Math.random() * ROWS) };
        while (g.snake.some((s) => s.x === f.x && s.y === f.y));
        g.food = f;
    };

    // Keys: the arrows or WASD; Space starts
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            const k = e.key.toLowerCase();
            const m: Record<string, P> = { arrowup: { x: 0, y: -1 }, w: { x: 0, y: -1 }, arrowdown: { x: 0, y: 1 }, s: { x: 0, y: 1 }, arrowleft: { x: -1, y: 0 }, a: { x: -1, y: 0 }, arrowright: { x: 1, y: 0 }, d: { x: 1, y: 0 } };
            if (m[k]) {
                e.preventDefault();
                turn(m[k]);
            } else if (k === " " && state !== "play") {
                e.preventDefault();
                start();
            }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    });

    // The tick, and drawing
    useEffect(() => {
        const cv = canvasRef.current;
        const ctx = cv?.getContext("2d");
        if (!cv || !ctx) return;
        const draw = () => {
            const w = cv.clientWidth;
            const cell = Math.floor(w / COLS);
            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            cv.width = cell * COLS * dpr;
            cv.height = cell * ROWS * dpr;
            cv.style.height = `${cell * ROWS}px`;
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            ctx.fillStyle = c.bg;
            ctx.fillRect(0, 0, cell * COLS, cell * ROWS);
            ctx.strokeStyle = c.dim;
            ctx.strokeRect(0.5, 0.5, cell * COLS - 1, cell * ROWS - 1);
            const g = game.current;
            ctx.fillStyle = c.text;
            ctx.shadowColor = c.text;
            ctx.shadowBlur = 6;
            g.snake.forEach((s) => ctx.fillRect(s.x * cell + 1, s.y * cell + 1, cell - 2, cell - 2));
            if (g.snake.length) ctx.fillRect(g.food.x * cell + cell / 4, g.food.y * cell + cell / 4, cell / 2, cell / 2);
            ctx.shadowBlur = 0;
        };
        draw();
        if (state !== "play") return;
        const id = window.setInterval(() => {
            const g = game.current;
            dir.current = next.current;
            const head = { x: g.snake[0].x + dir.current.x, y: g.snake[0].y + dir.current.y };
            if (head.x < 0 || head.y < 0 || head.x >= COLS || head.y >= ROWS || g.snake.some((s) => s.x === head.x && s.y === head.y)) {
                setState("over");
                setBest((b) => {
                    const nb = Math.max(b, g.snake.length - 3);
                    store.set("dos-snake-best", String(nb));
                    return nb;
                });
                return;
            }
            g.snake.unshift(head);
            if (head.x === g.food.x && head.y === g.food.y) {
                setScore(g.snake.length - 3);
                playPostBeep();
                place();
            } else g.snake.pop();
            draw();
        }, 120);
        return () => window.clearInterval(id);
    }, [state, c.bg, c.dim, c.text]);

    const pad = "flex h-9 w-9 items-center justify-center border text-sm";
    return (
        <div>
            <p className="mb-2 flex justify-between">
                <span>SNAKE</span>
                <span>
                    SCORE {score} · BEST {best}
                </span>
            </p>
            <canvas ref={canvasRef} className="block w-full touch-none" aria-label="Snake" />
            <p className="mt-2">
                {state === "ready" ? "Arrows or WASD to steer. Space, or an arrow, to start." : state === "over" ? "GAME OVER. Space, or an arrow, to play again." : "\u00a0"}
            </p>
            {/* on a touch screen, a pad of arrows */}
            <div className="mt-2 grid w-max grid-cols-3 gap-1 sm:hidden" style={{ borderColor: c.dim }}>
                <span />
                <button type="button" className={pad} style={{ borderColor: c.dim }} onClick={() => turn({ x: 0, y: -1 })} aria-label="Up">↑</button>
                <span />
                <button type="button" className={pad} style={{ borderColor: c.dim }} onClick={() => turn({ x: -1, y: 0 })} aria-label="Left">←</button>
                <button type="button" className={pad} style={{ borderColor: c.dim }} onClick={() => turn({ x: 0, y: 1 })} aria-label="Down">↓</button>
                <button type="button" className={pad} style={{ borderColor: c.dim }} onClick={() => turn({ x: 1, y: 0 })} aria-label="Right">→</button>
            </div>
            <p className="mt-2" style={{ color: c.dim }}>
                More games in the terminal: type PLAY there.
            </p>
        </div>
    );
}

// ---- The blank disk: sign the guestbook -------------------------------------

function Sign({ phosphor, onDisk, onLabel }: Props) {
    const c = dosColours(phosphor);
    const [label, setLabel] = useState<string | null>(() => store.get(LABEL_KEY));
    const [name, setName] = useState("");
    const [message, setMessage] = useState("");
    const [status, setStatus] = useState<{ kind: "idle" | "writing" | "done" | "error"; text?: string }>({ kind: "idle" });
    const [again, setAgain] = useState(false);
    const [callsign, setCallsign] = useState("");
    useEffect(() => {
        try {
            setCallsign(sessionStorage.getItem("visitor-callsign") ?? "");
        } catch {
            /* ignore */
        }
    }, []);

    const write = async () => {
        if (!message.trim() || status.kind === "writing") return;
        setStatus({ kind: "writing" });
        onDisk(true);
        try {
            const res = await fetch("/api/guestbook", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: name.trim() || callsign || "anonymous", message: message.trim() }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok || !data.entry) throw new Error(data.error || "Write fault writing drive A");
            // It shows in amber on the radar, as a signature made from the main page does
            try {
                const mine = JSON.parse(localStorage.getItem("guestbook-mine") || "[]");
                localStorage.setItem("guestbook-mine", JSON.stringify([...mine, data.entry.id].slice(-20)));
            } catch {
                /* ignore */
            }
            store.set(LABEL_KEY, data.entry.name);
            store.set(`${LABEL_KEY}-message`, data.entry.message);
            setLabel(data.entry.name);
            onLabel(data.entry.name);
            setStatus({ kind: "done" });
            setAgain(false);
        } catch (e) {
            setStatus({ kind: "error", text: e instanceof Error ? e.message : "Write fault writing drive A" });
        } finally {
            window.setTimeout(() => onDisk(false), 700);
        }
    };

    if (label && !again) {
        return (
            <div>
                <p className="mb-2">Volume in drive A is {label.toUpperCase().slice(0, 11)}</p>
                <p>SIGNATURE.TXT</p>
                <p className="my-2 pl-3" style={{ borderLeft: `2px solid ${c.dim}` }}>
                    {store.get(`${LABEL_KEY}-message`) ?? "(your message)"}
                    <br />- {label}
                </p>
                {status.kind === "done" && <p>Written. It is a blip on the radar in the contact section of the main page now.</p>}
                <p className="mt-3">
                    <button type="button" className="px-2" style={{ background: c.text, color: c.bg, textShadow: "none" }} onClick={() => setAgain(true)}>
                        WRITE ANOTHER
                    </button>
                </p>
            </div>
        );
    }
    const field = "w-full bg-transparent outline-none border-b";
    return (
        <form
            onSubmit={(e) => {
                e.preventDefault();
                write();
            }}
        >
            <p className="mb-2">This disk is blank. Label it to sign Miit&apos;s guestbook: your note joins the radar on the main page.</p>
            <label className="block">
                <span style={{ color: c.dim }}>NAME    </span>
                <input value={name} onChange={(e) => setName(e.target.value)} maxLength={24} placeholder={callsign || "anonymous"} className={field} style={{ borderColor: c.dim, color: c.text }} autoComplete="off" />
            </label>
            <label className="mt-2 block">
                <span style={{ color: c.dim }}>MESSAGE </span>
                <input value={message} onChange={(e) => setMessage(e.target.value)} maxLength={140} placeholder="say something to the crew" className={field} style={{ borderColor: c.dim, color: c.text }} autoComplete="off" autoFocus />
            </label>
            <p className="mt-3 flex items-center gap-3">
                <button type="submit" disabled={!message.trim() || status.kind === "writing"} className="px-2 disabled:opacity-50" style={{ background: c.text, color: c.bg, textShadow: "none" }}>
                    {status.kind === "writing" ? "WRITING..." : "WRITE TO DISK"}
                </button>
                <span style={{ color: c.dim }}>{message.length}/140</span>
            </p>
            {status.kind === "error" && <p className="mt-2">{status.text}</p>}
        </form>
    );
}

// ---- The alien's disk ---------------------------------------------------------

// True clues: where each of the main page's five fragments hides (app/page.tsx)
const CLUES = [
    "ONE SHARD HIDES IN WORK EXPERIENCE, UP IN THE TOP RIGHT.",
    "ONE SHARD HIDES IN EDUCATION, UP IN THE TOP LEFT.",
    "ONE SHARD HIDES IN SKILLS, DOWN IN THE BOTTOM RIGHT.",
    "ONE SHARD HIDES IN PROJECTS, UP IN THE TOP LEFT.",
    "ONE SHARD HIDES IN PUBLICATIONS, DOWN IN THE BOTTOM RIGHT.",
];
const ART = ["     .-\"\"\"-.", "    /  o o  \\", "   |    ^    |", "    \\  '-'  /", "     '-...-'", "      /   \\"];

function Alien({ phosphor }: Props) {
    const c = dosColours(phosphor);
    const [shown, setShown] = useState(0);
    const lines = useRef<string[]>([]);
    if (!lines.current.length) {
        const clue = CLUES[Math.floor(Math.random() * CLUES.length)];
        lines.current = [
            ...ART,
            "",
            "HELLO, EARTHLING.",
            "YOU FOUND MY FLOPPY. I LEFT IT HERE FOR SAFEKEEPING.",
            "SINCE YOU ASKED SO NICELY, A SECRET:",
            "",
            "FIVE SHARDS OF A BROKEN STAR HIDE ON THE MAIN PAGE.",
            clue,
            "FIND ALL FIVE, THEN TRY ↑ ↑ ↓ ↓ ← → ← → B A.",
            "",
            "DO NOT TELL THE MOTHERSHIP. END OF TRANSMISSION.",
        ];
    }
    useEffect(() => {
        playAlienChirps(7);
        // The alien on the main page will know you read it (localStorage is shared across tabs)
        store.set("alien-floppy-read", "1");
        const id = window.setInterval(() => setShown((n) => (n >= lines.current.length ? n : n + 1)), 170);
        return () => window.clearInterval(id);
    }, []);
    const green = phosphor === "paper" ? "#86efac" : c.text;
    return (
        <div style={{ color: green }}>
            {lines.current.slice(0, shown).map((l, i) => (
                <p key={i} className="whitespace-pre">
                    {l || "\u00a0"}
                </p>
            ))}
        </div>
    );
}
