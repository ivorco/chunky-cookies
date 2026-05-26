import Cookies from "js-cookie";
import type { CookieWrapper, CookieOptions } from "../core.js";

/**
 * CookieWrapper backed by the `js-cookie` library.
 * Use this in browser / client-side environments.
 *
 * @example
 * import { JsCookieWrapper } from "chunky-cookies/js-cookie";
 * import { setItem, getItem } from "chunky-cookies";
 *
 * setItem(new JsCookieWrapper(), "my-key", largeValue, { expires: 7 });
 */
export class JsCookieWrapper implements CookieWrapper {
  get(name: string): string | undefined {
    return Cookies.get(name);
  }

  set(name: string, value: string, options?: CookieOptions): void {
    Cookies.set(name, value, {
      expires: options?.expires,
      path: options?.path,
    });
  }

  remove(name: string, options?: Pick<CookieOptions, "path">): void {
    Cookies.remove(name, { path: options?.path });
  }
}
