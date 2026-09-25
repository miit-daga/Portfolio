// A game's input, recorded for the server to replay (run-sim.ts, flight-sim.ts):
// one sample of a few whole numbers every few simulation steps, written as a
// compact string to post with the score.
//
// Each field can be stored as the change from the sample before (a mouse held
// still, or moved a little, costs a byte), and a run of identical samples is
// stored once with its count, so a keyboard player's tape is tiny. Numbers are
// zigzag varints, and the bytes are base64url.

const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

function toB64(bytes: number[]) {
    let s = "";
    for (let i = 0; i < bytes.length; i += 3) {
        const n = (bytes[i] << 16) | ((bytes[i + 1] ?? 0) << 8) | (bytes[i + 2] ?? 0);
        s += B64[(n >> 18) & 63] + B64[(n >> 12) & 63];
        if (i + 1 < bytes.length) s += B64[(n >> 6) & 63];
        if (i + 2 < bytes.length) s += B64[n & 63];
    }
    return s;
}

function fromB64(s: string): number[] | null {
    const out: number[] = [];
    let buf = 0;
    let bits = 0;
    for (const ch of s) {
        const v = B64.indexOf(ch);
        if (v < 0) return null;
        buf = (buf << 6) | v;
        bits += 6;
        if (bits >= 8) {
            bits -= 8;
            out.push((buf >> bits) & 255);
        }
    }
    return out;
}

const zig = (n: number) => (n << 1) ^ (n >> 31);
const unzig = (n: number) => (n >>> 1) ^ -(n & 1);

function putVar(out: number[], n: number) {
    let v = n >>> 0;
    while (v > 127) {
        out.push((v & 127) | 128);
        v >>>= 7;
    }
    out.push(v);
}

/** Samples (each `width` whole numbers) as a string; `delta[i]` stores field i as a change. */
export function encodeTape(samples: number[][], delta: boolean[]): string {
    const out: number[] = [];
    const prev = delta.map(() => 0);
    let i = 0;
    while (i < samples.length) {
        let n = 1;
        while (i + n < samples.length && samples[i + n].every((v, k) => v === samples[i][k]) && n < 100000) n++;
        putVar(out, n);
        samples[i].forEach((v, k) => {
            putVar(out, zig(delta[k] ? v - prev[k] : v));
            prev[k] = v;
        });
        i += n;
    }
    return toB64(out);
}

/** The samples back, or null for anything malformed (or longer than `max`). */
export function decodeTape(s: unknown, width: number, delta: boolean[], max: number): number[][] | null {
    if (typeof s !== "string" || s.length > max * width * 4 + 64) return null;
    const bytes = fromB64(s);
    if (!bytes) return null;
    const samples: number[][] = [];
    const prev = delta.map(() => 0);
    let p = 0;
    const getVar = () => {
        let v = 0;
        let shift = 0;
        for (;;) {
            if (p >= bytes.length || shift > 28) return null;
            const b = bytes[p++];
            v |= (b & 127) << shift;
            if (b < 128) return v >>> 0;
            shift += 7;
        }
    };
    while (p < bytes.length) {
        const n = getVar();
        if (n === null || n < 1 || samples.length + n > max) return null;
        const sample: number[] = [];
        for (let k = 0; k < width; k++) {
            const raw = getVar();
            if (raw === null) return null;
            const v = delta[k] ? prev[k] + unzig(raw) : unzig(raw);
            sample.push(v);
            prev[k] = v;
        }
        for (let j = 0; j < n; j++) samples.push(sample);
    }
    return samples;
}
