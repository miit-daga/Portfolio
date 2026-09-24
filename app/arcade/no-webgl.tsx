"use client";

// Shown instead of a game when the browser can't give it 3D graphics (WebGL):
// turned off in its settings, by a school's or work's policy, or blocked for
// the graphics driver. Better a clear note than a crashed page.
export function NoWebGL({ onExit, title }: { onExit: () => void; title: string }) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black p-6 text-white">
            <div className="max-w-md rounded-2xl border border-white/15 bg-white/[0.04] p-6 text-center">
                <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-amber-300/90">{title}</p>
                <h1 className="font-display mt-2 text-2xl font-bold">This game needs 3D graphics</h1>
                <p className="mt-3 text-sm leading-relaxed text-neutral-300">
                    It draws with WebGL, and this browser has it turned off. Often that's graphics acceleration being off (in Chrome: Settings, System, &quot;Use graphics acceleration when
                    available&quot;), a school or work browser profile that blocks it, or a browser update waiting for a restart.
                </p>
                <p className="mt-2 text-sm text-neutral-400">Another browser or profile usually works.</p>
                <button type="button" onClick={onExit} className="mt-5 rounded-full bg-teal-400 px-6 py-2.5 text-sm font-semibold text-neutral-950 hover:bg-teal-300">
                    Back to the arcade
                </button>
            </div>
        </div>
    );
}
