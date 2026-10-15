import { ApiClient, webSecureStore } from '@mawsoftwares/api-client';

// Typecheck-only stand-in for the host app's `src/api.ts`. The users module and
// `store/apiBaseQuery.ts` import the app's shared `client`; every app already has
// one (see apps/sample-web/src/api.ts). Do NOT copy this file into your project.
export const client = new ApiClient({
  baseUrl: '',
  store: webSecureStore(window.localStorage),
  mode: 'token',
});
