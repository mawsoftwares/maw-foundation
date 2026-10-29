import { createContext, useContext } from 'react';
import type { ThemeOverrides } from '@mawsoftwares/theme';

/** The tenant's shared theme (Theme Designer), so Layout Studio can preview a project theme layered over it. */
export const SharedThemeContext = createContext<ThemeOverrides | undefined>(undefined);
export const useSharedTheme = (): ThemeOverrides | undefined => useContext(SharedThemeContext);
