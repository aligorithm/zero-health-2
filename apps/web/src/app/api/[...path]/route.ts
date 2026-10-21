// Catch-all proxy: forwards /api/* to the Express backend.
//
// The backend origin is read per request so it can be overridden at runtime
// (API_ORIGIN env var) in both `next dev` and `next start`, no rebuild needed.
// Default matches the lab's standard API port (4000).

import { NextRequest } from 'next/server';

const DEFAULT_API_ORIGIN = 'http://127.0.0.1:4000';

// Read the env var via computed access so it is evaluated per request at
// runtime, not inlined into the build (direct `process.env.X` member access
// gets statically replaced at build time in route handlers).
function apiOrigin(): string {
  const env = process.env as Record<string, string | undefined>;
  return env['API_ORIGIN'] || DEFAULT_API_ORIGIN;
}

async function proxy(req: NextRequest, path: string[]): Promise<Response> {
  const url = `${apiOrigin()}/api/${path.join('/')}${req.nextUrl.search}`;

  const headers: Record<string, string> = {};
  const auth = req.headers.get('authorization');
  if (auth) headers['Authorization'] = auth;
  const contentType = req.headers.get('content-type');
  if (contentType) headers['Content-Type'] = contentType;

  const hasBody = req.method !== 'GET' && req.method !== 'HEAD';
  // ArrayBuffer passthrough keeps JSON and multipart/binary bodies intact.
  const body = hasBody ? await req.arrayBuffer() : undefined;

  try {
    const res = await fetch(url, { method: req.method, headers, body, cache: 'no-store' });
    // Binary-safe response passthrough (uploaded images are served through
    // this proxy too).
    const buf = await res.arrayBuffer();
    const outHeaders: Record<string, string> = {
      'Content-Type': res.headers.get('content-type') || 'application/json',
    };
    const labHeader = res.headers.get('x-zero-health-lab');
    if (labHeader) outHeaders['X-Zero-Health-Lab'] = labHeader;
    const cacheHeader = res.headers.get('cache-control');
    if (cacheHeader) outHeaders['Cache-Control'] = cacheHeader;
    return new Response(buf, { status: res.status, headers: outHeaders });
  } catch {
    return new Response(JSON.stringify({ error: 'API unreachable. Is the API running?' }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

type Ctx = { params: { path: string[] } };

export async function GET(req: NextRequest, ctx: Ctx): Promise<Response> {
  return proxy(req, ctx.params.path);
}

export async function POST(req: NextRequest, ctx: Ctx): Promise<Response> {
  return proxy(req, ctx.params.path);
}

export async function PATCH(req: NextRequest, ctx: Ctx): Promise<Response> {
  return proxy(req, ctx.params.path);
}

export async function PUT(req: NextRequest, ctx: Ctx): Promise<Response> {
  return proxy(req, ctx.params.path);
}

export async function DELETE(req: NextRequest, ctx: Ctx): Promise<Response> {
  return proxy(req, ctx.params.path);
}
