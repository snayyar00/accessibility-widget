import { combineReducers } from '@reduxjs/toolkit';
import userSlice from '@/features/auth/user';
import authPreferencesSlice from '@/features/auth/authPreferencesSlice';
import sidebarSlice from '@/features/admin/sidebar';
import sitePlanSlice from './site/sitePlan';
import reportSlice from './report/reportSlice';
import organizationSlice from './organization/organizationSlice';
import whatsNewSlice from './whatsNew/whatsNewSlice';

const rootReducer = combineReducers({
  user: userSlice,
  authPreferences: authPreferencesSlice,
  sidebar: sidebarSlice,
  sitePlan: sitePlanSlice,
  report: reportSlice,
  organization: organizationSlice,
  whatsNew: whatsNewSlice,
});

export default rootReducer;
