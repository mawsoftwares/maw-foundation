/**
 * Brand configuration types — the strongly-typed schema that every tenant's
 * visual identity conforms to. Platform-independent; no React/DOM/RN imports.
 */

export type ThemeMode = 'light' | 'dark' | 'system';
export type ThemeDensity = 'compact' | 'normal' | 'comfortable';

export interface BrandLogoConfig {
  readonly light: string;
  readonly dark?: string;
  readonly small?: string;
  readonly login?: string;
  readonly email?: string;
  readonly mobile?: string;
}

export interface BrandColorConfig {
  readonly primary: string;
  readonly secondary?: string;
  readonly accent?: string;
  readonly success?: string;
  readonly warning?: string;
  readonly error?: string;
  readonly background?: string;
  readonly surface?: string;
  readonly text?: string;
  readonly textMuted?: string;
  readonly border?: string;
}

export interface BrandTypographyConfig {
  readonly fontFamily?: string;
  readonly headingFontFamily?: string;
  readonly monoFontFamily?: string;
}

export interface BrandThemeConfig {
  readonly mode?: ThemeMode;
  readonly radius?: number;
  readonly density?: ThemeDensity;
}

export interface BrandConfig {
  readonly id: string;
  readonly tenantId: string;
  readonly version?: number;
  readonly updatedAt?: string;
  readonly name: string;
  readonly shortName?: string;
  readonly logo: BrandLogoConfig;
  readonly favicon?: string;
  readonly colors: BrandColorConfig;
  readonly typography?: BrandTypographyConfig;
  readonly theme?: BrandThemeConfig;
  readonly customTokens?: Readonly<Record<string, string>>;
}
