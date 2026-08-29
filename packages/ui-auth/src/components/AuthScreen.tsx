import type { ReactNode } from 'react';

/** Full-viewport auth chrome. Canvas comes from ThemeProvider (`--maw-canvas`). */
export function AuthScreen({ children }: { readonly children: ReactNode }): ReactNode {
  return <div className="maw-auth-screen">{children}</div>;
}
