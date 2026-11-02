import type { Server } from 'node:http';
import type { Express } from 'express';
import { EnvironmentError } from './env';
import type { MawModule } from './contract';
import { selectionFromDisabled } from './selection';
import type { ModuleSelection } from './registration';

const DEFAULT_SHUTDOWN_TIMEOUT_MS = 10_000;

/** What an application's `createApp` returns: an Express app that is not listening yet, plus its cleanup. */
export interface ServableApp {
  readonly app: Express;
  readonly port: number;
  /** Releases everything `createApp` started (timers, pools, job runners). Must be idempotent. */
  shutdown(): Promise<void>;
}

export interface RunningServer<A extends ServableApp = ServableApp> {
  readonly server: Server;
  readonly mawApp: A;
  /** Stops accepting connections, then runs the app's shutdown. Idempotent. */
  close(): Promise<void>;
}

export interface ListenOptions {
  readonly host?: string;
  readonly onListening?: () => void;
  /** Forced-exit guard for signal-driven shutdown. Default 10 s. */
  readonly shutdownTimeoutMs?: number;
  /** Install SIGTERM/SIGINT handlers that close gracefully and exit. Default true. */
  readonly handleSignals?: boolean;
}

/** Starts listening and wires graceful shutdown. `createApp` never listens; this is the only place that does. */
export function listenWithGracefulShutdown<A extends ServableApp>(mawApp: A, options: ListenOptions = {}): RunningServer<A> {
  const server = mawApp.app.listen(mawApp.port, options.host ?? '0.0.0.0', options.onListening);
  const signals = ['SIGTERM', 'SIGINT'] as const;
  let closing: Promise<void> | undefined;

  const onSignal = (): void => {
    const timer = setTimeout(() => process.exit(1), options.shutdownTimeoutMs ?? DEFAULT_SHUTDOWN_TIMEOUT_MS);
    timer.unref();
    void close().then(() => process.exit(0), () => process.exit(1));
  };
  const close = (): Promise<void> => {
    closing ??= (async () => {
      for (const signal of signals) process.off(signal, onSignal);
      await new Promise<void>((resolve) => server.close(() => resolve()));
      await mawApp.shutdown();
    })();
    return closing;
  };
  if (options.handleSignals !== false) for (const signal of signals) process.once(signal, onSignal);

  return { server, mawApp, close };
}

/**
 * Turns `DISABLED_MODULES` into a registry selection and refuses unknown keys with an `EnvironmentError`
 * (a typo must not silently leave a module enabled).
 */
export function resolveModuleSelection(modules: readonly MawModule[], disabled: readonly string[]): ModuleSelection {
  const { selection, unknown } = selectionFromDisabled(modules, disabled);
  if (unknown.length > 0) throw new EnvironmentError([`DISABLED_MODULES names unknown module(s): ${unknown.join(', ')}`]);
  return selection;
}
