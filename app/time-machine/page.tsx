import type { Metadata } from "next";
import { TimeMachine } from "./time-machine";

export const metadata: Metadata = {
    title: "Time machine",
    description: "How this portfolio grew, from its first launch in March 2025 to today: every version, and the live old sites.",
    openGraph: {
        title: "Time machine · Miit Daga",
        description: "How this portfolio grew, from its first launch in March 2025 to today.",
    },
};

// The site's own history: a slider through its versions (./time-machine.tsx)
export default function TimeMachinePage() {
    return (
        <main className="min-h-dvh bg-black text-white">
            <TimeMachine />
        </main>
    );
}
