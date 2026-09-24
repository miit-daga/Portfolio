import type { Metadata } from "next";
import { Stats } from "./stats";

export const metadata: Metadata = {
    title: "Stats",
    robots: { index: false, follow: false },
};

// The site's own tally of the arcade (app/api/tally), behind the admin key
export default function StatsPage() {
    return (
        <main className="min-h-dvh bg-black px-4 py-10 text-white md:px-8">
            <Stats />
        </main>
    );
}
