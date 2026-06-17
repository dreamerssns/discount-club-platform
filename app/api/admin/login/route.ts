import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { isValidEmail, sanitizeEmail, generateCode } from '@/lib/validation';
import { isAdminEmail } from '@/lib/admin';
import { sendVerificationCode } from '@/lib/email';
import Registration from '@/models/registration';

const ADMIN_DOMAIN = 'discountbnbclub.com'; // arbitrary domain for admin registrations

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = sanitizeEmail(body?.email ?? '');

    if (!isValidEmail(email)) {
      return NextResponse.json({ success: false, message: 'Invalid email format' }, { status: 400 });
    }
    if (!isAdminEmail(email)) {
      // Return same message to avoid leaking which emails are admin
      return NextResponse.json(
        { success: true, message: 'If that email is authorized, a code has been sent.' },
        { status: 200 }
      );
    }

    await connectDB();

    const code = generateCode();
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

    await Registration.findOneAndUpdate(
      { email, domain: ADMIN_DOMAIN },
      { code, verified: false, expiresAt, attempts: 0, verifiedAt: undefined },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    sendVerificationCode(email, code, ADMIN_DOMAIN).catch(console.error);

    return NextResponse.json(
      { success: true, message: 'If that email is authorized, a code has been sent.' },
      { status: 200 }
    );
  } catch (err) {
    console.error('[/api/admin/login]', err);
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 });
  }
}
