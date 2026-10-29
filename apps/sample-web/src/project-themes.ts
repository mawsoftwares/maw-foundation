import { createThemeRegistry, starterThemes } from '@mawsoftwares/theme';
import { clientThemes } from './themes';

/**
 * Themes a project may choose in Layout Studio: the foundation's starter themes plus this app's generated client
 * themes. (BrandProvider keeps using `themeRegistry` for per-tenant themes — this is a separate, project-level choice.)
 */
export const projectThemeRegistry = createThemeRegistry([...starterThemes, ...clientThemes]);
