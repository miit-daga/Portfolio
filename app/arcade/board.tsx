"use client";
import { useEffect, useState } from "react";

// A leaderboard on a game's end card (the site's, app/api/leaderboard): the
// top five, and if this run makes the board, three letters to sign it with,
// like an old arcade cabinet. The initials are remembered; the player id is
// the terminal's own, so a browser is the same player everywhere. It stays
// out of the way when the board isn't there (not set up, or unreachable).

type Row = { name: string; score: number; at: string };
const INITIALS_KEY = "arcade-initials";
// Posts the board couldn't take (busy: GitHub limits how often its gist can be
// saved), kept here and sent again the next time a board loads
const PENDING_KEY = "arcade-board-pending";
type Post = Record<string, unknown>;
const readPending = (): Post[] => {
    try {
        const v = JSON.parse(localStorage.getItem(PENDING_KEY) || "[]");
        return Array.isArray(v) ? v : [];
    } catch {
        return [];
    }
};
const writePending = (p: Post[]) => {
    try {
        if (p.length) localStorage.setItem(PENDING_KEY, JSON.stringify(p.slice(-5)));
        else localStorage.removeItem(PENDING_KEY);
    } catch {
        /* ignore */
    }
};
let retrying = false;
async function retryPending() {
    if (retrying) return;
    retrying = true;
    const left: Post[] = [];
    for (const post of readPending()) {
        try {
            const r = await fetch("/api/leaderboard", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(post) });
            // (busy again: keep it; taken, or refused for good: let it go)
            if (r.status >= 500 || r.status === 429) left.push(post);
        } catch {
            left.push(post);
        }
    }
    writePending(left);
    retrying = false;
}
const PLAYER_KEY = "term-player-id";

function playerId() {
    try {
        let id = localStorage.getItem(PLAYER_KEY) || "";
        if (!/^[a-f0-9]{8,32}$/i.test(id)) {
            id = Array.from(crypto.getRandomValues(new Uint8Array(8)), (b) => b.toString(16).padStart(2, "0")).join("");
            localStorage.setItem(PLAYER_KEY, id);
        }
        return id;
    } catch {
        return undefined;
    }
}

export function Board({
    game,
    score,
    day,
    shot,
    lower = false,
    format = (n) => n.toLocaleString(),
    title = "Leaderboard",
}: {
    game: "asteroid-run" | "stack-station" | "assist-daily";
    /** This run's score (for the daily mission, its time in hundredths) */
    score: number;
    day?: string;
    /** The daily mission's winning shot, which the server flies again */
    shot?: { angle: number; power: number };
    lower?: boolean;
    format?: (n: number) => string;
    title?: string;
}) {
    const [rows, setRows] = useState<Row[] | null>(null);
    const [state, setState] = useState<"idle" | "sending" | "done">("idle");
    const [rank, setRank] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [initials, setInitials] = useState("");

    useEffect(() => {
        try {
            setInitials(localStorage.getItem(INITIALS_KEY) || "");
        } catch {
            /* ignore */
        }
        const ctl = new AbortController();
        retryPending();
        fetch(`/api/leaderboard?game=${game}${day ? `&day=${day}` : ""}`, { signal: ctl.signal })
            .then((r) => r.json())
            .then((d) => setRows(d?.configured === false || !d?.boards ? null : (d.boards[game] ?? [])))
            .catch(() => setRows(null));
        return () => ctl.abort();
    }, [game, day]);

    if (!rows) return null;
    const last = rows[rows.length - 1];
    const makes = score > 0 && (rows.length < 10 || (lower ? score < last.score : score > last.score));

    const send = async () => {
        const name = initials.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 3);
        if (name.length < 1) return setError("Three letters, or two, or one.");
        setState("sending");
        setError(null);
        try {
            localStorage.setItem(INITIALS_KEY, name);
        } catch {
            /* ignore */
        }
        const post = { game, name, score, day, player: playerId(), ...shot };
        try {
            const r = await fetch("/api/leaderboard", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(post),
            });
            const d = await r.json();
            if (r.status >= 500 || r.status === 429) {
                writePending([...readPending(), post]);
                setState("done");
                setError("The leaderboard is busy right now. Your score is kept here and will post automatically next time.");
                return;
            }
            if (!r.ok) throw new Error(d?.error || "Could not post that.");
            setRows(d.board);
            setRank(d.rank ?? null);
            setState("done");
        } catch (e) {
            setError(e instanceof Error ? e.message : "Could not post that.");
            setState("idle");
        }
    };

    return (
        <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-left">
            <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-neutral-400">
                {title}
                {rank ? <span className="ml-2 text-amber-300">you're #{rank}</span> : null}
            </p>
            {rows.length ? (
                <ol className="mt-2 space-y-0.5 font-mono text-xs">
                    {rows.slice(0, 5).map((r, i) => (
                        <li key={`${r.name}${r.at}`} className={`flex justify-between gap-3 ${state === "done" && rank === i + 1 ? "text-amber-200" : "text-neutral-300"}`}>
                            <span>
                                <span className="text-neutral-500">{String(i + 1).padStart(2, " ")}.</span> {r.name}
                            </span>
                            <span>{format(r.score)}</span>
                        </li>
                    ))}
                </ol>
            ) : (
                <p className="mt-1 text-xs text-neutral-500">No one yet. Be the first.</p>
            )}
            {makes && state !== "done" && (
                <form
                    className="mt-3 flex items-center gap-2"
                    onSubmit={(e) => {
                        e.preventDefault();
                        send();
                    }}
                >
                    <input
                        value={initials}
                        onChange={(e) => setInitials(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 3))}
                        aria-label="Your initials"
                        placeholder="AAA"
                        maxLength={3}
                        autoComplete="off"
                        className="w-20 rounded-lg border border-white/20 bg-black/40 px-2 py-1.5 text-center font-mono text-sm uppercase tracking-[0.3em] text-white placeholder:text-neutral-600 focus:border-amber-300/60 focus:outline-none"
                    />
                    <button type="submit" disabled={state === "sending"} className="rounded-full bg-amber-300 px-4 py-1.5 text-xs font-semibold text-neutral-950 hover:bg-amber-200 disabled:opacity-60">
                        {state === "sending" ? "Posting…" : `Post ${format(score)}`}
                    </button>
                </form>
            )}
            {error && <p className="mt-2 text-xs text-rose-300">{error}</p>}
        </div>
    );
}
