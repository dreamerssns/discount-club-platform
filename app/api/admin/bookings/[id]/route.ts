import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { verifyAdminSessionToken } from '@/lib/session';
import Booking, { BookingStatus } from '@/models/booking';

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
    const { status, notes } = body;

    if (status && !VALID_STATUSES.includes(status)) {
      return NextResponse.json({ success: false, message: 'Invalid status' }, { status: 400 });
    }

    await connectDB();

    const booking = await Booking.findById(id);
    if (!booking) {
      return NextResponse.json({ success: false, message: 'Booking not found' }, { status: 404 });
    }

    if (status && status !== booking.status) {
      booking.statusHistory.push({ status, changedAt: new Date(), notes: notes ?? '' });
      booking.status = status;
    }
    if (notes !== undefined) booking.notes = notes;

    await booking.save();

    return NextResponse.json({ success: true, booking });
  } catch (err) {
    console.error('[PATCH /api/admin/bookings/:id]', err);
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 });
  }
}
