import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const ADMIN_COOKIE = "admin_session";

export function GET() {
  const hasAdminCookie = cookies().get(ADMIN_COOKIE)?.value === "1";

  if (!hasAdminCookie) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  return NextResponse.json({ authenticated: true });
}
