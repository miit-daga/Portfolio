import type { Metadata } from "next";
import { MissionStatus } from "./mission-status";

export const metadata: Metadata = {
    title: "Mission status",
    description: "The machinery behind this site, live: the AI models behind Mission Control, Redis, and the NASA and space feeds the live cards use.",
};

// The site's own systems, live (./mission-status.tsx, app/api/status)
export default function StatusPage() {
    return (
        <main className="min-h-dvh bg-black text-white">
            <MissionStatus />
        </main>
    );
}
