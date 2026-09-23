"use client";

import * as React from "react";
import { Command } from "cmdk";
import * as Dialog from "@radix-ui/react-dialog";
import {
    IconHome,
    IconFileText,
    IconTerminal,
    IconBrandGithub,
    IconBrandLinkedin,
    IconSearch,
    IconArrowUpRight,
    IconTarget,
    IconCopy,
    IconDownload,
    IconAddressBook,
    IconTicket,
    IconAlien,
    IconStars,
    IconMoon,
    IconSunrise,
    IconKeyboard,
    IconSun,
    IconChevronRight,
    IconDiamond,
    IconHandGrab,
    IconMoodHappy,
    IconUfo,
    IconSatellite,
    IconMeteor,
    IconDeviceGamepad2,
    IconArrowBarToDown,
    IconSignature,
} from "@tabler/icons-react";
import { warpForJump } from "@/components/ui/warp-overlay";
import { RESUME_PAGE, RESUME_DOWNLOAD_URL } from "@/lib/resume";
import { SECTIONS } from "@/constants/sections";
import { SKILL_USAGE, FALLBACK_USAGE } from "@/constants/skill-usage";
import { saveContact } from "@/components/ui/contact-actions";
import { glideTo } from "@/lib/glide";
import { FRAGMENT_IDS, FRAGMENTS_STORAGE_KEY } from "@/components/ui/collectibles";
import { OrcidIcon } from "@/components/ui/orcid-icon";
import { ORCID_URL } from "@/lib/orcid";

// The Cmd/Ctrl+K palette.
//
//   Navigation   every section in page order, in its own colour, with the one
//                you are in marked
//   Search       type two or more letters and it searches the page itself:
//                work, education, skills, achievements, projects, papers.
//                Picking a result glides there and highlights it
//   Actions      copy the email, download the resume, save the contact,
//                print a visitor pass
//   Easter eggs  the hidden things, findable
//   > command    anything after ">" runs in the terminal (terminal.html?cmd=)

const EMAIL = "miitcodes27@gmail.com";

type Hit = { id: string; label: string; section: string; hint?: string; keywords: string[]; el: Element; after?: (el: Element) => void };

// Built from the page when the palette opens, so it always matches what is
// on screen (projects arrive from GitHub after load)
function indexPage(): Hit[] {
    const hits: Hit[] = [];
    // Each piece of text on its own, joined by spaces: textContent runs
    // neighbouring labels together ("JournalScientific"), and a search that
    // matches at the start of words then never finds them
    const text = (el: Element | null | undefined) => {
        if (!el) return "";
        const parts: string[] = [];
        const walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
        for (let n = walk.nextNode(); n; n = walk.nextNode()) parts.push(n.nodeValue || "");
        return parts.join(" ").replace(/\s+/g, " ").trim();
    };
    const add = (h: Omit<Hit, "id">) => hits.push({ ...h, id: `${h.section}:${h.label}:${hits.length}` });

    document.querySelectorAll("#workex [role=button]").forEach((card) => {
        const company = text(card.querySelector("h3"));
        if (!company) return;
        add({ label: company, section: "Work Experience", hint: text(card.querySelector("h3 + p")), keywords: [text(card)], el: card });
    });
    document.querySelectorAll("#education h3, #education p.font-display").forEach((el) => {
        const name = text(el);
        if (name) add({ label: name, section: "Education", keywords: [text(el.parentElement)], el: el.parentElement ?? el });
    });
    document.querySelectorAll("#skills-achievements li").forEach((li) => {
        const skill = text(li);
        if (!skill) return;
        const trail = (SKILL_USAGE[skill] ?? FALLBACK_USAGE).map((u) => u.label).join(" · ");
        // Selecting shows its trail in the panel readout
        add({ label: skill, section: "Skills", hint: trail, keywords: [trail], el: li, after: (el) => (el as HTMLElement).click() });
    });
    document.querySelectorAll("#skills-achievements h4").forEach((h) => {
        const card = h.closest("a") ?? h;
        add({ label: text(h), section: "Achievements", keywords: [text(card)], el: card });
    });
    document.querySelectorAll("#projects h4").forEach((h) => {
        const card = h.closest("a") ?? h;
        add({ label: text(h), section: "Projects", keywords: [text(card).slice(0, 400)], el: card });
    });
    document.querySelectorAll("#publications h4").forEach((h) => {
        const card = h.closest(".group") ?? h;
        // The whole abstract too, which is not on screen while the plain-English version shows
        const extra = card.querySelector("[data-search]")?.getAttribute("data-search") ?? "";
        add({ label: text(h), section: "Publications", keywords: [`${text(card)} ${extra}`.slice(0, 4000)], el: card });
    });
    return hits;
}

