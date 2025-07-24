import { combineReducers } from '@reduxjs/toolkit';
import userSlice from '@/features/auth/user';
import sidebarSlice from '@/features/admin/sidebar';
import sitePlanSlice from './site/sitePlan';
import reportSlice from './report/reportSlice';
import organizationSlice from './organization/organizationSlice';

const rootReducer = combineReducers({
  user: userSlice,
  sidebar: sidebarSlice,
  sitePlan: sitePlanSlice,
  report: reportSlice,
  organization: organizationSlice,
});

export default rootReducer;
