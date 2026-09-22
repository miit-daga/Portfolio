"use client";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

// The command palette (cmdk + Radix dialog, ~64 KB) is only ever opened with
// Cmd/Ctrl+K, so it stays out of the first download. Its chunk is fetched in
// idle time after load, and the first Cmd+K mounts it already open; from then
// on it listens for the shortcut itself.
const CommandMenu = dynamic(() => import("./command-menu").then((m) => m.CommandMenu), { ssr: false });

export function CommandMenuLoader() {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        if (mounted) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                setMounted(true);
            }
        };
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, [mounted]);

    // Warm the chunk so the first Cmd+K opens without a wait
    useEffect(() => {
        const warm = () => void import("./command-menu");
        const w = window as Window & { requestIdleCallback?: (cb: () => void) => number };
        if (w.requestIdleCallback) w.requestIdleCallback(warm);
        else setTimeout(warm, 2000);
    }, []);

    return mounted ? <CommandMenu defaultOpen /> : null;
}