// Where each cosmic fragment hides (app/page.tsx), for the hunt's hint
const FRAGMENT_SECTION: Record<string, string> = {
    workex: "workex",
    education: "education",
    skills: "skills-achievements",
    projects: "projects",
    publications: "publications",
};

// The fragment hunt's progress, read straight from storage: the palette sits
// outside the page's CollectiblesProvider
function fragmentsFound(): string[] {
    try {
        const raw = JSON.parse(sessionStorage.getItem(FRAGMENTS_STORAGE_KEY) || "[]");
        return Array.isArray(raw) ? raw : [];
    } catch {
        return [];
    }
}

// Which section the middle of the screen is in
function currentSectionId(): string {
    if (window.scrollY < window.innerHeight * 0.5) return "";
    const mid = window.innerHeight / 2;
    for (const s of SECTIONS) {
        const r = document.getElementById(s.id)?.getBoundingClientRect();
        if (r && r.top <= mid && r.bottom >= mid) return s.id;
    }
    return "";
}

// Whole-word-prefix matching. cmdk's default fuzzy score treats a query as
// scattered letters, which across a long card's text matches nearly anything.
// Every word typed must begin a word in the item (label first, then its
// keywords); a match on the label itself ranks above one found only in the text.
function paletteFilter(value: string, search: string, keywords?: string[]): number {
    const words = search.toLowerCase().split(/\s+/).filter(Boolean);
    if (!words.length) return 1;
    const label = value.toLowerCase();
    const body = `${label} ${(keywords ?? []).join(" ").toLowerCase()}`;
    const starts = (hay: string, w: string) => hay.startsWith(w) || hay.includes(` ${w}`) || hay.includes(`(${w}`) || hay.includes(`-${w}`);
    if (!words.every((w) => starts(body, w))) return 0;
    const head = (keywords?.[0] ?? "").toLowerCase();
    return words.every((w) => starts(head, w) || starts(label, w)) ? 1 : 0.4;
}

