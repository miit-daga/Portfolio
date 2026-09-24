import { NextResponse } from "next/server";
import { dailyMission, dayKey, isDayKey } from "@/app/arcade/assist-daily";

// Gravity Assist's mission of the day (app/arcade/assist-daily.ts), laid out
// here so every browser plays exactly the same one. ?day=YYYY-MM-DD (UTC),
// today or yesterday (a player's evening can be the next UTC day's start).
export const dynamic = "force-dynamic";

export function GET(request: Request) {
    const asked = new URL(request.url).searchParams.get("day");
    const today = dayKey();
    const yesterday = dayKey(new Date(Date.now() - 86_400_000));
    const day = isDayKey(asked) && (asked === today || asked === yesterday) ? asked : today;
    return NextResponse.json(
        { day, level: dailyMission(day) },
        // the same for a whole day: let the CDN keep it
        { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" } },
    );
}
