import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminSessionToken } from '@/lib/session';

export async function GET(req: NextRequest) {
  const token = req.cookies.get('admin_session')?.value;
  if (!token) return NextResponse.json({ authenticated: false });

  const session = verifyAdminSessionToken(token);
  if (!session) return NextResponse.json({ authenticated: false });

  return NextResponse.json({ authenticated: true, email: session.email });
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.delete('admin_session');
  return response;
}
