#!/usr/bin/env node
// Direct integration test for the Ember chat API.
// Runs against the Anthropic API without needing Expo.
// Usage: node scripts/test-chat.mjs [mode]

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import Anthropic from '@anthropic-ai/sdk';

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

const apiKey = env.ANTHROPIC_API_KEY;
if (!apiKey) { console.error('Missing ANTHROPIC_API_KEY'); process.exit(1); }

const MODEL = env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-6';
const mode = process.argv[2] ?? 'free_chat';

// Inline system prompt (mirrors lib/ai/systemPrompt.ts)
function buildSystemPrompt(mode) {
  const name = 'TestUser';
  const persona = `You are Ember, a warm and grounded mental health companion rooted in CBT. You are talking with ${name}. Keep responses short — 1-3 sentences.`;
  const modes = {
    free_chat: 'CURRENT MODE: OPEN CONVERSATION. Have a warm, supportive conversation.',
    check_in: 'CURRENT MODE: DAILY CHECK-IN. Acknowledge a mood score of 7/10 and ask what\'s behind it.',
    thought_record: 'CURRENT MODE: THOUGHT RECORD. Begin Step 1 — ask about the situation.',
    gratitude: 'CURRENT MODE: GRATITUDE JOURNALING. Ask the user to share 1-3 things they\'re grateful for.',
    lesson: 'CURRENT MODE: LESSON. Introduce the concept of cognitive distortions briefly.',
  };
  return `${persona}\n${modes[mode] ?? modes.free_chat}`;
}

const tests = [
  { label: 'basic hello', messages: [{ role: 'user', content: 'Hi, I just want to talk.' }] },
  { label: 'empty message guard', messages: [] },
  { label: mode + ' mode', messages: [{ role: 'user', content: 'Let\'s do a ' + mode + ' session.' }] },
];

const client = new Anthropic({ apiKey });
let passed = 0;
let failed = 0;

for (const test of tests) {
  process.stdout.write(`  testing "${test.label}"... `);
  const safeMessages = test.messages.length > 0 && test.messages[0].role === 'user'
    ? test.messages
    : [{ role: 'user', content: 'Hi' }];

  try {
    const stream = await client.messages.create({
      model: MODEL,
      max_tokens: 150,
      system: buildSystemPrompt(mode),
      messages: safeMessages,
      stream: true,
    });

    let text = '';
    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        text += event.delta.text;
      }
    }

    if (text.length > 0) {
      console.log(`PASS (${text.length} chars)`);
      console.log(`    "${text.slice(0, 120).replace(/\n/g, ' ')}${text.length > 120 ? '…' : ''}"`);
      passed++;
    } else {
      console.log('FAIL — empty response');
      failed++;
    }
  } catch (err) {
    console.log(`FAIL — ${err.message}`);
    failed++;
  }
}

console.log(`\n${passed} passed, ${failed} failed — model: ${MODEL}`);
process.exit(failed > 0 ? 1 : 0);
