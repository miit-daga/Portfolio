"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import Heading from "./Heading";
import Socials from "./Socials";
import { IconMail, IconPhone, IconCheck, IconCopy, IconSend, IconX } from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";
import { useMailCourier } from "./ui/mail-courier";
import { BigCrunchKeys, MissionStatus, VisitLog } from "./ui/footer-console";

// The scenes at the foot of the page (UFO, crew card with its QR library,
// globe, pass printer) load in their own chunks, and only once the visitor
// reaches Projects (or lands on Contact itself): until then neither their code
// nor their data (the globe's location, the radar's guestbook) is fetched.
// The placeholders hold their space so nothing shifts when they arrive.
const CrewCardSpace = () => <div className="h-[237px] w-[336px] sm:h-[253px] sm:w-[362px]" />;
const GlobeSpace = () => <div style={{ width: 280, height: 350 }} />;
const ActionsSpace = () => <div className="h-[38px]" />;
const SignalRings = dynamic(() => import("./ui/signal-rings").then((m) => m.SignalRings), { ssr: false });
const CrewCard = dynamic(() => import("./ui/crew-card").then((m) => m.CrewCard), { ssr: false, loading: CrewCardSpace });
const SignalGlobe = dynamic(() => import("./ui/signal-globe").then((m) => m.SignalGlobe), { ssr: false, loading: GlobeSpace });
const ContactActions = dynamic(() => import("./ui/contact-actions").then((m) => m.ContactActions), { ssr: false, loading: ActionsSpace });
const GuestbookSignal = dynamic(() => import("./ui/radar-guestbook").then((m) => m.GuestbookSignal), { ssr: false });
import { accentVars, getSection } from "@/constants/sections";

type ContactType = "email" | "phone" | null;

const CONTACT = getSection("contact");

const MAILTO = "mailto:miitcodes27@gmail.com?subject=Hello%20from%20miitdaga.dev";

