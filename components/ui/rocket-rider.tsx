"use client";
import { memo } from "react";
import { Alien } from "./tiny-alien";
import { ASTRONAUT_SVG } from "./astronaut-art";

// A hitchhiker clinging to the back-to-top rocket: the contact scene's little
// alien, or a pocket-sized copy of the hero's astronaut. Drawn at a size that
// fits beside a 28px rocket.

export type RiderKind = "alien" | "astronaut";

const ASTRO_HTML = { __html: ASTRONAUT_SVG };

export const Rider = memo(function Rider({ kind }: { kind: RiderKind }) {
    if (kind === "alien") {
        return (
            <div style={{ width: 11, height: 19 }}>
                <div style={{ transform: "scale(0.55)", transformOrigin: "0 0", width: 20, height: 34 }}>
                    <Alien reduce />
                </div>
            </div>
        );
    }
    return <div style={{ width: 15, height: 19 }} dangerouslySetInnerHTML={ASTRO_HTML} />;
});

/** Where a rider clings, relative to a rocket box's top-left. */
export const RIDER_SPOT: Record<RiderKind, { left: number; top: number; rotate: number }> = {
    // Holding on to the right fin
    alien: { left: 21, top: 12, rotate: 18 },
    // Hugging the left side, leaning in
    astronaut: { left: -9, top: 8, rotate: -16 },
};
