import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { verifyAdminSessionToken } from '@/lib/session';
import { sendBookingConfirmation, sendBnbOwnerConfirmation } from '@/lib/email';
import Booking, { BookingStatus } from '@/models/booking';
import Bnb from '@/models/bnb';

const VALID_STATUSES: BookingStatus[] = ['pending', 'approved', 'rejected', 'contacted', 'completed'];

function requireAdmin(req: NextRequest) {
  const token = req.cookies.get('admin_session')?.value;
  if (!token) return null;
  return verifyAdminSessionToken(token);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = requireAdmin(req);
  if (!session) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await req.json();
    const { status, notes, bnbId, finalPrice, checkInTime, checkOutTime } = body;

    if (status && !VALID_STATUSES.includes(status)) {
      return NextResponse.json({ success: false, message: 'Invalid status' }, { status: 400 });
    }

    await connectDB();

    const booking = await Booking.findById(id);
    if (!booking) {
      return NextResponse.json({ success: false, message: 'Booking not found' }, { status: 404 });
    }

    const isApproving = status === 'approved' && booking.status !== 'approved';
    let bnb = null;

    if (isApproving) {
      if (!bnbId || !finalPrice?.trim() || !checkInTime?.trim() || !checkOutTime?.trim()) {
        return NextResponse.json(
          { success: false, message: 'BNB, final price, and check-in/check-out times are required to approve a booking' },
          { status: 400 }
        );
      }

      bnb = await Bnb.findById(bnbId);
      if (!bnb || bnb.status !== 'approved') {
        return NextResponse.json(
          { success: false, message: 'Selected BNB must be a registered, approved BNB' },
          { status: 400 }
        );
      }

      booking.confirmedBnbId = String(bnb._id);
      booking.confirmedPropertyAddress = bnb.address;
      booking.confirmedOperatorName = bnb.ownerName;
      booking.confirmedPrice = finalPrice.trim();
      booking.confirmedCheckInTime = checkInTime.trim();
      booking.confirmedCheckOutTime = checkOutTime.trim();
    }

    if (status && status !== booking.status) {
      booking.statusHistory.push({ status, changedAt: new Date(), notes: notes ?? '' });
      booking.status = status;
    }
    if (notes !== undefined) booking.notes = notes;

    if (isApproving && bnb) {
      try {
        await Promise.all([
          sendBookingConfirmation({
            guestName: booking.name,
            guestEmail: booking.email,
            guestPhone: booking.phoneNumber,
            domain: booking.domain,
            bnbName: bnb.bnbName,
            propertyAddress: bnb.address,
            operatorName: bnb.ownerName,
            price: booking.confirmedPrice!,
            checkInDate: booking.checkInDate,
            checkInTime: booking.confirmedCheckInTime!,
            checkOutDate: booking.checkOutDate,
            checkOutTime: booking.confirmedCheckOutTime!,
          }),
          sendBnbOwnerConfirmation({
            ownerEmail: bnb.email,
            ownerName: bnb.ownerName,
            domain: booking.domain,
            bnbName: bnb.bnbName,
            guestName: booking.name,
            guestEmail: booking.email,
            guestPhone: booking.phoneNumber,
            price: booking.confirmedPrice!,
            checkInDate: booking.checkInDate,
            checkInTime: booking.confirmedCheckInTime!,
            checkOutDate: booking.checkOutDate,
            checkOutTime: booking.confirmedCheckOutTime!,
            bookingId: String(booking._id),
          }),
        ]);
        booking.confirmationSentAt = new Date();
      } catch (emailErr) {
        console.error('[PATCH /api/admin/bookings/:id] confirmation email failed:', emailErr);
        return NextResponse.json(
          { success: false, message: 'Approved fields saved, but confirmation emails failed to send. Please retry.' },
          { status: 502 }
        );
      }
    }

    await booking.save();

    return NextResponse.json({ success: true, booking });
  } catch (err) {
    console.error('[PATCH /api/admin/bookings/:id]', err);
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 });
  }
}
