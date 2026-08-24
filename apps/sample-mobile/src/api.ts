import { ApiClient } from '@maw/api-client';
import { NativeSecureStore } from '@maw/platform/native';

const API_URL = 'http://localhost:4000';

const store = new NativeSecureStore();

export const client = new ApiClient({
  baseUrl: API_URL,
  store,
  mode: 'token',
});
