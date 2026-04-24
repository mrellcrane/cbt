#!/usr/bin/env node
// Fetch the most recent app_errors rows from Supabase.
// Usage: node scripts/recent-errors.mjs [limit]
// Requires EXPO_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = join(__dirname, '..', '.env');

let env = {};
try {
  const raw = readFileSync(envPath, 'utf8');
  for (const line of raw.split('\n')) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (match) env[match[1]] = match[2].replace(/^["']|["']$/g, '');
  }
} catch {
  console.error(`Could not read ${envPath}`);
  process.exit(1);
}

const url = env.EXPO_PUBLIC_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error('Missing EXPO_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const limit = Number(process.argv[2] ?? 20);

const res = await fetch(
  `${url}/rest/v1/app_errors?select=*&order=created_at.desc&limit=${limit}`,
  {
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
    },
  },
);

if (!res.ok) {
  console.error(`HTTP ${res.status}:`, await res.text());
  process.exit(1);
}

const rows = await res.json();
if (rows.length === 0) {
  console.log('(no errors logged)');
  process.exit(0);
}

for (const row of rows) {
  console.log('─'.repeat(80));
  console.log(`[${row.created_at}] ${row.platform}/${row.source}`);
  console.log(`  ${row.error_message}`);
  if (row.context) console.log(`  context: ${JSON.stringify(row.context)}`);
  if (row.error_stack) {
    const firstLine = row.error_stack.split('\n').slice(0, 4).join('\n    ');
    console.log(`    ${firstLine}`);
  }
}
