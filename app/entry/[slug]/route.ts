import { getPublicEntryBySlug } from '@/lib/entries/service';

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    switch (character) {
      case '&':
        return '&amp;';
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '"':
        return '&quot;';
      default:
        return '&#39;';
    }
  });
}

function htmlResponse(body: string, status: number): Response {
  return new Response(body, {
    status,
    headers: {
      'cache-control': 'private, no-store, max-age=0',
      'content-type': 'text/html; charset=utf-8',
      'x-content-type-options': 'nosniff',
    },
  });
}

function notFoundHtml(): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="robots" content="noindex">
    <title>Story not found | Kadak Chai Co.</title>
    <style>
      :root{font-family:Arial,sans-serif;color:#3b241b;background:#f8f0df}
      *{box-sizing:border-box}
      body{min-height:100vh;margin:0;display:grid;place-items:center;padding:24px}
      main{width:min(100%,576px);padding:48px 32px;text-align:center;background:#fff;border:1px solid #e6d3b8;border-radius:32px;box-shadow:0 20px 55px #371c1320}
      .brand{color:#9a5b21;font-size:12px;font-weight:700;letter-spacing:.2em;text-transform:uppercase}
      h1{margin:24px 0 16px;font-family:Georgia,serif;font-size:clamp(30px,7vw,40px);line-height:1.15}
      p{color:#674d3f;font-size:15px;line-height:1.6}
      a{display:inline-flex;min-height:44px;align-items:center;margin-top:24px;padding:0 24px;border-radius:24px;background:#49271b;color:#fff;text-decoration:none;font-weight:700}
      a:focus-visible,button:focus-visible{outline:3px solid #c97a28;outline-offset:3px}
    </style>
  </head>
  <body>
    <main>
      <p class="brand">Kadak Chai Co. &middot; #MyChaiBreak</p>
      <h1>We couldn&rsquo;t find that chai break.</h1>
      <p>This moment may have moved on, or the link may not be right.</p>
      <a href="/">Back to Kadak Chai Co.</a>
    </main>
  </body>
</html>`;
}

function errorHtml(): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="robots" content="noindex">
    <title>Story unavailable | Kadak Chai Co.</title>
    <style>
      :root{font-family:Arial,sans-serif;color:#3b241b;background:#f8f0df}
      body{min-height:100vh;margin:0;display:grid;place-items:center;padding:24px}
      main{width:min(100%,576px);padding:48px 32px;text-align:center;background:#fff;border:1px solid #e6d3b8;border-radius:32px}
      h1{font-family:Georgia,serif}
      p{color:#674d3f;line-height:1.6}
      a{color:#49271b;font-weight:700}
    </style>
  </head>
  <body>
    <main>
      <p>Kadak Chai Co. &middot; #MyChaiBreak</p>
      <h1>We couldn&rsquo;t load that chai break.</h1>
      <p>Please try again in a moment.</p>
      <a href="/">Back to Kadak Chai Co.</a>
    </main>
  </body>
</html>`;
}

function resultHtml(
  requestUrl: string,
  entry: NonNullable<Awaited<ReturnType<typeof getPublicEntryBySlug>>>
): string {
  const firstName = escapeHtml(entry.firstName);
  const city = escapeHtml(entry.city);
  const caption = entry.caption ? escapeHtml(entry.caption) : '';
  const category = entry.category ? escapeHtml(entry.category) : '';
  const request = new URL(requestUrl);
  const canonical = request.pathname;
  const title = `${entry.firstName}'s #MyChaiBreak`;
  const description = entry.caption
    ? `${entry.caption} Shared from ${entry.city}.`
    : `A chai break shared from ${entry.city}.`;

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="description" content="${escapeHtml(description)}">
    <meta name="robots" content="index,follow">
    <link rel="canonical" href="${escapeHtml(canonical)}">
    <meta property="og:title" content="${escapeHtml(title)}">
    <meta property="og:description" content="${escapeHtml(description)}">
    <meta property="og:type" content="article">
    <meta property="og:url" content="${escapeHtml(canonical)}">
    <meta name="twitter:card" content="summary">
    <meta name="twitter:title" content="${escapeHtml(title)}">
    <meta name="twitter:description" content="${escapeHtml(description)}">
    <title>${escapeHtml(title)}</title>
    <style>
      :root{font-family:Arial,sans-serif;color:#3b241b;background:#f8f0df}
      *{box-sizing:border-box}
      body{min-height:100vh;margin:0;display:flex;flex-direction:column}
      header{padding:20px 24px;border-bottom:1px solid #e6d3b8;background:#fff9ed}
      .header-inner{width:min(100%,1024px);margin:auto;display:flex;justify-content:space-between;align-items:center;gap:16px}
      .brand{color:#49271b;font-family:Georgia,serif;font-size:20px;font-weight:700;text-decoration:none}
      .campaign{color:#674d3f;font-size:12px;font-weight:700;letter-spacing:.2em;text-transform:uppercase}
      .content{flex:1;display:grid;place-items:center;padding:56px 20px}
      .card{position:relative;overflow:hidden;width:min(100%,768px);padding:48px 56px;background:#fff;border:1px solid #e6d3b8;border-radius:32px;box-shadow:0 30px 90px -45px #371c1380}
      .eyebrow{color:#9a5b21;font-size:12px;font-weight:700;letter-spacing:.24em;text-transform:uppercase}
      h1{margin:20px 0 0;font-family:Georgia,serif;font-size:clamp(36px,7vw,60px);font-weight:600;line-height:1.15}
      blockquote{margin:40px 0 0;padding-left:24px;border-left:4px solid #d69a4a;color:#674d3f;font-family:Georgia,serif;font-size:clamp(22px,4vw,30px);line-height:1.55}
      .tags{display:flex;flex-wrap:wrap;gap:10px;margin-top:36px;color:#49271b;font-size:14px}
      .tag{padding:10px 16px;border:1px solid #e6d3b8;border-radius:24px}
      .tag.category{border:0;background:#f8e6c6;font-weight:700;text-transform:capitalize}
      .share-row{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-top:36px;padding-top:24px;border-top:1px solid #f0e5d3}
      .share-row p{font-family:Georgia,serif;font-size:18px}
      button{min-height:44px;padding:0 20px;border:0;border-radius:24px;background:#49271b;color:#fff;font-size:14px;font-weight:700;cursor:pointer}
      #share-message{min-height:20px;color:#674d3f;font-size:13px}
      .submit{display:flex;justify-content:center;margin-top:28px}
      .submit a{padding:14px 24px;border-radius:24px;background:#49271b;color:#fff;text-decoration:none;font-size:14px;font-weight:700}
      footer{padding:24px;text-align:center;color:#674d3f;font-size:14px}
      a:focus-visible,button:focus-visible{outline:3px solid #c97a28;outline-offset:3px}
      @media(max-width:600px){header{padding:18px 20px}.card{padding:36px 26px}.content{padding:36px 16px}.share-row{align-items:flex-start;flex-direction:column}}
      @media(prefers-reduced-motion:reduce){*,*::before,*::after{scroll-behavior:auto!important;animation-duration:.01ms!important;animation-iteration-count:1!important;transition-duration:.01ms!important}}
    </style>
  </head>
  <body>
    <header>
      <div class="header-inner">
        <a class="brand" href="/">Kadak Chai Co.</a>
        <span class="campaign">#MyChaiBreak</span>
      </div>
    </header>
    <main class="content">
      <div>
        <article class="card">
          <p class="eyebrow">Every chai break has a story</p>
          <h1>A little pause,<br>shared by ${firstName}.</h1>
          ${caption ? `<blockquote>&ldquo;${caption}&rdquo;</blockquote>` : ''}
          <div class="tags">
            ${category ? `<span class="tag category">${category}</span>` : ''}
            <span class="tag">${city}</span>
          </div>
          <div class="share-row">
            <p>What&rsquo;s your chai break story?</p>
            <button type="button" id="share-story">Share this story</button>
          </div>
          <p id="share-message" aria-live="polite"></p>
        </article>
        <div class="submit"><a href="/#share">Share your chai break</a></div>
      </div>
    </main>
    <footer>Made for the moments between sips.</footer>
    <script>
      const button = document.getElementById('share-story');
      const message = document.getElementById('share-message');
      button.addEventListener('click', async () => {
        try {
          if (navigator.share) {
            await navigator.share({ title: document.title, url: location.href });
          } else if (navigator.clipboard) {
            await navigator.clipboard.writeText(location.href);
            message.textContent = 'Link copied. Share it with your people.';
          } else {
            message.textContent = 'Sharing is not available in this browser.';
          }
        } catch (error) {
          if (error.name !== 'AbortError') {
            message.textContent = 'Unable to share right now. Please try again.';
          }
        }
      });
    </script>
  </body>
</html>`;
}

export async function GET(
  request: Request,
  context: { params: { slug: string } }
): Promise<Response> {
  try {
    const entry = await getPublicEntryBySlug(context.params.slug);
    if (!entry) {
      return htmlResponse(notFoundHtml(), 404);
    }

    return htmlResponse(resultHtml(request.url, entry), 200);
  } catch (error) {
    console.error('Unable to load public story result:', error);
    return htmlResponse(errorHtml(), 500);
  }
}
