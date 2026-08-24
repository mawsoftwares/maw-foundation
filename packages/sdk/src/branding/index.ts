export type {
  ThemeMode,
  ThemeDensity,
  BrandLogoConfig,
  BrandColorConfig,
  BrandTypographyConfig,
  BrandThemeConfig,
  BrandConfig,
} from './types';

export { DEFAULT_BRAND_CONFIG } from './defaults';

export {
  validateBrandConfig,
  normalizeBrandConfig,
  type BrandValidationError,
} from './validation';

export {
  BrandResolver,
  InMemoryBrandCache,
  type BrandResolverOptions,
  type IBrandConfigProvider,
  type IBrandCache,
  type BrandResolution,
} from './resolver';
