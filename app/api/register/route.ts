import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { isValidEmail, isValidDomain, generateCode, sanitizeEmail } from '@/lib/validation';
import { checkRateLimit } from '@/lib/rateLimit';
import { sendVerificationCode, sendRegistrationNotification } from '@/lib/email';
import Registration from '@/models/registration';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = sanitizeEmail(body?.email ?? '');
    const domain = body?.domain ?? '';

    if (!isValidEmail(email)) {
      return NextResponse.json({ success: false, message: 'Invalid email format' }, { status: 400 });
    }
    if (!isValidDomain(domain)) {
      return NextResponse.json({ success: false, message: 'Invalid domain' }, { status: 400 });
    }

    // Rate limit: 3 registration attempts per email per domain per hour
    const rl = await checkRateLimit(`register:${domain}`, email, 3, 3600);
    if (!rl.allowed) {
      return NextResponse.json(
        { success: false, message: 'Too many attempts. Please wait before trying again.' },
        { status: 429 }
      );
    }

    await connectDB();

    const code = generateCode();
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

    // Upsert: replace any existing pending code for this email+domain
    await Registration.findOneAndUpdate(
      { email, domain },
      { code, verified: false, expiresAt, attempts: 0, verifiedAt: undefined },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    const timestamp = new Date().toISOString();

    const [verifyResult, notifyResult] = await Promise.allSettled([
      sendVerificationCode(email, code, domain),
      sendRegistrationNotification(email, domain, code, timestamp),
    ]);

    if (verifyResult.status === 'rejected') {
      console.error('[/api/register] verification email failed:', verifyResult.reason);
      return NextResponse.json({ success: false, message: 'Failed to send verification email. Please try again.' }, { status: 500 });
    }
    if (notifyResult.status === 'rejected') {
      console.error('[/api/register] notification email failed:', notifyResult.reason);
    }

    return NextResponse.json(
      { success: true, message: 'Verification code sent to your email' },
      { status: 200 }
    );
  } catch (err) {
    console.error('[/api/register]', err);
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 });
  }
}