export function CommandMenu({ defaultOpen = false }: { defaultOpen?: boolean }) {
    // defaultOpen: the lazy loader mounts this on the first Cmd+K, already open
    const [open, setOpen] = React.useState(defaultOpen);
    const [query, setQuery] = React.useState("");
    const [hits, setHits] = React.useState<Hit[]>([]);
    const [here, setHere] = React.useState("");
    const [toast, setToast] = React.useState<string | null>(null);
    const toastTimer = React.useRef<number | null>(null);

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

    // Fresh index and position every time it opens
    React.useEffect(() => {
        if (!open) return;
        setQuery("");
        setHits(indexPage());
        setHere(currentSectionId());
    }, [open]);

    const notify = React.useCallback((msg: string) => {
        setToast(msg);
        if (toastTimer.current) clearTimeout(toastTimer.current);
        toastTimer.current = window.setTimeout(() => setToast(null), 2600);
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

    const q = query.trim();
    const terminalCmd = q.startsWith(">") ? q.slice(1).trim() : null;
    const searching = terminalCmd === null && q.length >= 2;
    const skyParam = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("sky") : null;
    // Read when the palette opens
    const found = open ? fragmentsFound() : [];
    const nextFragment = FRAGMENT_IDS.find((f) => !found.includes(f));

    // Glide to something once the jump to its section has landed, then poke it
    const jumpThen = (hash: string, selector: string, then?: (el: HTMLElement) => void) => {
        navTo(hash);
        window.setTimeout(() => {
            const el = document.querySelector<HTMLElement>(selector);
            if (el) glideTo(el, then ? () => then(el) : undefined);
        }, 900);
    };

    return (
        <>
            <Dialog.Root open={open} onOpenChange={setOpen}>
                <Dialog.Portal>
                    {/* Backdrop */}
                    <Dialog.Overlay className="fixed inset-0 z-[9998] bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />

                    {/* Dialog Content */}
                    <Dialog.Content className="fixed left-[50%] top-[20%] z-[9999] w-full max-w-lg translate-x-[-50%] outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 slide-in-from-top-2 px-4">
                        <Dialog.Title className="hidden">Global Command Menu</Dialog.Title>
                        <Dialog.Description className="hidden">Quick navigation, search and actions</Dialog.Description>

                        <div className="relative w-full overflow-hidden rounded-xl border border-teal-500/15 bg-black/80 shadow-[0_0_50px_-12px_rgba(45,212,191,0.45)] backdrop-blur-xl ring-1 ring-white/10">
                            {/* Top accent line */}
                            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-teal-400/60 to-transparent" />

                            <Command
                                // Terminal mode shows its own single row, unfiltered
                                shouldFilter={terminalCmd === null}
                                filter={paletteFilter}
                                className="w-full bg-transparent [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.15em] [&_[cmdk-group-heading]]:text-teal-400/70"
                            >
                                <div className="flex items-center border-b border-white/10 px-4">
                                    {terminalCmd !== null ? (
                                        <IconChevronRight className="mr-3 h-5 w-5 text-teal-400/80" />
                                    ) : (
                                        <IconSearch className="mr-3 h-5 w-5 text-teal-400/80" />
                                    )}
                                    <Command.Input
                                        value={query}
                                        onValueChange={setQuery}
                                        placeholder="Search the site, or > for a terminal command..."
                                        className="flex h-12 w-full bg-transparent py-3 text-sm outline-none placeholder:text-neutral-500 text-white caret-teal-400"
                                    />
                                    <kbd className="ml-2 rounded border border-white/10 bg-white/5 px-1.5 py-0.5 font-mono text-[10px] text-neutral-400">ESC</kbd>
                                </div>

                                <Command.List className="max-h-[360px] overflow-y-auto overflow-x-hidden p-2 scrollbar-none">
                                    <Command.Empty className="py-8 text-center text-sm text-neutral-500">
                                        Nothing matches. Try a skill, a company or a paper.
                                    </Command.Empty>

                                    {terminalCmd !== null ? (
                                        <Command.Group heading="Terminal">
                                            <Item
                                                value={`terminal ${terminalCmd}`}
                                                external
                                                icon={<IconTerminal />}
                                                onSelect={() =>
                                                    runCommand(() =>
                                                        window.open(terminalCmd ? `/terminal.html?cmd=${encodeURIComponent(terminalCmd)}` : "/terminal.html", "_blank"),
                                                    )
                                                }
                                                hint={terminalCmd ? "opens the terminal with it running" : "try  > which gcp,  > git log,  > dig miitdaga.dev"}
                                            >
                                                {terminalCmd ? (
                                                    <>
                                                        Run <span className="font-mono text-teal-300">{terminalCmd}</span> in the terminal
                                                    </>
                                                ) : (
                                                    "Type a terminal command"
                                                )}
                                            </Item>
                                        </Command.Group>
                                    ) : (
                                        <>
                                            {searching && hits.length > 0 && (
                                                <>
                                                    <Command.Group heading="On this page">
                                                        {hits.map((h) => (
                                                            <Item
                                                                key={h.id}
                                                                value={h.id}
                                                                keywords={[h.label, h.section, ...h.keywords]}
                                                                icon={<IconSearch />}
                                                                hint={h.hint ? `${h.section} · ${h.hint}` : h.section}
                                                                onSelect={() => runCommand(() => glideTo(h.el, h.after ? () => h.after?.(h.el) : undefined))}
                                                            >
                                                                {h.label}
                                                            </Item>
                                                        ))}
                                                    </Command.Group>
                                                    <Command.Separator className="my-2 h-px bg-white/10" />
                                                </>
                                            )}

                                            <Command.Group heading="Navigation">
                                                <Item value="home top hero" icon={<IconHome />} tag={here === "" ? "you are here" : undefined} onSelect={() => runCommand(() => navTo("#"))}>
                                                    Home
                                                </Item>
                                                {SECTIONS.map((s) => (
                                                    <Item
                                                        key={s.id}
                                                        value={`section ${s.label} ${s.eyebrow ?? ""}`}
                                                        icon={<span className="block h-2.5 w-2.5 rounded-full" style={{ background: s.hex, boxShadow: `0 0 8px ${s.hex}` }} />}
                                                        tag={here === s.id ? "you are here" : undefined}
                                                        onSelect={() => runCommand(() => navTo(`#${s.id}`))}
                                                    >
                                                        {s.id === "about-me" ? "About Me" : s.label}
                                                    </Item>
                                                ))}
                                            </Command.Group>

                                            <Command.Separator className="my-2 h-px bg-white/10" />

                                            <Command.Group heading="Actions">
                                                <Item
                                                    value="copy email address"
                                                    icon={<IconCopy />}
                                                    hint={EMAIL}
                                                    onSelect={() =>
                                                        runCommand(() => {
                                                            navigator.clipboard?.writeText(EMAIL).then(
                                                                () => notify(`Copied ${EMAIL}`),
                                                                () => notify(EMAIL),
                                                            );
                                                        })
                                                    }
                                                >
                                                    Copy email
                                                </Item>
                                                <Item
                                                    value="download resume pdf cv"
                                                    icon={<IconDownload />}
                                                    onSelect={() =>
                                                        runCommand(() => {
                                                            window.location.href = RESUME_DOWNLOAD_URL;
                                                            notify("Downloading the resume");
                                                        })
                                                    }
                                                >
                                                    Download resume
                                                </Item>
                                                <Item value="save contact vcard phone" icon={<IconAddressBook />} onSelect={() => runCommand(() => { saveContact(); notify("Contact card saved"); })}>
                                                    Save contact
                                                </Item>
                                                <Item
                                                    value="visitor pass boarding ticket"
                                                    icon={<IconTicket />}
                                                    onSelect={() =>
                                                        runCommand(() => {
                                                            navTo("#contact");
                                                            window.setTimeout(() => window.dispatchEvent(new CustomEvent("open-visitor-pass")), 900);
                                                        })
                                                    }
                                                >
                                                    Get your visitor pass
                                                </Item>
                                                <Item
                                                    value="sign the guestbook leave a signal message radar"
                                                    icon={<IconSignature />}
                                                    onSelect={() =>
                                                        runCommand(() => {
                                                            navTo("#contact");
                                                            window.setTimeout(() => window.dispatchEvent(new CustomEvent("open-guestbook")), 900);
                                                        })
                                                    }
                                                >
                                                    Sign the guestbook
                                                </Item>
                                            </Command.Group>

                                            <Command.Separator className="my-2 h-px bg-white/10" />

                                            <Command.Group heading="Links">
                                                <Item value="resume page view" external icon={<IconFileText />} onSelect={() => runCommand(() => window.open(RESUME_PAGE, "_blank"))}>
                                                    Resume
                                                </Item>
                                                <Item value="github code" external icon={<IconBrandGithub />} onSelect={() => runCommand(() => window.open("https://github.com/miit-daga", "_blank"))}>
                                                    GitHub
                                                </Item>
                                                <Item value="linkedin" external icon={<IconBrandLinkedin />} onSelect={() => runCommand(() => window.open("https://www.linkedin.com/in/miit-daga", "_blank"))}>
                                                    LinkedIn
                                                </Item>
                                                <Item value="orcid publications papers research record" external icon={<OrcidIcon />} hint="every publication, not only the highlights" onSelect={() => runCommand(() => window.open(ORCID_URL, "_blank"))}>
                                                    ORCID
                                                </Item>
                                                <Item value="terminal mode shell" external icon={<IconTerminal />} hint="or type > here" onSelect={() => runCommand(() => window.open("/terminal.html", "_blank"))}>
                                                    Terminal Mode
                                                </Item>
                                            </Command.Group>

                                            <Command.Separator className="my-2 h-px bg-white/10" />

                                            <Command.Group heading="Easter eggs">
                                                <Item value="summon the alien visitor" icon={<IconAlien />} hint="catch him and he pays you a shard" onSelect={() => runCommand(() => window.dispatchEvent(new CustomEvent("alien-summon")))}>
                                                    Summon the alien
                                                </Item>
                                                <Item
                                                    value="trace constellation stars puzzle"
                                                    icon={<IconStars />}
                                                    hint="a different one every day"
                                                    onSelect={() =>
                                                        runCommand(() => {
                                                            const sky = document.querySelector("[aria-label^='A hidden constellation']");
                                                            if (sky) glideTo(sky.parentElement ?? sky);
                                                        })
                                                    }
                                                >
                                                    Trace today&apos;s constellation
                                                </Item>
                                                {skyParam === null ? (
                                                    <>
                                                        <Item value="sky preview night 3 am" icon={<IconMoon />} hint="the sky follows your clock, and a comet passes" onSelect={() => runCommand(() => (window.location.href = "/?sky=3"))}>
                                                            See the site at 3 AM
                                                        </Item>
                                                        <Item value="sky preview dawn sunrise 6 am" icon={<IconSunrise />} onSelect={() => runCommand(() => (window.location.href = "/?sky=6"))}>
                                                            See the site at dawn
                                                        </Item>
                                                    </>
                                                ) : (
                                                    <Item value="sky back to my own time" icon={<IconSun />} onSelect={() => runCommand(() => (window.location.href = "/"))}>
                                                        Back to your own sky
                                                    </Item>
                                                )}
                                                <Item value="konami code cheat keyboard big crunch" icon={<IconKeyboard />} onSelect={() => runCommand(() => notify("↑ ↑ ↓ ↓ ← → ← → B A, anywhere on the page"))}>
                                                    The Konami code
                                                </Item>
                                                <Item value="defense mode asteroids game" icon={<IconTarget />} onSelect={() => runCommand(() => window.dispatchEvent(new CustomEvent("defense-mode")))}>
                                                    Initiate Defense Mode
                                                </Item>
                                                <Item
                                                    value="hunt cosmic fragments shards collectibles"
                                                    icon={<IconDiamond />}
                                                    tag={`${found.length}/${FRAGMENT_IDS.length}`}
                                                    hint="five shards glow somewhere on the page"
                                                    onSelect={() =>
                                                        runCommand(() => {
                                                            if (!nextFragment) return notify("You have them all. Now try the Konami code.");
                                                            const id = FRAGMENT_SECTION[nextFragment];
                                                            navTo(`#${id}`);
                                                            notify(`Warmer. One glows somewhere in ${SECTIONS.find((sec) => sec.id === id)?.label ?? "this section"}.`);
                                                        })
                                                    }
                                                >
                                                    Hunt the cosmic fragments
                                                </Item>
                                                <Item
                                                    value="throw the astronaut tether fling"
                                                    icon={<IconHandGrab />}
                                                    hint="grab him and fling him, hard"
                                                    onSelect={() =>
                                                        runCommand(() => {
                                                            navTo("#");
                                                            notify("Grab the astronaut and throw him. Harder than that.");
                                                        })
                                                    }
                                                >
                                                    Throw the astronaut
                                                </Item>
                                                <Item value="tickle the hologram avatar photo quotes" icon={<IconMoodHappy />} onSelect={() => runCommand(() => jumpThen("#", "[data-hologram]", (el) => el.click()))}>
                                                    Tickle the hologram
                                                </Item>
                                                <Item value="poke the saucer ufo ship contact" icon={<IconUfo />} hint="the crew will not like it" onSelect={() => runCommand(() => jumpThen("#contact", "[data-signal-ufo]", (el) => el.click()))}>
                                                    Poke the saucer
                                                </Item>
                                                <Item value="hail the iss space station satellite" icon={<IconSatellite />} hint="live from orbit" onSelect={() => runCommand(() => window.dispatchEvent(new CustomEvent("iss-hail")))}>
                                                    Hail the ISS
                                                </Item>
                                                <Item value="fly to the edge of the page end bottom finale" icon={<IconArrowBarToDown />} hint="something happens at the very end" onSelect={() => runCommand(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "smooth" }))}>
                                                    Fly to the edge of the page
                                                </Item>
                                                <Item value="get lost in space meteor dodge game 404" icon={<IconMeteor />} hint="the 404 page is a game" onSelect={() => runCommand(() => (window.location.href = "/lost-in-space"))}>
                                                    Get lost in space
                                                </Item>
                                                <Item value="arcade games terminal snake invaders tetris" external icon={<IconDeviceGamepad2 />} hint="snake, invaders, tetris and more" onSelect={() => runCommand(() => window.open("/terminal.html?cmd=play", "_blank"))}>
                                                    The terminal arcade
                                                </Item>
                                            </Command.Group>
                                        </>
                                    )}
                                </Command.List>

                                {/* Footer key hints */}
                                <div className="flex items-center justify-between border-t border-white/10 px-4 py-2 text-[10px] text-neutral-500">
                                    <div className="flex items-center gap-3">
                                        <span className="flex items-center gap-1"><Kbd>↑</Kbd><Kbd>↓</Kbd> navigate</span>
                                        <span className="flex items-center gap-1"><Kbd>↵</Kbd> open</span>
                                        <span className="hidden items-center gap-1 sm:flex"><Kbd>&gt;</Kbd> terminal</span>
                                    </div>
                                    <span className="flex items-center gap-1"><Kbd>esc</Kbd> close</span>
                                </div>
                            </Command>
                        </div>
                    </Dialog.Content>
                </Dialog.Portal>
            </Dialog.Root>

            {/* Confirmation for actions that happen off screen */}
            {toast && (
                <div
                    role="status"
                    className="fixed bottom-8 left-1/2 z-[9999] -translate-x-1/2 rounded-full border border-teal-400/30 bg-black/85 px-4 py-2 font-mono text-xs text-teal-100 shadow-[0_0_20px_rgba(45,212,191,0.2)] backdrop-blur-md"
                >
                    {toast}
                </div>
            )}
        </>
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
    value,
    keywords,
    hint,
    tag,
}: {
    children: React.ReactNode;
    icon: React.ReactNode;
    onSelect: () => void;
    external?: boolean;
    value?: string;
    keywords?: string[];
    /** Second line, dimmer. */
    hint?: string;
    /** A small badge, e.g. "you are here". */
    tag?: string;
}) {
    return (
        <Command.Item
            value={value}
            keywords={keywords}
            onSelect={onSelect}
            className="group relative flex cursor-pointer select-none items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-neutral-300 outline-none transition-colors data-[selected=true]:bg-teal-500/10 data-[selected=true]:text-white"
        >
            {/* Left accent bar on the active row */}
            <span className="absolute left-0 top-1/2 h-5 w-[2px] -translate-y-1/2 rounded-full bg-teal-400 opacity-0 transition-opacity group-data-[selected=true]:opacity-100" />
            <span className="flex w-[18px] justify-center text-neutral-500 transition-colors group-data-[selected=true]:text-teal-300 [&>svg]:h-[18px] [&>svg]:w-[18px]">
                {icon}
            </span>
            <span className="min-w-0 flex-1">
                <span className="block truncate">{children}</span>
                {hint && <span className="block truncate text-[11px] text-neutral-500">{hint}</span>}
            </span>
            {tag && (
                <span className="rounded-full border border-teal-400/30 bg-teal-400/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-teal-200">
                    {tag}
                </span>
            )}
            {external ? (
                <IconArrowUpRight className="h-3.5 w-3.5 text-neutral-600 transition-colors group-data-[selected=true]:text-teal-300" />
            ) : (
                <span className="font-mono text-[11px] text-neutral-600 opacity-0 transition-opacity group-data-[selected=true]:opacity-100">↵</span>
            )}
        </Command.Item>
    );
}
