import { ImageResponse } from "next/og";
import { arriveRadius, bodyAt, launch, ringsOf, step } from "@/app/arcade/assist-sim";
import { decodeChallenge, flyChallenge, nameOf } from "@/app/arcade/challenge";

// A challenge link's preview picture (1200 x 630, for WhatsApp, X, Slack...):
// the mission as it stood at launch, the friend's course in gold, and the
// time to beat. Drawn from the link, and flown again here, so a link can't
// claim a time its shot doesn't fly. Anything wrong gets the plain picture.

const W = 1200;
const H = 630;
const COLOUR: Record<string, string> = {
    sun: "#fcd34d", mercury: "#a3a3a3", venus: "#e8c26b", earth: "#3b82f6", moon: "#d4d4d4", mars: "#c2410c",
    jupiter: "#d6b58c", saturn: "#e7d4a0", uranus: "#99e6e6", neptune: "#3b5bdb", rock: "#6b6258", blackhole: "#000000",
};
const fmt = (s: number) => `${s.toFixed(2)} s`;

export async function GET(request: Request) {
    const code = new URL(request.url).searchParams.get("c") ?? "";
    const c = decodeChallenge(code);
    const flown = c ? flyChallenge(c) : null;
    if (!c || !flown) return Response.redirect(new URL("/arcade/opengraph-image.jpg", request.url), 302);
    const { level, label, flight } = flown;

    // the course, point by point
    const p = launch(level, c.angle, c.power, c.t);
    const path: [number, number][] = [[p.x, p.y]];
    for (let k = 0; p.state === "flying"; k++) {
        step(level, p);
        if (k % 4 === 0) path.push([p.x, p.y]);
    }
    path.push([p.x, p.y]);

    // fit the mission and the course into the right-hand panel
    const bodies = level.bodies.map((b) => ({ b, at: bodyAt(b, c.t) }));
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    const take = (x: number, y: number, r = 0) => ((x0 = Math.min(x0, x - r)), (x1 = Math.max(x1, x + r)), (y0 = Math.min(y0, y - r)), (y1 = Math.max(y1, y + r)));
    bodies.forEach(({ b, at }) => take(at[0], at[1], (ringsOf(b)?.outer ?? b.r) + 1));
    path.forEach(([x, y]) => take(x, y, 1));
    // (clear of the words on the left)
    const PW = 610, PH = 540;
    const scale = Math.min(PW / (x1 - x0), PH / (y1 - y0));
    const X = (x: number) => (x - (x0 + x1) / 2) * scale + PW / 2;
    const Y = (y: number) => PH / 2 - (y - (y0 + y1) / 2) * scale;
    const target = level.bodies[level.target];
    const tAt = bodyAt(target, c.t);

    // a sky of small stars, the same for every picture
    let s = 7;
    const rand = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    const stars = Array.from({ length: 140 }, () => ({ x: rand() * W, y: rand() * H, r: rand() < 0.1 ? 2 : 1, o: 0.2 + rand() * 0.6 }));

    return new ImageResponse(
        (
            <div style={{ width: W, height: H, display: "flex", background: "#03040a", position: "relative", fontFamily: "sans-serif", color: "#fff" }}>
                {stars.map((st, i) => (
                    <div key={i} style={{ position: "absolute", left: st.x, top: st.y, width: st.r, height: st.r, borderRadius: 2, background: "#fff", opacity: st.o }} />
                ))}
                <div style={{ position: "absolute", left: 64, top: 0, bottom: 0, width: 440, display: "flex", flexDirection: "column", justifyContent: "center" }}>
                    <div style={{ fontSize: 18, letterSpacing: 6, color: "#c4b5fd", textTransform: "uppercase" }}>Gravity Assist · challenge</div>
                    <div style={{ fontSize: 30, marginTop: 18, color: "#e5e5e5" }}>{label}</div>
                    <div style={{ fontSize: 26, marginTop: 10, color: "#a3a3a3" }}>{`A friend reached ${nameOf(target)} in`}</div>
                    <div style={{ fontSize: 96, fontWeight: 700, color: "#fcd34d", marginTop: 6, lineHeight: 1 }}>{fmt(flight.flight)}</div>
                    <div style={{ fontSize: 30, marginTop: 20, color: "#fff" }}>Can you beat it?</div>
                    <div style={{ fontSize: 20, marginTop: 36, color: "#737373" }}>miitdaga.dev/arcade</div>
                </div>
                <div style={{ position: "absolute", right: 36, top: 45, width: PW, height: PH, display: "flex" }}>
                    <svg width={PW} height={PH} viewBox={`0 0 ${PW} ${PH}`}>
                        {bodies.map(({ b, at }, i) => {
                            const cx = X(at[0]);
                            const cy = Y(at[1]);
                            const r = Math.max(2.5, b.r * scale);
                            const rings = ringsOf(b);
                            return (
                                <g key={i}>
                                    {b.kind === "blackhole" && <circle cx={cx} cy={cy} r={r * 2.6} fill="#c2410c" opacity={0.35} />}
                                    {b.kind === "blackhole" && <circle cx={cx} cy={cy} r={r * 1.5} fill="#fdba74" opacity={0.55} />}
                                    {b.kind === "sun" && <circle cx={cx} cy={cy} r={r * 2.2} fill="#f59e0b" opacity={0.25} />}
                                    {rings && <circle cx={cx} cy={cy} r={((rings.inner + rings.outer) / 2) * scale} fill="none" stroke="#c9b27f" strokeWidth={(rings.outer - rings.inner) * scale} opacity={0.55} />}
                                    <circle cx={cx} cy={cy} r={r} fill={COLOUR[b.kind] ?? "#999"} />
                                </g>
                            );
                        })}
                        <circle cx={X(tAt[0])} cy={Y(tAt[1])} r={arriveRadius(level, target) * scale} fill="none" stroke="#5eead4" strokeWidth={2} strokeDasharray="8 6" opacity={0.8} />
                        <polyline points={path.map(([x, y]) => `${X(x).toFixed(1)},${Y(y).toFixed(1)}`).join(" ")} fill="none" stroke="#fcd34d" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </div>
            </div>
        ),
        { width: W, height: H, headers: { "Cache-Control": "public, max-age=3600, s-maxage=86400" } },
    );
}
