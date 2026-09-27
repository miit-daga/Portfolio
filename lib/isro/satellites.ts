// India's active satellites, for the ISRO page's live globe (app/isro): which
// ones, what each is for, and who runs it. The list is CelesTrak's satellite
// catalogue filtered to payloads owned by India, still in orbit and in its
// active set (checked 27 Sep 2026: 77 of them). Their orbits are fetched
// daily (app/api/isro/satellites); the list itself changes only with a
// launch, so a new satellite is added here by hand.
//
// Not all are ISRO's: the catalogue's owner is the country, so university and
// company satellites are here too, labelled as such. Notes are given only
// where the facts are well established.

export type Category = "navigation" | "communication" | "weather" | "earth" | "science" | "tech" | "student" | "private" | "other";
export type Site = "sriharikota" | "kourou" | "canaveral" | "vandenberg";

// [NORAD catalogue number, name, launch date, launch site]
const LIST: [number, string, string, Site][] = [
    [28649, "IRS-P5 (CARTOSAT-1)", "2005-05-05", "sriharikota"],
    [32783, "CARTOSAT-2A", "2008-04-28", "sriharikota"],
    [35931, "OCEANSAT-2", "2009-09-23", "sriharikota"],
    [36795, "CARTOSAT-2B", "2010-07-12", "sriharikota"],
    [37387, "RESOURCESAT-2", "2011-04-20", "sriharikota"],
    [37388, "YOUTHSAT", "2011-04-20", "sriharikota"],
    [37605, "GSAT-8", "2011-05-20", "kourou"],
    [37839, "JUGNU", "2011-10-12", "sriharikota"],
    [37841, "SRMSAT", "2011-10-12", "sriharikota"],
    [38779, "GSAT-10", "2012-09-28", "kourou"],
    [39086, "SARAL", "2013-02-25", "sriharikota"],
    [39199, "IRNSS-1A", "2013-07-01", "sriharikota"],
    [39216, "INSAT-3D", "2013-07-25", "kourou"],
    [39234, "GSAT-7", "2013-08-29", "kourou"],
    [39498, "GSAT-14", "2014-01-05", "sriharikota"],
    [39635, "IRNSS-1B", "2014-04-04", "sriharikota"],
    [40269, "IRNSS-1C", "2014-10-15", "sriharikota"],
    [40332, "GSAT-16", "2014-12-06", "kourou"],
    [40880, "GSAT-6", "2015-08-27", "sriharikota"],
    [40930, "ASTROSAT", "2015-09-28", "sriharikota"],
    [41028, "GSAT-15", "2015-11-10", "kourou"],
    [41241, "IRNSS-1E", "2016-01-20", "sriharikota"],
    [41384, "IRNSS-1F", "2016-03-10", "sriharikota"],
    [41469, "IRNSS-1G", "2016-04-28", "sriharikota"],
    [41599, "CARTOSAT-2C", "2016-06-22", "sriharikota"],
    [41752, "INSAT-3DR", "2016-09-08", "sriharikota"],
    [41784, "PISAT", "2016-09-26", "sriharikota"],
    [41790, "SCATSAT 1", "2016-09-26", "sriharikota"],
    [41793, "GSAT-18", "2016-10-05", "kourou"],
    [41877, "RESOURCESAT-2A", "2016-12-07", "sriharikota"],
    [41948, "CARTOSAT-2D", "2017-02-15", "sriharikota"],
    [42695, "GSAT-9", "2017-05-05", "sriharikota"],
    [42747, "GSAT-19", "2017-06-05", "sriharikota"],
    [42767, "CARTOSAT-2E", "2017-06-23", "sriharikota"],
    [42815, "GSAT-17", "2017-06-28", "kourou"],
    [43111, "CARTOSAT-2F", "2018-01-12", "sriharikota"],
    [43286, "IRNSS-1I", "2018-04-11", "sriharikota"],
    [43698, "GSAT-29", "2018-11-14", "sriharikota"],
    [43719, "HYSIS", "2018-11-29", "sriharikota"],
    [43824, "GSAT-11", "2018-12-04", "kourou"],
    [43864, "GSAT-7A", "2018-12-19", "sriharikota"],
    [44035, "GSAT-31", "2019-02-05", "kourou"],
    [44078, "EMISAT", "2019-04-01", "sriharikota"],
    [44233, "RISAT-2B", "2019-05-22", "sriharikota"],
    [44804, "CARTOSAT-3", "2019-11-27", "sriharikota"],
    [44857, "RISAT-2BR1", "2019-12-11", "sriharikota"],
    [45026, "GSAT-30", "2020-01-16", "kourou"],
    [46905, "RISAT-2BR2", "2020-11-07", "sriharikota"],
    [47256, "CMS-01", "2020-12-17", "sriharikota"],
    [51656, "EOS-4", "2022-02-14", "sriharikota"],
    [52903, "CMS-02 (GSAT-24)", "2022-06-22", "kourou"],
    [52939, "POEM", "2022-06-30", "sriharikota"],
    [54361, "EOS-6 (OCEANSAT-3)", "2022-11-26", "sriharikota"],
    [56308, "POEM-2", "2023-04-22", "sriharikota"],
    [56759, "NVS-01 (IRNSS-1J)", "2023-05-29", "sriharikota"],
    [56964, "AFR-1", "2023-06-12", "vandenberg"],
    [58694, "XPOSAT", "2024-01-01", "sriharikota"],
    [58990, "INSAT-3DS", "2024-02-17", "sriharikota"],
    [59442, "TSAT-1A", "2024-04-07", "canaveral"],
    [60454, "EOS-08", "2024-08-16", "sriharikota"],
    [62028, "GSAT-N2 (GSAT-20)", "2024-11-18", "canaveral"],
    [62459, "SDX01", "2024-12-30", "sriharikota"],
    [62460, "SDX02", "2024-12-30", "sriharikota"],
    [62701, "FIREFLY-1", "2025-01-14", "vandenberg"],
    [62704, "FIREFLY-2", "2025-01-14", "vandenberg"],
    [62710, "FIREFLY-3", "2025-01-14", "vandenberg"],
    [65053, "NISAR", "2025-07-30", "sriharikota"],
    [65319, "FFLY03", "2025-08-26", "vandenberg"],
    [65320, "FFLY01", "2025-08-26", "vandenberg"],
    [65321, "LEAP-1", "2025-08-26", "vandenberg"],
    [65322, "FFLY02", "2025-08-26", "vandenberg"],
    [66311, "CMS-03 (GSAT-7R)", "2025-11-02", "sriharikota"],
    [69010, "DRISHTI", "2026-05-03", "vandenberg"],
    [100080, "AAGAMAN OBJECT A", "2026-07-18", "sriharikota"],
    [100081, "AAGAMAN OBJECT B", "2026-07-18", "sriharikota"],
    [100082, "AAGAMAN OBJECT C", "2026-07-18", "sriharikota"],
    [100607, "EOS-05 (GISAT-1A)", "2026-09-03", "sriharikota"],
];

