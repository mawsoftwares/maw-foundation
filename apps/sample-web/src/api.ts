import { ApiClient, webSecureStore } from '@maw/api-client';

export const client = new ApiClient({
  baseUrl: 'http://localhost:4000',
  store: webSecureStore(window.localStorage),
  mode: 'token',
});
