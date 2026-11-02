import { listenWithGracefulShutdown, resolveModuleSelection, type MawModule, type RunningServer } from '@mawsoftwares/server-express';
import { createApp, type MawApp } from './app';
import { readServerEnv } from './env';
import { builtinModules } from './modules/pluggable';

export interface StartOptions {
  /** Extra pluggable modules to mount besides the sample's built-in ones. */
  readonly modules?: readonly MawModule[];
}

/** Startup: validate env, build the app, listen, install signal handlers. */
export async function start(options: StartOptions = {}): Promise<RunningServer<MawApp>> {
  const env = readServerEnv();
  const modules = [...builtinModules(), ...(options.modules ?? [])];
  const moduleSelection = resolveModuleSelection(modules, env.disabledModules);
  const mawApp = await createApp({ ...env, modules, moduleSelection });
  const { log, isDev, port } = mawApp;

  return listenWithGracefulShutdown(mawApp, {
    onListening: () => {
      log.info(`http://localhost:${port} (Postgres)`);
      log.info('Users: superadmin@ / owner Gmail accounts / manager@ / clerk@demo.test (pw: password123)');
      log.info('Try: GET /modules to see all registered modules + permissions');
      if (isDev) {
        log.info('Email sandbox: pnpm mailpit  →  http://localhost:8025');
        log.info(`SMS sandbox: GET/POST http://127.0.0.1:${port}/api/v1/dev/sms-sandbox`);
      }
    },
  });
}
