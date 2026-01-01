"use server";

import { cookies } from "next/headers";

const ADMIN_COOKIE = "admin_session";

export type LoginState = {
  error?: string;
  success?: boolean;
};

export const login = async (
  _prevState: LoginState,
  formData: FormData
): Promise<LoginState> => {
  const password = String(formData.get("password") || "");
  const expected = process.env.ADMIN_PASSWORD || "";

  if (!expected) {
    return { error: "ADMIN_PASSWORD n'est pas configuré." };
  }

  if (password !== expected) {
    return { error: "Mot de passe incorrect." };
  }

  cookies().set(ADMIN_COOKIE, "1", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });

  return { success: true };
};

export const logout = async () => {
  cookies().set(ADMIN_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
};
