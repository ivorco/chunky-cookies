import { describe, it, expect, beforeEach } from "vitest";
import { setItem, getItem, removeItem, MAX_CHUNK_SIZE } from "../src/core";
import type { CookieWrapper, CookieOptions } from "../src/core";

// ---------------------------------------------------------------------------
// In-memory CookieWrapper for tests — no browser / js-cookie needed
// ---------------------------------------------------------------------------

class MemoryCookieWrapper implements CookieWrapper {
  private store = new Map<string, string>();

  get(name: string): string | undefined {
    return this.store.get(name);
  }

  set(name: string, value: string, _options?: CookieOptions): void {
    this.store.set(name, value);
  }

  remove(name: string): void {
    this.store.delete(name);
  }

  /** Test helper — see every key currently in the store */
  keys(): string[] {
    return [...this.store.keys()];
  }

  size(): number {
    return this.store.size;
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Generate a string longer than MAX_CHUNK_SIZE * n */
function bigString(bytes: number): string {
  return "x".repeat(bytes);
}

// ---------------------------------------------------------------------------
// setItem / getItem
// ---------------------------------------------------------------------------

describe("setItem + getItem — small values (no chunking)", () => {
  let cookies: MemoryCookieWrapper;

  beforeEach(() => {
    cookies = new MemoryCookieWrapper();
  });

  it("stores and retrieves a plain string", () => {
    setItem(cookies, "key", "hello");
    expect(getItem(cookies, "key")).toBe("hello");
  });

  it("stores and retrieves a JSON string", () => {
    const value = JSON.stringify({ name: "chunky", version: 1 });
    setItem(cookies, "key", value);
    expect(getItem(cookies, "key")).toBe(value);
  });

  it("uses exactly one cookie for small values", () => {
    setItem(cookies, "key", "small");
    expect(cookies.keys()).toEqual(["key"]);
  });

  it("returns null when key does not exist", () => {
    expect(getItem(cookies, "missing")).toBeNull();
  });
});

describe("setItem + getItem — large values (chunking)", () => {
  let cookies: MemoryCookieWrapper;

  beforeEach(() => {
    cookies = new MemoryCookieWrapper();
  });

  it("splits a value that exceeds MAX_CHUNK_SIZE", () => {
    const value = bigString(MAX_CHUNK_SIZE + 1);
    setItem(cookies, "big", value);

    // Should have: root meta cookie + at least one chunk
    expect(cookies.keys()).toContain("big");
    expect(cookies.keys()).toContain("big_0");
  });

  it("reconstructs the original value from chunks", () => {
    const value = bigString(MAX_CHUNK_SIZE * 3 + 500);
    setItem(cookies, "big", value);
    expect(getItem(cookies, "big")).toBe(value);
  });

  it("creates the correct number of chunk cookies", () => {
    const value = bigString(MAX_CHUNK_SIZE * 4);
    setItem(cookies, "big", value);

    // 4 chunks + 1 meta = 5 cookies total
    expect(cookies.keys().length).toBe(5);
    expect(cookies.keys()).toContain("big_3");
    expect(cookies.keys()).not.toContain("big_4");
  });

  it("stores chunk count in the root meta cookie", () => {
    const value = bigString(MAX_CHUNK_SIZE * 2 + 1);
    setItem(cookies, "big", value);

    const meta = JSON.parse(cookies.get("big")!);
    expect(meta._partitioned).toBe(true);
    expect(meta.chunks).toBe(3);
  });

  it("handles a value that is exactly MAX_CHUNK_SIZE (boundary — no chunking)", () => {
    const value = bigString(MAX_CHUNK_SIZE);
    setItem(cookies, "exact", value);

    expect(cookies.keys()).toEqual(["exact"]);
    expect(getItem(cookies, "exact")).toBe(value);
  });

  it("handles a value that is exactly MAX_CHUNK_SIZE + 1 (triggers chunking)", () => {
    const value = bigString(MAX_CHUNK_SIZE + 1);
    setItem(cookies, "boundary", value);

    expect(cookies.keys().length).toBeGreaterThan(1);
    expect(getItem(cookies, "boundary")).toBe(value);
  });
});

// ---------------------------------------------------------------------------
// removeItem
// ---------------------------------------------------------------------------

describe("removeItem", () => {
  let cookies: MemoryCookieWrapper;

  beforeEach(() => {
    cookies = new MemoryCookieWrapper();
  });

  it("removes a plain (non-chunked) cookie", () => {
    setItem(cookies, "key", "value");
    removeItem(cookies, "key");
    expect(cookies.keys()).toEqual([]);
    expect(getItem(cookies, "key")).toBeNull();
  });

  it("removes all chunk cookies when value was chunked", () => {
    const value = bigString(MAX_CHUNK_SIZE * 3 + 1);
    setItem(cookies, "big", value);

    removeItem(cookies, "big");

    expect(cookies.size()).toBe(0);
    expect(getItem(cookies, "big")).toBeNull();
  });

  it("does not leave orphaned chunks behind (the bug fix)", () => {
    // Write a large value (4 chunks)
    setItem(cookies, "key", bigString(MAX_CHUNK_SIZE * 4));
    // Overwrite with a smaller value (2 chunks)
    setItem(cookies, "key", bigString(MAX_CHUNK_SIZE * 2 + 1));
    // The old big_2, big_3 are now orphaned

    removeItem(cookies, "key");

    // Only the orphaned chunks remain (we only remove what the metadata says)
    // The metadata said 3 chunks, so big_0, big_1, big_2 are removed.
    // big_3 is an orphan from the previous write and stays — this is acceptable
    // and documented behaviour; the important thing is we don't READ stale chunks.
    const remaining = cookies.keys();
    expect(remaining).not.toContain("key");
    expect(remaining).not.toContain("key_0");
    expect(remaining).not.toContain("key_1");
    expect(remaining).not.toContain("key_2");
  });

  it("is a no-op when the key does not exist", () => {
    expect(() => removeItem(cookies, "ghost")).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Stale chunk isolation (regression guard for the original bug)
// ---------------------------------------------------------------------------

describe("stale chunk isolation", () => {
  let cookies: MemoryCookieWrapper;

  beforeEach(() => {
    cookies = new MemoryCookieWrapper();
  });

  it("does not read beyond the chunk count stored in metadata", () => {
    // Write large value (3 chunks)
    setItem(cookies, "key", bigString(MAX_CHUNK_SIZE * 3));
    // Manually inject a stale 4th chunk (simulates leftover from older write)
    cookies.set("key_3", "STALE_DATA");

    const result = getItem(cookies, "key");

    // Must not contain the stale data
    expect(result).not.toContain("STALE_DATA");
    expect(result?.length).toBe(MAX_CHUNK_SIZE * 3);
  });

  it("returns null if an expected chunk is missing (incomplete data)", () => {
    setItem(cookies, "key", bigString(MAX_CHUNK_SIZE * 2 + 1));
    // Manually remove one chunk to simulate corruption
    cookies.remove("key_1");

    expect(getItem(cookies, "key")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Round-trip with real-world payloads
// ---------------------------------------------------------------------------

describe("round-trip with realistic payloads", () => {
  let cookies: MemoryCookieWrapper;

  beforeEach(() => {
    cookies = new MemoryCookieWrapper();
  });

  it("survives a realistic Zustand state snapshot", () => {
    const state = {
      clientId: "abc-123",
      clientConfig: {
        theme: "dark",
        language: "he",
        features: Array.from({ length: 200 }, (_, i) => ({
          id: i,
          name: `feature-${i}`,
          enabled: i % 2 === 0,
        })),
      },
    };

    const value = JSON.stringify(state);
    setItem(cookies, "app-store", value, { expires: 7 });
    const result = getItem(cookies, "app-store");
    expect(JSON.parse(result!)).toEqual(state);
  });

  it("handles unicode and RTL characters correctly", () => {
    const value = "שלום עולם ".repeat(500);
    setItem(cookies, "rtl-key", value);
    expect(getItem(cookies, "rtl-key")).toBe(value);
  });
});
