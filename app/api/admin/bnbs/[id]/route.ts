import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { verifyAdminSessionToken } from '@/lib/session';
import Bnb, { BnbStatus } from '@/models/bnb';
import Booking from '@/models/booking';

const VALID_STATUSES: BnbStatus[] = ['pending', 'approved', 'rejected'];

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
    const { status } = body;

    if (!status || !VALID_STATUSES.includes(status)) {
      return NextResponse.json({ success: false, message: 'Invalid status' }, { status: 400 });
    }

    await connectDB();

    const bnb = await Bnb.findByIdAndUpdate(id, { status }, { new: true });
    if (!bnb) {
      return NextResponse.json({ success: false, message: 'BNB not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, bnb });
  } catch (err) {
    console.error('[PATCH /api/admin/bnbs/:id]', err);
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = requireAdmin(req);
  if (!session) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;
    await connectDB();

    // Don't delete a BNB that a confirmed booking still references
    const inUse = await Booking.exists({ confirmedBnbId: id });
    if (inUse) {
      return NextResponse.json(
        { success: false, message: 'Cannot delete: this BNB is referenced by a confirmed booking' },
        { status: 409 }
      );
    }

    const bnb = await Bnb.findByIdAndDelete(id);
    if (!bnb) {
      return NextResponse.json({ success: false, message: 'BNB not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[DELETE /api/admin/bnbs/:id]', err);
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 });
  }
}
