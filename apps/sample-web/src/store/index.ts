import { configureStore, type Reducer } from '@reduxjs/toolkit';
import { usersApi } from '../features/users/usersApi';
import { FRONTEND_MODULE_STATE } from '../module';
import { assertStateConsistent } from '@mawsoftwares/ui-web';

assertStateConsistent(FRONTEND_MODULE_STATE, [usersApi.reducerPath]);

/** Slices of plugged-in modules (none until a module is added to `src/module`), keyed by the state keys their pages read. */
const moduleReducers: Record<string, Reducer> = Object.fromEntries(
  FRONTEND_MODULE_STATE.flatMap((m) => Object.entries(m.reducers)),
);

// The app's single Redux store. Every generated module's RTK Query
// `createApi` slice gets registered here — add its `reducerPath: reducer`
// entry and its `.middleware` to the list below (the Module Generator does
// this automatically when scaffolding a new module).
export const store = configureStore({
  reducer: {
    [usersApi.reducerPath]: usersApi.reducer,
    ...moduleReducers,
  },
  middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(
    usersApi.middleware,
    ...FRONTEND_MODULE_STATE.flatMap((m) => m.middleware),
  ),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// Modules that persist slices or bridge store access wire themselves to the finished store.
FRONTEND_MODULE_STATE.forEach((m) => m.onStoreReady?.(store));
