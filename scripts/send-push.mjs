// Sends a push notification to the registered device via Expo's Push API.
// Usage: node scripts/send-push.mjs "Title" "Body message about the new feature"
// Pulls the most recently registered Expo push token from the GitHub
// "push-token" issues (recorded by app/api/register-push+api.ts).

import { execSync } from 'node:child_process';

const REPO = 'mrellcrane/cbt';
const title = process.argv[2] || 'CBT Friend updated';
const message = process.argv[3] || 'A new update is ready.';

function gh(cmd) {
  return execSync(`gh ${cmd}`, { encoding: 'utf8' });
}

const list = JSON.parse(
  gh(`issue list --repo ${REPO} --label push-token --state all --limit 1 --json number`),
);
if (!list.length) {
  console.error('No push-token issue found yet — has the device registered?');
  process.exit(1);
}
const body = JSON.parse(
  gh(`issue view ${list[0].number} --repo ${REPO} --json body`),
).body;
const match = body.match(/Expo(?:nent)?PushToken\[[^\]]+\]/);
if (!match) {
  console.error(`No push token found in issue #${list[0].number}`);
  process.exit(1);
}
const token = match[0];

const res = await fetch('https://exp.host/--/api/v2/push/send', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
  body: JSON.stringify({
    to: token,
    title,
    body: message,
    sound: 'default',
    priority: 'high',
  }),
});
console.log(JSON.stringify(await res.json(), null, 2));
