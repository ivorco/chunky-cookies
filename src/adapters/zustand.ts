import { createJSONStorage } from "zustand/middleware";
import { JsCookieWrapper } from "../wrappers/js-cookie.js";
import { setItem, getItem, removeItem } from "../core.js";

export interface CookieStorageOptions {
  /** How many days until the cookie expires. Default: 7 */
  expires?: number;
  /** Cookie path. Default: "/" */
  path?: string;
}

/**
 * A Zustand `persist` storage adapter that transparently chunks large state
 * objects across multiple cookies, bypassing the 4KB browser cookie limit.
 *
 * Drop this in wherever you'd normally use `createJSONStorage(() => cookieStore)`.
 *
 * @example
 * import { create } from "zustand";
 * import { persist } from "zustand/middleware";
 * import { cookieStorage } from "chunky-cookies/zustand";
 *
 * const useStore = create(
 *   persist(
 *     (set) => ({ count: 0, increment: () => set((s) => ({ count: s.count + 1 })) }),
 *     {
 *       name: "my-store",
 *       storage: cookieStorage({ expires: 7 }),
 *     }
 *   )
 * );
 */
export function cookieStorage(options: CookieStorageOptions = {}) {
  const { expires = 7, path = "/" } = options;
  const wrapper = new JsCookieWrapper();

  return createJSONStorage(() => ({
    getItem: (name: string) => getItem(wrapper, name),
    setItem: (name: string, value: string) =>
      setItem(wrapper, name, value, { expires, path }),
    removeItem: (name: string) => removeItem(wrapper, name, { path }),
  }));
}
