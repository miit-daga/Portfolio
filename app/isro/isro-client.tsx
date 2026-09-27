"use client";
import dynamic from "next/dynamic";

// The ISRO page's heavy parts (three.js), loaded in the browser only
const Loading = () => <div className="h-[58vh] min-h-[380px] rounded-2xl border border-white/10 bg-black md:h-[640px]" />;
export const IsroSatellites = dynamic(() => import("./satellites-globe").then((m) => m.SatellitesGlobe), { ssr: false, loading: Loading });
export const IsroJourneys = dynamic(() => import("./journeys").then((m) => m.Journeys), { ssr: false, loading: () => <div className="h-[46vh] min-h-[320px] rounded-2xl border border-white/10 bg-black md:h-[480px]" /> });
