// The arcade's daily seed, shared by the games and the server (no three.js here).

/** Today, in UTC ("2026-09-25"): the key for the arcade's daily games. */
export const todayKey = () => new Date().toISOString().slice(0, 10);

/** A random number generator that gives the same sequence for the same key
 * (mulberry32, seeded from the key's hash): the daily games use it so that
 * everyone gets the same field, or the same station, on the same day. */
export function seededRandom(key: string) {
    let h = 1779033703 ^ key.length;
    for (let i = 0; i < key.length; i++) h = Math.imul(h ^ key.charCodeAt(i), 3432918353), (h = (h << 13) | (h >>> 19));
    let a = h >>> 0;
    return () => {
        a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

