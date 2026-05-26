export function fmtBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  return `${(n / 1024).toFixed(1)} KB`;
}

function truncate(str: string, max: number): string {
  return str.length > max ? str.slice(0, max) + "…" : str;
}

function getAllCookies(): Record<string, string> {
  return Object.fromEntries(
    document.cookie
      .split("; ")
      .filter(Boolean)
      .map((c) => {
        const idx = c.indexOf("=");
        return [c.slice(0, idx), decodeURIComponent(c.slice(idx + 1))];
      })
  );
}

export class CookieInspector {
  private statsEl: HTMLElement;
  private listEl: HTMLElement;
  private key: string;

  constructor(container: HTMLElement, key: string) {
    this.statsEl = container.querySelector(".inspector-stats")!;
    this.listEl = container.querySelector(".cookie-list")!;
    this.key = key;

    const refreshBtn = container.querySelector(".refresh-btn");
    refreshBtn?.addEventListener("click", () => this.refresh());
  }

  setKey(key: string) {
    this.key = key;
    this.refresh();
  }

  refresh() {
    const all = getAllCookies();
    const key = this.key;

    const relatedKeys = Object.keys(all).filter(
      (k) => k === key || k.startsWith(key + "_")
    );

    this.listEl.innerHTML = "";

    if (relatedKeys.length === 0) {
      this.listEl.innerHTML = `<div class="empty-state">No cookies for <code>${key}</code>.<br>Set a value first.</div>`;
      this.renderStats(0, 0, 0);
      return;
    }

    const sorted = [...relatedKeys].sort((a, b) => {
      if (a === key) return -1;
      if (b === key) return 1;
      return parseInt(a.split("_").pop()!) - parseInt(b.split("_").pop()!);
    });

    let chunkCount = 0;
    let totalBytes = 0;

    for (const ck of sorted) {
      const val = all[ck];
      totalBytes += new TextEncoder().encode(val).length;

      const isMeta = ck === key;
      let isPartitioned = false;
      let meta: { _partitioned: boolean; chunks: number } | null = null;

      if (isMeta) {
        try {
          meta = JSON.parse(val);
          isPartitioned = meta?._partitioned === true;
        } catch {}
      }

      if (isPartitioned && meta) chunkCount = meta.chunks;

      const item = document.createElement("div");
      item.className = `cookie-item${isPartitioned ? " is-meta" : !isMeta ? " is-chunk" : ""}`;

      let badge = "";
      if (isPartitioned && meta) {
        badge = `meta · ${meta.chunks} chunks`;
      } else if (!isMeta) {
        const idx = ck.split("_").pop();
        badge = `chunk ${idx} · ${fmtBytes(val.length)}`;
      } else {
        badge = `plain · ${fmtBytes(val.length)}`;
      }

      item.innerHTML = `
        <div class="cookie-row">
          <span class="cookie-name">${ck}</span>
          <span class="cookie-badge">${badge}</span>
        </div>
        <div class="cookie-val">${truncate(val, 110)}</div>
        ${isPartitioned && meta ? renderChunkBlocks(meta.chunks) : ""}
      `;
      this.listEl.appendChild(item);
    }

    this.renderStats(
      relatedKeys.length,
      chunkCount || (relatedKeys.length > 1 ? relatedKeys.length - 1 : 0),
      totalBytes
    );
  }

  private renderStats(total: number, chunks: number, bytes: number) {
    this.statsEl.innerHTML = `
      <div class="stat"><span class="val">${total}</span><span class="lbl">cookies</span></div>
      <div class="stat"><span class="val">${chunks}</span><span class="lbl">chunks</span></div>
      <div class="stat"><span class="val">${fmtBytes(bytes)}</span><span class="lbl">stored</span></div>
    `;
  }
}

function renderChunkBlocks(count: number): string {
  const blocks = Array.from(
    { length: count },
    (_, i) => `<div class="chunk-block" title="Chunk ${i}"></div>`
  ).join("");
  return `<div class="chunk-blocks">${blocks}</div>`;
}
