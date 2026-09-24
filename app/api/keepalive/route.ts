import { NextResponse } from "next/server";
import { hasKv, kv } from "@/lib/store";

// Once a day, from Vercel's cron (vercel.json): one write to Redis, so a
// quiet month can never leave the free database idle for the 30 days after
// which Upstash archives it. Only Vercel's cron is answered (its user agent,
// or CRON_SECRET if one is set), so nobody else can spend the database's
// requests through it.
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
    const secret = process.env.CRON_SECRET;
    const fromCron = secret
        ? request.headers.get("authorization") === `Bearer ${secret}`
        : (request.headers.get("user-agent") ?? "").startsWith("vercel-cron");
    if (!fromCron) return NextResponse.json({ error: "Not for you." }, { status: 401 });
    if (!hasKv()) return NextResponse.json({ ok: false, error: "No Redis configured." }, { status: 503 });
    await kv(["SET", "keepalive", new Date().toISOString()]);
    return NextResponse.json({ ok: true });
}
