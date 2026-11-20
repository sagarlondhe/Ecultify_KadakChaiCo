import { createFaviconIco } from '@/lib/favicon-assets';

export const dynamic = 'force-static';

export function GET() {
  const ico = createFaviconIco();
  const body = new Uint8Array(ico.length);
  body.set(ico);
  return new Response(body, {
    headers: {
      'content-type': 'image/x-icon',
      'cache-control': 'public, max-age=31536000, immutable',
    },
  });
}
