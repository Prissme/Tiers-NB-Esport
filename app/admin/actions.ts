"use server";

import { cookies } from "next/headers";
import { updateLfnData } from "../lib/data-store";
import type { LfnData } from "../lib/types";

const ADMIN_COOKIE = "lfn-admin";

export type LoginState = {
  error?: string;
  success?: boolean;
};

export type SaveState = {
  persisted?: boolean;
  message?: string;
  error?: string;
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

export const saveData = async (
  _prevState: SaveState,
  formData: FormData
): Promise<SaveState> => {
  const payload = String(formData.get("payload") || "");

  try {
    const parsed = JSON.parse(payload) as LfnData;
    const result = await updateLfnData(parsed);
    return { persisted: result.persisted, message: result.message };
  } catch (error) {
    return { error: "JSON invalide. Sauvegarde annulée." };
  }
};

export const isAuthenticated = () => {
  return cookies().get(ADMIN_COOKIE)?.value === "1";
};
