import type { LayoutRegistry } from './registry';
import { defaultLayoutRegistry } from './default-registry';
import { layoutConfigsEqual } from './editing';
import type { LayoutIssue } from './types';
import { validateProjectUiConfig, type ProjectUiConfig } from './ui-config';

/**
 * Draft / published / history, as a port. Layout Studio edits the DRAFT; only `publish()` changes what end users
 * get (`published`). The server implementation (tenant_layout + tenant_layout_revision) follows the same contract;
 * the implementations here are for tests, local development and apps without a backend.
 */

export interface RevisionInfo {
  readonly revision: number;
  readonly action: 'publish' | 'rollback';
  /** For a rollback: the revision that was restored. */
  readonly sourceRevision: number | null;
  readonly at: string;
  readonly by: string | null;
}

export interface ProjectUiState {
  readonly draft: ProjectUiConfig | null;
  readonly published: ProjectUiConfig | null;
  readonly publishedRevision: number | null;
  /** Newest first. */
  readonly history: readonly RevisionInfo[];
}

export interface ProjectUiStore {
  load(): Promise<ProjectUiState>;
  /** Save the draft. Does not affect `published`. */
  saveDraft(config: ProjectUiConfig): Promise<ProjectUiState>;
  discardDraft(): Promise<ProjectUiState>;
  /** Make the draft the live config as a new revision, and clear the draft. */
  publish(): Promise<ProjectUiState>;
  /** Re-publish an earlier revision's config as a NEW revision (history is never rewritten). */
  rollback(revision: number): Promise<ProjectUiState>;
}

export type ProjectUiStoreErrorCode = 'INVALID' | 'NO_DRAFT' | 'NO_SUCH_REVISION';

export class ProjectUiStoreError extends Error {
  constructor(
    readonly code: ProjectUiStoreErrorCode,
    message: string,
    readonly issues: readonly LayoutIssue[] = [],
  ) {
    super(message);
    this.name = 'ProjectUiStoreError';
  }
}

export interface StoredRevision extends RevisionInfo {
  readonly config: ProjectUiConfig;
}

/** What implementations persist. */
export interface PersistedProjectUi {
  readonly draft: ProjectUiConfig | null;
  readonly revisions: readonly StoredRevision[];
}

export interface ProjectUiStoreOptions {
  readonly registry?: LayoutRegistry;
  readonly knownThemeIds?: ReadonlySet<string>;
  readonly initial?: PersistedProjectUi;
  /** Called after every change with the full state to persist. */
  readonly persist?: (state: PersistedProjectUi) => void;
  readonly actor?: string | null;
  readonly now?: () => Date;
}

const EMPTY: PersistedProjectUi = { draft: null, revisions: [] };

export function createMemoryProjectUiStore(options: ProjectUiStoreOptions = {}): ProjectUiStore {
  const registry = options.registry ?? defaultLayoutRegistry;
  const now = options.now ?? (() => new Date());
  let state: PersistedProjectUi = options.initial ?? EMPTY;

  const view = (): ProjectUiState => {
    const latest = state.revisions[state.revisions.length - 1];
    return {
      draft: state.draft,
      published: latest?.config ?? null,
      publishedRevision: latest?.revision ?? null,
      history: state.revisions.map(({ config: _config, ...info }) => info).reverse(),
    };
  };
  const commit = (next: PersistedProjectUi): ProjectUiState => {
    state = next;
    options.persist?.(state);
    return view();
  };
  const check = (config: unknown): ProjectUiConfig => {
    const r = validateProjectUiConfig(config, registry.componentIds(), options.knownThemeIds);
    if (!r.ok) throw new ProjectUiStoreError('INVALID', 'The configuration is not valid.', r.issues);
    if (!registry.hasPreset(r.value.layout.presetId)) {
      throw new ProjectUiStoreError('INVALID', `Layout preset "${r.value.layout.presetId}" is not available.`, [{ path: 'layout.presetId', message: 'Unknown preset.' }]);
    }
    return r.value;
  };
  const nextRevision = (): number => (state.revisions[state.revisions.length - 1]?.revision ?? 0) + 1;
  const append = (config: ProjectUiConfig, action: RevisionInfo['action'], sourceRevision: number | null): ProjectUiState =>
    commit({
      draft: null,
      revisions: [
        ...state.revisions,
        { revision: nextRevision(), action, sourceRevision, at: now().toISOString(), by: options.actor ?? null, config },
      ],
    });

  return {
    load: async () => view(),
    async saveDraft(config) {
      const valid = check(config);
      // Saving what is already live is not a draft.
      const live = state.revisions[state.revisions.length - 1]?.config;
      return commit({ ...state, draft: live !== undefined && layoutConfigsEqual(live, valid) ? null : valid });
    },
    discardDraft: async () => commit({ ...state, draft: null }),
    async publish() {
      if (state.draft === null) throw new ProjectUiStoreError('NO_DRAFT', 'There is no draft to publish.');
      return append(check(state.draft), 'publish', null);
    },
    async rollback(revision) {
      const target = state.revisions.find((r) => r.revision === revision);
      if (target === undefined) throw new ProjectUiStoreError('NO_SUCH_REVISION', `Revision ${revision} does not exist.`);
      return append(check(target.config), 'rollback', revision);
    },
  };
}

/** The subset of `Storage` used, so tests and non-browser hosts can supply their own. */
export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

function readPersisted(storage: StorageLike, key: string, options: ProjectUiStoreOptions): PersistedProjectUi {
  try {
    const raw = storage.getItem(key);
    if (raw === null) return EMPTY;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return EMPTY;
    const { draft, revisions } = parsed as { draft?: unknown; revisions?: unknown };
    const registry = options.registry ?? defaultLayoutRegistry;
    const valid = (c: unknown): c is ProjectUiConfig => validateProjectUiConfig(c, registry.componentIds(), options.knownThemeIds).ok;
    const goodRevisions = Array.isArray(revisions)
      ? revisions.filter((r): r is StoredRevision => typeof r === 'object' && r !== null && typeof (r as StoredRevision).revision === 'number' && valid((r as StoredRevision).config))
      : [];
    return { draft: valid(draft) ? draft : null, revisions: goodRevisions };
  } catch {
    // Corrupt or unavailable storage: start clean rather than break the app.
    return EMPTY;
  }
}

/** Browser-persisted store (`localStorage`). Corrupt data is ignored; write failures never throw into the UI. */
export function createStorageProjectUiStore(storage: StorageLike, key: string, options: ProjectUiStoreOptions = {}): ProjectUiStore {
  return createMemoryProjectUiStore({
    ...options,
    initial: readPersisted(storage, key, options),
    persist: (state) => {
      try {
        storage.setItem(key, JSON.stringify(state));
      } catch {
        // Quota or privacy mode: the in-memory state still works for this session.
      }
    },
  });
}
