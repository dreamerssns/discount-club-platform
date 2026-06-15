import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { isValidEmail, isValidDomain, isValidCode, sanitizeEmail } from '@/lib/validation';
import { checkRateLimit } from '@/lib/rateLimit';
import { createSessionToken } from '@/lib/session';
import Registration from '@/models/registration';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = sanitizeEmail(body?.email ?? '');
    const code = (body?.code ?? '').trim();
    const domain = body?.domain ?? '';

    if (!isValidEmail(email) || !isValidDomain(domain)) {
      return NextResponse.json({ success: false, message: 'Invalid request' }, { status: 400 });
    }
    if (!isValidCode(code)) {
      return NextResponse.json({ success: false, message: 'Code must be 6 digits' }, { status: 400 });
    }

    // Rate limit: 5 verification attempts per email per domain per hour
    const rl = await checkRateLimit(`verify:${domain}`, email, 5, 3600);
    if (!rl.allowed) {
      return NextResponse.json(
        { success: false, message: 'Too many verification attempts. Please request a new code.' },
        { status: 429 }
      );
    }

    await connectDB();

    const registration = await Registration.findOne({ email, domain });

    if (!registration) {
      return NextResponse.json(
        { success: false, message: 'Email not found. Please register first.' },
        { status: 400 }
      );
    }

    if (new Date() > registration.expiresAt) {
      return NextResponse.json(
        { success: false, message: 'Code expired. Please register again.' },
        { status: 400 }
      );
    }

    // Increment attempt counter on wrong code
    if (registration.code !== code) {
      await Registration.updateOne({ email, domain }, { $inc: { attempts: 1 } });
      return NextResponse.json({ success: false, message: 'Invalid code' }, { status: 400 });
    }

    // Mark verified
    await Registration.updateOne(
      { email, domain },
      { verified: true, verifiedAt: new Date() }
    );

    const sessionToken = createSessionToken(email, domain);

    const response = NextResponse.json(
      { success: true, message: 'Email verified successfully' },
      { status: 200 }
    );

    // HTTP-only secure cookie (24 hours)
    response.cookies.set('session_token', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24, // 24 hours
      path: '/',
    });

    return response;
  } catch (err) {
    console.error('[/api/verify]', err);
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 });
  }
}
