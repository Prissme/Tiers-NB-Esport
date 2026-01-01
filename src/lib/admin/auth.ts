import { cookies } from "next/headers";

export const ADMIN_COOKIE = "admin_session";

export const isAdminAuthenticated = () => {
  return cookies().get(ADMIN_COOKIE)?.value === "1";
};
