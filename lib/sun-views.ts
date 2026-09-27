// The Sun card's three views of NASA's Solar Dynamics Observatory pictures
// (components/ui/sun-today.tsx, app/api/sun), kept here because a route file
// may export only its handlers.
export const VIEWS = [
    { id: "HMIIC", label: "Visible light", about: "the Sun's surface as your eye would see it, sunspots and all" },
    { id: "0171", label: "Ultraviolet 171 Å", about: "the corona: loops of million-degree gas along magnetic fields" },
    { id: "0304", label: "Ultraviolet 304 Å", about: "the chromosphere, and prominences at the edge" },
] as const;
