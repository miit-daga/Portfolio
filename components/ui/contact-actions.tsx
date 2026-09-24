"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { IconAddressBook, IconCamera, IconDownload, IconPhotoUp, IconTicket, IconTrash, IconX } from "@tabler/icons-react";

// Two actions under the crew ID card:
//   Save contact  - a real vCard, so the details land in the visitor's phone
//                   or address book in one tap
//   Visitor pass  - a boarding pass drawn for this visitor: their session
//                   callsign (the one in the footer), the city the signal globe
//                   located them in, and when they came aboard. Downloadable.
//                   Visitors can add their own photo, uploaded or taken with
//                   the camera. It is drawn on the pass in their browser and
//                   never leaves the device: nothing is sent anywhere.

// Built on demand, with the photo folded in once it has loaded
const VCARD_LINES = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    "N:Daga;Miit;;;",
    "FN:Miit Daga",
    "TITLE:Software Development Engineer",
    "EMAIL;TYPE=INTERNET:miitcodes27@gmail.com",
    "TEL;TYPE=CELL:+917003816564",
    "URL:https://miitdaga.dev",
    // Labelled links show on Android and elsewhere; X-SOCIALPROFILE is read
    // only by Apple's Contacts, so both are given
    "item1.URL:https://www.linkedin.com/in/miit-daga",
    "item1.X-ABLabel:LinkedIn",
    "item2.URL:https://github.com/miit-daga",
    "item2.X-ABLabel:GitHub",
    "item3.URL:https://miitdaga.dev/resume",
    "item3.X-ABLabel:Resume",
    "X-SOCIALPROFILE;TYPE=linkedin:https://www.linkedin.com/in/miit-daga",
    "X-SOCIALPROFILE;TYPE=github:https://github.com/miit-daga",
    // City and country only, not tagged as a home address
    "ADR:;;;Kolkata;;;India",
    "NOTE:Saved from miitdaga.dev. Software Development Engineer\\, backend development.",
];

// The face on the contact: the crew card's headshot, 240px (public/contact-photo.jpg)
let photoB64: string | null = null;
let photoLoading: Promise<void> | null = null;
export function preloadContactPhoto() {
    photoLoading ??= fetch("/contact-photo.jpg")
        .then((r) => (r.ok ? r.blob() : Promise.reject()))
        .then(
            (blob) =>
                new Promise<void>((resolve) => {
                    const fr = new FileReader();
                    fr.onload = () => {
                        photoB64 = String(fr.result).split(",")[1] ?? null;
                        resolve();
                    };
                    fr.onerror = () => resolve();
                    fr.readAsDataURL(blob);
                }),
        )
        .catch(() => {});
    return photoLoading;
}

function buildVCard() {
    const lines = [...VCARD_LINES];
    if (photoB64) {
        // Long lines are folded at 75 characters, continuations starting with a space
        const photo = `PHOTO;ENCODING=b;TYPE=JPEG:${photoB64}`;
        const folded = photo.match(/.{1,74}/g)?.join("\r\n ") ?? photo;
        lines.push(folded);
    }
    lines.push("END:VCARD");
    return lines.join("\r\n");
}

