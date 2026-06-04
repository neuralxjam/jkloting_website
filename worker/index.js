// ============================================================
// J.Kloting — Worker entry (Cloudflare Static Assets + API)
// Serves the static site via the ASSETS binding and handles the
// newsletter subscribe endpoint at POST /api/subscribe.
// Secrets: MAILERLITE_API_KEY (secret), MAILERLITE_GROUP_ID (var).
// ============================================================

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/api/subscribe') {
      return handleSubscribe(request, env);
    }

    // Everything else → static assets (index.html, css, js, img, /barong, …)
    return env.ASSETS.fetch(request);
  },
};

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json' },
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
