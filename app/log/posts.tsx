import type { ReactNode } from "react";

// The engineering log's posts (app/log): short write-ups of problems solved
// building this site, drafted from its code and commits. Each post is plain
// JSX with a few small helpers below, so there's no Markdown pipeline to keep.

export type Post = { slug: string; title: string; date: string; summary: string; minutes: number; tags: string[]; body: ReactNode };

const P = ({ children }: { children: ReactNode }) => <p className="mt-4 leading-relaxed text-neutral-300">{children}</p>;
const H = ({ children }: { children: ReactNode }) => <h2 className="font-display mt-10 text-xl font-bold text-white">{children}</h2>;
const C = ({ children }: { children: ReactNode }) => <code className="rounded bg-white/[0.07] px-1.5 py-0.5 font-mono text-[0.85em] text-teal-100">{children}</code>;
const Pre = ({ children }: { children: string }) => (
    <pre className="mt-4 overflow-x-auto rounded-xl border border-white/10 bg-white/[0.03] p-4 font-mono text-[13px] leading-relaxed text-neutral-200">
        <code>{children}</code>
    </pre>
);
const Ul = ({ children }: { children: ReactNode }) => <ul className="mt-4 list-disc space-y-2 pl-5 leading-relaxed text-neutral-300 marker:text-teal-300/60">{children}</ul>;

