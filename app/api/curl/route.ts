import { NextResponse } from "next/server";

// Narrow read-only proxy, so the terminal's `curl` can reach the handful of
// public endpoints this site already talks to. Browsers block cross-origin
// fetches, and the alternative to a proxy is faking the output.
//
// This is deliberately NOT a general proxy. An open one is an SSRF hole: it
// would let anyone probe internal services, reach cloud metadata endpoints, or
// bounce traffic off this deployment's IP. Hence the exact-host allowlist, the
// https-only rule, GET/HEAD only, no redirect following, and the size,
// time and rate caps below.

export const dynamic = "force-dynamic";

// Exact hostname matches only. No wildcards, no suffix matching.
const ALLOWED_HOSTS = new Set([
  "api.github.com",
  "api.wheretheiss.at",
  "api.open-notify.org",        // who is in space right now
  "api.spacexdata.com",         // launches, rockets, capsules
  "api.le-systeme-solaire.net", // every body in the solar system
  "api.sunrise-sunset.org",     // sunrise/sunset for any coordinates
  "api.ipify.org",              // the caller's own IP
]);

const MAX_BYTES = 64 * 1024;
const TIMEOUT_MS = 5000;
const RATE_LIMIT = 20; // requests per window, per IP
const RATE_WINDOW_MS = 60_000;

// Best effort only: serverless instances do not share memory, so this throttles
// a casual hammering rather than a distributed one. The allowlist is what
// actually bounds the blast radius.
const hits = new Map<string, number[]>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 500) hits.clear(); // crude ceiling on memory growth
  return recent.length > RATE_LIMIT;
}

function clientIp(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    req.headers.get("x-real-ip")?.trim() ||
    "unknown"
  );
}

// Headers worth showing; everything else is noise or fingerprinting.
const SHOWN_HEADERS = [
  "content-type",
  "content-length",
  "date",
  "server",
  "cache-control",
  "location",
  "x-ratelimit-remaining",
  "x-ratelimit-reset",
];

export async function GET(request: Request) {
  const ip = clientIp(request);
  if (rateLimited(ip)) {
    return NextResponse.json(
      { error: "Too many proxied requests. Wait a minute." },
      { status: 429 },
    );
  }

  const raw = new URL(request.url).searchParams.get("url") || "";
  if (!raw) {
    return NextResponse.json({ error: "No url given." }, { status: 400 });
  }

  let target: URL;
  try {
    target = new URL(raw);
  } catch {
    return NextResponse.json({ error: `Could not parse '${raw}'.` }, { status: 400 });
  }

  if (target.protocol !== "https:") {
    return NextResponse.json({ error: "Only https is proxied." }, { status: 400 });
  }
  // Credentials in the URL would be forwarded upstream; refuse outright.
  if (target.username || target.password) {
    return NextResponse.json({ error: "Credentials in the URL are not accepted." }, { status: 400 });
  }
  if (!ALLOWED_HOSTS.has(target.hostname)) {
    return NextResponse.json(
      {
        error: `${target.hostname} is not on the proxy allowlist.`,
        allowed: [...ALLOWED_HOSTS],
      },
      { status: 403 },
    );
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const upstream = await fetch(target.toString(), {
      method: "GET",
      // Not followed: a redirect could land on a host that is not allowlisted,
      // and there is no per-hop hook to re-check it. The 3xx is surfaced as-is.
      redirect: "manual",
      signal: controller.signal,
      headers: { accept: "*/*", "user-agent": "miit-daga-portfolio-terminal" },
      cache: "no-store",
    });

    const type = upstream.headers.get("content-type") || "";
    const textual = /^(text\/|application\/(json|xml|javascript|x-ndjson))/i.test(type) || type === "";
    if (!textual) {
      return NextResponse.json({
        ok: true,
        status: upstream.status,
        statusText: upstream.statusText,
        headers: pickHeaders(upstream.headers),
        body: `[${type || "binary"} response, not shown]`,
        truncated: false,
      });
    }

    const full = await upstream.text();
    const truncated = full.length > MAX_BYTES;

    return NextResponse.json({
      ok: true,
      status: upstream.status,
      statusText: upstream.statusText,
      headers: pickHeaders(upstream.headers),
      body: truncated ? full.slice(0, MAX_BYTES) : full,
      truncated,
    });
  } catch (error) {
    const aborted = error instanceof Error && error.name === "AbortError";
    return NextResponse.json(
      { error: aborted ? `Timed out after ${TIMEOUT_MS / 1000}s.` : "Upstream request failed." },
      { status: 504 },
    );
  } finally {
    clearTimeout(timer);
  }
}

function pickHeaders(h: Headers): Record<string, string> {
  const out: Record<string, string> = {};
  for (const name of SHOWN_HEADERS) {
    const v = h.get(name);
    if (v) out[name] = v;
  }
  return out;
}
