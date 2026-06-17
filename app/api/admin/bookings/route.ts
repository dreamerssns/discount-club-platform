import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { verifyAdminSessionToken } from '@/lib/session';
import Booking from '@/models/booking';

function requireAdmin(req: NextRequest) {
  const token = req.cookies.get('admin_session')?.value;
  if (!token) return null;
  return verifyAdminSessionToken(token);
}

export async function GET(req: NextRequest) {
  const session = requireAdmin(req);
  if (!session) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  try {
    await connectDB();

    const { searchParams } = req.nextUrl;
    const status = searchParams.get('status');
    const domain = searchParams.get('domain');
    const search = searchParams.get('search');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filter: Record<string, any> = {};
    if (status) filter.status = status;
    if (domain) filter.domain = domain;
    if (search) {
      filter.$or = [
        { name:  { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const bookings = await Booking.find(filter).sort({ createdAt: -1 }).lean();

    const total     = await Booking.countDocuments({});
    const pending   = await Booking.countDocuments({ status: 'pending' });
    const approved  = await Booking.countDocuments({ status: 'approved' });
    const contacted = await Booking.countDocuments({ status: 'contacted' });

    return NextResponse.json({ success: true, bookings, total, pending, approved, contacted });
  } catch (err) {
    console.error('[GET /api/admin/bookings]', err);
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 });
  }
}
