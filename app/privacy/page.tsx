import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, Section, Sub } from "@/components/ui/legal-page";

export const metadata: Metadata = {
    title: "Privacy policy",
    description: "What miitdaga.dev collects, why, and what you can do about it: no accounts, no payments, no cookies.",
    openGraph: { title: "Privacy policy · Miit Daga", description: "What miitdaga.dev collects, why, and what you can do about it." },
};

// What the site collects, feature by feature. Keep it in step with the code:
// every service and every stored field here was checked against the API
// routes and the browser's outbound requests (2026-10-20).
export default function PrivacyPage() {
    return (
        <LegalPage
            eyebrow="Privacy"
            title="Privacy policy"
            intro={
                <>
                    <p>This policy explains what miitdaga.dev collects, why, and what you can do about it. The site is a personal portfolio run by Miit Daga, based in Kolkata, India.</p>
                    <p className="mt-3">
                        The short version: there are no accounts, no logins, no payments and no cookies. Most of the site works without collecting anything about you personally. The few features that store something (the guestbook, the arcade leaderboards and Mission Control) are described below.
                    </p>
                </>
            }
        >
            <Section title="What is collected, and why">
                <Sub title="When you visit any page">
                    <p>
                        The site is hosted on <strong>Vercel</strong>. Like every web host, Vercel receives your IP address, browser details and the page you asked for, and keeps them in its server logs. Vercel also works out your approximate location (city and coordinates) from your IP address. The site uses that location for the contact section&apos;s globe, which draws the line from you to Kolkata, and for the live explorers feature, which shows which section other visitors are reading and their city.
                    </p>
                    <p>
                        Presence data (a random id for your browser tab, the section you&apos;re on, your city and country) is kept for a few minutes after you leave and deleted within an hour. Your IP address is not stored.
                    </p>
                    <p>
                        The site uses <strong>Vercel Web Analytics</strong> and <strong>Vercel Speed Insights</strong> to count page views and measure how fast pages load. These record the page, the referring site, your country, and your browser, operating system and device type. They don&apos;t use cookies, and they don&apos;t identify you across days.
                    </p>
                </Sub>
                <Sub title="When you sign the guestbook">
                    <p>
                        You choose a name (or stay &ldquo;anonymous&rdquo;) and write a short message. Both are stored, with the time, and <strong>shown publicly</strong> on the site. To limit spam, a one-way, salted hash of your IP address is stored alongside the entry. It can&apos;t be turned back into your IP, and it is never shown. The guestbook keeps the newest 200 entries; older ones are removed.
                    </p>
                </Sub>
                <Sub title="When you play the arcade">
                    <p>
                        If you submit a score, the leaderboard stores the name you choose, your score, the time, a record of the game run (your inputs) used to check the score is genuine, and a salted hash of your IP address. Names and scores are <strong>shown publicly</strong>. Only each game&apos;s top 10 are kept.
                    </p>
                    <p>
                        The site also counts anonymous game events (for example, how many games were started each day) and receives crash reports when a game breaks. Crash reports contain the game, a short error message, and your browser and operating system, but not your IP address. They are kept for 30 days.
                    </p>
                </Sub>
                <Sub title="When you ask Mission Control a question">
                    <p>
                        Mission Control answers questions about Miit using AI models. Your question, and the earlier questions and answers in the same conversation, are sent to one of these providers: <strong>Google</strong> (Gemini API), <strong>Groq</strong> or <strong>NVIDIA</strong> (API Catalog). No IP address or identifier is sent to them.
                    </p>
                    <p>
                        These services are used on their free tiers, and under those terms a provider may use what you send to improve its products. Google&apos;s terms for the free Gemini API allow this, including human review. <strong>Please don&apos;t include personal or sensitive information in your questions.</strong>
                    </p>
                    <p>
                        To keep within the free limits, the site counts how many questions come from each visitor, using a salted hash of the IP address, for one hour and one day. A cached answer to a first question is kept for 7 days. It is stored under a hash of the question, so the question itself isn&apos;t saved.
                    </p>
                </Sub>
                <Sub title="When you email">
                    <p>The &ldquo;Send a message&rdquo; button opens your own email app. Your message goes from your email provider straight to Miit, and the site never sees it.</p>
                </Sub>
            </Section>

            <Section title="Information stored in your browser">
                <p>
                    The site stores some small items in your browser&apos;s local storage: whether you&apos;ve seen the intro, game progress and high scores, easter-egg flags, and your crew card&apos;s callsign. These stay on your device. Your callsign is sent only if you submit a score or sign the guestbook with it. You can clear all of this at any time by clearing the site&apos;s data in your browser settings.
                </p>
                <p>The site does not use cookies.</p>
            </Section>

            <Section title="Services that load in your browser">
                <p>Some features load content directly from other services. When your browser fetches from them, they receive your IP address and browser details under their own privacy policies:</p>
                <ul>
                    <li>Where The ISS At (live ISS position)</li>
                    <li>Open-Meteo (Kolkata&apos;s weather; your location isn&apos;t sent)</li>
                    <li>NASA and EUMETSAT (satellite and Sun images)</li>
                    <li>YouTube (the live ISS video, using YouTube&apos;s privacy-enhanced mode)</li>
                    <li>Google Drive (the resume)</li>
                    <li>Google Fonts and the Tailwind CDN (on the terminal page only)</li>
                </ul>
                <p>Links to LinkedIn, GitHub, YouTube, X, Instagram, ORCID and journal sites take you to those services, whose own policies apply.</p>
            </Section>

            <Section title="Where data is stored">
                <p>
                    Site data is stored with <strong>Upstash</strong> (the site&apos;s database) and <strong>GitHub</strong> (guestbook storage). It may be processed outside India, including in the United States, by these providers and by Vercel.
                </p>
            </Section>

            <Section title="Your choices and rights">
                <ul>
                    <li>
                        <strong>Guestbook or leaderboard removal:</strong> email <a href="mailto:miitcodes27@gmail.com">miitcodes27@gmail.com</a> with the name and the date, and the entry will be removed.
                    </li>
                    <li>
                        <strong>Access or deletion:</strong> you can ask what the site holds about you, or ask for it to be deleted. Because the site stores only hashes rather than IP addresses, entries usually have to be found by the name and time you used.
                    </li>
                    <li>
                        Depending on where you live, you may have further rights under laws such as India&apos;s Digital Personal Data Protection Act, 2023 or the EU GDPR, including the right to complain to your data protection authority.
                    </li>
                </ul>
            </Section>

            <Section title="Children">
                <p>The site is not aimed at children, and it doesn&apos;t knowingly collect information from anyone under 18. If you believe a child has signed the guestbook or a leaderboard, email and the entry will be removed.</p>
            </Section>

            <Section title="Changes">
                <p>
                    If this policy changes, the new version will be posted here with a new &ldquo;Last updated&rdquo; date. See also the <Link href="/terms">terms of use</Link>.
                </p>
            </Section>
        </LegalPage>
    );
}
