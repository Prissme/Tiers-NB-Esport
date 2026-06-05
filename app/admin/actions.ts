"use server";

import { cookies, headers } from "next/headers";
import { checkRateLimit, resetRateLimit } from "../../lib/rateLimit";

const ADMIN_COOKIE = "admin_session";

export type LoginState = {
  error?: string;
  success?: boolean;
};

/** Délai artificiel constant pour éviter les timing attacks */
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const login = async (
  _prevState: LoginState,
  formData: FormData
): Promise<LoginState> => {
  // Délai fixe de 500ms — rend le brute-force ~20x plus lent et masque si le mdp est correct
  await delay(500);

  const ip =
    headers().get("x-forwarded-for")?.split(",")[0]?.trim() ??
    headers().get("x-real-ip") ??
    "unknown";

  const { blocked, remaining } = checkRateLimit(`login:${ip}`);

  if (blocked) {
    return {
      error: "Trop de tentatives échouées. Réessayez dans 15 minutes.",
    };
  }

  const password = String(formData.get("password") || "");
  const expected = process.env.ADMIN_PASSWORD || "";

  if (!expected) {
    return { error: "ADMIN_PASSWORD n'est pas configuré." };
  }

  if (password !== expected) {
    const msg =
      remaining <= 1
        ? `Mot de passe incorrect. Dernière tentative avant blocage.`
        : `Mot de passe incorrect. (${remaining} tentative${remaining > 1 ? "s" : ""} restante${remaining > 1 ? "s" : ""})`;
    return { error: msg };
  }

  // Succès — on réinitialise le compteur
  resetRateLimit(`login:${ip}`);

  cookies().set(ADMIN_COOKIE, "1", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict", // plus strict que "lax"
    path: "/",
    maxAge: 60 * 60 * 8, // session de 8h max
  });

  return { success: true };
};

export const logout = async () => {
  cookies().set(ADMIN_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 0,
  });
};
