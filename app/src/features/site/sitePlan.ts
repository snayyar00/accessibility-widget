import { createSlice, PayloadAction } from '@reduxjs/toolkit';

type State = {
  data: {
    id?: number;
    siteId?: number;
    productId?: number;
    priceId?: number;
    subcriptionId?: string;
    customerId?: string;
    isTrial?: boolean;
    expiredAt?: string;
    isActive?: boolean;
    createdAt?: string;
    updatedAt?: string;
    deletedAt?: string;
    siteName?: string;
    productType?: string;
    amount?: number;
    priceType?: string;
  }
  loading?: boolean;
}

const initialState: State = {
  data: {
    productType: ''
  },
  loading: false,
};

const sitePlan = createSlice({
  name: 'sitePlan',
  initialState,
  reducers: {
    setSitePlan(state: State, action: PayloadAction<State>) {
      const { data, loading } = action.payload;
      const dataSitePlan = data || {};
      state.data = dataSitePlan;
      state.loading = loading || false;
    },
  },
});

export const { setSitePlan } = sitePlan.actions;

export default sitePlan.reducer;
