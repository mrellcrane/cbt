#!/usr/bin/env node
// Test Supabase error-logging setup: inserts a test error using the anon key,
// then reads it back using the service-role key.

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = join(__dirname, '..', '.env');

let env = {};
try {
  const raw = readFileSync(envPath, 'utf8');
  for (const line of raw.split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)=(.+)$/);
    if (m) env[m[1]] = m[2].trim();
  }
} catch {
  console.error('Could not read .env'); process.exit(1);
}

const url = env.EXPO_PUBLIC_SUPABASE_URL;
const anon = env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const service = env.SUPABASE_SERVICE_ROLE_KEY;

console.log('URL:     ', url ? 'set' : 'MISSING');
console.log('ANON:    ', anon ? `set (${anon.length} chars)` : 'MISSING');
console.log('SERVICE: ', service ? `set (${service.length} chars)` : 'MISSING');
console.log('ANTH:    ', env.ANTHROPIC_API_KEY ? `set (${env.ANTHROPIC_API_KEY.length} chars)` : 'MISSING');

if (!url || !anon || !service) process.exit(1);

console.log('\n[1/2] Inserting test error with anon key...');
const insertRes = await fetch(`${url}/rest/v1/app_errors`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    apikey: anon,
    Authorization: `Bearer ${anon}`,
    Prefer: 'return=representation',
  },
  body: JSON.stringify({
    error_message: `test-supabase.mjs probe at ${new Date().toISOString()}`,
    platform: 'script',
    source: 'test-supabase.mjs',
    context: { probe: true },
  }),
});
const insertBody = await insertRes.text();
console.log(`  HTTP ${insertRes.status}`);
console.log(`  body: ${insertBody.slice(0, 300)}`);

console.log('\n[2/2] Reading back latest 3 rows with service key...');
const readRes = await fetch(
  `${url}/rest/v1/app_errors?select=*&order=created_at.desc&limit=3`,
  { headers: { apikey: service, Authorization: `Bearer ${service}` } },
);
const readBody = await readRes.text();
console.log(`  HTTP ${readRes.status}`);
console.log(`  body: ${readBody.slice(0, 600)}`);
