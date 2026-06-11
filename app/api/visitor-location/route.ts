import { NextRequest, NextResponse } from 'next/server';

// Visitor geolocation for the Contact signal globe, read from the headers
// Vercel attaches to every request after IP-geolocating it at the edge. No
// third-party service involved and only coordinates reach the client. The
// headers don't exist on localhost, so the globe falls back to its
// timezone-based estimate there.
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const lat = parseFloat(req.headers.get('x-vercel-ip-latitude') ?? '');
  const lon = parseFloat(req.headers.get('x-vercel-ip-longitude') ?? '');
  // Vercel percent-encodes the city name (e.g. S%C3%A3o%20Paulo)
  const cityRaw = req.headers.get('x-vercel-ip-city');
  let city: string | null = null;
  if (cityRaw) {
    try {
      city = decodeURIComponent(cityRaw);
    } catch {
      city = cityRaw;
    }
  }

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return NextResponse.json({ lat: null, lon: null, city: null });
  }
  return NextResponse.json({ lat, lon, city });
}