export const POSTS: Post[] = [
    {
        slug: "scores-the-server-replays",
        title: "Scores the server doesn't take on trust",
        date: "2026-09-25",
        summary: "The arcade's leaderboards don't believe the number the browser sends. They replay the whole run, on the server, and keep the score they get.",
        minutes: 5,
        tags: ["backend", "determinism", "security"],
        body: (
            <>
                <P>
                    A leaderboard that accepts <C>{"{ score: 4210 }"}</C> from the browser is a leaderboard for anyone who can open DevTools. For a while the arcade did what most do: it rejected the impossible (a score higher than a run of that length could reach) and trusted the rest. That stops the lazy cheat and nothing else. The plausible fake, a
                    believable score typed in by hand, went straight through.
                </P>
                <P>So the arcade stopped sending scores. It sends the run instead, and the server plays it again.</P>

                <H>Send the input, not the result</H>
                <P>
                    While you play Asteroid Run, the browser records your steering: three whole numbers (the keys you&apos;re holding, and where the pointer is), 30 times a second. When the run ends, that recording goes to the server with the score you saw. The server feeds the recording into the same simulation the game uses and computes the score itself. The number you claimed is ignored; the
                    replayed one is what goes on the board. Claiming 99,999 stores your real score.
                </P>
                <P>That only works if the game is deterministic: the same input must produce exactly the same run, on a phone&apos;s browser and on a server in a data centre. Getting there took more care than the replay itself.</P>

                <H>Making a game deterministic</H>
                <Ul>
                    <li>
                        <strong className="text-white">A fixed timestep.</strong> The simulation always advances in steps of 1/120 of a second, whatever the frame rate. A 144 Hz monitor and a struggling phone run the same steps; they just render them differently. Even the slow-motion shot when you leave a planet&apos;s orbit changes how
                        fast steps are consumed, never their size.
                    </li>
                    <li>
                        <strong className="text-white">One source of randomness.</strong> Every rock, fragment and power-up comes from a seeded generator (mulberry32), never <C>Math.random</C>.
                    </li>
                    <li>
                        <strong className="text-white">No <C>Math.sin</C>.</strong> The JavaScript spec lets each engine approximate trigonometry its own way, so Chrome, Safari and Node can disagree in the last bits. In a game where a rock clipping your wing ends the run, the last bit is enough to diverge. Free flight carries its own
                        polynomial <C>sin</C>, <C>cos</C> and <C>atan2</C>, built only from addition and multiplication, which IEEE 754 makes identical everywhere.
                    </li>
                </Ul>

                <H>A tape small enough to post</H>
                <P>The recording is a list of samples, packed into a short string:</P>
                <Pre>{`[keys held, pointer x, pointer y] every 4 steps (30 a second)
  → the pointer stored as the change from the last sample
  → a run of identical samples stored once, with its count
  → zigzag varints (small numbers, small bytes)
  → base64url`}</Pre>
                <P>A keyboard player holds the same keys for long stretches, so their tape collapses to almost nothing. A mouse player&apos;s is bigger, but still a small POST.</P>

                <H>The next hole: choosing the field</H>
                <P>
                    Replay alone isn&apos;t enough if the player picks the seed. You could record one good run, then search offline for a field where that same input survives longest, or replay a strong run on an easier field. So the server deals the field. When a run starts, the game asks for a seed, and the server returns it with
                    a signed token: an HMAC over the seed and the time it was issued, valid for three hours.
                </P>
                <P>
                    When the run is posted, the token is checked, and the seed is marked used in Redis with <C>SET NX</C>, keyed to a hash of that run&apos;s tape. One dealt field goes with one run: the same tape can be posted again (under another name, after a clash), a different one can&apos;t. The daily field needs none of this,
                    because its seed is the date, the same for everyone; the list of real asteroids it uses is checked against the one the server fetched from NASA that day.
                </P>

                <H>What it rejects</H>
                <Ul>
                    <li>A claimed score: replaced by the replayed one</li>
                    <li>A tape cut short, or run on a different seed than its token&apos;s</li>
                    <li>No token, a forged token, or a token reused for another run</li>
                    <li>A daily run with asteroids dropped from its list</li>
                </Ul>
                <P>
                    Stack the Station works the same way with a simpler tape: a build is just its drop times, rounded to the millisecond, and the server drops the modules again. The cost of all this is discipline. Every rule lives in one simulation file that the browser and the server share, and a change that alters how a run
                    plays out also changes what old tapes replay to.
                </P>
            </>
        ),
    },
    {
        slug: "thirteen-free-models",
        title: "Thirteen free models, one answer",
        date: "2026-09-26",
        summary: "Mission Control answers questions about my work on nothing but free AI tiers. Here's the fallback chain that keeps it answering when models are busy, slow or out of quota.",
        minutes: 6,
        tags: ["backend", "AI", "reliability"],
        body: (
            <>
                <P>
                    Mission Control is the assistant on this site: ask it about my work and it answers from the site&apos;s own content. I wanted it to cost nothing. Free AI tiers are generous in total and stingy per model, so &quot;free&quot; turned into a reliability problem: how do you get an answer every time out of models that
                    are each allowed only so much?
                </P>

                <H>What the free tiers actually give you</H>
                <Ul>
                    <li>Google&apos;s Gemini API: the Flash models allow 20 requests a day each; Flash Lite, 500; the open Gemma models, 14,400, but only 16,000 tokens a minute</li>
                    <li>Groq: 1,000 a day per model, and under a second per answer, but 8,000 tokens a minute</li>
                    <li>NVIDIA&apos;s free endpoints: about 40 requests a minute, no published daily cap, and very uneven speed from model to model</li>
                </Ul>
                <P>
                    Each question carries the site&apos;s content with it, a few thousand tokens, so the per-minute token caps bite long before the request caps do. No single model could carry the site. Thirteen of them, across three providers, can.
                </P>

                <H>What probing taught me</H>
                <P>Before writing the chain I called every model with the same small question. The results shaped the design more than the documentation did:</P>
                <Ul>
                    <li>Models answered &quot;experiencing high demand&quot; (a 503) for minutes at a time, and a failed call still counted against the day&apos;s quota</li>
                    <li>One call hung for 198 seconds before failing</li>
                    <li>Each model accepts only certain &quot;thinking&quot; levels, and the wrong one is an error, not a fallback</li>
                    <li>Two models in the list were already gone for new accounts</li>
                </Ul>

                <H>The chain</H>
                <P>
                    The routes are tried in order: the fastest and most dependable first (Gemini Flash Lite, then Groq, then NVIDIA), then the better but scarce Flash models, then Gemma as the bulk reserve. If every one fails, a plain keyword search over the same content answers instead, so Mission Control never simply breaks.
                </P>
                <Pre>{`for each route, in order:
  skip it if it's resting, or at today's cap
  start it, with its own timeout (8 to 20 s)
  if it's still silent after 3 s and the next route
    has a big quota, start that one alongside
  first answer wins; the other is cancelled
  on failure, rest the route and move on`}</Pre>
                <P>
                    The hedge is the part that keeps it feeling fast. A route that&apos;s slow today doesn&apos;t make the visitor wait for its timeout; after three seconds the next one races it. It&apos;s never hedged onto the 20-a-day Flash models, though, so they don&apos;t spend their day on answers that get thrown away.
                    When I made Gemini hang in a test, the answer arrived from Groq in 3.6 seconds.
                </P>

                <H>Resting, and counting</H>
                <P>A failure rests its route for as long as the failure suggests, recorded in Redis so every instance of the function knows:</P>
                <Ul>
                    <li>A daily limit: until the quota resets at midnight Pacific time</li>
                    <li>A per-minute limit: its retry-after, between 20 seconds and 5 minutes</li>
                    <li>A timeout or a 5xx: two minutes</li>
                    <li>Any other 4xx, a model or key gone wrong: six hours</li>
                </Ul>
                <P>Each route&apos;s attempts are also counted per day, so the chain stops just short of a free cap instead of finding out from a 429. The live state of every route is on the site&apos;s status page.</P>

                <H>Spending less of it</H>
                <Ul>
                    <li>
                        A first question&apos;s answer is cached for a week, keyed by the question&apos;s normalised text and a hash of the site&apos;s content, so editing the content retires every cached answer at once
                    </li>
                    <li>Each visitor gets 15 questions an hour and 40 a day; the whole site gets 3,000 a day, past which it answers by search alone</li>
                    <li>Only the last two exchanges go with a follow-up, not the whole conversation</li>
                </Ul>

                <H>Keeping it honest</H>
                <P>
                    The model is told to answer only from the site&apos;s content, to say plainly when something isn&apos;t there and point to the contact section, and to treat the visitor&apos;s message as a question, never as instructions. Asked to ignore its rules and write a poem, it declines. The model that answered is logged on
                    the server, not shown to visitors: it helped while building, and nobody reading an answer needs it.
                </P>
            </>
        ),
    },
    {
        slug: "deploying-my-own-past",
        title: "Deploying my own past",
        date: "2026-09-27",
        summary: "The time machine runs every earlier version of this site, live. Getting 18-month-old commits deployed again took a detour through a security block.",
        minutes: 4,
        tags: ["deployment", "Next.js", "Vercel"],
        body: (
            <>
                <P>
                    This site started in March 2025 as a gradient and a name. The time machine shows every version since, and you can scroll and click around each one, because each is still running. The hard part wasn&apos;t the page; it was getting code from a year and a half ago deployed again without disturbing the current site.
                </P>

                <H>Choosing the versions</H>
                <P>
                    I took the last commit of each month, then dropped the months whose changes were text alone (April and July 2025): a version that looks identical to the one before adds a stop, not a story. September, October and December 2025 had no commits. That left five past versions and today.
                </P>

                <H>One project each, from a worktree</H>
                <P>
                    Each version is its own small Vercel project, deployed from a <C>git worktree</C> of that commit in a scratch folder. The working copy never moves, and the live site&apos;s project and settings are never touched. Deploying each as its own production site also gives it a public address, where a preview of the main
                    project would sit behind a login.
                </P>

                <H>The block</H>
                <P>March and May deployed first time. June, August and November came back with:</P>
                <Pre>{`Error: Vulnerable version of Next.js detected, please update immediately.`}</Pre>
                <P>
                    They were on Next.js 15.2.4, which has a known security hole, and Vercel refuses to deploy it. The fix was a patch update in each throwaway copy only, to 15.2.8, the version the live site runs, moving nothing but Next and its own packages:
                </P>
                <Pre>{`pnpm add next@15.2.8 --lockfile-only`}</Pre>
                <P>The repository&apos;s history stays exactly as it was; the patch lives only in what was deployed. Nothing visible changes between 15.2.4 and 15.2.8.</P>

                <H>Screenshots first, then the real thing</H>
                <P>
                    My first version showed screenshots. The heroes barely changed from March to August, so each screenshot was the whole page instead, stitched from screens taken while scrolling, with the small floating parts (nav bars, buttons) hidden after the first screen so they wouldn&apos;t repeat down the page. Page length turned
                    out to tell the story best: 4,586 pixels in March, 13,653 today. Those lengths are the bars over the slider.
                </P>
                <P>But a screenshot of a site is a poor substitute for the site. Nothing blocked framing the old deployments, so the time machine now runs each version in a frame:</P>
                <Ul>
                    <li>Only the version selected loads, since each is a full site</li>
                    <li>On a desktop it renders at 1440 pixels wide and is scaled down with a CSS transform, so you see its desktop design rather than its tablet layout; on a phone, at the phone&apos;s width</li>
                    <li>A small still of its first screen (under 45 KB) shows until the frame reports it has loaded</li>
                    <li>Today&apos;s version is framed with the terminal&apos;s embed flag, which skips the entry screen</li>
                </Ul>
                <P>The trade-off is weight: moving to November downloads that whole old site, 3D effects included, where a screenshot was a few hundred kilobytes. Loading one version at a time keeps that reasonable.</P>
            </>
        ),
    },
    {
        slug: "when-to-look-up",
        title: "When to look up",
        date: "2026-09-27",
        summary: "The contact section tells you when the ISS will next pass over your city. Predicting that takes an orbit model, the Sun's position, and three conditions that all have to hold at once.",
        minutes: 4,
        tags: ["orbital mechanics", "backend"],
        body: (
            <>
                <P>
                    At the foot of this site, a card says something like: &quot;The International Space Station will pass over New York tonight at 7:13 pm: bright, 6 minutes long. Look northwest, and follow it east.&quot; It&apos;s the one feature here that&apos;s useful away from the screen, and it&apos;s mostly geometry.
                </P>

                <H>When the ISS is visible</H>
                <P>You can see the station only when three things are true at once:</P>
                <Ul>
                    <li>It&apos;s above your horizon, by at least 10 degrees, clear of trees and buildings</li>
                    <li>It&apos;s in sunlight, not in the Earth&apos;s shadow; it shines by reflected sunlight</li>
                    <li>Your sky is dark: the Sun is at least 6 degrees below your horizon</li>
                </Ul>
                <P>The second and third pull against each other, which is why passes cluster in the hour or two after dusk and before dawn: the ground is in darkness while the station, 400 km up, still catches the Sun.</P>

                <H>Where the station is</H>
                <P>
                    Its orbit is published as a TLE, two lines of numbers from CelesTrak, updated several times a day. Turning that into a position at a given moment is what the SGP4 model does, and <C>satellite.js</C> implements it. Checked against a live tracker, the predicted position was within 0.1 degrees. The route fetches the TLE at most
                    every 12 hours and keeps it in Redis; if CelesTrak is down, an older one stays good for days.
                </P>

                <H>Where the Sun is</H>
                <P>
                    The Sun&apos;s position comes from the standard low-precision series (its mean longitude and anomaly, corrected for the orbit&apos;s eccentricity), good to a fraction of a degree, which is plenty when a pass lasts minutes. That gives two things: how high the Sun is where you stand, and its direction for the shadow test.
                    The Earth&apos;s shadow is modelled as a cylinder behind the planet: the station is lit if it&apos;s on the sunward side, or far enough from the shadow&apos;s axis.
                </P>

                <H>Finding the passes</H>
                <Pre>{`for every 20 seconds over the next 5 days:
  station position (SGP4) → elevation and bearing from you
  visible = elevation ≥ 10° and station sunlit and Sun ≤ −6°
group visible moments into passes, drop any under a minute
for each: start, peak, end, highest elevation,
          where it appears and where it goes`}</Pre>
                <P>That&apos;s about 21,600 positions, and it takes 5 to 25 milliseconds. Brightness is estimated from the highest elevation (overhead passes are nearer and brighter), not computed as a magnitude.</P>

                <H>Where you are</H>
                <P>
                    Location comes from the headers Vercel adds after placing a visitor by IP, the same ones the contact section&apos;s globe uses; nothing about the visitor is stored. IP location is only city-level, but at city scale the times shift by seconds and the directions not at all. Times are shown in your own time zone, and
                    &quot;Add to calendar&quot; saves the pass as an event that starts five minutes early, with a reminder.
                </P>
            </>
        ),
    },
];
