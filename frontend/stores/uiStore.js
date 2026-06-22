// stores/uiStore.js

/**
 * This store handles transient UI flags. If the user refreshes the page, we don't care if the sidebar was open or closed, so we completely omit the persist middleware here to save browser storage.
 */

import { create } from "zustand";

export const useUiStore = create((set) => ({
  sidebarOpen: true,
  globalLoading: false,

  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (isOpen) => set({ sidebarOpen: isOpen }),
  setGlobalLoading: (isLoading) => set({ globalLoading: isLoading }),
}));
