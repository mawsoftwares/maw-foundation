// Typecheck-only stand-in for the host app's `src/config-context.tsx`
// (see apps/sample-web/src/config-context.tsx). Do NOT copy this file.
export interface AppConfigState {
  formLayout: 'drawer' | 'modal';
}

export function useAppConfig(): AppConfigState {
  return { formLayout: 'drawer' };
}
