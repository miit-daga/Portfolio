import { RESUME_DOWNLOAD_URL } from "@/lib/resume";

// The resume PDF itself, fetched from Drive, so /resume can draw it on its
// monitor (app/resume/pdf-screen.tsx) instead of embedding Drive's viewer,
// whose own buttons cannot be hidden. Nothing is copied into the site: this
// reads the same Drive file every time, cached for 10 minutes, so replacing the
// file in Drive (same link, lib/resume.ts) updates it here too.

export const dynamic = "force-dynamic";

export async function GET() {
    try {
        const res = await fetch(RESUME_DOWNLOAD_URL, { cache: "no-store", redirect: "follow" });
        const buf = await res.arrayBuffer();
        // Drive answers a missing or private file with an HTML page, not an error
        const head = new TextDecoder().decode(buf.slice(0, 5));
        if (!res.ok || head !== "%PDF-") return new Response("Resume unavailable", { status: 502 });
        return new Response(buf, {
            headers: {
                "Content-Type": "application/pdf",
                "Cache-Control": "public, s-maxage=600, stale-while-revalidate=3600",
            },
        });
    } catch {
        return new Response("Resume unavailable", { status: 502 });
    }
}
