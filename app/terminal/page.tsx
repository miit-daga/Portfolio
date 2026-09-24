import type { Metadata } from "next";
import { Desk } from "./desk";

export const metadata: Metadata = {
    title: "Terminal",
    description: "Miit Daga's terminal, on a desk in orbit.",
    alternates: { canonical: "/terminal" },
    // (the share picture is opengraph-image.jpg, beside this file)
    openGraph: {
        type: "website",
        url: "/terminal",
        siteName: "Miit Daga",
        title: "Miit Daga · Terminal",
        description: "A real shell on a desk in orbit. Type help, or tour: games, a rubber duck, a phone that AirDrops, and chai.",
    },
    twitter: {
        card: "summary_large_image",
        creator: "@miit_daga",
        title: "Miit Daga · Terminal",
        description: "A real shell on a desk in orbit. Type help, or tour.",
    },
};

// The terminal on its desk (desk.tsx). terminal.html sends large screens here,
// and shows itself inside the desk's display; small screens get it on its own.
export default function TerminalPage() {
    return <Desk />;
}
