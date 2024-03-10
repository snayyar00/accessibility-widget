import { combineReducers } from '@reduxjs/toolkit';
import userSlice from '@/features/auth/user';
import userPlanSlice from '@/features/auth/userPlan';
import teamSlice from '@/features/admin/team';
import sidebarSlice from '@/features/admin/sidebar';
import sitePlanSlice from './site/sitePlan';

const rootReducer = combineReducers({
  user: userSlice,
  userPlan: userPlanSlice,
  team: teamSlice,
  sidebar: sidebarSlice,
  sitePlan: sitePlanSlice,
});

export default rootReducer;