export const CATEGORY: Record<Category, { label: string; colour: string; about: string }> = {
    navigation: { label: "NavIC navigation", colour: "#fbbf24", about: "Part of NavIC, India's own satellite navigation system, like GPS for India and the region around it." },
    communication: { label: "Communication", colour: "#38bdf8", about: "Relays TV, phone, internet or secure links from geostationary orbit, 35,786 km up." },
    weather: { label: "Weather", colour: "#a78bfa", about: "Watches India's weather from geostationary orbit; its pictures feed the forecasts." },
    earth: { label: "Earth observation", colour: "#34d399", about: "Images or maps the Earth: land, crops, cities, oceans and ice." },
    science: { label: "Space science", colour: "#f472b6", about: "An observatory, looking out rather than down." },
    tech: { label: "Technology demonstration", colour: "#fb923c", about: "An experiment, testing a technology in orbit." },
    student: { label: "University satellite", colour: "#94a3b8", about: "Built by students at an Indian university." },
    private: { label: "Indian company", colour: "#e2e8f0", about: "Built and run by an Indian space company." },
    other: { label: "Other", colour: "#64748b", about: "An Indian satellite." },
};

export const SITES: Record<Site, string> = {
    sriharikota: "Sriharikota, India",
    kourou: "Kourou, French Guiana (on an Ariane 5)",
    canaveral: "Cape Canaveral, USA",
    vandenberg: "Vandenberg, USA",
};

