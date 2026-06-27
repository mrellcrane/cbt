// Server-side feedback sink. Each in-app feedback submission becomes a GitHub
// issue in the project repo, so it is stored durably and easy to review/act on.
//
// Requires (set as EAS env vars, injected at deploy):
//   GITHUB_FEEDBACK_TOKEN — fine-grained PAT with Issues: Read and write on the repo
//   GITHUB_FEEDBACK_REPO  — "owner/repo" (defaults to mrellcrane/cbt)

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function POST(request: Request): Promise<Response> {
  const token = process.env.GITHUB_FEEDBACK_TOKEN;
  const repo = process.env.GITHUB_FEEDBACK_REPO ?? 'mrellcrane/cbt';
  if (!token) {
    return json({ error: 'Feedback sink is not configured.' }, 500);
  }

  let body: {
    text?: string;
    appVersion?: string;
    platform?: string;
    when?: string;
  };
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON body.' }, 400);
  }

  const text = (body.text ?? '').toString().trim();
  if (!text) return json({ error: 'text is required.' }, 400);

  const title = `App feedback: ${text.slice(0, 60)}${text.length > 60 ? '…' : ''}`;
  const issueBody = [
    text,
    '',
    '---',
    `App version: ${body.appVersion || 'unknown'}`,
    `Platform: ${body.platform || 'unknown'}`,
    `Submitted: ${body.when || new Date().toISOString()}`,
  ].join('\n');

  try {
    const gh = await fetch(`https://api.github.com/repos/${repo}/issues`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
        'User-Agent': 'cbt-companion-feedback',
      },
      body: JSON.stringify({
        title,
        body: issueBody,
        labels: ['app-feedback'],
      }),
    });

    if (!gh.ok) {
      const errText = await gh.text();
      return json({ error: `GitHub error ${gh.status}: ${errText}` }, 502);
    }

    const issue = (await gh.json()) as { number?: number };
    return json({ ok: true, issue: issue.number ?? null }, 200);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return json({ error: message }, 502);
  }
}
