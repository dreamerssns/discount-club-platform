import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { verifyAdminSessionToken } from '@/lib/session';
import Bnb from '@/models/bnb';

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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filter: Record<string, any> = {};
    if (status) filter.status = status;
    if (domain) filter.domain = domain;

    const bnbs = await Bnb.find(filter).sort({ createdAt: -1 }).lean();

    const total    = await Bnb.countDocuments({});
    const pending  = await Bnb.countDocuments({ status: 'pending' });
    const approved = await Bnb.countDocuments({ status: 'approved' });

    return NextResponse.json({ success: true, bnbs, total, pending, approved });
  } catch (err) {
    console.error('[GET /api/admin/bnbs]', err);
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 });
  }
}
