import { NextResponse } from "next/server";
import {
  ADMIN_COOKIE,
  ADMIN_SESSION_TTL_MS,
  createAdminSessionToken,
  isAdminAuthenticated,
} from "../../../../src/lib/admin/auth";

export async function GET() {
  const hasAdminCookie = await isAdminAuthenticated();

  if (!hasAdminCookie) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  const response = NextResponse.json({ authenticated: true });

  // Session glissante : chaque vérif valide repousse l'expiration de 30 jours
  try {
    const token = await createAdminSessionToken();
    response.cookies.set(ADMIN_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: ADMIN_SESSION_TTL_MS / 1000,
    });
  } catch {
    // ADMIN_SESSION_SECRET absent : on laisse le cookie tel quel
  }

  return response;
}
