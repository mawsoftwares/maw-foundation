import { configureStore } from '@reduxjs/toolkit';
import { usersApi } from '../features/users/usersApi';
import { customersApi } from '../features/customers/customersApi';

// The app's single Redux store. Every generated module's RTK Query
// `createApi` slice gets registered here — add its `reducerPath: reducer`
// entry and its `.middleware` to the list below (the Module Generator does
// this automatically when scaffolding a new module).
export const store = configureStore({
  reducer: {
    [usersApi.reducerPath]: usersApi.reducer,
    [customersApi.reducerPath]: customersApi.reducer,
  },
  middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(usersApi.middleware, customersApi.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
