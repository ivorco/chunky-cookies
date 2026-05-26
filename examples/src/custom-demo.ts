import type { CookieWrapper, CookieOptions } from "chunky-cookies";
import { setItem, getItem, removeItem } from "chunky-cookies";
import { CookieInspector, fmtBytes } from "./inspector";
import { PRESETS, type PresetName } from "./presets";

class DocumentCookieWrapper implements CookieWrapper {
  get(name: string): string | undefined {
    const match = document.cookie
      .split("; ")
      .find((row) => row.startsWith(`${name}=`));
    return match ? decodeURIComponent(match.split("=").slice(1).join("=")) : undefined;
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

const wrapper = new DocumentCookieWrapper();

function ts(): string {
  return new Date().toTimeString().slice(0, 8);
}

const WRAPPER_SOURCE = `<span class="code-kw">class</span> <span class="code-cls">DocumentCookieWrapper</span> <span class="code-kw">implements</span> <span class="code-cls">CookieWrapper</span> {
  <span class="code-fn">get</span>(name: <span class="code-cls">string</span>): <span class="code-cls">string</span> | <span class="code-kw">undefined</span> {
    <span class="code-kw">const</span> match = document.cookie
      .split(<span class="code-str">"; "</span>)
      .find((row) =&gt; row.startsWith(\`\${name}=\`));
    <span class="code-kw">return</span> match
      ? decodeURIComponent(match.split(<span class="code-str">"="</span>).slice(1).join(<span class="code-str">"="</span>))
      : <span class="code-kw">undefined</span>;
  }

  <span class="code-fn">set</span>(name: <span class="code-cls">string</span>, value: <span class="code-cls">string</span>, options?: <span class="code-cls">CookieOptions</span>): <span class="code-kw">void</span> {
    <span class="code-kw">let</span> cookie = \`\${name}=\${encodeURIComponent(value)}\`;
    <span class="code-kw">if</span> (options?.expires) {
      <span class="code-kw">const</span> date = <span class="code-kw">new</span> <span class="code-cls">Date</span>();
      date.setDate(date.getDate() + options.expires);
      cookie += \`; expires=\${date.toUTCString()}\`;
    }
    cookie += \`; path=\${options?.path ?? <span class="code-str">"/"</span>}\`;
    document.cookie = cookie;
  }

  <span class="code-fn">remove</span>(name: <span class="code-cls">string</span>): <span class="code-kw">void</span> {
    document.cookie =
      \`\${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/\`;
  }
}`;

export function initCustom(container: HTMLElement) {
  container.innerHTML = `
    <div class="demo-layout">
      <div class="card">
        <div class="card-title">Custom Wrapper</div>

        <div style="font-size:0.8rem;color:var(--muted);margin-bottom:12px">
          Implement the 3-method <code style="color:var(--blue)">CookieWrapper</code> interface
          to use any cookie backend. Here's a bare <code style="color:var(--blue)">document.cookie</code> wrapper:
        </div>

        <div class="code-block">${WRAPPER_SOURCE}</div>

        <label>Cookie key</label>
        <input type="text" id="c-key" value="raw-key" />

        <label>Value</label>
        <textarea id="c-value" placeholder="Type anything, or load a preset…"></textarea>

        <div class="size-bar">
          <div class="size-label">
            <span>Value size</span>
            <span class="size-val" id="c-size">0 B</span>
          </div>
          <div class="bar-track"><div class="bar-fill" id="c-bar" style="width:0%"></div></div>
        </div>

        <div class="presets">
          <button class="btn" data-preset="tiny">Tiny (200 B)</button>
          <button class="btn" data-preset="small">Small (1.2 KB)</button>
          <button class="btn" data-preset="medium">Medium (4 KB)</button>
          <button class="btn" data-preset="large">Large (10 KB)</button>
          <button class="btn" data-preset="huge">Huge (20 KB)</button>
        </div>

        <div class="actions">
          <button class="btn btn-accent" id="c-set">Set cookie</button>
          <button class="btn" id="c-get">Get &amp; verify</button>
          <button class="btn btn-danger" id="c-remove">Remove</button>
        </div>

        <div class="log" id="c-log">
          <div class="log-entry info"><span class="ts">${ts()}</span><span class="msg">Using DocumentCookieWrapper — no external deps.</span></div>
        </div>
      </div>

      <div class="card">
        <div class="card-title">
          Cookie Inspector
          <button class="btn btn-sm refresh-btn">↻ Refresh</button>
        </div>
        <div class="inspector-stats"></div>
        <div class="cookie-list"></div>
      </div>
    </div>
  `;

  const keyEl = container.querySelector<HTMLInputElement>("#c-key")!;
  const valueEl = container.querySelector<HTMLTextAreaElement>("#c-value")!;
  const sizeEl = container.querySelector<HTMLElement>("#c-size")!;
  const barEl = container.querySelector<HTMLElement>("#c-bar")!;
  const logEl = container.querySelector<HTMLElement>("#c-log")!;

  const inspector = new CookieInspector(
    container.querySelector(".card:last-child")!,
    keyEl.value
  );

  function log(msg: string, type: "ok" | "err" | "info" = "info") {
    const entry = document.createElement("div");
    entry.className = `log-entry ${type}`;
    entry.innerHTML = `<span class="ts">${ts()}</span><span class="msg">${msg}</span>`;
    logEl.appendChild(entry);
    logEl.scrollTop = logEl.scrollHeight;
  }

  function updateSizeBar() {
    const size = new TextEncoder().encode(valueEl.value).length;
    const MAX = 1333;
    const pct = Math.min((size / (MAX * 10)) * 100, 100);
    barEl.style.width = `${pct}%`;
    barEl.style.background =
      size <= MAX ? "var(--green)" : size <= MAX * 4 ? "var(--accent)" : "var(--red)";
    sizeEl.textContent = fmtBytes(size);
  }

  valueEl.addEventListener("input", updateSizeBar);
  keyEl.addEventListener("input", () => inspector.setKey(keyEl.value));

  container.querySelectorAll<HTMLButtonElement>("[data-preset]").forEach((btn) => {
    btn.addEventListener("click", () => {
      valueEl.value = PRESETS[btn.dataset.preset as PresetName]();
      updateSizeBar();
    });
  });

  container.querySelector("#c-set")!.addEventListener("click", () => {
    const key = keyEl.value.trim();
    const value = valueEl.value;
    if (!key) { log("Key cannot be empty", "err"); return; }
    if (!value) { log("Value cannot be empty", "err"); return; }
    setItem(wrapper, key, value, { expires: 1 });
    log(`Stored "${key}" (${fmtBytes(new TextEncoder().encode(value).length)})`, "ok");
    inspector.setKey(key);
  });

  container.querySelector("#c-get")!.addEventListener("click", () => {
    const key = keyEl.value.trim();
    const result = getItem(wrapper, key);
    if (result === null) { log(`"${key}" not found`, "err"); return; }
    const matches = result === valueEl.value;
    log(
      matches
        ? `Retrieved "${key}" — matches exactly (${fmtBytes(result.length)})`
        : `Retrieved "${key}" — content differs from textarea`,
      matches ? "ok" : "info"
    );
  });

  container.querySelector("#c-remove")!.addEventListener("click", () => {
    const key = keyEl.value.trim();
    removeItem(wrapper, key);
    log(`Removed "${key}" and all its chunks`, "ok");
    inspector.setKey(key);
  });

  inspector.refresh();
}
