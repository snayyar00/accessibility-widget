import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type LoginMethod = 'email' | 'google';

interface AuthPreferencesState {
  lastLoginMethod: LoginMethod | null;
}

const initialState: AuthPreferencesState = {
  lastLoginMethod: null,
};

const authPreferencesSlice = createSlice({
  name: 'authPreferences',
  initialState,
  reducers: {
    setLastLoginMethod: (state, action: PayloadAction<LoginMethod>) => {
      state.lastLoginMethod = action.payload;
    },
  },
});

export const { setLastLoginMethod } = authPreferencesSlice.actions;

export default authPreferencesSlice.reducer;
