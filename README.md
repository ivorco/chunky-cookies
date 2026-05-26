# chunky-cookies 🍪

Cookie storage that transparently **chunks large values across multiple cookies**, bypassing the 4 KB browser limit — with zero config and full TypeScript support.

Works standalone, as a [Zustand](https://github.com/pmndrs/zustand) `persist` adapter, and in [Next.js](https://nextjs.org/) middleware / server components.

---

## The problem

Browsers enforce a **~4 KB limit** per cookie. If you try to persist a Zustand store or any large config object in a cookie, you silently lose data — or crash.

Existing solutions either require a completely different storage backend (IndexedDB, localStorage) or don't work server-side.

`chunky-cookies` stays on cookies — it just uses more of them.

---

## Install

```bash
npm install chunky-cookies
# or
yarn add chunky-cookies
```

Peer dependencies (install whichever you use):

```bash
npm install js-cookie zustand   # client-side + Zustand
npm install next                # Next.js server-side
```

---

## Usage

### With Zustand (drop-in)

```ts
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { cookieStorage } from "chunky-cookies";

const useStore = create(
  persist(
    (set) => ({
      user: null,
      config: null,
      setUser: (user, config) => set({ user, config }),
    }),
    {
      name: "app-store",
      storage: cookieStorage({ expires: 7 }), // days
    }
  )
);
```

That's it. Large state is automatically split across `app-store`, `app-store_0`, `app-store_1` … and seamlessly reassembled on read.

---

### Standalone (js-cookie)

```ts
import { JsCookieWrapper, setItem, getItem, removeItem } from "chunky-cookies";

const cookies = new JsCookieWrapper();

setItem(cookies, "my-key", JSON.stringify(bigObject), { expires: 7 });
const raw = getItem(cookies, "my-key");  // original string, chunks joined
removeItem(cookies, "my-key");           // cleans up ALL chunk cookies
```

---

### Next.js server-side (middleware / route handlers)

```ts
import { NextCookieWrapper } from "chunky-cookies/next";
import { setItem, getItem } from "chunky-cookies";

// In middleware:
setItem(new NextCookieWrapper(res.cookies), "app-store", JSON.stringify(config), {
  expires: 7,
});

// In a server component / route handler:
const raw = getItem(new NextCookieWrapper(await cookies()), "app-store");
```

Works with `RequestCookies`, `ResponseCookies`, and `ReadonlyRequestCookies`.

---

### Custom backend

Implement the two-method `CookieWrapper` interface to target any cookie backend:

```ts
import type { CookieWrapper } from "chunky-cookies";

class MyCookieWrapper implements CookieWrapper {
  get(name: string) { /* ... */ }
  set(name: string, value: string, options?) { /* ... */ }
  remove(name: string, options?) { /* ... */ }
}

setItem(new MyCookieWrapper(), "key", value);
```

---

## How it works

| Value size | What happens |
|---|---|
| ≤ 1333 bytes | Stored in a single cookie as-is |
| > 1333 bytes | Split into 1333-byte chunks stored as `{name}_0`, `{name}_1`, … A metadata sentinel `{ _partitioned: true, chunks: N }` is written to the root key |

On read, the chunk count is taken **exactly from metadata** — the library never scans beyond it, so stale leftover chunks from a previous (larger) write are never accidentally appended.

On remove, all chunk cookies are deleted using the stored count.

---

## API

### Core functions

```ts
setItem(cookies: CookieWrapper, name: string, value: string, options?: CookieOptions): void
getItem(cookies: CookieWrapper, name: string): string | null
removeItem(cookies: CookieWrapper, name: string, options?: Pick<CookieOptions, "path">): void
```

### `CookieOptions`

```ts
interface CookieOptions {
  expires?: number; // days from now
  path?: string;    // default: "/"
}
```

### `cookieStorage(options?)` — Zustand adapter

```ts
cookieStorage({ expires?: number; path?: string }): StateStorage
```

### Bundled wrappers

| Import | Backed by |
|---|---|
| `JsCookieWrapper` | `js-cookie` |
| `NextCookieWrapper` from `chunky-cookies/next` | Next.js cookie APIs |

---

## License

MIT
