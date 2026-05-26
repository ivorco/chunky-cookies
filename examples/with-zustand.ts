/**
 * Example: using chunky-cookies as a Zustand persist storage adapter.
 *
 * Drop `cookieStorage(...)` in wherever you'd normally put
 * `createJSONStorage(() => cookieStore)`.
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { cookieStorage } from "chunky-cookies";

interface AppStore {
  clientId: string | null;
  clientConfig: Record<string, unknown> | null;
  setClient: (id: string, config: Record<string, unknown>) => void;
  clear: () => void;
}

export const useAppStore = create<AppStore>()(
  persist(
    (set) => ({
      clientId: null,
      clientConfig: null,
      setClient: (clientId, clientConfig) => set({ clientId, clientConfig }),
      clear: () => set({ clientId: null, clientConfig: null }),
    }),
    {
      name: "app-store",
      // Large configs are automatically chunked across multiple cookies.
      // No other changes needed — this is a drop-in for cookieStore.
      storage: cookieStorage({ expires: 7 }),
    }
  )
);

// Usage in a component:
//
// const { clientId, setClient } = useAppStore();
// setClient("user-123", { theme: "dark", features: [...hugeArray] });
// → stored safely across multiple cookies without any size error
