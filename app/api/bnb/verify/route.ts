import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { isValidEmail, isValidDomain, isValidCode, sanitizeEmail } from '@/lib/validation';
import { checkRateLimit } from '@/lib/rateLimit';
import Bnb from '@/models/bnb';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email  = sanitizeEmail(body?.email ?? '');
    const code   = (body?.code ?? '').trim();
    const domain = body?.domain ?? '';

    if (!isValidEmail(email) || !isValidDomain(domain)) {
      return NextResponse.json({ success: false, message: 'Invalid request' }, { status: 400 });
    }
    if (!isValidCode(code)) {
      return NextResponse.json({ success: false, message: 'Code must be 6 digits' }, { status: 400 });
    }

    // Rate limit: 5 verification attempts per email per domain per hour
    const rl = await checkRateLimit(`bnb-verify:${domain}`, email, 5, 3600);
    if (!rl.allowed) {
      return NextResponse.json(
        { success: false, message: 'Too many verification attempts. Please request a new code.' },
        { status: 429 }
      );
    }

    await connectDB();

    const bnb = await Bnb.findOne({ email, domain });

    if (!bnb) {
      return NextResponse.json(
        { success: false, message: 'Registration not found. Please register first.' },
        { status: 400 }
      );
    }

    if (new Date() > bnb.codeExpiresAt) {
      return NextResponse.json(
        { success: false, message: 'Code expired. Please register again.' },
        { status: 400 }
      );
    }

    if (bnb.code !== code) {
      await Bnb.updateOne({ email, domain }, { $inc: { attempts: 1 } });
      return NextResponse.json({ success: false, message: 'Invalid code' }, { status: 400 });
    }

    await Bnb.updateOne({ email, domain }, { verified: true, verifiedAt: new Date() });

    return NextResponse.json(
      { success: true, message: 'Email verified. Your listing is pending review.' },
      { status: 200 }
    );
  } catch (err) {
    console.error('[/api/bnb/verify]', err);
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 });
  }
}
