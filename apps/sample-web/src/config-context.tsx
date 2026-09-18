import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

export type FormLayout = 'drawer' | 'modal';

export interface AppConfigState {
  formLayout: FormLayout;
  setFormLayout: (layout: FormLayout) => void;
  indiaOnly: boolean;
  setIndiaOnly: (val: boolean) => void;
  currency: string;
  setCurrency: (val: string) => void;
}

const AppConfigContext = createContext<AppConfigState | undefined>(undefined);

export function AppConfigProvider({ children }: { children: ReactNode }) {
  const [formLayout, setFormLayout] = useState<FormLayout>(() => {
    return (localStorage.getItem('maw-form-layout') as FormLayout) || 'drawer';
  });

  const [indiaOnly, setIndiaOnly] = useState<boolean>(() => {
    return localStorage.getItem('maw-india-only') === 'true';
  });

  const [currency, setCurrency] = useState<string>(() => {
    return localStorage.getItem('maw-currency') || 'USD';
  });

  useEffect(() => {
    localStorage.setItem('maw-form-layout', formLayout);
  }, [formLayout]);

  useEffect(() => {
    localStorage.setItem('maw-india-only', indiaOnly ? 'true' : 'false');
  }, [indiaOnly]);

  useEffect(() => {
    localStorage.setItem('maw-currency', currency);
  }, [currency]);

  return (
    <AppConfigContext.Provider value={{ formLayout, setFormLayout, indiaOnly, setIndiaOnly, currency, setCurrency }}>
      {children}
    </AppConfigContext.Provider>
  );
}

export function useAppConfig() {
  const context = useContext(AppConfigContext);
  if (!context) {
    throw new Error('useAppConfig must be used within an AppConfigProvider');
  }
  return context;
}
