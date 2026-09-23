"use client";
import { useEffect, useRef, useState } from "react";

// The resume, drawn by pdf.js onto canvases, so nothing of Drive's viewer
// (its pop-out button, its page bar) sits on top of it. Its links stay live
// as invisible anchors over their spots, and its text is there for screen
// readers. If anything fails, it falls back to Drive's own preview.

export type Phosphor = "paper" | "green" | "amber";
export type Tube = "off" | "soft" | "full";

// How the page is dyed on each phosphor: the white page turns black and the
// ink glows, as on an old monochrome monitor. Plain paper keeps it as printed
const PHOSPHOR_FILTER: Record<Phosphor, string> = {
    paper: "none",
    green: "invert(1) sepia(1) saturate(5) hue-rotate(75deg) brightness(1.05) contrast(1.1)",
    amber: "invert(1) sepia(1) saturate(4.5) hue-rotate(-12deg) brightness(1.05) contrast(1.1)",
};
// The glow bleeding off the text on a full-strength tube
const BLOOM: Record<Phosphor, string> = {
    paper: "",
    green: " drop-shadow(0 0 1.5px rgba(74,222,128,0.8))",
    amber: " drop-shadow(0 0 1.5px rgba(251,191,36,0.8))",
};
const FRINGE = " drop-shadow(0.7px 0 0 rgba(255,40,40,0.35)) drop-shadow(-0.7px 0 0 rgba(40,160,255,0.35))";

type Link = { left: number; top: number; width: number; height: number; url: string };
type Page = { width: number; height: number; links: Link[] };

export function PdfScreen({
    src,
    fallback,
    phosphor,
    tube,
    onReady,
}: {
    src: string;
    fallback: string;
    phosphor: Phosphor;
    tube: Tube;
    onReady: () => void;
}) {
    const wrapRef = useRef<HTMLDivElement>(null);
    const canvasRefs = useRef<(HTMLCanvasElement | null)[]>([]);
    const [pages, setPages] = useState<Page[]>([]);
    const [text, setText] = useState("");
    const [failed, setFailed] = useState(false);
    const [width, setWidth] = useState(0);
    const docRef = useRef<unknown>(null);

    // Track the screen's width, so the page always fits it
    useEffect(() => {
        const el = wrapRef.current;
        if (!el) return;
        const ro = new ResizeObserver(() => setWidth(Math.round(el.clientWidth)));
        ro.observe(el);
        setWidth(Math.round(el.clientWidth));
        return () => ro.disconnect();
    }, []);

    // Load the document once
    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
                pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/legacy/build/pdf.worker.min.mjs", import.meta.url).toString();
                const doc = await pdfjs.getDocument({ url: src }).promise;
                if (cancelled) return;
                docRef.current = doc;
                // The text, for screen readers and find-in-page tools
                const all: string[] = [];
                for (let n = 1; n <= doc.numPages; n++) {
                    const page = await doc.getPage(n);
                    const tc = await page.getTextContent();
                    all.push(tc.items.map((i) => ("str" in i ? i.str : "")).join(" "));
                }
                if (!cancelled) setText(all.join("\n\n"));
                setPages(Array.from({ length: doc.numPages }, () => ({ width: 0, height: 0, links: [] })));
            } catch {
                if (!cancelled) setFailed(true);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [src]);

    // Draw every page at the screen's width, sharp on high-density screens
    useEffect(() => {
        const doc = docRef.current as { numPages: number; getPage: (n: number) => Promise<any> } | null;
        if (!doc || !width || !pages.length) return;
        let cancelled = false;
        (async () => {
            try {
                const next: Page[] = [];
                const target = Math.min(width - 24, 900);
                for (let n = 1; n <= doc.numPages; n++) {
                    const page = await doc.getPage(n);
                    const base = page.getViewport({ scale: 1 });
                    const scale = target / base.width;
                    const vp = page.getViewport({ scale });
                    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
                    const canvas = canvasRefs.current[n - 1];
                    if (!canvas || cancelled) return;
                    canvas.width = Math.floor(vp.width * dpr);
                    canvas.height = Math.floor(vp.height * dpr);
                    canvas.style.width = `${vp.width}px`;
                    canvas.style.height = `${vp.height}px`;
                    await page.render({ canvas, viewport: page.getViewport({ scale: scale * dpr }) }).promise;
                    const annots = await page.getAnnotations({ intent: "display" });
                    const links: Link[] = annots
                        .filter((a: { subtype: string; url?: string }) => a.subtype === "Link" && a.url)
                        .map((a: { rect: number[]; url: string }) => {
                            // PDF space to the page on screen, by the viewport's transform
                            const [ta, tb, tc, td, te, tf] = vp.transform as number[];
                            const at = (x: number, y: number) => [ta * x + tc * y + te, tb * x + td * y + tf];
                            const [x1, y1] = at(a.rect[0], a.rect[1]);
                            const [x2, y2] = at(a.rect[2], a.rect[3]);
                            return { left: Math.min(x1, x2), top: Math.min(y1, y2), width: Math.abs(x2 - x1), height: Math.abs(y2 - y1), url: a.url };
                        });
                    next.push({ width: vp.width, height: vp.height, links });
                }
                if (!cancelled) {
                    setPages(next);
                    onReady();
                }
            } catch {
                if (!cancelled) setFailed(true);
            }
        })();
        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [width, pages.length]);

    if (failed) {
        return <iframe src={fallback} title="Miit Daga resume" className="absolute inset-0 block h-full w-full bg-white" onLoad={onReady} />;
    }

    const filter = PHOSPHOR_FILTER[phosphor] === "none" && tube !== "full" ? "none" : `${PHOSPHOR_FILTER[phosphor] === "none" ? "" : PHOSPHOR_FILTER[phosphor]}${tube === "full" ? BLOOM[phosphor] + FRINGE : ""}`.trim();

    return (
        <div ref={wrapRef} className="resume-scroll absolute inset-0 overflow-y-auto overflow-x-hidden overscroll-contain">
            <div className="flex flex-col items-center gap-4 px-3 py-4">
                {pages.map((p, i) => (
                    <div key={i} className="relative shadow-[0_0_24px_rgba(0,0,0,0.5)]" style={{ width: p.width || undefined, height: p.height || undefined }}>
                        <canvas
                            ref={(el) => {
                                canvasRefs.current[i] = el;
                            }}
                            aria-hidden
                            className="block transition-[filter] duration-500"
                            style={{ filter }}
                        />
                        {p.links.map((l, k) => (
                            <a
                                key={k}
                                href={l.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label={l.url}
                                className="absolute rounded-sm outline-none ring-emerald-300/0 transition hover:bg-emerald-300/10 focus-visible:ring-2 focus-visible:ring-emerald-300/80"
                                style={{ left: l.left, top: l.top, width: l.width, height: l.height }}
                            />
                        ))}
                    </div>
                ))}
            </div>
            <div className="sr-only">{text}</div>
        </div>
    );
}
