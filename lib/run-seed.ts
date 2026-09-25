// Seeds for the arcade's open fields (Asteroid Run and Free flight), chosen by
// the server and signed, so a posted run's field is one the server dealt, not
// one picked afterwards to suit a recorded input. The daily fields don't need
// this: their seed is the date, the same for everyone.
//
// A token is "seed.issued.signature": the signature an HMAC over the seed and
// when it was issued, keyed from a server-only secret already set up for the
// site's storage (so there's no new one to keep). Server-side only.

import { createHmac, randomInt, timingSafeEqual } from "node:crypto";

const MAX_AGE_MS = 3 * 3_600_000;

function key() {
    const secret = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || process.env.GITHUB_API_TOKEN || "dev-only";
    return createHmac("sha256", secret).update("arcade-run-seed").digest();
}

const sign = (payload: string) => createHmac("sha256", key()).update(payload).digest("base64url");

/** A new seed and its token. */
export function issueSeed(game: "run" | "flight") {
    const seed = randomInt(0, 2 ** 32 - 1);
    const payload = `${game}.${seed}.${Date.now()}`;
    return { seed, token: `${payload}.${sign(payload)}` };
}

/** The seed a token was issued for, if it's genuine, for this game, and fresh; else null. */
export function checkSeed(token: unknown, game: "run" | "flight"): { seed: number; issued: number } | null {
    if (typeof token !== "string" || token.length > 200) return null;
    const parts = token.split(".");
    if (parts.length !== 4) return null;
    const [g, seedStr, issuedStr, sig] = parts;
    const payload = `${g}.${seedStr}.${issuedStr}`;
    const want = Buffer.from(sign(payload));
    const got = Buffer.from(sig);
    if (want.length !== got.length || !timingSafeEqual(want, got)) return null;
    const seed = Number(seedStr);
    const issued = Number(issuedStr);
    if (g !== game || !Number.isInteger(seed) || seed < 0 || seed > 0xffffffff) return null;
    if (!Number.isFinite(issued) || Date.now() - issued > MAX_AGE_MS || issued > Date.now() + 60_000) return null;
    return { seed, issued };
}
