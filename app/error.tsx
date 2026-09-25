"use client";
import { useEffect, useState } from "react";
import { reportError } from "@/lib/report-error";
import { whereOf } from "@/components/error-reporter";
import { isLoadFailure, reloadOnce } from "@/lib/chunk-retry";

// Shown in place of a page that crashed (instead of Next's bare "Application
// error"), and the crash reported for /stats
export default function PageError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
    // (a script that didn't arrive: reload once, quietly, as a visitor would)
    const [retrying, setRetrying] = useState(() => isLoadFailure(error));
    useEffect(() => {
        reportError(whereOf(window.location.pathname), "crash", error);
        if (isLoadFailure(error) && !reloadOnce()) setRetrying(false);
    }, [error]);
    if (retrying) {
        return (
            <main className="flex min-h-dvh items-center justify-center bg-black p-6 text-center text-white">
                <p className="animate-pulse font-mono text-[11px] uppercase tracking-[0.3em] text-teal-300/80">Reconnecting…</p>
            </main>
        );
    }
    return (
        <main className="flex min-h-dvh items-center justify-center bg-black p-6 text-center text-white">
            <div className="max-w-sm">
                <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-rose-300/90">Signal lost</p>
                <h1 className="font-display mt-2 text-2xl font-bold">Something went wrong on this page</h1>
                <p className="mt-2 text-sm text-neutral-400">It has been reported. Trying again usually fixes it.</p>
                <div className="mt-5 flex justify-center gap-2">
                    <button type="button" onClick={() => reset()} className="rounded-full bg-teal-400 px-5 py-2.5 text-sm font-semibold text-neutral-950 hover:bg-teal-300">
                        Try again
                    </button>
                    <button type="button" onClick={() => window.location.reload()} className="rounded-full border border-white/20 px-5 py-2.5 text-sm text-neutral-200 hover:border-white/40">
                        Reload
                    </button>
                </div>
            </div>
        </main>
    );
}
