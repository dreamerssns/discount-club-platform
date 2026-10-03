import nodemailer, { Transporter } from 'nodemailer';
import { getDomainLabel } from './validation';

const IS_DEV = process.env.NODE_ENV !== 'production';

let _transporter: Transporter | null = null;

async function getTransporter(): Promise<Transporter> {
  if (_transporter) return _transporter;

  if (IS_DEV && !process.env.EMAIL_HOST) {
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
      host: process.env.EMAIL_HOST ?? 'smtp.titan.email',
      port: Number(process.env.EMAIL_PORT ?? 587),
      secure: false,
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

function from(domainLabel: string): string {
  return `"${domainLabel}" <${process.env.EMAIL_FROM ?? 'support@assistant.rent'}>`;
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
  priceExpectation: string;
  priceType: string;
  comments?: string;
  timestamp: string;
  bookingId: string;
}

export async function sendBookingNotification(data: BookingNotificationData) {
  const {
    email, domain, name, phoneNumber, bnbName,
    checkInDate, checkOutDate, vehicle, priceExpectation, priceType, comments,
    timestamp, bookingId,
  } = data;

  const priceLabel = `${priceExpectation} ${priceType === 'nightly' ? '/ night' : '(total stay)'}`;

  const domainLabel = getDomainLabel(domain);
  const optional = (label: string, val?: string) =>
    val ? `- ${label}: ${val}` : `- ${label}: —`;

  // Confirmation to the user
  await send({
    from: from(domainLabel),
    to: email,
    subject: `Booking Request Received – ${domainLabel}`,
    text: [
      `Hi ${name},`,
      ``,
      `We've received your booking request. We'll be in touch shortly.`,
      ``,
      `Your Request:`,
      `- BNB Name:   ${bnbName}`,
      `- Check-in:   ${checkInDate}`,
      `- Check-out:  ${checkOutDate}`,
      optional('Vehicle', vehicle),
      `- Price Expectation: ${priceLabel}`,
      optional('Comments', comments),
      ``,
      `Reference ID: ${bookingId}`,
      ``,
      `Thanks,`,
      `${domainLabel} Team`,
    ].join('\n'),
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px;">
        <h2 style="color:#1a1a1a;">Booking Request Received</h2>
        <p>Hi <strong>${name}</strong>,</p>
        <p>We've received your booking request and will be in touch shortly.</p>
        <table style="width:100%;border-collapse:collapse;margin-top:20px;">
          ${row('BNB Name', bnbName)}
          ${row('Check-in', checkInDate)}
          ${row('Check-out', checkOutDate)}
          ${row('Vehicle', vehicle || '—')}
          ${row('Price Expectation', priceLabel)}
          ${row('Comments', comments || '—')}
        </table>
        <p style="color:#9ca3af;font-size:12px;margin-top:24px;">Reference ID: ${bookingId}</p>
        <p style="margin-top:24px;">Thanks,<br/><strong>${domainLabel} Team</strong></p>
      </div>
    `,
  });

  if (!TODD_EMAILS.length) return;

  // Notification to Todd
  await send({
    from: from(domainLabel),
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
      `- Price Expectation: ${priceLabel}`,
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
          ${row('Price Expectation', priceLabel)}
          ${row('Comments', comments || '—')}
          ${row('Status', '<span style="background:#fef3c7;color:#92400e;padding:2px 8px;border-radius:4px;font-size:12px;">Pending</span>')}
        </table>

        <p style="color:#9ca3af;font-size:12px;margin-top:24px;">Booking ID: ${bookingId}</p>
      </div>
    `,
  });
}

// ─── BNB owner registration ────────────────────────────────────────────────────

interface BnbRegistrationData {
  ownerName: string;
  bnbName: string;
  address: string;
  email: string;
  domain: string;
  timestamp: string;
}

export async function sendBnbRegistrationNotification(data: BnbRegistrationData) {
  if (!TODD_EMAILS.length) return;
  const { ownerName, bnbName, address, email, domain, timestamp } = data;
  await send({
    from: from(getDomainLabel(domain)),
    to: TODD_EMAILS,
    subject: `New BNB Registration – ${domain}`,
    text: [
      `New BNB registration received:`, ``,
      `Owner:    ${ownerName}`,
      `BNB Name: ${bnbName}`,
      `Address:  ${address}`,
      `Email:    ${email}`,
      `Domain:   ${domain}`,
      `Time:     ${timestamp}`,
    ].join('\n'),
  });
}

// ─── Booking confirmation (sent on admin approval) ─────────────────────────────

interface BookingConfirmationData {
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  domain: string;
  bnbName: string;
  propertyAddress: string;
  operatorName: string;
  price: string;
  checkInDate: string;
  checkInTime: string;
  checkOutDate: string;
  checkOutTime: string;
}

export async function sendBookingConfirmation(data: BookingConfirmationData) {
  const {
    guestName, guestEmail, guestPhone, domain, bnbName, propertyAddress,
    operatorName, price, checkInDate, checkInTime, checkOutDate, checkOutTime,
  } = data;

  const domainLabel = getDomainLabel(domain);

  const text = [
    `BOOKING CONFIRMATION`, ``,
    `Welcome ${guestName} to the ${bnbName}, ${propertyAddress} operated by ${operatorName}, Proprietor and Innkeeper`, ``,
    `You have booked through ${domainLabel}. Please note, by booking through this website, you agree to the following:`, ``,
    `CONDITIONS OF USE AND USER AGREEMENT`, ``,
    `- Online Booking Terms and Conditions (B2C) -`,
    `Introduction: purpose of document: governing bookings; express agreement to document upon order; no abridgement of consumer statutory rights.`, ``,
    `Terms of service are critical, please read carefully as it is a binding legal agreement between ${domainLabel} operating under NBNB Consulting Inc and our "Partnered BNBs/homes" and yourself. To use the service, you must register with us to use the service. ${domainLabel} service allows you, the subscriber, to book a BnB. When you book, please note the reservation gives you the right to enter and use the accommodation's room and the common areas of the house. You are not allowed to have more people in your room than you have booked. Our Partners can also access this space if they reasonably require it. If you stay past your checkout, our partner has the right to make you leave in a manner consistent with applicable law, including imposing reasonable penalties.`, ``,
    `Interpretation: informal definitions for booking terms and conditions.`, ``,
    `Payments: payment of booking prices; methods of paying prices. Please pay our Partners directly.`, ``,
    `Variation of booking: variation of booking by customer; variation of booking by operator.`, ``,
    `Cancellation of bookings by you: rights additional to statutory rights; cancellation windows and refunds; method of cancellation; default no refunds on cancellation.`, ``,
    `Distance contracts: cancellation right: cancellation right for consumers; cancellation right for services and digital content; consumer agreement to provision of services; exercise of cancellation right; refund upon services distance contract cancellation; refund method; refund timing for services and digital content.`, ``,
    `Warranties and representations: customer warranties and representations; warranty relating to bookings; no implied warranties or representations relating to bookings.`, ``,
    `Limitations and exclusions of liability: caveats to limits of liability (B2C); interpretation of limits of liability; no liability for force majeure; no liability for business losses; aggregate liability cap under contract.`, ``,
    `Variation: revision of document by publishing new version on website; variations govern future contracts.`, ``,
    `The monthly rate room rental agreement (this "innkeepers room rental") move in date is indicated in the booking form and is between the "InnKeeper" and "Guest". The parties agree as follows: Limitation of liability for property of guest and no innkeeper is liable to make good to a guest loss of or injury to goods or property brought to the inn, except if the goods or property have been stolen, lost or injured through the willful act, default or neglect of the innkeeper or the innkeeper's servant, deposited expressly for safe custody with the innkeeper, except that in case of the deposit the innkeeper may require as a condition of liability that the goods or property be deposited in a box or other receptacle, fastened and sealed by the person depositing the goods or property.`, ``,
    `PREMISES. (the "Premises") located at the BnB in the booking form.`, ``,
    `DAILY CHARGE, WEEKLY CHARGE, OR MONTHLY CHARGE will be indicated by an email from your BnB.`, ``,
    `Failure to pay the full booking fee will result in its cancellation 24 hours from booking.`, ``,
    `Cleaning will be stipulated by the BnB's via email.`, ``,
    `Damage deposit maybe required.`, ``,
    `There maybe additional fees if you book by credit card.`, ``,
    `Rooms are not held for more than 24 hours without payment.`, ``,
    `Guidelines and culture of BnB's: In general, we are looking to create a respectful, quiet, clean, and friendly setting. To do this, we need guests to help keep it clean, help each other when we can, and try to keep in mind the effect we have on others.`, ``,
    `Assignment: assignment by first party (B2C); assignment by second party.`, ``,
    `No waivers: no unwritten waivers of breach; no continuing waiver.`, ``,
    `Third party rights: third party rights: benefit; third party rights: exercise of rights.`, ``,
    `Entire agreement: entire agreement - bookings.`, ``,
    `Law and jurisdiction: governing law; jurisdiction.`, ``,
    `Statutory and regulatory disclosures: copy of document not filed; language of document; value added tax number. Our details: NBNB Consulting operating as ${domainLabel}`, ``,
    `By completing information below, you agree to the conditions above of the ${domainLabel} and our partnered BnB's`, ``,
    `Guest:`, ``,
    `Name: ${guestName}`,
    `Telephone: ${guestPhone}`,
    `Email Address: ${guestEmail}`, ``,
    `Booking Cost:`, ``,
    `Your total cost for these dates is: ${price}`, ``,
    `TERM.`, ``,
    `Your check in date is: ${checkInDate} after ${checkInTime}`, ``,
    `Your check out date is: ${checkOutDate}. Check out time is ${checkOutTime}`,
  ].join('\n');

  const section = (title: string, body: string) => `
    <p style="margin:16px 0 4px;"><strong>${title}:</strong> ${body}</p>`;

  const html = `
    <div style="font-family:sans-serif;max-width:640px;margin:auto;padding:32px;color:#1f2937;font-size:14px;line-height:1.6;">
      <h1 style="color:#1a1a1a;font-size:22px;letter-spacing:1px;">BOOKING CONFIRMATION</h1>

      <p style="font-size:15px;">
        Welcome <strong>${guestName}</strong> to the <strong>${bnbName}</strong>, ${propertyAddress}
        operated by <strong>${operatorName}</strong>, Proprietor and Innkeeper
      </p>

      <p>You have booked through <strong>${domainLabel}</strong>. Please note, by booking through this website,
      you agree to the following:</p>

      <h2 style="font-size:16px;margin-top:28px;border-bottom:1px solid #e5e7eb;padding-bottom:6px;">
        CONDITIONS OF USE AND USER AGREEMENT
      </h2>

      <p style="color:#6b7280;font-size:12px;">- Online Booking Terms and Conditions (B2C) -</p>
      <p>Introduction: purpose of document: governing bookings; express agreement to document upon order;
      no abridgement of consumer statutory rights.</p>

      <p>Terms of service are critical, please read carefully as it is a binding legal agreement between
      <strong>${domainLabel}</strong> operating under <strong>NBNB Consulting Inc</strong> and our
      "Partnered BNBs/homes" and yourself. To use the service, you must register with us to use the service.
      ${domainLabel} service allows you, the subscriber, to book a BnB. When you book, please note the
      reservation gives you the right to enter and use the accommodation's room and the common areas of the
      house. You are not allowed to have more people in your room than you have booked. Our Partners can
      also access this space if they reasonably require it. If you stay past your checkout, our partner has
      the right to make you leave in a manner consistent with applicable law, including imposing reasonable
      penalties.</p>

      ${section('Interpretation', 'informal definitions for booking terms and conditions.')}
      ${section('Payments', 'payment of booking prices; methods of paying prices. Please pay our Partners directly.')}
      ${section('Variation of booking', 'variation of booking by customer; variation of booking by operator.')}
      ${section('Cancellation of bookings by you', 'rights additional to statutory rights; cancellation windows and refunds; method of cancellation; default no refunds on cancellation.')}
      ${section('Distance contracts: cancellation right', 'cancellation right for consumers; cancellation right for services and digital content; consumer agreement to provision of services; exercise of cancellation right; refund upon services distance contract cancellation; refund method; refund timing for services and digital content.')}
      ${section('Warranties and representations', 'customer warranties and representations; warranty relating to bookings; no implied warranties or representations relating to bookings.')}
      ${section('Limitations and exclusions of liability', 'caveats to limits of liability (B2C); interpretation of limits of liability; no liability for force majeure; no liability for business losses; aggregate liability cap under contract.')}
      ${section('Variation', 'revision of document by publishing new version on website; variations govern future contracts.')}

      <p style="margin-top:16px;">The monthly rate room rental agreement (this "innkeepers room rental") move in
      date is indicated in the booking form and is between the "InnKeeper" and "Guest". The parties agree as
      follows: Limitation of liability for property of guest and no innkeeper is liable to make good to a guest
      loss of or injury to goods or property brought to the inn, except if the goods or property have been
      stolen, lost or injured through the willful act, default or neglect of the innkeeper or the innkeeper's
      servant, deposited expressly for safe custody with the innkeeper, except that in case of the deposit the
      innkeeper may require as a condition of liability that the goods or property be deposited in a box or
      other receptacle, fastened and sealed by the person depositing the goods or property.</p>

      ${section('PREMISES', '(the "Premises") located at the BnB in the booking form.')}
      ${section('DAILY CHARGE, WEEKLY CHARGE, OR MONTHLY CHARGE', 'will be indicated by an email from your BnB.')}
      ${section('Failure to pay the full booking fee', 'will result in its cancellation 24 hours from booking.')}
      ${section('Cleaning', "will be stipulated by the BnB's via email.")}
      ${section('Damage deposit', 'maybe required.')}
      ${section('Additional fees', 'there maybe additional fees if you book by credit card.')}
      ${section('Rooms', 'are not held for more than 24 hours without payment.')}
      ${section('Guidelines and culture of BnB\'s', 'In general, we are looking to create a respectful, quiet, clean, and friendly setting. To do this, we need guests to help keep it clean, help each other when we can, and try to keep in mind the effect we have on others.')}
      ${section('Assignment', 'assignment by first party (B2C); assignment by second party.')}
      ${section('No waivers', 'no unwritten waivers of breach; no continuing waiver.')}
      ${section('Third party rights', 'third party rights: benefit; third party rights: exercise of rights.')}
      ${section('Entire agreement', 'entire agreement - bookings.')}
      ${section('Law and jurisdiction', 'governing law; jurisdiction.')}
      ${section('Statutory and regulatory disclosures', `copy of document not filed; language of document; value added tax number. Our details: NBNB Consulting operating as ${domainLabel}`)}

      <p style="margin-top:24px;">By completing the information below, you agree to the conditions above of
      the ${domainLabel} and our partnered BnB's</p>

      <table style="width:100%;border-collapse:collapse;margin-top:20px;">
        <tr><td colspan="2" style="background:#f9fafb;padding:8px 12px;font-weight:600;font-size:13px;color:#374151;">Guest</td></tr>
        ${row('Name', guestName)}
        ${row('Telephone', guestPhone)}
        ${row('Email Address', guestEmail)}

        <tr><td colspan="2" style="background:#f9fafb;padding:8px 12px;font-weight:600;font-size:13px;color:#374151;border-top:8px solid #fff;">Booking Cost</td></tr>
        ${row('Total cost for these dates', price)}

        <tr><td colspan="2" style="background:#f9fafb;padding:8px 12px;font-weight:600;font-size:13px;color:#374151;border-top:8px solid #fff;">Term</td></tr>
        ${row('Check in date', `${checkInDate} after ${checkInTime}`)}
        ${row('Check out date', `${checkOutDate} — check out time is ${checkOutTime}`)}
      </table>
    </div>
  `;

  await send({
    from: from(domainLabel),
    to: guestEmail,
    subject: `Booking Confirmation – ${bnbName}`,
    text,
    html,
  });
}

// ─── BNB owner booking notification (sent alongside guest confirmation) ────────

interface BnbOwnerBookingData {
  ownerEmail: string;
  ownerName: string;
  domain: string;
  bnbName: string;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  price: string;
  checkInDate: string;
  checkInTime: string;
  checkOutDate: string;
  checkOutTime: string;
  bookingId: string;
}

export async function sendBnbOwnerConfirmation(data: BnbOwnerBookingData) {
  const {
    ownerEmail, ownerName, domain, bnbName, guestName, guestEmail, guestPhone,
    price, checkInDate, checkInTime, checkOutDate, checkOutTime, bookingId,
  } = data;

  const domainLabel = getDomainLabel(domain);

  await send({
    from: from(domainLabel),
    to: ownerEmail,
    subject: `Booking Confirmed – ${guestName} (${bnbName})`,
    text: [
      `Hi ${ownerName},`, ``,
      `A booking at ${bnbName} has been confirmed through ${domainLabel}.`, ``,
      `Guest Details:`,
      `- Name:  ${guestName}`,
      `- Email: ${guestEmail}`,
      `- Phone: ${guestPhone}`, ``,
      `Booking Details:`,
      `- Check-in:  ${checkInDate} after ${checkInTime}`,
      `- Check-out: ${checkOutDate}, by ${checkOutTime}`,
      `- Price:     ${price}`, ``,
      `Reference ID: ${bookingId}`, ``,
      `Thanks,`,
      `${domainLabel} Team`,
    ].join('\n'),
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px;">
        <h2 style="color:#1a1a1a;">Booking Confirmed</h2>
        <p>Hi <strong>${ownerName}</strong>,</p>
        <p>A booking at <strong>${bnbName}</strong> has been confirmed through ${domainLabel}.</p>
        <table style="width:100%;border-collapse:collapse;margin-top:20px;">
          <tr><td colspan="2" style="background:#f9fafb;padding:8px 12px;font-weight:600;font-size:13px;color:#374151;">Guest</td></tr>
          ${row('Name', guestName)}
          ${row('Email', guestEmail)}
          ${row('Phone', guestPhone)}
          <tr><td colspan="2" style="background:#f9fafb;padding:8px 12px;font-weight:600;font-size:13px;color:#374151;border-top:8px solid #fff;">Booking</td></tr>
          ${row('Check-in', `${checkInDate} after ${checkInTime}`)}
          ${row('Check-out', `${checkOutDate}, by ${checkOutTime}`)}
          ${row('Price', price)}
        </table>
        <p style="color:#9ca3af;font-size:12px;margin-top:24px;">Reference ID: ${bookingId}</p>
        <p style="margin-top:24px;">Thanks,<br/><strong>${domainLabel} Team</strong></p>
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
