import { create } from "zustand";
import { persist } from "zustand/middleware";
import { cookieStorage } from "chunky-cookies";
import { CookieInspector, fmtBytes } from "./inspector";
import { makeHugeStorePayload } from "./presets";

interface DemoStore {
  counter: number;
  toggled: boolean;
  message: string;
  increment: () => void;
  decrement: () => void;
  toggle: () => void;
  setMessage: (msg: string) => void;
  reset: () => void;
}

const STORE_KEY = "zustand-demo";

const useStore = create<DemoStore>()(
  persist(
    (set) => ({
      counter: 0,
      toggled: false,
      message: "Hello from chunky-cookies!",
      increment: () => set((s) => ({ counter: s.counter + 1 })),
      decrement: () => set((s) => ({ counter: s.counter - 1 })),
      toggle: () => set((s) => ({ toggled: !s.toggled })),
      setMessage: (message) => set({ message }),
      reset: () =>
        set({ counter: 0, toggled: false, message: "Hello from chunky-cookies!" }),
    }),
    {
      name: STORE_KEY,
      storage: cookieStorage({ expires: 1 }),
    }
  )
);

export function initZustand(container: HTMLElement) {
  container.innerHTML = `
    <div class="demo-layout">
      <div class="card">
        <div class="card-title">Zustand Store</div>

        <div class="store-state" id="z-state"></div>

        <div class="store-controls">
          <div class="store-control-group">
            <label>Counter</label>
            <div class="actions">
              <button class="btn" id="z-dec">−</button>
              <button class="btn btn-accent" id="z-inc">+</button>
            </div>
          </div>
          <div class="store-control-group">
            <label>Toggle flag</label>
            <div class="actions">
              <button class="btn" id="z-toggle">Toggle</button>
            </div>
          </div>
        </div>

        <label>Message</label>
        <input type="text" id="z-msg" placeholder="Type a message…" />

        <div class="actions" style="margin-bottom:16px">
          <button class="btn btn-accent" id="z-set-msg">Set message</button>
          <button class="btn" id="z-huge">Load huge payload (~12 KB)</button>
          <button class="btn btn-danger" id="z-reset">Reset store</button>
        </div>

        <div style="font-size:0.75rem;color:var(--muted)">
          State is persisted to cookies via <code style="color:var(--blue)">cookieStorage()</code>.
          Reload the page — state survives.
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

  const stateEl = container.querySelector<HTMLElement>("#z-state")!;
  const msgInput = container.querySelector<HTMLInputElement>("#z-msg")!;

  const inspector = new CookieInspector(
    container.querySelector(".card:last-child")!,
    STORE_KEY
  );

  function renderState() {
    const { counter, toggled, message } = useStore.getState();
    const isLong = message.length > 60;
    stateEl.innerHTML = `
      <div><span class="store-key">counter</span>: <span class="store-val">${counter}</span></div>
      <div><span class="store-key">toggled</span>: <span class="store-val">${toggled}</span></div>
      <div><span class="store-key">message</span>: <span class="store-val ${isLong ? "long" : ""}">${
      isLong
        ? `${message.slice(0, 60)}… <em>(${fmtBytes(message.length)} total)</em>`
        : JSON.stringify(message)
    }</span></div>
    `;
    msgInput.value = message.length <= 60 ? message : "";
  }

  useStore.subscribe(() => {
    renderState();
    inspector.refresh();
  });

  renderState();
  inspector.refresh();

  container.querySelector("#z-inc")!.addEventListener("click", () =>
    useStore.getState().increment()
  );
  container.querySelector("#z-dec")!.addEventListener("click", () =>
    useStore.getState().decrement()
  );
  container.querySelector("#z-toggle")!.addEventListener("click", () =>
    useStore.getState().toggle()
  );

  container.querySelector("#z-set-msg")!.addEventListener("click", () => {
    useStore.getState().setMessage(msgInput.value);
  });

  container.querySelector("#z-huge")!.addEventListener("click", () => {
    useStore.getState().setMessage(makeHugeStorePayload());
  });

  container.querySelector("#z-reset")!.addEventListener("click", () => {
    useStore.getState().reset();
  });
}
