import "./style.css";
import { initStandalone } from "./standalone";
import { initZustand } from "./zustand-demo";
import { initCustom } from "./custom-demo";

type TabName = "standalone" | "zustand" | "custom";

const inits: Record<TabName, (el: HTMLElement) => void> = {
  standalone: initStandalone,
  zustand: initZustand,
  custom: initCustom,
};

const initialized = new Set<TabName>();

function activateTab(name: TabName) {
  document
    .querySelectorAll(".tab")
    .forEach((t) => t.classList.remove("active"));
  document
    .querySelectorAll(".tab-panel")
    .forEach((p) => p.classList.remove("active"));

  document
    .querySelector<HTMLButtonElement>(`.tab[data-tab="${name}"]`)
    ?.classList.add("active");

  const panel = document.getElementById(`tab-${name}`);
  if (!panel) return;
  panel.classList.add("active");

  if (!initialized.has(name)) {
    initialized.add(name);
    inits[name](panel);
  }
}

document.querySelectorAll<HTMLButtonElement>(".tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    const name = tab.dataset.tab as TabName;
    if (name) activateTab(name);
  });
});

activateTab("standalone");
