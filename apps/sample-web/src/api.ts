import { ApiClient, webSecureStore } from '@mawsoftwares/api-client';
import { createSharedThemeClient } from '@mawsoftwares/theme';

import { API_BASE_URL } from './config';

export const client = new ApiClient({
  baseUrl: API_BASE_URL,
  store: webSecureStore(window.localStorage),
  mode: 'token',
});

/** The application-wide theme (stored on the server, shared by every user). */
export const sharedTheme = createSharedThemeClient((path, init) => client.request(path, init));
