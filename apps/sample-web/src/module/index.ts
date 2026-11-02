import type { Middleware, Reducer } from '@reduxjs/toolkit';
import { assertConsistent, type FrontendModule, type FrontendModuleState } from '@mawsoftwares/ui-web';

/**
 * Pluggable modules compiled into this app. Each module is a `FrontendModule` (nav entries, page
 * permissions, page renderers) plus an optional `FrontendModuleState` (Redux slices and middleware). Its key must
 * match the backend `MawModule` key, so a module switched off on the server (`DISABLED_MODULES`) disappears from
 * the sidebar and its pages show "Module disabled".
 *
 * To plug in a module: import its `FrontendModule` here and add it to the array below.
 */
export type AppModuleState = FrontendModuleState<Reducer, Middleware>;

export const FRONTEND_MODULES: readonly FrontendModule[] = [];

/** Redux slices and middleware the plugged-in modules need in this app's store. */
export const FRONTEND_MODULE_STATE: readonly AppModuleState[] = [];

assertConsistent(FRONTEND_MODULES);
