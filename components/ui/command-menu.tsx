"use client";

import * as React from "react";
import { Command } from "cmdk";
import * as Dialog from "@radix-ui/react-dialog";
import {
    IconHome,
    IconUser,
    IconCode,
    IconBriefcase,
    IconAward,
    IconMail,
    IconFileText,
    IconTerminal,
    IconBrandGithub,
    IconBrandLinkedin,
    IconSearch,
    IconArrowUpRight,
    IconTarget,
} from "@tabler/icons-react";
import { warpForJump } from "@/components/ui/warp-overlay";

export function CommandMenu() {
    const [open, setOpen] = React.useState(false);

    React.useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                setOpen((open) => !open);
            }
        };
        document.addEventListener("keydown", down);
        return () => document.removeEventListener("keydown", down);
    }, []);

    const runCommand = React.useCallback((command: () => void) => {
        setOpen(false);
        command();
    }, []);

    // In-page jumps get a hyperspace streak only when skipping several sections
    const navTo = React.useCallback((hash: string) => {
        warpForJump(hash, 800);
        window.location.href = hash;
    }, []);

    return (
        <Dialog.Root open={open} onOpenChange={setOpen}>
            <Dialog.Portal>
                {/* Backdrop */}
                <Dialog.Overlay className="fixed inset-0 z-[9998] bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />

                {/* Dialog Content */}
                <Dialog.Content className="fixed left-[50%] top-[20%] z-[9999] w-full max-w-lg translate-x-[-50%] outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 slide-in-from-top-2 px-4">

                    <Dialog.Title className="hidden">Global Command Menu</Dialog.Title>
                    <Dialog.Description className="hidden">Quick navigation and actions</Dialog.Description>

                    <div className="relative w-full overflow-hidden rounded-xl border border-teal-500/15 bg-black/80 shadow-[0_0_50px_-12px_rgba(45,212,191,0.45)] backdrop-blur-xl ring-1 ring-white/10">
                        {/* Top accent line */}
                        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-teal-400/60 to-transparent" />

                        <Command className="w-full bg-transparent [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.15em] [&_[cmdk-group-heading]]:text-teal-400/70">
                            <div className="flex items-center border-b border-white/10 px-4">
                                <IconSearch className="mr-3 h-5 w-5 text-teal-400/80" />
                                <Command.Input
                                    placeholder="Type a command or search..."
                                    className="flex h-12 w-full bg-transparent py-3 text-sm outline-none placeholder:text-neutral-500 text-white caret-teal-400"
                                />
                                <kbd className="ml-2 rounded border border-white/10 bg-white/5 px-1.5 py-0.5 font-mono text-[10px] text-neutral-400">ESC</kbd>
                            </div>

                            <Command.List className="max-h-[320px] overflow-y-auto overflow-x-hidden p-2 scrollbar-none">
                                <Command.Empty className="py-8 text-center text-sm text-neutral-500">
                                    No results found.
                                </Command.Empty>

                                <Command.Group heading="Navigation">
                                    <Item icon={<IconHome />} onSelect={() => runCommand(() => navTo("#"))}>Home</Item>
                                    <Item icon={<IconUser />} onSelect={() => runCommand(() => navTo("#about-me"))}>About Me</Item>
                                    <Item icon={<IconBriefcase />} onSelect={() => runCommand(() => navTo("#workex"))}>Experience</Item>
                                    <Item icon={<IconCode />} onSelect={() => runCommand(() => navTo("#projects"))}>Projects</Item>
                                    <Item icon={<IconAward />} onSelect={() => runCommand(() => navTo("#skills-achievements"))}>Skills & Achievements</Item>
                                    <Item icon={<IconMail />} onSelect={() => runCommand(() => navTo("#contact"))}>Contact</Item>
                                </Command.Group>

                                <Command.Separator className="my-2 h-px bg-white/10" />

                                <Command.Group heading="External Links">
                                    <Item external icon={<IconFileText />} onSelect={() => runCommand(() => window.open(process.env.NEXT_PUBLIC_RESUME_LINK, "_blank"))}>Resume</Item>
                                    <Item external icon={<IconBrandGithub />} onSelect={() => runCommand(() => window.open("https://github.com/miit-daga", "_blank"))}>GitHub</Item>
                                    <Item external icon={<IconBrandLinkedin />} onSelect={() => runCommand(() => window.open("https://www.linkedin.com/in/miit-daga", "_blank"))}>LinkedIn</Item>
                                </Command.Group>

                                <Command.Separator className="my-2 h-px bg-white/10" />

                                <Command.Group heading="System">
                                    <Item external icon={<IconTerminal />} onSelect={() => runCommand(() => window.open("/terminal.html", "_blank"))}>Terminal Mode</Item>
                                    <Item icon={<IconTarget />} onSelect={() => runCommand(() => window.dispatchEvent(new CustomEvent("defense-mode")))}>Initiate Defense Mode</Item>
                                </Command.Group>
                            </Command.List>

                            {/* Footer key hints */}
                            <div className="flex items-center justify-between border-t border-white/10 px-4 py-2 text-[10px] text-neutral-500">
                                <div className="flex items-center gap-3">
                                    <span className="flex items-center gap-1"><Kbd>↑</Kbd><Kbd>↓</Kbd> navigate</span>
                                    <span className="flex items-center gap-1"><Kbd>↵</Kbd> open</span>
                                </div>
                                <span className="flex items-center gap-1"><Kbd>esc</Kbd> close</span>
                            </div>
                        </Command>
                    </div>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}

function Kbd({ children }: { children: React.ReactNode }) {
    return (
        <kbd className="inline-flex min-w-[16px] items-center justify-center rounded border border-white/10 bg-white/5 px-1 font-mono text-[10px] text-neutral-400">
            {children}
        </kbd>
    );
}

function Item({
    children,
    icon,
    onSelect,
    external = false,
}: {
    children: React.ReactNode;
    icon: React.ReactNode;
    onSelect: () => void;
    external?: boolean;
}) {
    return (
        <Command.Item
            onSelect={onSelect}
            className="group relative flex cursor-pointer select-none items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-neutral-300 outline-none transition-colors data-[selected=true]:bg-teal-500/10 data-[selected=true]:text-white"
        >
            {/* Left accent bar on the active row */}
            <span className="absolute left-0 top-1/2 h-5 w-[2px] -translate-y-1/2 rounded-full bg-teal-400 opacity-0 transition-opacity group-data-[selected=true]:opacity-100" />
            <span className="text-neutral-500 transition-colors group-data-[selected=true]:text-teal-300 [&>svg]:h-[18px] [&>svg]:w-[18px]">
                {icon}
            </span>
            <span className="flex-1">{children}</span>
            {external ? (
                <IconArrowUpRight className="h-3.5 w-3.5 text-neutral-600 transition-colors group-data-[selected=true]:text-teal-300" />
            ) : (
                <span className="font-mono text-[11px] text-neutral-600 opacity-0 transition-opacity group-data-[selected=true]:opacity-100">↵</span>
            )}
        </Command.Item>
    );
}
