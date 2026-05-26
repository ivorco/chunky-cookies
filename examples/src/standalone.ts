import { setItem, getItem, removeItem, JsCookieWrapper } from "chunky-cookies";
import { CookieInspector, fmtBytes } from "./inspector";
import { PRESETS, type PresetName } from "./presets";

const cookies = new JsCookieWrapper();

function ts(): string {
  return new Date().toTimeString().slice(0, 8);
}

export function initStandalone(container: HTMLElement) {
  container.innerHTML = `
    <div class="demo-layout">
      <div class="card">
        <div class="card-title">Controls</div>

        <label>Cookie key</label>
        <input type="text" id="s-key" value="my-store" />

        <label>Value</label>
        <textarea id="s-value" placeholder="Type anything, or load a preset…"></textarea>

        <div class="size-bar">
          <div class="size-label">
            <span>Value size</span>
            <span class="size-val" id="s-size">0 B</span>
          </div>
          <div class="bar-track"><div class="bar-fill" id="s-bar" style="width:0%"></div></div>
        </div>

        <div class="presets">
          <button class="btn" data-preset="tiny">Tiny (200 B)</button>
          <button class="btn" data-preset="small">Small (1.2 KB)</button>
          <button class="btn" data-preset="medium">Medium (4 KB)</button>
          <button class="btn" data-preset="large">Large (10 KB)</button>
          <button class="btn" data-preset="huge">Huge (20 KB)</button>
        </div>

        <div class="actions">
          <button class="btn btn-accent" id="s-set">Set cookie</button>
          <button class="btn" id="s-get">Get &amp; verify</button>
          <button class="btn btn-danger" id="s-remove">Remove</button>
        </div>

        <div class="log" id="s-log">
          <div class="log-entry info"><span class="ts">${ts()}</span><span class="msg">Ready — load a preset and hit "Set cookie".</span></div>
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

  const keyEl = container.querySelector<HTMLInputElement>("#s-key")!;
  const valueEl = container.querySelector<HTMLTextAreaElement>("#s-value")!;
  const sizeEl = container.querySelector<HTMLElement>("#s-size")!;
  const barEl = container.querySelector<HTMLElement>("#s-bar")!;
  const logEl = container.querySelector<HTMLElement>("#s-log")!;

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

  container.querySelector("#s-set")!.addEventListener("click", () => {
    const key = keyEl.value.trim();
    const value = valueEl.value;
    if (!key) { log("Key cannot be empty", "err"); return; }
    if (!value) { log("Value cannot be empty", "err"); return; }
    setItem(cookies, key, value, { expires: 1 });
    const size = fmtBytes(new TextEncoder().encode(value).length);
    log(`Stored "${key}" (${size})`, "ok");
    inspector.setKey(key);
  });

  container.querySelector("#s-get")!.addEventListener("click", () => {
    const key = keyEl.value.trim();
    const result = getItem(cookies, key);
    if (result === null) { log(`"${key}" not found`, "err"); return; }
    const matches = result === valueEl.value;
    log(
      matches
        ? `Retrieved "${key}" — matches exactly (${fmtBytes(result.length)})`
        : `Retrieved "${key}" — content differs from textarea`,
      matches ? "ok" : "info"
    );
  });

  container.querySelector("#s-remove")!.addEventListener("click", () => {
    const key = keyEl.value.trim();
    removeItem(cookies, key);
    log(`Removed "${key}" and all its chunks`, "ok");
    inspector.setKey(key);
  });

  inspector.refresh();
}
