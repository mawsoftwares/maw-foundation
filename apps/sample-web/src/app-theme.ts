import { extendTheme, type ThemeOverrides, type ThemeRegistry } from '@mawsoftwares/theme';

/** The theme this app looks like when nothing else is chosen: the foundation's "MAW Console" (the MAW Hub look). */
export const APP_DEFAULT_THEME_ID = 'maw-console';

/**
 * The theme underneath a project's choice. A shared theme from Theme Designer always wins. Otherwise "Application
 * default" (no theme chosen) shows the app's built-in look, and any theme the project picks stands on its own.
 */
export function appBaseTheme(shared: ThemeOverrides | undefined, themeId: string | null, registry: ThemeRegistry): ThemeOverrides | undefined {
  if (shared !== undefined || themeId !== null || !registry.has(APP_DEFAULT_THEME_ID)) return shared;
  return extendTheme({}, registry.resolveOverrides(APP_DEFAULT_THEME_ID));
}
