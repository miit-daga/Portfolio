// The contact globe's ping (components/ui/signal-globe.tsx): an empty reply
// from the edge, so the round trip timed in the browser is the network's and
// not the server's. It measures to this site's nearest server, not to Kolkata.

export const runtime = "edge";
export const dynamic = "force-dynamic";

export function GET() {
    return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
}
