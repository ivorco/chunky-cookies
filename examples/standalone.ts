/**
 * Example: using chunky-cookies without any framework.
 *
 * The core functions accept any CookieWrapper, so you can use js-cookie,
 * document.cookie, or your own implementation.
 */

import { JsCookieWrapper } from "chunky-cookies";
import { setItem, getItem, removeItem } from "chunky-cookies";

const cookies = new JsCookieWrapper();

// --- Write a large value ---
const bigConfig = {
  user: { id: "abc-123", name: "Or" },
  preferences: Array.from({ length: 300 }, (_, i) => ({ key: `pref-${i}`, value: i })),
};

setItem(cookies, "my-config", JSON.stringify(bigConfig), { expires: 7 });
// Transparently splits into as many cookies as needed.
// e.g. "my-config" (meta) + "my-config_0", "my-config_1", "my-config_2" ...

// --- Read it back ---
const raw = getItem(cookies, "my-config");
if (raw) {
  const restored = JSON.parse(raw);
  console.log("Restored user:", restored.user.name);
}

// --- Clean up ---
removeItem(cookies, "my-config");
// Removes the meta cookie AND all chunk cookies.
