/**
 * Example: using chunky-cookies in a Next.js middleware or route handler.
 *
 * NextCookieWrapper accepts RequestCookies, ResponseCookies, or
 * ReadonlyRequestCookies — all three Next.js cookie flavours work.
 */

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { NextCookieWrapper } from "chunky-cookies/next";
import { setItem, getItem } from "chunky-cookies";

const EXPIRY_DAYS = 7;

export function middleware(req: NextRequest) {
  const res = NextResponse.next();

  // --- Writing a large value server-side ---
  const config = {
    clientId: req.headers.get("x-client-id"),
    flags: { darkMode: true, betaFeatures: Array(200).fill("feature") },
  };

  setItem(
    new NextCookieWrapper(res.cookies),
    "app-store",
    JSON.stringify(config),
    { expires: EXPIRY_DAYS }
  );

  return res;
}

// --- Reading it back (e.g. in a server component or route handler) ---
export async function getStoredConfig(cookieStore: ReturnType<typeof import("next/headers")["cookies"]>) {
  const raw = getItem(new NextCookieWrapper(await cookieStore()), "app-store");
  if (!raw) return null;
  return JSON.parse(raw) as { clientId: string | null; flags: Record<string, unknown> };
}
