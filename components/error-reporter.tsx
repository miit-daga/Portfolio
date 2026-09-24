"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { reportError } from "@/lib/report-error";

// Reports stray errors on every page of the site to /api/errors, for /stats.
// (The arcade reports its own, with which game; app/error.tsx reports crashes.)
export const whereOf = (path: string) =>
    path === "/" ? "home" : path.startsWith("/terminal") ? "desk" : path.startsWith("/resume") ? "resume" : path.startsWith("/stats") ? "stats" : "page";

export function ErrorReporter() {
    const path = usePathname() ?? "/";
    useEffect(() => {
        if (path.startsWith("/arcade")) return;
        const where = whereOf(path);
        // ("Script error." is a script from another site, a browser extension
        // usually, which the browser won't say more about: not ours to fix)
        const onError = (e: ErrorEvent) => e.message !== "Script error." && reportError(where, "error", e.error ?? e.message);
        const onRejection = (e: PromiseRejectionEvent) => reportError(where, "rejection", e.reason);
        window.addEventListener("error", onError);
        window.addEventListener("unhandledrejection", onRejection);
        return () => {
            window.removeEventListener("error", onError);
            window.removeEventListener("unhandledrejection", onRejection);
        };
    }, [path]);
    return null;
}
