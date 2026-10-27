import { createContext, useContext, type ReactNode } from 'react';
import { usePageSubPath, type PagePathEntry, type PageSubPath } from '@mawsoftwares/ui-web';

interface PagePathsValue {
  base: string;
  entries: PagePathEntry[];
}

const PagePathsContext = createContext<PagePathsValue>({ base: '/', entries: [] });

/** Supplies the deploy base and page-path table so a feature can read its inner URL path without prop drilling. */
export function PagePathsProvider({ base, entries, children }: PagePathsValue & { children: ReactNode }): ReactNode {
  return <PagePathsContext.Provider value={{ base, entries }}>{children}</PagePathsContext.Provider>;
}

/** Inner path of `page` (`/users/42` -> `['42']`) and a setter that navigates within the page. */
export function usePagePath(page: string): PageSubPath {
  const { base, entries } = useContext(PagePathsContext);
  return usePageSubPath(page, base, entries);
}
