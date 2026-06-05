// ============================================================
// J.Kloting — Worker entry (Cloudflare Static Assets + API)
// Serves the static site via the ASSETS binding and handles the
// newsletter subscribe endpoint at POST /api/subscribe.
// Secrets: MAILERLITE_API_KEY (secret), MAILERLITE_GROUP_ID (var).
// ============================================================

// /barong and /api/* run worker-first, so the static `_headers` file does NOT govern them.
// The Worker must set the HTML revalidation header itself, or those pages cache stale.
const HTML_CACHE = 'public, max-age=0, must-revalidate';
function withHtmlCache(res) {
  const r = new Response(res.body, res);
  r.headers.set('Cache-Control', HTML_CACHE);
  return r;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/api/subscribe') {
      return handleSubscribe(request, env);
    }

    // Per-item share links: /barong?item=<id> → inject that barong's OG preview.
    if (url.pathname === '/barong' && url.searchParams.has('item')) {
      return handleBarongShare(request, env, url);
    }

    // /barong (worker-first) → serve the asset but set the cache header in code.
    if (url.pathname === '/barong') {
      return withHtmlCache(await env.ASSETS.fetch(request));
    }

    // Everything else → static assets (index.html, css, js, img, …) governed by _headers.
    return env.ASSETS.fetch(request);
  },
};

// ── Per-item Open Graph for shared barong links ───────────────────────────────

const FIRESTORE_PROJECT = 'jklothing-inventory';
// Public Firebase web API key (already public in js/barong-catalog.js).
const FIRESTORE_KEY = 'AIzaSyCLcgQZofD-rBfYyafEy4HQWz_NTJVAeK8';

class AttrSetter {
  constructor(value) { this.value = value; }
  element(el) { el.setAttribute('content', this.value); }
}
class TitleSetter {
  constructor(value) { this.value = value; }
  element(el) { el.setInnerContent(this.value); }
}
class Remover {
  element(el) { el.remove(); }
}

async function handleBarongShare(request, env, url) {
  const itemId = url.searchParams.get('item');
  // Firestore auto-ids are short alphanumerics — reject anything else.
  if (!itemId || !/^[A-Za-z0-9_-]{1,128}$/.test(itemId)) {
    return withHtmlCache(await env.ASSETS.fetch(request));
  }

  let item = null;
  try {
    item = await fetchAvailableBarong(itemId);
  } catch {
    item = null;
  }

  // Unknown / unavailable / error → serve the page with its generic OG tags.
  if (!item) {
    return withHtmlCache(await env.ASSETS.fetch(request));
  }

  const color = (item.label || '').trim();
  const title = color ? `Modern ${color} Barong — J.Kloting` : 'Modern Barong — J.Kloting';
  const price = item.price != null ? `₱${Number(item.price).toLocaleString('en-PH')}` : '';
  const desc = `${price ? price + ' · ' : ''}Limited stock · Reserve yours at J.Kloting.`;
  const image = item.image || 'https://jkloting.store/img/og-image.jpg';
  const pageUrl = `https://jkloting.store/barong?item=${encodeURIComponent(itemId)}`;

  // Fetch the barong page asset, then rewrite its head tags for this item.
  const assetRes = await env.ASSETS.fetch(new Request(url.origin + '/barong', { method: 'GET' }));

  const rewritten = new HTMLRewriter()
    .on('title', new TitleSetter(title))
    .on('meta[property="og:title"]', new AttrSetter(title))
    .on('meta[property="og:description"]', new AttrSetter(desc))
    .on('meta[property="og:image"]', new AttrSetter(image))
    .on('meta[property="og:url"]', new AttrSetter(pageUrl))
    .on('meta[property="og:image:width"]', new Remover())
    .on('meta[property="og:image:height"]', new Remover())
    .on('meta[name="twitter:title"]', new AttrSetter(title))
    .on('meta[name="twitter:description"]', new AttrSetter(desc))
    .on('meta[name="twitter:image"]', new AttrSetter(image))
    .transform(assetRes);

  // Per-item OG is dynamic → always revalidate.
  return withHtmlCache(rewritten);
}

async function fetchAvailableBarong(itemId) {
  const body = {
    structuredQuery: {
      from: [{ collectionId: 'barongs' }],
      where: {
        compositeFilter: {
          op: 'AND',
          filters: [
            { fieldFilter: { field: { fieldPath: 'status' }, op: 'EQUAL', value: { stringValue: 'available' } } },
            {
              fieldFilter: {
                field: { fieldPath: '__name__' },
                op: 'EQUAL',
                value: { referenceValue: `projects/${FIRESTORE_PROJECT}/databases/(default)/documents/barongs/${itemId}` },
              },
            },
          ],
        },
      },
      limit: 1,
    },
  };

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 2500);
  let res;
  try {
    res = await fetch(
      `https://firestore.googleapis.com/v1/projects/${FIRESTORE_PROJECT}/databases/(default)/documents:runQuery?key=${FIRESTORE_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: ctrl.signal,
      }
    );
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) return null;
  const arr = await res.json();
  const doc = Array.isArray(arr) ? arr.find((x) => x && x.document)?.document : null;
  if (!doc || !doc.fields) return null;

  const f = doc.fields;
  const imgs = f.images?.arrayValue?.values || [];
  const firstImg = imgs.length ? imgs[0].stringValue || '' : '';
  const price =
    f.price?.integerValue != null ? Number(f.price.integerValue)
    : f.price?.doubleValue != null ? Number(f.price.doubleValue)
    : null;

  return { label: f.label?.stringValue || '', price, image: firstImg };
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
  });
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function handleSubscribe(request, env) {
  if (request.method !== 'POST') {
    return json({ ok: false, message: 'Method not allowed.' }, 405);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, message: 'Invalid request.' }, 400);
  }

  const email = String(body.email || '').trim();
  const honeypot = String(body.website || '').trim();

  // Honeypot: a bot filled the hidden field — silently accept, do nothing.
  if (honeypot) {
    return json({ ok: true, message: 'Thanks for subscribing!' });
  }

  if (!EMAIL_RE.test(email)) {
    return json({ ok: false, message: 'Please enter a valid email address.' }, 400);
  }

  if (!env.MAILERLITE_API_KEY) {
    return json({ ok: false, message: 'Newsletter is not configured yet.' }, 500);
  }

  const payload = { email };
  if (env.MAILERLITE_GROUP_ID) {
    payload.groups = [String(env.MAILERLITE_GROUP_ID)];
  }

  let res;
  try {
    res = await fetch('https://connect.mailerlite.com/api/subscribers', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${env.MAILERLITE_API_KEY}`,
      },
      body: JSON.stringify(payload),
    });
  } catch {
    return json({ ok: false, message: 'Could not reach the newsletter service. Please try again later.' }, 502);
  }

  // 200/201 = created or updated. With double opt-in enabled in MailerLite,
  // a confirmation email is sent and the subscriber stays "unconfirmed".
  if (res.ok) {
    return json({
      ok: true,
      message: 'Almost there — check your inbox to confirm your subscription.',
    });
  }

  // 422 = validation (e.g. already a subscriber) — treat as soft success.
  if (res.status === 422) {
    return json({
      ok: true,
      message: "You're on the list — check your inbox to confirm.",
    });
  }

  return json({ ok: false, message: 'Something went wrong. Please try again later.' }, 502);
}
