import { NextResponse } from "next/server";
import { issueSeed } from "@/lib/run-seed";

// A signed seed for the next open-field run of Asteroid Run or Free flight
// (lib/run-seed.ts): the games fetch one ahead of time, fly on it, and post it
// back with the run for the leaderboard to check.

export const dynamic = "force-dynamic";

export function GET(request: Request) {
    const game = new URL(request.url).searchParams.get("game");
    if (game !== "run" && game !== "flight") return NextResponse.json({ error: "Which game?" }, { status: 400 });
    return NextResponse.json(issueSeed(game), { headers: { "Cache-Control": "no-store" } });
}
