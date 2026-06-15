import nodemailer, { Transporter } from 'nodemailer';
import { getDomainLabel } from './validation';

const IS_DEV = process.env.NODE_ENV !== 'production';

// In dev: lazily create a free Ethereal test account on first send.
// Each email logs a preview URL to the terminal — click it to see the
// fully rendered email in your browser. No SMTP credentials needed.
let _transporter: Transporter | null = null;

async function getTransporter(): Promise<Transporter> {
  if (_transporter) return _transporter;

  if (IS_DEV) {
    const testAccount = await nodemailer.createTestAccount();
    _transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: { user: testAccount.user, pass: testAccount.pass },
    });
    console.log('\n📧 [email/dev] Ethereal test account ready:', testAccount.user);
  } else {
    _transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_FROM,
        pass: process.env.EMAIL_PASSWORD,
      },
    });
  }

  return _transporter;
}

async function send(options: nodemailer.SendMailOptions): Promise<void> {
  const transport = await getTransporter();
  const info = await transport.sendMail(options);

  if (IS_DEV) {
    const url = nodemailer.getTestMessageUrl(info);
    console.log(`\n📬 [email/dev] "${options.subject}"`);
    console.log(`   To: ${options.to}`);
    console.log(`   Preview: ${url}\n`);
  }
}

const fromAddress = IS_DEV
  ? '"Discount Club Dev" <dev@example.com>'
  : undefined; // use domain-aware from in prod

function from(domainLabel: string): string {
  return fromAddress ?? `"${domainLabel}" <${process.env.EMAIL_FROM}>`;
}

const TODD_EMAILS = IS_DEV
  ? ['todd-dev@example.com'] // dev: send Todd's emails to Ethereal too
  : ([process.env.TODD_EMAIL_1, process.env.TODD_EMAIL_2].filter(Boolean) as string[]);

export async function sendVerificationCode(
  userEmail: string,
  code: string,
  domain: string
): Promise<void> {
  const domainLabel = getDomainLabel(domain);

  await send({
    from: from(domainLabel),
    to: userEmail,
    subject: `Your Verification Code – ${domainLabel}`,
    text: [
      `Hi,`,
      ``,
      `Your verification code is: ${code}`,
      ``,
      `This code expires in 30 minutes.`,
      ``,
      `If you didn't request this, please ignore this email.`,
      ``,
      `Best regards,`,
      `${domainLabel} Team`,
    ].join('\n'),
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px;">
        <h2 style="color:#1a1a1a;">Your Verification Code</h2>
        <p>Use the code below to complete your registration on <strong>${domainLabel}</strong>.</p>
        <div style="font-size:36px;font-weight:bold;letter-spacing:8px;color:#2563eb;
                    background:#eff6ff;border-radius:8px;padding:16px 24px;
                    display:inline-block;margin:16px 0;">
          ${code}
        </div>
        <p style="color:#6b7280;font-size:14px;">This code expires in <strong>30 minutes</strong>.</p>
        <p style="color:#6b7280;font-size:14px;">If you didn't request this, you can safely ignore this email.</p>
      </div>
    `,
  });
}

export async function sendRegistrationNotification(
  userEmail: string,
  domain: string,
  code: string,
  timestamp: string
): Promise<void> {
  if (!TODD_EMAILS.length) return;

  await send({
    from: from(getDomainLabel(domain)),
    to: TODD_EMAILS,
    subject: `New Registration – ${domain}`,
    text: [
      `New registration received:`,
      ``,
      `Email:     ${userEmail}`,
      `Domain:    ${domain}`,
      `Time:      ${timestamp}`,
      `Code sent: ${code}`,
    ].join('\n'),
  });
}

export async function sendBookingNotification(
  userEmail: string,
  domain: string,
  timestamp: string,
  bookingData: Record<string, unknown>
): Promise<void> {
  if (!TODD_EMAILS.length) return;

  const extraFields = Object.entries(bookingData)
    .filter(([k]) => k !== 'email' && k !== 'domain')
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n');

  await send({
    from: from(getDomainLabel(domain)),
    to: TODD_EMAILS,
    subject: `New Booking – ${domain}`,
    text: [
      `New booking submission:`,
      ``,
      `Email:  ${userEmail}`,
      `Domain: ${domain}`,
      `Time:   ${timestamp}`,
      extraFields ? `\nAdditional details:\n${extraFields}` : '',
    ]
      .filter(Boolean)
      .join('\n'),
  });
}
