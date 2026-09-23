import type { Metadata } from "next";
import { Desk } from "./desk";

export const metadata: Metadata = {
    title: "Terminal",
    description: "Miit Daga's terminal, on a desk in orbit.",
    alternates: { canonical: "/terminal" },
};

// The terminal on its desk (desk.tsx). terminal.html sends large screens here,
// and shows itself inside the desk's display; small screens get it on its own.
export default function TerminalPage() {
    return <Desk />;
}
