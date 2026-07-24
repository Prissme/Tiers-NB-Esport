import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "../../../../src/lib/admin/auth";

export async function GET() {
  const hasAdminCookie = await isAdminAuthenticated();

  if (!hasAdminCookie) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  return NextResponse.json({ authenticated: true });
}
