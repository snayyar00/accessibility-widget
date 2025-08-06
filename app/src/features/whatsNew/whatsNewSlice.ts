import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface WhatsNewState {
  lastSeenDate: string | null;
  isModalOpen: boolean;
}

const initialState: WhatsNewState = {
  lastSeenDate: null,
  isModalOpen: false,
};

const whatsNewSlice = createSlice({
  name: 'whatsNew',
  initialState,
  reducers: {
    setLastSeenDate: (state, action: PayloadAction<string>) => {
      state.lastSeenDate = action.payload;
    },
    openModal: (state) => {
      state.isModalOpen = true;
    },
    closeModal: (state) => {
      state.isModalOpen = false;
    },
    markUpdatesAsSeen: (state, action: PayloadAction<string>) => {
      state.lastSeenDate = action.payload;
      state.isModalOpen = false;
    },
    checkForNewUpdates: (
      state,
      action: PayloadAction<{ latestDate: string; shouldAutoShow: boolean }>,
    ) => {
      const { latestDate, shouldAutoShow } = action.payload;

      // If user hasn't seen the latest updates and we should auto-show
      if (shouldAutoShow && state.lastSeenDate !== latestDate) {
        state.isModalOpen = true;
      }
    },
  },
});

export const {
  setLastSeenDate,
  openModal,
  closeModal,
  markUpdatesAsSeen,
  checkForNewUpdates,
} = whatsNewSlice.actions;

export default whatsNewSlice.reducer;

// Selectors
export const selectWhatsNew = (state: { whatsNew: WhatsNewState }) =>
  state.whatsNew;
export const selectIsModalOpen = (state: { whatsNew: WhatsNewState }) =>
  state.whatsNew.isModalOpen;
export const selectLastSeenDate = (state: { whatsNew: WhatsNewState }) =>
  state.whatsNew.lastSeenDate;
export const selectHasSeenLatestUpdates =
  (latestDate: string) => (state: { whatsNew: WhatsNewState }) =>
    state.whatsNew.lastSeenDate === latestDate;
