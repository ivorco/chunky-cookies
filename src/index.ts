// Core operations — framework-agnostic
export { setItem, getItem, removeItem, MAX_CHUNK_SIZE } from "./core.js";
export type { CookieWrapper, CookieOptions } from "./core.js";

// Bundled wrappers
export { JsCookieWrapper } from "./wrappers/js-cookie.js";
export { NextCookieWrapper } from "./wrappers/next.js";

// Zustand adapter
export { cookieStorage } from "./adapters/zustand.js";
export type { CookieStorageOptions } from "./adapters/zustand.js";
