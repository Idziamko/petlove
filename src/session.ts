import { configureStore, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { PetNotice, UserPetRecord, UserProfile } from './models';

interface SessionState {
  currentUser: UserProfile | null;
  favoriteNotices: PetNotice[];
  viewedNotices: PetNotice[];
  userPets: UserPetRecord[];
}

const initialState: SessionState = {
  currentUser: null,
  favoriteNotices: [],
  viewedNotices: [],
  userPets: []
};

const sessionSlice = createSlice({
  name: 'session',
  initialState,
  reducers: {
    userLoaded: (_state, action: PayloadAction<SessionState>) => action.payload,
    profileChanged: (state, action: PayloadAction<UserProfile | null>) => {
      state.currentUser = action.payload;
    },
    sessionCleared: () => initialState
  }
});

export const { userLoaded, profileChanged, sessionCleared } = sessionSlice.actions;

export const store = configureStore({ reducer: { session: sessionSlice.reducer } });

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