function download(vcard: string) {
    const url = URL.createObjectURL(new Blob([vcard], { type: "text/vcard" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "Miit-Daga.vcf";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function saveContact() {
    // Usually the photo is already in (preloaded with the contact section);
    // if not, wait for it briefly rather than save a card without a face
    if (photoB64) return download(buildVCard());
    const giveUp = new Promise<void>((r) => setTimeout(r, 1500));
    Promise.race([preloadContactPhoto(), giveUp]).then(() => download(buildVCard()));
}

// --- Visitor pass ---------------------------------------------------------

function readCallsign(): string {
    try {
        const saved = sessionStorage.getItem("visitor-callsign");
        if (saved) return saved;
    } catch {
        /* ignore */
    }
    return `VISITOR-${10 + Math.floor(Math.random() * 90)}`;
}

function readOrigin(): string {
    try {
        const saved = sessionStorage.getItem("visitor-origin");
        if (saved) return saved;
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
        const city = (tz.split("/").pop() || "").replace(/_/g, " ");
        if (city) return city === "Calcutta" ? "Kolkata" : city;
    } catch {
        /* ignore */
    }
    return "Deep space";
}

// Deterministic per callsign, so the same visitor gets the same stars
function seeded(seedText: string) {
    let a = 0;
    for (const ch of seedText) a = (a * 31 + ch.charCodeAt(0)) >>> 0;
    return () => {
        a |= 0;
        a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

// Resolves to an object URL for the PNG, which the caller revokes. A data URL
// of a 2000px pass is about 3 MB of string, held twice (img and link).
async function drawPass(callsign: string, origin: string, boarded: Date, photo?: ImageBitmap | null): Promise<string> {
    const W = 1000;
    const H = 620;
    const S = 2; // drawn at 2x for a crisp download
    const canvas = document.createElement("canvas");
    canvas.width = W * S;
    canvas.height = H * S;
    const g = canvas.getContext("2d");
    if (!g) return "";
    g.scale(S, S);

    // The site's display face, by its generated family name
    await document.fonts.ready;
    const probe = document.querySelector(".font-display");
    const display = probe ? getComputedStyle(probe).fontFamily : "system-ui, sans-serif";
    const mono = "ui-monospace, SFMono-Regular, Menlo, monospace";
    const rand = seeded(callsign);

    // Card body
    g.save();
    g.beginPath();
    g.roundRect(0, 0, W, H, 36);
    g.clip();
    const bg = g.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, "#0d1224");
    bg.addColorStop(1, "#04060c");
    g.fillStyle = bg;
    g.fillRect(0, 0, W, H);
    const amber = g.createRadialGradient(W - 120, 90, 0, W - 120, 90, 520);
    amber.addColorStop(0, "rgba(251,191,36,0.20)");
    amber.addColorStop(1, "rgba(251,191,36,0)");
    g.fillStyle = amber;
    g.fillRect(0, 0, W, H);
    const teal = g.createRadialGradient(80, H, 0, 80, H, 460);
    teal.addColorStop(0, "rgba(45,212,191,0.14)");
    teal.addColorStop(1, "rgba(45,212,191,0)");
    g.fillStyle = teal;
    g.fillRect(0, 0, W, H);

    // Stars
    for (let i = 0; i < 140; i++) {
        g.globalAlpha = 0.15 + rand() * 0.6;
        g.fillStyle = "#ffffff";
        const r = rand() < 0.9 ? 0.8 : 1.6;
        g.beginPath();
        g.arc(rand() * W, rand() * H, r, 0, Math.PI * 2);
        g.fill();
    }
    g.globalAlpha = 1;

    // Ringed planet, upper right
    // Kept high and right so its ring clears the field text below
    const px = 842;
    const py = 196;
    const pr = 90;
    const ringBack = () => {
        g.strokeStyle = "rgba(253,230,138,0.55)";
        g.lineWidth = 6;
        g.beginPath();
        g.ellipse(px, py, pr * 1.75, pr * 0.42, -0.35, Math.PI, Math.PI * 2);
        g.stroke();
    };
    ringBack();
    const body = g.createRadialGradient(px - 36, py - 40, 10, px, py, pr);
    body.addColorStop(0, "#fde68a");
    body.addColorStop(0.55, "#f59e0b");
    body.addColorStop(1, "#7c2d12");
    g.fillStyle = body;
    g.beginPath();
    g.arc(px, py, pr, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = "rgba(253,230,138,0.85)";
    g.lineWidth = 6;
    g.beginPath();
    g.ellipse(px, py, pr * 1.75, pr * 0.42, -0.35, 0, Math.PI);
    g.stroke();

    // Visitor's photo: a gold-rimmed porthole below the planet, centre-cropped
    if (photo) {
        const cx = 842;
        const cy = 398;
        const r = 76;
        const side = Math.min(photo.width, photo.height);
        g.save();
        g.beginPath();
        g.arc(cx, cy, r, 0, Math.PI * 2);
        g.clip();
        g.drawImage(photo, (photo.width - side) / 2, (photo.height - side) / 2, side, side, cx - r, cy - r, r * 2, r * 2);
        g.restore();
        g.strokeStyle = "#fbbf24";
        g.lineWidth = 4;
        g.beginPath();
        g.arc(cx, cy, r + 2, 0, Math.PI * 2);
        g.stroke();
        g.strokeStyle = "rgba(251,191,36,0.35)";
        g.lineWidth = 1.5;
        g.beginPath();
        g.arc(cx, cy, r + 10, 0, Math.PI * 2);
        g.stroke();
        g.fillStyle = "#71717a";
        g.font = `500 12px ui-monospace, SFMono-Regular, Menlo, monospace`;
        g.textAlign = "center";
        g.fillText("CREW PHOTO", cx, cy + r + 30);
        g.textAlign = "left";
    }

    // Header
    g.fillStyle = "#5eead4";
    g.font = `600 17px ${mono}`;
    g.fillText("STARSHIP PORTFOLIO  ·  VISITOR PASS", 56, 74);

    // Callsign
    g.fillStyle = "#71717a";
    g.font = `500 15px ${mono}`;
    g.fillText("CALLSIGN", 56, 140);
    g.fillStyle = "#ffffff";
    // Shrinks to fit, so the longest callsign (ANDROMEDA-99) clears the planet
    let size = 92;
    g.font = `700 ${size}px ${display}`;
    while (g.measureText(callsign).width > 580 && size > 48) {
        size -= 4;
        g.font = `700 ${size}px ${display}`;
    }
    g.fillText(callsign, 52, 222);

    // Fields
    const when = boarded.toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
    const fields: [string, string][] = [
        ["ORIGIN", origin],
        ["BOARDED", when],
        ["DESTINATION", "miitdaga.dev"],
        ["CLEARANCE", "Visitor · all decks"],
    ];
    fields.forEach(([label, value], i) => {
        const x = 56 + (i % 2) * 330;
        const y = 300 + Math.floor(i / 2) * 92;
        g.fillStyle = "#71717a";
        g.font = `500 14px ${mono}`;
        g.fillText(label, x, y);
        g.fillStyle = "#e5e5e5";
        g.font = `600 28px ${display}`;
        let v = value;
        while (g.measureText(v).width > 300 && v.length > 4) v = v.slice(0, -2);
        g.fillText(v === value ? v : `${v}…`, x, y + 36);
    });

    // Barcode and pass number
    let bx = 56;
    g.fillStyle = "rgba(229,229,229,0.8)";
    while (bx < 360) {
        const w = 1 + Math.floor(rand() * 4);
        g.fillRect(bx, 500, w, 56);
        bx += w + 2 + Math.floor(rand() * 4);
    }
    const passNo = Math.floor(rand() * 0xffff).toString(16).toUpperCase().padStart(4, "0");
    g.fillStyle = "#71717a";
    g.font = `500 13px ${mono}`;
    g.fillText(`PASS · ${callsign} · ${passNo}`, 56, 580);

    // Issuer
    g.textAlign = "right";
    g.fillStyle = "#a1a1aa";
    g.font = `500 14px ${mono}`;
    g.fillText("ISSUED BY MIIT DAGA", W - 56, 552);
    g.fillStyle = "#fbbf24";
    g.font = `600 20px ${display}`;
    g.fillText("miitdaga.dev", W - 56, 582);
    g.textAlign = "left";
    g.restore();

    // Edge
    g.strokeStyle = "rgba(255,255,255,0.16)";
    g.lineWidth = 2;
    g.beginPath();
    g.roundRect(1, 1, W - 2, H - 2, 36);
    g.stroke();

    return new Promise((resolve) => {
        canvas.toBlob((blob) => resolve(blob ? URL.createObjectURL(blob) : ""), "image/png");
    });
}

const actionClass =
    "inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.04] px-3.5 py-2 font-mono text-[11px] uppercase tracking-[0.18em] text-neutral-300 transition-colors hover:border-amber-300/50 hover:bg-amber-400/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300";

export const ContactActions = () => {
    // So "Save contact" can include the photo without a wait
    useEffect(() => {
        preloadContactPhoto();
    }, []);

    const [pass, setPass] = useState<{ url: string; callsign: string } | null>(null);
    const [busy, setBusy] = useState(false);
    const [mounted, setMounted] = useState(false);
    // Fixed for the life of the dialog, so adding a photo redraws the same pass
    const passInfo = useRef<{ callsign: string; origin: string; boarded: Date } | null>(null);
    const [photo, setPhoto] = useState<ImageBitmap | null>(null);
    const [camera, setCamera] = useState<MediaStream | null>(null);
    const [cameraError, setCameraError] = useState<string | null>(null);
    const fileRef = useRef<HTMLInputElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    useEffect(() => setMounted(true), []);

    const render = useCallback(async (withPhoto: ImageBitmap | null) => {
        const info = passInfo.current;
        if (!info) return;
        const url = await drawPass(info.callsign, info.origin, info.boarded, withPhoto);
        if (url) setPass({ url, callsign: info.callsign });
    }, []);

    const issuePass = useCallback(async () => {
        setBusy(true);
        passInfo.current = { callsign: readCallsign(), origin: readOrigin(), boarded: new Date() };
        await render(photo);
        setBusy(false);
    }, [render, photo]);

    const applyPhoto = useCallback(
        async (bitmap: ImageBitmap) => {
            setPhoto(bitmap);
            await render(bitmap);
        },
        [render],
    );

    const onFile = useCallback(
        async (e: React.ChangeEvent<HTMLInputElement>) => {
            const file = e.target.files?.[0];
            e.target.value = ""; // the same file can be picked again
            if (!file) return;
            try {
                await applyPhoto(await createImageBitmap(file));
            } catch {
                setCameraError("That file could not be read as an image.");
            }
        },
        [applyPhoto],
    );

    const stopCamera = useCallback(() => {
        setCamera((stream) => {
            stream?.getTracks().forEach((t) => t.stop());
            return null;
        });
    }, []);

    const startCamera = useCallback(async () => {
        setCameraError(null);
        if (!navigator.mediaDevices?.getUserMedia) {
            // No camera API (old browser, or not HTTPS): the file picker still
            // offers the camera on phones
            fileRef.current?.click();
            return;
        }
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: "user", width: { ideal: 720 }, height: { ideal: 720 } },
                audio: false,
            });
            setCamera(stream);
        } catch {
            setCameraError("Camera unavailable or permission denied. You can upload a photo instead.");
        }
    }, []);

    useEffect(() => {
        if (camera && videoRef.current) {
            videoRef.current.srcObject = camera;
            videoRef.current.play().catch(() => {});
        }
    }, [camera]);

    const capture = useCallback(async () => {
        const video = videoRef.current;
        if (!video || !video.videoWidth) return;
        const side = Math.min(video.videoWidth, video.videoHeight);
        const c = document.createElement("canvas");
        c.width = side;
        c.height = side;
        const g = c.getContext("2d");
        if (!g) return;
        // Mirrored, to match the preview the visitor was looking at
        g.translate(side, 0);
        g.scale(-1, 1);
        g.drawImage(video, (video.videoWidth - side) / 2, (video.videoHeight - side) / 2, side, side, 0, 0, side, side);
        stopCamera();
        await applyPhoto(await createImageBitmap(c));
    }, [stopCamera, applyPhoto]);

    const removePhoto = useCallback(async () => {
        setPhoto(null);
        await render(null);
    }, [render]);

    const close = useCallback(() => {
        stopCamera();
        setCameraError(null);
        setPass(null);
    }, [stopCamera]);

    // Never leave the camera on
    useEffect(() => () => camera?.getTracks().forEach((t) => t.stop()), [camera]);

    // The command palette asks for the pass by event (command-menu.tsx)
    useEffect(() => {
        const onOpen = () => issuePass();
        window.addEventListener("open-visitor-pass", onOpen);
        return () => window.removeEventListener("open-visitor-pass", onOpen);
    }, [issuePass]);

    useEffect(() => {
        if (!pass) return;
        const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
        window.addEventListener("keydown", onKey);
        const url = pass.url;
        return () => {
            window.removeEventListener("keydown", onKey);
            // Released once the dialog has had time to animate out
            setTimeout(() => URL.revokeObjectURL(url), 1000);
        };
    }, [pass, close]);

    return (
        <>
            <div className="flex flex-wrap items-center justify-center gap-3">
                <button type="button" onClick={saveContact} className={actionClass}>
                    <IconAddressBook className="h-4 w-4" stroke={1.6} />
                    Save contact
                </button>
                <button type="button" onClick={issuePass} disabled={busy} className={actionClass}>
                    <IconTicket className="h-4 w-4" stroke={1.6} />
                    {busy ? "Printing..." : "Get your visitor pass"}
                </button>
            </div>

            {mounted &&
                createPortal(
                    <AnimatePresence>
                        {pass && (
                            <motion.div
                                className="fixed inset-0 z-[99999] flex items-center justify-center px-4"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                role="dialog"
                                aria-modal="true"
                                aria-label="Your visitor pass"
                            >
                                <div className="absolute inset-0 bg-black/85 backdrop-blur-md" onClick={close} />
                                <motion.div
                                    className="relative flex w-full max-w-2xl flex-col items-center gap-5"
                                    initial={{ scale: 0.92, y: 24, rotateX: 12 }}
                                    animate={{ scale: 1, y: 0, rotateX: 0 }}
                                    exit={{ scale: 0.95, y: 12, opacity: 0 }}
                                    transition={{ type: "spring", stiffness: 240, damping: 24 }}
                                    style={{ perspective: 900 }}
                                >
                                    {camera ? (
                                        // Viewfinder: square, mirrored like a selfie camera
                                        <div className="flex flex-col items-center gap-4">
                                            <video
                                                ref={videoRef}
                                                playsInline
                                                muted
                                                className="aspect-square w-72 rounded-full border-4 border-amber-400/80 object-cover shadow-[0_0_40px_rgba(251,191,36,0.25)] sm:w-80"
                                                style={{ transform: "scaleX(-1)" }}
                                            />
                                            <div className="flex items-center gap-3">
                                                <button type="button" onClick={capture} className={actionClass}>
                                                    <IconCamera className="h-4 w-4" stroke={1.6} />
                                                    Capture
                                                </button>
                                                <button type="button" onClick={stopCamera} className={actionClass}>
                                                    <IconX className="h-4 w-4" stroke={1.6} />
                                                    Cancel
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img
                                            src={pass.url}
                                            alt={`Visitor pass for ${pass.callsign}`}
                                            className="w-full rounded-[22px] shadow-[0_30px_80px_-20px_rgba(0,0,0,0.9),0_0_40px_rgba(251,191,36,0.12)]"
                                        />
                                    )}
                                    {!camera && (
                                        <>
                                            <div className="flex flex-wrap items-center justify-center gap-3">
                                                <button type="button" onClick={() => fileRef.current?.click()} className={actionClass}>
                                                    <IconPhotoUp className="h-4 w-4" stroke={1.6} />
                                                    {photo ? "Change photo" : "Upload photo"}
                                                </button>
                                                <button type="button" onClick={startCamera} className={actionClass}>
                                                    <IconCamera className="h-4 w-4" stroke={1.6} />
                                                    Take photo
                                                </button>
                                                {photo && (
                                                    <button type="button" onClick={removePhoto} className={actionClass}>
                                                        <IconTrash className="h-4 w-4" stroke={1.6} />
                                                        Remove photo
                                                    </button>
                                                )}
                                            </div>
                                            <div className="flex flex-wrap items-center justify-center gap-3">
                                                <a href={pass.url} download={`visitor-pass-${pass.callsign}.png`} className={actionClass}>
                                                    <IconDownload className="h-4 w-4" stroke={1.6} />
                                                    Download pass
                                                </a>
                                                <button type="button" onClick={close} className={actionClass}>
                                                    <IconX className="h-4 w-4" stroke={1.6} />
                                                    Close
                                                </button>
                                            </div>
                                        </>
                                    )}
                                    <p className="text-center font-mono text-[11px] sm:text-[10px] uppercase tracking-[0.2em] text-neutral-500">
                                        {cameraError ?? "Your photo stays on your device. Nothing is uploaded."}
                                    </p>
                                    <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFile} />
                                </motion.div>
                            </motion.div>
                        )}
                    </AnimatePresence>,
                    document.body,
                )}
        </>
    );
};