// A word more on the ones worth one
const NOTES: Record<string, string> = {
    ASTROSAT: "India's first dedicated space observatory, watching the sky in X-ray, ultraviolet and visible light at once.",
    XPOSAT: "Measures how the X-rays from black holes and neutron stars are polarised.",
    NISAR: "A radar satellite built by NASA and ISRO together, mapping how land, ice and forests change.",
    SARAL: "Measures the height of the sea with a radar altimeter, a joint mission with France's space agency, CNES.",
    SDX01: "One of the SpaDeX pair, which ISRO used to demonstrate docking two satellites in orbit, in January 2025.",
    SDX02: "One of the SpaDeX pair, which ISRO used to demonstrate docking two satellites in orbit, in January 2025.",
    "INSAT-3DS": "Its weather pictures are the live cloud cover on this site's Kolkata close-up, in the contact section.",
    "CARTOSAT-3": "Among the sharpest-eyed civilian imaging satellites anywhere, resolving about 25 cm on the ground.",
    "NVS-01 (IRNSS-1J)": "The first of NavIC's second generation, carrying an atomic clock made in India.",
    "GSAT-7": "Rukmini: the Indian Navy's own communication satellite.",
    "GSAT-7A": "The Indian Air Force's communication satellite.",
    POEM: "The spent last stage of a PSLV rocket, turned into an orbiting platform for experiments instead of debris.",
    "POEM-2": "The spent last stage of a PSLV rocket, turned into an orbiting platform for experiments instead of debris.",
    "IRS-P5 (CARTOSAT-1)": "Launched in 2005, and still at work.",
};

/** What a satellite is for, from its series name. */
function categoryOf(name: string): Category {
    const n = name.toUpperCase();
    if (/^(IRNSS|NVS)/.test(n)) return "navigation";
    if (/^INSAT-3D/.test(n)) return "weather";
    if (/^(GSAT|CMS)/.test(n)) return "communication";
    if (/^(IRS|CARTOSAT|OCEANSAT|RESOURCESAT|EOS|RISAT|HYSIS|SCATSAT|EMISAT|SARAL|NISAR)/.test(n)) return "earth";
    if (/^(ASTROSAT|XPOSAT)/.test(n)) return "science";
    if (/^(POEM|SDX)/.test(n)) return "tech";
    if (/^(YOUTHSAT|JUGNU|SRMSAT|PISAT)/.test(n)) return "student";
    if (/^(FIREFLY|FFLY|LEAP|AFR|TSAT|DRISHTI)/.test(n)) return "private";
    return "other";
}

/** Who runs it, where that's certain. */
function operatorOf(name: string, cat: Category): string | null {
    const n = name.toUpperCase();
    if (n.startsWith("NISAR")) return "NASA and ISRO";
    if (n.startsWith("SARAL")) return "ISRO and CNES";
    if (cat === "student") return "an Indian university";
    if (cat === "private") return "an Indian company";
    if (cat === "other") return null;
    return "ISRO";
}

export type Satellite = { norad: number; name: string; launched: string; site: Site; category: Category; operator: string | null; note: string | null };

export const SATELLITES: Satellite[] = LIST.map(([norad, name, launched, site]) => {
    const category = categoryOf(name);
    return { norad, name, launched, site, category, operator: operatorOf(name, category), note: NOTES[name] ?? null };
});
export const NORADS = new Set(SATELLITES.map((s) => s.norad));
