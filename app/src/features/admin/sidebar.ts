import { createSlice, PayloadAction } from '@reduxjs/toolkit';

type InitialState = {
  isOpen: boolean;
  lockedOpen: boolean;
};

function getBooleanFromStorage(key: string, fallback: boolean): boolean {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    return raw === 'true';
  } catch {
    return fallback;
  }
}

const initialLocked = getBooleanFromStorage('sidebar.lockedOpen', false);
const initialIsOpen = getBooleanFromStorage('sidebar.isOpen', initialLocked);

const initialState: InitialState = {
  isOpen: initialIsOpen,
  lockedOpen: initialLocked,
};

const sidebarSlice = createSlice({
  name: 'sidebar',
  initialState,
  reducers: {
    toggleSidebar: (state: InitialState, action: PayloadAction<boolean>) => {
      const next = { ...state, isOpen: action.payload };
      try {
        localStorage.setItem('sidebar.isOpen', String(next.isOpen));
      } catch {}
      return next;
    },
    setSidebarLockedOpen: (
      state: InitialState,
      action: PayloadAction<boolean>,
    ) => {
      const lockedOpen = action.payload;
      const isOpen = lockedOpen ? true : state.isOpen;
      const next = { ...state, lockedOpen, isOpen: lockedOpen ? true : isOpen };
      try {
        localStorage.setItem('sidebar.lockedOpen', String(next.lockedOpen));
        localStorage.setItem('sidebar.isOpen', String(next.isOpen));
      } catch {}
      return next;
    },
  },
});

export const { toggleSidebar, setSidebarLockedOpen } = sidebarSlice.actions;

export default sidebarSlice.reducer;
