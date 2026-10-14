#!/usr/bin/env node
/**
 * SMTP / EmailService test harness.
 *
 * Step 1 — check env + verify credentials (no email is sent):
 *     node scripts/test-email.js
 *
 * Step 2 — actually send a real test email:
 *     node scripts/test-email.js you@example.com
 *
 * Exit code is 0 on success, 1 on any failure (handy for CI / deploy checks).
 */
require('dotenv').config();
const EmailService = require('../services/EmailService');

(async () => {
  console.log('\n🔍 SMTP environment variables\n');
  const env = EmailService.checkEnv();
  for (const [key, val] of Object.entries(env.vars)) {
    const optional = key === 'SMTP_HOST' || key === 'SMTP_PORT';
    const icon = val ? (String(val).startsWith('(default)') ? '➖' : '✅') : '❌';
    console.log(`  ${icon} ${key.padEnd(12)} ${val || 'NOT SET'}`);
  }

  if (!env.configured) {
    console.log(`\n❌ Missing required vars: ${env.missing.join(', ')}`);
    console.log('   Add them to .env and re-run this script.\n');
    process.exit(1);
  }

  console.log('\n🔌 Verifying SMTP connection & auth (no email sent)...');
  const result = await EmailService.verifyConnection();
  if (!result.success) {
    console.log(`\n❌ SMTP verify FAILED: ${result.error}${result.code ? ` (${result.code})` : ''}`);
    console.log('   Common causes: wrong/expired Gmail App Password, 2FA not enabled,');
    console.log('   port blocked, or "secure" mismatch (587 = STARTTLS, 465 = SSL).\n');
    process.exit(1);
  }
  console.log('✅ SMTP connection OK — credentials accepted by the server.\n');

  const to = process.argv[2];
  if (!to) {
    console.log('ℹ️  Connection verified. To send a real test email, run:');
    console.log('     node scripts/test-email.js you@example.com\n');
    process.exit(0);
  }

  console.log(`📧 Sending test email to ${to} ...`);
  const send = await EmailService.send(
    to,
    'Chardeevari SMTP test ✅',
    '<h2 style="font-family:sans-serif">SMTP works 🎉</h2>' +
      '<p style="font-family:sans-serif">This is a test email from the Chardeevari backend EmailService.</p>'
  );
  if (send.success) {
    console.log(`✅ Sent (channel: ${send.channel}). Check the inbox (and spam).\n`);
    process.exit(0);
  }
  console.log(`❌ Send failed: ${send.error}\n`);
  process.exit(1);
})().catch((err) => {
  console.error('\n💥 Unexpected error:', err);
  process.exit(1);
});
