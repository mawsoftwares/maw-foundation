import { ApiClient, webSecureStore } from '@mawsoftwares/api-client';

import { API_BASE_URL } from './config';

export const client = new ApiClient({
  baseUrl: API_BASE_URL,
  store: webSecureStore(window.localStorage),
  mode: 'token',
});
