"use client";

import * as React from "react";
import { Command } from "cmdk";
import * as Dialog from "@radix-ui/react-dialog";
import { useRouter } from "next/navigation";
import {
    IconHome,
    IconUser, // Added this import
    IconCode,
    IconBriefcase,
    IconAward,
    IconMail,
    IconFileText,
    IconTerminal,
    IconBrandGithub,
    IconBrandLinkedin,
    IconSearch
} from "@tabler/icons-react";

export function CommandMenu() {
    const [open, setOpen] = React.useState(false);
    const router = useRouter();

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

    return (
        <Dialog.Root open={open} onOpenChange={setOpen}>
            <Dialog.Portal>
                {/* Backdrop */}
                <Dialog.Overlay className="fixed inset-0 z-[9998] bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />

                {/* Dialog Content */}
                <Dialog.Content className="fixed left-[50%] top-[20%] z-[9999] w-full max-w-lg translate-x-[-50%] outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 slide-in-from-top-2 px-4">

                    <Dialog.Title className="hidden">Global Command Menu</Dialog.Title>
                    <Dialog.Description className="hidden">Quick navigation and actions</Dialog.Description>

                    <div className="relative w-full overflow-hidden rounded-xl border border-white/10 bg-black/80 shadow-[0_0_40px_-10px_rgba(45,212,191,0.3)] backdrop-blur-xl ring-1 ring-white/10">
                        <Command className="w-full bg-transparent">
                            <div className="flex items-center border-b border-white/10 px-4">
                                <IconSearch className="mr-2 h-5 w-5 text-neutral-500" />
                                <Command.Input
                                    placeholder="Type a command or search..."
                                    className="flex h-12 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-neutral-500 text-white disabled:cursor-not-allowed disabled:opacity-50"
                                />
                                <div className="text-xs text-neutral-500 font-mono border border-white/10 px-1.5 py-0.5 rounded bg-white/5">ESC</div>
                            </div>

                            <Command.List className="max-h-[300px] overflow-y-auto overflow-x-hidden py-2 px-2 scrollbar-none">
                                <Command.Empty className="py-6 text-center text-sm text-neutral-500">
                                    No results found.
                                </Command.Empty>

                                <Command.Group heading="Navigation" className="text-xs font-medium text-neutral-500 px-2 mb-2 mt-2">
                                    <Item icon={<IconHome />} onSelect={() => runCommand(() => window.location.href = "#")}>
                                        Home
                                    </Item>
                                    <Item icon={<IconUser />} onSelect={() => runCommand(() => window.location.href = "#about-me")}>
                                        About Me
                                    </Item>
                                    <Item icon={<IconBriefcase />} onSelect={() => runCommand(() => window.location.href = "#workex")}>
                                        Experience
                                    </Item>
                                    <Item icon={<IconCode />} onSelect={() => runCommand(() => window.location.href = "#projects")}>
                                        Projects
                                    </Item>
                                    <Item icon={<IconAward />} onSelect={() => runCommand(() => window.location.href = "#skills-achievements")}>
                                        Skills & Achievements
                                    </Item>
                                    <Item icon={<IconMail />} onSelect={() => runCommand(() => window.location.href = "#contact")}>
                                        Contact
                                    </Item>
                                </Command.Group>

                                <Command.Separator className="my-2 h-px bg-white/10" />

                                <Command.Group heading="External Links" className="text-xs font-medium text-neutral-500 px-2 mb-2">
                                    <Item icon={<IconFileText />} onSelect={() => runCommand(() => window.open(process.env.NEXT_PUBLIC_RESUME_LINK, "_blank"))}>
                                        Resume
                                    </Item>
                                    <Item icon={<IconBrandGithub />} onSelect={() => runCommand(() => window.open("https://github.com/miit-daga", "_blank"))}>
                                        GitHub
                                    </Item>
                                    <Item icon={<IconBrandLinkedin />} onSelect={() => runCommand(() => window.open("https://www.linkedin.com/in/miit-daga", "_blank"))}>
                                        LinkedIn
                                    </Item>
                                </Command.Group>

                                <Command.Separator className="my-2 h-px bg-white/10" />

                                <Command.Group heading="System" className="text-xs font-medium text-neutral-500 px-2 mb-2">
                                    <Item icon={<IconTerminal />} onSelect={() => runCommand(() => window.open("/terminal.html", "_blank"))}>
                                        Terminal Mode
                                    </Item>
                                </Command.Group>

                            </Command.List>
                        </Command>
                    </div>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}

function Item({ children, icon, onSelect }: { children: React.ReactNode; icon: React.ReactNode; onSelect: () => void }) {
    return (
        <Command.Item
            onSelect={onSelect}
            className="relative flex cursor-pointer select-none items-center rounded-md px-2 py-2 text-sm text-neutral-300 outline-none hover:bg-white/10 hover:text-white data-[selected=true]:bg-white/10 data-[selected=true]:text-white transition-colors"
        >
            <span className="mr-2 h-4 w-4 opacity-70">{icon}</span>
            <span>{children}</span>
        </Command.Item>
    );
}