interface Env {
  TTC_BUSTIME_API_KEY?: string;
}

export async function onRequestGet({
  request,
  env,
}: {
  request: Request;
  env: Env;
}): Promise<Response> {
  if (!env.TTC_BUSTIME_API_KEY) {
    return Response.json(
      { error: 'TTC live tracking is not configured.' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  const route = new URL(request.url).searchParams.get('rt') || '121';
  if (!/^[A-Za-z0-9,-]{1,40}$/.test(route)) {
    return Response.json({ error: 'Invalid route.' }, { status: 400 });
  }

  const upstreamUrl = new URL('https://bustime.ttc.ca/api/v3/getvehicles');
  upstreamUrl.searchParams.set('key', env.TTC_BUSTIME_API_KEY);
  upstreamUrl.searchParams.set('rt', route);
  upstreamUrl.searchParams.set('format', 'json');
  upstreamUrl.searchParams.set('tmres', 's');

  try {
    const upstream = await fetch(upstreamUrl, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(4500),
    });
    const body = await upstream.text();
    return new Response(body, {
      status: upstream.status,
      headers: {
        'Content-Type': upstream.headers.get('Content-Type') || 'application/json',
        'Cache-Control': 'no-store',
      },
    });
  } catch {
    return Response.json(
      { error: 'The TTC live feed could not be reached.' },
      { status: 502, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
