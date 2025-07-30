import { Organization, OrganizationUser } from '@/generated/graphql';
import { isAdminOrOwner } from '@/helpers/organizationRole';
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

type Profile = {
  id?: number;
  avatarUrl?: string;
  email?: string;
  isActive?: boolean;
  position?: string;
  company?: string;
  name?: string;
  invitationToken?: string;
  currentOrganization?: Organization | null;
  currentOrganizationUser?: OrganizationUser | null;
  isAdminOrOwner?: boolean;
};

type Error = {
  error: string | null;
};

type ProfileUser = {
  data: Profile;
  loading: boolean;
};

type State = {
  data: Profile;
  error: Error['error'];
  loading: boolean;
};

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
      const organizationUser = dataUser?.currentOrganizationUser || null;

      state.data = {
        ...state.data,
        ...dataUser,
        isAdminOrOwner: isAdminOrOwner(organizationUser),
      };

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
