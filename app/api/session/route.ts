import { NextRequest, NextResponse } from 'next/server';
import { verifySessionToken } from '@/lib/session';
import { isValidDomain } from '@/lib/validation';

// GET /api/session?domain=discountbnbclub.com
// Used by the frontend on mount to check if the user is already verified
export async function GET(req: NextRequest) {
  const domain = req.nextUrl.searchParams.get('domain') ?? '';
  if (!isValidDomain(domain)) {
    return NextResponse.json({ verified: false });
  }

  const sessionToken = req.cookies.get('session_token')?.value;
  if (!sessionToken) return NextResponse.json({ verified: false });

  const session = verifySessionToken(sessionToken);
  if (!session || session.domain !== domain) {
    return NextResponse.json({ verified: false });
  }

  return NextResponse.json({ verified: true, email: session.email });
}

// DELETE /api/session — log out
export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.delete('session_token');
  return response;
}
