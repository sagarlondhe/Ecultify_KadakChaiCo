import { createFaviconPng } from '@/lib/favicon-assets';

export const dynamic = 'force-static';

export function GET() {
  const png = createFaviconPng();
  const body = new Uint8Array(png.length);
  body.set(png);
  return new Response(body, {
    headers: {
      'content-type': 'image/png',
      'cache-control': 'public, max-age=31536000, immutable',
    },
  });
}
