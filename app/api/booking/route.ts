import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { isValidEmail, isValidDomain, sanitizeEmail } from '@/lib/validation';
import { verifySessionToken } from '@/lib/session';
import { sendBookingNotification } from '@/lib/email';
import Booking from '@/models/booking';

function digitsOnly(val: string) {
  return val.replace(/\D/g, '');
}

function parseDate(mmddyyyy: string): Date | null {
  // HTML date inputs send yyyy-mm-dd
  const d = new Date(mmddyyyy + 'T00:00:00');
  return isNaN(d.getTime()) ? null : d;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email       = sanitizeEmail(body?.email ?? '');
    const domain      = body?.domain ?? '';
    const name        = (body?.name ?? '').trim();
    const phoneNumber = (body?.phoneNumber ?? '').trim();
    const bnbName     = (body?.bnbName ?? '').trim();
    const checkInDate  = (body?.checkInDate ?? '').trim();
    const checkOutDate = (body?.checkOutDate ?? '').trim();
    const vehicle          = (body?.vehicle ?? '').trim();
    const priceExpectation = (body?.priceExpectation ?? '').trim();
    const priceType        = (body?.priceType ?? '').trim();
    const comments         = (body?.comments ?? '').trim();

    // Basic field validation
    if (!isValidEmail(email) || !isValidDomain(domain)) {
      return NextResponse.json({ success: false, message: 'Invalid request' }, { status: 400 });
    }
    if (name.length < 2)
      return NextResponse.json({ success: false, message: 'Name must be at least 2 characters' }, { status: 400 });
    if (digitsOnly(phoneNumber).length < 10)
      return NextResponse.json({ success: false, message: 'Phone must have at least 10 digits' }, { status: 400 });
    if (bnbName.length < 2)
      return NextResponse.json({ success: false, message: 'BNB name must be at least 2 characters' }, { status: 400 });
    if (!priceExpectation)
      return NextResponse.json({ success: false, message: 'Price expectation is required' }, { status: 400 });
    if (!['nightly', 'total'].includes(priceType))
      return NextResponse.json({ success: false, message: 'Invalid price type' }, { status: 400 });
    if (comments.length > 500)
      return NextResponse.json({ success: false, message: 'Comments cannot exceed 500 characters' }, { status: 400 });

    const today = new Date(); today.setHours(0, 0, 0, 0);
    const checkIn  = parseDate(checkInDate);
    const checkOut = parseDate(checkOutDate);

    if (!checkIn)
      return NextResponse.json({ success: false, message: 'Invalid check-in date' }, { status: 400 });
    if (checkIn < today)
      return NextResponse.json({ success: false, message: 'Check-in date cannot be in the past' }, { status: 400 });
    if (!checkOut)
      return NextResponse.json({ success: false, message: 'Invalid check-out date' }, { status: 400 });
    if (checkOut <= checkIn)
      return NextResponse.json({ success: false, message: 'Check-out must be after check-in' }, { status: 400 });

    // Session check
    const sessionToken = req.cookies.get('session_token')?.value;
    if (!sessionToken) {
      return NextResponse.json({ success: false, message: 'Not verified. Please complete registration first.' }, { status: 401 });
    }
    const session = verifySessionToken(sessionToken);
    if (!session || session.email !== email || session.domain !== domain) {
      return NextResponse.json({ success: false, message: 'Session expired or mismatch. Please register again.' }, { status: 401 });
    }

    await connectDB();

    const timestamp = new Date().toISOString();

    // Format dates for display in emails (mm/dd/yyyy)
    const fmt = (d: Date) =>
      `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}/${d.getFullYear()}`;

    const booking = await Booking.create({
      email, domain, name, phoneNumber, bnbName,
      checkInDate:  fmt(checkIn),
      checkOutDate: fmt(checkOut),
      vehicle, priceExpectation, priceType, comments,
      status: 'pending',
      notes: '',
      statusHistory: [],
    });

    try {
      await sendBookingNotification({
        email, domain, name, phoneNumber, bnbName,
        checkInDate: fmt(checkIn), checkOutDate: fmt(checkOut),
        vehicle, priceExpectation, priceType, comments,
        timestamp,
        bookingId: String(booking._id),
      });
    } catch (emailErr) {
      console.error('[/api/booking] notification email failed:', emailErr);
    }

    return NextResponse.json({ success: true, message: 'Your submission has been sent' }, { status: 200 });
  } catch (err) {
    console.error('[/api/booking]', err);
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 });
  }
}
