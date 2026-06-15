import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { isValidEmail, isValidDomain, sanitizeEmail } from '@/lib/validation';
import { verifySessionToken } from '@/lib/session';
import { sendBookingNotification } from '@/lib/email';
import Booking from '@/models/booking';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = sanitizeEmail(body?.email ?? '');
    const domain = body?.domain ?? '';
    const bookingData: Record<string, unknown> = body?.bookingData ?? {};

    if (!isValidEmail(email) || !isValidDomain(domain)) {
      return NextResponse.json({ success: false, message: 'Invalid request' }, { status: 400 });
    }

    // Verify session token from cookie
    const sessionToken = req.cookies.get('session_token')?.value;
    if (!sessionToken) {
      return NextResponse.json(
        { success: false, message: 'Not verified. Please complete registration first.' },
        { status: 401 }
      );
    }

    const session = verifySessionToken(sessionToken);
    if (!session) {
      return NextResponse.json(
        { success: false, message: 'Session expired. Please register again.' },
        { status: 401 }
      );
    }

    // Ensure the cookie belongs to this email+domain
    if (session.email !== email || session.domain !== domain) {
      return NextResponse.json({ success: false, message: 'Session mismatch' }, { status: 401 });
    }

    await connectDB();

    const timestamp = new Date().toISOString();

    await Booking.create({ email, domain, submittedAt: new Date(), bookingData, status: 'pending' });

    // Fire-and-forget email to Todd
    sendBookingNotification(email, domain, timestamp, bookingData).catch(console.error);

    return NextResponse.json(
      { success: true, message: 'Your submission has been sent' },
      { status: 200 }
    );
  } catch (err) {
    console.error('[/api/booking]', err);
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 });
  }
}
