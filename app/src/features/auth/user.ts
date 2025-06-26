import { createSlice, PayloadAction } from '@reduxjs/toolkit';

type Organization = {
  id: string;
  name: string;
  subdomain: string;
  logo_url?: string | null;
  settings?: Record<string, any>;
  created_at?: string;
  updated_at?: string;
};

export type OrganizationUser = {
  id: string;
  user_id: number;
  organization_id: number;
  role: string;
  status: string;
  invited_by?: number | null;
  created_at?: string;
  updated_at?: string;
};

type Profile = {
  id?: number;
  avatarUrl?: string;
  email?: string;
  isActive?: boolean;
  position?: string;
  company?: string;
  name?: string;
  invitationToken?: string;
  hasOrganization?: boolean;
  currentOrganization?: Organization | null;
  currentOrganizationUser?: OrganizationUser | null;
}

type Error = {
  error: string | null
}

type ProfileUser = {
  data: Profile;
  loading: boolean;
}

type State = {
  data: Profile;
  error: Error['error'];
  loading: boolean;
}

const initialState: State = {
  data: {},
  error: null,
  loading: false,
};

const user = createSlice({
  name: 'user',
  initialState,
  reducers: {
    logout(state: State) {
      state.data = {};
    },
    setProfileUser(state: State, action: PayloadAction<ProfileUser>) {
      const { data, loading } = action.payload;
      const dataUser = data || {};
      state.data = {...state.data, ...dataUser};
      state.loading = loading;
    },
    toggleToastError(state: State, action: PayloadAction<Error>) {
      const { error } = action.payload;
      state.error = error;
    },
  },
});

export const { logout, setProfileUser, toggleToastError } = user.actions;

export type { Profile };

export default user.reducer;
