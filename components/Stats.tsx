"use client";
import { TelemetryGauge, type GaugeAccent } from "./ui/telemetry-gauge";
import { getSection } from "@/constants/sections";

const STATS: { to: number; decimals?: number; label: string }[] = [
    { to: 10, label: "Scopus-Indexed Publications" },
    { to: 1, label: "Patent Filed" },
    { to: 2, label: "Hackathon Wins" },
    { to: 9.22, decimals: 2, label: "CGPA" },
];

export function Stats() {
    const about = getSection("about-me");
    const accent: GaugeAccent = { hex: about.hex, light: about.light, rgb: about.rgb };

    return (
        <div className="grid w-full max-w-3xl grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-4 md:gap-8">
            {STATS.map((s, i) => (
                <TelemetryGauge
                    key={s.label}
                    value={s.to}
                    decimals={s.decimals}
                    label={s.label}
                    caption={`tlm·0${i + 1}`}
                    index={i}
                    accent={accent}
                />
            ))}
        </div>
    );
}
