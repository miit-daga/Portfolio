"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import Heading from "./Heading";
import Socials from "./Socials";
import { IconMail, IconPhone, IconCheck, IconCopy, IconSend, IconX } from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { Galaxy } from "./ui/galaxy";

type ContactType = "email" | "phone" | null;

export function Contact() {
    const [emailCopied, setEmailCopied] = useState(false);
    const [phoneCopied, setPhoneCopied] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [modalType, setModalType] = useState<ContactType>(null);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
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
        <div className="relative w-full overflow-hidden pt-16 pb-10" id="contact">
            <Heading text="Let's Connect" />

            <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 lg:grid-cols-2 gap-10 items-center mt-10">

                {/* Left Side: Text */}
                <div className="flex flex-col items-center lg:items-start text-center lg:text-left z-20 order-2 lg:order-1">
                    <p className="text-base md:text-lg text-neutral-300 max-w-lg leading-relaxed">
                        I am currently open to new opportunities. Whether you have a question about my research, a project proposal, or just want to discuss the cosmos of code, my frequencies are open.
                    </p>

                    <div className="flex flex-col gap-6 mt-10 w-full items-center lg:items-start">
                        {/* Email */}
                        <div className="group relative w-fit">
                            <a
                                href="mailto:miitcodes27@gmail.com"
                                onClick={handleEmailClick}
                                onContextMenu={handleEmailContextMenu}
                                className={cn(
                                    "flex items-center gap-4 text-xl font-semibold transition-all duration-300 p-4 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 hover:border-teal-500/30",
                                    emailCopied ? "text-green-400" : "text-neutral-200"
                                )}
                            >
                                {emailCopied ? <IconCheck className="h-6 w-6" /> : <IconMail className="h-6 w-6 text-teal-400" />}
                                <span>{emailCopied ? "Email Copied!" : "miitcodes27@gmail.com"}</span>
                            </a>
                            <span className="absolute -bottom-6 left-0 right-0 text-center text-[10px] uppercase tracking-wider text-neutral-500 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none hidden md:block">
                                Left-click: Send • Right-click: Copy
                            </span>
                        </div>

                        {/* Phone */}
                        <div className="group relative w-fit">
                            <a
                                href="tel:+917003816564"
                                onClick={handlePhoneClick}
                                className={cn(
                                    "flex items-center gap-4 text-xl font-semibold transition-all duration-300 p-4 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 hover:border-teal-500/30",
                                    phoneCopied ? "text-green-400" : "text-neutral-200"
                                )}
                            >
                                {phoneCopied ? <IconCheck className="h-6 w-6" /> : <IconPhone className="h-6 w-6 text-teal-400" />}
                                <span>{phoneCopied ? "Number Copied!" : "+91 7003816564"}</span>
                            </a>
                            <span className="absolute -bottom-6 left-0 right-0 text-center text-[10px] uppercase tracking-wider text-neutral-500 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none hidden md:block">
                                Click to Copy
                            </span>
                        </div>
                    </div>

                    {/* Socials */}
                    <div className="mt-10 w-full">
                        <Socials className="justify-center lg:justify-start" />
                    </div>
                </div>

                {/* Right Side: GALAXY */}
                {/* Updated height for larger display on desktop */}
                <div className="relative h-[400px] lg:h-[600px] w-full flex items-center justify-center order-1 lg:order-2 overflow-visible">
                    <div className="absolute inset-0 bg-gradient-to-r from-teal-500/5 to-blue-500/5 blur-3xl opacity-20 rounded-full" />
                    <Galaxy />
                </div>
            </div>

            {/* Footer */}
            <div className="border-t border-white/10 mt-20 pt-8 pb-4 flex flex-col items-center gap-4">
                <p className="text-neutral-500 text-sm">
                    © {new Date().getFullYear()} Miit Daga. All rights reserved.
                </p>

                <div
                    className="hidden md:flex group flex-col md:flex-row items-center gap-2 opacity-30 hover:opacity-100 transition-opacity duration-500 cursor-help"
                    title="Enter this code on your keyboard!"
                >
                    <span className="text-xs font-mono text-neutral-400 uppercase tracking-widest group-hover:text-teal-400 transition-colors">
                        Initiate Warp Drive:
                    </span>
                    <div className="flex gap-1.5">
                        <Kbd>↑</Kbd><Kbd>↑</Kbd>
                        <Kbd>↓</Kbd><Kbd>↓</Kbd>
                        <Kbd>←</Kbd><Kbd>→</Kbd>
                        <Kbd>←</Kbd><Kbd>→</Kbd>
                        <Kbd>B</Kbd><Kbd>A</Kbd>
                    </div>
                </div>
            </div>

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

const Kbd = ({ children }: { children: React.ReactNode }) => {
    return (
        <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1 rounded bg-white/10 border border-white/20 text-[10px] font-bold font-mono text-neutral-300 shadow-[0_2px_0_rgba(255,255,255,0.1)] group-hover:bg-teal-500/20 group-hover:border-teal-500/50 group-hover:text-teal-200 transition-all duration-300">
            {children}
        </span>
    );
};