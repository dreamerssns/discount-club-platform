import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { isValidEmail, isValidCode, sanitizeEmail } from '@/lib/validation';
import { isAdminEmail } from '@/lib/admin';
import { createAdminSessionToken } from '@/lib/session';
import Registration from '@/models/registration';

const ADMIN_DOMAIN = 'discountbnbclub.com';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = sanitizeEmail(body?.email ?? '');
    const code  = (body?.code ?? '').trim();

    if (!isValidEmail(email) || !isValidCode(code)) {
      return NextResponse.json({ success: false, message: 'Invalid request' }, { status: 400 });
    }
    if (!isAdminEmail(email)) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 403 });
    }

    await connectDB();

    const registration = await Registration.findOne({ email, domain: ADMIN_DOMAIN });
    if (!registration) {
      return NextResponse.json({ success: false, message: 'Code not found. Request a new one.' }, { status: 400 });
    }
    if (new Date() > registration.expiresAt) {
      return NextResponse.json({ success: false, message: 'Code expired. Request a new one.' }, { status: 400 });
    }
    if (registration.code !== code) {
      await Registration.updateOne({ email, domain: ADMIN_DOMAIN }, { $inc: { attempts: 1 } });
      return NextResponse.json({ success: false, message: 'Invalid code' }, { status: 400 });
    }

    await Registration.updateOne({ email, domain: ADMIN_DOMAIN }, { verified: true, verifiedAt: new Date() });

    const token = createAdminSessionToken(email);

    const response = NextResponse.json({ success: true, message: 'Logged in' }, { status: 200 });
    response.cookies.set('admin_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 8, // 8 hours
      path: '/',
    });

    return response;
  } catch (err) {
    console.error('[/api/admin/verify]', err);
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 });
  }
}
