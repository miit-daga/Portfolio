// Facts for the pop-up when a visitor clicks the Sun, a planet or the Moon in
// the background's solar system (components/ui/animated-background.tsx). Each
// body's facts come round in turn, starting from a random one, without
// repeating until all have been seen; where each body is up to is kept in this
// browser (localStorage), so a return visit carries on rather than starting over.

export const FACTS: Record<string, string[]> = {
    Sun: [
        "The Sun holds about 99.86% of all the mass in the solar system.",
        "About 1.3 million Earths would fit inside the Sun.",
        "Sunlight takes about 8 minutes 20 seconds to reach Earth, so you always see the Sun as it was a little while ago.",
        "The energy made in its core can take tens of thousands of years to work its way out to the surface.",
        "Its core is about 15 million °C; the surface you see is about 5,500 °C.",
        "Its outer atmosphere, the corona, is over a million degrees, far hotter than the surface below it, and why is still being worked out.",
        "Every second the Sun turns about 4 million tonnes of matter into energy.",
        "It spins faster at its equator (about 25 days a turn) than near its poles (about 35).",
        "The Sun is about 4.6 billion years old, roughly halfway through its life.",
        "Its magnetic field flips about every 11 years; sunspots rise and fall with that cycle.",
        "The solar wind streams out at around 400 km/s, blowing a bubble round the solar system that both Voyagers have now left.",
        "The Sun is really white: it looks yellow from the ground because our air scatters some of its blue light away.",
    ],
    Mercury: [
        "A year on Mercury (88 Earth days) is shorter than one of its days from sunrise to sunrise (176 Earth days).",
        "It's the smallest planet, only a little bigger than our Moon.",
        "It's closest to the Sun, yet not the hottest planet: Venus is.",
        "Its surface swings from about 430 °C by day to about −180 °C at night.",
        "There's water ice in craters near its poles that sunlight never reaches.",
        "It has almost no atmosphere, just a thin haze of atoms called an exosphere.",
        "Its iron core fills about 85% of its radius.",
        "Mercury has no moons.",
        "It's slowly shrinking as its core cools, wrinkling its surface into cliffs hundreds of kilometres long.",
        "It's the fastest planet, racing round the Sun at about 47 km/s.",
        "Only three spacecraft have been sent there: Mariner 10, MESSENGER, and the European and Japanese BepiColombo.",
    ],
    Venus: [
        "A day on Venus (243 Earth days to turn once) is longer than its year (225 Earth days).",
        "It spins backwards compared with most planets, so there the Sun rises in the west.",
        "It's the hottest planet, about 465 °C at the surface: hot enough to melt lead.",
        "The air pressure on its surface is about 92 times Earth's, like being 900 m under the sea.",
        "Its clouds are made of sulphuric acid.",
        "After the Moon, it's the brightest natural thing in the night sky.",
        "Venus is almost the same size as Earth, which is why it's called Earth's twin.",
        "The Soviet lander Venera 13 lasted 127 minutes on its surface in 1982 before the heat and pressure won.",
        "Venus has no moons.",
        "Its thick carbon dioxide air traps heat in a runaway greenhouse effect.",
        "Its upper clouds whip round the planet in about 4 Earth days, far faster than the planet itself turns.",
    ],
    Earth: [
        "It's the only place we know of with life.",
        "About 71% of its surface is covered by water.",
        "It's the densest planet in the solar system.",
        "Its spin is slowly slowing: days get about 2 milliseconds longer every century.",
        "It's closest to the Sun in early January, in the middle of the northern winter.",
        "It carries you round the Sun at about 30 km/s.",
        "The Moon is drifting away from it, about 3.8 cm a year.",
        "Everest is the highest peak above sea level, but Chimborazo in Ecuador reaches farthest from Earth's centre, thanks to the bulge at the equator.",
        "Measured against the stars, a day is 23 hours 56 minutes.",
        "Its magnetic field shields it from much of the solar wind; where the two meet near the poles, you get the aurora.",
        "It's the largest of the four rocky planets.",
    ],
    Moon: [
        "The Moon always shows Earth the same face: it turns exactly once each orbit.",
        "It's moving away from Earth by about 3.8 cm a year.",
        "Twelve people have walked on it, all between 1969 and 1972.",
        "Instruments on India's Chandrayaan-1 found signs of water on its surface in 2009.",
        "India's Chandrayaan-3 made the first landing near its south pole, in August 2023.",
        "It's about a quarter of Earth's width.",
        "Its gravity is about a sixth of Earth's.",
        "It probably formed from the debris of a Mars-sized body hitting the young Earth.",
        "With no air or weather, footprints left on it can last millions of years.",
        "It raises most of Earth's ocean tides.",
        "Its surface goes from about 120 °C in sunlight to below −170 °C at night.",
    ],
    Mars: [
        "Olympus Mons, the tallest volcano in the solar system, rises about 22 km, over twice as high as Everest.",
        "Valles Marineris, its great canyon, is about 4,000 km long.",
        "It's red because of iron oxide, rust, in its dust.",
        "It has two small moons, Phobos and Deimos.",
        "A day on Mars lasts about 24 hours 40 minutes.",
        "India's Mangalyaan reached Mars orbit on its first try in 2014, the first Asian mission to get there.",
        "Its gravity is about 38% of Earth's.",
        "Its dust storms can wrap the whole planet for weeks.",
        "It has seasons like Earth's, since its axis leans about 25°.",
        "Sunsets on Mars glow blue.",
        "NASA's Ingenuity made the first powered flight on another planet there, in 2021.",
    ],
    Jupiter: [
        "Jupiter is more than twice as massive as all the other planets put together.",
        "Its Great Red Spot is a storm bigger than Earth that has raged for centuries.",
        "It turns in under 10 hours, the fastest spin of any planet.",
        "Its moon Ganymede is bigger than the planet Mercury.",
        "Its moon Europa likely hides a salty ocean under its ice.",
        "Its moon Io is the most volcanic place in the solar system.",
        "It has faint rings, found by Voyager 1 in 1979.",
        "About 1,300 Earths would fit inside it.",
        "Its magnetic field is the strongest of any planet's.",
        "Galileo spotted its four largest moons in 1610, the first moons ever found round another planet.",
        "It has no solid surface: it's mostly hydrogen and helium all the way down.",
    ],
    Saturn: [
        "Saturn is less dense than water: in a big enough bath, it would float.",
        "Its main rings stretch hundreds of thousands of kilometres across but are often only tens of metres thick.",
        "The rings are mostly chunks of water ice, from specks of dust to pieces the size of a house.",
        "A six-sided jet stream, the hexagon, circles its north pole.",
        "Its largest moon, Titan, has a thick atmosphere and lakes of liquid methane.",
        "Its moon Enceladus sprays geysers of water ice from an ocean under its crust.",
        "It has more known moons than any other planet.",
        "A day on Saturn lasts about 10 hours 33 minutes.",
        "The Cassini spacecraft orbited it for 13 years before diving into it in 2017.",
        "Its winds reach about 1,800 km/h.",
        "It's visibly squashed: about 10% wider at the equator than from pole to pole.",
    ],
    Uranus: [
        "Uranus spins on its side, its axis tipped about 98°.",
        "Each of its poles gets about 42 years of sunlight, then 42 years of darkness.",
        "It was the first planet found with a telescope, by William Herschel in 1781.",
        "It's an ice giant: water, ammonia and methane ices round a small rocky core.",
        "Methane in its air soaks up red light, which is why it looks blue-green.",
        "It has the coldest atmosphere measured on any planet, about −224 °C.",
        "Voyager 2 is the only spacecraft ever to visit it, in 1986.",
        "Its moons are named after characters from Shakespeare and Alexander Pope.",
        "It has 13 known rings, faint and dark.",
        "A year on Uranus lasts 84 Earth years.",
    ],
    Neptune: [
        "Neptune was found by maths before anyone saw it: its pull on Uranus gave it away, in 1846.",
        "It has the fastest winds in the solar system, over 2,000 km/h.",
        "A year there lasts 165 Earth years; it finished its first orbit since its discovery in 2011.",
        "Its largest moon, Triton, orbits backwards, and was probably captured from farther out.",
        "Triton has geysers of nitrogen.",
        "Voyager 2 is the only spacecraft ever to visit it, in 1989.",
        "It gives off about 2.6 times as much heat as it gets from the Sun.",
        "Its deep blue comes from methane in its air.",
        "Sunlight takes about 4 hours to reach it.",
        "Voyager 2 saw a Great Dark Spot on it, a storm the size of Earth, which had vanished by 1994.",
    ],
    Pluto: [
        "Pluto was reclassified as a dwarf planet in 2006.",
        "It's smaller than Earth's Moon.",
        "NASA's New Horizons flew past it in July 2015, the first close look anyone had.",
        "Its heart-shaped plain, Sputnik Planitia, is a vast basin of nitrogen ice.",
        "Its biggest moon, Charon, is half its width; the two circle a point in the space between them.",
        "A year on Pluto lasts 248 Earth years.",
        "Its orbit is so stretched that from 1979 to 1999 it was closer to the Sun than Neptune.",
        "Clyde Tombaugh discovered it in 1930; some of his ashes flew past it aboard New Horizons.",
        "Its name was suggested by an 11-year-old girl in Oxford, Venetia Burney.",
        "It has mountains of water ice as tall as the Rockies.",
        "Sunlight takes about 5 and a half hours to reach it.",
    ],
};

/** The next fact about a body: in turn from a random start, none repeated until all have come round. */
export function nextFact(body: string): string {
    const list = FACTS[body];
    if (!list?.length) return "";
    const key = `space-facts:${body}`;
    let state = { start: Math.floor(Math.random() * list.length), seen: 0 };
    try {
        const kept = JSON.parse(localStorage.getItem(key) ?? "null") as typeof state | null;
        if (kept && Number.isInteger(kept.start) && Number.isInteger(kept.seen)) state = kept;
    } catch {
        /* a fresh start */
    }
    const fact = list[(state.start + state.seen) % list.length];
    state.seen += 1;
    try {
        localStorage.setItem(key, JSON.stringify(state));
    } catch {
        /* not kept: still in turn for this visit */
    }
    return fact;
}
