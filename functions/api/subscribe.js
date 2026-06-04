// Cloudflare Pages Function — handles POST /api/subscribe
// Subscribes an email to MailerLite. Double opt-in is honored by the
// account setting "Double opt-in for API and integrations".
// Env (set in Pages → Settings → Variables and Secrets):
//   MAILERLITE_API_KEY  (Secret)
//   MAILERLITE_GROUP_ID (Text)

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function onRequestPost(context) {
  const { request, env } = context;

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

  // 200/201 = created/updated. With API double opt-in on, a confirmation
  // email is sent and the subscriber stays "unconfirmed" until they confirm.
  if (res.ok) {
    return json({ ok: true, message: 'Almost there — check your inbox to confirm your subscription.' });
  }

  // 422 = validation (e.g. already a subscriber) — treat as soft success.
  if (res.status === 422) {
    return json({ ok: true, message: "You're on the list — check your inbox to confirm." });
  }

  return json({ ok: false, message: 'Something went wrong. Please try again later.' }, 502);
}