export function Contact() {
    // "Send a message" is delivered by the scene's saucer (mail-courier.tsx)
    const courier = useMailCourier(MAILTO);
    const [emailCopied, setEmailCopied] = useState(false);
    const [phoneCopied, setPhoneCopied] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [modalType, setModalType] = useState<ContactType>(null);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    // The footer scenes come in as Projects comes into view, or Contact itself
    // (a link straight to it skips Projects)
    const [near, setNear] = useState(false);
    useEffect(() => {
        const targets = [document.getElementById("projects"), document.getElementById("contact")].filter((el): el is HTMLElement => !!el);
        if (!targets.length || typeof IntersectionObserver === "undefined") {
            setNear(true);
            return;
        }
        const io = new IntersectionObserver((entries) => {
            if (entries.some((e) => e.isIntersecting)) {
                setNear(true);
                io.disconnect();
            }
        });
        targets.forEach((t) => io.observe(t));
        return () => io.disconnect();
    }, []);

    const copyEmail = () => {
        navigator.clipboard.writeText("miitcodes27@gmail.com");
        setEmailCopied(true);
        setTimeout(() => setEmailCopied(false), 2000);
    };

    const handleEmailClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
        if (typeof window !== "undefined" && window.innerWidth < 768) {
            e.preventDefault();
            setModalType("email");
            setShowModal(true);
        }
    };

    const handleEmailContextMenu = (e: React.MouseEvent) => {
        e.preventDefault();
        copyEmail();
    };

    const copyPhone = () => {
        navigator.clipboard.writeText("+917003816564");
        setPhoneCopied(true);
        setTimeout(() => setPhoneCopied(false), 2000);
    };

    const handlePhoneClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
        e.preventDefault();
        if (typeof window !== "undefined" && window.innerWidth < 768) {
            setModalType("phone");
            setShowModal(true);
        } else {
            copyPhone();
        }
    };

    const handleModalPrimaryAction = () => {
        if (modalType === "email") {
            window.location.href = "mailto:miitcodes27@gmail.com";
        } else if (modalType === "phone") {
            window.location.href = "tel:+917003816564";
        }
        setShowModal(false);
    };

    const handleModalCopyAction = () => {
        if (modalType === "email") {
            copyEmail();
        } else if (modalType === "phone") {
            copyPhone();
        }
        setShowModal(false);
    };

    return (
        <div className="relative w-full overflow-hidden pt-16 pb-10" id="contact" style={accentVars(CONTACT)}>
            <Heading section="contact" />

            <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 lg:grid-cols-2 gap-10 items-center mt-6">

                {/* Left Side: Text */}
                <div className="flex flex-col items-center lg:items-start text-center lg:text-left z-20 order-2 lg:order-1">
                    <p className="text-base md:text-lg text-neutral-300 max-w-lg leading-relaxed">
                        If something I’m building resonates with you, let’s connect. Whether it’s a question about my research, a project idea, or a conversation in the cosmos of code, my frequencies are open.
                    </p>

                    {/* The one call to action, above the rows and the scenery */}
                    <a
                        href={MAILTO}
                        onClick={courier.launch}
                        className="group mt-8 inline-flex items-center gap-3 rounded-full px-7 py-3.5 text-base font-semibold text-neutral-950 shadow-[0_0_32px_rgba(251,191,36,0.35)] transition-all duration-300 hover:scale-[1.03] hover:shadow-[0_0_44px_rgba(251,191,36,0.55)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                        style={{ background: `linear-gradient(135deg, ${CONTACT.pale}, ${CONTACT.light} 45%, ${CONTACT.hex})` }}
                    >
                        <IconSend className="h-5 w-5 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                        Send a message
                    </a>

                    <div className="flex flex-col gap-6 mt-8 w-full items-center lg:items-start">
                        {/* Email */}
                        <div className="group relative w-fit">
                            <a
                                href="mailto:miitcodes27@gmail.com"
                                onClick={handleEmailClick}
                                onContextMenu={handleEmailContextMenu}
                                className={cn(
                                    "flex items-center gap-4 text-xl font-semibold transition-all duration-300 p-4 rounded-xl bg-white/5 hover:bg-white/10 pulse-border",
                                    emailCopied ? "text-green-400" : "text-neutral-200"
                                )}
                            >
                                {emailCopied ? <IconCheck className="h-6 w-6" /> : <IconMail className="h-6 w-6" style={{ color: CONTACT.hex }} />}
                                <span>{emailCopied ? "Email Copied!" : "miitcodes27@gmail.com"}</span>
                            </a>
                            <span className="absolute -bottom-6 left-0 right-0 text-center text-[11px] sm:text-[10px] uppercase tracking-wider text-neutral-500 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none hidden md:block">
                                Left-click: Send • Right-click: Copy
                            </span>
                        </div>

                        {/* Phone */}
                        <div className="group relative w-fit">
                            <a
                                href="tel:+917003816564"
                                onClick={handlePhoneClick}
                                className={cn(
                                    "flex items-center gap-4 text-xl font-semibold transition-all duration-300 p-4 rounded-xl bg-white/5 hover:bg-white/10 pulse-border",
                                    phoneCopied ? "text-green-400" : "text-neutral-200"
                                )}
                            >
                                {phoneCopied ? <IconCheck className="h-6 w-6" /> : <IconPhone className="h-6 w-6" style={{ color: CONTACT.hex }} />}
                                <span>{phoneCopied ? "Number Copied!" : "+91 7003816564"}</span>
                            </a>
                            <span className="absolute -bottom-6 left-0 right-0 text-center text-[11px] sm:text-[10px] uppercase tracking-wider text-neutral-500 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none hidden md:block">
                                Click to Copy
                            </span>
                        </div>
                    </div>

                    {/* Socials */}
                    <div className="mt-10 w-full">
                        <Socials className="justify-center lg:justify-start" />
                    </div>
                </div>

                {/* Right Side: SIGNAL BEACON */}
                <div className="relative h-[360px] lg:h-[440px] w-full flex items-center justify-center order-1 lg:order-2 overflow-visible">
                    <div className="absolute inset-0 bg-gradient-to-r from-teal-500/5 to-blue-500/5 blur-3xl opacity-20 rounded-full" />
                    {near && <SignalRings />}
                    {/* The radar's guestbook: sign it here, read it on the blips */}
                    <div className="absolute inset-x-0 bottom-0 z-30 flex justify-center px-2">
                        {near && <GuestbookSignal />}
                    </div>
                </div>
            </div>

            {/* Crew ID + live signal path */}
            <div className="max-w-7xl mx-auto px-4 mt-20 grid grid-cols-1 lg:grid-cols-2 gap-14 items-center">
                <div className="flex flex-col items-center gap-5">
                    {near ? <CrewCard /> : <CrewCardSpace />}
                    {near ? <ContactActions /> : <ActionsSpace />}
                </div>
                <div className="flex justify-center">
                    {near ? <SignalGlobe /> : <GlobeSpace />}
                </div>
            </div>

            {/* Footer. On phones it ends well below the Big Crunch keys, so the
                back-to-top rocket (fixed, bottom right) does not sit on them */}
            <div className="border-t border-white/10 mt-20 pt-8 pb-28 md:pb-4 flex flex-col items-center gap-4">
                {/* Clocks and callsign, the visit so far, and the Big Crunch keys (footer-console.tsx) */}
                <MissionStatus accent={CONTACT.hex} />
                <VisitLog />
                <p className="text-neutral-500 text-sm">
                    © {new Date().getFullYear()} Miit Daga. All rights reserved.
                </p>
                {/* The 3D games (app/arcade) */}
                <a
                    href="/arcade"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-[11px] uppercase tracking-[0.25em] text-neutral-500 transition-colors hover:text-teal-300 sm:text-xs"
                >
                    ▶ Crew arcade · Asteroid Run · Stack the Station
                </a>
                <BigCrunchKeys />
            </div>

            {courier.node}

            {/* PORTAL for Mobile Modals */}
            {mounted && createPortal(
                <AnimatePresence>
                    {showModal && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-[99999] flex items-center justify-center px-4"
                            style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh' }}
                        >
                            <div
                                className="absolute inset-0 bg-black/90 backdrop-blur-md"
                                onClick={() => setShowModal(false)}
                            />
                            <motion.div
                                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                                animate={{ scale: 1, opacity: 1, y: 0 }}
                                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                                className="relative z-[999999] bg-neutral-900 border border-white/20 rounded-2xl p-6 w-full max-w-sm shadow-[0_0_30px_rgba(45,212,191,0.15)]"
                            >
                                <button
                                    onClick={() => setShowModal(false)}
                                    className="absolute top-4 right-4 text-neutral-400 hover:text-white p-1"
                                >
                                    <IconX size={20} />
                                </button>

                                <h3 className="text-xl font-bold text-white mb-2">
                                    {modalType === "email" ? "Email" : "Call"}
                                </h3>
                                <p className="text-neutral-400 text-sm mb-6">How would you like to proceed?</p>

                                <div className="space-y-3">
                                    <button
                                        onClick={handleModalPrimaryAction}
                                        className="w-full flex items-center justify-center gap-3 p-4 rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/20 font-medium hover:bg-teal-500/20 active:bg-teal-500/30 transition-colors"
                                    >
                                        {modalType === "email" ? <IconSend size={20} /> : <IconPhone size={20} />}
                                        {modalType === "email" ? "Send Email" : "Call Now"}
                                    </button>
                                    <button
                                        onClick={handleModalCopyAction}
                                        className="w-full flex items-center justify-center gap-3 p-4 rounded-xl bg-white/5 text-neutral-200 border border-white/10 font-medium hover:bg-white/10 active:bg-white/15 transition-colors"
                                    >
                                        <IconCopy size={20} />
                                        {modalType === "email" ? "Copy Address" : "Copy Number"}
                                    </button>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>,
                document.body
            )}
        </div>
    );
}
