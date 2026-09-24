// Every Gravity Assist mission flown before the site builds: each must be
// winnable and not too easy, and a still mission with no flyby to make must
// not be won by simply aiming straight at the target (as Two giants once
// was). Run with `pnpm check:missions`; the build runs it first, so a mission
// that breaks never goes live.
//
// It flies a spread of shots (every 2 degrees, powers 0.2 to 1, and, where
// planets move, a spread of launch times) with the game's own physics. (Where
// the target moves, aiming at where it is now is itself a puzzle; where a
// flyby is asked for, a straight shot that arrives has made it.)

import { LEVELS, bodyAt, fly } from "../app/arcade/assist-sim";

const MAX_SHARE = 0.06; // more than 6% of shots arriving is too easy
const STRAIGHT_OK = 3; // the first three missions may be won by aiming at the target
const MAX_STRAIGHT = 0.05; // otherwise, no more than 5% of the shots aimed straight at it may arrive

const started = Date.now();
const problems: string[] = [];
LEVELS.forEach((L, i) => {
    const moving = L.bodies.some((b) => b.orbit);
    const periods = L.bodies.filter((b) => b.orbit).map((b) => b.orbit!.period * 1.9);
    const times = moving ? Array.from({ length: 8 }, (_, k) => (k / 8) * Math.max(...periods)) : [0];
    const judgeStraight = i >= STRAIGHT_OK && !moving && !L.flyby?.length && L.start !== L.target;
    let win = 0;
    let n = 0;
    let straight = 0;
    let straightN = 0;
    for (const t of times) {
        const e = bodyAt(L.bodies[L.start], t);
        const g = bodyAt(L.bodies[L.target], t);
        const direct = Math.atan2(g[1] - e[1], g[0] - e[0]);
        for (let a = 0; a < 360; a += 2)
            for (let pw = 0.2; pw <= 1.0001; pw += 0.05) {
                n++;
                if (fly(L, (a * Math.PI) / 180, pw, t).state === "arrived") win++;
            }
        if (judgeStraight)
            // (within 8 degrees either way: what looks like aiming at it on screen)
            for (let d = -8; d <= 8; d += 0.5)
                for (let pw = 0.2; pw <= 1.0001; pw += 0.05) {
                    straightN++;
                    if (fly(L, direct + (d * Math.PI) / 180, pw, t).state === "arrived") straight++;
                }
    }
    const share = win / n;
    const tag = `${String(i + 1).padStart(2)} ${L.name}`;
    if (win === 0) problems.push(`${tag}: no shot arrives`);
    else if (share > MAX_SHARE) problems.push(`${tag}: too easy, ${(share * 100).toFixed(1)}% of shots arrive`);
    const straightShare = straightN ? straight / straightN : 0;
    if (straightShare > MAX_STRAIGHT) problems.push(`${tag}: too often won by aiming straight at the target (${(straightShare * 100).toFixed(0)}% of those shots)`);
    console.log(`${tag.padEnd(26)} ${(share * 100).toFixed(2)}%${judgeStraight ? `   straight: ${(straightShare * 100).toFixed(1)}%` : ""}`);
});
console.log(`\n${LEVELS.length} missions checked in ${((Date.now() - started) / 1000).toFixed(0)} s`);
if (problems.length) {
    console.error(`\nMission check failed:\n  ${problems.join("\n  ")}`);
    process.exit(1);
}
