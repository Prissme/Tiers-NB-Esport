import { headers } from "next/headers";

export const getBaseUrl = () => {
  const envUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (envUrl) {
    return envUrl.replace(/\/$/, "");
  }

  const host = headers().get("host");
  if (!host) {
    return "http://localhost:3000";
  }

  const protocol = host.includes("localhost") ? "http" : "https";
  return `${protocol}://${host}`;
};
