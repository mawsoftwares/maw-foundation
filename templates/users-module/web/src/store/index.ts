import { configureStore } from '@reduxjs/toolkit';
import { usersApi } from '../features/users/usersApi';

// Reference store: register each module's RTK Query slice the same way in your
// app's `src/store/index.ts`. Do NOT copy this file over an existing store.
export const store = configureStore({
  reducer: {
    [usersApi.reducerPath]: usersApi.reducer,
  },
  middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(usersApi.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
