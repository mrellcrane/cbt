// Records a device's Expo push token so the developer can send "new update"
// notifications. Stored as a GitHub issue (label push-token) using the same
// repo token as feedback. Single-user app, so we just append a registration.

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function POST(request: Request): Promise<Response> {
  const ghToken = process.env.GITHUB_FEEDBACK_TOKEN;
  const repo = process.env.GITHUB_FEEDBACK_REPO ?? 'mrellcrane/cbt';
  if (!ghToken) return json({ error: 'Not configured.' }, 500);

  let body: { token?: string; platform?: string; appVersion?: string };
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON body.' }, 400);
  }

  const pushToken = (body.token ?? '').toString().trim();
  if (!pushToken) return json({ error: 'token is required.' }, 400);

  const title = `Push token registered (${body.platform || '?'})`;
  const issueBody = [
    'Expo push token:',
    '',
    '```',
    pushToken,
    '```',
    '',
    `Platform: ${body.platform || '?'}`,
    `App version: ${body.appVersion || '?'}`,
    `Registered: ${new Date().toISOString()}`,
  ].join('\n');

  try {
    const gh = await fetch(`https://api.github.com/repos/${repo}/issues`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${ghToken}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
        'User-Agent': 'cbt-companion-push',
      },
      body: JSON.stringify({
        title,
        body: issueBody,
        labels: ['push-token'],
      }),
    });
    if (!gh.ok) {
      const errText = await gh.text();
      return json({ error: `GitHub error ${gh.status}: ${errText}` }, 502);
    }
    return json({ ok: true }, 200);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return json({ error: message }, 502);
  }
}
