import type { CookieWrapper, CookieOptions } from "../core.js";

/**
 * A minimal interface that covers all three Next.js cookie flavours:
 *   - `RequestCookies`  (from next/dist/compiled/@edge-runtime/cookies)
 *   - `ResponseCookies` (from next/dist/compiled/@edge-runtime/cookies)
 *   - `ReadonlyRequestCookies` (from next/dist/server/web/spec-extension/adapters/request-cookies)
 *
 * We duck-type rather than import Next.js types so this file has zero
 * hard dependency on next at build time.
 */
interface NextCookies {
  get(name: string): { value: string } | undefined;
  set(
    name: string,
    value: string,
    options?: { expires?: Date; path?: string }
  ): void;
  delete(name: string): void;
}

/**
 * CookieWrapper backed by the Next.js server-side cookie APIs
 * (RequestCookies, ResponseCookies, ReadonlyRequestCookies).
 *
 * Pass the cookies object you receive from Next.js — middleware,
 * route handlers, or server components all work.
 *
 * @example
 * // In a Next.js middleware or route handler:
 * import { NextCookieWrapper } from "chunky-cookies/next";
 * import { setItem, getItem } from "chunky-cookies";
 *
 * setItem(new NextCookieWrapper(res.cookies), "app-store", value, { expires: 7 });
 */
export class NextCookieWrapper implements CookieWrapper {
  constructor(private readonly cookies: NextCookies) {}

  get(name: string): string | undefined {
    return this.cookies.get(name)?.value;
  }

  set(name: string, value: string, options?: CookieOptions): void {
    this.cookies.set(name, value, {
      expires: options?.expires
        ? new Date(Date.now() + options.expires * 24 * 60 * 60 * 1000)
        : undefined,
      path: options?.path,
    });
  }

  remove(name: string): void {
    this.cookies.delete(name);
  }
}
