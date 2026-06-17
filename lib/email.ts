import nodemailer, { Transporter } from 'nodemailer';
import { getDomainLabel } from './validation';

const IS_DEV = process.env.NODE_ENV !== 'production';

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
      auth: { user: process.env.EMAIL_FROM, pass: process.env.EMAIL_PASSWORD },
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

const fromAddress = IS_DEV ? '"Discount Club Dev" <dev@example.com>' : undefined;
function from(domainLabel: string): string {
  return fromAddress ?? `"${domainLabel}" <${process.env.EMAIL_FROM}>`;
}

const TODD_EMAILS = IS_DEV
  ? ['todd-dev@example.com']
  : ([process.env.TODD_EMAIL_1, process.env.TODD_EMAIL_2].filter(Boolean) as string[]);

// ─── User-facing emails ────────────────────────────────────────────────────────

export async function sendVerificationCode(userEmail: string, code: string, domain: string) {
  const domainLabel = getDomainLabel(domain);
  await send({
    from: from(domainLabel),
    to: userEmail,
    subject: `Your Verification Code – ${domainLabel}`,
    text: [
      `Hi,`, ``,
      `Your verification code is: ${code}`, ``,
      `This code expires in 30 minutes.`, ``,
      `If you didn't request this, please ignore this email.`, ``,
      `Best regards,`, `${domainLabel} Team`,
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
  userEmail: string, domain: string, code: string, timestamp: string
) {
  if (!TODD_EMAILS.length) return;
  await send({
    from: from(getDomainLabel(domain)),
    to: TODD_EMAILS,
    subject: `New Registration – ${domain}`,
    text: [
      `New registration received:`, ``,
      `Email:     ${userEmail}`,
      `Domain:    ${domain}`,
      `Time:      ${timestamp}`,
      `Code sent: ${code}`,
    ].join('\n'),
  });
}

// ─── Booking notification (to Todd) ───────────────────────────────────────────

interface BookingNotificationData {
  email: string;
  domain: string;
  name: string;
  phoneNumber: string;
  bnbName: string;
  checkInDate: string;
  checkOutDate: string;
  vehicle?: string;
  priceExpectation?: string;
  comments?: string;
  timestamp: string;
  bookingId: string;
}

export async function sendBookingNotification(data: BookingNotificationData) {
  if (!TODD_EMAILS.length) return;

  const {
    email, domain, name, phoneNumber, bnbName,
    checkInDate, checkOutDate, vehicle, priceExpectation, comments,
    timestamp, bookingId,
  } = data;

  const optional = (label: string, val?: string) =>
    val ? `- ${label}: ${val}` : `- ${label}: —`;

  await send({
    from: from(getDomainLabel(domain)),
    to: TODD_EMAILS,
    subject: `New Booking - ${domain} - ${name}`,
    text: [
      `New booking submission:`,
      ``,
      `User Details:`,
      `- Name:   ${name}`,
      `- Email:  ${email}`,
      `- Phone:  ${phoneNumber}`,
      `- Domain: ${domain}`,
      ``,
      `Booking Details:`,
      `- BNB Name:   ${bnbName}`,
      `- Check-in:   ${checkInDate}`,
      `- Check-out:  ${checkOutDate}`,
      optional('Vehicle', vehicle),
      optional('Price Expectation', priceExpectation),
      optional('Comments', comments),
      ``,
      `Submitted: ${timestamp}`,
      `Status:    Pending`,
      `ID:        ${bookingId}`,
    ].join('\n'),
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:auto;padding:32px;">
        <h2 style="color:#1a1a1a;margin-bottom:4px;">New Booking</h2>
        <p style="color:#6b7280;font-size:13px;margin-top:0;">${domain} · ${timestamp}</p>

        <table style="width:100%;border-collapse:collapse;margin-top:20px;">
          <tr><td colspan="2" style="background:#f9fafb;padding:8px 12px;font-weight:600;font-size:13px;color:#374151;">
            User Details
          </td></tr>
          ${row('Name', name)}
          ${row('Email', email)}
          ${row('Phone', phoneNumber)}
          ${row('Domain', domain)}

          <tr><td colspan="2" style="background:#f9fafb;padding:8px 12px;font-weight:600;font-size:13px;color:#374151;border-top:8px solid #fff;">
            Booking Details
          </td></tr>
          ${row('BNB Name', bnbName)}
          ${row('Check-in', checkInDate)}
          ${row('Check-out', checkOutDate)}
          ${row('Vehicle', vehicle || '—')}
          ${row('Price Expectation', priceExpectation || '—')}
          ${row('Comments', comments || '—')}
          ${row('Status', '<span style="background:#fef3c7;color:#92400e;padding:2px 8px;border-radius:4px;font-size:12px;">Pending</span>')}
        </table>

        <p style="color:#9ca3af;font-size:12px;margin-top:24px;">Booking ID: ${bookingId}</p>
      </div>
    `,
  });
}

function row(label: string, value: string): string {
  return `
    <tr>
      <td style="padding:8px 12px;font-size:13px;color:#6b7280;width:140px;border-bottom:1px solid #f3f4f6;">${label}</td>
      <td style="padding:8px 12px;font-size:13px;color:#111827;border-bottom:1px solid #f3f4f6;">${value}</td>
    </tr>`;
}
