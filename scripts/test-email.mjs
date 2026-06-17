// Run with: node scripts/test-email.mjs
// Loads .env.local and sends a real test email through the configured SMTP

import { createTransport } from 'nodemailer';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Parse .env.local manually (no dotenv dependency needed)
const envPath = resolve(__dirname, '../.env.local');
const envLines = readFileSync(envPath, 'utf8').split('\n');
for (const line of envLines) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const eq = trimmed.indexOf('=');
  if (eq === -1) continue;
  const key = trimmed.slice(0, eq).trim();
  const val = trimmed.slice(eq + 1).trim();
  process.env[key] ??= val;
}

const { EMAIL_FROM, EMAIL_PASSWORD, EMAIL_HOST, EMAIL_PORT, TODD_EMAIL_1 } = process.env;

console.log('\n=== SMTP Test ===');
console.log(`Host:     ${EMAIL_HOST}`);
console.log(`Port:     ${EMAIL_PORT}`);
console.log(`From:     ${EMAIL_FROM}`);
console.log(`Send to:  ${TODD_EMAIL_1}`);
console.log('');

const transporter = createTransport({
  host: EMAIL_HOST,
  port: Number(EMAIL_PORT ?? 587),
  secure: false,
  auth: { user: EMAIL_FROM, pass: EMAIL_PASSWORD },
});

// 1. Verify connection
process.stdout.write('Verifying SMTP connection... ');
await transporter.verify();
console.log('OK');

// 2. Send test email
process.stdout.write('Sending test email... ');
const info = await transporter.sendMail({
  from: `"Discount Club Test" <${EMAIL_FROM}>`,
  to: TODD_EMAIL_1,
  subject: 'SMTP Test — Discount Club Platform',
  text: 'This is a test email from the Discount Club Platform SMTP setup.\n\nIf you received this, email delivery is working correctly.',
  html: `
    <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px;">
      <h2 style="color:#1a1a1a;">SMTP Test</h2>
      <p>This is a test email from the <strong>Discount Club Platform</strong> SMTP setup.</p>
      <p style="color:#059669;font-weight:600;">If you received this, email delivery is working correctly.</p>
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;" />
      <p style="color:#9ca3af;font-size:12px;">
        Sent from: ${EMAIL_FROM}<br/>
        SMTP: ${EMAIL_HOST}:${EMAIL_PORT}
      </p>
    </div>
  `,
});
console.log('Sent!');
console.log(`Message ID: ${info.messageId}`);
console.log(`\nDone. Check ${TODD_EMAIL_1} for the test email.\n`);
