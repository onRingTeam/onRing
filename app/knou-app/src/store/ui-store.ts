import { create } from 'zustand';

interface UiState {
  showCreateSheet: boolean;
  showProfileEditSheet: boolean;
  setShowCreateSheet: (show: boolean) => void;
  setShowProfileEditSheet: (show: boolean) => void;
}

export const useUiStore = create<UiState>((set) => ({
  showCreateSheet: false,
  showProfileEditSheet: false,
  setShowCreateSheet: (show) => set({ showCreateSheet: show }),
  setShowProfileEditSheet: (show) => set({ showProfileEditSheet: show }),
}));
