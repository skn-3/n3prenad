import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const CASEFLOW_GATEWAY_URL =
  'https://gzeovhwoouoxfenaxsss.supabase.co/functions/v1/caseflow-gateway';
const GATEWAY_SECRET = Deno.env.get('CASEFLOW_GATEWAY_SECRET') ?? '';

const ALLOW_HEADERS = {
  ...corsHeaders,
  'Access-Control-Allow-Headers':
    (corsHeaders as Record<string, string>)['Access-Control-Allow-Headers'],
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: ALLOW_HEADERS });
  }

  if (!GATEWAY_SECRET) {
    return new Response(
      JSON.stringify({ error: 'CASEFLOW_GATEWAY_SECRET not configured' }),
      { status: 500, headers: { ...ALLOW_HEADERS, 'Content-Type': 'application/json' } },
    );
  }

  let bodyText = '';
  try {
    bodyText = await req.text();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid body' }), {
      status: 400,
      headers: { ...ALLOW_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  try {
    const upstream = await fetch(CASEFLOW_GATEWAY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-gateway-secret': GATEWAY_SECRET,
      },
      body: bodyText,
    });

    const respText = await upstream.text();
    return new Response(respText, {
      status: upstream.status,
      headers: {
        ...ALLOW_HEADERS,
        'Content-Type':
          upstream.headers.get('Content-Type') ?? 'application/json',
      },
    });
  } catch (err) {
    console.error('[caseflow-proxy] error:', err);
    return new Response(
      JSON.stringify({ error: (err as Error).message || 'Proxy error' }),
      { status: 502, headers: { ...ALLOW_HEADERS, 'Content-Type': 'application/json' } },
    );
  }
});