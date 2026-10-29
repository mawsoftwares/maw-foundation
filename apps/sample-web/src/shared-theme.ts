import { createContext, useContext } from 'react';
import type { ThemeOverrides } from '@mawsoftwares/theme';

/** The theme underneath a project's choice (see `appBaseTheme`), so Layout Studio previews match the running app. */
export type BaseThemeFor = (themeId: string | null) => ThemeOverrides | undefined;

export const SharedThemeContext = createContext<BaseThemeFor>(() => undefined);
export const useBaseThemeFor = (): BaseThemeFor => useContext(SharedThemeContext);
