import { createSlice } from '@reduxjs/toolkit';
import { GetOrganizationByDomainQuery } from '../../generated/graphql';

type OrganizationState = {
  data: GetOrganizationByDomainQuery['getOrganizationByDomain'] | null;
  loading: boolean;
  error: string | null;
};

const initialState: OrganizationState = {
  data: null,
  loading: false,
  error: null,
};

const organizationSlice = createSlice({
  name: 'organization',
  initialState,
  reducers: {
    setOrganization(state, action) {
      state.data = action.payload;
      state.loading = false;
      state.error = null;
    },

    clearOrganization(state) {
      state.data = null;
      state.loading = false;
      state.error = null;
    },
  },

  extraReducers: () => {},
});

export const { setOrganization, clearOrganization } = organizationSlice.actions;
export default organizationSlice.reducer;
