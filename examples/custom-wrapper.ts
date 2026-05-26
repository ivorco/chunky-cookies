/**
 * Example: rolling your own CookieWrapper.
 *
 * The CookieWrapper interface is tiny — implement it to target any cookie
 * backend (document.cookie, a test mock, a Redis session, whatever).
 */

import type { CookieWrapper, CookieOptions } from "chunky-cookies";
import { setItem, getItem } from "chunky-cookies";

// --- Bare document.cookie wrapper (no external dependency) ---
class DocumentCookieWrapper implements CookieWrapper {
  get(name: string): string | undefined {
    const match = document.cookie
      .split("; ")
      .find((row) => row.startsWith(`${name}=`));
    return match ? decodeURIComponent(match.split("=")[1]) : undefined;
  }

  set(name: string, value: string, options?: CookieOptions): void {
    let cookie = `${name}=${encodeURIComponent(value)}`;
    if (options?.expires) {
      const date = new Date();
      date.setDate(date.getDate() + options.expires);
      cookie += `; expires=${date.toUTCString()}`;
    }
    cookie += `; path=${options?.path ?? "/"}`;
    document.cookie = cookie;
  }

  remove(name: string, options?: Pick<CookieOptions, "path">): void {
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=${options?.path ?? "/"}`;
  }
}

// Usage:
const wrapper = new DocumentCookieWrapper();
setItem(wrapper, "raw-key", JSON.stringify({ hello: "world" }), { expires: 1 });
const result = getItem(wrapper, "raw-key");
console.log(result); // '{"hello":"world"}'
