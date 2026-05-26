/**
 * The maximum size of a single cookie value in bytes.
 * Browsers enforce a ~4096 byte limit per cookie (name + value + attributes).
 * We use 4000/3 ≈ 1333 bytes to leave headroom for URL-encoding overhead,
 * where characters like `{`, `"`, `:` each expand to 3 characters.
 */
export const MAX_CHUNK_SIZE = Math.floor(4000 / 3);

/**
 * The sentinel stored in the root cookie to indicate that the value
 * has been split into chunks.
 */
interface PartitionedMeta {
  _partitioned: true;
  chunks: number;
}

function isPartitionedMeta(value: unknown): value is PartitionedMeta {
  return (
    typeof value === "object" &&
    value !== null &&
    "_partitioned" in value &&
    (value as PartitionedMeta)._partitioned === true
  );
}

/**
 * Minimal cookie I/O interface. Implement this to target any cookie backend
 * (js-cookie, Next.js RequestCookies/ResponseCookies, document.cookie, etc.)
 */
export interface CookieWrapper {
  get(name: string): string | undefined;
  set(name: string, value: string, options?: CookieOptions): void;
  remove(name: string, options?: Pick<CookieOptions, "path">): void;
}

export interface CookieOptions {
  /** Expiry in days from now */
  expires?: number;
  path?: string;
}

// ---------------------------------------------------------------------------
// Core operations
// ---------------------------------------------------------------------------

/**
 * Stores a string value in one or more cookies, chunking automatically when
 * the value exceeds MAX_CHUNK_SIZE.
 */
export function setItem(
  cookies: CookieWrapper,
  name: string,
  value: string,
  options: CookieOptions = {}
): void {
  const opts = { path: "/", ...options };

  if (value.length <= MAX_CHUNK_SIZE) {
    cookies.set(name, value, opts);
    return;
  }

  // Split into chunks
  const chunks: string[] = [];
  for (let i = 0; i < value.length; i += MAX_CHUNK_SIZE) {
    chunks.push(value.slice(i, i + MAX_CHUNK_SIZE));
  }

  // Write each chunk under `{name}_{index}`
  chunks.forEach((chunk, index) => {
    cookies.set(`${name}_${index}`, chunk, opts);
  });

  // Write the metadata sentinel into the root key
  const meta: PartitionedMeta = { _partitioned: true, chunks: chunks.length };
  cookies.set(name, JSON.stringify(meta), opts);
}

/**
 * Reads a value previously stored with `setItem`, transparently reassembling
 * chunks when present. Returns `null` if the key is not found or data is corrupt.
 */
export function getItem(cookies: CookieWrapper, name: string): string | null {
  const raw = cookies.get(name);
  if (raw === undefined) return null;

  try {
    const parsed: unknown = JSON.parse(raw);

    if (isPartitionedMeta(parsed)) {
      const chunkCount = parsed.chunks;
      if (!Number.isFinite(chunkCount) || chunkCount <= 0) return null;

      // Read exactly `chunkCount` chunks — never scan beyond that, otherwise
      // stale leftover chunks from a previous (larger) write get appended.
      const parts: string[] = [];
      for (let i = 0; i < chunkCount; i++) {
        const chunk = cookies.get(`${name}_${i}`);
        if (typeof chunk !== "string") return null; // incomplete / corrupt
        parts.push(chunk);
      }

      return parts.join("");
    }
  } catch {
    // Not JSON — treat the raw value as a plain string (non-chunked).
  }

  return raw;
}

/**
 * Removes a key and all associated chunk cookies.
 */
export function removeItem(
  cookies: CookieWrapper,
  name: string,
  options: Pick<CookieOptions, "path"> = {}
): void {
  const opts = { path: "/", ...options };
  const raw = cookies.get(name);

  if (raw !== undefined) {
    try {
      const parsed: unknown = JSON.parse(raw);
      if (isPartitionedMeta(parsed)) {
        // Use the stored chunk count — not a while-loop scan — to avoid
        // accidentally leaving orphaned chunks from a previous larger write.
        for (let i = 0; i < parsed.chunks; i++) {
          cookies.remove(`${name}_${i}`, opts);
        }
      }
    } catch {
      // Not JSON, nothing extra to clean up.
    }
  }

  cookies.remove(name, opts);
}
