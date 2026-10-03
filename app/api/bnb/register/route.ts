import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { isValidEmail, isValidDomain, generateCode, sanitizeEmail } from '@/lib/validation';
import { checkRateLimit } from '@/lib/rateLimit';
import { sendVerificationCode, sendBnbRegistrationNotification } from '@/lib/email';
import Bnb from '@/models/bnb';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email     = sanitizeEmail(body?.email ?? '');
    const domain    = body?.domain ?? '';
    const ownerName = (body?.ownerName ?? '').trim();
    const bnbName   = (body?.bnbName ?? '').trim();
    const address   = (body?.address ?? '').trim();

    if (!isValidEmail(email)) {
      return NextResponse.json({ success: false, message: 'Invalid email format' }, { status: 400 });
    }
    if (!isValidDomain(domain)) {
      return NextResponse.json({ success: false, message: 'Invalid domain' }, { status: 400 });
    }
    if (ownerName.length < 2) {
      return NextResponse.json({ success: false, message: 'Name must be at least 2 characters' }, { status: 400 });
    }
    if (bnbName.length < 2) {
      return NextResponse.json({ success: false, message: 'BNB name must be at least 2 characters' }, { status: 400 });
    }
    if (address.length < 5) {
      return NextResponse.json({ success: false, message: 'Address must be at least 5 characters' }, { status: 400 });
    }

    // Rate limit: 3 registration attempts per email per domain per hour
    const rl = await checkRateLimit(`bnb-register:${domain}`, email, 3, 3600);
    if (!rl.allowed) {
      return NextResponse.json(
        { success: false, message: 'Too many attempts. Please wait before trying again.' },
        { status: 429 }
      );
    }

    await connectDB();

    const code = generateCode();
    const codeExpiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

    const bnb = await Bnb.findOneAndUpdate(
      { email, domain },
      {
        ownerName, bnbName, address,
        code, codeExpiresAt, verified: false, verifiedAt: undefined, attempts: 0,
        // Re-registering resets moderation back to pending for the new info
        status: 'pending',
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    const [verifyResult] = await Promise.allSettled([
      sendVerificationCode(email, code, domain),
      sendBnbRegistrationNotification({ ownerName, bnbName, address, email, domain, timestamp: new Date().toISOString() }),
    ]);

    if (verifyResult.status === 'rejected') {
      console.error('[/api/bnb/register] verification email failed:', verifyResult.reason);
      return NextResponse.json({ success: false, message: 'Failed to send verification email. Please try again.' }, { status: 500 });
    }

    return NextResponse.json(
      { success: true, message: 'Verification code sent to your email', bnbId: String(bnb._id) },
      { status: 200 }
    );
  } catch (err) {
    console.error('[/api/bnb/register]', err);
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 });
  }
}
