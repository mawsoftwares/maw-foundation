import { useCallback } from 'react';
import { useI18n } from '@mawsoftwares/ui-web';
import { tr } from './i18n';

/**
 * i18n helper for auth UI: never surfaces raw keys like `auth.twoFactorAuth`.
 */
export function useAuthT(): (key: string, params?: Readonly<Record<string, string | number>>) => string {
  const { t } = useI18n();
  return useCallback((key, params) => tr(t, key, params), [t]);
}
