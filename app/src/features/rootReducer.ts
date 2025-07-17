import { combineReducers } from '@reduxjs/toolkit';
import userSlice from '@/features/auth/user';
import sidebarSlice from '@/features/admin/sidebar';
import sitePlanSlice from './site/sitePlan';

const rootReducer = combineReducers({
  user: userSlice,
  sidebar: sidebarSlice,
  sitePlan: sitePlanSlice,
});

export default rootReducer;
